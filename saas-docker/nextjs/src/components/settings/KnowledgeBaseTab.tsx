"use client";

import { useState, useEffect } from "react";

interface Document {
  id: string;
  title: string;
  mime_type: string;
  status: string;
  created_at: string;
}

export function KnowledgeBaseTab() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/knowledge/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    const isImage = file.type.startsWith("image/");
    if (file.type !== "application/pdf" && file.type !== "text/plain" && !isImage) {
      setError("Formato não suportado. Envie PDF, TXT ou Imagens.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no upload");

      setSuccess(`Documento "${file.name}" processado e indexado com sucesso! 🎉`);
      fetchDocuments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();

    // Listener para detectar Ctrl+V (colar) de imagem
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            uploadFile(file);
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = ""; // limpa o input
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;
    try {
      await fetch(`/api/knowledge/documents?id=${id}`, { method: "DELETE" });
      fetchDocuments();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-xl font-bold text-white mb-2">Base de Conhecimento (RAG)</h2>
        <p className="text-sm text-zinc-400">
          Envie PDFs com manuais, tabelas de preços ou regras do seu negócio. A Inteligência Artificial da sua empresa irá ler e absorver este conhecimento para responder os clientes.
        </p>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-3 rounded-xl text-sm">
          {success}
        </div>
      )}

      {/* Área de Upload */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <label className={`cursor-pointer flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-colors ${uploading ? 'border-purple-500/50 bg-purple-500/5' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}`}>
          <input 
            type="file" 
            accept=".pdf,.txt,image/*" 
            className="hidden" 
            onChange={handleFileUpload}
            disabled={uploading}
          />
          {uploading ? (
             <div className="flex flex-col items-center gap-3">
               <svg className="animate-spin h-8 w-8 text-purple-500" viewBox="0 0 24 24" fill="none">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
               </svg>
               <span className="text-sm text-purple-400 font-medium">Lendo, transcrevendo e indexando IA...</span>
             </div>
          ) : (
             <div className="flex flex-col items-center gap-2">
                 <span className="text-4xl">📄</span>
                 <span className="text-sm font-medium text-white">Clique, arraste ou cole (Ctrl+V) PDF/TXT/Imagem</span>
                 <span className="text-xs text-zinc-500">O robô lerá imagens usando visão computacional e aprenderá tudo</span>
             </div>
          )}
        </label>
      </section>

      {/* Lista de Documentos */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">Documentos Aprendidos</h3>
        {loading ? (
           <div className="h-20 bg-white/5 animate-pulse rounded-xl" />
        ) : documents.length === 0 ? (
           <div className="text-center p-6 bg-white/5 border border-white/10 rounded-xl text-zinc-500 text-sm">
             Nenhum documento na base ainda.
           </div>
        ) : (
          <div className="grid gap-3">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-black/30 flex items-center justify-center text-lg">
                    {doc.mime_type.startsWith('image/') ? '🖼️' : doc.mime_type === 'application/pdf' ? '📕' : '📝'}
                  </div>
                  <div>
                    <h4 className="font-medium text-white text-sm">{doc.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-zinc-500">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                        doc.status === 'indexed' ? 'bg-emerald-500/20 text-emerald-400' : 
                        doc.status === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Excluir"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
