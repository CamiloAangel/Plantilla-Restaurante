import { SidebarAdmin } from '@/app/components/admin';

export const metadata = {
  title: 'Pedidos | Vástago Admin',
  description: 'Ruta administrativa para contexto de pedidos.',
};

export default function AdminOrdersPage() {
  return (
    <div className="bg-surface min-h-screen overflow-x-hidden">
      <SidebarAdmin />
      <main className="w-full min-h-screen bg-stone-50 md:ml-64 md:w-[calc(100%-16rem)] px-4 md:px-8 pt-20 md:pt-8 pb-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-black leading-none mb-3">
            Pedidos
            <span className="text-orange-600 italic"> Contexto Admin</span>
          </h1>
          <p className="text-stone-600 font-medium max-w-2xl">
            La toma operativa de pedidos por mesa pertenece a la vista de meseros. Esta ruta administrativa se mantiene para que la navegacion del sidebar no termine en 404.
          </p>
        </div>
      </main>
    </div>
  );
}
