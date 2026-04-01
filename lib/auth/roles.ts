export const ROLE_IDS = {
  admin: "ee079647-826f-4dfb-b682-1eab600bbab2",
  waiter: process.env.NEXT_PUBLIC_WAITER_ROLE_ID || "",
} as const;

const dashboardAllowedRoleIds = new Set<string>([ROLE_IDS.admin]);
const waiterAllowedRoleIds = new Set<string>(
  [ROLE_IDS.waiter].filter((roleId): roleId is string => Boolean(roleId))
);

const normalizeRoleName = (roleName?: string | null): string =>
  typeof roleName === "string" ? roleName.trim().toLowerCase() : "";

export const isAdminRoleName = (roleName?: string | null): boolean => {
  const normalized = normalizeRoleName(roleName);
  return normalized === "admin" || normalized === "administrador";
};

export const isWaiterRoleName = (roleName?: string | null): boolean => {
  const normalized = normalizeRoleName(roleName);
  return normalized === "mesero" || normalized === "waiter";
};

export const hasDashboardAccess = (roleId?: string | null): boolean => {
  if (!roleId) {
    return false;
  }

  return dashboardAllowedRoleIds.has(roleId);
};

export const hasWaiterAccess = (
  roleId?: string | null,
  roleName?: string | null
): boolean => {
  if (roleId && waiterAllowedRoleIds.has(roleId)) {
    return true;
  }

  return isWaiterRoleName(roleName);
};
