const { ForbiddenError } = require("../utils/errors");
const { normalizePermissions } = require("./permissions");

function permissionAuth(requiredPermissions = []) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError("Authentication required");
      }

      if (req.user.role !== "admin") {
        throw new ForbiddenError("Admin access required");
      }

      const permissions = normalizePermissions(req.user.permissions);
      if (permissions.includes("*") || permissions.includes("all")) {
        return next();
      }

      const allowed = requiredPermissions.some((permission) =>
        permissions.includes(permission)
      );

      if (!allowed) {
        throw new ForbiddenError("You do not have permission to access this section");
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = permissionAuth;
