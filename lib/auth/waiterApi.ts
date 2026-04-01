import { canAccessWaiterWorkspace } from "@/lib/auth/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseClient";

interface WaiterContextSuccess {
  ok: true;
  userId: string;
  serviceClient: NonNullable<typeof supabaseAdmin>;
}

interface WaiterContextFailure {
  ok: false;
  status: 401 | 403 | 500;
  error: string;
}

export type WaiterRequestContext = WaiterContextSuccess | WaiterContextFailure;

export const getWaiterRequestContext = async (): Promise<WaiterRequestContext> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      status: 401,
      error: "Debes iniciar sesion para acceder a este recurso.",
    };
  }

  const hasAccess = await canAccessWaiterWorkspace(supabase, {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata,
  });

  if (!hasAccess) {
    return {
      ok: false,
      status: 403,
      error: "No tienes permisos para acceder a recursos de mesero.",
    };
  }

  if (!supabaseAdmin) {
    return {
      ok: false,
      status: 500,
      error: "Configuracion incompleta del servidor (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  return {
    ok: true,
    userId: user.id,
    serviceClient: supabaseAdmin,
  };
};
