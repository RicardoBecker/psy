// 🔍 Componente de filtros para listagem de usuários
import React from 'react';
import { GetUsersQuery } from '../../lib/admin-api';

interface UsersFiltersProps {
  filters: GetUsersQuery;
  onFiltersChange: (filters: GetUsersQuery) => void;
  onCreateUser: () => void;
}

export const UsersFilters: React.FC<UsersFiltersProps> = ({
  filters,
  onFiltersChange,
  onCreateUser,
}) => {
  const handleInputChange = (field: keyof GetUsersQuery, value: any) => {
    onFiltersChange({
      ...filters,
      [field]: value,
      page: 1, // Reset para primeira página ao filtrar
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 md:mb-0">
          Filtros de Busca
        </h2>
        
        <button
          onClick={onCreateUser}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          ➕ Novo Usuário
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Busca por nome/email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar por nome ou email
          </label>
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            placeholder="Digite nome ou email..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          />
        </div>

        {/* Filtro por role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <select
            value={filters.role || ''}
            onChange={(e) => handleInputChange('role', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="">Todos os roles</option>
            <option value="ADMIN">Administrador</option>
            <option value="PSYCHOLOGIST">Psicólogo(a)</option>
            <option value="PATIENT">Paciente</option>
            <option value="GUARDIAN">Responsável</option>
          </select>
        </div>

        {/* Filtro por faixa etária */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Faixa Etária
          </label>
          <select
            value={filters.ageGroup || ''}
            onChange={(e) => handleInputChange('ageGroup', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="">Todas as idades</option>
            <option value="ADULT">Adulto</option>
            <option value="ADOLESCENT">Adolescente</option>
            <option value="CHILD">Criança</option>
          </select>
        </div>

        {/* Filtro por status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={filters.isActive === undefined ? '' : String(filters.isActive)}
            onChange={(e) => {
              const value = e.target.value;
              handleInputChange('isActive', value === '' ? undefined : value === 'true');
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>
      </div>

      {/* Botão limpar filtros */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => onFiltersChange({ page: 1, limit: filters.limit })}
          className="text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          🗑️ Limpar Filtros
        </button>
      </div>
    </div>
  );
};