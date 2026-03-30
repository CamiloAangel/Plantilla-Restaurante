import { DashboardSection, SidebarAdmin } from '@/app/components/admin';

export const metadata = {
  title: 'Dashboard | Vástago Admin',
  description: 'Panel de administración de Vástago',
};

export default function DashboardPage() {
  return (
    <div className="bg-surface min-h-screen">
      <SidebarAdmin />
      <DashboardSection />
    </div>
  );
}
