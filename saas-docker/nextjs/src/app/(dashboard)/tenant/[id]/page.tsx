'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TenantDashboard({ params }: { params: { id: string } }) {
  const [stats, setStats] = useState({
    conversations: 0,
    leads: 0,
    messages: 0,
    sales: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/stats?tenantId=${params.id}`);
        const data = await res.json();
        if(data && !data.error) {
            setStats(data);
        }
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      }
    };

    fetchStats();
  }, [params.id]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Conversas</p>
          <p className="text-3xl font-bold text-gray-800">{stats.conversations}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Leads</p>
          <p className="text-3xl font-bold text-gray-800">{stats.leads}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500">Mensagens</p>
          <p className="text-3xl font-bold text-gray-800">{stats.messages}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
          <p className="text-sm text-gray-500">Vendas</p>
          <p className="text-3xl font-bold text-gray-800">{stats.sales}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href={`/tenant/${params.id}/conversations`}
          className="block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition border border-gray-200"
        >
          <h2 className="text-xl font-semibold text-gray-700">💬 Conversas</h2>
          <p className="text-gray-500 mt-2">Veja todas as conversas em tempo real</p>
        </Link>

        <Link
          href={`/tenant/${params.id}/assinatura`}
          className="block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition border border-gray-200"
        >
          <h2 className="text-xl font-semibold text-gray-700">💳 Meu Plano</h2>
          <p className="text-gray-500 mt-2">Gerencie sua assinatura e limites</p>
        </Link>

        <Link
          href={`/tenant/${params.id}/ai-config`}
          className="block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition border border-gray-200"
        >
          <h2 className="text-xl font-semibold text-gray-700">🧠 Configurar IA</h2>
          <p className="text-gray-500 mt-2">Ajuste o prompt, produtos e preços</p>
        </Link>

        <Link
          href={`/tenant/${params.id}/team`}
          className="block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition border border-gray-200"
        >
          <h2 className="text-xl font-semibold text-gray-700">👥 Equipe</h2>
          <p className="text-gray-500 mt-2">Convide e gerencie funcionários</p>
        </Link>

        <Link
          href={`/tenant/${params.id}/analytics`}
          className="block bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition border border-gray-200"
        >
          <h2 className="text-xl font-semibold text-gray-700">📊 Analytics</h2>
          <p className="text-gray-500 mt-2">Métricas de desempenho e relatórios</p>
        </Link>
      </div>
    </div>
  );
}
