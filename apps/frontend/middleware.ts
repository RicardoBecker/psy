// 🛡️ Middleware para proteção de rotas autenticadas
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 🔒 Rotas que precisam de autenticação
const protectedRoutes = ['/dashboard'];

// 👑 Rotas administrativas (requerem role ADMIN)
const adminRoutes = ['/dashboard/admin'];

// 🔐 Rotas que requerem uma role específica
const roleProtectedRoutes: { prefix: string; roles: string[] }[] = [
  { prefix: '/dashboard/psychologist', roles: ['PSYCHOLOGIST'] },
  { prefix: '/dashboard/patient', roles: ['PATIENT'] },
];

// 🌐 Rotas públicas que usuários autenticados devem ser redirecionados
const authRoutes = ['/login', '/register'];

// 🔓 Decodificar payload do JWT (só payload, sem verificação de assinatura)
function decodeJWTPayload(token: string) {
  try {
    const [, payload] = token.split('.');
    const decodedPayload = Buffer.from(payload, 'base64url').toString();
    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 🔑 Verificar se existe token
  const token = request.cookies.get('emotional_app_token')?.value;
  const isAuthenticated = !!token;

  // 🔓 Decodificar token para verificar role (sem validação de assinatura)
  let userRole = null;
  if (token) {
    const payload = decodeJWTPayload(token);
    userRole = payload?.role;
  }

  // 👑 Proteger rotas administrativas (verificar role ADMIN)
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    if (userRole !== 'ADMIN') {
      // Redirecionar para dashboard com mensagem de erro
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('error', 'access_denied');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // 🔐 Proteger rotas restritas a roles específicas
  for (const { prefix, roles } of roleProtectedRoutes) {
    if (pathname.startsWith(prefix)) {
      if (!isAuthenticated) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      if (!roles.includes(userRole)) {
        const dashboardUrl = new URL('/dashboard', request.url);
        dashboardUrl.searchParams.set('error', 'access_denied');
        return NextResponse.redirect(dashboardUrl);
      }
    }
  }

  // 🛡️ Proteger rotas autenticadas gerais
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