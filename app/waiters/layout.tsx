import { canAccessWaiterWorkspace } from '@/lib/auth/access';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function WaitersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/waiters');
  }

  const hasWaiterAccess = await canAccessWaiterWorkspace(supabase, {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata,
  });

  if (!hasWaiterAccess) {
    redirect('/');
  }

  return children;
}
