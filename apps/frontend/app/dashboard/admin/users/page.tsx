'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/providers/auth-provider';
import { adminApi, GetUsersQuery, type UserWithDetails } from '@/lib/admin-api';
import { UsersStats } from '@/components/admin/UsersStats';
import { UsersFilters } from '@/components/admin/UsersFilters';
import { UsersTable } from '@/components/admin/UsersTable';
import { UsersPagination } from '@/components/admin/UsersPagination';

// 🏢 Página principal do dashboard administrativo de usuários
export default function UsersAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Estados para dados
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    pages: 0
  });

  // Estados para UI
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Estado para filtros
  const [filters, setFilters] = useState<GetUsersQuery>({
    page: 1,
    limit: 25,
  });

  // 🔐 Verificar autenticação e permissão
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        toast.error('Você precisa estar logado para acessar esta área');
        router.push('/login');
        return;
      }

      if (user?.role !== 'ADMIN') {
        toast.error('Acesso negado: você não tem permissão de administrador');
        router.push('/dashboard');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Carregar estatísticas dos usuários
  const loadUserStats = async () => {
    try {
      setIsLoadingStats(true);
      const userStats = await adminApi.getUserStats();
      setStats(userStats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast.error('Erro ao carregar estatísticas dos usuários');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Carregar usuários com filtros
  const loadUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await adminApi.getUsers(filters);
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      if (isAuthenticated && user?.role === 'ADMIN') {
        setIsLoadingData(true);
        await Promise.all([
          loadUserStats(),
          loadUsers()
        ]);
        setIsLoadingData(false);
      }
    };

    if (!isLoading) {
      loadInitialData();
    }
  }, [isAuthenticated, user, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Recarregar usuários quando filtros mudarem
  useEffect(() => {
    if (!isLoadingData && isAuthenticated && user?.role === 'ADMIN') {
      loadUsers();
    }
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers para ações
  const handleFiltersChange = (newFilters: GetUsersQuery) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleLimitChange = (limit: number) => {
    setFilters(prev => ({ ...prev, limit, page: 1 }));
  };

  const handleCreateUser = () => {
    toast.success('Modal de criação será implementado');
    // TODO: Implementar modal de criação de usuário
  };

  const handleViewUser = (userId: string) => {
    toast.success(`Redirecionar para detalhes do usuário ${userId}`);
    // TODO: Implementar navegação para página de detalhes
  };

  const handleEditUser = (userId: string) => {
    toast.success(`Abrir modal de edição do usuário ${userId}`);
    // TODO: Implementar modal de edição de usuário
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await adminApi.updateUserRole(userId, { role: newRole as any });
      toast.success('Role do usuário atualizada com sucesso');
      await Promise.all([loadUsers(), loadUserStats()]);
    } catch (error) {
      console.error('Erro ao alterar role:', error);
      toast.error('Erro ao alterar role do usuário');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await adminApi.updateUserStatus(userId, { isActive: !currentStatus });
      toast.success(`Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`);
      await Promise.all([loadUsers(), loadUserStats()]);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const handleRefresh = async () => {
    toast.success('Atualizando dados...');
    await Promise.all([loadUsers(), loadUserStats()]);
  };

  // 🔄 Loading: auth ou dados
  if (isLoading || (isAuthenticated && user?.role === 'ADMIN' && isLoadingData)) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          </div>

          {/* Stats skeleton */}
          <UsersStats stats={{} as any} isLoading={true} />

          {/* Content skeleton */}
          <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🔒 Verificação de segurança adicional
  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null; // Não renderizar nada se não tiver permissão
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                👥 Gerenciamento de Usuários
              </h1>
              <p className="text-gray-600 mt-1">
                Administre usuários, roles e permissões do sistema
              </p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isLoadingUsers || isLoadingStats}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              🔄 Atualizar
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        <UsersStats 
          stats={stats} 
          isLoading={isLoadingStats} 
        />

        {/* Filtros */}
        <UsersFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onCreateUser={handleCreateUser}
        />

        {/* Tabela de usuários */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isLoadingUsers ? (
            <div className="p-6 space-y-4 animate-pulse">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded"></div>
              ))}
            </div>
          ) : (
            <UsersTable
              users={users}
              onViewUser={handleViewUser}
              onEditUser={handleEditUser}
              onChangeRole={handleChangeRole}
              onToggleStatus={handleToggleStatus}
            />
          )}

          {/* Paginação */}
          {!isLoadingUsers && users.length > 0 && (
            <UsersPagination
              pagination={pagination}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          )}

          {/* Estado vazio */}
          {!isLoadingUsers && users.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum usuário encontrado
              </h3>
              <p className="text-gray-600">
                Tente ajustar os filtros ou criar um novo usuário.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}