'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/providers/auth-provider';
import { adminApi, type UserWithDetails } from '@/lib/admin-api';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { AgeGroupBadge } from '@/components/ui/AgeGroupBadge';

// 👤 Página de detalhes de um usuário específico
export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const userId = params.id as string;

  const [user, setUser] = useState<UserWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // 🔐 Verificar autenticação e permissão
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        toast.error('Você precisa estar logado para acessar esta área');
        router.push('/login');
        return;
      }

      if (currentUser?.role !== 'ADMIN') {
        toast.error('Acesso negado: você não tem permissão de administrador');
        router.push('/dashboard');
        return;
      }
    }
  }, [isAuthenticated, authLoading, currentUser, router]);

  // Carregar dados do usuário
  const loadUserDetails = async () => {
    try {
      setIsLoading(true);
      const users = await adminApi.getUsers({ 
        search: userId, // Usar o ID como busca para encontrar o usuário específico
        limit: 1 
      });
      
      // Como não temos endpoint específico por ID, buscaremos pelo email/ID
      const foundUser = users.users.find(u => 
        u.id === userId || u.email.includes(userId)
      );
      
      if (!foundUser) {
        toast.error('Usuário não encontrado');
        router.push('/dashboard/admin/users');
        return;
      }
      
      setUser(foundUser);
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      toast.error('Erro ao carregar dados do usuário');
      router.push('/dashboard/admin/users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId && !authLoading && isAuthenticated && currentUser?.role === 'ADMIN') {
      loadUserDetails();
    }
  }, [userId, authLoading, isAuthenticated, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers para ações
  const handleChangeRole = async (newRole: string) => {
    if (!user) return;

    try {
      setIsUpdating(true);
      await adminApi.updateUserRole(user.id, { role: newRole as any });
      toast.success('Role atualizada com sucesso');
      await loadUserDetails();
    } catch (error) {
      console.error('Erro ao alterar role:', error);
      toast.error('Erro ao alterar role do usuário');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;

    try {
      setIsUpdating(true);
      await adminApi.updateUserStatus(user.id, { isActive: !user.isActive });
      toast.success(`Usuário ${!user.isActive ? 'ativado' : 'desativado'} com sucesso`);
      await loadUserDetails();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do usuário');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditProfile = () => {
    toast.success('Modal de edição sera implementado');
    // TODO: Implementar modal de edição
  };

  // 🔄 Loading: auth ou dados do usuário
  if (authLoading || (!authLoading && isAuthenticated && currentUser?.role === 'ADMIN' && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="space-y-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🔒 Verificação de segurança adicional
  if (!isAuthenticated || currentUser?.role !== 'ADMIN') {
    return null; // Não renderizar nada se não tiver permissão
  }

  if (!user) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header com navegação */}
        <div className="mb-6">
          <Link 
            href="/dashboard/admin/users"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium mb-4"
          >
            ← Voltar para lista de usuários
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Detalhes do Usuário
              </h1>
              <p className="text-gray-600 mt-1">
                Informações completas e ações administrativas
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleEditProfile}
                disabled={isUpdating}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                ✏️ Editar Perfil
              </button>
              
              <button
                onClick={handleToggleStatus}
                disabled={isUpdating}
                className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                  user.isActive
                    ? 'bg-red-100 hover:bg-red-200 text-red-700'
                    : 'bg-green-100 hover:bg-green-200 text-green-700'
                }`}
              >
                {user.isActive ? '🚫 Desativar' : '✅ Ativar'}
              </button>
            </div>
          </div>
        </div>

        {/* Informações do usuário */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Header do card com foto e info básica */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-8 text-white">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              
              <div>
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-blue-100">{user.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <RoleBadge role={user.role} />
                  <AgeGroupBadge ageGroup={user.ageGroup} />
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    user.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? '✅ Ativo' : '🚫 Inativo'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Informações Pessoais */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  📋 Informações Pessoais
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Nome Completo</label>
                    <p className="text-gray-900">{user.name}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Data de Nascimento</label>
                    <p className="text-gray-900">
                      {new Date(user.birthDate).toLocaleDateString('pt-BR')}
                      <span className="text-sm text-gray-500 ml-2">
                        ({calculateAge(user.birthDate)} anos)
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Gênero</label>
                    <p className="text-gray-900 capitalize">{user.gender}</p>
                  </div>
                </div>
              </div>

              {/* Informações do Sistema */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  ⚙️ Informações do Sistema
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600">ID do Sistema</label>
                    <p className="text-gray-900 font-mono text-sm">{user.id}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Data de Cadastro</label>
                    <p className="text-gray-900">{formatDate(user.createdAt)}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Role Atual</label>
                    <div className="flex items-center space-x-2">
                      <RoleBadge role={user.role} />
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(e.target.value)}
                        disabled={isUpdating}
                        className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="ADMIN">Administrador</option>
                        <option value="PSYCHOLOGIST">Psicólogo</option>
                        <option value="PATIENT">Paciente</option>
                        <option value="GUARDIAN">Responsável</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600">Faixa Etária</label>
                    <AgeGroupBadge ageGroup={user.ageGroup} />
                  </div>
                </div>
              </div>
            </div>

            {/* Ações rápidas */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ⚡ Ações Rápidas
              </h3>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => toast.success('Funcionalidade será implementada')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  📧 Enviar Email
                </button>
                
                <button
                  onClick={() => toast.success('Funcionalidade será implementada')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  🔐 Resetar Senha
                </button>
                
                <button
                  onClick={() => toast.success('Funcionalidade será implementada')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  📱 Ver Sessões
                </button>
                
                <button
                  onClick={() => toast.success('Funcionalidade será implementada')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  📊 Relatórios
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}