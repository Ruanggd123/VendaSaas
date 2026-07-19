"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type InstanceStatus = "connecting" | "open" | "disconnected";

interface WhatsappInstance {
  id: string;
  name: string;
  connectionName: string;
  status: InstanceStatus;
  phone_number: string | null;
  profilePic?: string | null;
}

// Dashboard layout removido daqui, centralizado no (protected)/layout.tsx

export default function NativeWhatsAppDashboard() {

  const [instances, setInstances] = useState<WhatsappInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // QR Code states for active connection attempt
  const [activeInstanceName, setActiveInstanceName] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(40);

  const fetchInstances = async () => {
    try {
      const res = await fetch(`/api/whatsapp/instances?t=${new Date().getTime()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await res.json();
      
      if (res.ok && data.instances) {
        setInstances(data.instances);
        
        // Se houver uma instância conectando e não tivermos o activeInstanceName setado,
        // (por exemplo, ao carregar a tela), pegamos ela para voltar a exibir o QR
        if (!activeInstanceName) {
          const connectingInstance = data.instances.find((i: WhatsappInstance) => i.status === "connecting");
          if (connectingInstance && !qrCode) {
            handleConnect(connectingInstance.name);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();

    // Polling a cada 5 segundos para verificar o status geral
    const interval = setInterval(() => {
      fetchInstances();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeInstanceName]);

  // Efeito do Timer do QR Code
  useEffect(() => {
    if (!activeInstanceName || !qrCode) return;

    if (countdown <= 0) {
      // O código expirou. Vamos forçar a exclusão e recriação para gerar um novo!
      handleConnect(activeInstanceName);
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [activeInstanceName, qrCode, countdown]);


  // Lida tanto com a criação de uma NOVA instância, quanto REFRESH de uma existente
  const handleConnect = async (existingInstanceName?: string) => {
    if (!existingInstanceName && !newConnectionName.trim()) {
      alert("Por favor, dê um nome para a conexão.");
      return;
    }

    setIsProcessing(true);
    setQrCode(null);
    setCountdown(40);

    try {
      const res = await fetch("/api/whatsapp/connect", { 
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          connectionName: newConnectionName,
          instanceName: existingInstanceName
        })
      });
      const data = await res.json();

      if (res.ok) {
        setActiveInstanceName(data.instanceName);
        if (data.qrcode) {
          setQrCode(data.qrcode);
        }
        if (!existingInstanceName) {
          setIsModalOpen(false);
          setNewConnectionName("");
          fetchInstances();
        }
      } else {
        alert("Erro ao conectar: " + data.error);
        setActiveInstanceName(null);
      }
    } catch (err) {
      console.error(err);
      alert("Erro interno.");
      setActiveInstanceName(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisconnect = async (instanceName: string) => {
    if (!confirm("Tem certeza que deseja excluir este WhatsApp? Você perderá a conexão.")) return;
    
    // Mostra um estado de loading na instância específica
    setInstances(prev => prev.map(i => i.name === instanceName ? { ...i, status: "disconnected" } : i));

    try {
      const res = await fetch("/api/whatsapp/disconnect", { 
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName })
      });
      
      if (res.ok) {
        if (activeInstanceName === instanceName) {
          setActiveInstanceName(null);
          setQrCode(null);
        }
        fetchInstances();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const closeQrScreen = () => {
    setActiveInstanceName(null);
    setQrCode(null);
    fetchInstances();
  };

  // Se houver uma instância tentando conectar, mostramos a tela de QR
  const connectingInstance = instances.find(i => i.name === activeInstanceName);
  if (activeInstanceName && connectingInstance?.status === "connecting") {
    return (
      <div className="flex min-h-screen w-full flex-col bg-slate-50 dark:bg-zinc-950 px-6 py-10 md:px-12 text-slate-900 dark:text-zinc-100 items-center justify-center">
        <div className="relative mt-8 flex w-full max-w-xl flex-col items-center gap-8 rounded-3xl border border-slate-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/40 p-10 shadow-2xl backdrop-blur-xl text-center">
          
          <button onClick={closeQrScreen} className="absolute left-6 top-6 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Conectar: {connectingInstance.connectionName}</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400">Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e aponte a câmera.</p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-xl">
            {qrCode ? (
              <img src={qrCode} alt="QR Code WhatsApp" className="h-64 w-64 object-contain" />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center bg-zinc-100 flex-col gap-4">
                <svg className="h-8 w-8 animate-spin text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-zinc-500 font-medium">{isProcessing ? "Gerando código seguro..." : "Carregando..."}</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <div className="flex w-full items-center gap-3 rounded-lg bg-slate-100 dark:bg-zinc-800/50 px-4 py-2.5 text-sm text-slate-700 dark:text-zinc-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Expira em <span className="font-bold text-white">{countdown}s</span></span>
              
              <div className="ml-auto h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-700">
                <div 
                  className="h-full bg-amber-500 transition-all duration-1000 ease-linear" 
                  style={{ width: `${(countdown / 40) * 100}%` }}
                />
              </div>
            </div>

            <button 
              onClick={() => handleConnect(activeInstanceName)}
              disabled={isProcessing}
              className="mt-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {isProcessing ? "Recarregando..." : "Recarregar código manualmente"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex w-full flex-col px-6 py-10 md:px-12 text-slate-900 dark:text-zinc-100">
        <div className="mx-auto w-full max-w-6xl space-y-8">
          
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Aparelhos WhatsApp</h1>
                <p className="text-slate-500 dark:text-zinc-400">Gerencie múltiplas conexões de atendimento simultâneas.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-[0.98]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Nova Conexão
              </button>
            </header>

          <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {isLoading ? (
              // Skeletons
              [...Array(3)].map((_, i) => (
                <div key={i} className="h-48 rounded-3xl border border-slate-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/40 p-6 animate-pulse"></div>
              ))
            ) : instances.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 dark:border-zinc-700 p-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800/50 text-slate-400 dark:text-zinc-500 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">Nenhum aparelho conectado</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Adicione seu primeiro número para começar a atender.</p>
              </div>
            ) : (
              instances.map((instance) => (
                <div key={instance.id} className="relative flex flex-col rounded-3xl border border-slate-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/40 p-6 shadow-xl backdrop-blur-xl transition-all hover:border-slate-300 dark:hover:border-zinc-700/50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden ring-2 ring-slate-200 dark:ring-zinc-800/50 flex items-center justify-center">
                        {instance.profilePic ? (
                          <img src={instance.profilePic} alt="Perfil" className="h-full w-full object-cover" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-zinc-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-slate-900 dark:text-white">{instance.connectionName}</h3>
                        <p className="text-sm text-slate-500 dark:text-zinc-400">{instance.phone_number ? `+${instance.phone_number}` : 'Aguardando...'}</p>
                      </div>
                    </div>
                    
                    {instance.status === 'open' && (
                      <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        Online
                      </span>
                    )}
                    {instance.status === 'connecting' && (
                      <span className="flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Lendo QR
                      </span>
                    )}
                    {instance.status === 'disconnected' && (
                      <span className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                        Desconectado
                      </span>
                    )}
                  </div>

                  <div className="mt-6 border-t border-slate-200 dark:border-zinc-800/50 pt-4 flex items-center justify-between">
                    {instance.status === 'connecting' ? (
                      <button 
                        onClick={() => handleConnect(instance.name)}
                        className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                      >
                        Ler QR Code
                      </button>
                    ) : instance.status === 'disconnected' ? (
                      <button 
                        onClick={() => handleConnect(instance.name)}
                        className="text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors"
                      >
                        Reconectar
                      </button>
                    ) : (
                      <div className="text-sm text-zinc-500">
                        Ativo e Operante
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleDisconnect(instance.name)}
                        className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </main>
        </div>

        {/* Modal Nova Conexão */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-zinc-800/50 bg-zinc-900 p-8 shadow-2xl">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Adicionar Aparelho</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nome da Conexão</label>
                  <input 
                    type="text" 
                    value={newConnectionName}
                    onChange={(e) => setNewConnectionName(e.target.value)}
                    placeholder="Ex: Atendimento Matriz"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    autoFocus
                  />
                </div>

                <button 
                  onClick={() => handleConnect()}
                  disabled={!newConnectionName.trim() || isProcessing}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white shadow-lg transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50"
                >
                  {isProcessing ? "Preparando..." : "Avançar para QR Code"}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
    </>
  );
}
