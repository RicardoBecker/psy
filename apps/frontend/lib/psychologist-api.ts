// 🧑‍⚕️ API Client para vínculo psicólogo-paciente
import { api } from './api';

export type ConsentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PsychologistProfile {
  id: string;
  userId: string;
  bio: string | null;
  specialties: string[];
  registrationNumber: string | null;
  verified: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface CreatePsychologistProfileRequest {
  bio?: string;
  specialties?: string[];
  registrationNumber?: string;
}

export type UpdatePsychologistProfileRequest = Partial<CreatePsychologistProfileRequest>;

export interface PatientSummary {
  id: string;
  name: string;
  email: string;
}

export interface PatientSearchResult extends PatientSummary {
  linkStatus: ConsentStatus | null;
}

export interface PatientLink {
  id: string;
  patientId: string;
  psychologistId: string;
  consentStatus: ConsentStatus;
  createdAt: string;
  patient?: PatientSummary & { ageGroup?: string };
  psychologist?: PatientSummary;
}

// 📡 API Functions para vínculo psicólogo-paciente
export const psychologistApi = {
  // 👤 Perfil profissional
  async getProfile(): Promise<PsychologistProfile> {
    const response = await api.get('/psychologist/profile');
    return response.data;
  },

  async createProfile(data: CreatePsychologistProfileRequest): Promise<PsychologistProfile> {
    const response = await api.post('/psychologist/profile', data);
    return response.data;
  },

  async updateProfile(data: UpdatePsychologistProfileRequest): Promise<PsychologistProfile> {
    const response = await api.patch('/psychologist/profile', data);
    return response.data;
  },

  // 🔍 Buscar pacientes por email (uso do psicólogo)
  async searchPatients(email: string): Promise<PatientSearchResult[]> {
    const response = await api.get('/psychologist/patients/search', { params: { email } });
    return response.data;
  },

  // ➕ Convidar paciente (cria vínculo pendente)
  async createPatientLink(patientId: string): Promise<PatientLink> {
    const response = await api.post('/psychologist/patient-links', { patientId });
    return response.data;
  },

  // 📋 Pacientes já vinculados (aprovados)
  async getMyPatients(): Promise<PatientLink[]> {
    const response = await api.get('/psychologist/patients');
    return response.data;
  },

  // ⏳ Convites enviados ainda pendentes (uso do psicólogo)
  async getPendingLinks(): Promise<PatientLink[]> {
    const response = await api.get('/psychologist/pending-links');
    return response.data;
  },

  // 🧑 Psicólogos vinculados ao paciente autenticado
  async getMyPsychologists(): Promise<PatientLink[]> {
    const response = await api.get('/psychologist/my-psychologists');
    return response.data;
  },

  // ⏳ Convites recebidos aguardando aprovação (uso do paciente)
  async getMyPendingLinks(): Promise<PatientLink[]> {
    const response = await api.get('/psychologist/my-pending-links');
    return response.data;
  },

  // ✅ Aprovar vínculo (paciente ou admin)
  async approveLink(linkId: string): Promise<PatientLink> {
    const response = await api.patch(`/psychologist/links/${linkId}/approve`);
    return response.data;
  },

  // ❌ Rejeitar vínculo (paciente ou admin)
  async rejectLink(linkId: string): Promise<PatientLink> {
    const response = await api.patch(`/psychologist/links/${linkId}/reject`);
    return response.data;
  },
};

export default psychologistApi;
