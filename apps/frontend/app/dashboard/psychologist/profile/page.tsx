'use client';
// 🧑‍⚕️ Perfil Profissional do Psicólogo

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../providers/auth-provider';
import { Button, Alert, Input } from '../../../../components/ui';
import { psychologistApi, PsychologistProfile } from '../../../../lib/psychologist-api';

export default function PsychologistProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<PsychologistProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [bio, setBio] = useState('');
  const [specialtiesText, setSpecialtiesText] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!isLoading && user && user.role !== 'PSYCHOLOGIST') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await psychologistApi.getProfile();
        setProfile(data);
        setBio(data.bio ?? '');
        setSpecialtiesText(data.specialties.join(', '));
        setRegistrationNumber(data.registrationNumber ?? '');
      } catch (error: any) {
        if (error.response?.status !== 404) {
          console.error('Erro ao carregar perfil:', error);
        }
      } finally {
        setLoadingProfile(false);
      }
    };

    if (isAuthenticated && user?.role === 'PSYCHOLOGIST') {
      fetchProfile();
    }
  }, [isAuthenticated, user]);

  if (isLoading || (isAuthenticated && user?.role === 'PSYCHOLOGIST' && loadingProfile)) {
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

  const specialties = specialtiesText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    setIsSubmitting(true);

    try {
      const payload = { bio: bio.trim(), specialties, registrationNumber: registrationNumber.trim() };
      const saved = profile
        ? await psychologistApi.updateProfile(payload)
        : await psychologistApi.createProfile(payload);
      setProfile(saved);
      setAlert({ type: 'success', message: 'Perfil salvo com sucesso! 🎉' });
    } catch (error: any) {
      console.error('Erro ao salvar perfil:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Erro ao salvar perfil profissional',
      });
    } finally {
      setIsSubmitting(false);
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
            <h1 className="text-xl font-semibold text-gray-900">Meu Perfil Profissional</h1>
            <div className="w-40" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6 md:p-8">
          {profile && (
            <div className="mb-6 flex items-center gap-2">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  profile.verified
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {profile.verified ? '✅ Verificado' : '⏳ Aguardando verificação'}
              </span>
            </div>
          )}

          {alert && (
            <div className="mb-6">
              <Alert type={alert.type} message={alert.message} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Fale um pouco sobre sua atuação profissional..."
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 resize-y"
              />
            </div>

            <Input
              label="Especialidades (separadas por vírgula)"
              value={specialtiesText}
              onChange={(e) => setSpecialtiesText(e.target.value)}
              placeholder="Ansiedade, TCC, Terapia de casal..."
            />

            <Input
              label="Número de registro (CRP)"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="Ex: 06/123456"
            />

            <div className="text-center space-y-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className="!w-full md:!w-80 py-4 text-lg"
              >
                {isSubmitting ? 'Salvando...' : profile ? 'Atualizar Perfil' : 'Criar Perfil 💾'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
