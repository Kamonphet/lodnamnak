import React, { useEffect, useRef, useState } from 'react';
import { Camera, Search, X } from 'lucide-react';

interface DetectedBarcode {
  rawValue?: string;
}

interface BarcodeDetectorInstance {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
}

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  open,
  onClose,
  onDetected,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraStatus, setCameraStatus] = useState<
    'starting' | 'scanning' | 'unsupported' | 'denied'
  >('starting');

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let scanTimer: number | undefined;

    const stopMedia = () => {
      if (scanTimer !== undefined) {
        window.clearInterval(scanTimer);
        scanTimer = undefined;
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
    };

    const startScanner = async () => {
      const DetectorCtor = (
        window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }
      ).BarcodeDetector;

      if (!navigator.mediaDevices?.getUserMedia || !DetectorCtor) {
        if (!cancelled) setCameraStatus('unsupported');
        return;
      }

      try {
        setCameraStatus('starting');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (cancelled) {
          stopMedia();
          return;
        }

        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => undefined);
        }

        const detector = new DetectorCtor({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
        });
        setCameraStatus('scanning');

        scanTimer = window.setInterval(async () => {
          const v = videoRef.current;
          if (!v || v.readyState < 2 || cancelled) return;
          try {
            const results = await detector.detect(v);
            const hit = results
              .map((r) => (r.rawValue ?? '').replace(/[\s-]/g, ''))
              .find((val) => /^\d{8,14}$/.test(val));
            if (hit && !cancelled) {
              cancelled = true;
              stopMedia();
              onDetected(hit);
            }
          } catch {
            // Ignore transient frame errors
          }
        }, 240);
      } catch {
        if (!cancelled) setCameraStatus('denied');
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopMedia();
    };
  }, [open, onDetected]);

  if (!open) return null;

  const cleanDigits = manualCode.replace(/[\s-]/g, '');
  const isManualValid = /^\d{8,14}$/.test(cleanDigits);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isManualValid) return;
    setManualCode('');
    onDetected(cleanDigits);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="สแกนบาร์โค้ดสินค้า"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 glass-modal-backdrop animate-backdrop-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl glass-card p-4 space-y-3.5 animate-modal-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-sage-600" />
            <h2 className="text-base font-bold text-ink-900">บาร์โค้ดสินค้า</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างสแกน"
            className="tactile-btn p-1.5 rounded-full glass-pill text-ink-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {cameraStatus === 'starting' || cameraStatus === 'scanning' ? (
          <div className="relative rounded-2xl overflow-hidden bg-ink-900/90 aspect-[4/3]">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-24 rounded-2xl border-2 border-white/80 pointer-events-none"
            />
            <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full glass-toast px-3 py-1 text-[11px] font-bold text-ink-900">
              {cameraStatus === 'starting' ? 'กำลังเปิดกล้อง...' : 'กำลังสแกน...'}
            </span>
          </div>
        ) : (
          <div className="rounded-2xl glass-subtle px-3.5 py-3 text-xs font-medium text-ink-700 text-center">
            {cameraStatus === 'denied'
              ? 'ไม่ได้รับสิทธิ์ใช้กล้อง · กรอกเลขบาร์โค้ดด้านล่างแทนได้ทันที'
              : 'เบราว์เซอร์นี้ไม่รองรับสแกนสด · กรอกเลขบาร์โค้ดด้านล่าง'}
          </div>
        )}

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="เลขบาร์โค้ด 8–13 หลัก เช่น 8850329183113"
            aria-label="เลขบาร์โค้ด"
            className="flex-1 min-h-[44px] rounded-2xl glass-input px-3.5 text-sm text-ink-900 tabular-data"
          />
          <button
            type="submit"
            disabled={!isManualValid}
            className="tactile-btn min-h-[44px] rounded-2xl glass-btn-primary disabled:opacity-50 px-3.5 text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
          >
            <Search className="w-3.5 h-3.5" />
            <span>ค้นหา</span>
          </button>
        </form>
      </div>
    </div>
  );
};
