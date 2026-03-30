'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { hasDashboardAccess } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabaseClient';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Autenticación con Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        setError(authError.message || 'Error al iniciar sesión');
        console.error('Auth error:', authError);
        return;
      }

      if (!data.user) {
        setError('Usuario no encontrado');
        return;
      }

      // Obtener el perfil del usuario para verificar su rol
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role_id')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Error getting profile:', profileError);
        // Si no hay perfil, redirigir a home
        router.push('/');
        return;
      }

      const requestedPath = searchParams.get('next');
      const dashboardPath = requestedPath?.startsWith('/dashboard')
        ? requestedPath
        : '/dashboard';

      // Verificar si es admin
      if (hasDashboardAccess(profile?.role_id)) {
        // Es admin, redirigir al dashboard
        router.push(dashboardPath);
      } else {
        // Es usuario normal, redirigir a home
        router.push('/');
      }
    } catch (err) {
      setError('Error al iniciar sesión. Por favor intenta de nuevo.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full flex items-center justify-center p-4 md:p-8 overflow-hidden bg-[#0d0e0e]">
      
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          alt="Kitchen background"
          className="w-full h-full object-cover opacity-30"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBrP4v2MqwBrTSkDcnuAgRtCTqWqTElgobBdeffkQcnV6B-DUozXRxE49YmbtCtm--nY0sT9RoLod2gwa0LnXY7mCrXfdovywX4Un1169cKi-XU9WiL38Tke3Jbf2td8V6x5BTzPsG6vcC3H051FOUsdT76BON3D68KYHC5MBH8aMmH1LNYRzJiJs8IaVINszqll8M__ezyDNUZIY-vI51g1Igi-69uSIyeLWO6GFBk-SeMzoFXJrkDo2VTNYl3GrQJFt-seuPt"
        />
        {/* Gradiente para oscurecer el fondo y que el texto resalte */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0e0e] via-[#0d0e0e]/80 to-transparent"></div>
      </div>

      {/* Main Content Shell */}
      <main className="relative z-10 w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Branding Side */}
        <div className="hidden lg:flex lg:col-span-7 flex-col space-y-6">
          <span className="font-label text-sm uppercase tracking-[0.3em] text-white/70 font-bold">
            Vástago 
          </span>
          <h1 className="font-headline text-7xl font-black italic tracking-tighter text-white leading-[0.9] -ml-1">
            SABOR<br />
            <span className="text-[#ab2d00]">A CALLE</span>
          </h1>
          <p className="font-body italic text-2xl text-white/70 max-w-md leading-relaxed">
            Management, operations, and service alchemy for the Vastago collective. Authenticated entry required.
          </p>
          <div className="flex items-center space-x-4 pt-8">
            <div className="h-[1px] w-24 bg-white/20"></div>
            <span className="font-label text-xs text-white/50 uppercase tracking-widest">
              Est. 2026 VASTAGO
            </span>
          </div>
        </div>

        {/* Login Card (Right Side) */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none">
          <div className="bg-[#121212]/80 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/10">
            
            {/* Logo Mobile/Top */}
            <div className="mb-8 flex flex-col items-center lg:items-start">
              <div className="font-headline text-3xl font-black italic tracking-tighter text-white mb-1">
                VASTAGO
              </div>
              <h2 className="font-headline text-lg text-white/70 uppercase tracking-widest">Staff Access</h2>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-950/50 border border-red-500/50 rounded-lg">
                  <p className="text-red-200 text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-2">
                <label className="block font-label text-[10px] font-black uppercase tracking-[0.2em] text-white/70 px-1" htmlFor="email">
                  Correo Electrónico
                </label>
                <input
                  className="w-full bg-[#f7f6f4] border-0 rounded-lg px-4 py-3.5 font-label text-sm text-black focus:ring-2 focus:ring-[#ab2d00] transition-all placeholder:text-gray-500"
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ejemplo@vastago.com"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="block font-label text-[10px] font-black uppercase tracking-[0.2em] text-white/70 px-1" htmlFor="password">
                  Contraseña
                </label>
                <input
                  className="w-full bg-[#f7f6f4] border-0 rounded-lg px-4 py-3.5 font-label text-sm text-black focus:ring-2 focus:ring-[#ab2d00] transition-all placeholder:text-gray-500"
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Opciones extra */}
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-[#ab2d00] focus:ring-[#ab2d00]"
                    type="checkbox"
                    disabled={isLoading}
                  />
                  <span className="font-body italic text-sm text-white/70">Recordar dispositivo</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                className="w-full py-4 mt-4 rounded-lg bg-[#ab2d00] text-white font-headline font-bold uppercase tracking-widest text-sm hover:bg-[#8a2400] transition-all duration-200 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={isLoading}
              >
                <span>{isLoading ? 'Autenticando...' : 'Autenticar Acceso'}</span>
                {!isLoading && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
