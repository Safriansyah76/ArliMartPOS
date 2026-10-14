import React, { useState, useMemo } from 'react';
import { Product, StockMovement } from '../types';
import { storageService } from '../services/storage';
import {
  Plus,
  Search,
  Camera,
  Edit,
  Trash2,
  PackagePlus,
  History,
  AlertTriangle,
  Download,
  Filter,
  CheckCircle2,
  X,
  ArrowUpDown,
  Barcode,
} from 'lucide-react';

interface InventoryViewProps {
  products: Product[];
  onProductsUpdated: () => void;
  onOpenScannerForProduct: (callback: (scannedCode: string) => void) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  onProductsUpdated,
  onOpenScannerForProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [barcodeInput, setBarcodeInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('Makanan Instan');
  const [customCategory, setCustomCategory] = useState('');
  const [unitInput, setUnitInput] = useState('pcs');
  const [buyPriceInput, setBuyPriceInput] = useState<number | ''>('');
  const [sellPriceInput, setSellPriceInput] = useState<number | ''>('');
  const [stockInput, setStockInput] = useState<number | ''>('');
  const [minStockInput, setMinStockInput] = useState<number | ''>(5);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick Restock Modal state
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(10);
  const [restockNotes, setRestockNotes] = useState('');

  // Stock Movement History Modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [stockLogs, setStockLogs] = useState<StockMovement[]>([]);

  // Category list
  const existingCategories = useMemo(() => {
    const defaultList = [
      'Makanan Instan',
      'Minuman',
      'Sembako',
      'Snack & Biskuit',
      'Kebersihan',
      'Perlengkapan',
      'Obat & Kesehatan',
      'Lainnya',
    ];
    const set = new Set<string>(defaultList);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchCat = selectedCategory === 'Semua' || p.category === selectedCategory;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);

      let matchStock = true;
      if (stockFilter === 'low') {
        matchStock = p.stock <= p.minStock && p.stock > 0;
      } else if (stockFilter === 'out') {
        matchStock = p.stock <= 0;
      }

      return matchCat && matchQuery && matchStock;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  const openAddModal = () => {
    setEditingProduct(null);
    setBarcodeInput('');
    setNameInput('');
    setCategoryInput('Makanan Instan');
    setCustomCategory('');
    setUnitInput('pcs');
    setBuyPriceInput('');
    setSellPriceInput('');
    setStockInput('');
    setMinStockInput(5);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setBarcodeInput(product.barcode);
    setNameInput(product.name);
    setCategoryInput(product.category);
    setCustomCategory('');
    setUnitInput(product.unit);
    setBuyPriceInput(product.buyPrice);
    setSellPriceInput(product.sellPrice);
    setStockInput(product.stock);
    setMinStockInput(product.minStock);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Smartphone barcode scanner trigger for inventory form
  const handleScanForBarcode = () => {
    onOpenScannerForProduct((scannedCode) => {
      setBarcodeInput(scannedCode);
    });
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const barcode = barcodeInput.trim();
    const name = nameInput.trim();
    const finalCategory = categoryInput === 'Lainnya' && customCategory.trim() ? customCategory.trim() : categoryInput;
    const buyPrice = Number(buyPriceInput) || 0;
    const sellPrice = Number(sellPriceInput) || 0;
    const stock = Number(stockInput) || 0;
    const minStock = Number(minStockInput) || 0;

    if (!barcode) {
      setFormError('Kode Barcode / SKU wajib diisi');
      return;
    }
    if (!name) {
      setFormError('Nama Produk wajib diisi');
      return;
    }
    if (sellPrice <= 0) {
      setFormError('Harga Jual harus lebih besar dari 0');
      return;
    }

    // Check duplicate barcode
    const duplicate = products.find(
      (p) => p.barcode.toLowerCase() === barcode.toLowerCase() && p.id !== editingProduct?.id
    );
    if (duplicate) {
      setFormError(`Barcode sudah digunakan oleh produk "${duplicate.name}"`);
      return;
    }

    if (editingProduct) {
      storageService.updateProduct(editingProduct.id, {
        barcode,
        name,
        category: finalCategory,
        unit: unitInput,
        buyPrice,
        sellPrice,
        stock,
        minStock,
      });
    } else {
      storageService.addProduct({
        barcode,
        name,
        category: finalCategory,
        unit: unitInput,
        buyPrice,
        sellPrice,
        stock,
        minStock,
      });
    }

    setIsModalOpen(false);
    onProductsUpdated();
  };

  const handleDeleteProduct = (product: Product) => {
    if (window.confirm(`Hapus produk "${product.name}" (${product.barcode}) dari inventaris?`)) {
      storageService.deleteProduct(product.id);
      onProductsUpdated();
    }
  };

  const handleApplyRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct || restockAmount === 0) return;

    storageService.adjustStock(restockProduct.id, restockAmount, restockNotes);
    setRestockProduct(null);
    setRestockNotes('');
    onProductsUpdated();
  };

  const openHistory = () => {
    const logs = storageService.getStockMovements();
    setStockLogs(logs);
    setIsHistoryOpen(true);
  };

  const handleExportCSV = () => {
    const headers = [
      'Barcode',
      'Nama Produk',
      'Kategori',
      'Satuan',
      'Harga Beli',
      'Harga Jual',
      'Stok Saat Ini',
      'Min Stok',
      'Estimasi Nilai Stok',
    ];
    const rows = products.map((p) => [
      `"${p.barcode}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.unit}"`,
      p.buyPrice,
      p.sellPrice,
      p.stock,
      p.minStock,
      p.stock * p.buyPrice,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventaris_Stok_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Markup calculation
  const calculatedMarkup = useMemo(() => {
    const buy = Number(buyPriceInput) || 0;
    const sell = Number(sellPriceInput) || 0;
    if (buy <= 0 || sell <= 0) return null;
    const profit = sell - buy;
    const margin = (profit / sell) * 100;
    return { profit, margin };
  }, [buyPriceInput, sellPriceInput]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Inventaris & Manajemen Stok
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola katalog barang, barcode produk, harga beli/jual, dan riwayat mutasi stok
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openHistory}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <History className="w-4 h-4 text-slate-500" />
            Riwayat Stok
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Unduh CSV
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari barcode, nama produk, kategori..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
          >
            <option value="Semua">Semua Kategori</option>
            {existingCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Stock Condition */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                stockFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                stockFilter === 'low' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              Menipis
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition ${
                stockFilter === 'out' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600'
              }`}
            >
              Habis
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Barcode / SKU</th>
                <th className="py-3 px-4">Nama Produk</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">Harga Beli</th>
                <th className="py-3 px-4 text-right">Harga Jual</th>
                <th className="py-3 px-4 text-center">Stok</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada produk yang sesuai kriteria pencarian
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isLow = p.stock <= p.minStock && p.stock > 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">
                        {p.barcode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-400">Satuan: {p.unit}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        {formatRupiah(p.buyPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(p.sellPrice)}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-sm">
                        <span
                          className={
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-slate-800'
                          }
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                            Habis
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Menipis (Min. {p.minStock})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Aman
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setRestockProduct(p);
                              setRestockAmount(10);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                            title="Atur Stok"
                          >
                            + Stok
                          </button>
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="Edit Produk"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL (With smartphone barcode scanner integration) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[95vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingProduct ? 'Edit Data Produk' : 'Tambah Produk Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Barcode input with Smartphone Scanner Button */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Barcode / SKU <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder="e.g. 899999901001"
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleScanForBarcode}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    title="Buka kamera smartphone untuk scan barcode"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Scan Kamera</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Scan kemasan fisik dengan kamera smartphone atau ketik manual.
                </p>
              </div>

              {/* Nama Produk */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Produk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Minyak Goreng Bimoli 1 Liter"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Kategori & Satuan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {existingCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Satuan Unit
                  </label>
                  <input
                    type="text"
                    value={unitInput}
                    onChange={(e) => setUnitInput(e.target.value)}
                    placeholder="pcs, botol, sachet, kg..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Harga Beli (HPP) & Harga Jual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Beli / Modal (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={buyPriceInput}
                    onChange={(e) => setBuyPriceInput(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 15000"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Jual (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={sellPriceInput}
                    onChange={(e) => setSellPriceInput(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 18000"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Calculated Margin Info */}
              {calculatedMarkup && (
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex justify-between">
                  <span>Keuntungan / Laba per Unit:</span>
                  <span className="font-bold">
                    {formatRupiah(calculatedMarkup.profit)} ({calculatedMarkup.margin.toFixed(1)}%)
                  </span>
                </div>
              )}

              {/* Stok & Batas Minimum */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stok Saat Ini
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockInput}
                    onChange={(e) => setStockInput(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 25"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batas Peringatan Min. Stok
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minStockInput}
                    onChange={(e) => setMinStockInput(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 5"
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-md shadow-emerald-600/20"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK RESTOCK / ADJUST STOK MODAL */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Penyesuaian Stok</h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">{restockProduct.name}</p>
              </div>
              <button
                onClick={() => setRestockProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyRestock} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between text-xs text-slate-600">
                <span>Stok Sekarang:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {restockProduct.stock} {restockProduct.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Perubahan Jumlah (+/-)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    value={restockAmount}
                    onChange={(e) => setRestockAmount(Number(e.target.value))}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setRestockAmount(10)}
                      className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-semibold"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestockAmount(50)}
                      className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-semibold"
                    >
                      +50
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Stok setelah penyesuaian: <strong>{Math.max(0, restockProduct.stock + restockAmount)}</strong>{' '}
                  {restockProduct.unit}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan / Catatan
                </label>
                <input
                  type="text"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  placeholder="e.g. Pasokan dari Supplier A"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm"
                >
                  Terapkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK HISTORY LOG MODAL */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-slate-900 text-sm">Riwayat Mutasi & Perubahan Stok</h3>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {stockLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada catatan mutasi stok
                </div>
              ) : (
                <div className="space-y-2">
                  {stockLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900">{log.productName}</span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {log.notes} • {new Date(log.timestamp).toLocaleString('id-ID')}
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                            log.type === 'in'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.type === 'sale'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {log.type === 'in' ? `+${log.quantity}` : `-${log.quantity}`}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          {log.previousStock} &rarr; {log.newStock}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
