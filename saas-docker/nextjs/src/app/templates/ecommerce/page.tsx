"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, ShoppingBag, Menu, X, Heart, Star, ChevronRight } from "lucide-react";

const PRODUCTS = [
  { id: 1, name: "Smartwatch Elite X", price: 899.90, img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800", rating: 5 },
  { id: 2, name: "Headphone Noise Cancel", price: 1249.00, img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800", rating: 4.8 },
  { id: 3, name: "Óculos de Sol Vintage", price: 299.90, img: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&q=80&w=800", rating: 4.5 },
  { id: 4, name: "Câmera Retro 35mm", price: 549.50, img: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=800", rating: 4.9 },
  { id: 5, name: "Tênis Runner Pro", price: 699.90, img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800", rating: 4.7 },
  { id: 6, name: "Mochila Urban Tech", price: 349.90, img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=800", rating: 4.6 },
];

export default function EcommerceDemo() {
  const [cartCount, setCartCount] = useState(0);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-orange-500/30">
      {/* Promo Bar */}
      <div className="bg-zinc-900 text-white text-center py-2 text-xs font-semibold uppercase tracking-widest">
        Frete Grátis para todo o Brasil nas compras acima de R$ 500
      </div>

      {/* Navbar */}
      <nav className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden"><Menu className="w-6 h-6" /></button>
            <span className="font-black text-2xl tracking-tighter uppercase">NexusStore.</span>
          </div>
          
          <div className="hidden lg:flex items-center gap-8 font-semibold text-sm text-zinc-600">
            <a href="#" className="text-orange-500">Novidades</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Masculino</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Feminino</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Acessórios</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Sale</a>
          </div>

          <div className="flex items-center gap-5">
            <button className="text-zinc-600 hover:text-zinc-900 transition-colors"><Search className="w-5 h-5" /></button>
            <button className="text-zinc-600 hover:text-zinc-900 transition-colors hidden sm:block"><Heart className="w-5 h-5" /></button>
            <button className="relative text-zinc-600 hover:text-zinc-900 transition-colors">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pop-in">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative h-[60vh] min-h-[500px] bg-zinc-900 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000" alt="Hero Banner" className="w-full h-full object-cover opacity-50" />
        </div>
        <div className="relative z-10 text-center px-6">
          <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-4">Coleção<br />Outono 24</h1>
          <p className="text-lg text-zinc-300 mb-8 max-w-lg mx-auto">Explore as novidades que acabaram de chegar. Estilo, conforto e tecnologia em cada detalhe.</p>
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-transform hover:scale-105 shadow-xl shadow-orange-500/20">
            Comprar Agora
          </button>
        </div>
      </div>

      {/* Product Grid */}
      <main className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-black uppercase tracking-tight">Destaques da Semana</h2>
          <a href="#" className="hidden sm:flex items-center gap-1 text-sm font-bold text-orange-500 hover:text-orange-600">
            Ver Todos <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {PRODUCTS.map(p => (
            <div key={p.id} className="group cursor-pointer flex flex-col">
              <div className="relative aspect-[4/5] bg-zinc-100 rounded-3xl overflow-hidden mb-4">
                <img src={p.img} alt={p.name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-700" />
                <button 
                  onClick={() => setCartCount(c => c + 1)}
                  className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md text-zinc-900 font-bold py-3 rounded-2xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:bg-zinc-900 hover:text-white"
                >
                  Adicionar ao Carrinho
                </button>
                <button className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors shadow-sm">
                  <Heart className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-1 text-orange-500 mb-2">
                <Star className="w-4 h-4 fill-current" />
                <span className="text-xs font-bold text-zinc-500">{p.rating}</span>
              </div>
              <h3 className="font-bold text-lg mb-1 group-hover:text-orange-500 transition-colors">{p.name}</h3>
              <p className="text-zinc-500 font-medium">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer Return */}
      <Link href="/" className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-zinc-900 text-white rounded-full text-sm font-bold shadow-2xl hover:scale-105 transition-transform flex items-center gap-2">
        <ChevronRight className="w-4 h-4 rotate-180" /> Voltar ao Nexus
      </Link>
    </div>
  );
}
