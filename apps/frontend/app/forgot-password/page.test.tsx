import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForgotPasswordPage from './page';
import { authApi } from '../../lib/api';

jest.mock('../../lib/api', () => ({
  authApi: { forgotPassword: jest.fn() },
}));

const mockedForgotPassword = authApi.forgotPassword as jest.Mock;

// 🔒 KAN-17/KAN-78: a tela nunca pode diferenciar "e-mail existe" de
// "e-mail não existe" — sempre a mesma mensagem genérica de sucesso, desde
// que a chamada à API resolva (o backend sempre resolve, exista ou não).
describe('ForgotPasswordPage (KAN-17/KAN-78)', () => {
  beforeEach(() => {
    mockedForgotPassword.mockReset();
  });

  it('valid email: shows the generic success message, regardless of whether the account exists', async () => {
    mockedForgotPassword.mockResolvedValue({ message: 'ok' });

    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'qualquer@example.com' } });
    fireEvent.click(screen.getByText('Enviar instruções'));

    await waitFor(() => expect(mockedForgotPassword).toHaveBeenCalledWith('qualquer@example.com'));
    expect(
      await screen.findByText(/se o e-mail existir em nossa base/i),
    ).toBeInTheDocument();
  });

  it('empty email: submission is blocked (native "required" + client-side check), API never called', () => {
    render(<ForgotPasswordPage />);
    fireEvent.click(screen.getByText('Enviar instruções'));

    expect(mockedForgotPassword).not.toHaveBeenCalled();
  });

  it('a real network/server failure shows an error, not the success message', async () => {
    mockedForgotPassword.mockRejectedValue({ response: { data: { message: 'Erro de rede' } } });

    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@example.com' } });
    fireEvent.click(screen.getByText('Enviar instruções'));

    expect(await screen.findByText('Erro de rede')).toBeInTheDocument();
    expect(screen.queryByText(/se o e-mail existir em nossa base/i)).not.toBeInTheDocument();
  });
});
