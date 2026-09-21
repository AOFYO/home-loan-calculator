import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertCircle, FileText, Image, File, AlertTriangle } from 'lucide-react';
import type { CompanyReport, AnalyzeInspectionRequest } from './types';

interface CompanyUploadCardProps {
  report: CompanyReport;
  index: number;
  onUpdate: (report: CompanyReport) => void;
  onRemove?: () => void;
  disabled?: boolean;
}

interface FileItem {
  name: string;
  type: string;
  base64: string;
  size: number;          // ขนาดหลัง compress (bytes)
  originalSize: number;  // ขนาดก่อน compress
}

// จำกัดขนาด request รวม 3MB (base64) — Vercel limit คือ 4.5MB raw
const MAX_TOTAL_BASE64_BYTES = 3 * 1024 * 1024;
// Compress รูปที่ใหญ่กว่า 500KB
const IMAGE_COMPRESS_THRESHOLD = 500 * 1024;
// ขนาดสูงสุดหลัง compress (target)
const IMAGE_MAX_DIMENSION = 1024;
const IMAGE_QUALITY = 0.75;

const COMPANY_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-600', text: 'text-blue-700' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-600', text: 'text-emerald-700' },
  { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-600', text: 'text-amber-700' },
  { bg: 'bg-rose-50', border: 'border-rose-200', badge: 'bg-rose-600', text: 'text-rose-700' },
  { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-600', text: 'text-violet-700' },
];

// ===============================================================
// Compress รูปภาพด้วย Canvas (browser-side) ก่อนแปลง base64
// ===============================================================
async function compressImage(file: File): Promise<{ base64: string; size: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      // Scale down ถ้าใหญ่เกิน max dimension
      if (width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height / width) * IMAGE_MAX_DIMENSION);
          width = IMAGE_MAX_DIMENSION;
        } else {
          width = Math.round((width / height) * IMAGE_MAX_DIMENSION);
          height = IMAGE_MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, size: Math.round(base64.length * 0.75) }); // approx decoded size
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // fallback: ใช้ FileReader แบบเดิม
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = (reader.result as string).split(',')[1];
        resolve({ base64: b64, size: file.size });
      };
      reader.readAsDataURL(file);
    };
    img.src = objectUrl;
  });
}

// แปลง File → base64 (พร้อม compress ถ้าเป็นรูปใหญ่)
async function fileToBase64Item(file: File): Promise<FileItem> {
  const isImage = file.type.startsWith('image/');
  const needsCompress = isImage && file.size > IMAGE_COMPRESS_THRESHOLD;

  if (needsCompress) {
    const { base64, size } = await compressImage(file);
    return { name: file.name, type: 'image/jpeg', base64, size, originalSize: file.size };
  }

  // PDF / text: ใช้ FileReader ปกติ
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(',')[1];
      resolve({ name: file.name, type: file.type || 'text/plain', base64: b64, size: file.size, originalSize: file.size });
    };
    reader.readAsDataURL(file);
  });
}

// ===============================================================
// Helpers
// ===============================================================
function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <Image size={14} className="text-slate-400" />;
  if (type === 'application/pdf') return <FileText size={14} className="text-slate-400" />;
  return <File size={14} className="text-slate-400" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// คำนวณขนาด base64 รวมทั้งหมด (bytes)
function totalBase64Size(items: FileItem[]): number {
  return items.reduce((sum, f) => sum + Math.ceil(f.base64.length * 0.75), 0);
}

