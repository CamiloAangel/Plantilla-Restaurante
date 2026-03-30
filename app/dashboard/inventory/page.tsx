import { SidebarAdmin, InventorySection } from '@/app/components/admin';

export const metadata = {
  title: 'Inventario | Vástago Admin',
  description: 'Manage your restaurant inventory',
};

export default function InventoryPage() {
  return (
    <div className="flex bg-surface">
      <SidebarAdmin />
      <InventorySection />
    </div>
  );
}
