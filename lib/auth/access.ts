import type { SupabaseClient } from "@supabase/supabase-js";
import { hasDashboardAccess } from "./roles";

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

export const canAccessDashboard = async (
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> => {
  const roleId = await getUserRoleId(supabase, userId);
  return hasDashboardAccess(roleId);
};
