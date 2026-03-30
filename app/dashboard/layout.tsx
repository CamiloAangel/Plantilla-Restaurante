import { canAccessDashboard } from "@/lib/auth/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const hasAccess = await canAccessDashboard(supabase, user.id);

  if (!hasAccess) {
    redirect("/");
  }

  return children;
}
