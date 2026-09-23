// 🌐 API Client centralizado para comunicação com backend
import axios from 'axios';

// 🌐 Resolve a URL da API em tempo de execução no navegador, usando o mesmo
// host que serviu o frontend (necessário para acesso via IP na rede local,
// já que NEXT_PUBLIC_API_URL fixo em "localhost" quebraria em outra máquina).
function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') return `http://${window.location.hostname}:3001/api/v1`;
  return 'http://localhost:3001/api/v1';
}

const API_BASE_URL = resolveApiBaseUrl();

// 🔧 Configuração do cliente HTTP
export const api = axios.create({
  baseURL: API_BASE_URL,
  // 🔒 CR-05.4: a sessão vive num cookie HttpOnly setado pelo backend — o
  // navegador precisa ser instruído a enviar/aceitar cookies em requisições
  // cross-origin (frontend e backend em portas diferentes).
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// 🎫 Interceptor CSRF: ecoa o csrf_token (cookie legível por JS, par do
// cookie de sessão HttpOnly) como header em toda requisição — o backend
// exige os dois baterem em requisições mutáveis (double-submit cookie).
api.interceptors.request.use((config) => {
  const csrfToken = readCookie('csrf_token');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

// 🚨 Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
  // 🔒 CR-05.4: o JWT em si nunca chega ao JavaScript — vive só no cookie
  // HttpOnly setado pelo backend. csrfToken é o par legível do
  // double-submit cookie, já espelhado em cookie por essa mesma resposta;
  // exposto aqui só para eventual uso imediato sem esperar o próximo tick.
  csrfToken: string;
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

  // 🚪 Encerra a sessão no servidor (limpa o cookie HttpOnly — o
  // JavaScript não consegue fazer isso sozinho).
  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  // 🔍 Health check da API
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;