'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Check, Loader2, ChevronRight, ShoppingCart,
  Star, Shield, Globe, Rocket, Bot, Zap, Users,
  Heart, Wrench, Calculator, Sparkles,
  ExternalLink, CheckCircle, AlertCircle,
  Package, RefreshCw, Store,
  ChevronDown, Clock, Headphones, Smartphone,
  BarChart3, Palette, FileText, MessageSquare
} from 'lucide-react';

interface Product {
  name: string;
  price: string;
  monthly?: string;
  description?: string;
  type?: string;
  features?: string | string[];
  included_bot?: string | null;
  bot_free_months?: number | null;
  requires_payment?: boolean;
  is_checkout_product?: boolean;
  delivery_type?: string;
  duration_min?: number;
}

interface CartItem {
  name: string;
  price: number;
  monthly: number;
  qty: number;
  type: string;
  isBonus: boolean;
}

const ICONS: Record<string, any> = {
  'Presenca Digital': Globe,
  'Secretaria Inteligente': Rocket,
  'Enterprise': Store,
  'Bot Starter': Zap,
  'Bot Pro IA': Bot,
  'Bot Equipe': Users,
  'Modulo Odontologia': Heart,
  'Modulo Varejo': Package,
  'Modulo Assistencia Tecnica': Wrench,
  'Modulo Contabilidade': Calculator,
};

const COLORS: Record<string, string> = {
  'Presenca Digital': 'from-indigo-500 to-blue-600',
  'Secretaria Inteligente': 'from-purple-500 to-pink-600',
  'Enterprise': 'from-amber-500 to-orange-600',
  'Bot Starter': 'from-cyan-500 to-teal-600',
  'Bot Pro IA': 'from-purple-500 to-violet-600',
  'Bot Equipe': 'from-emerald-500 to-green-600',
};

function formatPrice(value: string | number | undefined): string {
  if (!value || value === '0') return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toFixed(2);
}

function parseFeatures(features: any): string[] {
  if (!features) return [];
  if (Array.isArray(features)) return features.filter(Boolean);
  if (typeof features === 'string') return features.split(',').map(f => f.trim()).filter(Boolean);
  return [];
}

function hasValue(value: string | undefined): boolean {
  return !!value && value !== '0' && parseFloat(value) > 0;
}

