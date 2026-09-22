// 📖 API Client para entradas do diário pessoal
import { api } from './api';

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJournalEntryRequest {
  title: string;
  content: string;
}

export type UpdateJournalEntryRequest = Partial<CreateJournalEntryRequest>;

export interface JournalStats {
  totalEntries: number;
  entriesThisWeek: number;
  lastEntry: JournalEntry | null;
}

// 📡 API Functions para entradas do diário
export const journalApi = {
  // ➕ Criar nova entrada
  async create(data: CreateJournalEntryRequest): Promise<JournalEntry> {
    const response = await api.post('/journal-entries', data);
    return response.data;
  },

  // 📋 Listar entradas do usuário autenticado
  async list(): Promise<JournalEntry[]> {
    const response = await api.get('/journal-entries');
    return response.data;
  },

  // 🔍 Buscar por termo (título/conteúdo)
  async search(query: string): Promise<JournalEntry[]> {
    const response = await api.get('/journal-entries/search', { params: { q: query } });
    return response.data;
  },

  // 📊 Estatísticas (total, entradas na semana, última entrada)
  async getStats(): Promise<JournalStats> {
    const response = await api.get('/journal-entries/stats');
    return response.data;
  },

  // 🔍 Obter entrada específica
  async getOne(id: string): Promise<JournalEntry> {
    const response = await api.get(`/journal-entries/${id}`);
    return response.data;
  },

  // ✏️ Atualizar entrada existente
  async update(id: string, data: UpdateJournalEntryRequest): Promise<JournalEntry> {
    const response = await api.patch(`/journal-entries/${id}`, data);
    return response.data;
  },

  // 🗑️ Remover entrada
  async remove(id: string): Promise<void> {
    await api.delete(`/journal-entries/${id}`);
  },
};

export default journalApi;
