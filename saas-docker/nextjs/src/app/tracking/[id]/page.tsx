import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock, Rocket, AlertCircle } from 'lucide-react';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export default async function TrackingPage({ params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { timelines: { orderBy: { created_at: 'desc' } } }
  });

  if (!project) return notFound();

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    'OPEN': { label: 'Aguardando Desenvolvedor', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Clock },
    'IN_PROGRESS': { label: 'Em Desenvolvimento', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', icon: Rocket },
    'REVIEW': { label: 'Em Homologação', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: AlertCircle },
    'COMPLETED': { label: 'Entregue', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 }
  };

  const currentStatus = statusMap[project.status] || statusMap['OPEN'];
  const Icon = currentStatus.icon;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center py-20 px-4 relative overflow-hidden">
      <div className="fixed -top-40 -right-40 w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-[180px] pointer-events-none" />
      <div className="fixed -bottom-40 -left-40 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-2xl w-full relative z-10 space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 p-[1px] mx-auto">
            <div className="w-full h-full rounded-2xl bg-zinc-950 flex items-center justify-center">
              <Rocket className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold">{project.title}</h1>
          <p className="text-zinc-400">Cliente: {project.client_name}</p>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${currentStatus.color} font-bold text-sm`}>
            <Icon className="w-4 h-4" />
            {currentStatus.label}
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 md:p-10 backdrop-blur-xl">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" /> Histórico do Projeto
          </h2>
          
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
            {project.timelines.map((t, i) => (
              <div key={t.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-zinc-900 bg-indigo-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/[0.02] border border-white/[0.05] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm text-white">{t.status_change || 'Atualização'}</h3>
                    <span className="text-[10px] text-zinc-500 font-mono">{new Date(t.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{t.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
