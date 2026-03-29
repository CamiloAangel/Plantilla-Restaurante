import { MenuSection, PromoSection } from '@/app/components/menu';
import { Navbar } from '@/app/components/home';

export const metadata = {
  title: 'Menú | Vástago',
  description: 'Descubre nuestro menú completo con las mejores opciones de comida de calle.',
};

export default function MenuPage() {
  return (
    <main className="pt-[73px]">
      {/* Barra de navegación */}
      <Navbar />
      
      {/* Menú de productos */}
      <MenuSection />
      
      {/* Sección de promoción */}
      <PromoSection />
    </main>
  );
}
