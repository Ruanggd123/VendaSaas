import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';

const prisma = new PrismaClient();

const protectedRoutes = [
  '/whatsapp', '/dashboard', '/admin', '/painel-parceiro',
  '/agenda', '/autovendas', '/conversas', '/equipe',
  '/onboarding', '/projetos', '/settings', '/vendas', '/workflow'
];

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
      
      if (!payload.tenant_id) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('session');
        return response;
      }

      // Verificação no Banco de Dados: Se o usuário/parceiro foi apagado, expulsa e limpa a sessão
      if (payload.role === 'partner') {
        const partner = await prisma.partner.findUnique({
          where: { id: payload.id },
          select: { id: true }
        });
        if (!partner) {
          const response = NextResponse.redirect(new URL('/login', request.url));
          response.cookies.delete('session');
          return response;
        }
      } else {
        const userId = payload.id || payload.userId;
        if (userId) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true }
          });
          if (!user) {
            const response = NextResponse.redirect(new URL('/login', request.url));
            response.cookies.delete('session');
            return response;
          }
          // Garante a role real do banco de dados (evita privilégios falsos no token)
          payload.role = user.role;
        }
      }

      // --- PARCEIRO: PAINEL PRÓPRIO SEMPRE LIBERADO; CLIENTE SÓ COM SESSÃO ATIVA ---
      if (payload.role === 'partner') {
        // Painel do parceiro sempre acessível
        if (lowerPathname.startsWith('/painel-parceiro')) {
          return NextResponse.next();
        }
        // Bloqueia /admin para parceiros
        if (lowerPathname.startsWith('/admin')) {
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
      if (lowerPathname.startsWith('/admin') && payload.role !== 'superadmin') {
        return NextResponse.redirect(new URL('/whatsapp', request.url));
      }

      // --- PROTEÇÃO DO PAINEL PARCEIRO ---
      if (lowerPathname.startsWith('/painel-parceiro') && payload.role !== 'partner') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
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
