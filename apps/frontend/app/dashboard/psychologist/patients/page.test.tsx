import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PsychologistPatientsPage from './page';
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
    getMyPatients: jest.fn(),
    getPendingLinks: jest.fn(),
    searchPatients: jest.fn(),
    createPatientLink: jest.fn(),
  },
}));

const mocked = {
  getMyPatients: psychologistApi.getMyPatients as jest.Mock,
  getPendingLinks: psychologistApi.getPendingLinks as jest.Mock,
  searchPatients: psychologistApi.searchPatients as jest.Mock,
  createPatientLink: psychologistApi.createPatientLink as jest.Mock,
};

describe('PsychologistPatientsPage — role-gating e fluxo de convite (CR-06.3)', () => {
  beforeEach(() => {
    pushMock.mockClear();
    Object.values(mocked).forEach((m) => m.mockReset());
    mocked.getMyPatients.mockResolvedValue([]);
    mocked.getPendingLinks.mockResolvedValue([]);
  });

  it('paciente (role errada) é redirecionado para /dashboard', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'p1', role: 'PATIENT' }, isAuthenticated: true, isLoading: false });

    render(<PsychologistPatientsPage />);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
  });

  it('psicólogo busca um paciente por email e convida com sucesso', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'psy-1', role: 'PSYCHOLOGIST' },
      isAuthenticated: true,
      isLoading: false,
    });
    mocked.searchPatients.mockResolvedValue([
      { id: 'pat-1', name: 'Paciente Teste', email: 'paciente@example.com', linkStatus: null },
    ]);
    mocked.createPatientLink.mockResolvedValue({ id: 'link-1', consentStatus: 'PENDING' });

    render(<PsychologistPatientsPage />);
    await waitFor(() => expect(mocked.getMyPatients).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText('paciente@email.com'), {
      target: { value: 'paciente@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => expect(mocked.searchPatients).toHaveBeenCalledWith('paciente@example.com'));
    expect(await screen.findByText('Paciente Teste')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Convidar' }));

    await waitFor(() => expect(mocked.createPatientLink).toHaveBeenCalledWith('pat-1'));
    expect(await screen.findByText(/Convite enviado/i)).toBeInTheDocument();
  });

  it('paciente já vinculado aparece como "Já vinculado", sem botão de convidar', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'psy-1', role: 'PSYCHOLOGIST' },
      isAuthenticated: true,
      isLoading: false,
    });
    mocked.searchPatients.mockResolvedValue([
      { id: 'pat-2', name: 'Paciente Já Vinculado', email: 'vinculado@example.com', linkStatus: 'APPROVED' },
    ]);

    render(<PsychologistPatientsPage />);
    await waitFor(() => expect(mocked.getMyPatients).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText('paciente@email.com'), {
      target: { value: 'vinculado@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('✅ Já vinculado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Convidar' })).not.toBeInTheDocument();
  });
});
