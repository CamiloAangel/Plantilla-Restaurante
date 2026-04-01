import { SidebarWaiter } from '@/app/components/waiters';
import WaitersSection from '@/app/components/waiters/waiters-section';

export const metadata = {
  title: 'Pedidos | Vástago Meseros',
  description: 'Pedidos activos e historial operativo para meseros en Vástago.',
};

export default function WaitersOrdersPage() {
  return (
    <div className="bg-white min-h-screen overflow-x-hidden">
      <SidebarWaiter />
      <WaitersSection initialView="orders" />
    </div>
  );
}
