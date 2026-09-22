'use client';
// 📖 Diário Pessoal - Listagem, busca e estatísticas

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../providers/auth-provider';
import { Button, Alert } from '../../../components/ui';
import { journalApi, JournalEntry, JournalStats } from '../../../lib/journal-api';

export default function JournalPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchEntries = useCallback(async () => {
    try {
      const data = await journalApi.list();
      setEntries(data);
    } catch (error) {
      console.error('Erro ao carregar diário:', error);
      setAlert({ type: 'error', message: 'Erro ao carregar entradas do diário' });
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await journalApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas do diário:', error);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchEntries();
      fetchStats();
    }
  }, [isAuthenticated, fetchEntries, fetchStats]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      fetchEntries();
      return;
    }
    setIsSearching(true);
    try {
      const data = await journalApi.search(searchTerm.trim());
      setEntries(data);
    } catch (error) {
      console.error('Erro ao buscar entradas:', error);
      setAlert({ type: 'error', message: 'Erro ao buscar no diário' });
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta entrada? Essa ação não pode ser desfeita.')) {
      return;
    }
    setDeletingId(id);
    try {
      await journalApi.remove(id);
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      toast.success('Entrada excluída com sucesso');
      fetchStats();
    } catch (error) {
      console.error('Erro ao excluir entrada:', error);
      toast.error('Erro ao excluir entrada');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const truncate = (text: string, maxLength = 180) =>
    text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;

  if (isLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando diário...</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-xl font-semibold text-gray-900">📖 Diário Pessoal</h1>
            <Button
              variant="primary"
              onClick={() => router.push('/dashboard/journal/new')}
              className="!w-auto px-6 py-2 !bg-purple-600 hover:!bg-purple-700"
            >
              Nova Entrada
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {alert && (
          <div className="mb-6">
            <Alert type={alert.type} message={alert.message} />
          </div>
        )}

        {/* Estatísticas */}
        {stats && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-600">Total de Entradas</h3>
              <p className="text-2xl font-bold mt-1 text-purple-700">{stats.totalEntries}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-600">Entradas nesta Semana</h3>
              <p className="text-2xl font-bold mt-1 text-blue-700">{stats.entriesThisWeek}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-600">Última Entrada</h3>
              <p className="text-sm font-semibold mt-1 text-gray-700">
                {stats.lastEntry ? formatDate(stats.lastEntry.createdAt) : '—'}
              </p>
            </div>
          </div>
        )}

        {/* Busca */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título ou conteúdo..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
          />
          <Button type="submit" variant="secondary" isLoading={isSearching} className="!w-auto px-6">
            Buscar
          </Button>
          {searchTerm && (
            <Button type="button" variant="secondary" onClick={clearSearch} className="!w-auto px-4">
              Limpar
            </Button>
          )}
        </form>

        {/* Lista de Entradas */}
        {entries.length === 0 ? (
          <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'Nenhuma entrada encontrada' : 'Nenhuma entrada no diário ainda'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm
                ? 'Tente buscar com outros termos.'
                : 'Comece escrevendo sobre seus pensamentos e experiências.'}
            </p>
            {!searchTerm && (
              <Button
                variant="primary"
                onClick={() => router.push('/dashboard/journal/new')}
                className="!w-auto px-8 py-3 !bg-purple-600 hover:!bg-purple-700"
              >
                Escrever minha primeira entrada ✍️
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2 gap-4">
                  <h3 className="text-lg font-semibold text-gray-900">{entry.title}</h3>
                  <span className="text-xs text-gray-500 whitespace-nowrap mt-1">
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
                <p className="text-gray-600 whitespace-pre-line mb-4">{truncate(entry.content)}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push(`/dashboard/journal/${entry.id}/edit`)}
                    className="text-sm font-medium text-purple-600 hover:text-purple-800"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={deletingId === entry.id}
                    className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    {deletingId === entry.id ? 'Excluindo...' : '🗑️ Excluir'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
