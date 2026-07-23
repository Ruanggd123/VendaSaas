"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Search,
  ShoppingBag,
  Menu,
  X,
  Heart,
  Star,
  ChevronRight,
  Minus,
  Plus,
  Trash2,
  CheckCircle2,
  QrCode,
  CreditCard,
  Truck,
  ShieldCheck,
  Tag,
  Copy,
  Check,
  Eye,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  MessageSquare,
  RefreshCw,
} from "lucide-react";

type Category = "Todos" | "Eletrônicos" | "Calçados" | "Acessórios" | "Vestuário";

interface Product {
  id: number;
  name: string;
  category: Category;
  price: number;
  oldPrice?: number;
  img: string;
  gallery: string[];
  rating: number;
  reviewsCount: number;
  stock: number;
  sizes?: string[];
  colors?: string[];
  description: string;
}

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Smartwatch Elite Titanium 49mm",
    category: "Eletrônicos",
    price: 699.9,
    oldPrice: 899.9,
    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800",
    gallery: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=800",
    ],
    rating: 4.9,
    reviewsCount: 128,
    stock: 6,
    colors: ["Preto Titanium", "Prata Estelar", "Laranja Sport"],
    description: "Smartwatch premium com caixa em titânio, tela AMOLED Always-On, monitoramento de saúde 24h e bateria de até 7 dias.",
  },
  {
    id: 2,
    name: "Headphone ANC Wireless Pro",
    category: "Eletrônicos",
    price: 849.0,
    oldPrice: 1190.0,
    img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800",
    gallery: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&q=80&w=800",
    ],
    rating: 4.8,
    reviewsCount: 94,
    stock: 4,
    colors: ["Preto Fosco", "Branco Marfim"],
    description: "Cancelamento de ruído ativo inteligente, graves profundos Hi-Fi, áudio espacial 3D e 40h de reprodução contínua.",
  },
  {
    id: 3,
    name: "Óculos de Sol Vintage Polarizado",
    category: "Acessórios",
    price: 249.9,
    oldPrice: 349.9,
    img: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&q=80&w=800",
    gallery: [
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=800",
    ],
    rating: 4.7,
    reviewsCount: 52,
    stock: 12,
    colors: ["Tartaruga Escuro", "Preto Dourado"],
    description: "Lentes polarizadas UV400 com armação italiana em acetato reforçado. Estilo atemporal com proteção completa.",
  },
  {
    id: 4,
    name: "Câmera Analógica Retro 35mm",
    category: "Eletrônicos",
    price: 489.5,
    oldPrice: 599.0,
    img: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=800",
    gallery: [
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=800",
    ],
    rating: 4.9,
    reviewsCount: 41,
    stock: 3,
    colors: ["Prata & Couro", "Preto Edição Especial"],
    description: "Câmera compacta clássica com lente f/2.8 fixa, flash embutido e corpo em metal cromado.",
  },
  {
    id: 5,
    name: "Tênis Runner Pro Carbon",
    category: "Calçados",
    price: 599.9,
    oldPrice: 799.9,
    img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800",
    gallery: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800",
    ],
    rating: 4.8,
    reviewsCount: 165,
    stock: 8,
    sizes: ["38", "39", "40", "41", "42", "43"],
    colors: ["Vermelho Vermilion", "Preto Stealth", "Azul Elétrico"],
    description: "Placa interna de fibra de carbono para máxima propulsão, amortecimento ultra leve e tecido respirável.",
  },
  {
    id: 6,
    name: "Mochila Urban Tech Waterproof",
    category: "Acessórios",
    price: 299.9,
    oldPrice: 399.9,
    img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=800",
    gallery: [
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=800",
    ],
    rating: 4.6,
    reviewsCount: 77,
    stock: 15,
    colors: ["Preto Matificado", "Cinza Grafite"],
    description: "Tecido impermeável antifurto com compartimento acolchoado para notebook de até 16 polegadas e porta USB externa.",
  },
  {
    id: 7,
    name: "Jaqueta de Couro Legítimo Biker",
    category: "Vestuário",
    price: 749.0,
    oldPrice: 990.0,
    img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800",
    gallery: [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800",
    ],
    rating: 4.9,
    reviewsCount: 88,
    stock: 5,
    sizes: ["P", "M", "G", "GG"],
    colors: ["Preto Clássico", "Marrom Conhaque"],
    description: "Jaqueta feita em couro bovino 100% natural, forro térmico acetinado e zíperes metálicos YKK reforçados.",
  },
  {
    id: 8,
    name: "Relógio Minimalista Prata & Couro",
    category: "Acessórios",
    price: 389.0,
    oldPrice: 489.0,
    img: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=800",
    gallery: [
      "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=800",
    ],
    rating: 4.7,
    reviewsCount: 34,
    stock: 9,
    colors: ["Mostrador Prata / Pulseira Marrom"],
    description: "Design ultrafino de 6mm com maquinário de quartzo suíço, vidro cristal mineral antirreflexo e resistência 5ATM.",
  },
];

