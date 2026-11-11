import { Navigate } from "react-router-dom";
import { readSessionUser, userHasPermission } from "../permissionUtils.js";

export default function StaffPermissionGate({
  resource,
  action,
  fallback = "/StaffSystemLogs",
  children,
}) {
  const user = readSessionUser();
  if (user?.role === "staff" && !userHasPermission(user, resource, action)) {
    return <Navigate to={fallback} replace />;
  }
  return children;
}
