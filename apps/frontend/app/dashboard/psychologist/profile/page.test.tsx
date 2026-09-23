import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PsychologistProfilePage from './page';
import { psychologistApi } from '../../../../lib/psychologist-api';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const useAuthMock = jest.fn();
jest.mock('../../../../providers/auth-provider', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('../../../../lib/psychologist-api', () => ({
  psychologistApi: {
    getProfile: jest.fn(),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
  },
}));

const mockedGetProfile = psychologistApi.getProfile as jest.Mock;

describe('PsychologistProfilePage — role-gating (CR-06.3)', () => {
  beforeEach(() => {
    pushMock.mockClear();
    mockedGetProfile.mockReset();
  });

  it('usuário anônimo é redirecionado para /login', async () => {
    useAuthMock.mockReturnValue({ user: null, isAuthenticated: false, isLoading: false });

    render(<PsychologistProfilePage />);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
    expect(mockedGetProfile).not.toHaveBeenCalled();
  });

  it('paciente autenticado (role errada) é redirecionado para /dashboard, sem carregar o perfil', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'p1', role: 'PATIENT' },
      isAuthenticated: true,
      isLoading: false,
    });

    render(<PsychologistProfilePage />);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
    expect(mockedGetProfile).not.toHaveBeenCalled();
  });

  it('psicólogo autenticado consegue acessar a página normalmente', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'psy-1', role: 'PSYCHOLOGIST' },
      isAuthenticated: true,
      isLoading: false,
    });
    mockedGetProfile.mockResolvedValue({
      id: 'profile-1',
      userId: 'psy-1',
      bio: 'Especialista',
      specialties: ['Ansiedade'],
      registrationNumber: '06/123456',
      verified: true,
      createdAt: new Date().toISOString(),
      user: { id: 'psy-1', name: 'Dr Teste', email: 'psy@example.com', role: 'PSYCHOLOGIST' },
    });

    render(<PsychologistProfilePage />);

    await waitFor(() => expect(mockedGetProfile).toHaveBeenCalledTimes(1));
    expect(pushMock).not.toHaveBeenCalled();
    expect(await screen.findByText('✅ Verificado')).toBeInTheDocument();
  });
});