type CartItem = {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
};

export default function EcommerceDemo() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "checkout" | "payment" | "success">("cart");

  // Filters & State
  const [activeCategory, setActiveCategory] = useState<Category>("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "price-asc" | "price-desc">("popular");

  // Quick View Modal
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  // Coupon & Checkout
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card">("pix");
  const [copiedPix, setCopiedPix] = useState(false);
  const [cep, setCep] = useState("");
  const [cepCalculated, setCepCalculated] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const pixKeySample = "00020126580014BR.GOV.BCB.PIX0136nexus-store-key-sample520400005303986";

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const toggleWishlist = (id: number) => {
    setWishlist((prev) => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter((item) => item !== id) : [...prev, id];
      showToast(exists ? "Removido dos favoritos" : "Adicionado aos favoritos ❤️");
      return updated;
    });
  };

  const addToCart = (product: Product, color?: string, size?: string) => {
    setCartItems((prev) => {
      const exists = prev.find(
        (item) =>
          item.product.id === product.id &&
          item.selectedColor === (color || product.colors?.[0]) &&
          item.selectedSize === (size || product.sizes?.[0])
      );
      if (exists) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          selectedColor: color || product.colors?.[0],
          selectedSize: size || product.sizes?.[0],
        },
      ];
    });
    showToast(`${product.name} adicionado ao carrinho! 🛒`);
    setCheckoutStep("cart");
    setIsCartOpen(true);
    setQuickViewProduct(null);
  };

  const updateQuantity = (id: number, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === id) {
            const newQ = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQ };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const applyCoupon = () => {
    if (couponCode.trim().toUpperCase() === "NEXUS10") {
      setAppliedDiscount(0.1);
      setCouponError("");
      showToast("Cupom NEXUS10 aplicado: 10% de desconto!");
    } else {
      setCouponError("Cupom inválido. Tente 'NEXUS10'");
    }
  };

  // Filter & Sort Logic
  const filteredProducts = PRODUCTS.filter((p) => {
    const matchesCategory = activeCategory === "Todos" || p.category === activeCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    return b.rating - a.rating;
  });

  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountAmount = cartSubtotal * appliedDiscount;
  const pixDiscount = paymentMethod === "pix" ? (cartSubtotal - discountAmount) * 0.05 : 0;
  const cartTotal = Math.max(0, cartSubtotal - discountAmount - pixDiscount);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const copyPixToClipboard = () => {
    navigator.clipboard.writeText(pixKeySample);
    setCopiedPix(true);
    showToast("Chave Pix Copiada com sucesso!");
    setTimeout(() => setCopiedPix(false), 3000);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStep("success");
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-orange-500/20 overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-2xl font-bold text-xs flex items-center gap-3 animate-fade-in-up border border-stone-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Top Demo Banner */}
      <div className="bg-stone-900 text-stone-200 text-xs font-bold py-2.5 px-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-white font-black">Modelo de E-Commerce &amp; Loja Virtual</span>
            <span className="hidden sm:inline text-stone-400 font-normal">| Checkout com Pix &amp; Carrinho em Tempo Real</span>
          </div>
          <Link
            href="/"
            className="px-3.5 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-full text-[11px] font-black transition-all flex items-center gap-1 shrink-0 shadow-sm"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Voltar ao Nexus
          </Link>
        </div>
      </div>

      {/* Promo Ticker Bar */}
      <div className="bg-orange-600 text-white text-center py-2 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
        <Tag className="w-3.5 h-3.5" /> Use o cupom <span className="underline font-mono">NEXUS10</span> para 10% OFF + Frete Grátis acima de R$ 300!
      </div>

      {/* Header Navigation */}
      <nav className="bg-white border-b border-stone-200 sticky top-9 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-black text-2xl tracking-tighter uppercase text-stone-900 flex items-center gap-2">
              <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-md">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span>NEXUS<span className="text-orange-600">STORE</span></span>
            </Link>
          </div>

          {/* Live Search Input */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar produtos, relógios, tênis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-100 border border-stone-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 outline-none focus:border-orange-500 focus:bg-white transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => showToast(`Você tem ${wishlist.length} itens nos favoritos`)}
              className="relative text-stone-600 hover:text-stone-900 p-2.5 rounded-2xl hover:bg-stone-100 transition-all"
              title="Favoritos"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                  {wishlist.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setCheckoutStep("cart");
                setIsCartOpen(true);
              }}
              className="relative bg-stone-900 hover:bg-stone-800 text-white px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 shadow-md"
            >
              <ShoppingBag className="w-4 h-4 text-orange-400" />
              <span className="hidden sm:inline">Carrinho</span>
              <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                {cartCount}
              </span>
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="border-t border-stone-100 bg-white">
          <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between overflow-x-auto text-xs font-bold scrollbar-none">
            <div className="flex items-center gap-6">
              {(["Todos", "Eletrônicos", "Calçados", "Acessórios", "Vestuário"] as Category[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`transition-all uppercase tracking-wider whitespace-nowrap py-3 border-b-2 ${
                    activeCategory === cat
                      ? "text-orange-600 border-orange-600 font-black"
                      : "text-stone-500 border-transparent hover:text-stone-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort Selector */}
            <div className="hidden sm:flex items-center gap-2 text-stone-500 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent text-stone-900 font-bold outline-none cursor-pointer"
              >
                <option value="popular">Mais Populares</option>
                <option value="price-asc">Menor Preço</option>
                <option value="price-desc">Maior Preço</option>
              </select>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Banner Section */}
      <div className="relative bg-stone-900 text-white overflow-hidden py-16 sm:py-24">
        <div className="absolute inset-0 opacity-40">
          <img
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000"
            alt="Coleção Exclusiva"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950 via-stone-950/80 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 text-xs font-bold uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" /> Nova Coleção 2026
            </span>
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white leading-[1.05]">
              Tecnologia &amp; Estilo de <span className="text-orange-500">Alto Padrão.</span>
            </h1>
            <p className="text-sm sm:text-base text-stone-300 max-w-lg mx-auto lg:mx-0 font-medium leading-relaxed">
              Descubra os produtos mais desejados com envio expresso, garantia estendida e 5% de desconto extra no Pix.
            </p>
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={() => setActiveCategory("Todos")}
                className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-2xl uppercase tracking-wider text-xs transition-all shadow-xl shadow-orange-600/30"
              >
                Explorar Ofertas
              </button>
              <div className="flex items-center gap-2 text-xs font-bold text-stone-400">
                <Truck className="w-4 h-4 text-emerald-400" /> Entrega Rápida em Todo Brasil
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Catalog Grid */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-stone-200 pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-stone-900">
              {activeCategory === "Todos" ? "Catálogo de Produtos" : activeCategory}
            </h2>
            <p className="text-xs text-stone-500 font-medium mt-1">
              Mostrando {filteredProducts.length} itens disponíveis em estoque
            </p>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 space-y-4">
            <ShoppingBag className="w-16 h-16 mx-auto text-stone-300" />
            <h3 className="text-lg font-bold text-stone-800">Nenhum produto encontrado</h3>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              Tente buscar por outro termo ou selecione uma categoria diferente acima.
            </p>
            <button
              onClick={() => {
                setActiveCategory("Todos");
                setSearchQuery("");
              }}
              className="px-5 py-2.5 bg-stone-900 text-white font-bold rounded-xl text-xs"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((p) => {
              const isWished = wishlist.includes(p.id);
              return (
                <div
                  key={p.id}
                  className="group bg-white rounded-3xl border border-stone-200/80 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="relative aspect-square bg-stone-100 overflow-hidden">
                    <img
                      src={p.img}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Category Pill */}
                    <span className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg">
                      {p.category}
                    </span>

                    {/* Wishlist Button */}
                    <button
                      onClick={() => toggleWishlist(p.id)}
                      className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        isWished
                          ? "bg-red-500 text-white shadow-md"
                          : "bg-white/90 text-stone-400 hover:text-red-500 hover:bg-white"
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isWished ? "fill-current" : ""}`} />
                    </button>

                    {/* Quick View Overlay Button */}
                    <button
                      onClick={() => {
                        setQuickViewProduct(p);
                        setSelectedColor(p.colors?.[0] || "");
                        setSelectedSize(p.sizes?.[0] || "");
                      }}
                      className="absolute bottom-3 left-3 right-3 bg-stone-900/90 hover:bg-stone-900 text-white text-xs font-bold py-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1.5 backdrop-blur-sm"
                    >
                      <Eye className="w-3.5 h-3.5" /> Espiar Detalhes
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span className="font-bold text-stone-700">{p.rating}</span>
                          <span className="text-stone-400 font-mono text-[10px]">({p.reviewsCount})</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-mono font-bold">
                          ⚡ {p.stock} em estoque
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-stone-900 group-hover:text-orange-600 transition-colors line-clamp-2">
                        {p.name}
                      </h3>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-stone-900">
                          R$ {p.price.toFixed(2).replace(".", ",")}
                        </span>
                        {p.oldPrice && (
                          <span className="text-xs text-stone-400 line-through">
                            R$ {p.oldPrice.toFixed(2).replace(".", ",")}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                        R$ {(p.price * 0.95).toFixed(2).replace(".", ",")} no Pix (5% OFF)
                      </span>

                      <button
                        onClick={() => addToCart(p)}
                        className="w-full mt-3 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-orange-600/20"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" /> Adicionar ao Carrinho
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm" onClick={() => setQuickViewProduct(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 sm:p-8 z-10 animate-fade-in-up space-y-6 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div className="aspect-square bg-stone-100 rounded-2xl overflow-hidden border border-stone-200">
                <img src={quickViewProduct.img} alt={quickViewProduct.name} className="w-full h-full object-cover" />
              </div>

              <div className="space-y-4">
                <span className="px-2.5 py-1 bg-orange-100 text-orange-800 text-[10px] font-extrabold uppercase rounded-md">
                  {quickViewProduct.category}
                </span>
                <h3 className="text-xl font-black text-stone-900 leading-tight">{quickViewProduct.name}</h3>

                <p className="text-xs text-stone-500 font-medium leading-relaxed">
                  {quickViewProduct.description}
                </p>

                {/* Color Selector */}
                {quickViewProduct.colors && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-stone-700 block">Opção de Cor:</span>
                    <div className="flex flex-wrap gap-2">
                      {quickViewProduct.colors.map((c) => (
                        <button
                          key={c}
                          onClick={() => setSelectedColor(c)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            selectedColor === c
                              ? "bg-stone-900 border-stone-900 text-white"
                              : "bg-stone-100 border-stone-200 text-stone-700"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size Selector */}
                {quickViewProduct.sizes && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-stone-700 block">Tamanho:</span>
                    <div className="flex flex-wrap gap-2">
                      {quickViewProduct.sizes.map((s) => (
                        <button
                          key={s}
                          onClick={() => setSelectedSize(s)}
                          className={`w-9 h-9 rounded-xl text-xs font-bold border transition-all ${
                            selectedSize === s
                              ? "bg-orange-600 border-orange-600 text-white"
                              : "bg-stone-100 border-stone-200 text-stone-700"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <div className="text-2xl font-black text-stone-900">
                    R$ {quickViewProduct.price.toFixed(2).replace(".", ",")}
                  </div>
                  <span className="text-xs text-emerald-600 font-bold block">
                    ou R$ {(quickViewProduct.price * 0.95).toFixed(2).replace(".", ",")} no Pix (5% OFF)
                  </span>
                </div>

                <button
                  onClick={() => addToCart(quickViewProduct, selectedColor, selectedSize)}
                  className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" /> Adicionar ao Carrinho
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-Over Drawer Cart & Checkout */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />

          <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full z-10 animate-fade-in">
            {/* Drawer Header */}
            <div className="p-6 border-b border-stone-200 flex items-center justify-between bg-stone-900 text-white shrink-0">
              <h3 className="font-black text-lg uppercase tracking-tight flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-400" />
                {checkoutStep === "cart"
                  ? "Seu Carrinho"
                  : checkoutStep === "checkout"
                  ? "Dados de Entrega"
                  : checkoutStep === "payment"
                  ? "Pagamento Pix/Cartão"
                  : "Pedido Confirmado! 🎉"}
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="p-2 text-stone-400 hover:text-white rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-stone-50">
              {/* STEP 1: CART */}
              {checkoutStep === "cart" && (
                <>
                  {cartItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-20 text-stone-400 space-y-4">
                      <ShoppingBag className="w-16 h-16 text-stone-300" />
                      <p className="font-bold text-stone-600">Seu carrinho está vazio.</p>
                      <button
                        onClick={() => setIsCartOpen(false)}
                        className="px-5 py-2.5 bg-stone-900 text-white rounded-xl font-bold text-xs"
                      >
                        Começar a Comprar
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cartItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex gap-3 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm relative"
                        >
                          <img
                            src={item.product.img}
                            alt={item.product.name}
                            className="w-20 h-20 object-cover rounded-xl border border-stone-100"
                          />
                          <div className="flex-1 flex flex-col justify-between py-0.5 pr-6">
                            <div>
                              <h4 className="font-bold text-xs text-stone-900 leading-tight">
                                {item.product.name}
                              </h4>
                              {(item.selectedColor || item.selectedSize) && (
                                <span className="text-[10px] text-stone-400 font-medium block mt-0.5">
                                  {item.selectedColor} {item.selectedSize ? `| Tam: ${item.selectedSize}` : ""}
                                </span>
                              )}
                              <span className="text-orange-600 font-black text-sm block mt-1">
                                R$ {item.product.price.toFixed(2).replace(".", ",")}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex items-center border border-stone-200 rounded-lg bg-stone-100 p-0.5">
                                <button
                                  onClick={() => updateQuantity(item.product.id, -1)}
                                  className="w-6 h-6 bg-white rounded flex items-center justify-center text-stone-700 hover:bg-stone-200"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-7 text-center font-bold text-xs">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.product.id, 1)}
                                  className="w-6 h-6 bg-white rounded flex items-center justify-center text-stone-700 hover:bg-stone-200"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => updateQuantity(item.product.id, -item.quantity)}
                            className="absolute top-3 right-3 text-stone-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {/* Coupon Section */}
                      <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-2 mt-4">
                        <label className="text-xs font-bold text-stone-700 block">Cupom de Desconto</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Ex: NEXUS10"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            className="flex-1 bg-stone-100 border border-stone-200 rounded-xl px-3 py-2 text-xs uppercase font-mono font-bold outline-none"
                          />
                          <button
                            onClick={applyCoupon}
                            className="px-4 py-2 bg-stone-900 text-white font-bold text-xs rounded-xl hover:bg-stone-800"
                          >
                            Aplicar
                          </button>
                        </div>
                        {appliedDiscount > 0 && (
                          <span className="text-xs text-emerald-600 font-bold block">✓ Cupom ativado (10% OFF)</span>
                        )}
                        {couponError && <span className="text-xs text-red-500 font-bold block">{couponError}</span>}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* STEP 2: CHECKOUT INFO */}
              {checkoutStep === "checkout" && (
                <div className="space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3 text-xs font-medium">
                    <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-orange-600" /> Endereço de Entrega
                    </h4>
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase block">Nome Completo</label>
                      <input
                        type="text"
                        defaultValue="Carlos Eduardo Silva"
                        className="w-full bg-stone-100 border border-stone-200 rounded-xl px-3 py-2.5 mt-1 outline-none text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase block">CEP com Cálculo de Frete</label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          placeholder="01001-000"
                          value={cep}
                          onChange={(e) => setCep(e.target.value)}
                          className="flex-1 bg-stone-100 border border-stone-200 rounded-xl px-3 py-2.5 font-mono font-bold outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCepCalculated(true);
                            showToast("Frete Grátis Calculado para seu CEP!");
                          }}
                          className="px-4 py-2 bg-stone-900 text-white font-bold rounded-xl"
                        >
                          Calcular
                        </button>
                      </div>
                      {cepCalculated && (
                        <span className="text-[11px] text-emerald-600 font-bold block mt-1">
                          ✓ Frete Grátis • Entrega estimada em 3 dias úteis
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: PAYMENT METHOD */}
              {checkoutStep === "payment" && (
                <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-4">
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 space-y-3">
                    <h4 className="font-bold text-xs text-stone-900">Escolha a Forma de Pagamento:</h4>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("pix")}
                        className={`p-3 rounded-2xl border text-xs font-bold text-center flex flex-col items-center gap-1 transition-all ${
                          paymentMethod === "pix"
                            ? "bg-emerald-50 border-emerald-500 text-emerald-900 font-black shadow-sm"
                            : "bg-stone-50 border-stone-200 text-stone-600"
                        }`}
                      >
                        <QrCode className="w-5 h-5 text-emerald-600" />
                        <span>PIX (5% OFF)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("card")}
                        className={`p-3 rounded-2xl border text-xs font-bold text-center flex flex-col items-center gap-1 transition-all ${
                          paymentMethod === "card"
                            ? "bg-orange-50 border-orange-500 text-orange-900 font-black shadow-sm"
                            : "bg-stone-50 border-stone-200 text-stone-600"
                        }`}
                      >
                        <CreditCard className="w-5 h-5 text-orange-600" />
                        <span>Cartão de Crédito</span>
                      </button>
                    </div>

                    {paymentMethod === "pix" ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                        <span className="text-xs font-bold text-emerald-800 block">
                          Desconto de 5% Aplicado no Pix! 🎉
                        </span>
                        <p className="text-[11px] text-emerald-700">
                          O QR Code será gerado na próxima etapa para pagamento instantâneo.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-stone-500 uppercase block">Número do Cartão</label>
                          <input
                            type="text"
                            placeholder="4532 •••• •••• 8912"
                            className="w-full bg-stone-100 border border-stone-200 rounded-xl px-3 py-2.5 font-mono font-bold mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 uppercase block">Validade</label>
                            <input
                              type="text"
                              placeholder="12/28"
                              className="w-full bg-stone-100 border border-stone-200 rounded-xl px-3 py-2.5 font-mono font-bold mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 uppercase block">CVV</label>
                            <input
                              type="text"
                              placeholder="381"
                              className="w-full bg-stone-100 border border-stone-200 rounded-xl px-3 py-2.5 font-mono font-bold mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              )}

              {/* STEP 4: SUCCESS */}
              {checkoutStep === "success" && (
                <div className="text-center py-10 space-y-6 animate-fade-in">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-stone-900">Pedido #9842 Confirmado!</h3>
                    <p className="text-xs text-stone-500 font-medium mt-1">
                      {paymentMethod === "pix"
                        ? "Escaneie a chave Pix abaixo para concluir o pagamento:"
                        : "Seu pagamento via Cartão foi aprovado com sucesso!"}
                    </p>
                  </div>

                  {paymentMethod === "pix" && (
                    <div className="p-5 bg-white border border-stone-200 rounded-3xl shadow-xl space-y-3 inline-block">
                      <img
                        src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=NexusStorePixSample"
                        alt="QR Code Pix"
                        className="w-44 h-44 mx-auto rounded-xl border border-stone-100"
                      />
                      <button
                        onClick={copyPixToClipboard}
                        className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                      >
                        {copiedPix ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copiedPix ? "Chave Pix Copiada!" : "Copiar Chave Pix"}
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setCartItems([]);
                      setCheckoutStep("cart");
                    }}
                    className="w-full py-4 bg-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl"
                  >
                    Voltar para a Loja
                  </button>
                </div>
              )}
            </div>

            {/* Drawer Footer Summary */}
            {(checkoutStep === "cart" || checkoutStep === "checkout" || checkoutStep === "payment") &&
              cartItems.length > 0 && (
                <div className="p-6 bg-white border-t border-stone-200 space-y-4 shrink-0 shadow-lg">
                  <div className="space-y-1.5 text-xs text-stone-600 font-medium">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>R$ {cartSubtotal.toFixed(2).replace(".", ",")}</span>
                    </div>
                    {appliedDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Desconto Cupom (10%)</span>
                        <span>- R$ {discountAmount.toFixed(2).replace(".", ",")}</span>
                      </div>
                    )}
                    {paymentMethod === "pix" && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Desconto Pix (5%)</span>
                        <span>- R$ {pixDiscount.toFixed(2).replace(".", ",")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black text-stone-900 border-t border-stone-200 pt-2">
                      <span>Total</span>
                      <span className="text-orange-600">R$ {cartTotal.toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>

                  {checkoutStep === "cart" && (
                    <button
                      onClick={() => setCheckoutStep("checkout")}
                      className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2"
                    >
                      Avançar para Entrega <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {checkoutStep === "checkout" && (
                    <button
                      onClick={() => setCheckoutStep("payment")}
                      className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2"
                    >
                      Avançar para Pagamento <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {checkoutStep === "payment" && (
                    <button
                      form="checkout-form"
                      type="submit"
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                    >
                      <QrCode className="w-4 h-4" /> Concluir Pedido
                    </button>
                  )}
                </div>
              )}
          </div>
        </div>
      )}

      {/* Floating Back Button */}
      <Link
        href="/"
        className="fixed bottom-6 right-6 z-50 px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-xs font-black shadow-2xl hover:scale-105 transition-all flex items-center gap-2 border border-stone-700"
      >
        <ChevronRight className="w-4 h-4 rotate-180" /> Voltar ao Nexus
      </Link>
    </div>
  );
}
