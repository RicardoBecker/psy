'use client';
// 🔑 KAN-17 (KAN-78): redefinir senha a partir do link recebido por e-mail
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Alert } from '../../components/ui';
import { authApi } from '../../lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const router = useRouter();

  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Link inválido ou expirado.');
      return;
    }
    if (formData.newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword(token, formData.newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Não foi possível redefinir sua senha.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-6">
        <Alert type="error" message="Link inválido ou expirado." />
        <Link href="/forgot-password">
          <Button type="button">Solicitar novo link</Button>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6">
        <Alert type="success" message="Senha redefinida com sucesso! Você já pode entrar com a nova senha." />
        <Button type="button" onClick={() => router.push('/login')}>
          Ir para o login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 reset-password-form">
      {error && <Alert type="error" message={error} />}

      <Input
        label="Nova senha"
        type="password"
        name="newPassword"
        value={formData.newPassword}
        onChange={handleChange}
        placeholder="Mínimo 6 caracteres"
        required
      />

      <Input
        label="Confirmar nova senha"
        type="password"
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        placeholder="Repita a nova senha"
        required
      />

      <Button type="submit" isLoading={isLoading}>
        {isLoading ? 'Redefinindo...' : 'Redefinir senha'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
            Emotional App
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Redefinir senha
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
