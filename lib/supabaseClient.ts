import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
	throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en variables de entorno");
}

if (!supabaseAnonKey) {
	throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY en variables de entorno");
}

const createSupabaseClient = (): SupabaseClient => {
	if (typeof window !== "undefined") {
		// Cliente en browser: comparte sesión vía cookies para SSR/middleware.
		return createBrowserClient(supabaseUrl, supabaseAnonKey);
	}

	return createClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = createSupabaseClient();

// Solo se crea en servidor para evitar exponer la service role key en el cliente.
export const supabaseAdmin =
	typeof window === "undefined" && supabaseServiceRoleKey
		? createClient(supabaseUrl, supabaseServiceRoleKey)
		: null;