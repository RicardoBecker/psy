'use client';
// 🔑 KAN-17 (KAN-78): solicitar recuperação de senha
import { useState } from 'react';
import Link from 'next/link';
import { Button, Input, Alert } from '../../components/ui';
import { authApi } from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // 🔒 Mensagem sempre genérica — o backend nunca revela se o e-mail existe,
  // então a tela também não pode inferir isso a partir de nada.
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Por favor, informe seu e-mail');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      // Só chega aqui em falha de rede/servidor de verdade — o backend
      // sempre responde 2xx para qualquer e-mail, exista ou não a conta.
      setError(err.response?.data?.message || 'Não foi possível processar sua solicitação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
            Emotional App
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Esqueceu sua senha?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Informe seu e-mail e enviaremos instruções para redefini-la
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          {submitted ? (
            <div className="space-y-6">
              <Alert
                type="success"
                message="Se o e-mail existir em nossa base, você receberá instruções de recuperação em instantes."
              />
              <Link href="/login">
                <Button type="button">Voltar para o login</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 forgot-password-form">
              {error && <Alert type="error" message={error} />}

              <Input
                label="Email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />

              <Button type="submit" isLoading={isLoading}>
                {isLoading ? 'Enviando...' : 'Enviar instruções'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Lembrou a senha?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
