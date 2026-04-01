'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SidebarWaiter() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Mesas', href: '/waiters', icon: 'grid_view' },
    { name: 'Pedidos', href: '/waiters/orders', icon: 'receipt_long' },
  ];

  const isActive = (href: string) => pathname === href;

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isMobileMenuOpen && (
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="fixed top-4 left-4 z-40 md:hidden w-12 h-12 rounded-full bg-orange-500 text-white shadow-lg shadow-orange-900/30 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Abrir navegacion"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
      )}

      {isMobileMenuOpen && (
        <button
          type="button"
          onClick={closeMobileMenu}
          className="fixed inset-0 bg-black/45 z-40 md:hidden"
          aria-label="Cerrar navegacion"
        />
      )}

      <aside
        className={`h-dvh w-64 fixed left-0 top-0 border-r-0 bg-stone-900/90 backdrop-blur-xl shadow-[32px_0_32px_-16px_rgba(0,0,0,0.3)] z-50 flex flex-col py-6 transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="px-6 mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter text-orange-500 uppercase">Vastago Meseros</h1>
            <p className="text-xs text-stone-500 font-medium tracking-wide">Street Editorial MGMT</p>
          </div>
          <button
            type="button"
            onClick={closeMobileMenu}
            className="md:hidden text-stone-300 hover:text-white p-1"
            aria-label="Cerrar menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={closeMobileMenu}
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

        <div className="mt-auto px-4">
          <Link
            href="/waiters/orders"
            onClick={closeMobileMenu}
            className="w-full bg-secondary-fixed text-on-secondary-fixed font-headline font-extrabold text-xs py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Nuevos Pedidos
          </Link>

          <div className="mt-6 flex flex-col border-t border-stone-800 pt-6 gap-1">
            <button
              onClick={() => {
                closeMobileMenu();
                void handleLogout();
              }}
              disabled={isLoading}
              className="w-full flex items-center gap-3 text-stone-400 hover:text-red-400 px-4 py-2 transition-all hover:bg-stone-800 rounded-lg mt-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="font-headline font-bold text-xs uppercase tracking-widest">
                {isLoading ? 'Saliendo...' : 'Cerrar Sesion'}
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
