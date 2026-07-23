"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Scissors,
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  Star,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Award,
  Coffee,
  Check,
  User,
  X,
  Sun,
  Sunset,
  Moon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(24px)",
        transition: `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

interface ServiceItem {
  id: string;
  name: string;
  desc: string;
  time: string;
  price: number;
  popular?: boolean;
}

export default function OnePageBarberLandingPageDemo() {
  const [selectedServices, setSelectedServices] = useState<string[]>(["corte_barba"]);
  const [selectedDate, setSelectedDate] = useState("23/07 (Hoje)");
  const [customDate, setCustomDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("16:00");
  const [selectedBarber, setSelectedBarber] = useState("Qualquer Barbeiro Livre");

  const servicesList: ServiceItem[] = [
    {
      id: "corte_barba",
      name: "Combo Imperial (Corte + Barba Terapia)",
      desc: "Nosso serviço mais pedido. Corte completo à sua escolha + barba alinhada com toalha quente e massagem.",
      time: "50 min",
      price: 89,
      popular: true,
    },
    {
      id: "corte_cabelo",
      name: "Corte Masculino (Fade / Tesoura / Degradê)",
      desc: "Lavagem especial com shampoo mentolado, corte de precisão e finalização com pomada modeladora.",
      time: "35 min",
      price: 55,
    },
    {
      id: "barba_terapia",
      name: "Barba Terapia com Toalha Quente",
      desc: "Modelagem de barba com navalhete, óleo de hidratação, bálsamo pós-barba e compressa morna.",
      time: "30 min",
      price: 45,
    },
    {
      id: "pigmentacao",
      name: "Pigmentação / Alinhamento de Fios",
      desc: "Preenchimento de falhas na barba ou cabelo com tinta especial hipoalergênica de aspecto natural.",
      time: "25 min",
      price: 40,
    },
  ];

  const dateOptions = [
    { label: "Hoje", date: "Qua, 23/07" },
    { label: "Amanhã", date: "Qui, 24/07" },
    { label: "Sexta", date: "Sex, 25/07" },
    { label: "Sábado", date: "Sáb, 26/07" },
    { label: "Segunda", date: "Seg, 28/07" },
  ];

  const timeSlots = {
    manha: ["09:00", "10:00", "11:00"],
    tarde: ["13:30", "14:30", "16:00", "17:30"],
    noite: ["18:30", "19:00", "19:30"],
  };

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((s) => s !== id) : prev) : [...prev, id]
    );
  };

  const calculateTotal = () => {
    return selectedServices.reduce((acc, id) => {
      const item = servicesList.find((s) => s.id === id);
      return acc + (item ? item.price : 0);
    }, 0);
  };

  const getSelectedNames = () => {
    return selectedServices
      .map((id) => servicesList.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join(" + ");
  };

  const finalDateDisplay = customDate
    ? new Date(customDate + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
    : selectedDate;

  const handleBookingWhatsApp = () => {
    const total = calculateTotal();
    const services = getSelectedNames();
    const text = encodeURIComponent(
      `Olá! Vim pelo site e gostaria de agendar:\n\n✂️ *Serviço:* ${services}\n📅 *Data:* ${finalDateDisplay}\n⏰ *Horário:* ${selectedTime}\n💈 *Profissional:* ${selectedBarber}\n💰 *Valor total:* R$ ${total},00\n\nPoderia me confirmar se este horário está disponível?`
    );
    window.open(`https://wa.me/5588981885499?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-stone-900 font-sans selection:bg-amber-100 overflow-x-hidden relative">
      {/* Top Demo Banner */}
      <div className="bg-stone-900 text-stone-200 text-xs font-bold py-2.5 px-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-white font-extrabold">Modelo de Site de Página Única (One-Page)</span>
            <span className="hidden sm:inline text-stone-400 font-normal">| Exemplo: Barbearia &amp; Salão de Serviços</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/"
              className="px-3.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-full text-[11px] font-black transition-all flex items-center gap-1 shrink-0 shadow-sm"
            >
              <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Voltar ao Painel Nexus
            </Link>
          </div>
        </div>
      </div>

      {/* Main Header / Nav */}
      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur-md sticky top-9 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-600/20">
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <span className="font-black text-2xl tracking-tight text-stone-900">ROYAL BARBER</span>
              <span className="text-[9px] block text-amber-700 font-mono tracking-widest uppercase font-bold">
                Club &amp; Grooming
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-bold text-stone-600">
            <a href="#servicos" className="hover:text-amber-600 transition-colors">Serviços &amp; Preços</a>
            <a href="#experiencia" className="hover:text-amber-600 transition-colors">A Barbearia</a>
            <a href="#depoimentos" className="hover:text-amber-600 transition-colors">Avaliações</a>
            <a href="#localizacao" className="hover:text-amber-600 transition-colors">Endereço</a>
          </div>

          <a
            href="https://wa.me/5588981885499"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-black transition-all hover:scale-105 shadow-md flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-amber-400" /> Agendar no WhatsApp
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden bg-gradient-to-b from-stone-100/60 to-[#fcfbf9]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100/80 border border-amber-200 rounded-full text-amber-900 text-xs font-bold shadow-sm">
              <Star className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
              <span>A Barbearia #1 em Atendimento com Hora Marcada</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-stone-900 tracking-tight leading-[1.1]">
              Estilo impecável, café passado e <span className="text-amber-600">zero fila de espera.</span>
            </h1>

            <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
              Escolha seus serviços, selecione a data e horário desejados e confirme em 1 clique pelo WhatsApp. Atendimento com pontualidade britânica.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <a
                href="#agendamento"
                className="px-8 py-4.5 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl shadow-xl shadow-amber-600/25 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-3 text-base"
              >
                <Calendar className="w-5 h-5" /> Selecionar Dia e Horário
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="https://wa.me/5588981885499"
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-4.5 bg-white hover:bg-stone-50 border border-stone-300 rounded-2xl text-stone-800 font-bold transition-all shadow-sm flex items-center justify-center gap-2 text-base"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" /> Falar no WhatsApp
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4 text-xs font-bold text-stone-600 border-t border-stone-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-600" /> Atendimento sem Atrasos
              </div>
              <div className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-600" /> Bebida Cortesia da Casa
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" /> Estacione na Porta
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-stone-900 text-white">
              <img
                src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1000"
                alt="Barbearia Royal Barber"
                className="w-full h-[420px] object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent p-7 flex flex-col justify-end">
                <span className="px-3 py-1 bg-amber-600 text-white text-[10px] font-extrabold uppercase rounded-md w-max mb-2">
                  Ambiente Premium
                </span>
                <h3 className="text-xl font-black text-white">Experiência Completa de Grooming</h3>
                <p className="text-xs text-stone-300 font-medium mt-1">
                  Toalha quente com óleos essenciais, navalha afiada e corte de precisão feito por barbeiros mestres.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Booking & Services Section */}
      <section id="servicos" className="max-w-7xl mx-auto px-6 py-20 border-t border-stone-200">
        <Reveal className="text-center space-y-3 mb-12">
          <span className="inline-block px-4 py-1.5 bg-amber-100 text-amber-900 rounded-full text-xs font-mono font-bold uppercase tracking-widest">
            Menu de Serviços &amp; Agenda
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight">
            Monte seu Agendamento Personalizado
          </h2>
          <p className="text-sm text-stone-600 max-w-xl mx-auto font-medium">
            Selecione os serviços desejados na esquerda e escolha o dia e horário exatos no painel à direita.
          </p>
        </Reveal>

        <div id="agendamento" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Services Selector (Left) */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="text-sm font-black text-stone-900 uppercase tracking-wider flex items-center gap-2 mb-2">
              <Scissors className="w-4 h-4 text-amber-600" /> 1. Escolha os Serviços:
            </h3>

            {servicesList.map((service) => {
              const isSelected = selectedServices.includes(service.id);
              return (
                <div
                  key={service.id}
                  onClick={() => toggleService(service.id)}
                  className={`p-5 sm:p-6 rounded-3xl border-2 transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? "border-amber-600 bg-white shadow-xl shadow-amber-600/10 ring-1 ring-amber-600"
                      : "border-stone-200 bg-white hover:border-amber-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center mt-1 shrink-0 ${
                          isSelected ? "bg-amber-600 text-white" : "border-2 border-stone-300"
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-black text-stone-900">{service.name}</h4>
                          {service.popular && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-black uppercase rounded-md">
                              🔥 Mais Pedido
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 mt-1 leading-relaxed font-medium">{service.desc}</p>
                        <span className="inline-flex items-center gap-1 text-[11px] text-stone-400 font-mono mt-2 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> Duração: {service.time}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg sm:text-xl font-black text-stone-900">R$ {service.price}</span>
                      <span className="block text-[10px] text-stone-400 font-bold uppercase">valor fixo</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Booking Summary Box (Right Panel) */}
          <div className="lg:col-span-6 sticky top-28">
            <div className="p-6 sm:p-8 rounded-[2.5rem] bg-stone-900 text-white shadow-2xl space-y-6 border border-stone-800">
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold block">
                    Agenda em Tempo Real
                  </span>
                  <h3 className="text-xl font-black text-white">Escolha a Data &amp; Horário Exatos</h3>
                </div>
                <div className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-bold">
                  ✓ Livre
                </div>
              </div>

              {/* 1. Date Selector (Pills + Date Input) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-500" /> 2. Selecione a Data:
                  </label>
                  <span className="text-[11px] text-amber-400 font-mono font-bold">{finalDateDisplay}</span>
                </div>

                {/* Date Pills Slider */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {dateOptions.map((item) => {
                    const isActive = !customDate && selectedDate === item.date;
                    return (
                      <button
                        key={item.date}
                        onClick={() => {
                          setCustomDate("");
                          setSelectedDate(item.date);
                        }}
                        className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 border transition-all duration-200 flex flex-col items-center min-w-[75px] ${
                          isActive
                            ? "bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-600/30"
                            : "bg-stone-800/80 border-stone-700 text-stone-300 hover:bg-stone-700 hover:text-white"
                        }`}
                      >
                        <span className="text-[10px] opacity-80 uppercase">{item.label}</span>
                        <span className="font-mono text-xs">{item.date.split(", ")[1]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Date Input Option */}
                <div className="pt-1 flex items-center gap-2">
                  <span className="text-[11px] text-stone-400 font-medium">Ou escolha outra data exata:</span>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                    }}
                    className="bg-stone-950 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                  />
                  {customDate && (
                    <button
                      onClick={() => setCustomDate("")}
                      className="text-stone-400 hover:text-white text-xs underline font-medium"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Barber Selector */}
              <div className="space-y-2 pt-1 border-t border-stone-800/60">
                <label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-amber-500" /> 3. Profissional de Preferência:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    "Qualquer Barbeiro Livre",
                    "Carlos (Mestre Fade)",
                    "Henrique (Barba & Visagismo)",
                  ].map((barber) => (
                    <button
                      key={barber}
                      onClick={() => setSelectedBarber(barber)}
                      className={`p-2.5 rounded-xl text-[11px] font-bold border transition-all text-left truncate ${
                        selectedBarber === barber
                          ? "bg-amber-600/30 border-amber-500 text-amber-300"
                          : "bg-stone-800/60 border-stone-700 text-stone-400 hover:text-white"
                      }`}
                    >
                      ✓ {barber.split(" (")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Time Slot Selector (Grouped by Period) */}
              <div className="space-y-3 pt-1 border-t border-stone-800/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-500" /> 4. Horários Disponíveis:
                  </label>
                  <span className="text-[11px] text-amber-400 font-mono font-bold">Horário: {selectedTime}</span>
                </div>

                <div className="space-y-2.5">
                  {/* Manhã */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-400" /> MANHÃ
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {timeSlots.manha.map((t) => (
                        <button
                          key={t}
                          onClick={() => setSelectedTime(t)}
                          className={`py-1.5 px-3 rounded-xl text-xs font-mono font-bold border transition-all ${
                            selectedTime === t
                              ? "bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-600/30"
                              : "bg-stone-800/80 border-stone-700 text-stone-300 hover:bg-stone-700"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tarde */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
                      <Sunset className="w-3 h-3 text-orange-400" /> TARDE
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {timeSlots.tarde.map((t) => (
                        <button
                          key={t}
                          onClick={() => setSelectedTime(t)}
                          className={`py-1.5 px-3 rounded-xl text-xs font-mono font-bold border transition-all ${
                            selectedTime === t
                              ? "bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-600/30"
                              : "bg-stone-800/80 border-stone-700 text-stone-300 hover:bg-stone-700"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Noite */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-stone-400 flex items-center gap-1">
                      <Moon className="w-3 h-3 text-indigo-400" /> NOITE
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {timeSlots.noite.map((t) => (
                        <button
                          key={t}
                          onClick={() => setSelectedTime(t)}
                          className={`py-1.5 px-3 rounded-xl text-xs font-mono font-bold border transition-all ${
                            selectedTime === t
                              ? "bg-amber-600 border-amber-500 text-white shadow-md shadow-amber-600/30"
                              : "bg-stone-800/80 border-stone-700 text-stone-300 hover:bg-stone-700"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Calculation & Itemized List */}
              <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs text-stone-400">
                    <span>Itens Selecionados ({selectedServices.length}):</span>
                    <span className="text-amber-400 font-bold font-mono">{finalDateDisplay} às {selectedTime}</span>
                  </div>
                  <div className="text-[11px] text-stone-300 font-medium">
                    {getSelectedNames()}
                  </div>
                </div>

                <div className="flex justify-between items-baseline border-t border-stone-800/80 pt-2">
                  <span className="text-xs font-bold text-stone-300">Total Estimado:</span>
                  <span className="text-3xl font-black text-amber-400">R$ {calculateTotal()},00</span>
                </div>
              </div>

              <button
                onClick={handleBookingWhatsApp}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-2xl text-white font-black text-sm transition-all shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 group"
              >
                <MessageSquare className="w-5 h-5 fill-current" /> Confirmar e Enviar no WhatsApp
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <p className="text-[11px] text-stone-400 text-center font-medium">
                ✓ Sem cobrança antecipada. Pagamento realizado diretamente na barbearia!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Showcase */}
      <section id="experiencia" className="py-20 bg-stone-100 border-t border-stone-200">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center space-y-3 mb-14">
            <span className="inline-block px-4 py-1.5 bg-white border border-stone-200 text-stone-800 rounded-full text-xs font-mono font-bold uppercase tracking-widest">
              Diferenciais da Casa
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight">
              Mais que um corte, um momento de pausa
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Reveal delay={100} className="bg-white p-8 rounded-3xl shadow-md border border-stone-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-6">
                <Coffee className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-stone-900 mb-2">Bar &amp; Lounge Exclusivo</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                Chegue alguns minutos antes e aproveite nosso espaço com café expresso grátis, cerveja trincando e sinuca.
              </p>
            </Reveal>

            <Reveal delay={200} className="bg-white p-8 rounded-3xl shadow-md border border-stone-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-6">
                <Scissors className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-stone-900 mb-2">Barbeiros Especialistas</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                Equipe qualificada constantemente atualizada com as últimas tendências em degradê, tesoura e visagismo.
              </p>
            </Reveal>

            <Reveal delay={300} className="bg-white p-8 rounded-3xl shadow-md border border-stone-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-6">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-stone-900 mb-2">Produtos Premium</h3>
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                Utilizamos e vendemos as melhores pomadas, óleos e balms importados para manter seu cabelo e barba perfeitos.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="max-w-7xl mx-auto px-6 py-20 border-t border-stone-200">
        <Reveal className="text-center space-y-3 mb-14">
          <span className="inline-block px-4 py-1.5 bg-amber-100 text-amber-900 rounded-full text-xs font-mono font-bold uppercase tracking-widest">
            Clientes Frequentes
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-stone-900 tracking-tight">O que nossos clientes dizem</h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: "Marcelo Fonseca",
              text: "Atendimento sensacional! Cheguei no horário agendado, fui atendido imediatamente e o degradê ficou impecável.",
              stars: 5,
            },
            {
              name: "Gabriel Ramos",
              text: "A barba terapia com toalha quente é relaxante demais. Sem falar da cerveja gelada enquanto você aguarda!",
              stars: 5,
            },
            {
              name: "Felipe Nogueira",
              text: "Corto o cabelo aqui há mais de 2 anos. Praticidade incrível para agendar pelo WhatsApp em 10 segundos.",
              stars: 5,
            },
          ].map((t, idx) => (
            <Reveal key={idx} delay={idx * 150} className="p-8 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-4">
              <div className="flex gap-1 text-amber-500">
                {[...Array(t.stars)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">&ldquo;{t.text}&rdquo;</p>
              <div className="pt-3 border-t border-stone-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-black">
                  {t.name.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-stone-900">{t.name}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Location & Contact */}
      <section id="localizacao" className="bg-stone-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <span className="px-3 py-1 bg-amber-600 text-white text-[10px] font-black uppercase rounded-md">
              Onde Estamos
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Venha tomar um café conosco</h2>
            <p className="text-xs sm:text-sm text-stone-400 font-medium leading-relaxed">
              Estamos localizados no coração da cidade, com ambiente climatizado e fácil acesso.
            </p>

            <div className="space-y-4 text-xs font-medium text-stone-300">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-stone-800 flex items-center justify-center text-amber-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Endereço Principal</span>
                  <span>Av. Central, nº 1250 — Centro (Estac. Gratuito)</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-stone-800 flex items-center justify-center text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Horário de Atendimento</span>
                  <span>Segunda a Sábado: 09:00 às 20:00</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-stone-800 flex items-center justify-center text-amber-400">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Telefone / WhatsApp</span>
                  <span>(88) 98188-5499</span>
                </div>
              </div>
            </div>

            <a
              href="https://wa.me/5588981885499"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-2xl transition-all shadow-lg"
            >
              <MessageSquare className="w-4 h-4" /> Falar com Atendente
            </a>
          </div>

          <div className="lg:col-span-6 rounded-3xl overflow-hidden border border-stone-800 bg-stone-950 p-4 text-center space-y-4">
            <div className="aspect-[16/9] w-full rounded-2xl bg-stone-900 border border-stone-800 flex flex-col items-center justify-center p-6 space-y-2">
              <MapPin className="w-8 h-8 text-amber-500 animate-bounce" />
              <span className="font-bold text-sm text-white">Royal Barber Club</span>
              <span className="text-xs text-stone-400 font-mono">Av. Central, 1250 — Centro</span>
              <span className="text-[10px] text-emerald-400 font-bold pt-2">✓ Mapa Interativo Sincronizado</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-stone-100 py-8 text-center text-xs text-stone-500 font-medium">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>&copy; {new Date().getFullYear()} Royal Barber Club. Todos os direitos reservados.</span>
          <Link href="/" className="text-amber-700 font-bold hover:underline">
            ← Voltar para a Nexus AI SaaS
          </Link>
        </div>
      </footer>

      {/* Floating WhatsApp Action Pill */}
      <a
        href="https://wa.me/5588981885499"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-full text-xs font-black shadow-2xl hover:scale-105 transition-all flex items-center gap-2 border border-white/20"
      >
        <MessageSquare className="w-4 h-4 fill-current" /> Agendar no WhatsApp
      </a>
    </div>
  );
}
