import { MenuSection, PromoSection } from '@/app/components/menu';
import { Navbar } from '@/app/components/home';

export const metadata = {
  title: 'Menú | Vástago',
  description: 'Descubre nuestro menú completo con las mejores opciones de comida de calle.',
};

export default function MenuPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f4]">
      <Navbar />
      
      <div className="pt-[73px]">
        {/* Secciones del menú */}
        <MenuSection />
        
        {/* Sección de promoción */}
        <PromoSection />
      </div>
    </main>
  );
}
