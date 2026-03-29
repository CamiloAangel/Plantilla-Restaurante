'use client'; // Necesario para usePathname

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Definimos los enlaces de navegación.
  // La imagen muestra 'Menu' como activo, así que asumiremos que es la página de inicio.
  const navLinks = [
    { name: 'Home', href: '/' }, 
    { name: 'Menu', href: '/menu' },
    { name: 'Stories', href: '/stories' },
  ];

  // Colores personalizados aproximados basados en la imagen:
  // - Naranja quemado para el logo y botón: #963000
  // - Amarillo mostaza para el subrayado: #F2B705
  // - Negro para el texto de los enlaces: #000000

  return (
    // Contenedor principal: Fijo en la parte superior, fondo semi-transparente y desenfoque.
    <header className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-zinc-100/50">
      <nav className="container mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        
        {/* Sección Izquierda: Logo */}
        <div className="flex-shrink-0">
          <Link href="/" className="text-2xl md:text-3xl font-extrabold text-[#963000] tracking-tight">
            VASTAGO
          </Link>
        </div>

        {/* Sección Central: Enlaces de Navegación */}
        {/* Usamos flex y gap para el espaciado entre los enlaces. */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => {
            // Comprobamos si la ruta actual coincide con el href del enlace.
            const isActive = pathname === link.href;

            return (
              <div key={link.name} className="relative group">
                <Link
                  href={link.href}
                  // pb-1.5 da espacio para el subrayado sin mover el texto.
                  // px-0.5 da un pequeño respiro lateral al texto.
                  className={`text-black text-xl pb-1.5 px-0.5 font-medium transition-colors ${
                    isActive ? 'font-semibold' : 'hover:text-[#963000]/80'
                  }`}
                >
                  {link.name}
                </Link>
                
                {/* Efecto de subrayado sutil para la página activa */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#F2B705] rounded-full transition-all duration-300" />
                )}
                
                {/* Efecto de subrayado opcional al pasar el mouse (para páginas no activas) */}
                {!isActive && (
                  <div className="absolute bottom-0 left-0 w-0 group-hover:w-full h-0.5 bg-[#F2B705]/80 rounded-full transition-all duration-300" />
                )}
              </div>
            );
          })}
        </div>

        {/* Sección Derecha: Botón de Llamada a la Acción */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <Link
            href="/order"
            className="bg-[#963000] text-white px-4 md:px-8 py-2 md:py-2.5 rounded-full text-sm md:text-lg font-semibold hover:bg-[#963000]/90 transition-all duration-300 shadow-sm"
          >
            Escribenos!
          </Link>

          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-menu"
            aria-label="Abrir menu de navegacion"
            className="md:hidden inline-flex items-center justify-center rounded-full border border-zinc-300 px-3 py-2 text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            Menu
          </button>
        </div>
      </nav>

      {isMenuOpen && (
        <div id="mobile-nav-menu" className="md:hidden border-t border-zinc-200 bg-white/95 backdrop-blur-sm">
          <div className="px-4 py-3 flex flex-col gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;

              return (
                <button
                  key={link.name}
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push(link.href);
                  }}
                  className={`w-full text-left rounded-md px-3 py-2 text-base transition-colors ${
                    isActive
                      ? 'bg-[#F2B705]/20 text-[#963000] font-semibold'
                      : 'text-zinc-800 hover:bg-zinc-100'
                  }`}
                >
                  {link.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}