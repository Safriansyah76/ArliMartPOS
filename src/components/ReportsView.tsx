import React, { useState, useMemo } from 'react';
import { Product, Transaction, StoreProfile } from '../types';
import { exportToGoogleSheets, ExportResult } from '../services/googleSheets';
import { getAccessToken, googleSignIn } from '../services/auth';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  Search,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  RotateCw,
  ShoppingBag,
  Filter,
} from 'lucide-react';

interface ReportsViewProps {
  transactions: Transaction[];
  products: Product[];
  profile: StoreProfile;
  onSelectTransaction: (tx: Transaction) => void;
  googleUser: unknown | null;
  onRequireGoogleSignIn: () => Promise<string | null>;
}

type PeriodChoice = 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'all';

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  products,
  profile,
  onSelectTransaction,
  googleUser,
  onRequireGoogleSignIn,
}) => {
  const [period, setPeriod] = useState<PeriodChoice>('month');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [searchReceipt, setSearchReceipt] = useState('');

  // Google Sheets Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportConfirmationOpen, setExportConfirmationOpen] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const formatRupiah = (val: number) => 'Rp ' + val.toLocaleString('id-ID');

  // Filter Transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;

    return transactions.filter((tx) => {
      const txTime = new Date(tx.timestamp).getTime();

      let matchPeriod = true;
      if (period === 'today') {
        matchPeriod = txTime >= todayStart;
      } else if (period === 'yesterday') {
        matchPeriod = txTime >= yesterdayStart && txTime < todayStart;
      } else if (period === '7days') {
        matchPeriod = txTime >= now.getTime() - 7 * 86400000;
      } else if (period === '30days') {
        matchPeriod = txTime >= now.getTime() - 30 * 86400000;
      } else if (period === 'month') {
        const txDate = new Date(tx.timestamp);
        matchPeriod =
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear();
      }

      const matchMethod = selectedMethod === 'all' || tx.paymentMethod === selectedMethod;
      const matchSearch =
        !searchReceipt.trim() ||
        tx.receiptNumber.toLowerCase().includes(searchReceipt.toLowerCase()) ||
        (tx.customerName && tx.customerName.toLowerCase().includes(searchReceipt.toLowerCase()));

      return matchPeriod && matchMethod && matchSearch;
    });
  }, [transactions, period, selectedMethod, searchReceipt]);

  // Aggregate Metrics
  const summary = useMemo(() => {
    const revenue = filteredTransactions.reduce((acc, t) => acc + t.grandTotal, 0);
    const cost = filteredTransactions.reduce((acc, t) => acc + t.totalCost, 0);
    const profit = filteredTransactions.reduce((acc, t) => acc + t.profit, 0);
    const count = filteredTransactions.length;
    const aov = count > 0 ? Math.round(revenue / count) : 0;
    const totalItems = filteredTransactions.reduce((acc, t) => acc + t.totalItems, 0);
    const totalDiscounts = filteredTransactions.reduce((acc, t) => acc + t.discount, 0);

    return { revenue, cost, profit, count, aov, totalItems, totalDiscounts };
  }, [filteredTransactions]);

  // Product sales performance table
  const productPerformance = useMemo(() => {
    const map = new Map<string, { name: string; category: string; count: number; revenue: number; profit: number }>();
    filteredTransactions.forEach((tx) => {
      tx.items.forEach((it) => {
        const cur = map.get(it.product.id) || {
          name: it.product.name,
          category: it.product.category,
          count: 0,
          revenue: 0,
          profit: 0,
        };
        const itemProfit = it.subtotal - it.product.buyPrice * it.quantity;
        cur.count += it.quantity;
        cur.revenue += it.subtotal;
        cur.profit += itemProfit;
        map.set(it.product.id, cur);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredTransactions]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'No. Struk',
      'Waktu Transaksi',
      'Pelanggan',
      'Metode Bayar',
      'Jumlah Item',
      'Subtotal',
      'Diskon',
      'Total Akhir',
      'HPP Modal',
      'Laba Bersih',
    ];
    const rows = filteredTransactions.map((tx) => [
      `"${tx.receiptNumber}"`,
      `"${new Date(tx.timestamp).toLocaleString('id-ID')}"`,
      `"${(tx.customerName || 'Umum').replace(/"/g, '""')}"`,
      `"${tx.paymentMethod.toUpperCase()}"`,
      tx.totalItems,
      tx.subtotal,
      tx.discount,
      tx.grandTotal,
      tx.totalCost,
      tx.profit,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Penjualan_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Google Sheets Export confirmation dialog
  const promptExportGoogleSheets = () => {
    setExportError(null);
    setExportConfirmationOpen(true);
  };

  // Perform actual export to Google Sheets
  const confirmExecuteExport = async () => {
    setExportConfirmationOpen(false);
    setIsExporting(true);
    setExportError(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        token = await onRequireGoogleSignIn();
      }

      if (!token) {
        throw new Error('Autentikasi Google diperlukan untuk mengekspor ke Google Sheets.');
      }

      const result = await exportToGoogleSheets(
        token,
        profile,
        filteredTransactions,
        products
      );
      setExportResult(result);
    } catch (err: unknown) {
      console.error('Google Sheets Export failed:', err);
      setExportError(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat mengekspor ke Google Sheets'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Laporan Keuangan & Penjualan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Analisis omset, margin keuntungan bersih, rekap transaksi, dan ekspor ke Google Sheets
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Ekspor CSV
          </button>
          <button
            onClick={promptExportGoogleSheets}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition"
          >
            {isExporting ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>Ekspor ke Google Sheets</span>
          </button>
        </div>
      </div>

      {/* Google Sheets Export Result Banner */}
      {exportResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-emerald-900">
                Berhasil Diekspor ke Google Sheets!
              </h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                Dokumen: <strong className="font-semibold">{exportResult.title}</strong>
              </p>
            </div>
          </div>
          <a
            href={exportResult.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <span>Buka Google Sheets</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Export Error Banner */}
      {exportError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-800 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{exportError}</span>
          </div>
          <button
            onClick={() => setExportError(null)}
            className="text-xs font-bold text-rose-600 hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Period Selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: 'yesterday', label: 'Kemarin' },
            { id: '7days', label: '7 Hari' },
            { id: '30days', label: '30 Hari' },
            { id: 'month', label: 'Bulan Ini' },
            { id: 'all', label: 'Semua' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id as PeriodChoice)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                period === t.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Method & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700 font-medium"
          >
            <option value="all">Semua Metode Bayar</option>
            <option value="cash">Tunai (Cash)</option>
            <option value="qris">QRIS</option>
            <option value="transfer">Transfer Bank</option>
            <option value="debit">Kartu Debit</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchReceipt}
              onChange={(e) => setSearchReceipt(e.target.value)}
              placeholder="Cari no struk/pelanggan..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Omset */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Omset</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatRupiah(summary.revenue)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Dari {summary.count} transaksi ({summary.totalItems} barang)
          </div>
        </div>

        {/* HPP Modal */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total HPP (Modal)</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-700">
            {formatRupiah(summary.cost)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Biaya modal barang pokok terjual
          </div>
        </div>

        {/* Laba Bersih */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Laba Bersih</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-700">
            {formatRupiah(summary.profit)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Margin:{' '}
            <strong className="text-slate-800">
              {summary.revenue > 0 ? ((summary.profit / summary.revenue) * 100).toFixed(1) + '%' : '0%'}
            </strong>
          </div>
        </div>

        {/* Rata-rata transaksi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Rata-rata Transaksi</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatRupiah(summary.aov)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Rata-rata belanja per struk
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Daftar Transaksi ({filteredTransactions.length} Struk)
          </h3>
          <span className="text-xs text-slate-400">Klik 'Lihat Struk' untuk cetak ulang</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">No. Struk</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Metode Bayar</th>
                <th className="py-3 px-4 text-center">Item</th>
                <th className="py-3 px-4 text-right">Total Belanja</th>
                <th className="py-3 px-4 text-right">Laba</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada transaksi pada filter periode ini
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {tx.receiptNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(tx.timestamp).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4">{tx.customerName || 'Umum'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">{tx.totalItems}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                      {formatRupiah(tx.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600 font-mono">
                      {formatRupiah(tx.profit)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => onSelectTransaction(tx)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold transition"
                          title="Buka struk & opsi cetak"
                        >
                          Lihat Struk
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Contribution Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h3 className="font-bold text-slate-900 text-sm mb-3">
          Performa Penjualan Tiap Produk ({productPerformance.length} Produk Terjual)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Nama Produk</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3 text-center">Jumlah Terjual</th>
                <th className="py-2.5 px-3 text-right">Kontribusi Omset</th>
                <th className="py-2.5 px-3 text-right">Kontribusi Laba</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {productPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Belum ada data barang terjual
                  </td>
                </tr>
              ) : (
                productPerformance.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{item.name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{item.category}</td>
                    <td className="py-2.5 px-3 text-center font-bold">{item.count}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                      {formatRupiah(item.revenue)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 font-mono">
                      {formatRupiah(item.profit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMATION DIALOG FOR GOOGLE SHEETS EXPORT (MANDATORY PER WORKSPACE SKILL) */}
      {exportConfirmationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-100 text-emerald-700">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Ekspor ke Google Sheets</h3>
                <p className="text-xs text-slate-500">Konfirmasi sinkronisasi data ke Google Drive Anda</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">
                Aplikasi akan membuat spreadsheet baru dengan data berikut:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>
                  <strong>{filteredTransactions.length} transaksi penjualan</strong> terpilih (Total Omset:{' '}
                  {formatRupiah(summary.revenue)})
                </li>
                <li>
                  <strong>{products.length} katalog inventaris stok barang</strong> lengkap dengan harga modal dan harga jual
                </li>
                <li>Ringkasan keuangan dan estimasi laba bersih toko</li>
              </ul>
            </div>

            <p className="text-[11px] text-slate-500">
              Data akan diekspor dengan izin dari akun Google Anda. Tidak ada data yang akan dihapus.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setExportConfirmationOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmExecuteExport}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/20 transition"
              >
                Lanjutkan Ekspor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
