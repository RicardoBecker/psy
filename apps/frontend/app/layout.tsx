import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '../providers/auth-provider'
import { Toaster } from 'react-hot-toast'

// 🔤 Fonte do sistema (stack padrão do Tailwind), em vez de next/font/google:
// evita depender de fonts.googleapis.com durante o build (CR-04.4). Visual
// muito próximo de Inter — mesma família de fontes UI modernas.

export const metadata: Metadata = {
  title: 'Emotional App - Acompanhamento Emocional',
  description: 'Plataforma para acompanhamento e monitoramento do bem-estar emocional',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="font-sans">
        <AuthProvider>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}