import { SidebarAdmin } from '@/app/components/admin';

export const metadata = {
  title: 'Mesas | Vástago Admin',
  description: 'Ruta administrativa para contexto de mesas.',
};

export default function AdminTablesPage() {
  return (
    <div className="bg-surface min-h-screen overflow-x-hidden">
      <SidebarAdmin />
      <main className="w-full min-h-screen bg-stone-50 md:ml-64 md:w-[calc(100%-16rem)] px-4 md:px-8 pt-20 md:pt-8 pb-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-black leading-none mb-3">
            Mesas
            <span className="text-orange-600 italic"> Contexto Admin</span>
          </h1>
          <p className="text-stone-600 font-medium max-w-2xl">
            La operacion en tiempo real de mesas y pedidos vive en la vista de meseros. Esta ruta se mantiene para no romper la navegacion del sidebar administrativo.
          </p>
        </div>
      </main>
    </div>
  );
}
