'use client';
// ✏️ Editar Entrada do Diário

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../../../providers/auth-provider';
import { Button, Alert, Input } from '../../../../../components/ui';
import { journalApi } from '../../../../../lib/journal-api';

export default function EditJournalEntryPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loadingEntry, setLoadingEntry] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;

    (async () => {
      try {
        const entry = await journalApi.getOne(id);
        setTitle(entry.title);
        setContent(entry.content);
      } catch (error) {
        console.error('Erro ao carregar entrada:', error);
        setAlert({ type: 'error', message: 'Entrada não encontrada' });
      } finally {
        setLoadingEntry(false);
      }
    })();
  }, [isAuthenticated, id]);

  if (isLoading || loadingEntry) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando entrada...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (!title.trim() || !content.trim()) {
      setAlert({ type: 'error', message: 'Título e conteúdo são obrigatórios' });
      return;
    }

    setIsSubmitting(true);
    try {
      await journalApi.update(id, { title: title.trim(), content: content.trim() });
      setAlert({ type: 'success', message: 'Entrada atualizada com sucesso! 🎉' });
      setTimeout(() => {
        router.push('/dashboard/journal');
      }, 1200);
    } catch (error: any) {
      console.error('Erro ao atualizar entrada:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Erro ao atualizar entrada do diário',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/dashboard/journal')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="mr-2">←</span>
              Voltar ao Diário
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Editar Entrada</h1>
            <div className="w-32" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6 md:p-8">
          {alert && (
            <div className="mb-6">
              <Alert type={alert.type} message={alert.message} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Dê um título para esta entrada..."
              maxLength={255}
              required
            />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Conteúdo</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 resize-y"
                required
              />
            </div>

            <div className="text-center space-y-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className="!w-full md:!w-80 py-4 text-lg !bg-purple-600 hover:!bg-purple-700"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações 💾'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
