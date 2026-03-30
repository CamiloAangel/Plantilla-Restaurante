import { LoginForm } from '@/app/components/login';

export const metadata = {
  title: 'Login | Vástago',
  description: 'Acceso a la plataforma Vástago',
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f4] pt-[73px]">
      <LoginForm />
    </main>
  );
}