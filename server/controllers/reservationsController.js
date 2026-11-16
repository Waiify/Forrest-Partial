'use strict';

module.exports = function createReservationsController(context) {
  const {
    Capsule,
    Reservation,
    User,
    audit,
    createReservationQrToken,
    crypto,
    getSettings,
    mongoose,
    recordPaymentChange,
  } = context;
  return {
    listReservations: async (req, res) => {
      try {
        const filter = req.authUser.role === 'customer' ? { customerId: req.authUser._id } : {};
        const reservations = await Reservation.find(filter).sort({ startAt: 1, createdAt: -1 }).lean();
        res.json(reservations);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Could not load reservations' });
      }
    },
    listMyReservations: async (req, res) => {
      try {
        const { customerId } = req.query;
        if (!mongoose.Types.ObjectId.isValid(customerId)) {
          return res.status(400).json({ message: 'A valid customerId is required' });
        }
        if (req.authUser.role === 'customer' && String(req.authUser._id) !== String(customerId)) {
          return res.status(403).json({ message: 'You can only view your own reservations' });
        }
        const reservations = await Reservation.find({ customerId }).sort({ startAt: 1 }).lean();
        res.json(reservations);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Could not load your reservations' });
      }
    },
    issueReservationQr: async (req, res) => {
      try {
        if ((await getSettings()).qrCodeEnabled === false) {
          return res.status(403).json({ message: 'Reservation QR codes are currently disabled' });
        }
        if (req.authUser.role !== 'customer') {
          return res.status(403).json({ message: 'Only the reservation owner can access its QR code' });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
          return res.status(404).json({ message: 'Reservation not found' });
        }
    
        const now = new Date();
        const current = await Reservation.findOne({
          _id: req.params.id,
          customerId: req.authUser._id,
        }).select('status startAt endAt');
        if (!current) return res.status(404).json({ message: 'Reservation not found' });
        if (current.status !== 'Confirmed') {
          return res.status(409).json({ message: 'A QR code is available only for confirmed reservations' });
        }
        if (current.endAt <= now) {
          return res.status(410).json({ message: 'This reservation has expired' });
        }
    
        const { token, hash } = createReservationQrToken();
        const reservation = await Reservation.findOneAndUpdate(
          {
            _id: current._id,
            customerId: req.authUser._id,
            status: 'Confirmed',
            startAt: current.startAt,
            endAt: { $eq: current.endAt, $gt: now },
          },
          {
            $set: { qrTokenHash: hash, qrExpiresAt: current.endAt },
            $unset: { qrUsedAt: 1 },
          },
          { returnDocument: 'after' },
        ).select('_id endAt');
    
        if (!reservation) {
          return res.status(409).json({ message: 'Reservation changed. Refresh and try again.' });
        }
        res.json({ token, expiresAt: reservation.endAt });
      } catch (err) {
        if (err.name === 'CastError') return res.status(404).json({ message: 'Reservation not found' });
        console.error('Could not issue reservation QR code:', err);
        res.status(500).json({ message: 'Could not issue QR code' });
      }
    },
    checkInReservation: async (req, res) => {
      try {
        if ((await getSettings()).qrCodeEnabled === false) {
          return res.status(403).json({ message: 'Reservation QR check-in is currently disabled' });
        }
        const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
        if (!/^[a-f0-9]{64}$/i.test(token)) {
          return res.status(400).json({ message: 'Invalid QR code' });
        }
    
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const now = new Date();
        const reservation = await Reservation.findOneAndUpdate(
          {
            qrTokenHash: tokenHash,
            status: 'Confirmed',
            endAt: { $gt: now },
            qrExpiresAt: { $gt: now },
          },
          {
            $set: { status: 'Checked in', qrUsedAt: now },
            $unset: { qrTokenHash: 1, qrExpiresAt: 1 },
          },
          { returnDocument: 'after' },
        );
    
        if (reservation) {
          await audit(req, {
            userId: reservation.customerId,
            action: 'reservation.checkin',
            description: `Checked in for capsule ${reservation.capsuleId}`,
            entityType: 'reservation',
            entityId: reservation._id,
            metadata: { capsuleId: reservation.capsuleId },
          });
          return res.json({
            message: 'Check-in successful',
            reservation: {
              id: String(reservation._id),
              guestName: reservation.guestName,
              capsuleId: reservation.capsuleId,
              status: reservation.status,
            },
          });
        }
    
        const unmatched = await Reservation.findOne({ qrTokenHash: tokenHash })
          .select('status startAt endAt qrExpiresAt')
          .lean();
        if (
          unmatched?.status === 'Confirmed'
          && (unmatched.endAt <= now || unmatched.qrExpiresAt <= now)
        ) {
          return res.status(410).json({ message: 'This QR code has expired' });
        }
        return res.status(409).json({
          message: 'This QR code is invalid, cancelled, or already used',
        });
      } catch (err) {
        console.error('Could not check in reservation:', err);
        res.status(500).json({ message: 'Could not check in reservation' });
      }
    },
    getCapsuleAvailability: async (req, res) => {
      try {
        const from = new Date(req.query.from);
        const to = new Date(req.query.to);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
          return res.status(400).json({ message: 'from and to must be valid dates' });
        }
        const bookings = await Reservation.find({
          status: { $in: ['Pending', 'Confirmed', 'Checked in'] },
          startAt: { $lt: to },
          endAt: { $gt: from },
        }).select('capsuleId startAt endAt -_id').lean();
        res.json(bookings);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Could not load availability' });
      }
    },
    createReservation: async (req, res) => {
      try {
        const { customerId, capsuleId, startAt, durationHours, status } = req.body;
        const hours = Number(durationHours);
        const start = new Date(startAt);
        const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
    
        if (
          !mongoose.Types.ObjectId.isValid(customerId) ||
          !capsuleId ||
          Number.isNaN(start.getTime()) ||
          !Number.isFinite(hours) ||
          hours < 0.5 ||
          hours > 24 ||
          !['Pending', 'Confirmed'].includes(status || 'Pending')
        ) {
          return res.status(400).json({ message: 'Enter a customer, capsule, valid start time, and duration from 0.5 to 24 hours.' });
        }
        if (req.authUser.role === 'customer' && String(req.authUser._id) !== customerId) {
          return res.status(403).json({ message: 'You can only book for your own account' });
        }
        if (req.authUser.role === 'customer' && status && status !== 'Pending') {
          return res.status(403).json({ message: 'Customer bookings must start as pending' });
        }
    
        const customer = await User.findOne({ _id: customerId, role: 'customer', status: { $ne: 'disabled' } })
          .select('firstName lastName email');
        if (!customer) return res.status(404).json({ message: 'Customer not found or disabled' });
    
        const capsule = await Capsule.findOne({
          capsuleId: capsuleId.trim(),
          isArchived: { $ne: true },
          status: { $in: ['Available', 'Reserved'] },
        }).select('capsuleId pricePerHour');
        if (!capsule) return res.status(409).json({ message: 'This capsule is unavailable for reservations' });
    
        const conflict = await Reservation.exists({
          capsuleId: capsule.capsuleId,
          status: { $nin: ['Cancelled', 'Completed'] },
          startAt: { $lt: end },
          endAt: { $gt: start },
        });
        if (conflict) return res.status(409).json({ message: 'This capsule already has a reservation during that time.' });
    
        const reservation = await Reservation.create({
          customerId: customer._id,
          guestName: `${customer.firstName} ${customer.lastName}`.trim(),
          guestEmail: customer.email,
          capsuleId: capsule.capsuleId,
          startAt: start,
          endAt: end,
          durationHours: hours,
          pricePerHour: capsule.pricePerHour,
          totalPrice: Number((capsule.pricePerHour * hours).toFixed(2)),
          status: status || 'Pending',
        });
        if (reservation.status === 'Confirmed' && (await getSettings()).qrCodeEnabled !== false) {
          const { hash } = createReservationQrToken();
          reservation.qrTokenHash = hash;
          reservation.qrExpiresAt = reservation.endAt;
          await reservation.save();
        }
    
        // AUDIT
        await audit(req, {
          userId: customer._id,
          action: 'reservation.create',
          description: `Booked capsule ${reservation.capsuleId} for ${hours}h`,
          entityType: 'reservation',
          entityId: reservation._id,
          metadata: { startAt: start, durationHours: hours, totalPrice: reservation.totalPrice },
        });
    
        res.status(201).json(reservation);
      } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
        console.error(err);
        res.status(500).json({ message: 'Could not create reservation' });
      }
    },
    updateReservation: async (req, res) => {
      try {
        const { status, startAt, durationHours } = req.body;
        const allowedStatuses = ['Pending', 'Confirmed', 'Checked in', 'Completed', 'Cancelled'];
        const activeStatuses = ['Pending', 'Confirmed', 'Checked in'];
        const rescheduling = startAt !== undefined || durationHours !== undefined;
    
        if (status !== undefined && !allowedStatuses.includes(status)) {
          return res.status(400).json({ message: 'Invalid reservation status' });
        }
        if (status === undefined && !rescheduling) {
          return res.status(400).json({ message: 'Nothing to update' });
        }
    
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
        const isCustomerOwner = req.authUser.role === 'customer'
          && String(req.authUser._id) === String(reservation.customerId);
        const canManage = ['staff', 'admin'].includes(req.authUser.role);
        if (!isCustomerOwner && !canManage) {
          return res.status(403).json({ message: 'You cannot update this reservation' });
        }
        if (req.authUser.role === 'customer' && status && status !== 'Cancelled') {
          return res.status(403).json({ message: 'Customers may only cancel their reservation' });
        }
    
        const nextStatus = status ?? reservation.status;
        let nextStart = reservation.startAt;
        let nextEnd = reservation.endAt;
        let nextHours = reservation.durationHours;
    
        if (rescheduling) {
          if (!['Pending', 'Confirmed'].includes(reservation.status)) {
            return res.status(409).json({ message: 'Only pending or confirmed reservations can be rescheduled.' });
          }
    
          nextStart = startAt !== undefined ? new Date(startAt) : reservation.startAt;
          nextHours = durationHours !== undefined ? Number(durationHours) : reservation.durationHours;
    
          if (
            Number.isNaN(nextStart.getTime()) ||
            !Number.isFinite(nextHours) ||
            nextHours < 0.5 ||
            nextHours > 24
          ) {
            return res.status(400).json({ message: 'Enter a valid start time and a duration from 0.5 to 24 hours.' });
          }
          if (nextStart < new Date()) {
            return res.status(400).json({ message: "The new start time can't be in the past." });
          }
    
          nextEnd = new Date(nextStart.getTime() + nextHours * 60 * 60 * 1000);
        }
    
        // The capsule must be free during the (new) time
        if (activeStatuses.includes(nextStatus)) {
          const conflict = await Reservation.exists({
            _id: { $ne: reservation._id },
            capsuleId: reservation.capsuleId,
            status: { $nin: ['Cancelled', 'Completed'] },
            startAt: { $lt: nextEnd },
            endAt: { $gt: nextStart },
          });
          if (conflict) {
            return res.status(409).json({ message: 'This capsule already has a reservation during that time.' });
          }
        }
    
        const previousStatus = reservation.status; // AUDIT: remember the old status
        reservation.status = nextStatus;
        if (rescheduling) {
          reservation.startAt = nextStart;
          reservation.endAt = nextEnd;
          reservation.durationHours = nextHours;
          reservation.totalPrice = Number((reservation.pricePerHour * nextHours).toFixed(2));
        }
        if (rescheduling || previousStatus !== nextStatus) {
          if (
            nextStatus === 'Confirmed'
            && (rescheduling || previousStatus !== 'Confirmed')
            && (await getSettings()).qrCodeEnabled !== false
          ) {
            const { hash } = createReservationQrToken();
            reservation.qrTokenHash = hash;
            reservation.qrExpiresAt = nextEnd;
            reservation.qrUsedAt = null;
          } else if (nextStatus !== 'Confirmed' || rescheduling) {
            reservation.qrTokenHash = null;
            reservation.qrExpiresAt = null;
          }
        }
        await reservation.save();
    
        // AUDIT (logged under the customer who owns the reservation)
        if (rescheduling) {
          await audit(req, {
            userId: reservation.customerId,
            action: 'reservation.reschedule',
            description: `Rescheduled reservation for capsule ${reservation.capsuleId}`,
            entityType: 'reservation',
            entityId: reservation._id,
            metadata: { startAt: nextStart, durationHours: nextHours },
          });
        }
        if (previousStatus !== nextStatus) {
          await audit(req, {
            userId: reservation.customerId,
            action: 'reservation.status',
            description: `Reservation for capsule ${reservation.capsuleId} changed from ${previousStatus} to ${nextStatus}`,
            entityType: 'reservation',
            entityId: reservation._id,
            metadata: { from: previousStatus, to: nextStatus },
          });
        }
    
        res.json(reservation);
      } catch (err) {
        if (err.name === 'ValidationError' || err.name === 'CastError') {
          return res.status(400).json({ message: 'Invalid reservation' });
        }
        console.error(err);
        res.status(500).json({ message: 'Could not update reservation' });
      }
    },
    updateReservationPayment: async (req, res) => {
      try {
        const { paymentStatus, method } = req.body;
        if (!['Unpaid', 'Paid', 'Refunded'].includes(paymentStatus)) {
          return res.status(400).json({ message: 'Invalid payment status' });
        }
    
        const existing = await Reservation.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Reservation not found' });
    
        const previous = existing.paymentStatus || 'Unpaid';
        // Only update if the status is still what we just read (stops double clicks from recording twice).
        // Older documents may have no paymentStatus at all, which counts as Unpaid.
        const match = previous === 'Unpaid' ? { $in: ['Unpaid', null] } : previous;
        const reservation = await Reservation.findOneAndUpdate(
          { _id: existing._id, paymentStatus: match },
          { paymentStatus },
          { returnDocument: 'after', runValidators: true }
        );
        if (!reservation) {
          return res.status(409).json({ message: 'The payment was changed already. Refresh and try again.' });
        }
    
        if (previous !== paymentStatus) {
          // AUDIT (logged under the customer who owns the reservation)
          await audit(req, {
            userId: reservation.customerId,
            action: `payment.${paymentStatus.toLowerCase()}`,
            description: `Payment marked ${paymentStatus} (was ${previous}) for capsule ${reservation.capsuleId}`,
            entityType: 'reservation',
            entityId: reservation._id,
            metadata: { amount: reservation.totalPrice, method },
          });
    
          try {
            await recordPaymentChange(reservation, previous, paymentStatus, String(req.authUser._id), method);
          } catch (ledgerErr) {
            // The payment status is saved; log the problem so the missing ledger row can be fixed
            console.error('Could not record transaction for reservation', reservation._id, ledgerErr);
          }
        }
    
        res.json(reservation);
      } catch (err) {
        if (err.name === 'ValidationError' || err.name === 'CastError') {
          return res.status(400).json({ message: 'Invalid reservation' });
        }
        console.error(err);
        res.status(500).json({ message: 'Could not update payment' });
      }
    }
  };
};
