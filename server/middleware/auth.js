'use strict';

const jwt = require('jsonwebtoken');

const STAFF_PERMISSION_ACTIONS = {
  dashboard: ['view'],
  reservations: ['view', 'create', 'update'],
  spaces: ['view', 'create', 'update', 'delete'],
  customers: ['view'],
  reports: ['view', 'export'],
  auditLogs: ['view'],
};

const LEGACY_STAFF_PERMISSIONS = {
  dashboard: ['view'],
  reservations: ['view', 'create', 'update'],
  spaces: ['view', 'create', 'update', 'delete'],
  customers: ['view'],
};

module.exports = function createAuthMiddleware({ User, JWT_SECRET }) {
  async function findTokenUser(req) {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return null;

    try {
      const payload = jwt.verify(match[1], JWT_SECRET);
      if (!payload || typeof payload !== 'object' || typeof payload.sub !== 'string') return null;
      const user = await User.findOne({
        _id: payload.sub,
        status: { $ne: 'disabled' },
      }).select('_id role firstName lastName email permissions');
      if (!user) return null;
      const staffEmails = new Set(
        (process.env.STAFF_EMAILS || '')
          .split(',')
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      );
      if (staffEmails.has(user.email.toLowerCase())) user.role = 'staff';
      return user;
    } catch (err) {
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return null;
      throw err;
    }
  }

  function createLoginToken(user) {
    return jwt.sign({ sub: String(user._id) }, JWT_SECRET, { expiresIn: '7d' });
  }

  async function requireLogin(req, res, next) {
    try {
      const user = req.authUser || await findTokenUser(req);
      if (!user) return res.status(401).json({ message: 'Login required' });
      req.authUser = user;
      next();
    } catch (err) {
      console.error('Could not verify account:', err);
      res.status(500).json({ message: 'Could not verify account' });
    }
  }

  function requireStaffOrAdmin(req, res, next) {
    if (!req.authUser) return res.status(401).json({ message: 'Login required' });
    if (!['staff', 'admin'].includes(req.authUser.role)) {
      return res.status(403).json({ message: 'Staff access only' });
    }
    next();
  }

  function hasPermission(user, resource, action) {
    if (user?.role === 'admin') return true;
    if (user?.role !== 'staff') return false;
    const permissions = user.permissions && Object.keys(user.permissions).length
      ? user.permissions
      : LEGACY_STAFF_PERMISSIONS;
    const allowedActions = permissions[resource];
    if (!Array.isArray(allowedActions) || !allowedActions.includes(action)) return false;
    if (resource === 'dashboard' && action === 'view') {
      return Boolean(permissions.reservations?.includes('view') && permissions.spaces?.includes('view'));
    }
    if (resource === 'reservations' && action === 'create') {
      return Boolean(permissions.customers?.includes('view') && permissions.spaces?.includes('view'));
    }
    return action === 'view' || allowedActions.includes('view');
  }

  function requirePermission(resource, action) {
    return (req, res, next) => {
      const user = req.authUser;
      if (!user) return res.status(401).json({ message: 'Login required' });
      if (!['admin', 'staff'].includes(user.role)) {
        return res.status(403).json({ message: 'Staff access only' });
      }
      if (!hasPermission(user, resource, action)) {
        return res.status(403).json({ message: `You do not have permission to ${action} ${resource}` });
      }
      next();
    };
  }

  function requireStaffPermission(resource, action) {
    return (req, res, next) => {
      if (req.authUser?.role !== 'staff' || hasPermission(req.authUser, resource, action)) {
        return next();
      }
      return res.status(403).json({ message: `You do not have permission to ${action} ${resource}` });
    };
  }

  async function requireAdmin(req, res, next) {
    try {
      const user = req.authUser || await findTokenUser(req);
      if (!user) return res.status(401).json({ message: 'Admin login required' });
      if (user.role !== 'admin') return res.status(403).json({ message: 'Admin access only' });
      req.authUser = user;
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  function attachApiIdentity() {
    return async (req, res, next) => {
      try {
        req.authUser = await findTokenUser(req);
        next();
      } catch (err) {
        console.error('Could not verify API identity:', err);
        res.status(500).json({ message: 'Could not verify account' });
      }
    };
  }

  return {
    STAFF_PERMISSION_ACTIONS,
    LEGACY_STAFF_PERMISSIONS,
    findTokenUser,
    createLoginToken,
    requireLogin,
    requireStaffOrAdmin,
    hasPermission,
    requirePermission,
    requireStaffPermission,
    requireAdmin,
    attachApiIdentity,
  };
};
