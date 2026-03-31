import { SidebarAdmin, StaffSection } from '@/app/components/admin';

export const metadata = {
  title: 'Staff | Vástago Admin',
  description: 'Gestión del equipo de Vástago',
};

export default function StaffPage() {
  return (
    <div className="bg-surface min-h-screen overflow-x-hidden">
      <SidebarAdmin />
      <StaffSection />
    </div>
  );
}