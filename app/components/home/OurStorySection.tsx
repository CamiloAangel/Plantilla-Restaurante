export default function OurStorySection() {
  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="md:w-1/2">
          <h3 className="font-headline text-5xl md:text-7xl font-extrabold font-black text-[#ab2d00] tracking-tight mb-8">
            NUESTRA HISTORIA: <br />
          </h3>

            <div className="space-y-8 font-headline font-bold text-2xl text-[#000000]">
            <p>
              Este es un sueño familiar que lleva generaciones 
              cocinándose en la calle con mucho esfuerzo. Venimos 
              desde abajo, heredando el sazón de nuestros abuelos y el 
              amor por la comida honesta y sin reglas. Para nosotros, 
              no hay mayor felicidad que verte sonreír, ensuciarte las manos
               y salir con la barriga llena. Servir a nuestra gente con cariño
                es lo que nos da vida todos los días.
            </p>
            </div>
          </div>

          <div className="md:w-5/12 relative">
            <div className="aspect-square rounded-xl overflow-hidden shadow-2xl border-8 border-white bg-[#f5f5f5]">
              <img
                alt="Professional studio food photography portrait of chefs"
                className="mobile-scroll-zoom w-full h-full object-cover"
                src="OurStorySection.webp"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
