'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PLANS, Plan } from '@/lib/plans';
import { Check, X, CreditCard, Zap, Shield, Loader2, ArrowRight } from 'lucide-react';

export default function AssinaturaPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [currentPlanId, setCurrentPlanId] = useState<string>('solo');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    // Busca o plano atual do tenant
    const fetchPlan = async () => {
      try {
        // Aproveitamos a mesma lógica ou uma nova pra buscar os detalhes, por agora chamamos a API de stats 
        // ou simulamos. O ideal era ter um /api/tenant/[id]
        // Como não temos a rota GET simples implementada no escopo agora, 
        // vamos assumir "solo" como default ou usar alguma store
        setCurrentPlanId('solo'); // Aqui no futuro viria de await fetch(`/api/tenant/${params.id}`)
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [params.id]);

  const handleUpdatePlan = async (planId: string) => {
    if (!confirm(`Você tem certeza que deseja mudar para o plano ${PLANS[planId].name}?`)) return;
    
    setUpdating(planId);
    try {
      const res = await fetch(`/api/tenant/${params.id}/plan`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });

      if (res.ok) {
        setCurrentPlanId(planId);
        alert('Plano atualizado com sucesso!');
        router.refresh();
      } else {
        const error = await res.json();
        alert(`Erro: ${error.error}`);
      }
    } catch (error) {
      alert('Erro ao se conectar com o servidor.');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const currentPlan = PLANS[currentPlanId];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Meu Plano & Assinatura</h1>
        <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
          Gerencie seus recursos, faça upgrades e acompanhe seus limites de uso.
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 mb-12 border border-blue-100 shadow-sm flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <div className="p-3 bg-blue-500 rounded-full text-white shadow-lg">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-600 uppercase tracking-wider">Plano Atual</p>
            <h2 className="text-2xl font-bold text-gray-900">{currentPlan.name}</h2>
          </div>
        </div>
        <div className="flex items-center space-x-6 text-sm">
          <div className="text-center">
            <p className="text-gray-500">Usuários Permitidos</p>
            <p className="font-semibold text-gray-900 text-lg">
              {currentPlan.maxUsers === 999 ? 'Ilimitado' : currentPlan.maxUsers}
            </p>
          </div>
          <div className="w-px h-10 bg-gray-300"></div>
          <div className="text-center">
            <p className="text-gray-500">Conexões WhatsApp</p>
            <p className="font-semibold text-gray-900 text-lg">
              {currentPlan.maxWhatsappInstances === 999 ? 'Ilimitado' : currentPlan.maxWhatsappInstances}
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {Object.values(PLANS).map((plan) => {
          const isActive = currentPlanId === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-8 bg-white border-2 transition-all duration-300 flex flex-col ${
                isActive 
                  ? 'border-blue-500 shadow-xl ring-4 ring-blue-50 scale-105 z-10' 
                  : 'border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-1'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-md">
                    Seu Plano Atual
                  </span>
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-500 mt-2 text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-extrabold text-gray-900">R$ {plan.price}</span>
                <span className="text-gray-500">/mês</span>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 shrink-0 mr-3" />
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpdatePlan(plan.id)}
                disabled={isActive || updating !== null}
                className={`w-full py-3 px-4 rounded-xl font-bold transition-all flex justify-center items-center ${
                  isActive
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-blue-600 hover:shadow-lg'
                }`}
              >
                {updating === plan.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isActive ? (
                  'Ativo'
                ) : (
                  <>Mudar para {plan.name} <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
