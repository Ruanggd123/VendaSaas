'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AIConfigPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    ai_prompt: '',
    business_hours: {
      monday_to_friday: '08:00-20:00',
      saturday: '09:00-14:00',
      sunday: 'fechado'
    },
    out_of_hours_message: 'Olá! Estamos fora do horário. Responderemos em breve.',
    products: [{ name: '', price: 0, description: '' }],
    inactivity_alert: '',
    promotion_message: '',
    tone: 'professional'
  });

  // Buscar configurações atuais
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/tenant?instance=${params.id}`);
        const data = await res.json();
        if (data.settings) {
          // Precisamos parsear as configurações que estão no banco
          setConfig({
            ai_prompt: data.settings.ai_prompt || '',
            business_hours: data.settings.business_hours || config.business_hours,
            out_of_hours_message: data.settings.out_of_hours_message || config.out_of_hours_message,
            products: data.settings.products || config.products,
            inactivity_alert: data.settings.inactivity_alert || '',
            promotion_message: data.settings.promotion_message || '',
            tone: data.settings.tone || 'professional'
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        setLoading(false);
      }
    };

    if (params.id) {
      fetchConfig();
    }
  }, [params.id]);

  // Salvar configurações
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/tenant/${params.id}/ai-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: config })
      });

      if (res.ok) {
        alert('Configurações salvas com sucesso! A IA vai usar essas regras a partir de agora.');
        router.refresh();
      } else {
        alert('Erro ao salvar. Verifique os dados e tente novamente.');
      }
    } catch (error) {
      alert('Erro de conexão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Função para adicionar novo produto
  const addProduct = () => {
    setConfig({
      ...config,
      products: [...config.products, { name: '', price: 0, description: '' }]
    });
  };

  // Função para remover produto
  const removeProduct = (index: number) => {
    const newProducts = config.products.filter((_, i) => i !== index);
    setConfig({ ...config, products: newProducts });
  };

  // Atualizar campo do produto
  const updateProduct = (index: number, field: string, value: string | number) => {
    const newProducts = config.products.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    );
    setConfig({ ...config, products: newProducts });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Configuração da IA</h1>
      <p className="text-gray-600 mb-6">
        Personalize como a IA vai atender, vender e se comunicar com seus leads.
      </p>

      <form onSubmit={handleSave} className="space-y-8">
        {/* PROMPT DA IA */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">🧠 Personalidade da IA</h2>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prompt de Instrução (o que a IA deve saber e como agir)
          </label>
          <textarea
            value={config.ai_prompt}
            onChange={(e) => setConfig({ ...config, ai_prompt: e.target.value })}
            rows={8}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            placeholder="Ex: Você é a assistente da Imobiliária João... (descreva produtos, preços, tom, etc)"
          />
          <p className="text-xs text-gray-500 mt-2">
            Este prompt é o "cérebro" da IA. Quanto mais detalhado, melhores as respostas.
          </p>
        </div>

        {/* TOM DE VOZ */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">🎭 Tom de Voz</h2>
          <select
            value={config.tone}
            onChange={(e) => setConfig({ ...config, tone: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="professional">Profissional e Formal</option>
            <option value="casual">Casual e Amigável</option>
            <option value="enthusiastic">Entusiasta e Motivador</option>
            <option value="technical">Técnico e Detalhista</option>
          </select>
        </div>

        {/* PRODUTOS E PREÇOS */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">📦 Produtos e Preços</h2>
          {config.products.map((product, index) => (
            <div key={index} className="border-b border-gray-200 pb-4 mb-4 last:border-0">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-700">Produto #{index + 1}</h3>
                {config.products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProduct(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remover
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={product.name}
                  onChange={(e) => updateProduct(index, 'name', e.target.value)}
                  placeholder="Nome do produto"
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                />
                <input
                  type="number"
                  value={product.price}
                  onChange={(e) => updateProduct(index, 'price', parseFloat(e.target.value))}
                  placeholder="Preço (R$)"
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                />
                <input
                  type="text"
                  value={product.description}
                  onChange={(e) => updateProduct(index, 'description', e.target.value)}
                  placeholder="Descrição curta"
                  className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addProduct}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            + Adicionar Produto
          </button>
        </div>

        {/* HORÁRIOS DE ATENDIMENTO */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">⏰ Horários de Atendimento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Segunda a Sexta</label>
              <input
                type="text"
                value={config.business_hours.monday_to_friday}
                onChange={(e) => setConfig({
                  ...config,
                  business_hours: { ...config.business_hours, monday_to_friday: e.target.value }
                })}
                placeholder="Ex: 08:00-20:00"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sábado</label>
              <input
                type="text"
                value={config.business_hours.saturday}
                onChange={(e) => setConfig({
                  ...config,
                  business_hours: { ...config.business_hours, saturday: e.target.value }
                })}
                placeholder="Ex: 09:00-14:00"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Domingo</label>
            <input
              type="text"
              value={config.business_hours.sunday}
              onChange={(e) => setConfig({
                ...config,
                business_hours: { ...config.business_hours, sunday: e.target.value }
              })}
              placeholder="Ex: fechado"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">Mensagem fora do horário</label>
            <input
              type="text"
              value={config.out_of_hours_message}
              onChange={(e) => setConfig({ ...config, out_of_hours_message: e.target.value })}
              placeholder="Mensagem automática quando estiver fora do horário"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>
        </div>

        {/* PROMOÇÕES E ALERTAS */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">📢 Promoções e Alertas</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Mensagem de Promoção</label>
              <input
                type="text"
                value={config.promotion_message}
                onChange={(e) => setConfig({ ...config, promotion_message: e.target.value })}
                placeholder="Ex: Aproveite 20% de desconto este mês!"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Alerta de Inatividade</label>
              <input
                type="text"
                value={config.inactivity_alert}
                onChange={(e) => setConfig({ ...config, inactivity_alert: e.target.value })}
                placeholder="Ex: Se não houver conversa por 2 dias, disparamos alerta"
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
          </div>
        </div>

        {/* BOTÃO SALVAR */}
        <div className="flex justify-end space-x-4">
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-3 text-white font-medium rounded-lg transition ${
              saving ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {saving ? 'Salvando...' : '💾 Salvar Configurações'}
          </button>
        </div>
      </form>
    </div>
  );
}
