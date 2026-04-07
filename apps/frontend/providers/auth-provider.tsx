'use client';
// 🔐 Context Provider para autenticação global
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, authApi } from '../lib/api';
import { authHelpers } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: (token: string) => Promise<void>;
  appleLogin: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🔄 Carrega usuário na inicialização
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUser = authHelpers.getCurrentUser();
        
        if (savedUser && authHelpers.isAuthenticated()) {
          // 🔄 Valida o token fazendo refresh do perfil
          const freshUser = await authApi.getProfile();
          setUser(freshUser);
          authHelpers.saveAuthData(authHelpers.tokenStorage.get()!, freshUser);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar usuário:', error);
        authHelpers.logout();
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
      authHelpers.saveAuthData(response.access_token, response.user);
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
      authHelpers.saveAuthData(response.access_token, response.user);
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
      authHelpers.saveAuthData(response.access_token, response.user);
      setUser(response.user);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro no login com Google');
    } finally {
      setIsLoading(false);
    }
  };

  // 🍎 Login com Apple
  const appleLogin = async (token: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.appleLogin(token);
      authHelpers.saveAuthData(response.access_token, response.user);
      setUser(response.user);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erro no login com Apple');
    } finally {
      setIsLoading(false);
    }
  };

  // 🚪 Função de logout
  const logout = () => {
    authHelpers.logout();
    setUser(null);
  };

  // 🔄 Refresh do perfil do usuário
  const refreshUser = async () => {
    if (!authHelpers.isAuthenticated()) return;
    
    try {
      const freshUser = await authApi.getProfile();
      setUser(freshUser);
      authHelpers.saveAuthData(authHelpers.tokenStorage.get()!, freshUser);
    } catch (error) {
      console.error('❌ Erro ao atualizar usuário:', error);
      logout();
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