'use strict';

module.exports = function createCapsulesController(context) {
  const {
    Capsule,
    audit,
    hasPermission,
    setArchived,
  } = context;
  return {
    listCapsules: async (req, res) => {
      if (req.authUser?.role === 'staff' && !hasPermission(req.authUser, 'spaces', 'view')) {
        return res.status(403).json({ message: 'You do not have permission to view spaces' });
      }
      try {
        const archived = req.query.archived === 'true';
        const filter = archived ? { isArchived: true } : { isArchived: { $ne: true } };
        const capsules = await Capsule.find(filter).sort({ capsuleId: 1 });
        res.json(capsules);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Could not load capsules' });
      }
    },
    createCapsule: async (req, res) => {
      try {
        const { capsuleId, capsuleName, room, type, pricePerHour, status } = req.body;
        if (!capsuleId || !capsuleName || pricePerHour == null) {
          return res.status(400).json({ message: 'Missing required fields' });
        }
        if (await Capsule.exists({ capsuleId: capsuleId.trim() })) {
          return res.status(409).json({ message: 'That Capsule ID already exists' });
        }
        const capsule = await Capsule.create({
          capsuleId, capsuleName, room, type, pricePerHour: Number(pricePerHour), status,
        });
        await audit(req, {
          action: 'capsule.create',
          description: `Created capsule ${capsule.capsuleId}`,
          entityType: 'capsule',
          entityId: capsule._id,
          metadata: { capsuleName: capsule.capsuleName, room: capsule.room, type: capsule.type, pricePerHour: capsule.pricePerHour },
        });
        res.status(201).json(capsule);
      } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
        console.error(err);
        res.status(500).json({ message: 'Could not create capsule' });
      }
    },
    updateCapsule: async (req, res) => {
      try {
        const { capsuleName, room, type, pricePerHour, status } = req.body;
        const capsule = await Capsule.findOneAndUpdate(
          { capsuleId: req.params.id },
          { capsuleName, room, type, pricePerHour: Number(pricePerHour), status },
          { returnDocument: 'after', runValidators: true }
        );
        if (!capsule) return res.status(404).json({ message: 'Capsule not found' });
        await audit(req, {
          action: 'capsule.update',
          description: `Updated capsule ${capsule.capsuleId}`,
          entityType: 'capsule',
          entityId: capsule._id,
          metadata: { capsuleName: capsule.capsuleName, room: capsule.room, type: capsule.type, pricePerHour: capsule.pricePerHour, status: capsule.status },
        });
        res.json(capsule);
      } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
        console.error(err);
        res.status(500).json({ message: 'Could not update capsule' });
      }
    },
    archiveCapsule: (req, res) => setArchived(req, res, true),
    restoreCapsule: (req, res) => setArchived(req, res, false)
  };
};
