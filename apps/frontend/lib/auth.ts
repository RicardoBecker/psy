// 🔐 Utilities para gerenciamento de autenticação
import { User } from './api';

// 🔑 Token management
export const tokenStorage = {
  get: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('emotional_app_token');
  },

  set: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('emotional_app_token', token);
    
    // 🍪 Também salvar em cookies para o middleware
    document.cookie = `emotional_app_token=${token}; path=/; max-age=${7 * 24 * 60 * 60 * 1000}`; // 7 dias
  },

  remove: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('emotional_app_token');
    
    // 🗑️ Remover cookie também
    document.cookie = 'emotional_app_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  },
};

// 👤 User management
export const userStorage = {
  get: (): User | null => {
    if (typeof window === 'undefined') return null;
    const userData = localStorage.getItem('emotional_app_user');
    return userData ? JSON.parse(userData) : null;
  },

  set: (user: User): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('emotional_app_user', JSON.stringify(user));
  },

  remove: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('emotional_app_user');
  },
};

// 🔒 Auth helpers
export const authHelpers = {
  // 📱 Salvar dados de autenticação
  saveAuthData: (token: string, user: User): void => {
    tokenStorage.set(token);
    userStorage.set(user);
  },

  // 🚪 Logout completo
  logout: (): void => {
    tokenStorage.remove();
    userStorage.remove();
  },

  // ✅ Verificar se está autenticado
  isAuthenticated: (): boolean => {
    return !!tokenStorage.get();
  },

  // 👤 Obter usuário atual
  getCurrentUser: (): User | null => {
    return userStorage.get();
  },
};