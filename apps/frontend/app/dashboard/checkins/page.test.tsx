import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CheckinsHistoryPage from './page';
import { checkinsApi } from '../../../lib/checkins-api';

const pushMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const useAuthMock = jest.fn();
jest.mock('../../../providers/auth-provider', () => ({
  useAuth: () => useAuthMock(),
}));

jest.mock('../../../lib/checkins-api', () => ({
  checkinsApi: {
    list: jest.fn(),
    getStats: jest.fn(),
  },
}));

const mockedList = checkinsApi.list as jest.Mock;
const mockedGetStats = checkinsApi.getStats as jest.Mock;

describe('CheckinsHistoryPage — ordem dos hooks estável entre transições (CR-04.3)', () => {
  beforeEach(() => {
    pushMock.mockClear();
    mockedList.mockReset().mockResolvedValue([]);
    mockedGetStats.mockReset().mockResolvedValue({
      averageMoodScore: 0,
      averageEnergyLevel: 0,
      averageAnxietyLevel: 0,
      totalCheckins: 0,
      lastCheckin: null,
    });
  });

  it('transição loading → autenticado não lança erro de hooks e carrega os check-ins', async () => {
    useAuthMock.mockReturnValue({ user: null, isAuthenticated: false, isLoading: true });

    const { rerender } = render(<CheckinsHistoryPage />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();

    useAuthMock.mockReturnValue({
      user: { id: 'u1', name: 'Paciente' },
      isAuthenticated: true,
      isLoading: false,
    });

    expect(() => rerender(<CheckinsHistoryPage />)).not.toThrow();

    await waitFor(() => expect(mockedList).toHaveBeenCalled());
    await waitFor(() => expect(mockedGetStats).toHaveBeenCalled());
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('transição loading → anônimo não lança erro de hooks, redireciona e não busca check-ins', async () => {
    useAuthMock.mockReturnValue({ user: null, isAuthenticated: false, isLoading: true });

    const { rerender } = render(<CheckinsHistoryPage />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();

    useAuthMock.mockReturnValue({ user: null, isAuthenticated: false, isLoading: false });

    expect(() => rerender(<CheckinsHistoryPage />)).not.toThrow();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
    expect(mockedList).not.toHaveBeenCalled();
    expect(mockedGetStats).not.toHaveBeenCalled();
  });
});
