import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Flashlight, AlertCircle, RefreshCw, Barcode, Check } from 'lucide-react';
import { playBeep } from '../utils/audio';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  subtitle?: string;
  placeholderManual?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Barcode Produk',
  subtitle = 'Arahkan kamera smartphone ke kode batang atau QR code',
  placeholderManual = 'Ketik kode barcode manual...',
}) => {
  const [manualCode, setManualCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'html5-barcode-scanner-viewport';
  const isRunningRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && isRunningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      } finally {
        isRunningRef.current = false;
      }
    }
  }, []);

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      const code = decodedText.trim();
      if (!code) return;

      playBeep(1400, 0.08);
      setLastScanned(code);

      // Trigger callback
      onScan(code);

      // Brief visual indicator before reset or close
      setTimeout(() => {
        setLastScanned(null);
      }, 1200);
    },
    [onScan]
  );

  const startScanner = useCallback(async () => {
    setIsStarting(true);
    setErrorMessage(null);
    setLastScanned(null);

    try {
      await stopScanner();

      const element = document.getElementById(scannerContainerId);
      if (!element) return;

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE,
      ];

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport,
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.33,
      };

      // Try environment (rear) camera first
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => handleScanSuccess(decodedText),
          () => {
            // Scanning frame failure callback (ignore noisy frames)
          }
        );
        isRunningRef.current = true;
      } catch {
        // Fallback to any camera
        await html5QrCode.start(
          { facingMode: 'user' },
          config,
          (decodedText) => handleScanSuccess(decodedText),
          () => {}
        );
        isRunningRef.current = true;
      }

      // Check for torch capability
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities?.() as Record<string, unknown> | undefined;
        if (capabilities && Boolean(capabilities['torch'])) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }

      setIsStarting(false);
    } catch (err: unknown) {
      console.error('Failed to start barcode scanner:', err);
      setIsStarting(false);
      const message =
        err instanceof Error
          ? err.message
          : 'Kamera tidak dapat diakses. Pastikan izin kamera aktif atau gunakan input manual.';
      setErrorMessage(message);
    }
  }, [handleScanSuccess, stopScanner]);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal DOM is mounted
      const timer = setTimeout(() => {
        startScanner();
      }, 250);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  const toggleTorch = async () => {
    if (!scannerRef.current || !isRunningRef.current) return;
    try {
      const constraints = {
        advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet],
      };
      await scannerRef.current.applyVideoConstraints(constraints);
      setTorchOn(!torchOn);
    } catch (err) {
      console.warn('Torch toggle not supported on this device', err);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScanSuccess(manualCode.trim());
      setManualCode('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base leading-tight">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative bg-black flex-1 flex flex-col items-center justify-center min-h-[290px] overflow-hidden">
          {/* HTML5 QR Container */}
          <div
            id={scannerContainerId}
            className="w-full h-full min-h-[280px] max-h-[380px] [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          />

          {/* Scanner Overlay Box */}
          {!errorMessage && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="relative w-[280px] h-[180px] rounded-xl border-2 border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                {/* Corner Accents */}
                <span className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                <span className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br" />

                {/* Animated Laser Scan Line */}
                <div className="absolute left-2 right-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse" />
              </div>
              <p className="mt-4 text-xs font-medium text-white/80 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                Arahkan garis ke barcode produk
              </p>
            </div>
          )}

          {/* Loading Indicator */}
          {isStarting && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white gap-3 z-10">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-sm font-medium text-slate-200">Mengaktifkan kamera smartphone...</p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center text-white gap-3 z-10">
              <div className="p-3 rounded-full bg-rose-500/20 text-rose-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-rose-200">Kamera tidak aktif</p>
              <p className="text-xs text-slate-400 max-w-xs">{errorMessage}</p>
              <button
                onClick={startScanner}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Coba Lagi
              </button>
            </div>
          )}

          {/* Flash Scanned Feedback */}
          {lastScanned && (
            <div className="absolute top-4 inset-x-4 bg-emerald-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-3 animate-bounce z-20">
              <div className="p-1 rounded-full bg-white/20">
                <Check className="w-4 h-4 text-white" />
              </div>
              <div className="text-left leading-tight truncate">
                <div className="text-[11px] font-medium text-emerald-100">Barcode Terdeteksi:</div>
                <div className="text-sm font-mono font-bold tracking-wide">{lastScanned}</div>
              </div>
            </div>
          )}

          {/* Torch toggle button */}
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`absolute bottom-3 right-3 p-2.5 rounded-full z-10 backdrop-blur-md transition ${
                torchOn ? 'bg-amber-400 text-slate-900 shadow-lg' : 'bg-black/60 text-white hover:bg-black/80'
              }`}
              title={torchOn ? 'Matikan Senter' : 'Nyalakan Senter'}
            >
              <Flashlight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Manual Barcode Input Fallback */}
        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Barcode className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={placeholderManual}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono placeholder:font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition shadow-sm"
            >
              Kirim
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Dukungan: EAN-13, EAN-8, Code 128, QR Code</span>
            <button
              type="button"
              onClick={startScanner}
              className="text-emerald-600 hover:underline inline-flex items-center gap-1 font-medium"
            >
              <RefreshCw className="w-3 h-3" /> Muat ulang kamera
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
