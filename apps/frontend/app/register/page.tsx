'use client';
// 📝 Página de Registro
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../providers/auth-provider';
import { Button, Input, Alert } from '../../components/ui';
import { promptGoogleSignIn } from '../../lib/google-identity';
import { appleSignIn, isAppleSignInCancellation } from '../../lib/apple-identity';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  const { register, googleLogin, appleLogin, isLoading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (!formData.name || !formData.email || !formData.password) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      await register(formData.name, formData.email, formData.password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // 🔍 Code review PR #17 (KAN-157, P2): mesmo fluxo real da tela de login
  // — o botão não pode terminar em alert() de placeholder em produção.
  const handleGoogleSignup = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      await promptGoogleSignIn(async (idToken) => {
        try {
          await googleLogin(idToken);
          router.push('/dashboard');
        } catch (err: any) {
          setError(err.message || 'Erro no cadastro com Google');
        }
      });
    } catch (err: any) {
      setError(err.message || 'Não foi possível iniciar o cadastro com Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // 🔍 Code review PR #18 (KAN-158, P2): mesmo fluxo real da tela de login
  // — o botão não pode terminar em alert() de placeholder em produção.
  const handleAppleSignup = async () => {
    setError('');
    setIsAppleLoading(true);
    try {
      const { idToken, state } = await appleSignIn();
      await appleLogin(idToken, state);
      router.push('/dashboard');
    } catch (err: any) {
      if (!isAppleSignInCancellation(err)) {
        setError(err.message || 'Erro no cadastro com Apple');
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
            Emotional App
          </Link>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Crie sua conta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Comece sua jornada de bem-estar emocional hoje
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6 register-form">
            {error && <Alert type="error" message={error} />}
            
            <Input
              label="Nome completo"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Seu nome completo"
              required
            />

            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="seu@email.com"
              required
            />

            <Input
              label="Senha"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              required
            />

            <Input
              label="Confirmar senha"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repita sua senha"
              required
            />

            <Button type="submit" isLoading={isLoading}>
              {isLoading ? 'Criando conta...' : 'Criar conta'}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou continue com</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="space-y-3">
              <Button
                variant="social"
                type="button"
                isLoading={isGoogleLoading}
                onClick={handleGoogleSignup}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>🔍</span>
                  <span>Continuar com Google</span>
                </div>
              </Button>

              <Button
                variant="social"
                type="button"
                isLoading={isAppleLoading}
                onClick={handleAppleSignup}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>🍎</span>
                  <span>Continuar com Apple</span>
                </div>
              </Button>
            </div>
          </form>

          {/* Links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Fazer login
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Ao criar uma conta, você concorda com nossos{' '}
              <Link href="#" className="underline hover:text-gray-700">
                Termos de Uso
              </Link>{' '}
              e{' '}
              <Link href="#" className="underline hover:text-gray-700">
                Política de Privacidade
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}