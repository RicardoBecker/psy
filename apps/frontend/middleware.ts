// 🛡️ Middleware para proteção de rotas autenticadas
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 🔒 Rotas que precisam de autenticação
const protectedRoutes = ['/dashboard'];

// 🌐 Rotas públicas que usuários autenticados devem ser redirecionados
const authRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 🔑 Verificar se existe token
  const token = request.cookies.get('emotional_app_token')?.value;
  const isAuthenticated = !!token;

  // 🛡️ Proteger rotas autenticadas
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 🔄 Redirecionar usuários autenticados das páginas de auth
  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public/).*)',
  ],
};