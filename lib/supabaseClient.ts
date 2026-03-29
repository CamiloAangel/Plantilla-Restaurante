import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
	throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en variables de entorno");
}

if (!supabaseAnonKey) {
	throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY en variables de entorno");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Solo se crea en servidor para evitar exponer la service role key en el cliente.
export const supabaseAdmin =
	typeof window === "undefined" && supabaseServiceRoleKey
		? createClient(supabaseUrl, supabaseServiceRoleKey)
		: null;