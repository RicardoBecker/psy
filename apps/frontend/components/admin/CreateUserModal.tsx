// 👤 Modal de Criação de Usuário
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { adminApi, CreateAdminUserRequest } from '@/lib/admin-api';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const roles = [
  { 
    value: 'ADMIN', 
    label: 'Administrador', 
    description: 'Acesso total ao sistema',
    icon: '👑',
    color: 'bg-red-50 border-red-200 text-red-700'
  },
  { 
    value: 'PSYCHOLOGIST', 
    label: 'Psicólogo', 
    description: 'Profissional de psicologia',
    icon: '🧠',
    color: 'bg-purple-50 border-purple-200 text-purple-700'
  },
  { 
    value: 'PATIENT', 
    label: 'Paciente', 
    description: 'Usuário padrão do sistema',
    icon: '👤',
    color: 'bg-blue-50 border-blue-200 text-blue-700'
  },
  { 
    value: 'GUARDIAN', 
    label: 'Responsável', 
    description: 'Responsável legal por menores',
    icon: '👨‍👩‍👧',
    color: 'bg-green-50 border-green-200 text-green-700'
  }
];

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<CreateAdminUserRequest>({
    name: '',
    email: '',
    password: '',
    role: 'PATIENT',
    birthDate: '',
    isActive: true
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 🧹 Reset form when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'PATIENT',
        birthDate: '',
        isActive: true
      });
      setErrors({});
    }
  }, [isOpen]);

  // ✅ Validação básica
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email deve ter um formato válido';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    // Validar data de nascimento se fornecida
    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      if (birthDate > today) {
        newErrors.birthDate = 'Data de nascimento não pode ser no futuro';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 💾 Salvar usuário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Preparar dados (remover campos vazios opcionais)
      const userData: CreateAdminUserRequest = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        isActive: formData.isActive
      };

      // Adicionar data de nascimento se fornecida
      if (formData.birthDate) {
        userData.birthDate = formData.birthDate;
      }

      await adminApi.createUser(userData);
      
      toast.success('✅ Usuário criado com sucesso!');
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      // Tratar erros específicos
      if (error.response?.status === 409) {
        setErrors({ email: 'Este email já está em uso' });
      } else if (error.response?.data?.message) {
        toast.error(`❌ ${error.response.data.message}`);
      } else {
        toast.error('❌ Erro ao criar usuário. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 Atualizar campo do formulário
  const updateField = (field: keyof CreateAdminUserRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="✨ Criar Novo Usuário"
      maxWidth="lg"
    >
      {/* Cabeçalho melhorado */}
      <div className="text-center mb-6 pb-6 border-b border-gray-100">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-3 shadow-lg">
          <span className="text-xl text-white">👤</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Adicionar novo usuário
        </h3>
        <p className="text-sm text-gray-600">
          Preencha as informações abaixo para criar uma nova conta
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nome */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-2">
            <span className="flex items-center gap-2">
              👤 Nome Completo *
            </span>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            className={`
              w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200
              ${errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50' : 'border-gray-200 focus:border-blue-500 bg-gray-50 focus:bg-white'}
            `}
            placeholder="Digite o nome completo do usuário"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <span>❌</span> {errors.name}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
            <span className="flex items-center gap-2">
              📧 Email *
            </span>
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            className={`
              w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200
              ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50' : 'border-gray-200 focus:border-blue-500 bg-gray-50 focus:bg-white'}
            `}
            placeholder="usuario@exemplo.com"
            disabled={isLoading}
          />
          {errors.email && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <span>❌</span> {errors.email}
            </p>
          )}
        </div>

        {/* Senha */}
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
            <span className="flex items-center gap-2">
              🔒 Senha *
            </span>
          </label>
          <input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            className={`
              w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200
              ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50' : 'border-gray-200 focus:border-blue-500 bg-gray-50 focus:bg-white'}
            `}
            placeholder="Mínimo 6 caracteres"
            disabled={isLoading}
          />
          {errors.password && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <span>❌</span> {errors.password}
            </p>
          )}
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            <span className="flex items-center gap-2">
              🎭 Função no Sistema *
            </span>
          </label>
          <div className="space-y-2">
            {roles.map((role) => (
              <label
                key={role.value}
                className={`
                  flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200
                  ${formData.role === role.value 
                    ? `${role.color} border-current` 
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }
                  ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                `}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={formData.role === role.value}
                  onChange={(e) => updateField('role', e.target.value)}
                  disabled={isLoading}
                  className="sr-only"
                />
                <span className="text-2xl mr-3">{role.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{role.label}</div>
                  <div className="text-sm text-gray-600">{role.description}</div>
                </div>
                {formData.role === role.value && (
                  <span className="text-lg">✅</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Data de Nascimento */}
        <div>
          <label htmlFor="birthDate" className="block text-sm font-semibold text-gray-800 mb-2">
            <span className="flex items-center gap-2">
              🎂 Data de Nascimento
              <span className="text-xs font-normal text-gray-500">(opcional)</span>
            </span>
          </label>
          <div className="relative">
            <input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => updateField('birthDate', e.target.value)}
              className={`
                w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200
                ${errors.birthDate ? 'border-red-300 focus:border-red-500 focus:ring-red-200 bg-red-50' : 'border-gray-200 focus:border-blue-500 bg-gray-50 focus:bg-white'}
              `}
              disabled={isLoading}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            💡 Ajuda a calcular a faixa etária (adulto, adolescente, criança)
          </p>
          {errors.birthDate && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <span>❌</span> {errors.birthDate}
            </p>
          )}
        </div>

        {/* Usuário Ativo */}
        <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-200">
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                id="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => updateField('isActive', e.target.checked)}
                className="sr-only"
                disabled={isLoading}
              />
              <div className={`
                w-12 h-6 rounded-full transition-all duration-200
                ${formData.isActive ? 'bg-green-500' : 'bg-gray-300'}
                ${isLoading ? 'opacity-50' : ''}
              `}>
                <div className={`
                  w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200
                  ${formData.isActive ? 'translate-x-6' : 'translate-x-0.5'}
                `} style={{marginTop: '2px'}} />
              </div>
            </div>
            <div className="ml-4">
              <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                {formData.isActive ? '✅' : '❌'} Status do Usuário
              </span>
              <p className="text-xs text-gray-600 mt-1">
                {formData.isActive 
                  ? 'Usuário ativo: pode fazer login no sistema' 
                  : 'Usuário inativo: não pode fazer login'
                }
              </p>
            </div>
          </label>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            ❌ Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 border-2 border-transparent rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Criando usuário...
              </span>
            ) : (
              '✨ Criar Usuário'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};