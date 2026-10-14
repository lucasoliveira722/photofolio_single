import type { Metadata } from 'next';
import LoginForm from '@/components/admin/LoginForm';

export const metadata: Metadata = {
  title: 'Sign in · Lucas Oliveira',
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <div className="flex h-dvh items-center justify-center px-6">
      <LoginForm />
    </div>
  );
}
