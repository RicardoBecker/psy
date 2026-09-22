import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-provider';
import { authApi } from '../lib/api';

jest.mock('../lib/api', () => {
  const actual = jest.requireActual('../lib/api');
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      getProfile: jest.fn(),
    },
  };
});

const mockedGetProfile = authApi.getProfile as jest.Mock;

const CACHED_USER = {
  id: 'user-1',
  name: 'Usuário Cache',
  email: 'user@example.com',
  role: 'PATIENT',
  ageGroup: 'ADULT',
  isActive: true,
  createdAt: new Date().toISOString(),
};

const FRESH_USER = { ...CACHED_USER, name: 'Usuário Atualizado' };

function seedSession(user = CACHED_USER) {
  localStorage.setItem('emotional_app_token', 'token-123');
  localStorage.setItem('emotional_app_user', JSON.stringify(user));
}

// Harness que expõe o estado do contexto via testids
function Probe() {
  const { isLoading, isAuthenticated, user } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="user-name">{user?.name ?? ''}</span>
    </div>
  );
}

function renderAuthProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe('AuthProvider — restauração de sessão (CR-04.2)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'emotional_app_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    mockedGetProfile.mockReset();
  });

  it('sem sessão salva: resolve como não autenticado, sem chamar a API', async () => {
    renderAuthProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(mockedGetProfile).not.toHaveBeenCalled();
  });

  it('sessão salva + perfil carregado com sucesso: fica autenticado com os dados atualizados', async () => {
    seedSession();
    mockedGetProfile.mockResolvedValue(FRESH_USER);

    renderAuthProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user-name').textContent).toBe('Usuário Atualizado');
    expect(JSON.parse(localStorage.getItem('emotional_app_user')!).name).toBe(
      'Usuário Atualizado',
    );
  });

  it('sessão salva + 401 do backend: encerra a sessão (logout real)', async () => {
    seedSession();
    mockedGetProfile.mockRejectedValue({ response: { status: 401 } });

    renderAuthProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(localStorage.getItem('emotional_app_token')).toBeNull();
    expect(localStorage.getItem('emotional_app_user')).toBeNull();
  });

  it('sessão salva + falha de rede (sem response): mantém a sessão em cache, não desloga', async () => {
    seedSession();
    mockedGetProfile.mockRejectedValue(new Error('Network Error')); // sem .response

    renderAuthProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user-name').textContent).toBe('Usuário Cache');
    expect(localStorage.getItem('emotional_app_token')).toBe('token-123');
  });
});
