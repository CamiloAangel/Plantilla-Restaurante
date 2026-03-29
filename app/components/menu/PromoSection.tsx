'use client';

import { useState } from 'react';

export default function PromoSection() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubmitted(true);
      setEmail('');
      setTimeout(() => setIsSubmitted(false), 3000);
    }
  };

  return (
    <section className="mt-20 px-6 py-24 bg-[#ff7851] text-[#470e00] overflow-hidden relative">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12 relative z-10">
        
        {/* Left Section: Text */}
        <div className="md:w-1/2">
          <h2 className="font-headline font-black text-5xl md:text-7xl tracking-tighter leading-none mb-6">
            FEED YOUR<br/>REBELLION.
          </h2>
          <p className="font-body italic text-2xl md:text-3xl max-w-lg mb-8 text-[#2e2f2e]">
            Join the Vastago Syndicate for exclusive drops, hidden menu items, and 15% off your first street session.
          </p>
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input 
              className="flex-1 bg-[#ffefeb] border-none rounded-lg px-6 font-headline font-bold text-[#2e2f2e] placeholder:text-[#767775] focus:ring-2 focus:ring-[#fdd400] outline-none transition-all" 
              placeholder="YOUR EMAIL" 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button 
              type="submit"
              className="bg-[#0d0e0e] text-[#f7f6f4] py-4 px-8 rounded-lg font-headline font-bold uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all duration-200"
            >
              Join
            </button>
          </form>

          {isSubmitted && (
            <p className="mt-4 font-headline font-bold text-[#0d0e0e] text-sm">
              ✓ Email registered successfully!
            </p>
          )}
        </div>

        {/* Right Section: Image */}
        <div className="md:w-1/2 flex justify-center relative">
          <div className="relative w-64 h-64 md:w-96 md:h-96">
            {/* Glowing background circle */}
            <div className="absolute inset-0 bg-[#fdd400] rounded-full blur-3xl opacity-50 animate-pulse"></div>
            
            {/* Product image */}
            <img 
              alt="Gourmet Burger Promo" 
              className="w-full h-full object-contain relative z-10 transform rotate-12 drop-shadow-2xl hover:scale-105 transition-transform duration-500" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBG_jFee2XFYLoddFRAjodebzddpj3B7UPxmzwY1qnZTktHRSLSD2DD7z4sNMbTPZrayoBiIXrmvUe2Ndteb16XxH0NfnoOv5T6wJb8TiNL_RqaHiW5dmcajBLn8ew9QyVXdt-IU1I7TTsfau0AeiE37ZCrxxGNkWgpAppkMtLWVaK-YeEYUd2OcvN5M-LexJ7hYJgiosKkfbO29mMT8wL4IbE3B9VXShmK8lYhPE6_QjS23CDa5ANlKvC6K8xKcscB0gCoyYV4"
            />
          </div>
        </div>

      </div>
    </section>
  );
}