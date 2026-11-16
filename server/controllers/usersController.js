'use strict';

module.exports = function createUsersController(context) {
  const {
    User,
    audit,
    bcrypt,
    normalizeStaffPermissions,
    toManagedUser,
    toStaff,
    checkAdminCode,
  } = context;
  return {
    listCustomers: async (req, res) => {
      try {
        const users = await User.find({ role: 'customer' })
          .select('firstName lastName email username status createdAt')
          .sort({ createdAt: -1 });
    
        res.json(users);
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
      }
    },
    updateCustomer: async (req, res) => {
    
      try {
        if (req.authUser.role !== 'admin' && String(req.authUser._id) !== req.params.id) {
          return res.status(403).json({ message: 'You can only update your own profile' });
        }
        const { firstName, lastName, username } = req.body;
    
        // Basic validation
        if (!firstName || !lastName || !username) {
          return res.status(400).json({
            message: 'First name, last name, and username are required',
          });
        }
    
        // Check if another user is already using the username
        const existingUsername = await User.findOne({
          username: username.trim(),
          _id: { $ne: req.params.id },
        });
    
        if (existingUsername) {
          return res.status(409).json({
            message: 'Username already in use',
          });
        }
    
        const previousProfile = await User.findById(req.params.id)
          .select('firstName lastName username')
          .lean();
    
        // Update customer
        const user = await User.findOneAndUpdate(
          {
            _id: req.params.id,
            role: 'customer',
          },
          {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            username: username.trim(),
          },
          {
            returnDocument: 'after',
            runValidators: true,
          }
        ).select('firstName lastName email username role status createdAt updatedAt');
    
        if (!user) {
          return res.status(404).json({
            message: 'Customer not found',
          });
        }
    
        // AUDIT
        const changedFields = [];
        if (previousProfile && `${previousProfile.firstName} ${previousProfile.lastName}` !== `${user.firstName} ${user.lastName}`) {
          changedFields.push('name');
        }
        if (previousProfile?.username !== user.username) changedFields.push('username');
        await audit(req, {
          userId: user._id,
          action: 'profile.update',
          description: `Updated ${changedFields.length ? changedFields.join(' and ') : 'profile'}`,
          metadata: { changedFields },
        });
    
        res.json({
          message: 'Profile updated successfully',
          user,
        });
    
      } catch (err) {
        console.error('Profile update error:', err);
    
        if (err.code === 11000) {
          return res.status(409).json({
            message: 'Username already in use',
          });
        }
    
        res.status(500).json({
          message: 'Server error',
        });
      }
    },
    listStaff: async (req, res) => {
      try {
        const staff = await User.find({ role: 'staff' }).sort({ createdAt: -1 });
        res.json(staff.map(toStaff));
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
      }
    },
    createStaff: async (req, res) => {
      try {
        const { name, email, password } = req.body;
        if (!name || !email || !password || password.length < 8) {
          return res.status(400).json({ message: 'Name, email and an 8+ character password are required' });
        }
    
        const lowerEmail = email.toLowerCase();
        if (await User.findOne({ email: lowerEmail })) {
          return res.status(409).json({ message: 'Email already in use' });
        }
    
        // Bahinon ang full name: first name ug last name
        const [firstName, ...rest] = name.trim().split(' ');
    
        // Maghimo og unique username gikan sa email
        const base = lowerEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'staff';
        let username = base, n = 0;
        while (await User.exists({ username })) username = base + (++n);
    
        const user = await User.create({
          firstName,
          lastName: rest.join(' ') || '-',
          email: lowerEmail,
          username,
          password: await bcrypt.hash(password, 10),
          role: 'staff',      // server ang mo-set, dili ang browser
          status: 'active',
        });
    
        // AUDIT
        await audit(req, {
          action: 'staff.create',
          description: `Created staff account ${lowerEmail}`,
          entityType: 'user',
          entityId: user._id,
        });
    
        res.status(201).json(toStaff(user));
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
      }
    },
    updateStaffStatus: async (req, res) => {
      try {
        const { status } = req.body;
        if (!['active', 'disabled'].includes(status)) {
          return res.status(400).json({ message: 'Invalid status' });
        }
        const user = await User.findOneAndUpdate(
          { _id: req.params.id, role: 'staff' },
          { status },
          { returnDocument: 'after' }
        );
        if (!user) return res.status(404).json({ message: 'Not found' });
    
        // AUDIT
        await audit(req, {
          action: 'staff.status',
          description: `Set staff account ${user.email} to ${status}`,
          entityType: 'user',
          entityId: user._id,
        });
    
        res.json(toStaff(user));
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
      }
    },
    listManagedUsers: async (req, res) => {
      try {
        const users = await User.find().select('firstName lastName email role status permissions createdAt')
          .sort({ createdAt: -1 }).lean();
        res.json(users.map(toManagedUser));
      } catch (err) {
        console.error('Could not load managed users:', err);
        res.status(500).json({ message: 'Could not load users' });
      }
    },
    createManagedUser: async (req, res) => {
      try {
        let firstName = typeof req.body.firstName === 'string' ? req.body.firstName.trim() : '';
        let lastName = typeof req.body.lastName === 'string' ? req.body.lastName.trim() : '';
        if (!firstName && !lastName && typeof req.body.name === 'string') {
          const [legacyFirstName, ...legacyLastName] = req.body.name.trim().split(/\s+/);
          firstName = legacyFirstName || '';
          lastName = legacyLastName.join(' ') || '-';
        }
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const password = typeof req.body.password === 'string' ? req.body.password : '';
        const role = req.body.role;
        if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
          return res.status(400).json({ message: 'First name, last name, a valid email, and a password of at least 8 characters are required' });
        }
        if (!['customer', 'staff', 'admin'].includes(role)) {
          return res.status(400).json({ message: 'Choose a valid account type' });
        }
        if (await User.exists({ email })) {
          return res.status(409).json({ message: 'Email already in use' });
        }
        if (role === 'admin') {
          const codeFailure = await checkAdminCode(
            req,
            String(req.authUser._id),
            req.body.adminCode,
            'user.admin_role_grant_failed'
          );
          if (codeFailure) {
            return res.status(codeFailure.status).json({ message: codeFailure.message });
          }
        }
        const permissions = role === 'staff' ? normalizeStaffPermissions(req.body.permissions) : {};
        const usernameBase = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'user';
        let username = usernameBase;
        let suffix = 0;
        while (await User.exists({ username })) username = `${usernameBase}${++suffix}`;
    
        const user = await User.create({
          firstName,
          lastName,
          email,
          username,
          password: await bcrypt.hash(password, 10),
          role,
          permissions,
          status: 'active',
        });
        await audit(req, {
          action: 'user.create',
          description: `Created ${role} account ${email}`,
          entityType: 'user',
          entityId: user._id,
        });
        res.status(201).json(toManagedUser(user));
      } catch (err) {
        if (err.code === 11000) return res.status(409).json({ message: 'Email or username already in use' });
        if (err.message?.startsWith('Staff permissions') || err.message?.startsWith('Unknown permission') || err.message?.startsWith('Invalid permissions')) {
          return res.status(400).json({ message: err.message });
        }
        console.error('Could not create user:', err);
        res.status(500).json({ message: 'Could not create account' });
      }
    },
    updateManagedUser: async (req, res) => {
      try {
        const user = await User.findById(req.params.id);
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        const previousRole = user.role;
        const previousStatus = user.status || 'active';
        const update = {};
        const roleChanged = req.body.role !== undefined && req.body.role !== user.role;
        const statusChanged = req.body.status !== undefined && req.body.status !== user.status;

        if (req.body.role !== undefined) {
          if (!['customer', 'staff', 'admin'].includes(req.body.role)) {
            return res.status(400).json({ message: 'Invalid account role' });
          }
          if (roleChanged && String(user._id) === String(req.authUser._id)) {
            return res.status(403).json({ message: 'You cannot change your own account role' });
          }
          if (roleChanged && user.role === 'admin' && user.status !== 'disabled' && req.body.role !== 'admin') {
            const activeAdmins = await User.countDocuments({ role: 'admin', status: { $ne: 'disabled' } });
            if (activeAdmins <= 1) {
              return res.status(409).json({ message: 'The last active admin account cannot be demoted' });
            }
          }
          update.role = req.body.role;
          if (req.body.role === 'staff') {
            const permissions = req.body.permissions !== undefined
              ? req.body.permissions
              : user.role === 'staff' ? user.permissions : {};
            update.permissions = normalizeStaffPermissions(permissions || {});
          } else {
            update.permissions = {};
          }
        }
        if (req.body.status !== undefined) {
          if (!['active', 'disabled'].includes(req.body.status)) {
            return res.status(400).json({ message: 'Invalid status' });
          }
          if (req.body.status === 'disabled' && String(user._id) === String(req.authUser._id)) {
            return res.status(403).json({ message: 'You cannot disable your own account' });
          }
          if (user.role === 'admin' && req.body.status === 'disabled') {
            const activeAdmins = await User.countDocuments({ role: 'admin', status: { $ne: 'disabled' } });
            if (activeAdmins <= 1) {
              return res.status(409).json({ message: 'The last active admin account cannot be disabled' });
            }
          }
          update.status = req.body.status;
        }
        const effectiveRole = req.body.role ?? user.role;
        const grantsAdminAccess = (roleChanged && effectiveRole === 'admin') ||
          (effectiveRole === 'admin' && user.status === 'disabled' && req.body.status === 'active');
        if (grantsAdminAccess) {
          const codeFailure = await checkAdminCode(
            req,
            String(req.authUser._id),
            req.body.adminCode,
            'user.admin_role_grant_failed'
          );
          if (codeFailure) {
            return res.status(codeFailure.status).json({ message: codeFailure.message });
          }
        }
        if (req.body.permissions !== undefined) {
          if ((req.body.role ?? user.role) !== 'staff') {
            return res.status(400).json({ message: 'Custom permissions can only be assigned to staff accounts' });
          }
          if (req.body.role === undefined) {
            update.permissions = normalizeStaffPermissions(req.body.permissions);
          }
        }
        if (Object.keys(update).length === 0) {
          return res.status(400).json({ message: 'No account changes provided' });
        }
        Object.assign(user, update);
        await user.save();
        await audit(req, {
          userId: user._id,
          action: 'user.access_updated',
          description: `Updated access for ${user.email}`,
          entityType: 'user',
          entityId: user._id,
          metadata: {
            role: roleChanged ? { from: previousRole, to: update.role } : undefined,
            status: statusChanged ? { from: previousStatus, to: update.status } : undefined,
            permissionsChanged: update.permissions !== undefined,
            permissions: update.permissions,
          },
        });
        res.json(toManagedUser(user));
      } catch (err) {
        if (err.message?.startsWith('Staff permissions') || err.message?.startsWith('Unknown permission') || err.message?.startsWith('Invalid permissions')) {
          return res.status(400).json({ message: err.message });
        }
        console.error('Could not update user:', err);
        res.status(500).json({ message: 'Could not update account' });
      }
    }
  };
};