// ===============================================================
// Component
// ===============================================================
export function CompanyUploadCard({ report, index, onUpdate, onRemove, disabled = false }: CompanyUploadCardProps) {
  const color = COMPANY_COLORS[index % COMPANY_COLORS.length];
  const [companyName, setCompanyName] = useState(report.company);
  const [files, setFiles] = useState<FileItem[]>(report.files || []);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  // ========== ราคา ==========
  const [priceInput, setPriceInput] = useState<string>(
    report.price != null ? String(report.price) : ''
  );
  const [priceNote, setPriceNote] = useState<string>(report.priceNote ?? '');
  const [priceSource, setPriceSource] = useState<'ai' | 'manual' | undefined>(report.priceSource);
  const [retryCountdown, setRetryCountdown] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync กับ report เมื่อมีการเปลี่ยนแปลงจากภายนอก (เช่น Batch Engine / Session load)
  useEffect(() => {
    setCompanyName(report.company);
  }, [report.company]);

  useEffect(() => {
    if (report.files) {
      setFiles(report.files);
    }
  }, [report.files]);

  useEffect(() => {
    if (report.price != null) {
      setPriceInput(String(report.price));
    } else if (report.price === null) {
      setPriceInput('');
    }
    setPriceNote(report.priceNote ?? '');
    setPriceSource(report.priceSource);
  }, [report.price, report.priceNote, report.priceSource]);

  // นับถอยหลังเมื่อติด Rate limit เพื่อป้องกันการกดย้ำ
  useEffect(() => {
    if (retryCountdown <= 0) return;
    const timer = setInterval(() => {
      setRetryCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [retryCountdown]);

  const ACCEPTED_TYPES = [
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const processFiles = useCallback(async (newFiles: File[]) => {
    const valid = newFiles.filter(f => ACCEPTED_TYPES.includes(f.type) || f.name.endsWith('.txt'));
    if (valid.length === 0) return;

    setIsConverting(true);
    try {
      const converted = await Promise.all(valid.map(fileToBase64Item));
      setFiles(prev => {
        const next = [...prev, ...converted];
        onUpdate({ ...report, files: next });
        return next;
      });
    } finally {
      setIsConverting(false);
    }
  }, [onUpdate, report]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  }, [processFiles]);

  const removeFile = (idx: number) => {
    setFiles(prev => {
      const next = prev.filter((_, i) => i !== idx);
      onUpdate({ ...report, files: next });
      return next;
    });
  };

  // sync price state → report เมื่อ user แก้ไขเอง
  const handlePriceBlur = () => {
    const parsed = priceInput === '' ? null : parseFloat(priceInput.replace(/,/g, ''));
    onUpdate({
      ...report,
      price: isNaN(parsed as number) ? null : parsed,
      priceNote: priceNote || undefined,
      priceSource: priceInput === '' ? undefined : 'manual',
    });
    if (priceInput !== '') setPriceSource('manual');
  };

  // ===============================================================
  // ส่งไป Gemini API
  // ===============================================================
  const handleAnalyze = async () => {
    if (files.length === 0) return;
    const updatedName = companyName.trim() || report.company;
    onUpdate({ ...report, company: updatedName, processingStatus: 'processing', errorMessage: undefined });

    try {
      const body: AnalyzeInspectionRequest = {
        company: updatedName,
        files: files.map(f => ({ name: f.name, type: f.type, base64: f.base64 })),
      };

      const res = await fetch('/api/analyze-inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const contentType = res.headers.get('content-type') ?? '';
      let json: any;
      if (contentType.includes('application/json')) {
        json = await res.json();
      } else {
        const text = await res.text();
        if (res.status === 413) throw new Error('ไฟล์รวมกันใหญ่เกิน — กรุณาลดจำนวนไฟล์หรือใช้ไฟล์ขนาดเล็กลง');
        throw new Error(`Server error ${res.status}: ${text.substring(0, 120)}`);
      }

      if (json.success) {
        // ถ้า AI ได้ชื่อบริษัทจากเอกสาร และ user ยังใช้ชื่อ default อยู่ → auto-fill
        const aiCompanyName: string | null = json.companyNameFromDoc;
        const finalName = aiCompanyName && companyName.match(/^บริษัทตรวจบ้าน [A-Z]$/)
          ? aiCompanyName
          : updatedName;
        if (aiCompanyName && finalName !== updatedName) {
          setCompanyName(finalName);
        }

        // ถ้า AI สกัดราคาได้
        const aiPrice: number | null = json.price;
        const aiPriceNote: string | null = json.priceNote;
        if (aiPrice != null) {
          setPriceInput(String(aiPrice));
          setPriceSource('ai');
          if (aiPriceNote) setPriceNote(aiPriceNote);
        }

        onUpdate({
          ...report,
          company: finalName,
          processingStatus: 'done',
          items: json.items,
          specialItems: json.specialItems || [],
          serviceTerms: json.serviceTerms || undefined,
          sourceFiles: files.map(f => f.name),
          uploadedAt: new Date().toISOString(),
          price: aiPrice ?? (priceInput !== '' ? parseFloat(priceInput.replace(/,/g, '')) : null),
          priceNote: aiPriceNote || priceNote || undefined,
          priceSource: aiPrice != null ? 'ai' : (priceInput !== '' ? 'manual' : undefined),
        });
      } else {
        const errorMsg = String(json.error || 'เกิดข้อผิดพลาด');
        const isQuota = json.isQuotaExceeded || errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota');
        const isHighDemand = json.isHighDemand || errorMsg.includes('503') || errorMsg.includes('high demand') || errorMsg.includes('UNAVAILABLE');
        if (isQuota || isHighDemand) {
          setRetryCountdown(json.retryAfterSeconds || (isHighDemand ? 12 : 30));
        }
        onUpdate({
          ...report,
          company: updatedName,
          processingStatus: 'error',
          errorMessage: isQuota
            ? 'โควตาการเรียก AI ชั่วคราวเต็ม (จำกัด 5 ครั้ง/นาที) กรุณารอสักครู่แล้วกดลองใหม่'
            : isHighDemand
            ? 'AI มีผู้ใช้งานหนาแน่นชั่วคราว (High demand) กรุณารอสักครู่แล้วระบบจะลองใหม่'
            : errorMsg,
        });
      }
    } catch (err: any) {
      const errorMsg = String(err.message || 'ไม่สามารถเชื่อมต่อได้');
      const isQuota = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota');
      const isHighDemand = errorMsg.includes('503') || errorMsg.includes('high demand') || errorMsg.includes('UNAVAILABLE');
      if (isQuota || isHighDemand) {
        setRetryCountdown(isHighDemand ? 12 : 30);
      }
      onUpdate({
        ...report,
        company: updatedName,
        processingStatus: 'error',
        errorMessage: isQuota
          ? 'โควตาการเรียก AI ชั่วคราวเต็ม (จำกัด 5 ครั้ง/นาที) กรุณารอสักครู่แล้วกดลองใหม่'
          : isHighDemand
          ? 'AI มีผู้ใช้งานหนาแน่นชั่วคราว (High demand) กรุณารอสักครู่แล้วระบบจะลองใหม่'
          : errorMsg,
      });
    }
  };

  const status = report.processingStatus;
  const totalSize = totalBase64Size(files);
  const isSizeWarning = totalSize > MAX_TOTAL_BASE64_BYTES * 0.8;
  const isSizeError = totalSize > MAX_TOTAL_BASE64_BYTES;

  return (
    <div className={`rounded-2xl border-2 ${color.border} ${color.bg} overflow-hidden shadow-sm`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white/60 border-b border-white/80">
        <span className={`w-6 h-6 rounded-full ${color.badge} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
          {String.fromCharCode(65 + index)}
        </span>
        <input
          type="text"
          value={companyName}
          onChange={e => {
            setCompanyName(e.target.value);
            onUpdate({ ...report, company: e.target.value });
          }}
          onBlur={() => {
            const trimmed = companyName.trim();
            if (trimmed && trimmed !== report.company) {
              onUpdate({ ...report, company: trimmed });
            }
          }}
          disabled={disabled || status === 'processing'}
          placeholder="ชื่อบริษัทตรวจบ้าน"
          className={`flex-1 text-sm font-semibold bg-transparent border-none outline-none ${color.text} placeholder:text-slate-400 disabled:opacity-60`}
        />
        {onRemove && (
          <button
            onClick={onRemove}
            disabled={disabled || status === 'processing'}
            className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={`
          m-3 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragging ? 'border-violet-400 bg-violet-50' : 'border-slate-300 bg-white/50 hover:border-slate-400'}
          ${(disabled || status === 'processing' || isConverting) ? 'pointer-events-none opacity-60' : ''}
        `}
        onDragOver={e => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => { if (!disabled) inputRef.current?.click(); }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.docx"
          className="hidden"
          onChange={handleFileInput}
        />
        <div className="flex flex-col items-center justify-center py-5 gap-2 text-center">
          {isConverting
            ? <><Loader2 size={20} className="text-violet-500 animate-spin" /><p className="text-xs text-violet-600">กำลัง compress รูปภาพ...</p></>
            : <>
                <Upload size={20} className={isDragging ? 'text-violet-500' : 'text-slate-400'} />
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    {isDragging ? 'ปล่อยไฟล์ที่นี่' : 'ลากไฟล์มาวาง หรือคลิกเพื่อเลือก'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    PDF, รูปภาพ (JPG/PNG), ข้อความ (.txt, .docx) · รูปจะถูก compress อัตโนมัติ
                  </p>
                </div>
              </>
          }
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mx-3 mb-2 space-y-1.5">
          {files.map((f, idx) => {
            const wasCompressed = f.originalSize !== f.size && f.size < f.originalSize;
            return (
              <div key={idx} className="flex items-center gap-2 bg-white/70 rounded-lg px-3 py-2">
                <FileIcon type={f.type} />
                <span className="flex-1 text-xs text-slate-700 truncate">{f.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {wasCompressed && (
                    <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1 rounded">
                      {formatBytes(f.originalSize)}→{formatBytes(f.size)}
                    </span>
                  )}
                  {!wasCompressed && (
                    <span className="text-[10px] text-slate-400">{formatBytes(f.size)}</span>
                  )}
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  disabled={disabled || status === 'processing'}
                  className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}

          {/* Size meter */}
          <div className="px-1">
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className={isSizeError ? 'text-red-600 font-semibold' : isSizeWarning ? 'text-amber-600' : 'text-slate-400'}>
                ขนาดรวม: {formatBytes(totalSize)}
              </span>
              <span className="text-slate-400">/ 3 MB</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isSizeError ? 'bg-red-500' : isSizeWarning ? 'bg-amber-400' : 'bg-emerald-400'}`}
                style={{ width: `${Math.min((totalSize / MAX_TOTAL_BASE64_BYTES) * 100, 100)}%` }}
              />
            </div>
          </div>

          {isSizeError && (
            <div className="flex items-start gap-1.5 text-[11px] text-red-700 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              ไฟล์รวมใหญ่เกินไป กรุณาลบบางไฟล์ออก (รูปถูก compress แล้ว แต่ PDF ยังใหญ่อยู่)
            </div>
          )}
          {isSizeWarning && !isSizeError && (
            <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" />
              ขนาดใกล้ถึงขีดจำกัด — AI อาจช้าลง
            </div>
          )}
        </div>
      )}

      {/* ========== ราคาที่เสนอ ========== */}
      <div className="mx-3 mb-3 bg-white/60 rounded-xl border border-white/80 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">💰 ราคาที่เสนอ</span>
          {priceSource === 'ai' && (
            <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
              🤖 AI สกัดอัตโนมัติ
            </span>
          )}
          {priceSource === 'manual' && (
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              ✏️ กรอกเอง
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="numeric"
              placeholder="ระบุราคา (บาท)"
              value={priceInput}
              onChange={e => {
                setPriceInput(e.target.value);
                if (priceSource !== 'ai') setPriceSource('manual');
              }}
              onBlur={handlePriceBlur}
              disabled={disabled || status === 'processing'}
              className="w-full pl-3 pr-10 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white disabled:opacity-50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">฿</span>
          </div>
          {priceInput && (
            <div className="text-sm font-semibold text-slate-700 shrink-0">
              {Number(priceInput.replace(/,/g, '')).toLocaleString('th-TH')}
            </div>
          )}
        </div>

        <input
          type="text"
          placeholder="หมายเหตุราคา เช่น รวม VAT, ไม่รวมค่าเดินทาง"
          value={priceNote}
          onChange={e => setPriceNote(e.target.value)}
          onBlur={handlePriceBlur}
          disabled={disabled || status === 'processing'}
          className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white disabled:opacity-50 text-slate-600 placeholder:text-slate-300"
        />
      </div>

      {/* Status + Action */}
      <div className="px-3 pb-3">
        {status === 'idle' && files.length > 0 && (
          <div className="flex items-center justify-between py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs">
            <span className="text-emerald-700 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              พร้อมวิเคราะห์ ({files.length} ไฟล์)
            </span>
            <button
              onClick={handleAnalyze}
              disabled={disabled || isSizeError || isConverting}
              className="text-[11px] text-violet-600 hover:text-violet-800 font-semibold underline disabled:opacity-40 disabled:cursor-not-allowed"
              title="วิเคราะห์เฉพาะบริษัทนี้"
            >
              วิเคราะห์เดี่ยว
            </button>
          </div>
        )}

        {status === 'queued' && (
          <div className="flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
            <Loader2 size={14} className="animate-spin text-amber-600" />
            <span className="font-semibold">⏳ รอคิววิเคราะห์...</span>
          </div>
        )}

        {status === 'processing' && (
          <div className="flex flex-col items-center justify-center gap-1 py-2.5 px-3 bg-violet-50 border border-violet-200 rounded-xl text-violet-800 text-xs">
            <div className="flex items-center gap-2">
              <Loader2 size={15} className="animate-spin text-violet-600" />
              <span className="font-semibold">AI กำลังวิเคราะห์เอกสาร...</span>
            </div>
            <span className="text-[11px] text-violet-600 font-mono">
              โมเดล: {report.currentModel || 'Gemini 3.8 Flash'}
            </span>
          </div>
        )}

        {status === 'done' && (
          <div className="flex items-center justify-between py-2 px-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold block">วิเคราะห์สำเร็จ ({report.items.length} รายการ)</span>
                {report.currentModel && (
                  <span className="text-[10px] text-emerald-600 block font-mono">โมเดล: {report.currentModel}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => { onUpdate({ ...report, processingStatus: 'idle', items: [], specialItems: [] }); }}
              className="text-[10px] text-slate-400 hover:text-slate-600 underline shrink-0"
            >
              รีเซ็ต
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-2.5 bg-red-50 rounded-xl border border-red-200 text-red-700">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold block mb-0.5">เกิดข้อผิดพลาดในการวิเคราะห์</span>
                <span className="text-slate-600 block">{report.errorMessage}</span>
                {retryCountdown > 0 && (
                  <span className="text-amber-700 font-medium block mt-1 text-[11px]">
                    ⏳ กำลังรอคลายโควตา: อีก {retryCountdown} วินาที
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={files.length === 0 || isSizeError || retryCountdown > 0}
              className="w-full py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {retryCountdown > 0 ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>รออีก {retryCountdown} วินาทีเพื่อลองใหม่</span>
                </>
              ) : (
                <span>ลองใหม่</span>
              )}
            </button>
          </div>
        )}

        {status === 'idle' && files.length === 0 && (
          <p className="text-center text-[11px] text-slate-400 py-1">อัปโหลดไฟล์รายงานตรวจบ้านด้านบน</p>
        )}
      </div>
    </div>
  );
}
