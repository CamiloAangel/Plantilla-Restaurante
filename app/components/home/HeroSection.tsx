export default function HeroSection() {
  return (
    <section className="relative h-[calc(100vh-4rem)] w-full flex items-center justify-center overflow-hidden">
      
      {/* Fondo */}
      <div className="absolute inset-0 z-0">
        <img
          alt="Primer plano de Salchipapa Vástago"
          className="mobile-scroll-zoom w-full h-full object-cover scale-105"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0MHtF2d5Uvj396xKJBig-90xWDJNoqm51V2shRjWvG7nZfsyQ53xW4xNEgIsFkGShjhsUs1Cv1S-vh-vLDQiccI6bv9_Y3_z8cnhM7diZqnp_sbmZ148xuGyyHkyBTPR7A6JCI5YI94yuooBJMKDfTW2o99zMe_8hurkB_BFkvpVyMmJOcW5uyLwvLk0oos7f5uSAa6BcwK909GGB5qxOHqcixqErP2YtBsHN7RnLBEiRAzwOdO5k_-5d4hxuACQFCQytBA3f" 
        />
        <div className="absolute inset-0 bg-white/40 backdrop-blur-md"></div>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 px-4 md:px-6 w-full max-w-5xl mx-auto text-center flex flex-col items-center">
        
        {/* Título: Texto blanco con sombra sólida naranja desplazada a la izquierda */}
        <h1 
          className="font-headline text-[3.5rem] sm:text-6xl md:text-7xl lg:text-[7.5rem] font-black text-white leading-[0.85] tracking-tighter mb-4 md:mb-6"
          style={{ textShadow: '-6px 6px 0px #ab2d00' }}
        >
          EL ARTE DEL <br /> SABOR URBANO
        </h1>

        {/* Párrafo */}
        <p className="font-headline text-lg md:text-2xl font-bold italic text-black max-w-3xl mx-auto leading-tight mb-8 md:mb-10">
          Vastago no es solo comida; es un movimiento. Traemos la disciplina de
          la cocina al caos de la calle.
        </p>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
          <button
            className="bg-white text-black px-8 py-3 rounded-full font-headline font-bold text-lg md:text-xl shadow-lg hover:scale-105 transition-transform w-full sm:w-auto"
            aria-label="Ir a la sección sobre nosotros"
          >
            Sobre nosotros
          </button>
          <button
            className="bg-[#ab2d00] text-white px-8 py-3 rounded-full font-headline font-bold text-lg md:text-xl shadow-lg hover:scale-105 transition-transform w-full sm:w-auto"
            aria-label="Agendar una visita"
          >
            Deseo agendar
          </button>
        </div>
      </div>
    </section>
  );
}