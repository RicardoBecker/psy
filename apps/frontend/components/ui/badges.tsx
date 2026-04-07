// 🏷️ Componente para exibir badges de role e faixa etária
import React from 'react';

// Tipos para roles e faixas etárias
type Role = 'ADMIN' | 'PSYCHOLOGIST' | 'PATIENT' | 'GUARDIAN';
type AgeGroup = 'ADULT' | 'ADOLESCENT' | 'CHILD';

interface RoleBadgeProps {
  role: Role;
  size?: 'sm' | 'md' | 'lg';
}

interface AgeGroupBadgeProps {
  ageGroup: AgeGroup;
  size?: 'sm' | 'md' | 'lg';
}

// 🎨 Função para obter estilos do role
const getRoleStyles = (role: Role) => {
  const styles = {
    ADMIN: 'bg-red-100 text-red-800 border-red-200',
    PSYCHOLOGIST: 'bg-blue-100 text-blue-800 border-blue-200',
    PATIENT: 'bg-green-100 text-green-800 border-green-200',
    GUARDIAN: 'bg-purple-100 text-purple-800 border-purple-200'
  };
  return styles[role] || 'bg-gray-100 text-gray-800 border-gray-200';
};

// 🎨 Função para obter estilos da faixa etária
const getAgeGroupStyles = (ageGroup: AgeGroup) => {
  const styles = {
    ADULT: 'bg-gray-100 text-gray-800 border-gray-200',
    ADOLESCENT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    CHILD: 'bg-pink-100 text-pink-800 border-pink-200'
  };
  return styles[ageGroup] || 'bg-gray-100 text-gray-800 border-gray-200';
};

// 🏷️ Função para formatar roles
export const getRoleDisplayName = (role: Role) => {
  const roleNames = {
    ADMIN: 'Administrador',
    PSYCHOLOGIST: 'Psicólogo(a)',
    PATIENT: 'Paciente',
    GUARDIAN: 'Responsável'
  };
  return roleNames[role] || role;
};

// 🗓️ Função para formatar faixas etárias
export const getAgeGroupDisplayName = (ageGroup: AgeGroup) => {
  const ageNames = {
    ADULT: 'Adulto',
    ADOLESCENT: 'Adolescente',
    CHILD: 'Criança'
  };
  return ageNames[ageGroup] || ageGroup;
};

// 📱 Componente RoleBadge
export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  };

  return (
    <span 
      className={`inline-flex items-center rounded-full font-medium border ${getRoleStyles(role)} ${sizeClasses[size]}`}
    >
      {getRoleDisplayName(role)}
    </span>
  );
};

// 📱 Componente AgeGroupBadge  
export const AgeGroupBadge: React.FC<AgeGroupBadgeProps> = ({ ageGroup, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs', 
    lg: 'px-3 py-1 text-sm'
  };

  return (
    <span 
      className={`inline-flex items-center rounded-full font-medium border ${getAgeGroupStyles(ageGroup)} ${sizeClasses[size]}`}
    >
      {getAgeGroupDisplayName(ageGroup)}
    </span>
  );
};

// 👤 Componente combinado para perfil de usuário
interface UserProfileBadgesProps {
  role: Role;
  ageGroup: AgeGroup;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserProfileBadges: React.FC<UserProfileBadgesProps> = ({ 
  role, 
  ageGroup, 
  size = 'md',
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <RoleBadge role={role} size={size} />
      <AgeGroupBadge ageGroup={ageGroup} size={size} />
    </div>
  );
};