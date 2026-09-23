import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-provider';
import { authApi } from '../lib/api';

jest.mock('../lib/api', () => {
  const actual = jest.requireActual('../lib/api');
  return {
    ...actual,
    authApi: {
      ...actual.authApi,
      getProfile: jest.fn(),
      logout: jest.fn(),
    },
  };
});

const mockedGetProfile = authApi.getProfile as jest.Mock;
const mockedLogout = authApi.logout as jest.Mock;

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

// CR-05.4: não existe mais token em localStorage — só o cache do usuário,
// que é dado de exibição, nunca a fonte de verdade de autenticação (essa é
// sempre o cookie HttpOnly, invisível ao JS e por isso não simulável aqui;
// quem decide autenticado/anônimo é sempre a resposta mockada de getProfile).
function seedCachedUser(user = CACHED_USER) {
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

describe('AuthProvider — sessão via cookie HttpOnly (CR-04.2 / CR-05.4)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedGetProfile.mockReset();
    mockedLogout.mockReset().mockResolvedValue(undefined);
  });

  it('sem cache local, sem cookie válido: getProfile é chamado mesmo assim e falha com 401 → não autenticado', async () => {
    mockedGetProfile.mockRejectedValue({ response: { status: 401 } });

    renderAuthProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    // CR-05.4: não há mais token local para "checar antes" — o único jeito
    // de saber se existe sessão é perguntar ao backend, sempre.
    expect(mockedGetProfile).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('sem cache local, MAS com cookie válido no servidor: getProfile sucede e autentica (cenário novo do CR-05.4)', async () => {
    mockedGetProfile.mockResolvedValue(FRESH_USER);

    renderAuthProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user-name').textContent).toBe('Usuário Atualizado');
  });

  it('cache local presente + perfil carregado com sucesso: fica autenticado com os dados atualizados', async () => {
    seedCachedUser();
    mockedGetProfile.mockResolvedValue(FRESH_USER);

    renderAuthProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user-name').textContent).toBe('Usuário Atualizado');
    expect(JSON.parse(localStorage.getItem('emotional_app_user')!).name).toBe(
      'Usuário Atualizado',
    );
  });

  it('cache local presente + 401 do backend: limpa o cache local (cookie já é inválido no servidor)', async () => {
    seedCachedUser();
    mockedGetProfile.mockRejectedValue({ response: { status: 401 } });

    renderAuthProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(screen.getByTestId('authenticated').textContent).toBe('false');
    expect(localStorage.getItem('emotional_app_user')).toBeNull();
  });

  it('cache local presente + falha de rede (sem response): mantém a sessão em cache, não desloga', async () => {
    seedCachedUser();
    mockedGetProfile.mockRejectedValue(new Error('Network Error')); // sem .response

    renderAuthProvider();

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user-name').textContent).toBe('Usuário Cache');
    expect(localStorage.getItem('emotional_app_user')).not.toBeNull();
  });
});

describe('AuthProvider.logout — encerra a sessão no servidor (CR-05.4)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedGetProfile.mockReset().mockResolvedValue(CACHED_USER);
    mockedLogout.mockReset().mockResolvedValue(undefined);
  });

  it('chama authApi.logout() (limpa o cookie HttpOnly no servidor) e limpa o cache local', async () => {
    seedCachedUser();

    let contextValue: ReturnType<typeof useAuth> | null = null;
    function Capture() {
      contextValue = useAuth();
      return <Probe />;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(screen.getByTestId('authenticated').textContent).toBe('true');

    await act(async () => {
      await contextValue!.logout();
    });

    expect(mockedLogout).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('emotional_app_user')).toBeNull();
  });

  it('mesmo se authApi.logout() falhar (rede), ainda limpa o estado local — nunca trava "logado"', async () => {
    seedCachedUser();
    mockedLogout.mockRejectedValue(new Error('Network Error'));

    let contextValue: ReturnType<typeof useAuth> | null = null;
    function Capture() {
      contextValue = useAuth();
      return <Probe />;
    }
    render(
      <AuthProvider>
        <Capture />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      await contextValue!.logout();
    });

    expect(localStorage.getItem('emotional_app_user')).toBeNull();
  });
});
