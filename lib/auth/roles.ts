export const ROLE_IDS = {
  admin: "ee079647-826f-4dfb-b682-1eab600bbab2",
} as const;

const dashboardAllowedRoleIds = new Set<string>([ROLE_IDS.admin]);

export const hasDashboardAccess = (roleId?: string | null): boolean => {
  if (!roleId) {
    return false;
  }

  return dashboardAllowedRoleIds.has(roleId);
};
