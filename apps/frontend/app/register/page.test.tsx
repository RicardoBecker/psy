import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RegisterPage from './page';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const registerMock = jest.fn();
const googleLoginMock = jest.fn();
jest.mock('../../providers/auth-provider', () => ({
  useAuth: () => ({
    register: registerMock,
    googleLogin: googleLoginMock,
    isLoading: false,
  }),
}));

const promptGoogleSignInMock = jest.fn();
jest.mock('../../lib/google-identity', () => ({
  promptGoogleSignIn: (...args: unknown[]) => promptGoogleSignInMock(...args),
}));

// 🔍 Code review PR #17 (KAN-157, P2): o botão "Continuar com Google" na
// tela de cadastro precisa usar o fluxo real, igual à tela de login — não
// pode terminar em alert() de placeholder.
describe('RegisterPage — Google Sign-Up (KAN-157)', () => {
  beforeEach(() => {
    pushMock.mockClear();
    registerMock.mockReset();
    googleLoginMock.mockReset();
    promptGoogleSignInMock.mockReset();
  });

  it('successful credential: signs up via Google and navigates to /dashboard', async () => {
    googleLoginMock.mockResolvedValue(undefined);
    promptGoogleSignInMock.mockImplementation(async (onCredential: (t: string) => void) => {
      await onCredential('id-token-valido-do-google');
    });

    render(<RegisterPage />);
    fireEvent.click(screen.getByText('Continuar com Google'));

    await waitFor(() => expect(googleLoginMock).toHaveBeenCalledWith('id-token-valido-do-google'));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
  });

  it('backend rejects the token: shows the error, does not navigate', async () => {
    googleLoginMock.mockRejectedValue(new Error('Token do Google inválido ou expirado.'));
    promptGoogleSignInMock.mockImplementation(async (onCredential: (t: string) => void) => {
      await onCredential('id-token-invalido');
    });

    render(<RegisterPage />);
    fireEvent.click(screen.getByText('Continuar com Google'));

    expect(await screen.findByText('Token do Google inválido ou expirado.')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('user dismisses the Google prompt: no error, no navigation, no API call', async () => {
    promptGoogleSignInMock.mockResolvedValue(undefined);

    render(<RegisterPage />);
    fireEvent.click(screen.getByText('Continuar com Google'));

    await waitFor(() => expect(promptGoogleSignInMock).toHaveBeenCalled());
    expect(googleLoginMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.queryByText('❌')).not.toBeInTheDocument();
  });
});
