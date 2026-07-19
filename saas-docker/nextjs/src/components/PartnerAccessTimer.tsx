'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, UserCircle, ExternalLink } from 'lucide-react';

export default function PartnerAccessTimer() {
  const router = useRouter();
  const [access, setAccess] = useState<{
    expired: boolean;
    remainingMinutes: number;
    remainingSeconds: number;
  } | null>(null);
  const [isPartner, setIsPartner] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data.authenticated && data.user?.role === 'partner') {
          setIsPartner(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isPartner) return;

    const check = async () => {
      try {
        const res = await fetch('/api/partner/trial');
        const data = await res.json();
        if (!data.error) setAccess(data);
      } catch {}
    };

    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [isPartner]);

  useEffect(() => {
    if (access?.expired) {
      router.push('/painel-parceiro');
    }
  }, [access?.expired, router]);

  if (!isPartner || !access || access.expired) return null;

  const isLow = access.remainingMinutes < 5;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-1.5">
      <Link
        href="/painel-parceiro"
        className={`flex items-center gap-2 px-4 py-2.5 text-white text-xs font-bold rounded-xl shadow-lg transition-all hover:scale-105 ${
          isLow
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/30 animate-pulse'
            : 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30'
        }`}
        title="Clique para abrir o Painel do Parceiro"
      >
        <Zap className="w-4 h-4" />
        <span className="font-mono font-bold">
          {String(access.remainingMinutes).padStart(2, '0')}:
          {String(access.remainingSeconds).padStart(2, '0')}
        </span>
        <span className="text-[10px] opacity-80 ml-1">restantes</span>
      </Link>
      <Link
        href="/painel-parceiro"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all"
      >
        <UserCircle className="w-3.5 h-3.5" />
        <span>Painel do Parceiro</span>
        <ExternalLink className="w-3 h-3 opacity-60" />
      </Link>
    </div>
  );
}
