import React, { useState, useMemo } from 'react';
import { Product, CartItem, StoreProfile, PaymentMethod, Transaction } from '../types';
import { storageService } from '../services/storage';
import { playBeep, playSuccessChime } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Camera,
  Percent,
  Receipt,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Flame,
  Tag,
  Check,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Layers,
  LayoutGrid,
  List,
} from 'lucide-react';

interface HandheldZ91POSProps {
  products: Product[];
  profile: StoreProfile;
  onProfileUpdated?: (updated: StoreProfile) => void;
  onProductsUpdated: () => void;
  onOpenScanner: () => void;
  onTransactionComplete: (tx: Transaction) => void;
  onSwitchToFullDesktop?: () => void;
}

export const HandheldZ91POS: React.FC<HandheldZ91POSProps> = ({
  products,
  profile,
  onProductsUpdated,
  onOpenScanner,
  onTransactionComplete,
  onSwitchToFullDesktop,
}) => {
  // Navigation tabs within Handheld POS
  const [activeScreen, setActiveScreen] = useState<'catalog' | 'cart' | 'payment'>('catalog');

  // Search & Category
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');

  // Catalog View Mode: 'grid' (2 columns) or 'list' (compact rows)
  const [catalogViewMode, setCatalogViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kasirku_z91_view_mode');
      if (saved === 'list' || saved === 'grid') return saved;
    }
    return 'grid';
  });

  const handleSetCatalogViewMode = (mode: 'grid' | 'list') => {
    setCatalogViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kasirku_z91_view_mode', mode);
    }
  };

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountNotaPercent, setDiscountNotaPercent] = useState<number>(0);
  const [showTax, setShowTax] = useState<boolean>(profile.taxEnabled);
  const [taxRate, setTaxRate] = useState<number>(profile.taxRate);

  // Per-item discount modal/popover
  const [editingItemDiscount, setEditingItemDiscount] = useState<string | null>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['Semua', ...Array.from(set)];
  }, [products]);

  // Frequently purchased products
  const frequentProducts = useMemo(() => {
    const txs = storageService.getTransactions();
    const frequencyMap = new Map<string, number>();

    txs.forEach((tx) => {
      tx.items.forEach((item) => {
        const current = frequencyMap.get(item.product.id) || 0;
        frequencyMap.set(item.product.id, current + item.quantity);
      });
    });

    const list = products.map((p) => ({
      product: p,
      salesCount: frequencyMap.get(p.id) || 0,
    }));

    list.sort((a, b) => b.salesCount - a.salesCount);
    return list.slice(0, 6);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Currency Formatter
  const formatRupiah = (num: number) => {
    return 'Rp ' + (num || 0).toLocaleString('id-ID');
  };

  // Cart Operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    playBeep(1200, 0.05);

    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id);
      if (idx >= 0) {
        if (prev[idx].quantity >= product.stock) return prev;
        const updated = [...prev];
        const newQty = updated[idx].quantity + 1;
        const discPct = updated[idx].discountPercent || 0;
        const gross = newQty * product.sellPrice;
        const discAmt = Math.round((gross * discPct) / 100);
        updated[idx] = {
          ...updated[idx],
          quantity: newQty,
          discountAmount: discAmt,
          subtotal: Math.max(0, gross - discAmt),
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            discountPercent: 0,
            discountAmount: 0,
            subtotal: product.sellPrice,
          },
        ];
      }
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id !== productId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.product.stock) return item;

          const discPct = item.discountPercent || 0;
          const gross = nextQty * item.product.sellPrice;
          const discAmt = Math.round((gross * discPct) / 100);

          return {
            ...item,
            quantity: nextQty,
            discountAmount: discAmt,
            subtotal: Math.max(0, gross - discAmt),
          };
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const updateItemDiscount = (productId: string, percent: number) => {
    const validPct = Math.min(100, Math.max(0, percent || 0));
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id !== productId) return item;
        const gross = item.quantity * item.product.sellPrice;
        const discAmt = Math.round((gross * validPct) / 100);
        return {
          ...item,
          discountPercent: validPct,
          discountAmount: discAmt,
          subtotal: Math.max(0, gross - discAmt),
        };
      })
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountNotaPercent(0);
    setActiveScreen('catalog');
  };

  // Calculations
  const cartTotalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const cartGrossTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.product.sellPrice, 0),
    [cart]
  );

  const cartItemDiscounts = useMemo(
    () => cart.reduce((sum, item) => sum + (item.discountAmount || 0), 0),
    [cart]
  );

  const subtotalAfterItemDiscount = useMemo(
    () => Math.max(0, cartGrossTotal - cartItemDiscounts),
    [cartGrossTotal, cartItemDiscounts]
  );

  const discountNotaAmount = useMemo(() => {
    return Math.round((subtotalAfterItemDiscount * discountNotaPercent) / 100);
  }, [subtotalAfterItemDiscount, discountNotaPercent]);

  const subtotalAfterNotaDiscount = useMemo(
    () => Math.max(0, subtotalAfterItemDiscount - discountNotaAmount),
    [subtotalAfterItemDiscount, discountNotaAmount]
  );

  const taxAmount = useMemo(() => {
    if (!showTax) return 0;
    return Math.round((subtotalAfterNotaDiscount * taxRate) / 100);
  }, [showTax, subtotalAfterNotaDiscount, taxRate]);

  const grandTotal = useMemo(
    () => subtotalAfterNotaDiscount + taxAmount,
    [subtotalAfterNotaDiscount, taxAmount]
  );

  const totalDiscountAll = useMemo(
    () => cartItemDiscounts + discountNotaAmount,
    [cartItemDiscounts, discountNotaAmount]
  );

  // Payment Calculations
  const numericAmountPaid = Number(amountPaidInput) || 0;
  const changeAmount = Math.max(0, numericAmountPaid - grandTotal);
  const isInsufficient = paymentMethod === 'cash' && numericAmountPaid < grandTotal;

  // Numpad key press handler
  const handleNumpadPress = (digit: string) => {
    if (digit === 'C') {
      setAmountPaidInput('');
    } else if (digit === 'DEL') {
      setAmountPaidInput((prev) => prev.slice(0, -1));
    } else if (digit === '000') {
      if (amountPaidInput && amountPaidInput !== '0') {
        setAmountPaidInput((prev) => prev + '000');
      }
    } else {
      if (amountPaidInput === '0') {
        setAmountPaidInput(digit);
      } else {
        setAmountPaidInput((prev) => prev + digit);
      }
    }
  };

  const handleQuickNominal = (val: number) => {
    setAmountPaidInput(val.toString());
  };

  // Finish Transaction
  const handleFinishTransaction = () => {
    if (cart.length === 0 || isInsufficient || isProcessing) return;
    setIsProcessing(true);

    try {
      const finalPaid = paymentMethod === 'cash' ? numericAmountPaid : grandTotal;
      const tx = storageService.recordTransaction(
        cart,
        paymentMethod,
        finalPaid,
        totalDiscountAll,
        customerName.trim() || undefined,
        undefined,
        taxAmount
      );

      playSuccessChime();
      try {
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      } catch {
        // ignore
      }

      // Reset
      setCart([]);
      setDiscountNotaPercent(0);
      setAmountPaidInput('');
      setCustomerName('');
      setActiveScreen('catalog');

      onProductsUpdated();
      onTransactionComplete(tx);
    } finally {
      setIsProcessing(false);
    }
  };

  // Suggested Cash Quick Buttons
  const quickCashOptions = useMemo(() => {
    if (grandTotal <= 0) return [10000, 20000, 50000, 100000];
    const opts = new Set<number>();
    opts.add(grandTotal); // Uang pas

    const next5k = Math.ceil(grandTotal / 5000) * 5000;
    if (next5k > grandTotal) opts.add(next5k);

    const next10k = Math.ceil(grandTotal / 10000) * 10000;
    if (next10k > grandTotal) opts.add(next10k);

    const next20k = Math.ceil(grandTotal / 20000) * 20000;
    if (next20k > grandTotal) opts.add(next20k);

    const next50k = Math.ceil(grandTotal / 50000) * 50000;
    if (next50k > grandTotal) opts.add(next50k);

    const next100k = Math.ceil(grandTotal / 100000) * 100000;
    if (next100k > grandTotal) opts.add(next100k);

    return Array.from(opts).slice(0, 4);
  }, [grandTotal]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100 select-none overflow-hidden max-w-md mx-auto shadow-2xl relative">
      {/* 1. TOP HANDHELD HEADER */}
      <header className="bg-slate-900/95 border-b border-slate-800 px-3 py-2 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          {activeScreen !== 'catalog' ? (
            <button
              onClick={() => setActiveScreen('catalog')}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 transition"
              title="Kembali ke Menu Produk"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
              POS
            </div>
          )}
          <div>
            <h1 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
              <span>{profile.name}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Z91
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">
              {activeScreen === 'catalog' && 'Kasir Cepat Handheld'}
              {activeScreen === 'cart' && `Keranjang Belanja (${cartTotalItems} item)`}
              {activeScreen === 'payment' && 'Pembayaran Transaksi'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Scanner */}
          <button
            type="button"
            onClick={onOpenScanner}
            className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg active:scale-95 transition flex items-center gap-1 text-xs font-bold shadow-md shadow-emerald-900/40"
            title="Scan Barcode Kamera"
          >
            <Camera className="w-4 h-4" />
            <span className="text-[11px] hidden xs:inline">Scan</span>
          </button>

          {/* Cart Icon / Badge */}
          <button
            type="button"
            onClick={() => setActiveScreen(activeScreen === 'cart' ? 'catalog' : 'cart')}
            className={`relative p-2 rounded-lg transition active:scale-95 flex items-center ${
              activeScreen === 'cart'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Buka Keranjang"
          >
            <ShoppingCart className="w-4 h-4" />
            {cartTotalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {cartTotalItems}
              </span>
            )}
          </button>

          {/* Switch to Full Tablet/Desktop View */}
          {onSwitchToFullDesktop && (
            <button
              type="button"
              onClick={onSwitchToFullDesktop}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-[10px] transition"
              title="Beralih ke Tampilan Kasir Luas (Tablet/Desktop)"
            >
              <Layers className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. BODY CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* ============================================================ */}
        {/* SCREEN A: CATALOG (GRID TABLET-STYLE OPTIMIZED FOR PHONE)     */}
        {/* ============================================================ */}
        {activeScreen === 'catalog' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Search Bar & Sering Muncul Quick Trigger */}
            <div className="p-2.5 pb-1 bg-slate-900 shrink-0 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari menu, SKU, atau barcode..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sering Muncul Chips (Fast Selling) */}
              {!searchQuery && frequentProducts.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 shrink-0 px-1.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                    <Flame className="w-3 h-3 fill-amber-400" />
                    <span>Favorit:</span>
                  </div>
                  {frequentProducts.map(({ product }) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={product.stock <= 0}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700/80 text-[11px] font-semibold text-slate-200 whitespace-nowrap shrink-0 flex items-center gap-1 disabled:opacity-40"
                    >
                      <span>{product.name}</span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold">
                        {formatRupiah(product.sellPrice)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Category Pills & View Mode Switcher (Grid vs List) */}
              <div className="flex items-center justify-between gap-2 py-1 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1 min-w-0 pr-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition active:scale-95 shrink-0 ${
                        selectedCategory === cat
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950 font-extrabold'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* View Mode Toggle: Grid vs List */}
                <div className="flex items-center bg-slate-800/90 border border-slate-700/90 rounded-lg p-0.5 shrink-0 shadow-sm">
                  <button
                    type="button"
                    onClick={() => handleSetCatalogViewMode('grid')}
                    className={`p-1.5 rounded-md transition active:scale-95 ${
                      catalogViewMode === 'grid'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Mode Grid (Kotak 2 Kolom)"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetCatalogViewMode('list')}
                    className={`p-1.5 rounded-md transition active:scale-95 ${
                      catalogViewMode === 'list'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Mode List (Daftar Baris)"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Product Display: Grid or List for Handheld Z91 Screen */}
            <div
              className={`flex-1 overflow-y-auto p-2.5 pb-24 ${
                catalogViewMode === 'grid'
                  ? 'grid grid-cols-2 gap-2'
                  : 'flex flex-col gap-1.5'
              }`}
            >
              {filteredProducts.length === 0 ? (
                <div className={`py-12 flex flex-col items-center justify-center text-slate-500 text-xs text-center ${catalogViewMode === 'grid' ? 'col-span-2' : ''}`}>
                  <Search className="w-8 h-8 mb-2 opacity-50" />
                  <p className="font-semibold text-slate-400">Produk Tidak Ditemukan</p>
                  <p className="text-[11px] text-slate-600 mt-1">Coba cari dengan kata kunci lain</p>
                </div>
              ) : catalogViewMode === 'grid' ? (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const inCartItem = cart.find((i) => i.product.id === p.id);
                  const isLowStock = p.stock > 0 && p.stock <= p.minStock;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(p)}
                      className={`relative flex flex-col justify-between p-3 rounded-2xl text-left transition active:scale-96 border select-none ${
                        isOutOfStock
                          ? 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed'
                          : inCartItem
                          ? 'bg-gradient-to-b from-slate-800 to-emerald-950/40 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/40'
                          : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600 shadow-sm'
                      }`}
                    >
                      {/* Quantity in cart badge */}
                      {inCartItem && (
                        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-emerald-500 text-slate-950 text-xs font-black rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900">
                          {inCartItem.quantity}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="truncate max-w-[90px]">{p.category}</span>
                          {isOutOfStock ? (
                            <span className="text-rose-400 font-bold">Habis</span>
                          ) : isLowStock ? (
                            <span className="text-amber-400 font-semibold">Sisa {p.stock}</span>
                          ) : (
                            <span className="text-slate-500">Stok {p.stock}</span>
                          )}
                        </div>
                        <h3 className="font-bold text-xs text-white line-clamp-2 leading-snug">
                          {p.name}
                        </h3>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between">
                        <span className="font-mono font-extrabold text-xs text-emerald-400">
                          {formatRupiah(p.sellPrice)}
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                /* List / Daftar Mode */
                filteredProducts.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const inCartItem = cart.find((i) => i.product.id === p.id);
                  const isLowStock = p.stock > 0 && p.stock <= p.minStock;

                  return (
                    <div
                      key={p.id}
                      onClick={() => !isOutOfStock && addToCart(p)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition active:scale-98 select-none ${
                        isOutOfStock
                          ? 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed'
                          : inCartItem
                          ? 'bg-gradient-to-r from-slate-800 via-slate-800 to-emerald-950/40 border-emerald-500/70 shadow-sm ring-1 ring-emerald-500/30'
                          : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 shadow-sm cursor-pointer'
                      }`}
                    >
                      {/* Left: Product Info */}
                      <div className="flex-1 min-w-0 pr-2.5">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-700/70 text-slate-300 font-medium truncate max-w-[85px]">
                            {p.category}
                          </span>
                          {p.barcode && (
                            <span className="font-mono text-slate-500 text-[9px] truncate">
                              #{p.barcode}
                            </span>
                          )}
                          {isOutOfStock ? (
                            <span className="text-rose-400 font-bold ml-auto shrink-0">Habis</span>
                          ) : isLowStock ? (
                            <span className="text-amber-400 font-semibold ml-auto shrink-0">Sisa {p.stock}</span>
                          ) : (
                            <span className="text-slate-500 ml-auto shrink-0">Stok {p.stock} {p.unit || ''}</span>
                          )}
                        </div>

                        <h3 className="font-bold text-xs text-white truncate leading-snug">
                          {p.name}
                        </h3>

                        <div className="font-mono font-extrabold text-xs text-emerald-400 mt-1">
                          {formatRupiah(p.sellPrice)}
                        </div>
                      </div>

                      {/* Right: Cart Status / Action */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        {inCartItem ? (
                          <div className="flex items-center gap-1 bg-slate-900/90 border border-emerald-500/40 rounded-lg p-0.5 shadow-sm">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(p.id, -1);
                              }}
                              className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center active:scale-95 transition"
                              title="Kurangi 1 item"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center font-mono font-black text-xs text-emerald-400">
                              {inCartItem.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={inCartItem.quantity >= p.stock}
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(p);
                              }}
                              className="w-7 h-7 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center active:scale-95 transition disabled:opacity-40"
                              title="Tambah 1 item"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(p);
                            }}
                            className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/30 flex items-center justify-center active:scale-95 transition disabled:opacity-40"
                            title="Tambah ke keranjang"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Persistent Bottom Bar: Total & Quick Checkout Button */}
            {cart.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-between gap-2.5 shadow-2xl z-20">
                <button
                  type="button"
                  onClick={() => setActiveScreen('cart')}
                  className="flex items-center gap-2 p-1 text-left flex-1 min-w-0"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                    {cartTotalItems}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-semibold">
                      Total ({cartTotalItems} item)
                    </span>
                    <span className="text-sm font-black font-mono text-emerald-400 truncate block">
                      {formatRupiah(grandTotal)}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveScreen('cart')}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 active:scale-95 transition"
                  >
                    Rincian
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAmountPaidInput(grandTotal.toString());
                      setActiveScreen('payment');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs active:scale-95 transition flex items-center gap-1.5 shadow-lg shadow-emerald-950"
                  >
                    <span>Bayar</span>
                    <ChevronRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN B: CART DETAILS & ITEM DISCOUNTS                      */}
        {/* ============================================================ */}
        {activeScreen === 'cart' && (
          <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
            {/* Top Toolbar */}
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-200">
                Daftar Pesanan ({cart.length} jenis)
              </span>
              <button
                type="button"
                onClick={clearCart}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 active:scale-95"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Kosongkan</span>
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {cart.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-500 text-xs">
                  <ShoppingCart className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
                  <p className="font-semibold text-slate-400">Keranjang masih kosong</p>
                  <button
                    type="button"
                    onClick={() => setActiveScreen('catalog')}
                    className="mt-3 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold"
                  >
                    + Pilih Produk
                  </button>
                </div>
              ) : (
                cart.map((item) => {
                  const grossItemTotal = item.quantity * item.product.sellPrice;
                  const hasDiscount = (item.discountPercent || 0) > 0;
                  const isEditingThis = editingItemDiscount === item.product.id;

                  return (
                    <div
                      key={item.product.id}
                      className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3 space-y-2.5 shadow-sm"
                    >
                      {/* Item header: Name, Price, Stepper */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-white truncate">
                            {item.product.name}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                            {formatRupiah(item.product.sellPrice)} / {item.product.unit}
                          </span>
                        </div>

                        {/* Stepper +/- */}
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl p-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 active:scale-90 transition"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-black text-xs text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.product.id, 1)}
                            disabled={item.quantity >= item.product.stock}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 active:scale-90 transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.product.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Discount Item Toggle Bar */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-700/50 text-[11px]">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingItemDiscount(isEditingThis ? null : item.product.id)
                          }
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg font-semibold transition border ${
                            hasDiscount
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          <Percent className="w-3 h-3 text-rose-400" />
                          <span>
                            {hasDiscount ? `Diskon ${item.discountPercent}%` : '+ Diskon Item'}
                          </span>
                        </button>

                        <div className="text-right">
                          {hasDiscount && (
                            <span className="line-through text-slate-500 text-[10px] font-mono mr-1.5">
                              {formatRupiah(grossItemTotal)}
                            </span>
                          )}
                          <span className="font-mono font-bold text-xs text-emerald-400">
                            {formatRupiah(item.subtotal)}
                          </span>
                        </div>
                      </div>

                      {/* Expandable Discount Presets for this Item */}
                      {isEditingThis && (
                        <div className="p-2 bg-slate-900 rounded-xl border border-slate-700/80 flex items-center justify-between gap-1.5 animate-fade-in">
                          <span className="text-[10px] text-slate-400 font-bold">Pilih %:</span>
                          <div className="flex items-center gap-1 flex-1 justify-end">
                            {[0, 5, 10, 15, 20, 50].map((pct) => (
                              <button
                                key={pct}
                                type="button"
                                onClick={() => {
                                  updateItemDiscount(item.product.id, pct);
                                  setEditingItemDiscount(null);
                                }}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                                  item.discountPercent === pct
                                    ? 'bg-rose-500 text-white'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                                }`}
                              >
                                {pct === 0 ? '0%' : `${pct}%`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Summary: Nota Discount, Tax Toggle & Grand Total */}
            {cart.length > 0 && (
              <div className="bg-slate-900/95 border-t border-slate-800 p-3 space-y-2.5 shrink-0">
                {/* Nota Discount & Tax Controls */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Diskon Nota */}
                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Tag className="w-3 h-3 text-amber-400" />
                      Diskon Nota:
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      {[0, 5, 10].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDiscountNotaPercent(pct)}
                          className={`flex-1 py-0.5 rounded text-[10px] font-bold ${
                            discountNotaPercent === pct
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PPN Switch */}
                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-2 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Receipt className="w-3 h-3 text-emerald-400" />
                      Pajak (PPN):
                    </span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        {showTax ? `${taxRate}%` : 'Non-aktif'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowTax((prev) => !prev)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                          showTax
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                      >
                        {showTax ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Breakdown Calculation */}
                <div className="space-y-1 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                  <div className="flex justify-between">
                    <span>Subtotal Barang:</span>
                    <span className="font-mono text-slate-200">
                      {formatRupiah(subtotalAfterItemDiscount)}
                    </span>
                  </div>
                  {discountNotaAmount > 0 && (
                    <div className="flex justify-between text-amber-400 font-semibold">
                      <span>Potongan Nota ({discountNotaPercent}%):</span>
                      <span className="font-mono">-{formatRupiah(discountNotaAmount)}</span>
                    </div>
                  )}
                  {showTax && taxAmount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>PPN ({taxRate}%):</span>
                      <span className="font-mono">+{formatRupiah(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm font-black text-white pt-1 border-t border-slate-800">
                    <span>Total Tagihan:</span>
                    <span className="text-emerald-400 font-mono text-base">
                      {formatRupiah(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Checkout Button */}
                <button
                  type="button"
                  onClick={() => {
                    setAmountPaidInput(grandTotal.toString());
                    setActiveScreen('payment');
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950"
                >
                  <span>Lanjut Pembayaran ({formatRupiah(grandTotal)})</span>
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN C: FAST PAYMENT SCREEN WITH INTEGRATED NUMPAD         */}
        {/* ============================================================ */}
        {activeScreen === 'payment' && (
          <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
            {/* Payment Method Selector */}
            <div className="p-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'cash', label: 'Tunai', icon: Banknote },
                  { id: 'qris', label: 'QRIS', icon: QrCode },
                  { id: 'transfer', label: 'Transfer', icon: CreditCard },
                  { id: 'debit', label: 'Debit', icon: CreditCard },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(m.id as PaymentMethod);
                        if (m.id !== 'cash') {
                          setAmountPaidInput(grandTotal.toString());
                        }
                      }}
                      className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition text-center ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/80'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-slate-950' : 'text-slate-400'}`} />
                      <span className="text-[10px]">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Total & Nominal Display Box */}
            <div className="p-3 bg-slate-950/60 border-b border-slate-800 shrink-0 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-semibold">Total Tagihan:</span>
                <span className="text-emerald-400 font-black font-mono text-base">
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              {paymentMethod === 'cash' && (
                <>
                  <div className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-bold">Uang Diterima:</span>
                    <span className="text-lg font-black font-mono text-white tracking-wider">
                      {amountPaidInput ? formatRupiah(Number(amountPaidInput)) : 'Rp 0'}
                    </span>
                  </div>

                  {/* Change / Kembalian Banner */}
                  <div className="flex justify-between items-center text-xs px-1">
                    <span className="text-slate-400">Kembalian:</span>
                    <span
                      className={`font-black font-mono text-sm ${
                        isInsufficient ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {isInsufficient
                        ? `Kurang ${formatRupiah(grandTotal - numericAmountPaid)}`
                        : formatRupiah(changeAmount)}
                    </span>
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
                    {quickCashOptions.map((nom) => (
                      <button
                        key={nom}
                        type="button"
                        onClick={() => handleQuickNominal(nom)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition whitespace-nowrap shrink-0 border ${
                          numericAmountPaid === nom
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {nom === grandTotal ? 'Uang Pas' : formatRupiah(nom)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Optional Customer Name Input */}
            <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama Pelanggan (opsional)..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* FAST INTEGRATED NUMPAD (Tablet POS style for Phone Handheld) */}
            {paymentMethod === 'cash' ? (
              <div className="flex-1 p-2 grid grid-cols-3 gap-1.5 bg-slate-900">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '000'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleNumpadPress(key)}
                    className={`rounded-xl flex items-center justify-center font-black text-base active:scale-95 transition border shadow-xs ${
                      key === 'C'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                        : 'bg-slate-800 hover:bg-slate-750 text-white border-slate-700/80 active:bg-slate-700'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <QrCode className="w-16 h-16 text-emerald-400 mb-3 animate-pulse" />
                <h4 className="font-bold text-sm text-white">
                  Pembayaran Non-Tunai ({paymentMethod.toUpperCase()})
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                  Tagihan senilai{' '}
                  <span className="font-mono font-bold text-emerald-400">
                    {formatRupiah(grandTotal)}
                  </span>{' '}
                  siap diselesaikan.
                </p>
              </div>
            )}

            {/* Bottom Final Pay / Print Struk Action */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
              <button
                type="button"
                disabled={isInsufficient || isProcessing || cart.length === 0}
                onClick={handleFinishTransaction}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-black text-sm transition active:scale-98 flex items-center justify-center gap-2 shadow-xl shadow-emerald-950"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>
                  {isProcessing
                    ? 'Memproses...'
                    : `Selesaikan & Cetak Struk (${formatRupiah(grandTotal)})`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
