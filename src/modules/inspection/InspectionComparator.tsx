import React, { useState, useCallback } from 'react';
import { Plus, Trash2, FileText, ChevronRight, Save, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import type { CompanyReport, ComparisonSession } from './types';
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

  // เพิ่มบริษัทใหม่ (max 5)
  const addCompany = () => {
    if (reports.length >= 5) return;
    setReports(prev => [...prev, createEmptyReport(`บริษัทตรวจบ้าน ${String.fromCharCode(65 + prev.length)}`)]);
  };

  // ลบบริษัท
  const removeCompany = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
  };

  // อัปเดต report หลังจาก AI ประมวลผล
  const updateReport = useCallback((updated: CompanyReport) => {
    setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
  }, []);

  // ตรวจว่า AI ประมวลผลครบทุกบริษัทแล้ว
  const allDone = reports.length >= 2 && reports.every(r => r.processingStatus === 'done');
  const anyProcessing = reports.some(r => r.processingStatus === 'processing');

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
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-medium text-slate-800"
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

            {/* Company cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {reports.map((report, idx) => (
                <CompanyUploadCard
                  key={report.id}
                  report={report}
                  index={idx}
                  onUpdate={updateReport}
                  onRemove={reports.length > 2 ? () => removeCompany(report.id) : undefined}
                />
              ))}

              {/* Add company button */}
              {reports.length < 5 && (
                <button
                  onClick={addCompany}
                  className="
                    flex flex-col items-center justify-center gap-3 h-52
                    rounded-2xl border-2 border-dashed border-slate-300
                    text-slate-400 hover:border-violet-400 hover:text-violet-500
                    transition-colors duration-200 bg-white
                  "
                >
                  <Plus size={28} />
                  <span className="text-sm font-medium">เพิ่มบริษัท</span>
                  <span className="text-xs">({reports.length}/5)</span>
                </button>
              )}
            </div>

            {/* Action footer */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-600">
                {anyProcessing
                  ? '⏳ AI กำลังวิเคราะห์เอกสารและจับคู่กับแบบบ้านแก้วมุกดา...'
                  : allDone
                  ? '✅ วิเคราะห์ครบทุกบริษัทแล้ว — กดดูผลเปรียบเทียบได้เลย'
                  : `อัปโหลดเอกสารข้อเสนอให้ครบ ${reports.length} บริษัท แล้วกด "ให้ AI วิเคราะห์"`
                }
              </p>
              <button
                onClick={() => setView('compare')}
                disabled={!allDone}
                className="
                  flex items-center gap-2 px-5 py-2.5 rounded-xl
                  bg-violet-600 text-white text-sm font-semibold shadow
                  hover:bg-violet-700 transition-colors
                  disabled:opacity-40 disabled:cursor-not-allowed
                "
              >
                ดูผลเปรียบเทียบ
                <ChevronRight size={16} />
              </button>
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
