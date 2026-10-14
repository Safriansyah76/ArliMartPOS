import React, { useState, useMemo } from 'react';
import { Product, Transaction, StoreProfile } from '../types';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Package,
  AlertTriangle,
  ArrowUpRight,
  Receipt,
  Calendar,
  Layers,
  Sparkles,
  Plus,
  FileSpreadsheet,
} from 'lucide-react';

interface DashboardViewProps {
  products: Product[];
  transactions: Transaction[];
  profile: StoreProfile;
  onNavigateTab: (tab: 'cashier' | 'inventory' | 'reports') => void;
  onSelectTransaction: (tx: Transaction) => void;
  onQuickRestock: (productId: string) => void;
}

type PeriodFilter = 'today' | '7days' | 'month' | 'all';

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  transactions,
  profile,
  onNavigateTab,
  onSelectTransaction,
  onQuickRestock,
}) => {
  const [period, setPeriod] = useState<PeriodFilter>('today');

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  // Filter transactions by period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((tx) => {
      const txDate = new Date(tx.timestamp);
      if (period === 'today') {
        return (
          txDate.getDate() === now.getDate() &&
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      }
      if (period === '7days') {
        const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (period === 'month') {
        return (
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }, [transactions, period]);

  // Aggregate Metrics
  const totalRevenue = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + t.grandTotal, 0);
  }, [filteredTransactions]);

  const totalProfit = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + t.profit, 0);
  }, [filteredTransactions]);

  const totalTransactionsCount = filteredTransactions.length;

  const totalItemsSold = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + t.totalItems, 0);
  }, [filteredTransactions]);

  const inventoryValuation = useMemo(() => {
    return products.reduce((acc, p) => acc + p.stock * p.buyPrice, 0);
  }, [products]);

  const potentialRevenue = useMemo(() => {
    return products.reduce((acc, p) => acc + p.stock * p.sellPrice, 0);
  }, [products]);

  // Low stock products alert
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock <= p.minStock);
  }, [products]);

  // Top selling products in selected period
  const topSellingProducts = useMemo(() => {
    const map = new Map<string, { name: string; category: string; quantity: number; revenue: number }>();
    filteredTransactions.forEach((tx) => {
      tx.items.forEach((it) => {
        const cur = map.get(it.product.id) || {
          name: it.product.name,
          category: it.product.category,
          quantity: 0,
          revenue: 0,
        };
        cur.quantity += it.quantity;
        cur.revenue += it.subtotal;
        map.set(it.product.id, cur);
      });
    });

    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredTransactions]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {
      cash: { count: 0, total: 0 },
      qris: { count: 0, total: 0 },
      transfer: { count: 0, total: 0 },
      debit: { count: 0, total: 0 },
    };

    filteredTransactions.forEach((t) => {
      if (counts[t.paymentMethod]) {
        counts[t.paymentMethod].count += 1;
        counts[t.paymentMethod].total += t.grandTotal;
      }
    });

    return counts;
  }, [filteredTransactions]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Welcome & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Dashboard Ringkasan Toko
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Aktif Realtime
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantau arus kas penjualan, estimasi laba kotor, dan ketersediaan stok produk Anda
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-sm self-start md:self-auto">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: '7days', label: '7 Hari' },
            { id: 'month', label: 'Bulan Ini' },
            { id: 'all', label: 'Semua Waktu' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id as PeriodFilter)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                period === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI 4-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Omset / Penjualan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Penjualan
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatRupiah(totalRevenue)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
            <span className="font-semibold text-emerald-600">{totalTransactionsCount}</span> transaksi
            <span className="text-slate-300">•</span>
            <span>{totalItemsSold} item terjual</span>
          </div>
        </div>

        {/* Laba Bersih */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Estimasi Laba Bersih
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-700">
            {formatRupiah(totalProfit)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Margin:{' '}
            <span className="font-semibold text-slate-700">
              {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) + '%' : '0%'}
            </span>{' '}
            dari omset
          </div>
        </div>

        {/* Total Nilai Aset Stok */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Nilai Aset Stok
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatRupiah(inventoryValuation)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Potensi omset jual:{' '}
            <span className="font-semibold text-slate-700">{formatRupiah(potentialRevenue)}</span>
          </div>
        </div>

        {/* Total Varian Produk */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Katalog Produk
            </span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {products.length} <span className="text-sm font-medium text-slate-500">Varian</span>
          </div>
          <div className="text-xs mt-2">
            {lowStockProducts.length > 0 ? (
              <span className="font-semibold text-rose-600 inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {lowStockProducts.length} produk butuh restock
              </span>
            ) : (
              <span className="text-emerald-600 font-medium">Semua stok terpantau aman</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Shortcut Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            Siap Melayani Pelanggan?
          </h3>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl">
            Buka menu kasir retail dengan barcode scanner smartphone atau kelola stok produk inventaris toko Anda
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => onNavigateTab('cashier')}
            className="flex-1 sm:flex-initial px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition shadow-sm"
          >
            Buka Kasir (POS)
          </button>
          <button
            onClick={() => onNavigateTab('inventory')}
            className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-800/60 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition border border-white/20"
          >
            Kelola Stok
          </button>
        </div>
      </div>

      {/* 2-Column: Low Stock Alert & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peringatan Stok Menipis */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Peringatan Stok Menipis</h3>
            </div>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1"
            >
              Lihat Semua
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 space-y-2.5">
            {lowStockProducts.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 gap-1">
                <Package className="w-8 h-8 text-emerald-400" />
                <p className="text-xs font-medium text-slate-600">Tidak ada stok yang menipis</p>
                <p className="text-[11px] text-slate-400">Seluruh produk berada di atas batas aman</p>
              </div>
            ) : (
              lowStockProducts.slice(0, 5).map((prod) => (
                <div
                  key={prod.id}
                  className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h5 className="font-semibold text-xs text-slate-900 truncate">{prod.name}</h5>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Kategori: {prod.category} • Min. Stok: {prod.minStock} {prod.unit}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-bold font-mono ${
                        prod.stock <= 0
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {prod.stock <= 0 ? 'Habis (0)' : `Sisa ${prod.stock}`}
                    </span>
                    <button
                      onClick={() => onQuickRestock(prod.id)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 transition"
                      title="Tambah Stok Cepat"
                    >
                      + Tambah
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Produk Terlaris */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Produk Terlaris ({period})</h3>
            </div>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
            >
              Laporan Lengkap
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 space-y-3">
            {topSellingProducts.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 gap-1">
                <ShoppingBag className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-medium text-slate-600">Belum ada transaksi di periode ini</p>
                <p className="text-[11px] text-slate-400">Lakukan transaksi di Kasir untuk melihat tren</p>
              </div>
            ) : (
              topSellingProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h5 className="font-semibold text-xs text-slate-800 truncate">{p.name}</h5>
                      <span className="text-[10px] text-slate-400">{p.category}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">{p.quantity} terjual</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">{formatRupiah(p.revenue)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Feed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Receipt className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Transaksi Terakhir</h3>
          </div>
          <button
            onClick={() => onNavigateTab('reports')}
            className="text-xs font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1"
          >
            Semua Riwayat
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Belum ada data transaksi yang tercatat
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">No. Struk</th>
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Pelanggan</th>
                  <th className="py-2.5 px-3">Metode</th>
                  <th className="py-2.5 px-3 text-right">Total Belanja</th>
                  <th className="py-2.5 px-3 text-right">Laba</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {transactions.slice(0, 5).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{tx.receiptNumber}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(tx.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3">{tx.customerName || 'Umum'}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {formatRupiah(tx.grandTotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                      {formatRupiah(tx.profit)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onSelectTransaction(tx)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition"
                      >
                        Lihat Struk
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
