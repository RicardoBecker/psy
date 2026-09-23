import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PatientPsychologistsPage from './page';
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
    getMyPsychologists: jest.fn(),
    getMyPendingLinks: jest.fn(),
    approveLink: jest.fn(),
    rejectLink: jest.fn(),
  },
}));

const mocked = {
  getMyPsychologists: psychologistApi.getMyPsychologists as jest.Mock,
  getMyPendingLinks: psychologistApi.getMyPendingLinks as jest.Mock,
  approveLink: psychologistApi.approveLink as jest.Mock,
  rejectLink: psychologistApi.rejectLink as jest.Mock,
};

const PENDING_LINK = {
  id: 'link-1',
  patientId: 'pat-1',
  psychologistId: 'psy-1',
  consentStatus: 'PENDING',
  createdAt: new Date().toISOString(),
  psychologist: { id: 'psy-1', name: 'Dr Teste', email: 'psy@example.com' },
};

describe('PatientPsychologistsPage — role-gating e resposta a convite (CR-06.3)', () => {
  beforeEach(() => {
    pushMock.mockClear();
    Object.values(mocked).forEach((m) => m.mockReset());
    mocked.getMyPsychologists.mockResolvedValue([]);
    mocked.getMyPendingLinks.mockResolvedValue([]);
  });

  it('psicólogo (role errada) é redirecionado para /dashboard', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'psy-1', role: 'PSYCHOLOGIST' },
      isAuthenticated: true,
      isLoading: false,
    });

    render(<PatientPsychologistsPage />);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
  });

  it('paciente aceita um convite pendente', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'pat-1', role: 'PATIENT' }, isAuthenticated: true, isLoading: false });
    mocked.getMyPendingLinks.mockResolvedValue([PENDING_LINK]);
    mocked.approveLink.mockResolvedValue({ ...PENDING_LINK, consentStatus: 'APPROVED' });

    render(<PatientPsychologistsPage />);

    expect(await screen.findByText('Dr Teste')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Aceitar' }));

    await waitFor(() => expect(mocked.approveLink).toHaveBeenCalledWith('link-1'));
    expect(await screen.findByText(/aprovado/i)).toBeInTheDocument();
  });

  it('paciente recusa um convite pendente', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'pat-1', role: 'PATIENT' }, isAuthenticated: true, isLoading: false });
    mocked.getMyPendingLinks.mockResolvedValue([PENDING_LINK]);
    mocked.rejectLink.mockResolvedValue({ ...PENDING_LINK, consentStatus: 'REJECTED' });

    render(<PatientPsychologistsPage />);

    expect(await screen.findByText('Dr Teste')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));

    await waitFor(() => expect(mocked.rejectLink).toHaveBeenCalledWith('link-1'));
    expect(await screen.findByText(/recusado/i)).toBeInTheDocument();
  });
});
