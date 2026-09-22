// 😊 API Client para check-ins emocionais
import { api } from './api';

export interface EmotionalCheckin {
  id: string;
  userId: string;
  moodScore: number;
  energyLevel: number;
  anxietyLevel: number;
  notes?: string | null;
  createdAt: string;
}

export interface CreateCheckinRequest {
  moodScore: number;
  energyLevel: number;
  anxietyLevel: number;
  notes?: string;
}

export type UpdateCheckinRequest = Partial<CreateCheckinRequest>;

export interface CheckinStats {
  averageMoodScore: number;
  averageEnergyLevel: number;
  averageAnxietyLevel: number;
  totalCheckins: number;
  lastCheckin: EmotionalCheckin | null;
}

// 📡 API Functions para check-ins emocionais
export const checkinsApi = {
  // ➕ Criar novo check-in
  async create(data: CreateCheckinRequest): Promise<EmotionalCheckin> {
    const response = await api.post('/emotional-checkins', data);
    return response.data;
  },

  // 📋 Listar check-ins do usuário autenticado
  async list(): Promise<EmotionalCheckin[]> {
    const response = await api.get('/emotional-checkins');
    return response.data;
  },

  // 📊 Estatísticas (médias dos últimos registros)
  async getStats(): Promise<CheckinStats> {
    const response = await api.get('/emotional-checkins/stats');
    return response.data;
  },

  // 🔍 Obter check-in específico
  async getOne(id: string): Promise<EmotionalCheckin> {
    const response = await api.get(`/emotional-checkins/${id}`);
    return response.data;
  },

  // ✏️ Atualizar check-in existente
  async update(id: string, data: UpdateCheckinRequest): Promise<EmotionalCheckin> {
    const response = await api.patch(`/emotional-checkins/${id}`, data);
    return response.data;
  },

  // 🗑️ Remover check-in
  async remove(id: string): Promise<void> {
    await api.delete(`/emotional-checkins/${id}`);
  },
};

export default checkinsApi;