export default function CheckoutPage({ params }: { params: { tenantId: string } }) {
  const { tenantId } = params;
  const formRef = useRef<HTMLDivElement>(null);
  const [ref, setRef] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [done, setDone] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedTime, setSelectedTime] = useState('09:00');
  const TIME_SLOTS = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

  const isSlotAvailable = (timeSlot: string) => {
    if (!selectedDate) return false;
    const now = new Date();
    const isToday = selectedDate === todayStr;

    if (isToday) {
      const [slotHour, slotMin] = timeSlot.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      // Se o horário já passou hoje
      if (slotHour < currentHour || (slotHour === currentHour && slotMin <= currentMin + 15)) {
        return false;
      }
    }

    // Verificar se já existe agendamento neste horário no banco de dados do tenant
    const targetDateStr = `${selectedDate}T${timeSlot}`;
    const isBooked = bookedSlots.some(slotIso => {
      const slotDate = new Date(slotIso);
      const slotFormatted = `${slotDate.getFullYear()}-${String(slotDate.getMonth() + 1).padStart(2, '0')}-${String(slotDate.getDate()).padStart(2, '0')}T${String(slotDate.getHours()).padStart(2, '0')}:${String(slotDate.getMinutes()).padStart(2, '0')}`;
      return slotFormatted.startsWith(targetDateStr);
    });

    return !isBooked;
  };

  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    billingType: 'PIX' as 'PIX' | 'BOLETO' | 'CREDIT_CARD',
    scheduled_at: '',
  });

  useEffect(() => {
    if (selectedDate && selectedTime) {
      setForm(f => ({ ...f, scheduled_at: `${selectedDate}T${selectedTime}` }));
    }
  }, [selectedDate, selectedTime]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const urlRef = p.get('ref');
    const urlProduct = p.get('product');
    const urlPhone = p.get('phone');
    if (urlRef) setRef(urlRef.toUpperCase());
    if (urlPhone) setForm(f => ({ ...f, phone: decodeURIComponent(urlPhone) }));

    fetch(`/api/public/checkout/${tenantId}`)
      .then(async r => { if (!r.ok) throw new Error('Loja não encontrada'); return r.json(); })
      .then(d => {
        if (d.tenantName) setTenantName(d.tenantName);
        if (d.bookedSlots) setBookedSlots(d.bookedSlots);
        if (d.products?.length) {
          setProducts(d.products);
          if (urlProduct) {
            const decodedProd = decodeURIComponent(urlProduct).trim();
            const match = d.products.find((prod: any) => 
              prod.name.toLowerCase().trim() === decodedProd.toLowerCase() ||
              prod.name.toLowerCase().includes(decodedProd.toLowerCase()) ||
              decodedProd.toLowerCase().includes(prod.name.toLowerCase())
            );
            if (match) {
              setSelected(match.name);
              setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 300);
            }
          }
        }
        else setError('Nenhum produto cadastrado.');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [tenantId]);

  // All active products
  const activeProducts = products.filter(p => p.is_checkout_product !== false);

  // Plans: monthly products
  const plans = activeProducts.filter(p => hasValue(p.monthly));

  // Standalone products: one-time price products (Sites, Web Apps, E-commerce, etc)
  const standaloneProducts = activeProducts.filter(p => !hasValue(p.monthly) && hasValue(p.price));

  const handleSelect = (name: string) => {
    setSelected(name === selected ? null : name);
    setError('');

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const getCart = (): CartItem[] => {
    if (!selected) return [];
    const product = products.find(p => p.name === selected);
    if (!product) return [];

    const cart: CartItem[] = [];

    // Single one-time purchase product (has price, no monthly)
    if (hasValue(product.price) && !hasValue(product.monthly)) {
      cart.push({ name: product.name, price: parseFloat(product.price!), monthly: 0, qty: 1, type: 'one_time', isBonus: false });
      return cart;
    }

    // Plan with setup + monthly
    const setupPrice = hasValue(product.price) ? parseFloat(product.price) : 0;
    if (setupPrice > 0) {
      cart.push({ name: product.name, price: setupPrice, monthly: 0, qty: 1, type: 'one_time', isBonus: false });
    }
    if (hasValue(product.monthly)) {
      cart.push({ name: product.name, price: 0, monthly: parseFloat(product.monthly!), qty: 1, type: 'subscription', isBonus: false });
    }
    return cart;
  };

  const cart = getCart();
  const totalSetup = cart.filter(i => i.type === 'one_time').reduce((s, i) => s + i.price * i.qty, 0);
  const totalMonthly = cart.filter(i => i.type === 'subscription').reduce((s, i) => s + i.monthly * i.qty, 0);
  const hasSubscription = totalMonthly > 0;
  const firstMonthTotal = totalSetup + totalMonthly;

  const handleSubmit = async () => {
    setError('');
    if (!form.name || !form.phone) { setError('Preencha nome e WhatsApp.'); return; }
    if (!selected) { setError('Selecione um plano ou produto.'); return; }
    if (!termsAccepted) { setError('Você precisa aceitar o Contrato de Prestação de Serviços e Termos de Uso para prosseguir.'); return; }
    setSubmitting(true);

    const sel = products.find(p => p.name === selected);
    if (sel?.delivery_type === 'service') {
      if (!form.scheduled_at) { setError('Selecione uma data e horário válidos para o agendamento.'); return; }
      if (new Date(form.scheduled_at).getTime() < Date.now()) { setError('A data e horário do agendamento devem ser futuros.'); return; }
    }
    const productNames = `${sel?.name}${sel?.included_bot ? ` + ${sel.included_bot}` : ''}`;

    try {
      const res = await fetch(`/api/public/checkout/${tenantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          referralCode: ref || undefined,
          productName: productNames,
          amount: firstMonthTotal.toFixed(2),
          isSubscription: hasSubscription,
          billingType: form.billingType,
          scheduled_at: form.scheduled_at || undefined,
          cart: cart.map(i => ({
            name: `${i.name}${i.type === 'subscription' ? ' - Mensal' : ' - Setup'}`,
            price: i.type === 'subscription' ? i.monthly : i.price,
            qty: i.qty,
            type: i.type,
            isBonus: false,
          })),
        }),
      });
      const data = await res.json();
      if (data.paymentLink) {
        setPaymentLink(data.paymentLink);
        setDone(true);
        window.location.href = data.paymentLink;
      } else {
        setError(data.error || 'Erro ao gerar pagamento');
      }
    } catch { setError('Erro de conexão com o servidor. Tente novamente em instantes.'); }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2a] to-[#1a0a2a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">Carregando loja...</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2a] to-[#1a0a2a] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/30">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Pedido Criado!</h2>
          <p className="text-zinc-400 text-sm mb-8">
            {paymentLink
              ? 'Seu pedido foi gerado com sucesso. Finalize o pagamento para ativar seu plano.'
              : 'Pagamento confirmado! Em breve voce recebera acesso.'}
          </p>

          {cart.length > 0 && (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl text-left space-y-2 mb-6">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Resumo</h3>
              {cart.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-zinc-400">{item.name}</span>
                  <span className="text-white font-semibold">
                    {item.type === 'subscription' ? `R$ ${item.monthly.toFixed(2)}/mes` : `R$ ${item.price.toFixed(2)}`}
                  </span>
                </div>
              ))}
              <div className="border-t border-white/10 pt-3 mt-3 flex justify-between">
                <span className="text-sm font-bold text-zinc-300">Total</span>
                <span className="text-xl font-extrabold text-white">R$ {firstMonthTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {paymentLink ? (
            <a href={paymentLink} target="_blank" rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold rounded-2xl px-6 py-4 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 text-lg">
              <ExternalLink className="w-5 h-5" />
              Ir para o Pagamento
              <ChevronRight className="w-4 h-4" />
            </a>
          ) : (
            <div className="flex items-center justify-center gap-2 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-bold">Pagamento aprovado!</span>
            </div>
          )}
          <p className="text-[10px] text-zinc-600 mt-4 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3 text-emerald-500" />
            Pagamento 100% seguro
          </p>
        </div>
      </div>
    );
  }

  if (error && !products.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2a] to-[#1a0a2a] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto" />
          <p className="text-zinc-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0f0f2a] to-[#1a0a2a]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-black/30 backdrop-blur-xl sticky top-0">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Store className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm">{tenantName || 'Loja'}</span>
          </div>
          <div className="flex items-center gap-3">
            {ref && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                <Star className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] text-indigo-300">Indicado por <span className="text-white font-bold">{ref}</span></span>
              </div>
            )}
            <Shield className="w-4 h-4 text-emerald-500/60" />
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
            Escolha seu{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              plano ideal
            </span>
          </h1>
          <p className="text-zinc-500 text-sm max-w-2xl mx-auto">
            Todos os planos incluem hospedagem, suporte e atualizações. Cancele quando quiser.
          </p>
        </div>

        {/* Plans Section */}
        {plans.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-5 px-1">Sites e Pacotes Completos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plans.map((p) => {
                const isSelected = selected === p.name;
                const Icon = ICONS[p.name] || Globe;
                const colors = COLORS[p.name] || 'from-indigo-500 to-purple-600';
                const setupValue = hasValue(p.price) ? parseFloat(p.price) : 0;
                const featuresList = parseFeatures(p.features);
                const bot = p.included_bot ? getBot(p.included_bot) : null;

                return (
                  <button
                    key={p.name}
                    onClick={() => handleSelect(p.name)}
                    className={`relative text-left rounded-3xl border-2 p-6 md:p-8 transition-all duration-300 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/[0.04] shadow-2xl shadow-indigo-500/20 scale-[1.02]'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] hover:scale-[1.01]'
                    }`}
                  >
                    {bot && (
                      <div className="absolute -top-3 right-6 px-4 py-1 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full shadow-lg shadow-emerald-500/30 z-10">
                        <span className="text-[10px] font-bold text-white flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          BOT INCLUSO
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-5 mb-5">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors} flex items-center justify-center shrink-0 shadow-lg ${isSelected ? 'scale-110' : ''} transition-transform`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white">{p.name}</h3>
                        {p.description && <p className="text-xs text-zinc-500 mt-1">{p.description}</p>}
                      </div>
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-zinc-600'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-3 mb-5">
                      <div className="text-3xl font-extrabold text-white">
                        R$ {formatPrice(p.monthly)}<span className="text-base font-normal text-zinc-500">/mes</span>
                      </div>
                      {setupValue > 0 && (
                        <span className="text-xs text-zinc-600">+ R$ {formatPrice(p.price)} setup</span>
                      )}
                    </div>

                    {/* Features */}
                    {featuresList.length > 0 && (
                      <div className="space-y-2.5 mb-5">
                        {featuresList.map((f, fi) => (
                          <div key={fi} className="flex items-center gap-3 text-sm">
                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 text-emerald-500" />
                            </div>
                            <span className="text-zinc-300">{f}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Included bot */}
                    {bot && (
                      <div className="bg-gradient-to-r from-emerald-500/5 to-green-500/5 border border-emerald-500/20 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <Bot className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{p.included_bot}</h4>
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-bold">Incluso</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                              {p.bot_free_months ? `${p.bot_free_months} meses gratis` : 'Acesso imediato'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={`mt-5 w-full py-3 rounded-2xl font-bold text-sm text-center transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                        : 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                    }`}>
                      {isSelected ? 'Selecionado' : 'Escolher Plano'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Standalone Products Section (Sites, Web Apps, E-commerce, Bots) */}
        {standaloneProducts.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-5 px-1">Produtos & Serviços Avulsos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {standaloneProducts.map((p) => {
                const isSelected = selected === p.name;
                const Icon = ICONS[p.name] || Package;
                const colors = COLORS[p.name] || 'from-indigo-500 to-purple-600';
                const featuresList = parseFeatures(p.features);

                return (
                  <button
                    key={p.name}
                    onClick={() => handleSelect(p.name)}
                    className={`relative text-left rounded-3xl border-2 p-6 transition-all duration-300 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/[0.04] shadow-2xl shadow-indigo-500/20 scale-[1.02]'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] hover:scale-[1.01]'
                    }`}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors} flex items-center justify-center shrink-0 shadow-lg ${isSelected ? 'scale-110' : ''} transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white leading-snug">{p.name}</h3>
                        {p.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{p.description}</p>}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-zinc-600'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <div className="text-2xl font-extrabold text-white">
                        R$ {formatPrice(p.price)}
                      </div>
                      <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Pagamento Único</span>
                    </div>

                    {/* Features */}
                    {featuresList.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {featuresList.map((f, fi) => (
                          <div key={fi} className="flex items-center gap-2.5 text-xs">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-zinc-300">{f}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={`mt-4 w-full py-2.5 rounded-xl font-bold text-xs text-center transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                        : 'bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white'
                    }`}>
                      {isSelected ? 'Selecionado' : 'Comprar Agora'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Form + Order Summary (shows when a plan is selected) */}
        {selected && (
          <div ref={formRef} className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-400" />
                Finalizar Pedido
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Seus Dados</h3>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Nome Completo</label>
                    <input type="text" required placeholder="Seu nome"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">WhatsApp</label>
                    <input type="tel" required placeholder="(11) 99999-9999"
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">Email <span className="text-zinc-700">(opcional)</span></label>
                    <input type="email" placeholder="email@exemplo.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all" />
                  </div>

                  {/* Se for serviço com agendamento: Seletor de Data PT-BR + Grade de Horários 24h */}
                  {selected && products.find(p => p.name === selected)?.delivery_type === 'service' && (
                    <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                        <Clock className="w-4 h-4 text-indigo-400" />
                        Reunião de Alinhamento & Briefing do Site (Horário Brasília)
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Escolha a data e o horário em que faremos a nossa reunião para ouvir suas ideias, demandas e requisitos do seu site:
                      </p>

                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                          1. Escolha o dia da reunião:
                        </label>
                        <input
                          type="date"
                          required
                          value={selectedDate}
                          onChange={e => setSelectedDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all [color-scheme:dark]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          2. Escolha o horário comercial disponível (24h):
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {TIME_SLOTS.map(t => {
                            const available = isSlotAvailable(t);
                            const isSelected = selectedTime === t && available;
                            return (
                              <button
                                type="button"
                                key={t}
                                disabled={!available}
                                onClick={() => available && setSelectedTime(t)}
                                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                                  !available
                                    ? 'bg-zinc-950/40 text-zinc-600 border-zinc-900/60 line-through opacity-40 cursor-not-allowed'
                                    : isSelected
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-indigo-500 shadow-md shadow-indigo-500/25 scale-105'
                                    : 'bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:border-indigo-500/40 hover:text-white'
                                }`}
                              >
                                {t} {available ? 'hs' : '(Indisponível)'}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {selectedDate && (
                        <div className="p-3 rounded-xl bg-zinc-950/60 border border-indigo-500/20 text-xs text-indigo-200 flex items-center justify-between">
                          <span className="text-[11px]">
                            📅 <span className="font-bold text-white">{selectedDate.split('-').reverse().join('/')}</span> às <span className="font-bold text-white">{selectedTime} hs</span>
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Horário Selecionado</span>
                        </div>
                      )}

                      <p className="text-[10px] text-zinc-400 flex items-center gap-1.5 pt-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        Após o pagamento, o seu horário será reservado automaticamente na nossa agenda!
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Pagamento via</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['PIX', 'BOLETO', 'CREDIT_CARD'] as const).map(bt => (
                        <button type="button" key={bt}
                          onClick={() => setForm(f => ({ ...f, billingType: bt }))}
                          className={`py-3 px-3 rounded-xl text-xs font-bold border transition-all ${
                            form.billingType === bt
                              ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/25'
                              : 'bg-white/5 text-zinc-400 border-white/10 hover:border-indigo-500/30'
                          }`}>
                          {bt === 'PIX' ? 'Pix' : bt === 'BOLETO' ? 'Boleto' : 'Cartao'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Resumo</h3>
                  <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-4 space-y-2">
                    {cart.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
                        <span className="text-zinc-400">{item.name}</span>
                        <span className="text-white font-semibold">
                          {item.type === 'subscription' ? `R$ ${item.monthly.toFixed(2)}/mes` : `R$ ${item.price.toFixed(2)}`}
                        </span>
                      </div>
                    ))}

                    <div className="pt-3 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm font-bold text-zinc-300">Total</span>
                        <span className="text-lg font-extrabold text-white">R$ {firstMonthTotal.toFixed(2)}</span>
                      </div>
                      {hasSubscription && (
                        <p className="text-[10px] text-zinc-600 text-right">+ R$ {totalMonthly.toFixed(2)}/mes recorrente</p>
                      )}
                    </div>
                  </div>

                  {/* Included bonus summary */}
                  {(() => {
                    const prod = products.find(p => p.name === selected);
                    if (prod?.included_bot && getBot(prod.included_bot)) {
                      const bot = getBot(prod.included_bot)!;
                      return (
                        <div className="bg-emerald-500/[0.03] border border-emerald-500/20 rounded-2xl p-3">
                          <div className="flex items-center gap-2 text-xs">
                            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-emerald-400">
                              <span className="font-bold">{prod.included_bot}</span> incluso
                              {prod.bot_free_months ? ` — ${prod.bot_free_months} meses gratis` : ''}
                              {hasValue(bot.price) ? ` (Economia de R$ ${formatPrice(bot.price)}/mes)` : ''}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Legal Checkbox */}
              <div className="mt-6 flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-950 accent-indigo-500"
                />
                <label htmlFor="terms" className="cursor-pointer leading-relaxed select-none text-[11px]">
                  Li e concordo com o <button type="button" onClick={() => setShowTermsModal(true)} className="text-purple-400 font-bold underline hover:text-purple-300">Contrato de Prestação de Serviços, Garantia Incondicional de 7 Dias e Termos de Uso</button>.
                </label>
              </div>

              {error && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button onClick={handleSubmit} disabled={submitting || !termsAccepted}
                className="mt-6 w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl px-6 py-4 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/25 text-base">
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Shield className="w-5 h-5" />
                )}
                {submitting ? 'Gerando pagamento...' : `Pagar R$ ${firstMonthTotal.toFixed(2)}`}
              </button>

              <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-zinc-600">
                <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-500/60" /> Garantia de 7 Dias</span>
                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-indigo-500/60" /> Entrega Garantida</span>
                <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3 text-purple-500/60" /> {hasSubscription ? 'Assinatura mensal' : 'Compra única'}</span>
              </div>
            </div>

            {/* Referral */}
            {ref && (
              <p className="text-center text-[10px] text-zinc-600 mt-4">
                <Star className="w-3 h-3 text-indigo-400 inline mr-1" />
                Indicado por <span className="font-bold text-indigo-400">{ref}</span>
              </p>
            )}
          </div>
        )}
      </main>

      {/* Modal Legal de Contrato e Termos de Serviço */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Contrato de Adesão & Termos de Uso</h3>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs text-zinc-300 leading-relaxed">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 text-purple-300 flex items-start gap-3">
                <Shield className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-white mb-1">Garantia Incondicional de 7 Dias (CDC Art. 49)</h4>
                  <p className="text-[11px]">Você tem 7 dias corridos após a contratação para testar a ferramenta. Se não ficar 100% satisfeito, garantimos o reembolso integral de 100% do seu dinheiro sem burocracia.</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-white mb-1">1. Objeto do Contrato</h4>
                <p>1.1. O presente contrato regula a prestação de serviços de desenvolvimento de software, websites, plataformas de e-commerce e automação de atendimento via WhatsApp e Inteligência Artificial prestados pela contratada ao cliente.</p>
                <p>1.2. Nos planos que contemplam hospedagem e manutenção contínua de website/landing page, a permanência do site online e ativo nos servidores está estritamente condicionada ao pagamento em dia da mensalidade correspondente.</p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-white mb-1">2. Garantia de Entrega e Suporte</h4>
                <p>A contratada garante a entrega e liberação das licenças do software/website dentro dos prazos acordados no catálogo oficial. Caso ocorra descumprimento injustificado na entrega, o cliente terá direito à devolução total do valor pago.</p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-white mb-1">3. Assinatura, Hospedagem e Suspensão por Inadimplência</h4>
                <p>3.1. Para produtos sob modelo de assinatura mensal, a renovação é automática a cada 30 dias na forma de pagamento selecionada.</p>
                <p>3.2. Em caso de não pagamento ou atraso da mensalidade (status em aberto/vencido no Asaas), os serviços de hospedagem do site e automação de Inteligência Artificial serão **suspensos temporariamente**, exibindo página de manutenção até a regularização do Pix/Boleto.</p>
                <p>3.3. Para cobrir os custos operacionais de implantação, infraestrutura e configuração inicial do sistema, vigora um período de adaptação e permanência inicial de 3 (três) meses.</p>
                <p>3.4. Em caso de solicitação de cancelamento dentro dos 3 (três) primeiros meses, incidirá uma taxa administrativa de rescisão proporcional de 15% sobre o valor restante das faturas desse período inicial.</p>
                <p className="font-semibold text-purple-300">3.5. Transcorrido o período inicial dos 3 (três) primeiros meses, o CONTRATANTE fica 100% ISENTO de qualquer taxa ou multa, podendo cancelar a assinatura a qualquer tempo sem qualquer custo adicional.</p>
              </div>

              <div>
                <h4 className="font-bold text-sm text-white mb-1">4. Proteção de Dados e Privacidade (LGPD)</h4>
                <p>Em estrita conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), todos os dados do cliente e histórico de conversas são armazenados sob criptografia de ponta a ponta e nunca serão compartilhados com terceiros sem autorização.</p>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end">
              <button
                onClick={() => { setTermsAccepted(true); setShowTermsModal(false); }}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all"
              >
                Li e Concordo com o Contrato
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}