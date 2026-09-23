import React from 'react';
import { render, waitFor } from '@testing-library/react';
import UsersAdminPage from './page';
import { adminApi } from '@/lib/admin-api';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const useAuthMock = jest.fn();
jest.mock('@/providers/auth-provider', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('react-hot-toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

// Componentes filhos são testados em seus próprios arquivos — aqui só
// interessa o gate de autenticação/role e o carregamento de dados da página.
jest.mock('@/components/admin/UsersStats', () => ({ UsersStats: () => null }));
jest.mock('@/components/admin/UsersFilters', () => ({ UsersFilters: () => null }));
jest.mock('@/components/admin/UsersTable', () => ({ UsersTable: () => null }));
jest.mock('@/components/admin/UsersPagination', () => ({ UsersPagination: () => null }));
jest.mock('@/components/admin/CreateUserModal', () => ({ CreateUserModal: () => null }));

jest.mock('@/lib/admin-api', () => ({
  adminApi: {
    getUsers: jest.fn(),
    getUserStats: jest.fn(),
  },
}));

const mockedGetUsers = adminApi.getUsers as jest.Mock;
const mockedGetUserStats = adminApi.getUserStats as jest.Mock;

describe('Admin UsersAdminPage — lista administrativa (CR-06.3)', () => {
  beforeEach(() => {
    pushMock.mockClear();
    mockedGetUsers.mockReset().mockResolvedValue({ users: [], pagination: { total: 0, page: 1, limit: 25, pages: 0 } });
    mockedGetUserStats
      .mockReset()
      .mockResolvedValue({ total: 0, active: 0, inactive: 0, byRole: {}, byAgeGroup: {} });
  });

  it('usuário anônimo é redirecionado para /login, sem carregar dados administrativos', async () => {
    useAuthMock.mockReturnValue({ user: null, isAuthenticated: false, isLoading: false });

    render(<UsersAdminPage />);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
    expect(mockedGetUsers).not.toHaveBeenCalled();
  });

  it('usuário não-admin é redirecionado para /dashboard, sem carregar dados administrativos', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'p1', role: 'PATIENT' }, isAuthenticated: true, isLoading: false });

    render(<UsersAdminPage />);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
    expect(mockedGetUsers).not.toHaveBeenCalled();
  });

  it('admin autenticado carrega a lista e as estatísticas de usuários', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'admin-1', role: 'ADMIN' }, isAuthenticated: true, isLoading: false });

    render(<UsersAdminPage />);

    await waitFor(() => expect(mockedGetUsers).toHaveBeenCalled());
    await waitFor(() => expect(mockedGetUserStats).toHaveBeenCalled());
    expect(pushMock).not.toHaveBeenCalled();
  });
});
