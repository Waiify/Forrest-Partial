'use strict';

const mongoose = require('mongoose');

module.exports = function createCapsulesController(context) {
  const {
    Capsule,
    SpaceRoom,
    DEFAULT_ROOM_NAME,
    audit,
    cleanRoomName,
    findSpaceRoom,
    getRooms,
    hasPermission,
    setArchived,
    spaceModel,
    updateSpace,
    validRoomName,
  } = context;
  const isLegacyCapsuleRoom = (name) =>
    String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase() === 'room 1';

  return {
    // GET /api/capsules/rooms  (all room names)
    listRooms: async (req, res) => {
      if (req.authUser?.role === 'staff' && !hasPermission(req.authUser, 'spaces', 'view')) {
        return res.status(403).json({ message: 'You do not have permission to view spaces' });
      }
      try {
        const rooms = await getRooms();
        res.json(rooms.filter((r) => !isLegacyCapsuleRoom(r.name)).map((r) => r.name));
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Could not load rooms' });
      }
    },
    // POST /api/capsules/rooms  (create a new room type and its own collection)
    createRoom: async (req, res) => {
      try {
        const name = cleanRoomName(req.body.name);
        if (isLegacyCapsuleRoom(name)) {
          return res.status(400).json({ message: '"Room 1" is reserved for Capsule Pods.' });
        }
        if (!validRoomName(name) || name.toLowerCase() === 'rooms') {
          return res.status(400).json({
            message: "Room name must be 2-40 characters: letters, numbers, spaces, - & ' only.",
          });
        }

        const rooms = await getRooms();
        if (rooms.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
          return res.status(409).json({ message: `"${name}" already exists.` });
        }

        // Never take over a collection the system already uses (Users, Reservations, ...)
        const existing = await mongoose.connection.db.listCollections().toArray();
        if (existing.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
          return res.status(409).json({
            message: `"${name}" is already used by another collection. Pick a different name.`,
          });
        }

        await SpaceRoom.create({ name, collectionName: name });
        try {
          await spaceModel(name).createCollection();
        } catch (err) {
          await SpaceRoom.deleteOne({ name });
          throw err;
        }

        await audit(req, {
          action: 'room.create',
          description: `Created room ${name}`,
          entityType: 'room',
          metadata: { name },
        });
        res.status(201).json({ name });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Could not create room' });
      }
    },
    // GET /api/capsules?archived=true|false
    //   default        -> spaces from EVERY room, each tagged with the room it is stored in
    //   scope=capsules -> the original Capsules collection only (as before)
    listCapsules: async (req, res) => {
      if (req.authUser?.role === 'staff' && !hasPermission(req.authUser, 'spaces', 'view')) {
        return res.status(403).json({ message: 'You do not have permission to view spaces' });
      }
      try {
        const archived = req.query.archived === 'true';
        const filter = archived ? { isArchived: true } : { isArchived: { $ne: true } };

        if (req.query.scope !== 'capsules') {
          const rooms = await getRooms();
          const lists = await Promise.all(
            rooms.map(async (r) => {
              const docs = await spaceModel(r.collectionName).find(filter).sort({ capsuleId: 1 }).lean();
              const room = isLegacyCapsuleRoom(r.name) ? DEFAULT_ROOM_NAME : r.name;
              return docs.map((d) => ({ ...d, room }));
            })
          );
          return res.json(lists.flat());
        }

        const capsules = await Capsule.find(filter).sort({ capsuleId: 1 });
        res.json(capsules.map((capsule) => {
          const item = capsule.toObject();
          return isLegacyCapsuleRoom(item.room)
            ? { ...item, room: DEFAULT_ROOM_NAME }
            : item;
        }));
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Could not load capsules' });
      }
    },
    // POST /api/capsules  (the room decides which collection it is saved in)
    createCapsule: async (req, res) => {
      try {
        const { capsuleId, capsuleName, room, type, pricePerHour, status } = req.body;
        if (!capsuleId || !capsuleName || pricePerHour == null) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        // No room (or the old "Room 1") means Capsule Pods
        const roomName = !room || isLegacyCapsuleRoom(room) ? DEFAULT_ROOM_NAME : room;
        const target = (await getRooms()).find((r) => r.name === roomName);
        if (!target) return res.status(400).json({ message: `Unknown room "${roomName}"` });

        // Capsule IDs stay unique across ALL rooms (reservations use the ID)
        if (await findSpaceRoom(capsuleId.trim())) {
          return res.status(409).json({ message: 'That Capsule ID already exists' });
        }

        const space = await spaceModel(target.collectionName).create({
          capsuleId, capsuleName, room: target.name, type, pricePerHour: Number(pricePerHour), status,
        });
        const capsule = { ...space.toObject(), room: target.name };
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
    // PUT /api/capsules/:id  (found in whichever room holds it; a space can't change rooms)
    updateCapsule: async (req, res) => {
      try {
        const { capsuleName, room, type, pricePerHour, status } = req.body;
        const capsule = await updateSpace(
          req.params.id,
          { capsuleName, room, type, pricePerHour: Number(pricePerHour), status }
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