import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResetPasswordPage from './page';
import { authApi } from '../../lib/api';

const pushMock = jest.fn();
let tokenParam: string | null = 'token-valido';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: (key: string) => (key === 'token' ? tokenParam : null) }),
}));

jest.mock('../../lib/api', () => ({
  authApi: { resetPassword: jest.fn() },
}));

const mockedResetPassword = authApi.resetPassword as jest.Mock;

function fillAndSubmit(newPassword: string, confirmPassword: string) {
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: newPassword } });
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: confirmPassword } });
  fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha' }));
}

describe('ResetPasswordPage (KAN-17/KAN-78)', () => {
  beforeEach(() => {
    pushMock.mockClear();
    mockedResetPassword.mockReset();
    tokenParam = 'token-valido';
  });

  it('no token in the URL: shows a generic invalid-link message, no form, no API call', () => {
    tokenParam = null;

    render(<ResetPasswordPage />);

    expect(screen.getByText('Link inválido ou expirado.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
    expect(mockedResetPassword).not.toHaveBeenCalled();
  });

  it('valid token, matching passwords: calls the API with the token and shows success', async () => {
    mockedResetPassword.mockResolvedValue({ success: true });

    render(<ResetPasswordPage />);
    fillAndSubmit('novaSenhaSegura123', 'novaSenhaSegura123');

    await waitFor(() =>
      expect(mockedResetPassword).toHaveBeenCalledWith('token-valido', 'novaSenhaSegura123'),
    );
    expect(await screen.findByText(/senha redefinida com sucesso/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ir para o login'));
    expect(pushMock).toHaveBeenCalledWith('/login');
  });

  it('mismatched passwords: client-side error, API never called', () => {
    render(<ResetPasswordPage />);
    fillAndSubmit('novaSenhaSegura123', 'outraSenhaDiferente');

    expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument();
    expect(mockedResetPassword).not.toHaveBeenCalled();
  });

  it('password too short: client-side error, API never called', () => {
    render(<ResetPasswordPage />);
    fillAndSubmit('123', '123');

    expect(screen.getByText('A senha deve ter pelo menos 6 caracteres')).toBeInTheDocument();
    expect(mockedResetPassword).not.toHaveBeenCalled();
  });

  it('backend rejects an invalid/expired token: shows the backend message, not the success screen', async () => {
    mockedResetPassword.mockRejectedValue({ response: { data: { message: 'Link inválido ou expirado.' } } });

    render(<ResetPasswordPage />);
    fillAndSubmit('novaSenhaSegura123', 'novaSenhaSegura123');

    expect(await screen.findByText('Link inválido ou expirado.')).toBeInTheDocument();
    expect(screen.queryByText(/senha redefinida com sucesso/i)).not.toBeInTheDocument();
  });
});
