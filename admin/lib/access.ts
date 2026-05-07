export const adminPermissionOptions = [
  "dashboard.view",
  "subjects.manage",
  "content.manage",
  "users.manage",
  "team.manage",
  "analytics.view",
] as const;

export type AdminPermission = (typeof adminPermissionOptions)[number];
export type AdminSection = "users" | "team";

export function normalizePermissions(permissions?: string[] | null) {
  return Array.isArray(permissions) ? permissions : [];
}

export function hasAnyPermission(
  permissions: string[] | undefined | null,
  required: string[]
) {
  const normalized = normalizePermissions(permissions);
  if (normalized.includes("*") || normalized.includes("all")) {
    return true;
  }
  return required.some((permission) => normalized.includes(permission));
}

export function canAccessSection(
  permissions: string[] | undefined | null,
  section: AdminSection
) {
  if (section === "team") return hasAnyPermission(permissions, ["team.manage"]);
  return hasAnyPermission(permissions, ["users.manage"]);
}

export function canAccessPath(
  pathname: string,
  permissions: string[] | undefined | null
) {
  if (pathname.startsWith("/dashboard/analytics")) {
    return hasAnyPermission(permissions, ["analytics.view"]);
  }

  if (pathname.startsWith("/dashboard/users")) {
    return hasAnyPermission(permissions, ["users.manage", "team.manage"]);
  }

  if (pathname.startsWith("/dashboard/subjects")) {
    return hasAnyPermission(permissions, ["subjects.manage", "content.manage"]);
  }

  if (pathname.startsWith("/dashboard")) {
    return hasAnyPermission(permissions, [
      "dashboard.view",
      "subjects.manage",
      "content.manage",
      "users.manage",
      "team.manage",
      "analytics.view",
    ]);
  }

  return true;
}
