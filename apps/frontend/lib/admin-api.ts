// 🔧 API Client para endpoints administrativos
import { api, User } from './api';

// 📊 Tipos para área administrativa
export interface AdminUser extends User {
  createdAt: string;
}

export interface UsersListResponse {
  users: AdminUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<string, number>;
  byAgeGroup: Record<string, number>;
}

export interface GetUsersQuery {
  search?: string;
  role?: string;
  ageGroup?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateAdminUserRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
  birthDate?: string;
  isActive?: boolean;
}

export interface UpdateAdminUserRequest {
  name?: string;  
  email?: string;
  birthDate?: string;
  ageGroup?: string;
  isActive?: boolean;
}

export interface UpdateUserRoleRequest {
  role: string;
}

export interface UpdateUserStatusRequest {
  isActive: boolean;
}

// 🔧 API functions para administração
export const adminApi = {
  // 📊 Obter estatísticas de usuários
  async getUserStats(): Promise<UserStats> {
    const response = await api.get('/admin/users/stats');
    return response.data;
  },

  // 📋 Listar usuários com filtros
  async getUsers(query: GetUsersQuery = {}): Promise<UsersListResponse> {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await api.get(`/admin/users?${params.toString()}`);
    return response.data;
  },

  // 👤 Obter usuário específico
  async getUserById(id: string): Promise<AdminUser> {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  // ➕ Criar usuário (admin)
  async createUser(userData: CreateAdminUserRequest): Promise<AdminUser> {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },

  // ✏️ Atualizar usuário
  async updateUser(id: string, userData: UpdateAdminUserRequest): Promise<AdminUser> {
    const response = await api.patch(`/admin/users/${id}`, userData);
    return response.data;
  },

  // 🔄 Alterar role do usuário
  async updateUserRole(id: string, roleData: UpdateUserRoleRequest): Promise<AdminUser> {
    const response = await api.patch(`/admin/users/${id}/role`, roleData);
    return response.data;
  },

  // 🔛 Alterar status do usuário
  async updateUserStatus(id: string, statusData: UpdateUserStatusRequest): Promise<AdminUser> {
    const response = await api.patch(`/admin/users/${id}/status`, statusData);
    return response.data;
  },
};