import { canAccessDashboard } from "@/lib/auth/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseClient";

interface AdminContextSuccess {
  ok: true;
  userId: string;
  adminClient: NonNullable<typeof supabaseAdmin>;
}

interface AdminContextFailure {
  ok: false;
  status: 401 | 403 | 500;
  error: string;
}

export type AdminRequestContext = AdminContextSuccess | AdminContextFailure;

export const getAdminRequestContext = async (): Promise<AdminRequestContext> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      status: 401,
      error: "Debes iniciar sesión para acceder a este recurso.",
    };
  }

  const hasAccess = await canAccessDashboard(supabase, user.id);

  if (!hasAccess) {
    return {
      ok: false,
      status: 403,
      error: "No tienes permisos para acceder a este recurso de administración.",
    };
  }

  if (!supabaseAdmin) {
    return {
      ok: false,
      status: 500,
      error: "Configuración incompleta del servidor (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  return {
    ok: true,
    userId: user.id,
    adminClient: supabaseAdmin,
  };
};
