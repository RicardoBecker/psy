'use client';
// 🔐 Context Provider para autenticação global
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, authApi } from '../lib/api';
import { authHelpers, userStorage } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: (token: string) => Promise<void>;
  appleLogin: (token: string, state: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔄 Carrega usuário na inicialização. CR-05.4: não há mais token local
  // para checar antes — a sessão vive num cookie HttpOnly que o navegador
  // envia sozinho; a única forma de saber se é válida é perguntar ao
  // backend.
  useEffect(() => {
    const initAuth = async () => {
      const savedUser = authHelpers.getCurrentUser();

      // 🟢 Usa o cache local otimisticamente enquanto valida com o backend,
      // para não mostrar a tela como deslogada durante o refresh.
      if (savedUser) setUser(savedUser);

      try {
        const freshUser = await authApi.getProfile();
        setUser(freshUser);
        userStorage.set(freshUser);
      } catch (error: any) {
        // 🔒 Só encerra a sessão em falha de autenticação real (401). Uma
        // falha de rede/5xx temporária não deve deslogar o usuário.
        if (error?.response?.status === 401) {
          userStorage.remove();
          setUser(null);
        } else if (savedUser) {
          console.error('❌ Erro ao validar sessão (mantendo cache local):', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // 🔑 Função de login
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.login({ email, password });
      userStorage.set(response.user);
      setUser(response.user);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  // 📝 Função de registro
  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.register({ name, email, password });
      userStorage.set(response.user);
      setUser(response.user);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔍 Login com Google
  const googleLogin = async (token: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.googleLogin(token);
      userStorage.set(response.user);
      setUser(response.user);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro no login com Google');
    } finally {
      setIsLoading(false);
    }
  };

  // 🍎 Login com Apple. `state` (Code review PR #18, KAN-158, P1) vincula
  // esta resposta ao desafio emitido por authApi.startAppleAuth().
  const appleLogin = async (token: string, state: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.appleLogin(token, state);
      userStorage.set(response.user);
      setUser(response.user);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro no login com Apple');
    } finally {
      setIsLoading(false);
    }
  };

  // 🚪 Função de logout — pede ao backend para limpar o cookie HttpOnly
  // (JavaScript não consegue apagá-lo sozinho).
  const logout = async () => {
    await authHelpers.logout();
    setUser(null);
  };

  // 🔄 Refresh do perfil do usuário
  const refreshUser = async () => {
    try {
      const freshUser = await authApi.getProfile();
      setUser(freshUser);
      userStorage.set(freshUser);
    } catch (error: any) {
      console.error('❌ Erro ao atualizar usuário:', error);
      // 🔒 Só encerra a sessão em falha de autenticação real (401).
      if (error?.response?.status === 401) {
        await logout();
      }
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    googleLogin,
    appleLogin,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 🪝 Hook personalizado para usar o contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro do AuthProvider');
  }
  return context;
}
