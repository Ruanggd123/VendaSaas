import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

const protectedRoutes = [
  '/whatsapp', '/dashboard', '/admin', '/painel-parceiro',
  '/agenda', '/autovendas', '/conversas', '/equipe',
  '/onboarding', '/projetos', '/settings', '/vendas', '/workflow'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if it's a protected route
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtected) {
    const sessionCookie = request.cookies.get('session');

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const payload = await decrypt(sessionCookie.value);
      
      if (!payload.tenant_id) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      // --- PARCEIRO: PAINEL PRÓPRIO SEMPRE LIBERADO; CLIENTE SÓ COM SESSÃO ATIVA ---
      if (payload.role === 'partner') {
        // Painel do parceiro sempre acessível
        if (pathname.startsWith('/painel-parceiro')) {
          return NextResponse.next();
        }
        // Bloqueia /admin para parceiros
        if (pathname.startsWith('/admin')) {
          return NextResponse.redirect(new URL('/painel-parceiro', request.url));
        }
        // Para rotas de cliente, verifica se o acesso está ativo
        const accessExpiresAt = payload.accessExpiresAt ? new Date(payload.accessExpiresAt) : null;
        const now = new Date();
        if (!accessExpiresAt || accessExpiresAt <= now) {
          return NextResponse.redirect(new URL('/painel-parceiro', request.url));
        }
        return NextResponse.next();
      }

      // --- PROTEÇÃO DO SUPER ADMIN ---
      if (pathname.startsWith('/admin') && payload.role !== 'superadmin') {
        return NextResponse.redirect(new URL('/whatsapp', request.url));
      }

      // --- PROTEÇÃO DO PAINEL PARCEIRO ---
      if (pathname.startsWith('/painel-parceiro') && payload.role !== 'partner') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

    } catch (error) {
      // Token inválido ou expirado
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Se o usuário logado tentar acessar /login ou /register, redireciona para o painel
  if (pathname === '/login' || pathname === '/register') {
    const sessionCookie = request.cookies.get('session');
    if (sessionCookie) {
      try {
        const payload = await decrypt(sessionCookie.value);
        const redirect = payload.role === 'partner' ? '/painel-parceiro' : '/whatsapp';
        return NextResponse.redirect(new URL(redirect, request.url));
      } catch (e) {}
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
