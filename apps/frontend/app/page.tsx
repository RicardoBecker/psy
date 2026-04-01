import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Emotional App
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              Sua jornada de bem-estar emocional começa aqui
            </p>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Uma plataforma completa para acompanhar, entender e melhorar sua saúde mental 
              através de check-ins emocionais e reflexões diárias.
            </p>
          </div>

          {/* Hero Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-16">
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Acompanhamento</h3>
                <p className="text-gray-600">Monitore seus sentimentos diariamente</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Reflexão</h3>
                <p className="text-gray-600">Escreva sobre suas experiências</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🌱</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Crescimento</h3>
                <p className="text-gray-600">Desenvolva práticas saudáveis</p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="space-y-4">
              <button className="bg-primary-600 hover:bg-primary-700 text-white font-semibold text-lg px-12 py-4 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                Iniciar Jornada
              </button>
              <p className="text-sm text-gray-500">
                Gratuito para começar • Sem compromisso
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h4 className="text-lg font-semibold mb-3">Check-ins Emocionais</h4>
              <p className="text-gray-600">
                Registre seu humor, energia e nível de stress de forma rápida e intuitiva.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h4 className="text-lg font-semibold mb-3">Diário Pessoal</h4>
              <p className="text-gray-600">
                Mantenha um registro privado de seus pensamentos e conquistas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}