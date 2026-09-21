import React, { useState, useCallback, useRef } from 'react';
import { Plus, FileText, ChevronRight, Save, CheckCircle2, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import type { CompanyReport, ComparisonSession, AnalyzeInspectionRequest } from './types';
import { CompanyUploadCard } from './CompanyUploadCard';
import { ComparisonTable } from './ComparisonTable';
import { SessionList } from './SessionList';

// ฟังก์ชัน generate ID สั้นๆ
const genId = () => Math.random().toString(36).slice(2, 9);

function createEmptyReport(company: string): CompanyReport {
  return {
    id: genId(),
    company,
    uploadedAt: new Date().toISOString(),
    items: [],
    specialItems: [],
    sourceFiles: [],
    processingStatus: 'idle',
  };
}

interface BatchProgressState {
  currentIdx: number;
  total: number;
  currentCompany: string;
  model: string;
  stepMessage: string;
  isRateLimited?: boolean;
  retryCountdown?: number;
}

export function InspectionComparator() {
  const [reports, setReports] = useState<CompanyReport[]>([
    createEmptyReport('บริษัทตรวจบ้าน A'),
    createEmptyReport('บริษัทตรวจบ้าน B'),
  ]);
  const [view, setView] = useState<'upload' | 'compare' | 'sessions'>('upload');
  const [sessionName, setSessionName] = useState('บ้านในฝัน 8');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Batch analysis states
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgressState | null>(null);

  const reportsRef = useRef<CompanyReport[]>(reports);
  reportsRef.current = reports;
  const isCancelledRef = useRef<boolean>(false);

  // เพิ่มบริษัทใหม่ (max 5)
  const addCompany = () => {
    if (reports.length >= 5 || isBatchRunning) return;
    setReports(prev => [...prev, createEmptyReport(`บริษัทตรวจบ้าน ${String.fromCharCode(65 + prev.length)}`)]);
  };

  // ลบบริษัท
  const removeCompany = (id: string) => {
    if (isBatchRunning) return;
    setReports(prev => prev.filter(r => r.id !== id));
  };

  // อัปเดต report หลังจาก AI ประมวลผล หรือ user แก้ไขข้อมูล
  const updateReport = useCallback((updated: CompanyReport) => {
    setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
  }, []);

  // ตรวจสถานะความพร้อมของแต่ละบริษัท
  const allHaveFiles = reports.length >= 2 && reports.every(r => r.files && r.files.length > 0);
  const companiesWithoutFiles = reports.filter(r => !r.files || r.files.length === 0);
  const completedReportsCount = reports.filter(r => r.processingStatus === 'done').length;
  const allDone = reports.length >= 2 && reports.every(r => r.processingStatus === 'done');

  // ============================================================
  // Batch Analysis Engine: วิเคราะห์ทีเดียวทุกบริษัท + ลองใหม่อัตโนมัติ
  // ============================================================
  const runBatchAnalysis = async () => {
    if (isBatchRunning) return;

    // ตรวจสอบว่าแนบไฟล์ครบทุกบริษัทหรือยัง
    const missing = reportsRef.current.filter(r => !r.files || r.files.length === 0);
    if (missing.length > 0) {
      alert(`กรุณาแนบไฟล์ให้ครบทุกบริษัทก่อนเริ่มวิเคราะห์ (ยังไม่ได้แนบไฟล์: ${missing.map(r => r.company).join(', ')})`);
      return;
    }

    setIsBatchRunning(true);
    isCancelledRef.current = false;

    // ตั้งสถานะบริษัทที่ยังไม่ done ให้เป็น queued
    setReports(prev => prev.map(r => r.processingStatus === 'done' ? r : {
      ...r,
      processingStatus: 'queued',
      errorMessage: undefined,
    }));

    const total = reportsRef.current.length;

    for (let i = 0; i < total; i++) {
      if (isCancelledRef.current) {
        console.log('[Batch] Cancelled by user');
        break;
      }

      const current = reportsRef.current[i];
      if (!current) continue;

      // ข้ามบริษัทที่วิเคราะห์เสร็จสมบูรณ์แล้ว
      if (current.processingStatus === 'done') {
        continue;
      }

      const companyName = current.company.trim() || `บริษัทตรวจบ้าน ${String.fromCharCode(65 + i)}`;
      const files = current.files || [];
      if (files.length === 0) continue;

      let success = false;
      let attempt = 0;
      const MAX_ATTEMPTS = 12; // พยายามซ้ำอัตโนมัติจนกว่าจะสำเร็จ

      while (!success && attempt < MAX_ATTEMPTS && !isCancelledRef.current) {
        attempt++;
        const currentModelName = 'Gemini 2.5 Flash';

        setReports(prev => prev.map((r, idx) => idx === i ? {
          ...r,
          processingStatus: 'processing',
          currentModel: currentModelName,
          errorMessage: undefined,
          retryCount: attempt - 1,
        } : r));

        setBatchProgress({
          currentIdx: i,
          total,
          currentCompany: companyName,
          model: currentModelName,
          stepMessage: attempt === 1
            ? `กำลังส่งเอกสาร ${files.length} ไฟล์ให้ AI วิเคราะห์และเทียบเคียงเกณฑ์มาตรฐาน...`
            : `กำลังลองวิเคราะห์ "${companyName}" ใหม่อัตโนมัติ (ครั้งที่ ${attempt})...`,
        });

        try {
          const body: AnalyzeInspectionRequest = {
            company: companyName,
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
            throw new Error(`Server status ${res.status}: ${text.substring(0, 100)}`);
          }

          if (json.success) {
            success = true;
            const aiName: string | null = json.companyNameFromDoc;
            const finalName = aiName && companyName.match(/^บริษัทตรวจบ้าน [A-Z]$/)
              ? aiName
              : companyName;

            const aiPrice: number | null = json.price;
            const aiPriceNote: string | null = json.priceNote;

            setReports(prev => prev.map((r, idx) => idx === i ? {
              ...r,
              company: finalName,
              processingStatus: 'done',
              currentModel: json.model || 'Gemini 2.5 Flash',
              items: json.items,
              specialItems: json.specialItems || [],
              serviceTerms: json.serviceTerms || undefined,
              sourceFiles: files.map(f => f.name),
              uploadedAt: new Date().toISOString(),
              price: aiPrice ?? r.price ?? null,
              priceNote: aiPriceNote || r.priceNote || undefined,
              priceSource: aiPrice != null ? 'ai' : r.priceSource,
              errorMessage: undefined,
            } : r));

            setBatchProgress({
              currentIdx: i,
              total,
              currentCompany: finalName,
              model: json.model || 'Gemini 2.5 Flash',
              stepMessage: `✅ วิเคราะห์ "${finalName}" สำเร็จ! (${json.items.length} รายการ)`,
            });

            // พักจังหวะ 2 วินาทีระหว่างบริษัทเพื่อป้องกัน 5 RPM rate limit
            if (i < total - 1 && !isCancelledRef.current) {
              setBatchProgress(prev => prev ? {
                ...prev,
                stepMessage: `พักจังหวะ 2 วินาทีเพื่อป้องกัน Rate limit ก่อนเริ่มบริษัทถัดไป...`,
              } : null);
              await new Promise(r => setTimeout(r, 2000));
            }

          } else {
            // เมื่อติด Rate limit หรือ Error
            const errorMsg = String(json.error || 'เกิดข้อผิดพลาดในการประมวลผล');
            const isQuota = json.isQuotaExceeded || errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('quota');
            const waitSec = json.retryAfterSeconds || (isQuota ? 20 : 8);

            console.warn(`[Batch] Attempt ${attempt} error for ${companyName}:`, errorMsg);

            setReports(prev => prev.map((r, idx) => idx === i ? {
              ...r,
              processingStatus: 'processing',
              errorMessage: isQuota
                ? `โควตาชั่วคราวเต็ม — ระบบจะลองใหม่อัตโนมัติในอีก ${waitSec} วินาที...`
                : `เกิดข้อผิดพลาด — กำลังลองใหม่ในอีก ${waitSec} วินาที...`,
            } : r));

            // นับถอยหลังแบบเรียลไทม์
            for (let s = waitSec; s > 0; s--) {
              if (isCancelledRef.current) break;
              setBatchProgress({
                currentIdx: i,
                total,
                currentCompany: companyName,
                model: 'กำลังรอคลายโควตาและสลับโมเดล...',
                stepMessage: isQuota
                  ? `⏳ โควตา API ชั่วคราวเต็ม — กำลังรออีก ${s} วินาที แล้วจะลองใหม่อัตโนมัติ (ครั้งที่ ${attempt})...`
                  : `⚠️ เชื่อมต่อขัดข้อง — กำลังรอ ${s} วินาที แล้วจะลองใหม่อัตโนมัติ (ครั้งที่ ${attempt})...`,
                isRateLimited: isQuota,
                retryCountdown: s,
              });
              await new Promise(r => setTimeout(r, 1000));
            }
          }
        } catch (err: any) {
          const errMsg = String(err.message || err);
          const isQuota = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota');
          const waitSec = isQuota ? 25 : 6;

          setReports(prev => prev.map((r, idx) => idx === i ? {
            ...r,
            processingStatus: 'processing',
            errorMessage: `เชื่อมต่อไม่สำเร็จ — จะลองใหม่อัตโนมัติใน ${waitSec} วินาที...`,
          } : r));

          for (let s = waitSec; s > 0; s--) {
            if (isCancelledRef.current) break;
            setBatchProgress({
              currentIdx: i,
              total,
              currentCompany: companyName,
              model: 'กำลังรอการเชื่อมต่อใหม่...',
              stepMessage: `⏳ กำลังรอ ${s} วินาที แล้วจะลองวิเคราะห์ "${companyName}" ใหม่อัตโนมัติ...`,
              retryCountdown: s,
            });
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }

      if (!success && !isCancelledRef.current) {
        setReports(prev => prev.map((r, idx) => idx === i ? {
          ...r,
          processingStatus: 'error',
          errorMessage: 'ไม่สามารถวิเคราะห์ได้หลังพยายามหลายครั้ง กรุณาลองใหม่อีกครั้ง',
        } : r));
      }
    }

    setIsBatchRunning(false);
    setBatchProgress(null);
  };

  const cancelBatchAnalysis = () => {
    isCancelledRef.current = true;
    setIsBatchRunning(false);
    setBatchProgress(null);
    setReports(prev => prev.map(r => r.processingStatus === 'queued' ? { ...r, processingStatus: 'idle' } : r));
  };

  const resetAllReports = () => {
    setReports(prev => prev.map(r => ({
      ...r,
      processingStatus: 'idle',
      items: [],
      specialItems: [],
      currentModel: undefined,
      errorMessage: undefined,
    })));
  };

  // ============================================================
  // ฟังก์ชันบันทึก Session (Dual Storage: Redis + LocalStorage)
  // ============================================================
  const handleSaveSession = async () => {
    if (reports.length === 0) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);

    const sessionId = currentSessionId || genId();
    if (!currentSessionId) setCurrentSessionId(sessionId);

    const sessionData: ComparisonSession = {
      id: sessionId,
      name: sessionName.trim() || 'บ้านในฝัน 8',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reports,
      allTopics: Array.from(new Set(reports.flatMap(r => r.items.map(i => i.topic)))),
      allCategories: Array.from(new Set(reports.flatMap(r => r.items.map(i => i.category)))),
    };

    // 1. บันทึกลง LocalStorage ทันที (Offline / Instant Backup)
    try {
      const existingLocal = JSON.parse(localStorage.getItem('inspection_sessions_backup') || '[]');
      const filtered = existingLocal.filter((s: any) => s.id !== sessionId);
      localStorage.setItem(
        'inspection_sessions_backup',
        JSON.stringify([{ ...sessionData, storageSource: 'local' }, ...filtered])
      );
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }

    // 2. บันทึกลง Upstash Redis ผ่าน API
    let savedToCloud = false;
    try {
      const res = await fetch('/api/inspection-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });
      const json = await res.json();
      if (json.success) savedToCloud = true;
    } catch (e) {
      console.warn('Cloud save failed, relying on local backup', e);
    }

    setIsSaving(false);
    const timeStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    setSaveSuccessMsg(
      savedToCloud
        ? `✅ บันทึกขึ้นคลาวด์และเครื่องแล้ว (${timeStr})`
        : `💾 บันทึกลงเครื่องแล้ว (${timeStr})`
    );

    setTimeout(() => setSaveSuccessMsg(null), 6000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-purple-600 flex items-center justify-center text-white shadow">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">เปรียบเทียบรายการตรวจบ้าน</h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700">
                  <Sparkles size={10} />
                  เกณฑ์แบบบ้านแก้วมุกดา
                </span>
              </div>
              <p className="text-[10px] text-slate-500">อ้างอิงแบบก่อสร้าง คสล. 2 ชั้น (จอดรถขวา)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Save indicator / button */}
            {allDone && (
              <div className="flex items-center gap-2">
                {saveSuccessMsg && (
                  <span className="text-xs text-emerald-600 font-medium animate-fade-in hidden md:inline">
                    {saveSuccessMsg}
                  </span>
                )}
                <button
                  onClick={handleSaveSession}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                  title="บันทึกประวัติการเปรียบเทียบเพื่อเปิดดูภายหลัง"
                >
                  {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกประวัติ'}</span>
                </button>
              </div>
            )}

            {/* Tab navigation */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {([
                { id: 'upload', label: 'อัปโหลด' },
                { id: 'compare', label: 'เปรียบเทียบ' },
                { id: 'sessions', label: 'ประวัติ' },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  disabled={tab.id === 'compare' && !allDone}
                  className={`
                    px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${view === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
                    }
                  `}
                >
                  {tab.label}
                  {tab.id === 'compare' && allDone && (
                    <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* =================== VIEW: UPLOAD =================== */}
        {view === 'upload' && (
          <div className="space-y-6">
            {/* Session name & baseline banner */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ชื่อโปรเจกต์ / บ้านที่ตรวจ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น บ้านในฝัน 8"
                    value={sessionName}
                    onChange={e => setSessionName(e.target.value)}
                    disabled={isBatchRunning}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-medium text-slate-800 disabled:opacity-60"
                  />
                </div>
                <div className="sm:w-80 bg-violet-50 rounded-xl p-3 border border-violet-100 text-xs">
                  <p className="font-semibold text-violet-800 mb-0.5">📐 เกณฑ์อ้างอิง: บ้านแก้วมุกดา (จอดขวา)</p>
                  <p className="text-violet-600 text-[11px] leading-relaxed">
                    เปรียบเทียบตามแบบก่อสร้างจริง สถาปัตย์ (A1-A7), ไฟฟ้า (E1-E4), สุขาภิบาล (SN1-SN4) พร้อมแยกบริการพิเศษ
                  </p>
                </div>
              </div>
            </div>

            {/* Step Guidance Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`rounded-xl p-3.5 border shadow-sm flex items-center gap-3 transition-colors ${allHaveFiles ? 'bg-emerald-50/70 border-emerald-200' : 'bg-white border-slate-200'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${allHaveFiles ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {allHaveFiles ? '✓' : '1'}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">1. แนบไฟล์ให้ครบทุกบริษัท</p>
                  <p className="text-[11px] text-slate-500">
                    {allHaveFiles
                      ? '✅ แนบครบทั้ง ' + reports.length + ' บริษัทแล้ว'
                      : `แนบแล้ว ${reports.length - companiesWithoutFiles.length} จาก ${reports.length} บริษัท`}
                  </p>
                </div>
              </div>

              <div className={`rounded-xl p-3.5 border shadow-sm flex items-center gap-3 transition-colors ${isBatchRunning ? 'bg-violet-50/70 border-violet-300' : allDone ? 'bg-emerald-50/70 border-emerald-200' : 'bg-white border-slate-200'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isBatchRunning ? 'bg-violet-600 text-white animate-pulse' : allDone ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                  {allDone ? '✓' : '2'}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">2. กดวิเคราะห์พร้อมกันทีเดียว</p>
                  <p className="text-[11px] text-slate-500">
                    {isBatchRunning ? 'กำลังวิเคราะห์อัตโนมัติ...' : allDone ? 'วิเคราะห์สำเร็จครบทุกบริษัท' : 'ระบบหมุนโมเดลและลองใหม่อัตโนมัติ'}
                  </p>
                </div>
              </div>

              <div className={`rounded-xl p-3.5 border shadow-sm flex items-center gap-3 transition-colors ${allDone ? 'bg-violet-50/70 border-violet-300' : 'bg-white border-slate-200'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${allDone ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  3
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">3. ตรวจผลเปรียบเทียบมาตรฐาน</p>
                  <p className="text-[11px] text-slate-500">
                    {allDone ? 'ตารางเทียบเคียง 23 รายการพร้อมเปิด' : 'เทียบตามแบบบ้านแก้วมุกดา'}
                  </p>
                </div>
              </div>
            </div>

            {/* Live Active Batch Banner */}
            {isBatchRunning && batchProgress && (
              <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-800 text-white rounded-2xl p-5 shadow-lg border border-violet-400/40 relative overflow-hidden animate-fade-in space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                      <Loader2 size={22} className="animate-spin text-white" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold leading-tight">
                          กำลังวิเคราะห์บริษัทที่ {batchProgress.currentIdx + 1}/{batchProgress.total}: {batchProgress.currentCompany}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                          โมเดล: {batchProgress.model}
                        </span>
                      </div>
                      <p className="text-xs text-violet-100 mt-1">
                        {batchProgress.stepMessage}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={cancelBatchAnalysis}
                    className="self-start sm:self-center px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition-all shrink-0"
                  >
                    หยุดชั่วคราว
                  </button>
                </div>

                {/* Overall Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-violet-200 font-medium">
                    <span>ความคืบหน้ารวม</span>
                    <span>{completedReportsCount} จาก {reports.length} บริษัท</span>
                  </div>
                  <div className="h-2 bg-black/20 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, (completedReportsCount / reports.length) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Company cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {reports.map((report, idx) => (
                <CompanyUploadCard
                  key={report.id}
                  report={report}
                  index={idx}
                  onUpdate={updateReport}
                  onRemove={reports.length > 2 && !isBatchRunning ? () => removeCompany(report.id) : undefined}
                  disabled={isBatchRunning}
                />
              ))}

              {/* Add company button */}
              {reports.length < 5 && (
                <button
                  onClick={addCompany}
                  disabled={isBatchRunning}
                  className="
                    flex flex-col items-center justify-center gap-3 h-52
                    rounded-2xl border-2 border-dashed border-slate-300
                    text-slate-400 hover:border-violet-400 hover:text-violet-500
                    transition-colors duration-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed
                  "
                >
                  <Plus size={28} />
                  <span className="text-sm font-medium">เพิ่มบริษัท</span>
                  <span className="text-xs">({reports.length}/5)</span>
                </button>
              )}
            </div>

            {/* Central Action footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {isBatchRunning ? (
                    <span className="flex items-center gap-2 text-violet-700">
                      <Loader2 size={16} className="animate-spin" />
                      ระบบกำลังวิเคราะห์เอกสาร... (ตรวจพบแล้ว {completedReportsCount}/{reports.length} บริษัท)
                    </span>
                  ) : allDone ? (
                    <span className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      วิเคราะห์ครบทุกบริษัทแล้ว ({reports.length} บริษัท) พร้อมดูผลเปรียบเทียบ
                    </span>
                  ) : allHaveFiles ? (
                    <span className="text-slate-700">
                      เอกสารพร้อมครบทุกบริษัท ({reports.length} บริษัท) — กดปุ่มด้านขวาเพื่อให้ AI วิเคราะห์ทีเดียว
                    </span>
                  ) : (
                    <span className="text-amber-700">
                      ⚠️ ยังแนบไฟล์ไม่ครบทุกบริษัท (ขาดอีก {companiesWithoutFiles.length} บริษัท: {companiesWithoutFiles.map(r => r.company).join(', ')})
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  ระบบจะสลับโมเดลอัตโนมัติ (Gemini 2.5 Flash / Lite / 3.6 / 1.5) และลองใหม่จนกว่าจะสำเร็จครบทุกบริษัท
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {allDone && !isBatchRunning && (
                  <button
                    onClick={resetAllReports}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    title="ล้างผลและวิเคราะห์ใหม่อีกครั้ง"
                  >
                    <RefreshCw size={13} />
                    <span>วิเคราะห์ใหม่ทั้งหมด</span>
                  </button>
                )}

                {allDone ? (
                  <button
                    onClick={() => setView('compare')}
                    className="
                      flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                      bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-md
                      hover:shadow-lg transition-all transform active:scale-95
                    "
                  >
                    ดูผลเปรียบเทียบ
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={runBatchAnalysis}
                    disabled={!allHaveFiles || isBatchRunning}
                    className="
                      flex items-center justify-center gap-2 px-6 py-3 rounded-xl
                      bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700
                      text-white text-sm font-bold shadow-md hover:shadow-lg
                      transition-all duration-200 transform active:scale-95
                      disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none
                    "
                  >
                    {isBatchRunning ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>กำลังวิเคราะห์ ({completedReportsCount}/{reports.length})...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} className="text-amber-300" />
                        <span>ให้ AI วิเคราะห์ทุกบริษัทพร้อมกัน ({reports.length} บริษัท)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================== VIEW: COMPARE =================== */}
        {view === 'compare' && allDone && (
          <ComparisonTable
            reports={reports}
            sessionName={sessionName}
            onSave={handleSaveSession}
            isSaving={isSaving}
            saveSuccessMsg={saveSuccessMsg}
          />
        )}

        {/* =================== VIEW: SESSIONS =================== */}
        {view === 'sessions' && (
          <SessionList
            onLoad={(session) => {
              setCurrentSessionId(session.id);
              setReports(session.reports);
              setSessionName(session.name);
              setView('compare');
            }}
          />
        )}
      </div>
    </div>
  );
}

