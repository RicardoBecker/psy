// 🌐 API Client centralizado para comunicação com backend
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// 🔧 Configuração do cliente HTTP
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔒 Interceptor para adicionar token JWT automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('emotional_app_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🚨 Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('emotional_app_token');
      localStorage.removeItem('emotional_app_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 🔐 Types para autenticação
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface SocialLoginRequest {
  token: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PSYCHOLOGIST' | 'PATIENT' | 'GUARDIAN';
  ageGroup: 'ADULT' | 'ADOLESCENT' | 'CHILD';
  birthDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
}

// 📡 API Functions para autenticação
export const authApi = {
  // 🔑 Login com email e senha
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // 📝 Registro de novo usuário
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // 🔍 Login com Google
  async googleLogin(token: string): Promise<AuthResponse> {
    const response = await api.post('/auth/google', { token });
    return response.data;
  },

  // 🍎 Login com Apple
  async appleLogin(token: string): Promise<AuthResponse> {
    const response = await api.post('/auth/apple', { token });
    return response.data;
  },

  // 👤 Obter perfil do usuário autenticado
  async getProfile(): Promise<User> {
    const response = await api.get('/users/profile');
    return response.data;
  },

  // 🔍 Health check da API
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;