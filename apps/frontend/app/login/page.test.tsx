import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LoginPage from './page';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const loginMock = jest.fn();
const googleLoginMock = jest.fn();
const appleLoginMock = jest.fn();
jest.mock('../../providers/auth-provider', () => ({
  useAuth: () => ({
    login: loginMock,
    googleLogin: googleLoginMock,
    appleLogin: appleLoginMock,
    isLoading: false,
  }),
}));

const promptGoogleSignInMock = jest.fn();
jest.mock('../../lib/google-identity', () => ({
  promptGoogleSignIn: (...args: unknown[]) => promptGoogleSignInMock(...args),
}));

const appleSignInMock = jest.fn();
jest.mock('../../lib/apple-identity', () => ({
  appleSignIn: (...args: unknown[]) => appleSignInMock(...args),
  isAppleSignInCancellation: (err: unknown) =>
    typeof err === 'object' && err !== null && (err as any).error === 'popup_closed_by_user',
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

// 🍎 KAN-16/KAN-76: mesmo tipo de cobertura do Google acima, para o botão
// "Continuar com Apple" — sucesso, erro do backend, erro ao abrir o popup e
// cancelamento pelo usuário (fechar o popup não deve navegar nem mostrar erro).
describe('LoginPage — Apple Sign-In (KAN-16/KAN-76)', () => {
  beforeEach(() => {
    pushMock.mockClear();
    loginMock.mockReset();
    appleLoginMock.mockReset();
    appleSignInMock.mockReset();
  });

  it('successful credential: logs in and navigates to /dashboard', async () => {
    appleSignInMock.mockResolvedValue({ idToken: 'id-token-valido-da-apple', state: 'state-do-desafio' });
    appleLoginMock.mockResolvedValue(undefined);

    render(<LoginPage />);
    fireEvent.click(screen.getByText('Continuar com Apple'));

    await waitFor(() =>
      expect(appleLoginMock).toHaveBeenCalledWith('id-token-valido-da-apple', 'state-do-desafio'),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
  });

  it('backend rejects the token: shows the error, does not navigate', async () => {
    appleSignInMock.mockResolvedValue({ idToken: 'id-token-invalido', state: 'state-do-desafio' });
    appleLoginMock.mockRejectedValue(new Error('Token da Apple inválido ou expirado.'));

    render(<LoginPage />);
    fireEvent.click(screen.getByText('Continuar com Apple'));

    expect(await screen.findByText('Token da Apple inválido ou expirado.')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('popup fails to open (e.g. not configured): shows an error, never calls the API', async () => {
    appleSignInMock.mockRejectedValue(new Error('Login com Apple não está disponível no momento.'));

    render(<LoginPage />);
    fireEvent.click(screen.getByText('Continuar com Apple'));

    expect(
      await screen.findByText('Login com Apple não está disponível no momento.'),
    ).toBeInTheDocument();
    expect(appleLoginMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('user closes the Apple popup: no error, no navigation, no API call', async () => {
    appleSignInMock.mockRejectedValue({ error: 'popup_closed_by_user' });

    render(<LoginPage />);
    fireEvent.click(screen.getByText('Continuar com Apple'));

    await waitFor(() => expect(appleSignInMock).toHaveBeenCalled());
    expect(appleLoginMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.queryByText('❌')).not.toBeInTheDocument();
  });
});
