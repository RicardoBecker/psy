'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../providers/auth-provider';
import { Button, Alert } from '../../../components/ui';
import { checkinsApi } from '../../../lib/checkins-api';

interface CheckinFormData {
  moodScore: number;
  energyLevel: number;
  anxietyLevel: number;
  notes?: string;
}

export default function CheckinPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<CheckinFormData>({
    moodScore: 5,
    energyLevel: 5,
    anxietyLevel: 5,
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Redirect se não estiver autenticado
  if (!isLoading && !isAuthenticated) {
    router.push('/login');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const updateScore = (field: keyof Pick<CheckinFormData, 'moodScore' | 'energyLevel' | 'anxietyLevel'>, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getEmoji = (field: string, value: number): string => {
    const emojis = {
      moodScore: ['😞', '😟', '😐', '😕', '😊', '😊', '😁', '😄', '😆', '🥰'],
      energyLevel: ['😴', '🥱', '😑', '😐', '🙂', '😊', '😁', '😄', '⚡', '🔥'],
      anxietyLevel: ['😌', '🙂', '😐', '😰', '😨', '😰', '😱', '💥', '🚨', '😵']
    };
    return emojis[field as keyof typeof emojis][value - 1] || '😐';
  };

  const getScoreDescription = (field: string, value: number): string => {
    const descriptions = {
      moodScore: [
        'Muito triste', 'Triste', 'Desanimado', 'Nem bem nem mal', 'Ok',
        'Bem', 'Muito bem', 'Ótimo', 'Excelente', 'Radiante'
      ],
      energyLevel: [
        'Exausto', 'Muito cansado', 'Cansado', 'Um pouco cansado', 'Normal',
        'Disposto', 'Energizado', 'Muito energizado', 'Cheio de energia', 'Vibrando'
      ],
      anxietyLevel: [
        'Muito calmo', 'Calmo', 'Tranquilo', 'Um pouco ansioso', 'Ansioso',
        'Muito ansioso', 'Estressado', 'Muito estressado', 'Sobrecarregado', 'Em pânico'
      ]
    };
    return descriptions[field as keyof typeof descriptions][value - 1] || 'Normal';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAlert(null);

    try {
      await checkinsApi.create(formData);

      setAlert({
        type: 'success',
        message: 'Check-in salvo com sucesso! 🎉'
      });

      // Redirecionar para o histórico após 2 segundos
      setTimeout(() => {
        router.push('/dashboard/checkins');
      }, 2000);

    } catch (error: any) {
      console.error('Erro ao salvar check-in:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Erro ao salvar check-in'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const ScoreSlider = ({ 
    label, 
    field, 
    value, 
    color 
  }: { 
    label: string; 
    field: keyof Pick<CheckinFormData, 'moodScore' | 'energyLevel' | 'anxietyLevel'>; 
    value: number; 
    color: string; 
  }) => (
    <div className="space-y-4">
      <label className="block text-lg font-semibold text-gray-900">{label}</label>
      
      <div className="text-center space-y-2">
        <div className="text-4xl">{getEmoji(field, value)}</div>
        <div className="text-lg font-medium text-gray-700">
          {getScoreDescription(field, value)}
        </div>
        <div className={`text-3xl font-bold ${color}`}>{value}/10</div>
      </div>

      <div className="space-y-2">
        <input
          type="range"
          min="1"
          max="10"
          value={value}
          onChange={(e) => updateScore(field, parseInt(e.target.value))}
          className={`w-full h-3 rounded-lg appearance-none cursor-pointer slider-${field}`}
          style={{
            background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${(value - 1) * 11.11}%, #e5e7eb ${(value - 1) * 11.11}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-sm text-gray-500">
          <span>1</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="mr-2">←</span>
              Voltar ao Dashboard
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Check-in Emocional</h1>
            <div className="w-32" /> {/* Spacer para centralizar o título */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6 md:p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Como você está se sentindo hoje, {user?.name}?
            </h2>
            <p className="text-gray-600">
              Registre seu estado emocional atual. Isso nos ajudará a acompanhar seu bem-estar ao longo do tempo.
            </p>
          </div>

          {alert && (
            <div className="mb-6">
              <Alert type={alert.type} message={alert.message} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Scores Section */}
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-blue-50 rounded-lg p-6">
                <ScoreSlider
                  label="😊 Humor"
                  field="moodScore"
                  value={formData.moodScore}
                  color="text-blue-600"
                />
              </div>

              <div className="bg-green-50 rounded-lg p-6">
                <ScoreSlider
                  label="⚡ Energia"
                  field="energyLevel"
                  value={formData.energyLevel}
                  color="text-green-600"
                />
              </div>

              <div className="bg-yellow-50 rounded-lg p-6">
                <ScoreSlider
                  label="😰 Ansiedade"
                  field="anxietyLevel"
                  value={formData.anxietyLevel}
                  color="text-yellow-600"
                />
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-gray-900">
                📝 Observações (opcional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Escreva aqui qualquer observação sobre como você está se sentindo hoje, eventos importantes, ou qualquer coisa que queira registrar..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                maxLength={500}
              />
              <div className="text-right text-sm text-gray-500">
                {formData.notes?.length || 0}/500 caracteres
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-center space-y-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                className="!w-full md:!w-80 py-4 text-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Check-in 💾'}
              </Button>
              
              <p className="text-sm text-gray-500">
                Seus dados são privados e seguros.
              </p>
            </div>
          </form>
        </div>
      </main>

      {/* Custom Styles */}
      <style jsx>{`
        .slider-moodScore::-webkit-slider-thumb {
          appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider-energyLevel::-webkit-slider-thumb {
          appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider-anxietyLevel::-webkit-slider-thumb {
          appearance: none;
          height: 24px;
          width: 24px;
          border-radius: 50%;
          background: #f59e0b;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .slider-moodScore::-moz-range-thumb,
        .slider-energyLevel::-moz-range-thumb,
        .slider-anxietyLevel::-moz-range-thumb {
          height: 24px;
          width: 24px;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}