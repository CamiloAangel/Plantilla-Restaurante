'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SidebarAdmin() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { name: 'Inventario', href: '/dashboard/inventory', icon: 'inventory_2' },
    { name: 'Staff', href: '/dashboard/staff', icon: 'groups' },
    { name: 'Ajustes', href: '/dashboard/settings', icon: 'settings' },
  ];

  const isActive = (href: string) => pathname === href;

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 border-r-0 bg-stone-900/80 backdrop-blur-xl shadow-[32px_0_32px_-16px_rgba(0,0,0,0.3)] z-50 flex flex-col py-6">
      {/* Logo */}
      <div className="px-6 mb-10">
        <h1 className="text-2xl font-black italic tracking-tighter text-orange-500 uppercase">Vastago Admin</h1>
        <p className="text-xs text-stone-500 font-medium tracking-wide">Street Editorial MGMT</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 mx-2 my-1 rounded-xl transition-all ${
              isActive(item.href)
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20'
                : 'text-stone-400 hover:text-white hover:bg-stone-800 hover:scale-[1.02]'
            }`}
          >
            <span className="material-symbols-outlined" data-icon={item.icon}>
              {item.icon}
            </span>
            <span className="font-headline font-bold text-sm tracking-tight">{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto px-4">
        <button className="w-full bg-secondary-fixed text-on-secondary-fixed font-headline font-extrabold text-xs py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all">
          <span className="material-symbols-outlined text-sm">add</span>
          Nuevos Pedidos
        </button>

        <div className="mt-6 flex flex-col border-t border-stone-800 pt-6 gap-1">
          <Link
            href="/dashboard/tables"
            className="flex items-center gap-3 text-stone-400 hover:text-white px-4 py-2 transition-all hover:bg-stone-800 rounded-lg"
          >
            <span className="material-symbols-outlined">grid_view</span>
            <span className="font-headline font-bold text-xs uppercase tracking-widest">Mesas</span>
          </Link>
          <Link
            href="/dashboard/orders"
            className="flex items-center gap-3 text-stone-400 hover:text-white px-4 py-2 transition-all hover:bg-stone-800 rounded-lg"
          >
            <span className="material-symbols-outlined">receipt_long</span>
            <span className="font-headline font-bold text-xs uppercase tracking-widest">Pedidos</span>
          </Link>
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="w-full flex items-center gap-3 text-stone-400 hover:text-red-400 px-4 py-2 transition-all hover:bg-stone-800 rounded-lg mt-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-headline font-bold text-xs uppercase tracking-widest">
              {isLoading ? 'Saliendo...' : 'Cerrar Sesión'}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
