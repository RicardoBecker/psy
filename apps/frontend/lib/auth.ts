// 🔐 Utilities para gerenciamento de autenticação
import { User, authApi } from './api';

// 🔒 CR-05.4: não existe mais tokenStorage — a sessão vive num cookie
// HttpOnly setado pelo backend, ilegível por JavaScript de propósito. O
// navegador o envia automaticamente em toda requisição (withCredentials);
// o frontend não precisa (e não consegue) ler, guardar ou apagar esse
// valor sozinho.

// 👤 Cache local do usuário — só para exibição otimista na UI, nunca a
// fonte de verdade de autenticação (isso é sempre o backend).
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
  // 🚪 Logout completo: pede ao backend para limpar o cookie HttpOnly
  // (JavaScript não consegue fazer isso sozinho) e limpa o cache local.
  // Mesmo se a chamada ao servidor falhar (ex.: rede), o cache local ainda
  // é limpo — o pior caso é o cookie sobreviver no navegador até expirar,
  // não uma sessão "presa" na UI.
  logout: async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Erro ao encerrar sessão no servidor:', error);
    } finally {
      userStorage.remove();
    }
  },

  // 👤 Obter usuário atual (cache local, para render otimista)
  getCurrentUser: (): User | null => {
    return userStorage.get();
  },
};
