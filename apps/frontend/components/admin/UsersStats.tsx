// 📊 Componente de estatísticas dos usuários para o dashboard admin
import React from 'react';

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: {
    ADMIN: number;
    PSYCHOLOGIST: number;
    PATIENT: number;
    GUARDIAN: number;
  };
  byAgeGroup: {
    ADULT: number;
    ADOLESCENT: number;
    CHILD: number;
  };
}

interface UsersStatsProps {
  stats: UserStats;
  isLoading?: boolean;
}

export const UsersStats: React.FC<UsersStatsProps> = ({ stats, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const activePercentage = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;
  const inactivePercentage = 100 - activePercentage;

  const statCards = [
    {
      title: 'Total de Usuários',
      value: stats.total,
      icon: '👥',
      color: 'blue',
      description: `${stats.active} ativos, ${stats.inactive} inativos`
    },
    {
      title: 'Usuários Ativos',
      value: stats.active,
      icon: '✅',
      color: 'green',
      description: `${activePercentage}% do total`
    },
    {
      title: 'Psicólogos',
      value: stats.byRole.PSYCHOLOGIST,
      icon: '👨‍⚕️',
      color: 'purple',
      description: `${stats.byRole.ADMIN} admins também`
    },
    {
      title: 'Pacientes',
      value: stats.byRole.PATIENT + stats.byRole.GUARDIAN,
      icon: '👤',
      color: 'orange',
      description: `${stats.byRole.PATIENT} pacientes, ${stats.byRole.GUARDIAN} responsáveis`
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200'
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Cards principais */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${colorClasses[card.color as keyof typeof colorClasses]}`}>
                {card.icon}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">{card.description}</p>
          </div>
        ))}
      </div>

      {/* Detalhamento por faixa etária */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📈 Distribuição por Faixa Etária
        </h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.byAgeGroup.ADULT}</div>
            <div className="text-sm text-gray-600 font-medium">Adultos</div>
            <div className="text-xs text-gray-400">18+ anos</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.byAgeGroup.ADOLESCENT}</div>
            <div className="text-sm text-gray-600 font-medium">Adolescentes</div>
            <div className="text-xs text-gray-400">13-17 anos</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.byAgeGroup.CHILD}</div>
            <div className="text-sm text-gray-600 font-medium">Crianças</div>
            <div className="text-xs text-gray-400">0-12 anos</div>
          </div>
        </div>

        {/* Barra de progresso visual */}
        <div className="mt-4">
          <div className="flex h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="bg-blue-500" 
              style={{ 
                width: `${stats.total > 0 ? (stats.byAgeGroup.ADULT / stats.total) * 100 : 0}%` 
              }}
            ></div>
            <div 
              className="bg-green-500" 
              style={{ 
                width: `${stats.total > 0 ? (stats.byAgeGroup.ADOLESCENT / stats.total) * 100 : 0}%` 
              }}
            ></div>
            <div 
              className="bg-orange-500" 
              style={{ 
                width: `${stats.total > 0 ? (stats.byAgeGroup.CHILD / stats.total) * 100 : 0}%` 
              }}
            ></div>
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-400">
            <span>Adultos</span>
            <span>Adolescentes</span>
            <span>Crianças</span>
          </div>
        </div>
      </div>
    </div>
  );
};