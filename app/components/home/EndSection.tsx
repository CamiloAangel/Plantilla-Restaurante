export default function EndSection() {
  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-headline text-5xl md:text-7xl font-black text-[#000000] tracking-tighter mb-8 uppercase">
          Sabes lo que quieres{" "}
          <span className="text-[#ab2d00] italic "> Dejate concentir</span>
        </h2>

        <p className="font-headline font-bold text-2xl italic text-[#000000] mb-12">
          Pide ya y dejanos el resto a nosotros.
        </p>

        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <button
            className="bg-[#ab2d00] text-[#ffefeb] px-12 py-4 rounded-lg font-headline font-bold text-xl hover:bg-[#962700] transition-all active:scale-95"
            aria-label="Encontrarnos"
          >
            Pide Ya!
          </button>

          <button
            className="bg-[#fdd400] text-[#433700] px-12 py-4 rounded-lg font-headline font-bold text-xl hover:opacity-90 transition-all active:scale-95"
            aria-label="Pedir a domicilio"
          >
            Encuentranos !
          </button>
        </div>
      </div>
    </section>
  );
}
