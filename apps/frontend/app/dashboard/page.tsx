'use client';
// 📊 Dashboard Principal - Área autenticada
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../providers/auth-provider';
import { Button, UserProfileBadges, getRoleDisplayName } from '../../components/ui';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Emotional App
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Link para Área Administrativa - Apenas para ADMIN */}
              {user.role === 'ADMIN' && (
                <button
                  onClick={() => router.push('/dashboard/admin/users')}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  title="Área Administrativa"
                >
                  👥 Admin
                </button>
              )}
              
              <div className="text-right">
                <div className="text-sm text-gray-600">
                  Olá, <span className="font-medium">{user.name}</span>
                </div>
                <div className="text-xs text-blue-600 font-medium">
                  {getRoleDisplayName(user.role)}
                </div>
              </div>
              <Button 
                variant="secondary" 
                onClick={handleLogout}
                className="!w-auto px-4 py-2"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Bem-vindo de volta, {user.name}! 👋
              </h2>
              <UserProfileBadges 
                role={user.role} 
                ageGroup={user.ageGroup}
                size="md"
              />
            </div>
          </div>
          <p className="text-gray-600">
            Como você está se sentindo hoje? Comece registrando seu estado emocional ou escrevendo em seu diário.
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Área Administrativa - Apenas para ADMIN */}
          {user.role === 'ADMIN' && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-red-200">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="ml-3 text-lg font-semibold text-gray-900">
                  Área Administrativa
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                Gerencie usuários, roles e configurações do sistema
              </p>
              <Button 
                variant="primary"
                onClick={() => router.push('/dashboard/admin/users')}
                className="!w-auto px-6 bg-red-600 hover:bg-red-700"
              >
                Gerenciar Sistema
              </Button>
            </div>
          )}

          {/* Check-in Emocional */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">😊</span>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">
                Check-in Emocional
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              Registre seu humor, energia e nível de stress
            </p>
            <Button 
              variant="primary"
              onClick={() => alert('🚧 Funcionalidade em desenvolvimento')}
              className="!w-auto px-6"
            >
              Fazer Check-in
            </Button>
          </div>

          {/* Diário Pessoal */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">
                Diário Pessoal
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              Escreva sobre seus pensamentos e experiências
            </p>
            <Button 
              variant="primary"
              onClick={() => alert('🚧 Funcionalidade em desenvolvimento')}
              className="!w-auto px-6"
            >
              Escrever
            </Button>
          </div>

          {/* Histórico */}
          <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📈</span>
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-900">
                Ver Histórico
              </h3>
            </div>
            <p className="text-gray-600 mb-4">
              Acompanhe seus padrões e progresso
            </p>
            <Button 
              variant="primary"
              onClick={() => alert('🚧 Funcionalidade em desenvolvimento')}
              className="!w-auto px-6"
            >
              Ver Dados
            </Button>
          </div>
        </div>

        {/* Admin Stats - Apenas para ADMIN */}
        {user.role === 'ADMIN' && (
          <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl shadow-lg p-6 mb-8 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">
                  🛡️ Painel Administrativo
                </h3>
                <p className="text-red-100 text-sm">
                  Você tem acesso ao gerenciamento completo do sistema
                </p>
              </div>
              <Button 
                variant="secondary"
                onClick={() => router.push('/dashboard/admin/users')}
                className="!bg-white !text-red-600 hover:!bg-red-50 !w-auto px-4 py-2"
              >
                Ver Área Admin
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">8</p>
                <p className="text-xs text-red-100">Usuários Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">1</p>
                <p className="text-xs text-red-100">Administradores</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">7</p>
                <p className="text-xs text-red-100">Usuários Ativos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">100%</p>
                <p className="text-xs text-red-100">Sistema Online</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">0</p>
              <p className="text-sm text-gray-600">Check-ins realizados</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">0</p>
              <p className="text-sm text-gray-600">Entradas do diário</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">0</p>
              <p className="text-sm text-gray-600">Dias de uso</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">-</p>
              <p className="text-sm text-gray-600">Bem-estar médio</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Atividade Recente
          </h3>
          <div className="text-center py-12 text-gray-500">
            <span className="text-6xl mb-4 block">📝</span>
            <p className="text-lg">Nenhuma atividade ainda</p>
            <p className="text-sm mt-2">
              Comece fazendo seu primeiro check-in emocional ou escrevendo no diário!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}