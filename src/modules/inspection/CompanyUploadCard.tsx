import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, CheckCircle2, AlertCircle, FileText, Image, File } from 'lucide-react';
import type { CompanyReport, AnalyzeInspectionRequest } from './types';

interface CompanyUploadCardProps {
  report: CompanyReport;
  index: number;
  onUpdate: (report: CompanyReport) => void;
  onRemove?: () => void;
}

interface FileItem {
  name: string;
  type: string;
  base64: string;
  size: number;
}

// สีของแต่ละบริษัท
const COMPANY_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-600', text: 'text-blue-700', ring: 'ring-blue-400' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-600', text: 'text-emerald-700', ring: 'ring-emerald-400' },
  { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-600', text: 'text-amber-700', ring: 'ring-amber-400' },
  { bg: 'bg-rose-50', border: 'border-rose-200', badge: 'bg-rose-600', text: 'text-rose-700', ring: 'ring-rose-400' },
  { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-600', text: 'text-violet-700', ring: 'ring-violet-400' },
];

// แปลง File เป็น base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ไอคอนตาม MIME type
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

export function CompanyUploadCard({ report, index, onUpdate, onRemove }: CompanyUploadCardProps) {
  const color = COMPANY_COLORS[index % COMPANY_COLORS.length];
  const [companyName, setCompanyName] = useState(report.company);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const processFiles = useCallback(async (newFiles: File[]) => {
    const valid = newFiles.filter(f =>
      ACCEPTED_TYPES.includes(f.type) || f.name.endsWith('.txt')
    );
    if (valid.length === 0) return;

    const converted: FileItem[] = await Promise.all(
      valid.map(async (f) => ({
        name: f.name,
        type: f.type || 'text/plain',
        base64: await fileToBase64(f),
        size: f.size,
      }))
    );
    setFiles(prev => [...prev, ...converted]);
  }, []);

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
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // ส่งไป Gemini API
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

      const json = await res.json();

      if (json.success) {
        onUpdate({
          ...report,
          company: updatedName,
          processingStatus: 'done',
          items: json.items,
          sourceFiles: files.map(f => f.name),
          uploadedAt: new Date().toISOString(),
        });
      } else {
        onUpdate({
          ...report,
          company: updatedName,
          processingStatus: 'error',
          errorMessage: json.error || 'เกิดข้อผิดพลาด',
        });
      }
    } catch (err: any) {
      onUpdate({
        ...report,
        company: updatedName,
        processingStatus: 'error',
        errorMessage: err.message || 'ไม่สามารถเชื่อมต่อ API ได้',
      });
    }
  };

  const status = report.processingStatus;
  const canAnalyze = files.length > 0 && status !== 'processing';

  return (
    <div className={`rounded-2xl border-2 ${color.border} ${color.bg} overflow-hidden shadow-sm`}>
      {/* Card header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white/60 border-b border-white/80">
        <span className={`w-6 h-6 rounded-full ${color.badge} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
          {String.fromCharCode(65 + index)}
        </span>
        <input
          type="text"
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          placeholder="ชื่อบริษัทตรวจบ้าน"
          className={`flex-1 text-sm font-semibold bg-transparent border-none outline-none ${color.text} placeholder:text-slate-400`}
        />
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        className={`
          m-3 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
          ${isDragging ? `border-violet-400 bg-violet-50` : 'border-slate-300 bg-white/50 hover:border-slate-400'}
          ${status === 'processing' ? 'pointer-events-none' : ''}
        `}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
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
          <Upload size={20} className={isDragging ? 'text-violet-500' : 'text-slate-400'} />
          <div>
            <p className="text-xs font-medium text-slate-600">
              {isDragging ? 'ปล่อยไฟล์ที่นี่' : 'ลากไฟล์มาวาง หรือคลิกเพื่อเลือก'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              PDF, รูปภาพ (JPG/PNG), ข้อความ (.txt, .docx)
            </p>
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mx-3 mb-3 space-y-1.5">
          {files.map((f, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white/70 rounded-lg px-3 py-2">
              <FileIcon type={f.type} />
              <span className="flex-1 text-xs text-slate-700 truncate">{f.name}</span>
              <span className="text-[10px] text-slate-400 shrink-0">{formatBytes(f.size)}</span>
              <button
                onClick={() => removeFile(idx)}
                disabled={status === 'processing'}
                className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Status + Action */}
      <div className="px-3 pb-3">
        {status === 'idle' && files.length > 0 && (
          <button
            onClick={handleAnalyze}
            className="w-full py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
          >
            🤖 ให้ AI วิเคราะห์ ({files.length} ไฟล์)
          </button>
        )}

        {status === 'processing' && (
          <div className="flex items-center justify-center gap-2 py-2 text-violet-600">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-medium">AI กำลังอ่านเอกสาร...</span>
          </div>
        )}

        {status === 'done' && (
          <div className="flex items-center gap-2 py-2 text-emerald-600">
            <CheckCircle2 size={16} />
            <span className="text-xs font-medium">วิเคราะห์แล้ว — {report.items.length} รายการ</span>
            <button
              onClick={() => {
                onUpdate({ ...report, processingStatus: 'idle', items: [] });
                setFiles([]);
              }}
              className="ml-auto text-[10px] text-slate-400 hover:text-slate-600 underline"
            >
              รีเซ็ต
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 py-2 text-red-600">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span className="text-xs">{report.errorMessage}</span>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={files.length === 0}
              className="w-full py-2 rounded-xl bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors border border-red-200"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {status === 'idle' && files.length === 0 && (
          <p className="text-center text-[11px] text-slate-400 py-1">
            อัปโหลดไฟล์รายงานตรวจบ้านด้านบน
          </p>
        )}
      </div>
    </div>
  );
}
