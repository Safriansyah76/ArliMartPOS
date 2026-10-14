import React, { useState, useEffect, useCallback } from 'react';
import { Product, Transaction, StoreProfile } from './types';
import { storageService } from './services/storage';
import { initAuth, googleSignIn, logout, getAccessToken } from './services/auth';
import { User } from 'firebase/auth';
import { DashboardView } from './components/DashboardView';
import { CashierView } from './components/CashierView';
import { InventoryView } from './components/InventoryView';
import { ReportsView } from './components/ReportsView';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { ReceiptModal } from './components/ReceiptModal';
import { SettingsModal } from './components/SettingsModal';
import { HandheldZ91POS } from './components/HandheldZ91POS';
import { playBeep, playErrorBeep } from './utils/audio';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  BarChart3,
  Camera,
  Settings,
  Wifi,
  WifiOff,
  Store,
  Sparkles,
  FileSpreadsheet,
  Smartphone,
  Tablet,
} from 'lucide-react';

type ActiveTab = 'dashboard' | 'cashier' | 'inventory' | 'reports';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('cashier');
  // POS Device Mode: 'handheld' (optimized for Android POS Z91 & Smartphone) or 'desktop' (wide tablet/desktop)
  const [posDeviceMode, setPosDeviceMode] = useState<'handheld' | 'desktop'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024 ? 'handheld' : 'desktop';
    }
    return 'handheld';
  });

  // Core Data
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<StoreProfile>(storageService.getStoreProfile());

  // Online / Offline Status
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Google Auth User
  const [googleUser, setGoogleUser] = useState<User | null>(null);

  // Modals
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTargetMode, setScannerTargetMode] = useState<'cashier' | 'inventory'>('cashier');
  const [inventoryScanCallback, setInventoryScanCallback] = useState<((code: string) => void) | null>(null);

  const [activeReceiptTx, setActiveReceiptTx] = useState<Transaction | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Reload data from local storage
  const reloadData = useCallback(() => {
    setProducts(storageService.getProducts());
    setTransactions(storageService.getTransactions());
    setProfile(storageService.getStoreProfile());
  }, []);

  // Initialize data and listeners
  useEffect(() => {
    reloadData();

    // Online / Offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Google Auth listener
    const unsubscribeAuth = initAuth(
      (user) => {
        setGoogleUser(user);
      },
      () => {
        setGoogleUser(null);
      }
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [reloadData]);

  // Handle Google Sign In
  const handleGoogleSignIn = async (): Promise<string | null> => {
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        showToast(`Tersambung ke Google: ${res.user.displayName || res.user.email}`);
        return res.accessToken;
      }
      return null;
    } catch (err: unknown) {
      console.error('Google Sign-In failed:', err);
      showToast('Gagal masuk ke akun Google');
      return null;
    }
  };

  // Scanner Handlers
  const handleOpenScannerForCashier = () => {
    setScannerTargetMode('cashier');
    setInventoryScanCallback(null);
    setScannerOpen(true);
  };

  const handleOpenScannerForProduct = (callback: (scannedCode: string) => void) => {
    setScannerTargetMode('inventory');
    setInventoryScanCallback(() => callback);
    setScannerOpen(true);
  };

  const handleBarcodeScanned = (barcode: string) => {
    if (scannerTargetMode === 'inventory' && inventoryScanCallback) {
      inventoryScanCallback(barcode);
      setScannerOpen(false);
      showToast(`Barcode ${barcode} berhasil dimasukkan!`);
      return;
    }

    // Cashier Mode
    const found = storageService.findProductByBarcode(barcode);
    if (found) {
      if (found.stock <= 0) {
        playErrorBeep();
        showToast(`Stok "${found.name}" sedang habis!`);
      } else {
        playBeep(1400, 0.08);
        showToast(`Berhasil scan: ${found.name}`);
        // Ensure cashier tab is active
        setActiveTab('cashier');
        // Close scanner after detection in mobile or keep open for continuous scanning?
        // Close on single scan so cashier cart is immediately interactive
        setScannerOpen(false);
      }
    } else {
      playErrorBeep();
      showToast(`Barcode "${barcode}" belum terdaftar di inventaris`);
    }
  };

  // Handle Transaction Completion
  const handleTransactionComplete = (tx: Transaction) => {
    reloadData();
    setActiveReceiptTx(tx);
  };

  // Quick Restock from Dashboard
  const handleQuickRestock = (productId: string) => {
    storageService.adjustStock(productId, 10, 'Restock cepat dari dashboard');
    reloadData();
    showToast('Stok berhasil ditambahkan +10');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 text-slate-800 font-sans antialiased overflow-hidden">
      {/* GLOBAL NAVBAR */}
      <header className="bg-white border-b border-slate-200 z-30 shrink-0 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand & Store Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight leading-none">
                  {profile.name}
                </span>
                {/* Online / Offline Status Badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isOnline
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                  title={isOnline ? 'Terhubung Internet' : 'Mode Offline Aktif (Data tetap tersimpan di perangkat)'}
                >
                  {isOnline ? (
                    <>
                      <Wifi className="w-3 h-3 text-emerald-600" />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-amber-700" />
                      <span>Offline</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                Sistem Kasir & Inventaris Retail Offline-First
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'cashier', label: 'Kasir (POS)', icon: ShoppingCart },
              { id: 'inventory', label: 'Inventaris Stok', icon: Boxes },
              { id: 'reports', label: 'Laporan Penjualan', icon: BarChart3 },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons: Mode Switcher, Scanner Quick Button & Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Switcher between Handheld Z91 & Wide Tablet mode */}
            {activeTab === 'cashier' && (
              <button
                type="button"
                onClick={() =>
                  setPosDeviceMode((prev) => (prev === 'handheld' ? 'desktop' : 'handheld'))
                }
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                  posDeviceMode === 'handheld'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
                title={
                  posDeviceMode === 'handheld'
                    ? 'Mode Kasir HP POS Z91 aktif (Klik untuk beralih ke Tablet/Desktop)'
                    : 'Mode Kasir Tablet/Desktop aktif (Klik untuk beralih ke HP POS Z91)'
                }
              >
                {posDeviceMode === 'handheld' ? (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden xs:inline">Mode Z91</span>
                  </>
                ) : (
                  <>
                    <Tablet className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden xs:inline">Mode Tablet</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleOpenScannerForCashier}
              className="p-2 sm:px-3 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
              title="Buka Kamera Barcode Scanner Smartphone"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Scan Barcode</span>
            </button>

            {/* Google Sheets Account Indicator */}
            {googleUser ? (
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition"
                title={`Tersambung ke Google Sheets: ${googleUser.email}`}
              >
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {googleUser.displayName?.charAt(0) || 'G'}
                </div>
                <span className="hidden xl:inline max-w-[120px] truncate text-slate-700">
                  {googleUser.displayName?.split(' ')[0] || 'Google'}
                </span>
              </button>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 transition"
                title="Hubungkan ke Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Google Sheets</span>
              </button>
            )}

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              title="Pengaturan Toko & Backup"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === 'dashboard' && (
          <DashboardView
            products={products}
            transactions={transactions}
            profile={profile}
            onNavigateTab={setActiveTab}
            onSelectTransaction={(tx) => setActiveReceiptTx(tx)}
            onQuickRestock={handleQuickRestock}
          />
        )}

        {activeTab === 'cashier' && (
          posDeviceMode === 'handheld' ? (
            <HandheldZ91POS
              products={products}
              profile={profile}
              onProfileUpdated={(updated) => {
                setProfile(updated);
                storageService.saveStoreProfile(updated);
              }}
              onProductsUpdated={reloadData}
              onOpenScanner={handleOpenScannerForCashier}
              onTransactionComplete={handleTransactionComplete}
              onSwitchToFullDesktop={() => setPosDeviceMode('desktop')}
            />
          ) : (
            <CashierView
              products={products}
              profile={profile}
              onProfileUpdated={(updated) => {
                setProfile(updated);
                storageService.saveStoreProfile(updated);
              }}
              onProductsUpdated={reloadData}
              onOpenScanner={handleOpenScannerForCashier}
              onTransactionComplete={handleTransactionComplete}
              onSwitchToHandheldPos={() => setPosDeviceMode('handheld')}
            />
          )
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            products={products}
            onProductsUpdated={reloadData}
            onOpenScannerForProduct={handleOpenScannerForProduct}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            transactions={transactions}
            products={products}
            profile={profile}
            onSelectTransaction={(tx) => setActiveReceiptTx(tx)}
            googleUser={googleUser}
            onRequireGoogleSignIn={handleGoogleSignIn}
          />
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="md:hidden bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-around z-30 shrink-0 print:hidden shadow-lg">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'cashier', label: 'Kasir', icon: ShoppingCart },
          { id: 'inventory', label: 'Stok', icon: Boxes },
          { id: 'reports', label: 'Laporan', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* BARCODE SCANNER MODAL */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title={
          scannerTargetMode === 'inventory'
            ? 'Scan Barcode Fisik Barang'
            : 'Scan Barcode Kasir'
        }
        subtitle={
          scannerTargetMode === 'inventory'
            ? 'Arahkan kamera smartphone ke kode batang kemasan produk'
            : 'Arahkan kamera ke barcode untuk memasukkan barang ke kasir'
        }
      />

      {/* RECEIPT MODAL */}
      <ReceiptModal
        isOpen={!!activeReceiptTx}
        onClose={() => setActiveReceiptTx(null)}
        transaction={activeReceiptTx}
        profile={profile}
      />

      {/* SETTINGS MODAL */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        onProfileUpdated={(updated) => setProfile(updated)}
        onDataReset={reloadData}
        googleUser={googleUser}
        onGoogleSignIn={handleGoogleSignIn}
      />

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-sm border border-white/10 animate-fade-in pointer-events-none">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
