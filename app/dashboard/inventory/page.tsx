import { SidebarAdmin, InventorySection } from '@/app/components/admin';

export const metadata = {
  title: 'Inventario | Vástago Admin',
  description: 'Manage your restaurant inventory',
};

export default function InventoryPage() {
  return (
    <div className="bg-surface min-h-screen overflow-x-hidden">
      <SidebarAdmin />
      <InventorySection />
    </div>
  );
}
