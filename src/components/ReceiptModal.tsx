import React, { useState } from 'react';
import { Transaction, StoreProfile } from '../types';
import {
  Printer,
  Copy,
  Check,
  X,
  CheckCircle2,
  ShoppingBag,
  FileDown,
  Bluetooth,
  Smartphone,
  RotateCw,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { printViaWebBluetooth, printViaRawBT } from '../utils/escpos';
import { downloadReceiptPdf, openReceiptPdfPreview } from '../utils/pdfGenerator';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  profile: StoreProfile;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaction,
  profile,
}) => {
  const [copied, setCopied] = useState(false);
  const [bluetoothStatus, setBluetoothStatus] = useState<string | null>(null);
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
  const [bluetoothError, setBluetoothError] = useState<string | null>(null);

  if (!isOpen || !transaction) return null;

  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toLocaleString('id-ID');
  };

  const discountedBase = Math.max(1, transaction.subtotal - transaction.discount);
  const effectiveTaxPct = Math.round((transaction.tax / discountedBase) * 100) || profile.taxRate;

  // 1. Direct Thermal Bluetooth Print (Android POS Z91 / ESC-POS 58mm)
  const handlePrintBluetoothZ91 = async () => {
    setIsBluetoothPrinting(true);
    setBluetoothError(null);
    setBluetoothStatus('Menghubungkan ke printer thermal Z91...');

    try {
      await printViaWebBluetooth(transaction, profile, (status) => {
        setBluetoothStatus(status);
      });
      setTimeout(() => {
        setBluetoothStatus(null);
        setIsBluetoothPrinting(false);
      }, 2500);
    } catch (err: unknown) {
      console.error('Bluetooth Print Error:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal mencetak via Bluetooth. Anda juga dapat menggunakan opsi RawBT atau Cetak Sistem.';
      setBluetoothError(msg);
      setIsBluetoothPrinting(false);
    }
  };

  // 2. RawBT Android Intent (Popular on Z91 Android POS handhelds)
  const handlePrintRawBT = () => {
    try {
      printViaRawBT(transaction, profile);
    } catch (err) {
      console.error('RawBT print error:', err);
      alert('Gagal membuka RawBT intent. Pastikan aplikasi RawBT terpasang di Android POS Z91.');
    }
  };

  // 3. Download PDF
  const handleDownloadPdf = () => {
    downloadReceiptPdf(transaction, profile);
  };

  // 4. Preview PDF in tab
  const handlePreviewPdf = () => {
    openReceiptPdfPreview(transaction, profile);
  };

  // 5. System Print (window.print with 58mm CSS media query)
  const handleSystemPrint = () => {
    window.print();
  };

  // 6. Copy plain text receipt
  const handleCopyText = () => {
    const textReceipt = `
========================================
${profile.name.toUpperCase()}
${profile.address}
Telp: ${profile.phone}
========================================
No. Struk : ${transaction.receiptNumber}
Waktu     : ${new Date(transaction.timestamp).toLocaleString('id-ID')}
Kasir     : Kasir Utama
Pelanggan : ${transaction.customerName || 'Pelanggan Umum'}
Metode    : ${transaction.paymentMethod.toUpperCase()}
----------------------------------------
${transaction.items
  .map(
    (item) =>
      `${item.product.name}\n  ${item.quantity} ${item.product.unit} x ${formatRupiah(item.product.sellPrice)}${
        item.discountPercent && item.discountPercent > 0 ? ` (Disc ${item.discountPercent}%)` : ''
      } = ${formatRupiah(item.subtotal)}`
  )
  .join('\n')}
----------------------------------------
Subtotal     : ${formatRupiah(transaction.subtotal)}
Diskon       : -${formatRupiah(transaction.discount)}
Pajak (PPN ${effectiveTaxPct}%): ${formatRupiah(transaction.tax)}
TOTAL AKHIR  : ${formatRupiah(transaction.grandTotal)}
Jumlah Bayar : ${formatRupiah(transaction.amountPaid)}
Kembalian    : ${formatRupiah(transaction.change)}
========================================
${profile.receiptFooter}
========================================
    `.trim();

    navigator.clipboard.writeText(textReceipt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col my-auto max-h-[95vh]">
        {/* Modal Top Header (Screen Only) */}
        <div className="print:hidden flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-emerald-50">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-semibold text-sm">Transaksi Berhasil Disimpan!</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-emerald-100/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status / Bluetooth Notification Bar */}
        {bluetoothStatus && (
          <div className="print:hidden px-4 py-2 bg-blue-50 border-b border-blue-200 text-blue-800 text-xs flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>{bluetoothStatus}</span>
            </div>
          </div>
        )}

        {bluetoothError && (
          <div className="print:hidden px-4 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{bluetoothError}</span>
            </div>
            <button
              onClick={() => setBluetoothError(null)}
              className="text-xs font-bold text-rose-600 hover:underline shrink-0 ml-2"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Receipt Content Printable Area */}
        <div className="overflow-y-auto p-4 sm:p-6 bg-slate-50 print:bg-white flex-1">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:border-none print:shadow-none font-mono text-xs text-slate-800 mx-auto max-w-sm">
            {/* Header Toko */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-center mb-1 text-emerald-600 print:text-black">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h2 className="font-bold text-base tracking-wide text-slate-900">{profile.name}</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">{profile.address}</p>
              <p className="text-[11px] text-slate-500">Telp: {profile.phone}</p>
            </div>

            {/* Metadata Info */}
            <div className="py-2.5 space-y-1 text-[11px] text-slate-600 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>No. Struk</span>
                <span className="font-bold text-slate-800">{transaction.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu</span>
                <span>{new Date(transaction.timestamp).toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan</span>
                <span>{transaction.customerName || 'Umum'}</span>
              </div>
              <div className="flex justify-between">
                <span>Metode Bayar</span>
                <span className="uppercase font-semibold text-slate-800">{transaction.paymentMethod}</span>
              </div>
            </div>

            {/* Itemized List */}
            <div className="py-2.5 space-y-2 border-b border-dashed border-slate-300">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-medium text-slate-900 truncate">{item.product.name}</div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>
                      {item.quantity} {item.product.unit} x {formatRupiah(item.product.sellPrice)}
                    </span>
                    <span className="font-semibold text-slate-800">{formatRupiah(item.subtotal)}</span>
                  </div>
                  {item.discountPercent !== undefined && item.discountPercent > 0 && (
                    <div className="flex justify-between text-[10px] text-rose-600 font-mono">
                      <span>  Potongan Diskon ({item.discountPercent}%)</span>
                      <span>-{formatRupiah(item.discountAmount || 0)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Calculation Totals */}
            <div className="py-2.5 space-y-1 text-slate-700 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span>Subtotal ({transaction.totalItems} item)</span>
                <span>{formatRupiah(transaction.subtotal)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Diskon Promo</span>
                  <span>-{formatRupiah(transaction.discount)}</span>
                </div>
              )}
              {transaction.tax > 0 && (
                <div className="flex justify-between">
                  <span>PPN ({effectiveTaxPct}%)</span>
                  <span>{formatRupiah(transaction.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>TOTAL AKHIR</span>
                <span className="text-emerald-700">{formatRupiah(transaction.grandTotal)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Jumlah Bayar</span>
                <span>{formatRupiah(transaction.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-900">
                <span>Kembalian</span>
                <span>{formatRupiah(transaction.change)}</span>
              </div>
            </div>

            {/* Footer Struk */}
            <div className="pt-3 text-center text-[10px] text-slate-500 space-y-1">
              <p className="whitespace-pre-line leading-relaxed">{profile.receiptFooter}</p>
              <p className="text-[9px] text-slate-400 mt-2 font-sans">Sistem POS Retail KasirKu</p>
            </div>
          </div>
        </div>

        {/* PRINT OPTIONS TOOLBAR (Screen Only) */}
        <div className="print:hidden p-4 bg-white border-t border-slate-200 space-y-2.5">
          {/* Main 2 Highlight Options: Android POS Z91 Thermal & Print to PDF */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Option 1: Thermal Android POS Z91 */}
            <button
              onClick={handlePrintBluetoothZ91}
              disabled={isBluetoothPrinting}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-[0.98]"
              title="Cetak langsung ke printer thermal bawaan Android POS Z91 via Bluetooth ESC/POS"
            >
              {isBluetoothPrinting ? (
                <RotateCw className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <Bluetooth className="w-4 h-4 text-emerald-400" />
              )}
              <span>Print Thermal Z91 (BT)</span>
            </button>

            {/* Option 2: Print ke PDF */}
            <div className="flex gap-1.5">
              <button
                onClick={handleDownloadPdf}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-[0.98]"
                title="Unduh struk dalam format dokumen PDF 58mm"
              >
                <FileDown className="w-4 h-4" />
                <span>Print ke PDF</span>
              </button>
              <button
                onClick={handlePreviewPdf}
                className="px-2.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs transition"
                title="Pratinjau PDF di tab baru"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Secondary Actions: RawBT Android Intent, System Print, Copy & Finish */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrintRawBT}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                title="Buka via aplikasi RawBT Print service bawaan Android POS"
              >
                <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                <span>RawBT</span>
              </button>

              <button
                onClick={handleSystemPrint}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
                title="Cetak lewat driver print bawaan browser / sistem operasi"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Cetak Sistem</span>
              </button>

              <button
                onClick={handleCopyText}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition ml-auto"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
