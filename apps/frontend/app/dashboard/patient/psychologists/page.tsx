'use client';
// 🧑‍⚕️ Meus Psicólogos - Paciente

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../providers/auth-provider';
import { Button, Alert } from '../../../../components/ui';
import { psychologistApi, PatientLink } from '../../../../lib/psychologist-api';

export default function PatientPsychologistsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [psychologists, setPsychologists] = useState<PatientLink[]>([]);
  const [pendingLinks, setPendingLinks] = useState<PatientLink[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!isLoading && user && user.role !== 'PATIENT') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  const loadLists = useCallback(async () => {
    setLoadingLists(true);
    try {
      const [approvedData, pendingData] = await Promise.all([
        psychologistApi.getMyPsychologists(),
        psychologistApi.getMyPendingLinks(),
      ]);
      setPsychologists(approvedData);
      setPendingLinks(pendingData);
    } catch (error) {
      console.error('Erro ao carregar psicólogos:', error);
    } finally {
      setLoadingLists(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'PATIENT') {
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

  if (!isAuthenticated || !user || user.role !== 'PATIENT') {
    return null;
  }

  const handleRespond = async (linkId: string, action: 'approve' | 'reject') => {
    setRespondingId(linkId);
    setAlert(null);
    try {
      if (action === 'approve') {
        await psychologistApi.approveLink(linkId);
        setAlert({ type: 'success', message: 'Vínculo aprovado! 🎉' });
      } else {
        await psychologistApi.rejectLink(linkId);
        setAlert({ type: 'success', message: 'Convite recusado.' });
      }
      await loadLists();
    } catch (error: any) {
      console.error('Erro ao responder convite:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Erro ao responder convite',
      });
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="mr-2">←</span>
              Voltar ao Dashboard
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Meus Psicólogos</h1>
            <div className="w-40" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {alert && <Alert type={alert.type} message={alert.message} />}

        {/* Solicitações pendentes */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Solicitações Pendentes ({pendingLinks.length})
          </h2>
          {loadingLists ? (
            <p className="text-sm text-gray-500">Carregando...</p>
          ) : pendingLinks.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma solicitação pendente.</p>
          ) : (
            <div className="space-y-3">
              {pendingLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200"
                >
                  <div>
                    <p className="font-medium text-gray-900">{link.psychologist?.name}</p>
                    <p className="text-sm text-gray-500">{link.psychologist?.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Quer acompanhar seu progresso emocional
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={() => handleRespond(link.id, 'approve')}
                      isLoading={respondingId === link.id}
                      disabled={respondingId === link.id}
                      className="!w-auto px-4 py-2 !bg-green-600 hover:!bg-green-700"
                    >
                      Aceitar
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleRespond(link.id, 'reject')}
                      isLoading={respondingId === link.id}
                      disabled={respondingId === link.id}
                      className="!w-auto px-4 py-2"
                    >
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Psicólogos vinculados */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Psicólogos Vinculados ({psychologists.length})
          </h2>
          {loadingLists ? (
            <p className="text-sm text-gray-500">Carregando...</p>
          ) : psychologists.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-5xl mb-3 block">🧑‍⚕️</span>
              <p>Nenhum psicólogo vinculado ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {psychologists.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border">
                  <div>
                    <p className="font-medium text-gray-900">{link.psychologist?.name}</p>
                    <p className="text-sm text-gray-500">{link.psychologist?.email}</p>
                  </div>
                  <span className="text-sm text-green-700 font-medium">✅ Vinculado</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
