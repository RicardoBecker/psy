import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LoginPage from './page';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const loginMock = jest.fn();
const googleLoginMock = jest.fn();
jest.mock('../../providers/auth-provider', () => ({
  useAuth: () => ({
    login: loginMock,
    googleLogin: googleLoginMock,
    isLoading: false,
  }),
}));

const promptGoogleSignInMock = jest.fn();
jest.mock('../../lib/google-identity', () => ({
  promptGoogleSignIn: (...args: unknown[]) => promptGoogleSignInMock(...args),
}));

// 🔍 KAN-15/KAN-74: fluxo ponta a ponta do botão "Continuar com Google" na
// página de login — sucesso, erro do backend, erro ao iniciar o prompt e
// cancelamento pelo usuário (nenhum desses dois últimos deve navegar).
describe('LoginPage — Google Sign-In (KAN-15/KAN-74)', () => {
  beforeEach(() => {
    pushMock.mockClear();
    loginMock.mockReset();
    googleLoginMock.mockReset();
    promptGoogleSignInMock.mockReset();
  });

  it('successful credential: logs in and navigates to /dashboard', async () => {
    googleLoginMock.mockResolvedValue(undefined);
    promptGoogleSignInMock.mockImplementation(async (onCredential: (t: string) => void) => {
      await onCredential('id-token-valido-do-google');
    });

    render(<LoginPage />);
    fireEvent.click(screen.getByText('Continuar com Google'));

    await waitFor(() => expect(googleLoginMock).toHaveBeenCalledWith('id-token-valido-do-google'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
  });

  it('backend rejects the token: shows the error, does not navigate', async () => {
    googleLoginMock.mockRejectedValue(new Error('Token do Google inválido ou expirado.'));
    promptGoogleSignInMock.mockImplementation(async (onCredential: (t: string) => void) => {
      await onCredential('id-token-invalido');
    });

    render(<LoginPage />);
    fireEvent.click(screen.getByText('Continuar com Google'));

    expect(await screen.findByText('Token do Google inválido ou expirado.')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('prompt fails to start (e.g. not configured): shows an error, never calls the API', async () => {
    promptGoogleSignInMock.mockRejectedValue(
      new Error('Login com Google não está disponível no momento.'),
    );

    render(<LoginPage />);
    fireEvent.click(screen.getByText('Continuar com Google'));

    expect(
      await screen.findByText('Login com Google não está disponível no momento.'),
    ).toBeInTheDocument();
    expect(googleLoginMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('user dismisses the Google prompt: no error, no navigation, no API call', async () => {
    // onCredential nunca é chamado — é exatamente isso que acontece quando o
    // usuário fecha/ignora o prompt do Google.
    promptGoogleSignInMock.mockResolvedValue(undefined);

    render(<LoginPage />);
    fireEvent.click(screen.getByText('Continuar com Google'));

    await waitFor(() => expect(promptGoogleSignInMock).toHaveBeenCalled());
    expect(googleLoginMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    // Alert de erro usa o ícone ❌ (components/ui/index.tsx) — ausência dele
    // confirma que nenhuma mensagem de erro foi exibida pelo cancelamento.
    expect(screen.queryByText('❌')).not.toBeInTheDocument();
  });
});
