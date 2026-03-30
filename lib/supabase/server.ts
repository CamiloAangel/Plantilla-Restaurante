import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL en variables de entorno");
}

if (!supabaseAnonKey) {
  throw new Error("Falta NEXT_PUBLIC_SUPABASE_ANON_KEY en variables de entorno");
}

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();
  const writableCookieStore = cookieStore as unknown as {
    set?: (...args: unknown[]) => void;
  };

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // En algunos contextos de Server Components las cookies son read-only.
          writableCookieStore.set?.(name, value, options);
        });
      },
    },
  });
};
