'use client';
// 🔑 Página de Login
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../providers/auth-provider';
import { Button, Input, Alert } from '../../components/ui';
import { promptGoogleSignIn } from '../../lib/google-identity';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  
  const { login, googleLogin, isLoading } = useAuth();
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    try {
      await login(formData.email, formData.password);
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

  // 🔍 KAN-15/KAN-74: dispara o Google Identity Services. O callback só é
  // chamado quando o usuário conclui o login de verdade — fechar/ignorar o
  // prompt não passa por aqui, então não mostramos erro nesse caso.
  const handleGoogleLogin = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      // Resolve assim que o prompt do Google é exibido — não espera a
      // decisão do usuário (a UI do próprio Google cobre esse tempo de
      // espera). `onCredential` só dispara em caso de sucesso.
      await promptGoogleSignIn(async (idToken) => {
        try {
          await googleLogin(idToken);
          router.push('/dashboard');
        } catch (err: any) {
          setError(err.message || 'Erro no login com Google');
        }
      });
    } catch (err: any) {
      setError(err.message || 'Não foi possível iniciar o login com Google.');
    } finally {
      setIsGoogleLoading(false);
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
            Entre na sua conta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Continue sua jornada de bem-estar emocional
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6 login-form">
            {error && <Alert type="error" message={error} />}
            
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
              placeholder="••••••••"
              required
            />

            <Button type="submit" isLoading={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
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
                onClick={handleGoogleLogin}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>🔍</span>
                  <span>Continuar com Google</span>
                </div>
              </Button>

              <Button 
                variant="social" 
                type="button"
                onClick={() => {
                  // TODO: Implementar Apple Sign In
                  alert('🚧 Apple Login será implementado com as credenciais de desenvolvedor');
                }}
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
              Não tem uma conta?{' '}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}