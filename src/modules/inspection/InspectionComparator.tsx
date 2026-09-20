import React, { useState, useCallback } from 'react';
import { Plus, Trash2, FileText, Image, FileUp, Loader2, ChevronRight } from 'lucide-react';
import type { CompanyReport } from './types';
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
  const [sessionName, setSessionName] = useState('');

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
              <h1 className="text-base font-bold text-slate-900 leading-tight">เปรียบเทียบรายการตรวจบ้าน</h1>
              <p className="text-[10px] text-slate-500">AI วิเคราะห์และเปรียบเทียบรายหัวข้อ</p>
            </div>
          </div>

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* =================== VIEW: UPLOAD =================== */}
        {view === 'upload' && (
          <div className="space-y-6">
            {/* Session name */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                ชื่อโปรเจกต์ / บ้านที่ตรวจ
              </label>
              <input
                type="text"
                placeholder="เช่น บ้านหมู่บ้านวิภาวดี แปลง A5"
                value={sessionName}
                onChange={e => setSessionName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
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
                    flex flex-col items-center justify-center gap-3 h-48
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
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                {anyProcessing
                  ? '⏳ AI กำลังวิเคราะห์เอกสาร...'
                  : allDone
                  ? '✅ วิเคราะห์ครบแล้ว — พร้อมเปรียบเทียบ!'
                  : `อัปโหลดไฟล์ให้ครบ ${reports.length} บริษัท แล้วกด "วิเคราะห์"`
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
          />
        )}

        {/* =================== VIEW: SESSIONS =================== */}
        {view === 'sessions' && (
          <SessionList
            onLoad={(session) => {
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
