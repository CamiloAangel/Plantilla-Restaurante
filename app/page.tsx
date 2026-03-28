/**
 * Home Page Component
 * 
 * Página principal de VASTAGO - Editorial Street Food
 * 
 * Estructura:
 * - Hero Section: Presentación principal con imagen de fondo y CTA
 * - News Section: Producto destacado "The Giant" con descripción editorial
 * - Our Story Section: Narrativa de la marca y origen
 * - Gallery Section: Galería masónica de platos
 * - End Section: Llamada a acción final
 * 
 * @component
 * @returns {JSX.Element} Página completa con todas las secciones
 */

import {
  Navbar,
  HeroSection,
  NewsSection,
  OurStorySection,
  GallerySection,
  EndSection,
} from "./components/home";

export default function Home() {
  return (
    <main className="pt-16 bg-white">
      <Navbar />

      {/* Hero Section - Presentación principal */}
      <HeroSection />

      {/* News Section - Producto destacado */}
      <NewsSection />

      {/* Our Story Section - Narrativa de marca */}
      <OurStorySection />

      {/* Gallery Section - Galería de platos */}
      <GallerySection />

      {/* End Section - CTA final */}
      <EndSection />
    </main>
  );
}
