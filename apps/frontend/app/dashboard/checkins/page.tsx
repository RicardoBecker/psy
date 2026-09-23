'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../providers/auth-provider';
import { Button, Alert } from '../../../components/ui';
import { checkinsApi, EmotionalCheckin, CheckinStats as Stats } from '../../../lib/checkins-api';
import { CheckinsTrendChart } from '../../../components/CheckinsTrendChart';

export default function CheckinsHistoryPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [checkins, setCheckins] = useState<EmotionalCheckin[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Redirect se não estiver autenticado — dentro de efeito, nunca antes de
  // declarar todos os hooks (rules-of-hooks).
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCheckins();
      fetchStats();
    }
  }, [isAuthenticated]);

  const fetchCheckins = async () => {
    try {
      const data = await checkinsApi.list();
      setCheckins(data);
    } catch (error) {
      console.error('Erro ao carregar check-ins:', error);
      setAlert({
        type: 'error',
        message: 'Erro ao carregar histórico de check-ins'
      });
    }
  };

  const fetchStats = async () => {
    try {
      const data = await checkinsApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEmoji = (field: string, value: number): string => {
    const emojis = {
      moodScore: ['😞', '😟', '😐', '😕', '😊', '😊', '😁', '😄', '😆', '🥰'],
      energyLevel: ['😴', '🥱', '😑', '😐', '🙂', '😊', '😁', '😄', '⚡', '🔥'],
      anxietyLevel: ['😌', '🙂', '😐', '😰', '😨', '😰', '😱', '💥', '🚨', '😵']
    };
    return emojis[field as keyof typeof emojis][value - 1] || '😐';
  };

  const getScoreColor = (value: number): string => {
    if (value <= 3) return 'text-red-600 bg-red-50';
    if (value <= 6) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

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

  if (!isAuthenticated) {
    return null; // redirect em andamento via useEffect acima
  }

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    emoji, 
    bgColor 
  }: { 
    title: string; 
    value: number; 
    emoji: string; 
    bgColor: string; 
  }) => (
    <div className={`${bgColor} rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <p className="text-2xl font-bold mt-1">{value.toFixed(1)}/10</p>
        </div>
        <span className="text-3xl">{emoji}</span>
      </div>
    </div>
  );

  const CheckinCard = ({ checkin }: { checkin: EmotionalCheckin }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {formatDate(checkin.createdAt)}
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl mb-1">{getEmoji('moodScore', checkin.moodScore)}</div>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getScoreColor(checkin.moodScore)}`}>
            Humor: {checkin.moodScore}/10
          </div>
        </div>

        <div className="text-center">
          <div className="text-2xl mb-1">{getEmoji('energyLevel', checkin.energyLevel)}</div>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getScoreColor(checkin.energyLevel)}`}>
            Energia: {checkin.energyLevel}/10
          </div>
        </div>

        <div className="text-center">
          <div className="text-2xl mb-1">{getEmoji('anxietyLevel', checkin.anxietyLevel)}</div>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getScoreColor(checkin.anxietyLevel)}`}>
            Ansiedade: {checkin.anxietyLevel}/10
          </div>
        </div>
      </div>

      {checkin.notes && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-medium">Observações:</span> {checkin.notes}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="mr-2">←</span>
              Voltar ao Dashboard
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Histórico de Check-ins</h1>
            <Button
              variant="primary"
              onClick={() => router.push('/dashboard/checkin')}
              className="!w-auto px-6 py-2"
            >
              Novo Check-in
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {alert && (
          <div className="mb-6">
            <Alert type={alert.type} message={alert.message} />
          </div>
        )}

        {/* Estatísticas */}
        {stats && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Suas Estatísticas</h2>
            <div className="grid md:grid-cols-4 gap-6 mb-6">
              <StatCard
                title="Humor Médio"
                value={stats.averageMoodScore}
                emoji="😊"
                bgColor="bg-blue-50 border border-blue-200"
              />
              <StatCard
                title="Energia Média"
                value={stats.averageEnergyLevel}
                emoji="⚡"
                bgColor="bg-green-50 border border-green-200"
              />
              <StatCard
                title="Ansiedade Média"
                value={stats.averageAnxietyLevel}
                emoji="😰"
                bgColor="bg-yellow-50 border border-yellow-200"
              />
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Total de Check-ins</h3>
                    <p className="text-2xl font-bold mt-1">{stats.totalCheckins}</p>
                  </div>
                  <span className="text-3xl">📊</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gráfico de Tendência */}
        {checkins.length > 0 && (
          <div className="mb-8">
            <CheckinsTrendChart data={checkins} />
          </div>
        )}

        {/* Lista de Check-ins */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Histórico Completo</h2>
            {checkins.length > 0 && (
              <p className="text-gray-600">{checkins.length} registro{checkins.length !== 1 ? 's' : ''} encontrado{checkins.length !== 1 ? 's' : ''}</p>
            )}
          </div>

          {checkins.length === 0 ? (
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <div className="text-6xl mb-4">😊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum check-in registrado ainda
              </h3>
              <p className="text-gray-600 mb-6">
                Comece registrando como você está se sentindo hoje!
              </p>
              <Button
                variant="primary"
                onClick={() => router.push('/dashboard/checkin')}
                className="!w-auto px-8 py-3"
              >
                Fazer meu primeiro check-in 🚀
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {checkins.map((checkin) => (
                <CheckinCard key={checkin.id} checkin={checkin} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}