export const LEGACY_STAFF_PERMISSIONS = {
  dashboard: ["view"],
  reservations: ["view", "create", "update"],
  spaces: ["view", "create", "update", "delete"],
  customers: ["view"],
};

export function readSessionUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem("user") || "null");
    return user && typeof user === "object" ? user : null;
  } catch {
    return null;
  }
}

export function userHasPermission(user, resource, action) {
  if (user?.role === "admin") return true;
  if (user?.role !== "staff") return false;
  const permissions = user.permissions && Object.keys(user.permissions).length
    ? user.permissions
    : LEGACY_STAFF_PERMISSIONS;
  const allowedActions = permissions[resource];
  if (!Array.isArray(allowedActions) || !allowedActions.includes(action)) return false;
  if (resource === "dashboard" && action === "view") {
    return Boolean(permissions.reservations?.includes("view") && permissions.spaces?.includes("view"));
  }
  if (resource === "reservations" && action === "create") {
    return Boolean(permissions.customers?.includes("view") && permissions.spaces?.includes("view"));
  }
  return action === "view" || allowedActions.includes("view");
}

export function hasCurrentPermission(resource, action) {
  return userHasPermission(readSessionUser(), resource, action);
}
