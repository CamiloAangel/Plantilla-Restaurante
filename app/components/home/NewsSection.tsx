export default function NewsSection() {
  return (
    <section className="bg-[#f1f1ef] py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="relative group">
          <div className="absolute -inset-4 bg-[#ff7851]/20 rounded-full blur-3xl group-hover:bg-[#fdd400]/30 transition-colors"></div>
          
          <img
            className="mobile-scroll-zoom relative w-full h-auto rounded-xl shadow-[0_32px_64px_rgba(171,45,0,0.15)] z-10 transform -translate-x-4 md:-translate-x-12"
            alt="Hyper-realistic close-up of a massive gourmet burger with melting cheese, crispy bacon, and fresh greens on a brioche bun with dramatic studio lighting"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuACy4pUu7RC5AEQKI6sK043WY_yPLJdkpF6v6SrjHnyl6kT_MjDNzZBPPCOUV-ciOfppIrrLkm5Fa-w-QeASfqSp7UgvSj2C9x3k2iIVuKkVwU_2q38Q4SpvR0MOp5zIcjXZTJ5Zl5x05Y9bfWOl3-AjpMZC0xaa_rEq1r3HMqcezCs3qC_rJMKMJJkxzOfeq8tfwwk2SZew0o0Lb17MSQI43SbFj9asqykP-SEaZ-7HFw7IZf_GJgPlEHu3mfjAoWYUvJf53SY"
          />
        </div>

        <div className="flex flex-col gap-6 lg:pl-12">
          <h2 className="font-headline text-5xl md:text-7xl font-extrabold text-[#000000] tracking-tighter leading-none">
            PRUEBA LA <br /> <span className="text-[#ab2d00] italic">CALLE</span> <br />{" "}
          </h2>

          <div className="h-1 w-24 bg-[#fdd400]"></div>

          <p className="font-headline font-bold text-2xl text-[#000000] leading-relaxed">
            Aquí no andamos con vueltas. Lo que ves en la foto es lo 
            que te comes: una burger de verdad, jugosa, humeante y lista
             para que la agarres con las dos manos. Sin cubiertos, sin 
             reglas, solo sabor puro. Ven a calmar ese antojo.
          </p>

          <div className="mt-4 flex gap-4">
            <button
              className="bg-[#ab2d00] text-[#ffefeb] px-8 py-4 rounded-lg font-headline font-bold text-xl flex items-center gap-2 cursor-pointer hover:bg-[#962700] transition-colors"
              aria-label="Probar The Giant"
            >
              Pidela Ya !{" "}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
