"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Search, ShoppingBag, Menu, X, Heart, Star, ChevronRight, Minus, Plus, Trash2, CheckCircle2, QrCode } from "lucide-react";

type Category = 'Todos' | 'Masculino' | 'Feminino' | 'Acessórios' | 'Eletrônicos';

const PRODUCTS = [
  { id: 1, name: "Smartwatch Elite X", category: 'Eletrônicos', price: 899.90, img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800", rating: 5 },
  { id: 2, name: "Headphone Noise Cancel", category: 'Eletrônicos', price: 1249.00, img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800", rating: 4.8 },
  { id: 3, name: "Óculos de Sol Vintage", category: 'Acessórios', price: 299.90, img: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&q=80&w=800", rating: 4.5 },
  { id: 4, name: "Câmera Retro 35mm", category: 'Eletrônicos', price: 549.50, img: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=800", rating: 4.9 },
  { id: 5, name: "Tênis Runner Pro", category: 'Masculino', price: 699.90, img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800", rating: 4.7 },
  { id: 6, name: "Mochila Urban Tech", category: 'Acessórios', price: 349.90, img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=800", rating: 4.6 },
  { id: 7, name: "Jaqueta de Couro Clássica", category: 'Feminino', price: 599.00, img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800", rating: 4.9 },
  { id: 8, name: "Relógio Minimalista Prata", category: 'Acessórios', price: 450.00, img: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=800", rating: 4.7 },
];

type CartItem = { product: typeof PRODUCTS[0]; quantity: number };

export default function EcommerceDemo() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart'|'checkout'|'success'>('cart');
  const [cep, setCep] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>('Todos');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const cartTotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const filteredProducts = activeCategory === 'Todos' ? PRODUCTS : PRODUCTS.filter(p => p.category === activeCategory);

  const addToCart = (product: typeof PRODUCTS[0]) => {
    setCartItems(prev => {
      const exists = prev.find(item => item.product.id === product.id);
      if (exists) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    setCheckoutStep('cart');
    setIsCartOpen(true);
    
    // Show toast for visual feedback
    setToastMessage(`${product.name} adicionado ao carrinho!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const updateQuantity = (id: number, delta: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.product.id === id) {
        const newQ = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQ };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStep('success');
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-orange-500/30">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-zinc-900 text-white px-6 py-3 rounded-xl shadow-2xl font-semibold flex items-center gap-3 animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          {toastMessage}
        </div>
      )}

      {/* Promo Bar */}
      <div className="bg-zinc-900 text-white text-center py-2 text-xs font-semibold uppercase tracking-widest">
        Frete Grátis para todo o Brasil nas compras acima de R$ 500
      </div>

      {/* Navbar */}
      <nav className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="lg:hidden hover:bg-zinc-100 p-2 rounded-lg transition-colors"><Menu className="w-6 h-6" /></button>
            <span className="font-black text-2xl tracking-tighter uppercase cursor-pointer" onClick={() => setActiveCategory('Todos')}>NexusStore.</span>
          </div>
          
          <div className="hidden lg:flex items-center gap-8 font-semibold text-sm text-zinc-600">
            {(['Todos', 'Masculino', 'Feminino', 'Acessórios', 'Eletrônicos'] as Category[]).map(cat => (
              <button 
                key={cat}
                onClick={() => { setActiveCategory(cat); window.scrollTo({ top: 600, behavior: 'smooth' }); }}
                className={`transition-colors uppercase tracking-wide text-xs ${activeCategory === cat ? 'text-orange-500 font-bold border-b-2 border-orange-500 pb-1' : 'hover:text-zinc-900'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-5">
            <button className="text-zinc-600 hover:text-zinc-900 transition-colors hidden sm:block p-2 rounded-full hover:bg-zinc-100"><Search className="w-5 h-5" /></button>
            <button className="text-zinc-600 hover:text-zinc-900 transition-colors hidden sm:block p-2 rounded-full hover:bg-zinc-100"><Heart className="w-5 h-5" /></button>
            <button 
              onClick={() => { setCheckoutStep('cart'); setIsCartOpen(true); }}
              className="relative text-zinc-600 hover:text-zinc-900 transition-colors p-2 rounded-full hover:bg-zinc-100"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute 0 right-0 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pop-in">
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-widest mb-6">
            Lançamento Exclusivo
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-4">Coleção<br />Premium</h1>
          <p className="text-lg text-zinc-300 mb-8 max-w-lg mx-auto font-medium">Explore as novidades que acabaram de chegar. Estilo, conforto e tecnologia em cada detalhe.</p>
          <button 
            onClick={() => { setActiveCategory('Todos'); window.scrollTo({ top: 600, behavior: 'smooth' }); }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm transition-transform hover:scale-105 shadow-xl shadow-orange-500/20"
          >
            Ver Catálogo Completo
          </button>
        </div>
      </div>

      {/* Product Grid */}
      <main className="max-w-7xl mx-auto px-6 py-24 min-h-[60vh]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-4">
          <h2 className="text-3xl font-black uppercase tracking-tight">
            {activeCategory === 'Todos' ? 'Nossos Produtos' : activeCategory}
          </h2>
          <span className="text-sm font-bold text-zinc-500 bg-zinc-200 px-3 py-1 rounded-full">{filteredProducts.length} itens encontrados</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum produto encontrado nesta categoria.</p>
            <button onClick={() => setActiveCategory('Todos')} className="mt-4 text-orange-500 font-bold hover:underline">Ver todos os produtos</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
            {filteredProducts.map(p => (
              <div key={p.id} className="group cursor-pointer flex flex-col relative">
                <div className="relative aspect-[4/5] bg-zinc-100 rounded-3xl overflow-hidden mb-4">
                  <img src={p.img} alt={p.name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-700" />
                  
                  {/* Quick Add Button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); addToCart(p); }}
                    className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md text-zinc-900 font-bold py-3.5 rounded-2xl opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:bg-zinc-900 hover:text-white flex items-center justify-center gap-2 shadow-lg"
                  >
                    <ShoppingBag className="w-4 h-4" /> Comprar
                  </button>
                  
                  <button className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors shadow-sm">
                    <Heart className="w-5 h-5" />
                  </button>
                  
                  <div className="absolute top-4 left-4 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg">
                    {p.category}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-orange-500 mb-1.5">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-xs font-bold text-zinc-500">{p.rating}</span>
                </div>
                <h3 className="font-bold text-lg mb-1 group-hover:text-orange-500 transition-colors line-clamp-1">{p.name}</h3>
                <p className="text-zinc-500 font-medium text-lg">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Slide-over Cart & Checkout */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCartOpen(false)}
          ></div>

          {/* Drawer */}
          <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col animate-fade-in-right h-full">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 bg-white z-10 shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                {checkoutStep === 'cart' ? <><ShoppingBag className="w-5 h-5"/> Seu Carrinho</> : checkoutStep === 'checkout' ? 'Finalizar Compra' : 'Pedido Confirmado!'}
              </h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-zinc-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-zinc-50 custom-scrollbar">
              
              {checkoutStep === 'cart' && (
                <>
                  {cartItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
                      <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mb-2">
                        <ShoppingBag className="w-10 h-10 text-zinc-300" />
                      </div>
                      <p className="font-medium text-zinc-500">Seu carrinho está vazio.</p>
                      <button 
                        onClick={() => setIsCartOpen(false)}
                        className="text-orange-500 font-bold hover:underline"
                      >
                        Começar a comprar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cartItems.map((item) => (
                        <div key={item.product.id} className="flex gap-4 bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm relative group">
                          <img src={item.product.img} alt={item.product.name} className="w-24 h-24 object-cover rounded-xl border border-zinc-100" />
                          <div className="flex-1 flex flex-col justify-between py-1">
                            <div className="pr-6">
                              <h4 className="font-bold text-sm text-zinc-900 leading-tight">{item.product.name}</h4>
                              <p className="text-zinc-500 text-xs mt-1">{item.product.category}</p>
                              <p className="text-orange-500 text-sm font-black mt-1">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product.price)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-3 bg-zinc-100 rounded-lg p-1">
                                <button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 bg-white rounded-md flex items-center justify-center shadow-sm hover:text-orange-500 transition-colors">
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 bg-white rounded-md flex items-center justify-center shadow-sm hover:text-orange-500 transition-colors">
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => updateQuantity(item.product.id, -item.quantity)} 
                            className="absolute top-3 right-3 text-zinc-300 hover:text-red-500 p-1 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {checkoutStep === 'checkout' && (
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-6">
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
                    <h3 className="font-bold mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500"/> Dados de Entrega</h3>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Nome Completo</label>
                      <input required type="text" className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 mt-1 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-medium" placeholder="Ex: João da Silva" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">CEP</label>
                      <div className="flex gap-2 mt-1">
                        <input required value={cep} onChange={e => setCep(e.target.value)} type="text" maxLength={9} className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-medium tracking-widest" placeholder="00000-000" />
                        <button type="button" className="bg-zinc-900 text-white px-6 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-colors">Buscar</button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500"/> Pagamento</h3>
                    <label className="flex items-center justify-between p-4 border-2 border-orange-500 bg-orange-50/50 rounded-xl cursor-pointer shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-teal-500 shadow-sm">
                          <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                           <span className="font-bold block text-zinc-900">Pix</span>
                           <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full mt-0.5 inline-block">5% de Desconto</span>
                        </div>
                      </div>
                      <div className="w-6 h-6 rounded-full border-[5px] border-orange-500 bg-white"></div>
                    </label>
                  </div>
                </form>
              )}

              {checkoutStep === 'success' && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-2 animate-bounce">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black tracking-tight mb-2">Pedido #4092</h3>
                    <p className="text-zinc-500 font-medium max-w-[250px] mx-auto">Escaneie o QR Code abaixo para pagar via Pix e garantir seu pedido.</p>
                  </div>
                  
                  <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-xl inline-block relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-pink-500 rounded-3xl blur opacity-30"></div>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ExemploPixNexus" alt="QR Code Pix" className="w-48 h-48 relative z-10" />
                  </div>

                  <button 
                    onClick={() => { setIsCartOpen(false); setCartItems([]); setCheckoutStep('cart'); setActiveCategory('Todos'); }}
                    className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold mt-4 hover:bg-zinc-800 transition-colors"
                  >
                    Voltar para a Loja
                  </button>
                </div>
              )}

            </div>

            {/* Footer Summary */}
            {(checkoutStep === 'cart' || checkoutStep === 'checkout') && cartItems.length > 0 && (
              <div className="p-6 bg-white border-t border-zinc-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10 shrink-0">
                <div className="space-y-3 mb-6 text-sm font-medium text-zinc-500">
                  <div className="flex justify-between">
                    <span>Subtotal ({cartCount} itens)</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frete</span>
                    <span className="text-green-500 font-bold bg-green-50 px-2 py-0.5 rounded-full">Grátis</span>
                  </div>
                  <div className="flex justify-between text-xl font-black text-zinc-900 pt-4 border-t border-zinc-100">
                    <span>Total a pagar</span>
                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}</span>
                  </div>
                </div>

                {checkoutStep === 'cart' ? (
                  <button 
                    onClick={() => setCheckoutStep('checkout')}
                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-0.5"
                  >
                    Finalizar Compra
                  </button>
                ) : (
                  <button 
                    form="checkout-form"
                    type="submit"
                    className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-5 h-5" /> Gerar Pix
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Return Button */}
      <Link href="/" className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-zinc-900 text-white rounded-full text-sm font-bold shadow-2xl hover:scale-105 transition-transform flex items-center gap-2 border border-zinc-700">
        <ChevronRight className="w-4 h-4 rotate-180" /> Voltar
      </Link>
    </div>
  );
}
