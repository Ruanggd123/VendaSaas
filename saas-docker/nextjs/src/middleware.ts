import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt, encrypt } from '@/lib/auth';
import { blockedModuleForPath } from '@/lib/plans';

const protectedRoutes = [
  '/whatsapp', '/dashboard', '/admin', '/painel-parceiro',
  '/agenda', '/autovendas', '/conversas', '/equipe',
  '/onboarding', '/projetos', '/settings', '/vendas', '/workflow',
  '/meu-projeto'
];

const MANAGER_ROLES = ['superadmin', 'manager', 'admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const lowerPathname = pathname.toLowerCase();
  const isProtected = protectedRoutes.some(route => lowerPathname.startsWith(route));

  if (isProtected) {
    const sessionCookie = request.cookies.get('session');

    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const payload = await decrypt(sessionCookie.value);

      if (!payload || !payload.tenant_id) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('session');
        return response;
      }

      // --- PARCEIRO: PAINEL PRÓPRIO SEMPRE LIBERADO; OUTROS PAINÉIS LIBERADOS POR 1 HORA ---
      if (payload.role === 'partner') {
        if (lowerPathname.startsWith('/painel-parceiro')) {
          return NextResponse.next();
        }
        if (lowerPathname.startsWith('/admin')) {
          return NextResponse.redirect(new URL('/painel-parceiro', request.url));
        }

        const accessExpiresAt = payload.accessExpiresAt ? new Date(payload.accessExpiresAt) : null;
        const now = new Date();

        // Se ainda tiver contando (não expirou), NÃO reseta e libera o acesso até terminar
        if (accessExpiresAt && accessExpiresAt > now) {
          return NextResponse.next();
        }

        // Se expirou ou não estava contando, libera o acesso por mais 1 hora a partir de agora
        const newAccessExpires = new Date(now.getTime() + 60 * 60 * 1000);
        const newPayload = {
          ...payload,
          accessExpiresAt: newAccessExpires.toISOString(),
        };
        const newToken = await encrypt(newPayload);
        const response = NextResponse.next();
        response.cookies.set('session', newToken, {
          expires: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        });
        return response;
      }

      // --- PROTEÇÃO DO SUPER ADMIN ---
      if (lowerPathname.startsWith('/admin') && payload.role !== 'superadmin') {
        return NextResponse.redirect(new URL('/whatsapp', request.url));
      }

      // --- PROTEÇÃO DO PAINEL PARCEIRO ---
      if (lowerPathname.startsWith('/painel-parceiro') && payload.role !== 'partner') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // --- PROTEÇÃO POR PLANO: módulo não incluso no plano => bloqueado mesmo via URL direta ---
      if (payload.role !== 'superadmin') {
        const plan = payload.plan || null;
        const blockedModule = blockedModuleForPath(lowerPathname, plan);

        if (blockedModule) {
          return NextResponse.redirect(
            new URL(`/dashboard?blocked=${blockedModule}`, request.url)
          );
        }

        // --- GATES POR ROLE (painéis restritos) ---
        if (lowerPathname.startsWith('/autovendas') && !MANAGER_ROLES.includes(payload.role)) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        if (lowerPathname.startsWith('/projetos') && !MANAGER_ROLES.includes(payload.role) && payload.role !== 'partner') {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      }

    } catch (error) {
      // Token inválido ou expirado
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
    }
  }

  // Se o usuário logado tentar acessar /login ou /register, redireciona para o painel
  if (lowerPathname === '/login' || lowerPathname === '/register') {
    const sessionCookie = request.cookies.get('session');
    if (sessionCookie) {
      try {
        const payload = await decrypt(sessionCookie.value);
        if (payload && payload.tenant_id) {
          const redirect = payload.role === 'partner' ? '/painel-parceiro' : '/dashboard';
          return NextResponse.redirect(new URL(redirect, request.url));
        }
      } catch (e) {}
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
