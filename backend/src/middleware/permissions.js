const { ForbiddenError } = require("../utils/errors");

function normalizePermissions(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function hasPermission(userPermissions, requiredPermissions) {
  const permissions = normalizePermissions(userPermissions);
  if (permissions.includes("*") || permissions.includes("all")) {
    return true;
  }

  return requiredPermissions.some((permission) => permissions.includes(permission));
}

function requirePermissions(...requiredPermissions) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError("Authentication required");
      }

      if (req.user.role !== "admin") {
        throw new ForbiddenError("Admin access required");
      }

      if (!hasPermission(req.user.permissions, requiredPermissions)) {
        throw new ForbiddenError("You do not have permission to access this section");
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requirePermissions, hasPermission, normalizePermissions };
