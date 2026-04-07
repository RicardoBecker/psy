// Re-export Prisma enums para usar em toda aplicação  
import { Role, AgeGroup, ConsentStatus, ConsentRecordStatus } from '@prisma/client';
export { Role, AgeGroup, ConsentStatus, ConsentRecordStatus };

// Tipos para JWT payload
export interface JwtPayload {
  email: string;
  sub: string; // userId
  role: Role;
  ageGroup: AgeGroup;
  iat?: number;
  exp?: number;
}

// Tipos para request user (após autenticação)
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  ageGroup: AgeGroup;
}

// Utilitário para calcular faixa etária baseada na data de nascimento
export function calculateAgeGroup(birthDate: Date): AgeGroup {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
    ? age - 1 
    : age;

  if (actualAge < 13) return AgeGroup.CHILD;
  if (actualAge >= 13 && actualAge <= 17) return AgeGroup.ADOLESCENT;
  return AgeGroup.ADULT;
}

// Tipos de relacionamento entre responsável e menor
export const RelationshipTypes = {
  PARENT: 'parent',
  GUARDIAN: 'guardian',
  LEGAL_REPRESENTATIVE: 'legal_representative',
  TUTOR: 'tutor',
} as const;

export type RelationshipType = typeof RelationshipTypes[keyof typeof RelationshipTypes];

// Tipos de consentimento
export const ConsentTypes = {
  DATA_PROCESSING: 'data_processing',
  THERAPEUTIC_MONITORING: 'therapeutic_monitoring',
  INFORMATION_SHARING: 'information_sharing',
  RESEARCH_PARTICIPATION: 'research_participation',
} as const;

export type ConsentType = typeof ConsentTypes[keyof typeof ConsentTypes];