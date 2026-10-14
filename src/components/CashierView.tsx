import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, CartItem, PaymentMethod, StoreProfile, Transaction } from '../types';
import { storageService } from '../services/storage';
import { playBeep, playSuccessChime, playErrorBeep } from '../utils/audio';
import confetti from 'canvas-confetti';
import {
  Camera,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Flame,
  ChevronDown,
  TrendingUp,
  X,
  Package,
  LayoutGrid,
  List,
  Menu,
  Percent,
  Tag,
  Settings,
  Receipt,
  Check,
  Smartphone,
  Tablet,
} from 'lucide-react';

interface CashierViewProps {
  products: Product[];
  profile: StoreProfile;
  onProfileUpdated?: (updated: StoreProfile) => void;
  onProductsUpdated: () => void;
  onOpenScanner: () => void;
  onTransactionComplete: (tx: Transaction) => void;
  onSwitchToHandheldPos?: () => void;
}

export const CashierView: React.FC<CashierViewProps> = ({
  products,
  profile,
  onProfileUpdated,
  onProductsUpdated,
  onOpenScanner,
  onTransactionComplete,
  onSwitchToHandheldPos,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [showTax, setShowTax] = useState<boolean>(profile.taxEnabled);
  const [currentTaxRate, setCurrentTaxRate] = useState<number>(profile.taxRate);

  // Tax (PPN) Quick Modal state
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [tempTaxRate, setTempTaxRate] = useState<number>(profile.taxRate);
  const [tempTaxEnabled, setTempTaxEnabled] = useState<boolean>(profile.taxEnabled);
  const [taxSaveSuccess, setTaxSaveSuccess] = useState(false);

  // Sync with profile changes
  useEffect(() => {
    setShowTax(profile.taxEnabled);
    setCurrentTaxRate(profile.taxRate);
    setTempTaxRate(profile.taxRate);
    setTempTaxEnabled(profile.taxEnabled);
  }, [profile.taxEnabled, profile.taxRate]);

  // View mode and Menu List state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'default' | 'name-asc' | 'price-asc' | 'price-desc' | 'stock-desc'>('default');
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

  // Dropdown list state for frequently appearing products
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Payment Modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaidInput, setAmountPaidInput] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [txNotes, setTxNotes] = useState('');

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['Semua', ...Array.from(set)];
  }, [products]);

  // Compute frequently appearing / best-selling products from transaction history
  const frequentProducts = useMemo(() => {
    const txs = storageService.getTransactions();
    const frequencyMap = new Map<string, number>();

    txs.forEach((tx) => {
      tx.items.forEach((item) => {
        const current = frequencyMap.get(item.product.id) || 0;
        frequencyMap.set(item.product.id, current + item.quantity);
      });
    });

    // Score all products
    const list = products.map((p) => ({
      product: p,
      salesCount: frequencyMap.get(p.id) || 0,
    }));

    // Sort by salesCount descending
    list.sort((a, b) => b.salesCount - a.salesCount);

    return list.slice(0, 8);
  }, [products]);

  // Dropdown list items (if searching, show matching items; otherwise show top frequent items)
  const dropdownItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return frequentProducts;
    }

    const txs = storageService.getTransactions();
    const frequencyMap = new Map<string, number>();
    txs.forEach((tx) => {
      tx.items.forEach((item) => {
        const current = frequencyMap.get(item.product.id) || 0;
        frequencyMap.set(item.product.id, current + item.quantity);
      });
    });

    const matches = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );

    return matches
      .map((p) => ({
        product: p,
        salesCount: frequencyMap.get(p.id) || 0,
      }))
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, 8);
  }, [searchQuery, products, frequentProducts]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const result = products.filter((p) => {
      const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });

    if (sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'price-asc') {
      result.sort((a, b) => a.sellPrice - b.sellPrice);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.sellPrice - a.sellPrice);
    } else if (sortBy === 'stock-desc') {
      result.sort((a, b) => b.stock - a.stock);
    }

    return result;
  }, [products, searchQuery, selectedCategory, sortBy]);

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  // Add to cart
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      playErrorBeep();
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const currentQty = prevCart[existingIndex].quantity;
        if (currentQty >= product.stock) {
          playErrorBeep();
          return prevCart; // Cannot exceed stock
        }
        playBeep(1200, 0.05);
        const updated = [...prevCart];
        const newQty = currentQty + 1;
        const discountPercent = updated[existingIndex].discountPercent || 0;
        const gross = newQty * product.sellPrice;
        const discountAmount = Math.round((gross * discountPercent) / 100);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          discountPercent,
          discountAmount,
          subtotal: Math.max(0, gross - discountAmount),
        };
        return updated;
      } else {
        playBeep(1200, 0.05);
        return [
          ...prevCart,
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
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stock) {
              playErrorBeep();
              return item;
            }
            if (newQty <= 0) return null;
            const discountPercent = item.discountPercent || 0;
            const gross = newQty * item.product.sellPrice;
            const discountAmount = Math.round((gross * discountPercent) / 100);
            return {
              ...item,
              quantity: newQty,
              discountPercent,
              discountAmount,
              subtotal: Math.max(0, gross - discountAmount),
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Update item-level discount percentage
  const updateItemDiscount = (productId: string, percent: number) => {
    const safePercent = Math.min(100, Math.max(0, percent));
    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (item.product.id === productId) {
          const gross = item.quantity * item.product.sellPrice;
          const discountAmount = Math.round((gross * safePercent) / 100);
          return {
            ...item,
            discountPercent: safePercent,
            discountAmount,
            subtotal: Math.max(0, gross - discountAmount),
          };
        }
        return item;
      });
    });
  };

  const removeItem = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Kosongkan semua barang di keranjang?')) {
      setCart([]);
      setDiscountAmount(0);
    }
  };

  // Cart Totals with item discounts
  const cartGrossSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.product.sellPrice, 0);
  }, [cart]);

  const cartTotalItemDiscounts = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const cartTotalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const effectiveDiscount = Math.min(discountAmount, cartSubtotal);
  const discountedSubtotal = Math.max(0, cartSubtotal - effectiveDiscount);
  const taxAmount = showTax ? Math.round((discountedSubtotal * currentTaxRate) / 100) : 0;
  const grandTotal = discountedSubtotal + taxAmount;

  // Handlers for Tax (PPN) settings from Kasir
  const handleApplyTaxToCurrent = () => {
    setCurrentTaxRate(tempTaxRate);
    setShowTax(tempTaxEnabled);
    setIsTaxModalOpen(false);
  };

  const handleSaveTaxAsDefault = () => {
    const updated: StoreProfile = {
      ...profile,
      taxRate: tempTaxRate,
      taxEnabled: tempTaxEnabled,
    };
    storageService.saveStoreProfile(updated);
    if (onProfileUpdated) {
      onProfileUpdated(updated);
    }
    setCurrentTaxRate(tempTaxRate);
    setShowTax(tempTaxEnabled);
    setTaxSaveSuccess(true);
    setTimeout(() => {
      setTaxSaveSuccess(false);
      setIsTaxModalOpen(false);
    }, 700);
  };

  // Open Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setPaymentMethod('cash');
    setAmountPaidInput(grandTotal.toString());
    setIsPaymentOpen(true);
  };

  // Payment Calculations
  const numericAmountPaid = Number(amountPaidInput) || 0;
  const changeAmount = Math.max(0, numericAmountPaid - grandTotal);
  const isInsufficient = paymentMethod === 'cash' && numericAmountPaid < grandTotal;

  const quickNominals = useMemo(() => {
    const list = [grandTotal];
    [10000, 20000, 50000, 100000, 200000].forEach((nom) => {
      if (nom >= grandTotal && !list.includes(nom)) {
        list.push(nom);
      }
    });
    // Add next clean round if needed
    const nextFifty = Math.ceil(grandTotal / 50000) * 50000;
    if (nextFifty > grandTotal && !list.includes(nextFifty)) list.push(nextFifty);
    return list.slice(0, 5);
  }, [grandTotal]);

  const handleFinishTransaction = () => {
    if (isInsufficient) {
      playErrorBeep();
      return;
    }

    const tx = storageService.recordTransaction(
      cart,
      paymentMethod,
      paymentMethod === 'cash' ? numericAmountPaid : grandTotal,
      effectiveDiscount,
      customerName,
      txNotes,
      showTax ? taxAmount : 0
    );

    // Play chime sound
    playSuccessChime();

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }

    // Reset local state
    setCart([]);
    setDiscountAmount(0);
    setCustomerName('');
    setTxNotes('');
    setIsPaymentOpen(false);

    // Notify parents
    onProductsUpdated();
    onTransactionComplete(tx);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-slate-50">
      {/* LEFT: Product Catalog & Scanner trigger */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-3 sm:p-5 border-r border-slate-200">
        {/* Top Controls: Search Bar with Frequent Products Dropdown & Big Smartphone Scanner Button */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div ref={searchContainerRef} className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              placeholder="Cari produk (nama, barcode, SKU)..."
              className="w-full pl-10 pr-36 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />

            {/* Right inside controls: Clear button and Sering Muncul dropdown toggle button */}
            <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                  isDropdownOpen
                    ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200/80'
                }`}
                title="Daftar produk yang sering muncul & terlaris"
              >
                <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500 animate-pulse" />
                <span className="hidden sm:inline">Sering Muncul</span>
                <ChevronDown
                  className={`w-3 h-3 text-amber-700 transition-transform ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* DROPDOWN LIST FOR FREQUENTLY OCCURRING PRODUCTS */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-fade-in max-h-[380px] flex flex-col">
                {/* Dropdown Header */}
                <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Flame className="w-4 h-4 text-amber-500 fill-amber-400" />
                    <span>
                      {searchQuery
                        ? `Hasil Pencarian (${dropdownItems.length})`
                        : 'Produk yang Sering Muncul & Terlaris'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {searchQuery ? 'Klik untuk pilih / tambah' : 'Berdasarkan frekuensi transaksi'}
                  </span>
                </div>

                {/* Dropdown Items List */}
                <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                  {dropdownItems.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      Tidak ada produk ditemukan
                    </div>
                  ) : (
                    dropdownItems.map(({ product, salesCount }, index) => {
                      const isOutOfStock = product.stock <= 0;
                      const isLowStock = product.stock <= product.minStock && product.stock > 0;

                      return (
                        <div
                          key={product.id}
                          className="p-2.5 sm:p-3 hover:bg-slate-50 transition flex items-center justify-between gap-3 group"
                        >
                          {/* Left: Rank, Name, Category, Barcode */}
                          <div
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                            onClick={() => {
                              setSearchQuery(product.name);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                index === 0
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : index === 1
                                  ? 'bg-slate-200 text-slate-700'
                                  : index === 2
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {index + 1}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-slate-800 group-hover:text-emerald-700 transition truncate">
                                  {product.name}
                                </span>
                                {salesCount > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                    <Flame className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
                                    {salesCount}x terjual
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{product.category}</span>
                                <span>•</span>
                                <span className="font-mono">{product.barcode}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Price, Stock, and Quick Add Button */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="text-right">
                              <div className="font-bold text-xs text-emerald-700 font-mono">
                                {formatRupiah(product.sellPrice)}
                              </div>
                              <div className="text-[10px]">
                                {isOutOfStock ? (
                                  <span className="text-rose-600 font-bold">Habis</span>
                                ) : isLowStock ? (
                                  <span className="text-amber-600 font-semibold">
                                    Sisa {product.stock}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">Stok: {product.stock}</span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                              }}
                              disabled={isOutOfStock}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-1 active:scale-[0.96]"
                              title="Langsung masukkan ke keranjang"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Tambah</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Dropdown Footer Tip */}
                <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>💡 Tip: Klik nama barang untuk filter, atau klik "+ Tambah" untuk beli instan</span>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(false)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsMenuModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap active:scale-[0.98]"
            title="Buka menu list semua produk"
          >
            <Menu className="w-4 h-4 text-emerald-600" />
            <span>Menu List Produk</span>
          </button>

          {onSwitchToHandheldPos && (
            <button
              type="button"
              onClick={onSwitchToHandheldPos}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap active:scale-[0.98]"
              title="Beralih ke Menu POS Simpel Khusus HP / Android POS Z91"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Mode HP Z91</span>
            </button>
          )}

          <button
            onClick={onOpenScanner}
            className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20 transition group whitespace-nowrap"
            title="Buka kamera smartphone untuk scan barcode"
          >
            <Camera className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>Scan Barcode Kamera</span>
          </button>
        </div>

        {/* Category Pills & View Switcher Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-3 border-b border-slate-200/60">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort Dropdown & Grid/List View Mode Switcher */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-600 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs"
            >
              <option value="default">Urutan Standar</option>
              <option value="name-asc">Nama (A-Z)</option>
              <option value="price-asc">Harga Termurah</option>
              <option value="price-desc">Harga Tertinggi</option>
              <option value="stock-desc">Stok Terbanyak</option>
            </select>

            {/* View Mode Toggle: Grid vs List */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Kartu (Grid)"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Tabel Menu List Produk"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Product Display: Grid Mode vs List Mode */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Search className="w-10 h-10 stroke-[1.5]" />
              <p className="text-sm font-medium">Tidak ada produk ditemukan</p>
              <p className="text-xs text-slate-400">Coba ubah kata kunci atau tambah produk baru di menu Inventaris</p>
            </div>
          ) : viewMode === 'list' ? (
            /* MENU LIST / TABLE VIEW */
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Produk</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-right">Harga Jual</th>
                    <th className="py-2.5 px-3 text-center">Stok</th>
                    <th className="py-2.5 px-3 text-center">Aksi Beli</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.map((product) => {
                    const isOutOfStock = product.stock <= 0;
                    const isLowStock = product.stock <= product.minStock && product.stock > 0;
                    const inCartItem = cart.find((i) => i.product.id === product.id);

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-slate-50/80 transition ${
                          inCartItem ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 leading-tight">
                            {product.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {product.barcode} • {product.unit}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-medium">
                          {product.category}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {formatRupiah(product.sellPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                              Habis
                            </span>
                          ) : isLowStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Sisa {product.stock}
                            </span>
                          ) : (
                            <span className="font-mono font-semibold text-slate-700">
                              {product.stock}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {inCartItem ? (
                            <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                              <button
                                onClick={() => updateQuantity(product.id, -1)}
                                className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center font-bold text-xs text-emerald-700">
                                {inCartItem.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(product.id, 1)}
                                disabled={inCartItem.quantity >= product.stock}
                                className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(product)}
                              disabled={isOutOfStock}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded-lg text-xs font-bold transition shadow-xs inline-flex items-center gap-1 active:scale-[0.96]"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tambah</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* GRID VIEW (Product Cards) */
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock <= product.minStock && product.stock > 0;
                const inCartItem = cart.find((i) => i.product.id === product.id);

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`relative bg-white rounded-xl border p-3.5 flex flex-col justify-between transition-all select-none ${
                      isOutOfStock
                        ? 'opacity-60 bg-slate-100/60 border-slate-200 cursor-not-allowed'
                        : 'border-slate-200 hover:border-emerald-400 hover:shadow-md cursor-pointer active:scale-[0.98]'
                    }`}
                  >
                    {/* Cart badge indicator */}
                    {inCartItem && (
                      <div className="absolute -top-2 -right-2 bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                        {inCartItem.quantity}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="truncate max-w-[90px]">{product.category}</span>
                        <span className="font-mono text-[10px]">{product.unit}</span>
                      </div>
                      <h4 className="font-semibold text-slate-800 text-xs sm:text-sm line-clamp-2 leading-snug">
                        {product.name}
                      </h4>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                        {product.barcode}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-end justify-between">
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-emerald-700">
                          {formatRupiah(product.sellPrice)}
                        </div>
                      </div>

                      <div className="text-right">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-700">
                            Habis
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                            Sisa {product.stock}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-500">
                            Stok: {product.stock}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Active Cart Panel */}
      <div className="w-full lg:w-96 xl:w-[410px] bg-white flex flex-col h-auto lg:h-full shadow-lg border-t lg:border-t-0 border-slate-200">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Keranjang Penjualan</h3>
              <p className="text-xs text-slate-500">{cartTotalItems} item terpilih</p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-medium text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:bg-rose-50 px-2 py-1 rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[350px] lg:max-h-none">
          {cart.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400 p-6">
              <ShoppingCart className="w-12 h-12 stroke-[1.2] text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">Keranjang Masih Kosong</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Pilih produk dari katalog atau scan barcode dengan kamera smartphone
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const grossSubtotal = item.quantity * item.product.sellPrice;
              const hasDiscount = (item.discountPercent || 0) > 0;

              return (
                <div
                  key={item.product.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition flex flex-col gap-2.5 shadow-2xs"
                >
                  {/* Top row: Name, unit price, quantity stepper, remove button */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-xs text-slate-800 truncate" title={item.product.name}>
                        {item.product.name}
                      </h5>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        {formatRupiah(item.product.sellPrice)} / {item.product.unit}
                      </div>
                    </div>

                    {/* Stepper +/- */}
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5 shadow-2xs shrink-0">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-slate-200 transition"
                        title="Kurang 1"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-xs text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition"
                        title="Tambah 1"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                      title="Hapus barang dari keranjang"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Middle row: Item-Level Percentage Discount Input & Quick Chips */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-dashed border-slate-100 bg-slate-50/70 p-2 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                        <Percent className="w-3 h-3 text-rose-500" />
                        Diskon:
                      </span>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent !== undefined && item.discountPercent > 0 ? item.discountPercent : ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            updateItemDiscount(item.product.id, val);
                          }}
                          placeholder="0"
                          className="w-13 pl-1.5 pr-4 py-0.5 text-xs text-right font-bold bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono text-rose-700 placeholder:text-slate-400"
                        />
                        <span className="absolute right-1 text-[10px] text-slate-400 font-bold pointer-events-none">%</span>
                      </div>
                    </div>

                    {/* Quick percentage chips */}
                    <div className="flex items-center gap-1">
                      {[5, 10, 20, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => updateItemDiscount(item.product.id, item.discountPercent === pct ? 0 : pct)}
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition ${
                            item.discountPercent === pct
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                      {hasDiscount && (
                        <button
                          type="button"
                          onClick={() => updateItemDiscount(item.product.id, 0)}
                          className="px-1 text-[10px] font-bold text-slate-400 hover:text-rose-600 transition"
                          title="Hapus diskon item"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Bottom row: Item subtotal & Discount calculation feedback */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <div>
                      {hasDiscount ? (
                        <div className="flex items-center gap-1.5">
                          <span className="line-through text-slate-400 text-[11px] font-mono">
                            {formatRupiah(grossSubtotal)}
                          </span>
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100">
                            -{formatRupiah(item.discountAmount || 0)} ({item.discountPercent}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Total item:</span>
                      )}
                    </div>
                    <div className="font-bold text-sm text-emerald-700 font-mono">
                      {formatRupiah(item.subtotal)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Cart Calculation & Action Bar */}
        <div className="p-4 border-t border-slate-200 bg-white space-y-3">
          {/* Discount Nota & Tax Quick Toggles */}
          <div className="flex flex-col gap-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Diskon Nota:</span>
              <div className="relative flex items-center">
                <span className="absolute left-2.5 text-slate-400 font-mono text-[11px]">Rp</span>
                <input
                  type="number"
                  min="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-28 pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-right font-semibold"
                />
              </div>
            </div>

            {/* PPN Switch and Settings Trigger */}
            <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200/80">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showTax}
                  onChange={(e) => setShowTax(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span className="font-semibold text-slate-700 text-xs">
                  PPN ({currentTaxRate}%)
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setTempTaxRate(currentTaxRate);
                  setTempTaxEnabled(showTax);
                  setIsTaxModalOpen(true);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 rounded-lg transition active:scale-95 shadow-2xs"
                title="Buka Pengaturan Pajak (PPN)"
              >
                <Settings className="w-3 h-3 text-emerald-700" />
                <span>Atur PPN</span>
              </button>
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-dashed border-slate-200">
            {cartTotalItemDiscounts > 0 && (
              <>
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal Kotor</span>
                  <span className="font-mono">{formatRupiah(cartGrossSubtotal)}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Total Potongan Item</span>
                  <span className="font-mono">-{formatRupiah(cartTotalItemDiscounts)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between">
              <span>Subtotal Belanja</span>
              <span className="font-mono">{formatRupiah(cartSubtotal)}</span>
            </div>
            {effectiveDiscount > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>Diskon Tambahan Nota</span>
                <span className="font-mono">-{formatRupiah(effectiveDiscount)}</span>
              </div>
            )}
            {showTax && taxAmount > 0 && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-700">PPN ({currentTaxRate}%)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempTaxRate(currentTaxRate);
                      setTempTaxEnabled(showTax);
                      setIsTaxModalOpen(true);
                    }}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-semibold"
                  >
                    Ubah
                  </button>
                </div>
                <span className="font-mono text-emerald-800 font-bold">{formatRupiah(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t border-slate-200">
              <span>Total Bayar</span>
              <span className="text-emerald-700 font-mono">{formatRupiah(grandTotal)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <span>Bayar ({formatRupiah(grandTotal)})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Pembayaran Transaksi</h3>
                <p className="text-xs text-slate-500">Pilih metode pembayaran dan masukkan nominal</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-medium block">Total Tagihan</span>
                <span className="text-lg font-extrabold text-emerald-700">{formatRupiah(grandTotal)}</span>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Payment Methods */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Metode Pembayaran</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'cash', label: 'Tunai (Cash)', icon: Banknote },
                    { id: 'qris', label: 'QRIS', icon: QrCode },
                    { id: 'transfer', label: 'Transfer Bank', icon: CreditCard },
                    { id: 'debit', label: 'Kartu Debit', icon: CreditCard },
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
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition text-center ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20 font-semibold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="text-xs">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash payment specific view */}
              {paymentMethod === 'cash' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Uang Diterima (Rp)
                    </label>
                    <input
                      type="number"
                      autoFocus
                      value={amountPaidInput}
                      onChange={(e) => setAmountPaidInput(e.target.value)}
                      placeholder="Masukkan jumlah uang tunai..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Quick Cash Buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {quickNominals.map((nom) => (
                      <button
                        key={nom}
                        type="button"
                        onClick={() => setAmountPaidInput(nom.toString())}
                        className="px-2.5 py-1 bg-white border border-slate-200 hover:border-emerald-400 rounded-lg text-xs font-medium text-slate-700 transition"
                      >
                        {formatRupiah(nom)}
                      </button>
                    ))}
                  </div>

                  {/* Change calculation */}
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-600">Kembalian:</span>
                    <span
                      className={`text-base font-bold ${
                        isInsufficient ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {isInsufficient
                        ? `Kurang ${formatRupiah(grandTotal - numericAmountPaid)}`
                        : formatRupiah(changeAmount)}
                    </span>
                  </div>
                </div>
              )}

              {/* QRIS specific view */}
              {paymentMethod === 'qris' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
                  <div className="w-40 h-40 mx-auto bg-white p-2 rounded-xl border border-slate-300 shadow-inner flex flex-col items-center justify-center">
                    <QrCode className="w-28 h-28 text-slate-800" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-wider">
                      QRIS STANDAR NASIONAL
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Arahkan pelanggan scan QRIS dengan GoPay, OVO, Dana, ShopeePay, BCA, dll.
                  </p>
                  <div className="text-xs font-bold text-emerald-800 bg-emerald-100 py-1.5 px-3 rounded-lg inline-block">
                    Nominal Pas: {formatRupiah(grandTotal)}
                  </div>
                </div>
              )}

              {/* Transfer specific view */}
              {paymentMethod === 'transfer' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <p className="font-semibold text-slate-700">Rekening Tujuan Toko:</p>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800">BCA: 8820-1234-5678</div>
                    <div className="text-slate-500">A/N: {profile.name}</div>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Pastikan mutasi dana telah masuk ke rekening sebelum menyelesaikan transaksi.
                  </p>
                </div>
              )}

              {/* Debit specific view */}
              {paymentMethod === 'debit' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Mesin EDC Kasir</span>
                  </div>
                  <p className="text-slate-500">
                    Gesek atau masukkan kartu debit/kredit pelanggan pada mesin EDC sebesar{' '}
                    <strong className="text-slate-800">{formatRupiah(grandTotal)}</strong>.
                  </p>
                </div>
              )}

              {/* Optional Customer Name & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nama Pelanggan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Bu Sari"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Catatan Transaksi (Opsional)
                  </label>
                  <input
                    type="text"
                    value={txNotes}
                    onChange={(e) => setTxNotes(e.target.value)}
                    placeholder="e.g. Bungkus kardus"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleFinishTransaction}
                disabled={isInsufficient}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Selesaikan & Cetak Struk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED MENU LIST PRODUK MODAL */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Menu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Menu List Katalog Produk
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih dan tambahkan produk ke keranjang belanja kasir secara cepat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Subheader: Search & Category filter */}
            <div className="p-3 sm:p-4 border-b border-slate-100 bg-white space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ketik nama produk, barcode, atau kategori..."
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Category Pills in modal */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal List Table View */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredProducts.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  Tidak ada produk ditemukan
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Barcode</th>
                        <th className="py-2.5 px-3">Nama Produk</th>
                        <th className="py-2.5 px-3">Kategori</th>
                        <th className="py-2.5 px-3 text-right">Harga Jual</th>
                        <th className="py-2.5 px-3 text-center">Sisa Stok</th>
                        <th className="py-2.5 px-3 text-center">Beli / Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredProducts.map((product) => {
                        const isOutOfStock = product.stock <= 0;
                        const isLowStock = product.stock <= product.minStock && product.stock > 0;
                        const inCartItem = cart.find((i) => i.product.id === product.id);

                        return (
                          <tr
                            key={product.id}
                            className={`hover:bg-slate-50/70 transition ${
                              inCartItem ? 'bg-emerald-50/40' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                              {product.barcode}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {product.name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 font-medium">
                              {product.category}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                              {formatRupiah(product.sellPrice)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isOutOfStock ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                  Habis
                                </span>
                              ) : isLowStock ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Sisa {product.stock}
                                </span>
                              ) : (
                                <span className="font-mono font-semibold text-slate-700">
                                  {product.stock} {product.unit}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {inCartItem ? (
                                <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
                                  <button
                                    onClick={() => updateQuantity(product.id, -1)}
                                    className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 transition"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-6 text-center font-bold text-xs text-emerald-700">
                                    {inCartItem.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(product.id, 1)}
                                    disabled={inCartItem.quantity >= product.stock}
                                    className="w-5 h-5 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => addToCart(product)}
                                  disabled={isOutOfStock}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded-lg text-xs font-bold transition shadow-xs inline-flex items-center gap-1 active:scale-[0.96]"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Beli</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Bottom Footer with Live Cart Preview */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-600 flex items-center gap-2">
                <span className="font-semibold text-slate-800">
                  Keranjang Saat Ini: {cartTotalItems} item
                </span>
                <span>•</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuModalOpen(false)}
                className="w-full sm:w-auto px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                Selesai & Tutup Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PENGATURAN PAJAK (PPN) KASIR MODAL */}
      {isTaxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Pengaturan Pajak (PPN)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atur tarif pajak kasir dan otomatisasi tagihan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTaxModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {taxSaveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Pengaturan PPN berhasil disimpan sebagai default toko!</span>
                </div>
              )}

              {/* Status Switcher */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-800">Status Pajak PPN</div>
                  <div className="text-[11px] text-slate-500">
                    {tempTaxEnabled ? 'Pajak aktif pada kasir' : 'Pajak dinonaktifkan (bebas PPN)'}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempTaxEnabled}
                    onChange={(e) => setTempTaxEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Percentage Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Persentase Pajak PPN (%)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={tempTaxRate}
                    onChange={(e) => setTempTaxRate(Math.max(0, Math.min(100, Number(e.target.value))))}
                    className="w-full pl-3 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                    placeholder="Contoh: 11"
                  />
                  <span className="absolute right-3.5 font-bold text-slate-400 text-sm">%</span>
                </div>
              </div>

              {/* Preset Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Pilihan Cepat Tarif:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '0%', desc: 'Tanpa PPN', rate: 0, enabled: false },
                    { label: '10%', desc: 'PB1 / Resto', rate: 10, enabled: true },
                    { label: '11%', desc: 'PPN Standar', rate: 11, enabled: true },
                    { label: '12%', desc: 'PPN 2025', rate: 12, enabled: true },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setTempTaxRate(preset.rate);
                        setTempTaxEnabled(preset.enabled);
                      }}
                      className={`p-2 rounded-xl text-center border transition flex flex-col items-center justify-center ${
                        tempTaxRate === preset.rate && tempTaxEnabled === preset.enabled
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="font-extrabold text-xs">{preset.label}</span>
                      <span className="text-[9px] opacity-80 leading-tight mt-0.5">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60 space-y-2 text-xs">
                <div className="font-bold text-emerald-950 flex items-center justify-between">
                  <span>Simulasi Perhitungan Tagihan:</span>
                  <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                    {tempTaxEnabled ? `Aktif (${tempTaxRate}%)` : 'Non-aktif (0%)'}
                  </span>
                </div>

                <div className="space-y-1 text-slate-600 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal Belanja Kasir:</span>
                    <span className="font-mono">{formatRupiah(discountedSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>Pajak PPN ({tempTaxEnabled ? tempTaxRate : 0}%):</span>
                    <span className="font-mono">
                      +{formatRupiah(tempTaxEnabled ? Math.round((discountedSubtotal * tempTaxRate) / 100) : 0)}
                    </span>
                  </div>
                  <div className="flex justify-between font-extrabold text-slate-900 pt-1 border-t border-emerald-200/80 text-xs">
                    <span>Total Tagihan Baru:</span>
                    <span className="text-emerald-700 font-mono">
                      {formatRupiah(
                        discountedSubtotal +
                          (tempTaxEnabled ? Math.round((discountedSubtotal * tempTaxRate) / 100) : 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsTaxModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyTaxToCurrent}
                className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition shadow-2xs"
                title="Terapkan hanya untuk transaksi saat ini"
              >
                Terapkan di Transaksi Ini
              </button>
              <button
                type="button"
                onClick={handleSaveTaxAsDefault}
                className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 active:scale-98"
                title="Simpan pengaturan ini sebagai default toko"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Default Toko</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
