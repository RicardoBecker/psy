'use client';
// 👥 Meus Pacientes - Psicólogo

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../providers/auth-provider';
import { Button, Alert, Input } from '../../../../components/ui';
import {
  psychologistApi,
  PatientLink,
  PatientSearchResult,
} from '../../../../lib/psychologist-api';

export default function PsychologistPatientsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [patients, setPatients] = useState<PatientLink[]>([]);
  const [pendingLinks, setPendingLinks] = useState<PatientLink[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<PatientSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!isLoading && user && user.role !== 'PSYCHOLOGIST') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  const loadLists = useCallback(async () => {
    setLoadingLists(true);
    try {
      const [patientsData, pendingData] = await Promise.all([
        psychologistApi.getMyPatients(),
        psychologistApi.getPendingLinks(),
      ]);
      setPatients(patientsData);
      setPendingLinks(pendingData);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setLoadingLists(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'PSYCHOLOGIST') {
      loadLists();
    }
  }, [isAuthenticated, user, loadLists]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== 'PSYCHOLOGIST') {
    return null;
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (searchEmail.trim().length < 3) {
      setAlert({ type: 'error', message: 'Digite ao menos 3 caracteres do email do paciente' });
      return;
    }

    setIsSearching(true);
    try {
      const results = await psychologistApi.searchPatients(searchEmail.trim());
      setSearchResults(results);
    } catch (error: any) {
      console.error('Erro ao buscar pacientes:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Erro ao buscar pacientes',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvite = async (patientId: string) => {
    setInvitingId(patientId);
    setAlert(null);
    try {
      await psychologistApi.createPatientLink(patientId);
      setAlert({ type: 'success', message: 'Convite enviado! Aguardando aprovação do paciente.' });
      setSearchResults(
        (prev) =>
          prev?.map((p) => (p.id === patientId ? { ...p, linkStatus: 'PENDING' } : p)) ?? null
      );
      await loadLists();
    } catch (error: any) {
      console.error('Erro ao convidar paciente:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Erro ao enviar convite',
      });
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="mr-2">←</span>
              Voltar ao Dashboard
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Meus Pacientes</h1>
            <div className="w-40" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {alert && <Alert type={alert.type} message={alert.message} />}

        {/* Buscar e convidar paciente */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vincular Paciente</h2>
          <form onSubmit={handleSearch} className="flex gap-3 items-end mb-4">
            <div className="flex-1">
              <Input
                label="Email do paciente"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="paciente@email.com"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSearching}
              disabled={isSearching}
              className="!w-auto px-6 mb-1"
            >
              Buscar
            </Button>
          </form>

          {searchResults && (
            <div className="space-y-2">
              {searchResults.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum paciente encontrado com esse email.</p>
              ) : (
                searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{patient.name}</p>
                      <p className="text-sm text-gray-500">{patient.email}</p>
                    </div>
                    {patient.linkStatus === 'APPROVED' ? (
                      <span className="text-sm text-green-700 font-medium">✅ Já vinculado</span>
                    ) : patient.linkStatus === 'PENDING' ? (
                      <span className="text-sm text-yellow-700 font-medium">⏳ Convite pendente</span>
                    ) : patient.linkStatus === 'REJECTED' ? (
                      <span className="text-sm text-red-700 font-medium">❌ Convite recusado</span>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => handleInvite(patient.id)}
                        isLoading={invitingId === patient.id}
                        disabled={invitingId === patient.id}
                        className="!w-auto px-4 py-2"
                      >
                        Convidar
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Convites pendentes */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Convites Pendentes ({pendingLinks.length})
          </h2>
          {loadingLists ? (
            <p className="text-sm text-gray-500">Carregando...</p>
          ) : pendingLinks.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum convite aguardando aprovação.</p>
          ) : (
            <div className="space-y-2">
              {pendingLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div>
                    <p className="font-medium text-gray-900">{link.patient?.name}</p>
                    <p className="text-sm text-gray-500">{link.patient?.email}</p>
                  </div>
                  <span className="text-sm text-yellow-700 font-medium">⏳ Aguardando paciente</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pacientes vinculados */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Pacientes Vinculados ({patients.length})
          </h2>
          {loadingLists ? (
            <p className="text-sm text-gray-500">Carregando...</p>
          ) : patients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-5xl mb-3 block">🧑‍⚕️</span>
              <p>Nenhum paciente vinculado ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {patients.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border">
                  <div>
                    <p className="font-medium text-gray-900">{link.patient?.name}</p>
                    <p className="text-sm text-gray-500">{link.patient?.email}</p>
                  </div>
                  <span className="text-sm text-green-700 font-medium">✅ Ativo</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
