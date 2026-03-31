import { Suspense } from 'react';
import { LoginForm } from '@/app/components/login';

export const metadata = {
  title: 'Login | Vástago',
  description: 'Acceso a la plataforma Vástago',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f4] pt-[73px]">
      <Suspense fallback={<div className="px-4 py-8 text-center text-black">Cargando acceso...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}