import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasDashboardAccess,
  hasWaiterAccess,
  isAdminRoleName,
  isWaiterRoleName,
} from "./roles";

export type UserAccessScope = "admin" | "waiter" | "none";

interface AccessUserInput {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

interface ApiLikeError {
  code?: string;
  message: string;
  details?: string | null;
}

const isMissingTableError = (error: ApiLikeError | null): boolean => {
  if (!error) {
    return false;
  }

  const searchableMessage = `${error.message} ${error.details || ""}`.toLowerCase();
  return error.code === "PGRST205" || searchableMessage.includes("could not find the table");
};

export const getUserRoleId = async (
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("role_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error al obtener rol del perfil:", error);
    return null;
  }

  return data?.role_id ?? null;
};

const getRoleNameFromRoleId = async (
  supabase: SupabaseClient,
  roleId?: string | null
): Promise<string | null> => {
  if (!roleId) {
    return null;
  }

  const { data, error } = await supabase
    .from("roles")
    .select("name")
    .eq("id", roleId)
    .maybeSingle();

  if (error) {
    if (!isMissingTableError(error)) {
      console.error("Error al obtener nombre de rol:", error);
    }
    return null;
  }

  return typeof data?.name === "string" ? data.name : null;
};

const getStaffRoleByEmail = async (
  supabase: SupabaseClient,
  email?: string | null
): Promise<string | null> => {
  if (!email) {
    return null;
  }

  const { data, error } = await supabase
    .from("staff")
    .select("role")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    if (!isMissingTableError(error)) {
      console.error("Error al obtener rol de staff:", error);
    }
    return null;
  }

  return typeof data?.role === "string" ? data.role : null;
};

const getMetadataRole = (user: AccessUserInput): string | null => {
  const metadata = user.user_metadata || {};
  const roleCandidate = metadata.role;

  if (typeof roleCandidate !== "string") {
    return null;
  }

  const normalized = roleCandidate.trim();
  return normalized.length > 0 ? normalized : null;
};

export const getUserAccessScope = async (
  supabase: SupabaseClient,
  user: AccessUserInput
): Promise<UserAccessScope> => {
  const roleId = await getUserRoleId(supabase, user.id);

  if (hasDashboardAccess(roleId)) {
    return "admin";
  }

  const roleName = await getRoleNameFromRoleId(supabase, roleId);

  if (isAdminRoleName(roleName)) {
    return "admin";
  }

  if (hasWaiterAccess(roleId, roleName)) {
    return "waiter";
  }

  const staffRole = await getStaffRoleByEmail(supabase, user.email);

  if (isWaiterRoleName(staffRole)) {
    return "waiter";
  }

  const metadataRole = getMetadataRole(user);

  if (isWaiterRoleName(metadataRole)) {
    return "waiter";
  }

  return "none";
};

export const canAccessDashboard = async (
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> => {
  const roleId = await getUserRoleId(supabase, userId);
  if (hasDashboardAccess(roleId)) {
    return true;
  }

  const roleName = await getRoleNameFromRoleId(supabase, roleId);
  return isAdminRoleName(roleName);
};

export const canAccessWaiterWorkspace = async (
  supabase: SupabaseClient,
  user: AccessUserInput
): Promise<boolean> => {
  const scope = await getUserAccessScope(supabase, user);
  return scope === "waiter";
};
