'use client'; // No olvides esto para que Framer Motion funcione

import { motion } from 'framer-motion';

export default function OurStorySection() {
  return (
    <section className="bg-white py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
          
          {/* LADO IZQUIERDO: Textos (Entra desde la izquierda) */}
          <motion.div 
            className="md:w-1/2"
            initial={{ opacity: 0, x: -100 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Le quité un 'font-extrabold' duplicado que tenías por ahí, dejé solo 'font-black' */}
            <h3 className="font-headline text-5xl md:text-7xl font-black text-[#ab2d00] tracking-tight mb-8">
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
          </motion.div>

          {/* LADO DERECHO: Imagen (Entra desde la derecha con un pequeño retraso) */}
          <motion.div 
            className="md:w-5/12 relative"
            initial={{ opacity: 0, x: 100 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            <div className="aspect-square rounded-xl overflow-hidden shadow-2xl border-8 border-white bg-[#f5f5f5]">
              <img
                alt="Retrato de los fundadores trabajando"
                className="mobile-scroll-zoom w-full h-full object-cover"
                src="OurStorySection.webp"
              />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}