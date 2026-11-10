import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  Image as ImageIcon,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { createWorker } from 'tesseract.js';
import {
  evaluateNutritionLabelDecision,
  parseNutritionFactsText,
} from '../domain/labelOcrParser';
import {
  NutritionLabelDecision,
  ParsedNutritionLabel,
  UserProfile,
} from '../domain/types';

interface NutritionLabelScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  remainingCalories: number;
  targetProteinGrams: number;
  consumedProteinGrams: number;
  onConfirmLabel: (label: ParsedNutritionLabel, multiplier: number) => void;
}

type ScanStep = 'camera' | 'ocr_processing' | 'review_decision';

export const NutritionLabelScannerModal: React.FC<NutritionLabelScannerModalProps> = ({
  isOpen,
  onClose,
  profile,
  remainingCalories,
  targetProteinGrams,
  consumedProteinGrams,
  onConfirmLabel,
}) => {
  const [step, setStep] = useState<ScanStep>('camera');
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('กำลังเตรียมระบบอ่านฉลาก...');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [multiplier, setMultiplier] = useState<number>(1);

  // ข้อมูลที่อ่านได้ (Editable)
  const [parsedLabel, setParsedLabel] = useState<ParsedNutritionLabel | null>(null);
  const [decision, setDecision] = useState<NutritionLabelDecision | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // เริ่มสตรีมกล้อง
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้กล้องหรืออัปโหลดภาพแทน');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStep('camera');
      setCapturedImageUrl(null);
      setParsedLabel(null);
      setDecision(null);
      setMultiplier(1);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // ประมวลผลภาพผ่าน Tesseract OCR
  const processImageWithOCR = async (imageSource: string) => {
    setStep('ocr_processing');
    setOcrProgress(5);
    setOcrStatusText('กำลังเชื่อมต่อระบบอ่านตัวอักษร...');

    try {
      const worker = await createWorker('tha+eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
            setOcrStatusText(`กำลังสแกนตัวเลขและข้อความ (${Math.round(m.progress * 100)}%)...`);
          } else {
            setOcrStatusText('กำลังประมวลผลความคมชัดของภาพ...');
          }
        },
      });

      const ret = await worker.recognize(imageSource);
      await worker.terminate();

      const rawText = ret.data.text || '';
      const parsed = parseNutritionFactsText(rawText);

      // รัน Decision Engine
      const dec = evaluateNutritionLabelDecision({
        label: parsed,
        profile,
        remainingDailyCalories: remainingCalories,
        targetProteinGrams,
        consumedProteinGrams,
      });

      setParsedLabel(parsed);
      setDecision(dec);
      setMultiplier(dec.suggestedPortion);
      setStep('review_decision');
    } catch {
      // กรณี OCR ไม่ผ่าน ให้ fallback ให้ผู้ใช้กรอกค่าเอง
      const fallbackParsed = parseNutritionFactsText('');
      const dec = evaluateNutritionLabelDecision({
        label: fallbackParsed,
        profile,
        remainingDailyCalories: remainingCalories,
        targetProteinGrams,
        consumedProteinGrams,
      });
      setParsedLabel(fallbackParsed);
      setDecision(dec);
      setStep('review_decision');
    }
  };

  // ถ่ายภาพจาก Video Frame
  const handleCaptureShutter = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImageUrl(dataUrl);
    stopCamera();
    processImageWithOCR(dataUrl);
  };

  // เลือกภาพจากคลังรูป
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCapturedImageUrl(result);
      stopCamera();
      processImageWithOCR(result);
    };
    reader.readAsDataURL(file);
  };

  // อัปเดตการตัดสินใจเมื่อผู้ใช้แก้ไขตัวเลข
  const handleFieldChange = (field: keyof ParsedNutritionLabel, value: any) => {
    if (!parsedLabel) return;
    const updated = { ...parsedLabel, [field]: value };
    setParsedLabel(updated);
    const updatedDec = evaluateNutritionLabelDecision({
      label: updated,
      profile,
      remainingDailyCalories: remainingCalories,
      targetProteinGrams,
      consumedProteinGrams,
    });
    setDecision(updatedDec);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-ink-900/60 backdrop-blur-md animate-toast-in">
      <div className="w-full max-w-lg bg-surface-primary rounded-3xl shadow-modal overflow-hidden flex flex-col max-h-[92vh] border border-white/60">
        {/* Header */}
        <div className="px-5 py-4 border-b border-sand-100 flex items-center justify-between bg-white/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sage-500/15 flex items-center justify-center text-sage-600">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-900">
                {step === 'review_decision' ? 'ตรวจสอบข้อมูลฉลาก' : 'ถ่ายภาพฉลากโภชนาการ'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-sand-100 text-ink-500"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* STEP 1: หน้ากล้องสด */}
          {step === 'camera' && (
            <div className="space-y-4">
              <div className="relative aspect-[3/4] max-h-[360px] bg-ink-900 rounded-2xl overflow-hidden flex items-center justify-center border border-sand-200">
                {cameraError ? (
                  <div className="p-4 text-center space-y-3 text-white">
                    <AlertTriangle className="w-10 h-10 mx-auto text-sunny-400" />
                    <p className="text-sm font-medium">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sage-500 text-white font-bold text-sm"
                    >
                      <Upload className="w-4 h-4" />
                      เลือกภาพจากเครื่อง
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* กรอบช่วยเล็งถ่ายฉลาก */}
                    <div className="absolute inset-x-8 inset-y-12 border-2 border-dashed border-white/80 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                      <div className="flex justify-between">
                        <span className="w-4 h-4 border-t-2 border-l-2 border-sage-400 rounded-tl" />
                        <span className="w-4 h-4 border-t-2 border-r-2 border-sage-400 rounded-tr" />
                      </div>
                      <div className="text-center text-xs text-white/90 font-semibold bg-ink-900/60 px-3 py-1.5 rounded-full backdrop-blur-sm self-center">
                        จัดตารางโภชนาการให้อยู่ในกรอบ
                      </div>
                      <div className="flex justify-between">
                        <span className="w-4 h-4 border-b-2 border-l-2 border-sage-400 rounded-bl" />
                        <span className="w-4 h-4 border-b-2 border-r-2 border-sage-400 rounded-br" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ปุ่มชัตเตอร์ และปุ่มอัปโหลด */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="tactile-btn p-3.5 rounded-2xl bg-white border border-sand-200 text-ink-700 hover:bg-sand-50"
                  aria-label="อัปโหลดรูปภาพ"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>

                {!cameraError && (
                  <button
                    type="button"
                    onClick={handleCaptureShutter}
                    className="tactile-btn w-16 h-16 rounded-full bg-sage-500 text-white shadow-lg flex items-center justify-center border-4 border-white/80 hover:bg-sage-600"
                    aria-label="ถ่ายภาพ"
                  >
                    <div className="w-12 h-12 rounded-full border-2 border-white/60 flex items-center justify-center">
                      <Camera className="w-6 h-6" />
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={startCamera}
                  className="tactile-btn p-3.5 rounded-2xl bg-white border border-sand-200 text-ink-700 hover:bg-sand-50"
                  aria-label="รีเฟรชกล้อง"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ประมวลผล OCR */}
          {step === 'ocr_processing' && (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 rounded-full border-4 border-sage-100 border-t-sage-500 animate-spin flex items-center justify-center" />
                <div className="absolute inset-0 flex items-center justify-center text-sage-600">
                  <Sparkles className="w-7 h-7 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-ink-900">{ocrStatusText}</h3>
                <p className="text-xs text-ink-500">ระบบกำลังสกัดค่าแคลอรี โปรตีน และส่วนผสมโดยอัตโนมัติ</p>
              </div>
              <div className="w-48 h-2 bg-sand-100 rounded-full mx-auto overflow-hidden">
                <div
                  className="h-full bg-sage-500 transition-all duration-300"
                  style={{ width: `${Math.max(10, ocrProgress)}%` }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: หน้าสรุปผล & ระบบตัดสินใจ (Decision Review) */}
          {step === 'review_decision' && parsedLabel && decision && (
            <div className="space-y-4 animate-card-rise">
              {/* การ์ดคำตัดสินสุขภาพ (Decision Card) */}
              <div
                className={`p-4 rounded-2xl border ${
                  decision.verdict === 'unsafe'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : decision.verdict === 'caution'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : decision.verdict === 'acceptable'
                    ? 'bg-sky-50 border-sky-200 text-sky-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                } space-y-2`}
              >
                <div className="flex items-center gap-2">
                  {decision.verdict === 'unsafe' ? (
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                  ) : decision.verdict === 'caution' ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  <h3 className="text-sm font-bold leading-tight">{decision.headline}</h3>
                </div>

                <p className="text-xs leading-relaxed opacity-90">{decision.advice}</p>

                {/* เตือนสารก่อภูมิแพ้ */}
                {decision.allergenAlerts.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-rose-200/60 space-y-1">
                    {decision.allergenAlerts.map((alert, i) => (
                      <div key={i} className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{alert}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ไฮไลต์สารอาหาร */}
                {decision.macroHighlights.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {decision.macroHighlights.map((hi, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-sm border border-black/5"
                      >
                        {hi}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ฟอร์มตรวจสอบและแก้ไขตัวเลข */}
              <div className="bg-sand-50/70 p-4 rounded-2xl border border-sand-200/80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {capturedImageUrl && (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-sand-200 shrink-0 bg-black/10">
                        <img
                          src={capturedImageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <span className="text-xs font-bold text-ink-700 shrink-0">ชื่อรายการ</span>
                  </div>
                  <input
                    type="text"
                    value={parsedLabel.productName}
                    onChange={(e) => handleFieldChange('productName', e.target.value)}
                    className="text-right text-xs font-semibold text-ink-900 bg-white px-2 py-1 rounded-lg border border-sand-200 max-w-[180px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-sand-200">
                    <span className="text-[11px] font-semibold text-ink-500 block">พลังงาน (kcal)</span>
                    <input
                      type="number"
                      value={parsedLabel.calories}
                      onChange={(e) => handleFieldChange('calories', Number(e.target.value))}
                      className="w-full text-base font-bold text-sage-600 focus:outline-none"
                    />
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-sand-200">
                    <span className="text-[11px] font-semibold text-ink-500 block">โปรตีน (g)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={parsedLabel.proteinGrams}
                      onChange={(e) => handleFieldChange('proteinGrams', Number(e.target.value))}
                      className="w-full text-base font-bold text-sky-600 focus:outline-none"
                    />
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-sand-200">
                    <span className="text-[11px] font-semibold text-ink-500 block">คาร์โบไฮเดรต (g)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={parsedLabel.carbsGrams}
                      onChange={(e) => handleFieldChange('carbsGrams', Number(e.target.value))}
                      className="w-full text-base font-bold text-sunny-600 focus:outline-none"
                    />
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-sand-200">
                    <span className="text-[11px] font-semibold text-ink-500 block">ไขมัน (g)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={parsedLabel.fatGrams}
                      onChange={(e) => handleFieldChange('fatGrams', Number(e.target.value))}
                      className="w-full text-base font-bold text-peach-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* สัดส่วนการรับประทาน (Multiplier) */}
                <div className="flex items-center justify-between pt-2 border-t border-sand-200">
                  <span className="text-xs font-semibold text-ink-700">สัดส่วนที่ทาน</span>
                  <div className="flex gap-1">
                    {[0.5, 1, 1.5, 2].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMultiplier(m)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          multiplier === m
                            ? 'bg-sage-500 text-white shadow-sm'
                            : 'bg-white border border-sand-200 text-ink-700 hover:bg-sand-100'
                        }`}
                      >
                        {m}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ยอดรวมที่ปรับตามสัดส่วน */}
              <div className="flex items-center justify-between px-3 py-2 bg-sage-500/10 rounded-xl text-xs font-semibold text-sage-900">
                <span>ยอดบันทึกจริง ({multiplier}x):</span>
                <span className="font-bold tabular-nums">
                  ~{Math.round(parsedLabel.calories * multiplier)} kcal · โปรตีน {(parsedLabel.proteinGrams * multiplier).toFixed(1)}g
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-sand-100 flex items-center justify-between bg-white/70">
          {step === 'review_decision' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep('camera');
                  startCamera();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-ink-600 hover:bg-sand-100"
              >
                <ChevronLeft className="w-4 h-4" />
                ถ่ายใหม่
              </button>

              <button
                type="button"
                onClick={() => {
                  if (parsedLabel) {
                    onConfirmLabel(parsedLabel, multiplier);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sage-500 hover:bg-sage-600 text-white font-bold text-xs shadow-md"
              >
                <Check className="w-4 h-4" />
                บันทึกอาหารมื้อนี้
              </button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-600 hover:bg-sand-100"
              >
                ยกเลิก
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
