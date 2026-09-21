import React, { useState, useMemo } from 'react';
import { Download, Filter, CheckCircle2, XCircle, Sparkles, ShieldCheck, Wrench, Clock, Users, FileText, Save, Loader2 } from 'lucide-react';
import type { CompanyReport, InspectionItem } from './types';
import { KAEW_MUKDA_STANDARD_CHECKLIST, type StandardChecklistItem } from './data/standardChecklist';

interface ComparisonTableProps {
  reports: CompanyReport[];
  sessionName: string;
  onSave?: () => void;
  isSaving?: boolean;
  saveSuccessMsg?: string | null;
}

// ช่วยค้นหารายการที่ตรงกับเกณฑ์มาตรฐาน
function findStandardItemMatch(report: CompanyReport, stdItem: StandardChecklistItem): InspectionItem | undefined {
  // 1. Direct ID match
  if (stdItem.id) {
    const direct = report.items.find(i => i.standardItemId === stdItem.id);
    if (direct) return direct;
  }

  // 2. Topic keywords matching
  const stdKeywords = stdItem.topic.toLowerCase().split(/[\s,()&+/]+/);
  return report.items.find(i => {
    const itemTopic = i.topic.toLowerCase();
    return stdKeywords.some(kw => kw.length > 3 && itemTopic.includes(kw));
  });
}

const IMPORTANCE_CONFIG = {
  high: { label: 'สำคัญมาก', badge: 'bg-red-100 text-red-700 border-red-200', dot: '🔴' },
  medium: { label: 'ปานกลาง', badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: '🟡' },
  low: { label: 'รายละเอียด', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: '🟢' },
};

const COMPANY_PALETTES = [
  { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-600', text: 'text-blue-700', pill: 'bg-blue-100 text-blue-800' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-600', text: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-800' },
  { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-600', text: 'text-amber-700', pill: 'bg-amber-100 text-amber-800' },
  { bg: 'bg-rose-50', border: 'border-rose-200', badge: 'bg-rose-600', text: 'text-rose-700', pill: 'bg-rose-100 text-rose-800' },
  { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-600', text: 'text-violet-700', pill: 'bg-violet-100 text-violet-800' },
];

export function ComparisonTable({
  reports,
  sessionName,
  onSave,
  isSaving,
  saveSuccessMsg,
}: ComparisonTableProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterImportance, setFilterImportance] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'standard' | 'special'>('standard');

  // หมวดหมู่ในมาตรฐาน
  const standardCategories = useMemo(() => {
    return Array.from(new Set(KAEW_MUKDA_STANDARD_CHECKLIST.map(item => item.category)));
  }, []);

  // Filtered standard items
  const filteredStandardItems = useMemo(() => {
    return KAEW_MUKDA_STANDARD_CHECKLIST.filter(item => {
      const matchCat = filterCategory === 'all' || item.category === filterCategory;
      const matchImp = filterImportance === 'all' || item.importance === filterImportance;
      return matchCat && matchImp;
    });
  }, [filterCategory, filterImportance]);

  // รวบรวมรายการพิเศษจากทุกบริษัท
  const allSpecialTopics = useMemo(() => {
    const map = new Map<string, { topic: string; category: string }>();
    for (const r of reports) {
      for (const sp of r.specialItems || []) {
        if (!map.has(sp.topic)) {
          map.set(sp.topic, { topic: sp.topic, category: sp.category });
        }
      }
    }
    return Array.from(map.values());
  }, [reports]);

  // คำนวณ Coverage ของแต่ละบริษัทเทียบกับมาตรฐาน 23 ข้อ
  const companyCoverageStats = useMemo(() => {
    const totalStd = KAEW_MUKDA_STANDARD_CHECKLIST.length;
    return reports.map(report => {
      let matchedCount = 0;
      for (const std of KAEW_MUKDA_STANDARD_CHECKLIST) {
        if (findStandardItemMatch(report, std)) {
          matchedCount++;
        }
      }
      const pct = Math.round((matchedCount / totalStd) * 100);
      const pricePerTopic = report.price && matchedCount > 0
        ? Math.round(report.price / matchedCount)
        : null;
      return { reportId: report.id, matchedCount, totalStd, pct, pricePerTopic };
    });
  }, [reports]);

  // Export CSV ครอบคลุมทั้งสองส่วน
  const handleExportCSV = () => {
    const headers = ['หมวดหมู่', 'หัวข้อมาตรฐาน', 'อ้างอิงแบบ', 'ความสำคัญ', ...reports.map(r => r.company)];
    const rows: string[][] = [];

    // 1. ตารางมาตรฐาน
    for (const std of KAEW_MUKDA_STANDARD_CHECKLIST) {
      const row = [std.category, std.topic, std.referenceDoc, IMPORTANCE_CONFIG[std.importance].label];
      for (const r of reports) {
        const matched = findStandardItemMatch(r, std);
        row.push(matched ? `รวม: ${matched.detail}` : 'ไม่ได้ระบุ');
      }
      rows.push(row);
    }

    // 2. ตารางพิเศษ
    rows.push([]);
    rows.push(['--- รายการตรวจพิเศษและบริการเสริม ---']);
    for (const sp of allSpecialTopics) {
      const row = ['รายการพิเศษ', sp.topic, '-', '-'];
      for (const r of reports) {
        const item = (r.specialItems || []).find(i => i.topic === sp.topic);
        row.push(item ? `มี: ${item.detail}` : '-');
      }
      rows.push(row);
    }

    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `เปรียบเทียบตรวจบ้าน_${sessionName || 'บ้านในฝัน'}_${new Date().toLocaleDateString('th-TH')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Print Only Official Document Header */}
      <div className="hidden print:block mb-4 pb-3 border-b-2 border-slate-800">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">
                รายงานเปรียบเทียบข้อเสนอและขอบเขตการตรวจรับบ้าน
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded bg-violet-100 text-violet-800 font-bold border border-violet-200">
                เกณฑ์แบบบ้านแก้วมุกดา
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              <strong>โครงการ / แฟ้มบันทึก:</strong> {sessionName || 'บ้านในฝัน 8'} &nbsp;|&nbsp; <strong>แบบก่อสร้างอ้างอิง:</strong> บ้าน คสล. 2 ชั้น (แบบบ้านแก้วมุกดา จอดรถขวา)
            </p>
          </div>
          <div className="text-right text-[11px] text-slate-500 shrink-0">
            <p className="font-semibold text-slate-700">
              วันที่พิมพ์: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
            </p>
            <p>เปรียบเทียบทั้งหมด: {reports.length} บริษัท</p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. Summary Cards (ราคา, Coverage มาตรฐาน, เงื่อนไขบริการ) */}
      {/* ========================================================= */}
      <div className={`grid gap-4 ${reports.length <= 2 ? 'grid-cols-1 md:grid-cols-2 print:grid-cols-2' : reports.length === 3 ? 'grid-cols-1 md:grid-cols-3 print:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4'} print:gap-3 print-avoid-break mb-6`}>
        {reports.map((report, idx) => {
          const stats = companyCoverageStats.find(s => s.reportId === report.id);
          const palette = COMPANY_PALETTES[idx % COMPANY_PALETTES.length];
          const terms = report.serviceTerms;
          const specialCount = (report.specialItems?.length || 0) + (terms?.specialTools?.length || 0);

          return (
            <div
              key={report.id}
              className={`rounded-2xl border-2 ${palette.border} ${palette.bg} p-4 shadow-sm space-y-3 bg-white print:border print:border-slate-300 print:shadow-none print:p-3 print:rounded-xl print-avoid-break`}
            >
              {/* Company Title */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-6 h-6 rounded-full ${palette.badge} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <p className="text-sm font-bold text-slate-900 truncate">{report.company}</p>
                </div>
                {terms?.rounds && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold shrink-0">
                    🔄 {terms.rounds}
                  </span>
                )}
              </div>

              {/* Price block */}
              <div className="bg-white/80 rounded-xl p-3 border border-slate-100">
                {report.price != null ? (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-extrabold text-slate-900">
                        ฿{report.price.toLocaleString('th-TH')}
                      </span>
                      {report.priceNote && (
                        <span className="text-[10px] text-slate-500">({report.priceNote})</span>
                      )}
                    </div>
                    {stats?.pricePerTopic && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        เฉลี่ย ฿{stats.pricePerTopic.toLocaleString('th-TH')} / รายการมาตรฐาน
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">ไม่ระบุราคาในเอกสาร</p>
                )}
              </div>

              {/* Standard Baseline Coverage Meter */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">ครอบคลุมเกณฑ์บ้านแก้วมุกดา</span>
                  <span className={`font-bold ${(stats?.pct || 0) >= 80 ? 'text-emerald-600' : (stats?.pct || 0) >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                    {stats?.matchedCount}/{stats?.totalStd} ({stats?.pct}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${(stats?.pct || 0) >= 80 ? 'bg-emerald-500' : (stats?.pct || 0) >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${stats?.pct || 0}%` }}
                  />
                </div>
              </div>

              {/* Service Terms Badges */}
              <div className="pt-1 flex flex-wrap gap-1.5 text-[10px]">
                {terms?.teamSize && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 flex items-center gap-1">
                    <Users size={10} /> {terms.teamSize}
                  </span>
                )}
                {terms?.reportDelivery && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 flex items-center gap-1">
                    <Clock size={10} /> ส่งเล่ม {terms.reportDelivery}
                  </span>
                )}
                {specialCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold flex items-center gap-1">
                    <Sparkles size={10} /> +{specialCount} บริการพิเศษ
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 2. Controls & Tabs */}
      {/* ========================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm print:hidden">
        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('standard')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'standard'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck size={14} className="text-violet-600" />
            ตารางเทียบตามเกณฑ์มาตรฐาน ({KAEW_MUKDA_STANDARD_CHECKLIST.length} ข้อ)
          </button>
          <button
            onClick={() => setActiveTab('special')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'special'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles size={14} className="text-amber-500" />
            รายการพิเศษ & เงื่อนไขบริการ
          </button>
        </div>

        {/* Filters (active only on standard tab) */}
        {activeTab === 'standard' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-slate-400 text-xs">
              <Filter size={12} />
              <span>กรอง:</span>
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="all">ทุกหมวดมาตรฐาน</option>
              {standardCategories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={filterImportance}
              onChange={e => setFilterImportance(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
            >
              <option value="all">ทุกระดับความสำคัญ</option>
              <option value="high">🔴 สำคัญมาก (โครงสร้าง/ระบบหลัก)</option>
              <option value="medium">🟡 ปานกลาง</option>
              <option value="low">🟢 รายละเอียด</option>
            </select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          {onSave && (
            <button
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              title="บันทึกผลการเปรียบเทียบนี้"
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกประวัติ'}</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors bg-white"
          >
            <Download size={13} />
            CSV
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors bg-white"
          >
            🖨️ พิมพ์
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 print:hidden">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: ตารางเทียบตามเกณฑ์มาตรฐานแบบบ้านแก้วมุกดา */}
      {/* ========================================================= */}
      <div className={`${activeTab === 'standard' ? 'block' : 'hidden print:block'} bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:overflow-visible print:border print:border-slate-300 print:rounded-xl print:shadow-none mb-6`}>
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between print:bg-slate-100 print:py-2.5 print:px-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-violet-600 print:text-slate-800" />
            <div>
              <h3 className="text-xs font-bold text-slate-800 print:text-sm">
                ส่วนที่ 1: ตารางเปรียบเทียบตามเกณฑ์มาตรฐานแบบบ้านแก้วมุกดา ({KAEW_MUKDA_STANDARD_CHECKLIST.length} รายการ)
              </h3>
              <p className="text-[10px] text-slate-500 print:text-[11px] print:text-slate-600">
                แสดงรายการที่แต่ละบริษัทครอบคลุม พร้อมรายละเอียดวิธีตรวจและเครื่องมือ
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium print:text-[11px]">
            แสดง {filteredStandardItems.length} จาก {KAEW_MUKDA_STANDARD_CHECKLIST.length} รายการ
          </span>
        </div>

        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left text-xs border-collapse print:text-[11px]">
            <thead className="bg-slate-50 border-b border-slate-200 print:bg-slate-100 print:border-b-2 print:border-slate-300" style={{ display: 'table-header-group' }}>
              <tr>
                <th className="py-3 px-4 font-semibold text-slate-600 w-48 print:w-40 print:py-2 print:px-2 print:text-slate-800">หมวดหมู่มาตรฐาน</th>
                <th className="py-3 px-4 font-semibold text-slate-700 w-64 print:w-60 print:py-2 print:px-2 print:text-slate-800">หัวข้อตรวจมาตรฐาน & อ้างอิงแบบ</th>
                <th className="py-3 px-3 font-semibold text-slate-600 w-24 text-center print:w-20 print:py-2 print:px-1 print:text-slate-800">ความสำคัญ</th>
                {reports.map((r, idx) => (
                  <th key={r.id} className="py-3 px-4 font-semibold text-slate-800 min-w-[200px] print:min-w-0 print:py-2 print:px-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${COMPANY_PALETTES[idx % 5].badge}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{r.company}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStandardItems.map((stdItem) => {
                const matchStatusList = reports.map(r => !!findStandardItemMatch(r, stdItem));
                const hasDiscrepancy = new Set(matchStatusList).size > 1; // บางเจ้ามี บางเจ้าไม่มี

                return (
                  <tr
                    key={stdItem.id}
                    className={`${hasDiscrepancy ? 'bg-amber-50/20' : ''} hover:bg-slate-50 transition-colors print:break-inside-avoid print:border-b print:border-slate-200`}
                  >
                    {/* Category */}
                    <td className="py-3.5 px-4 font-medium text-slate-500 align-top print:py-2 print:px-2 print:text-slate-800">
                      {stdItem.category}
                    </td>

                    {/* Topic & Description */}
                    <td className="py-3.5 px-4 align-top space-y-1 print:py-2 print:px-2">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800">{stdItem.topic}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono print:border print:border-slate-200">
                          แบบ {stdItem.referenceDoc}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug print:text-slate-600">{stdItem.description}</p>
                    </td>

                    {/* Importance */}
                    <td className="py-3.5 px-3 text-center align-top print:py-2 print:px-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${IMPORTANCE_CONFIG[stdItem.importance].badge}`}>
                        {IMPORTANCE_CONFIG[stdItem.importance].dot} {IMPORTANCE_CONFIG[stdItem.importance].label}
                      </span>
                    </td>

                    {/* Company Columns */}
                    {reports.map((report) => {
                      const match = findStandardItemMatch(report, stdItem);

                      return (
                        <td key={report.id} className="py-3.5 px-4 align-top print:py-2 print:px-2">
                          {match ? (
                            <div className="space-y-1 bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-100 print:bg-emerald-50/40 print:p-1.5 print:rounded-lg print:border-slate-200">
                              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs print:text-[11px]">
                                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                                <span>รวมในรายการตรวจ</span>
                              </div>
                              {match.detail && (
                                <p className="text-[11px] text-slate-600 leading-relaxed pl-4 print:text-[10px] print:pl-3">
                                  {match.detail}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400 text-xs py-1 px-2 print:text-[11px] print:px-1">
                              <XCircle size={13} className="text-slate-300 shrink-0" />
                              <span>ไม่ได้ระบุในข้อเสนอ</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 2: รายการตรวจพิเศษ & เงื่อนไขการให้บริการ */}
      {/* ========================================================= */}
      <div className={`space-y-6 ${activeTab === 'special' ? 'block' : 'hidden print:block print:pt-4 print:break-before-page'}`}>
        {/* Section 2.1: ตารางเงื่อนไขการให้บริการ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:overflow-visible print:border print:border-slate-300 print:rounded-xl print:shadow-none print-avoid-break mb-6">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2 print:bg-slate-100 print:py-2.5 print:px-4">
            <Clock size={16} className="text-violet-600 print:text-slate-800" />
            <div>
              <h3 className="text-xs font-bold text-slate-800 print:text-sm">
                ส่วนที่ 2: เงื่อนไขการให้บริการและสัญญา (Service Terms Comparison)
              </h3>
              <p className="text-[10px] text-slate-500 print:text-[11px] print:text-slate-600">
                เปรียบเทียบรอบเข้าตรวจ จำนวนทีมงาน กำหนดส่งเล่ม และเครื่องมือตรวจ
              </p>
            </div>
          </div>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left text-xs border-collapse print:text-[11px]">
              <thead className="bg-slate-50 border-b border-slate-200 print:bg-slate-100 print:border-b-2 print:border-slate-300" style={{ display: 'table-header-group' }}>
                <tr>
                  <th className="py-3 px-4 font-semibold text-slate-600 w-56 print:w-52 print:py-2 print:px-2 print:text-slate-800">เงื่อนไขการให้บริการ</th>
                  {reports.map((r, idx) => (
                    <th key={r.id} className="py-3 px-4 font-semibold text-slate-800 min-w-[200px] print:min-w-0 print:py-2 print:px-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${COMPANY_PALETTES[idx % 5].badge}`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{r.company}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* รอบตรวจ */}
                <tr className="print:border-b print:border-slate-200">
                  <td className="py-3 px-4 font-semibold text-slate-700 print:py-2 print:px-2">🔄 จำนวนรอบที่เข้าตรวจ</td>
                  {reports.map(r => (
                    <td key={r.id} className="py-3 px-4 text-slate-800 print:py-2 print:px-2">
                      {r.serviceTerms?.rounds || <span className="text-slate-400 italic">ไม่ระบุ</span>}
                    </td>
                  ))}
                </tr>

                {/* จำนวนทีมงาน */}
                <tr className="print:border-b print:border-slate-200">
                  <td className="py-3 px-4 font-semibold text-slate-700 print:py-2 print:px-2">👷‍♂️ จำนวนคนในทีมตรวจ</td>
                  {reports.map(r => (
                    <td key={r.id} className="py-3 px-4 text-slate-800 print:py-2 print:px-2">
                      {r.serviceTerms?.teamSize || <span className="text-slate-400 italic">ไม่ระบุ</span>}
                    </td>
                  ))}
                </tr>

                {/* เวลาส่งรายงาน */}
                <tr className="print:border-b print:border-slate-200">
                  <td className="py-3 px-4 font-semibold text-slate-700 print:py-2 print:px-2">⏱️ กำหนดส่งมอบเล่มรายงาน</td>
                  {reports.map(r => (
                    <td key={r.id} className="py-3 px-4 text-slate-800 print:py-2 print:px-2">
                      {r.serviceTerms?.reportDelivery || <span className="text-slate-400 italic">ไม่ระบุ</span>}
                    </td>
                  ))}
                </tr>

                {/* รูปแบบรายงาน */}
                <tr className="print:border-b print:border-slate-200">
                  <td className="py-3 px-4 font-semibold text-slate-700 print:py-2 print:px-2">📑 รูปแบบรายงานผลตรวจ</td>
                  {reports.map(r => (
                    <td key={r.id} className="py-3 px-4 text-slate-800 print:py-2 print:px-2">
                      {r.serviceTerms?.reportFormat || <span className="text-slate-400 italic">ไม่ระบุ</span>}
                    </td>
                  ))}
                </tr>

                {/* เครื่องมือพิเศษ */}
                <tr className="print:border-b print:border-slate-200">
                  <td className="py-3 px-4 font-semibold text-slate-700 print:py-2 print:px-2">🛠️ เทคโนโลยี / เครื่องมือตรวจ</td>
                  {reports.map(r => (
                    <td key={r.id} className="py-3 px-4 text-slate-800 print:py-2 print:px-2">
                      {r.serviceTerms?.specialTools && r.serviceTerms.specialTools.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.serviceTerms.specialTools.map((tool, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-violet-50 text-violet-700 font-medium text-[11px] border border-violet-100 print:border-slate-200">
                              ✦ {tool}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">เครื่องมือมาตรฐาน</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* หมายเหตุพิเศษ */}
                <tr className="print:border-b print:border-slate-200">
                  <td className="py-3 px-4 font-semibold text-slate-700 print:py-2 print:px-2">📝 จุดเด่นหรือการรับประกัน</td>
                  {reports.map(r => (
                    <td key={r.id} className="py-3 px-4 text-slate-800 print:py-2 print:px-2">
                      {r.serviceTerms?.specialNotes || <span className="text-slate-400 italic">-</span>}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2.2: ตารางรายการตรวจพิเศษนอกเหนือมาตรฐาน */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:overflow-visible print:border print:border-slate-300 print:rounded-xl print:shadow-none print-avoid-break">
          <div className="p-4 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between print:bg-amber-50 print:py-2.5 print:px-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-600" />
              <div>
                <h3 className="text-xs font-bold text-slate-800 print:text-sm">
                  ส่วนที่ 3: รายการตรวจพิเศษนอกเหนือเกณฑ์มาตรฐาน (Special Add-on Inspections)
                </h3>
                <p className="text-[10px] text-slate-500 print:text-[11px] print:text-slate-600">
                  รายการตรวจหรือนวัตกรรมพิเศษที่บางบริษัทเสนอเพิ่มเป็นจุดเด่น
                </p>
              </div>
            </div>
            <span className="text-xs text-amber-800 font-semibold print:text-[11px]">
              {allSpecialTopics.length} รายการพิเศษ
            </span>
          </div>

          {allSpecialTopics.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              ไม่มีรายการตรวจพิเศษนอกเหนือจากรายการมาตรฐาน
            </div>
          ) : (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-xs border-collapse print:text-[11px]">
                <thead className="bg-slate-50 border-b border-slate-200 print:bg-slate-100 print:border-b-2 print:border-slate-300" style={{ display: 'table-header-group' }}>
                  <tr>
                    <th className="py-3 px-4 font-semibold text-slate-600 w-64 print:w-60 print:py-2 print:px-2 print:text-slate-800">รายการตรวจพิเศษ</th>
                    {reports.map((r, idx) => (
                      <th key={r.id} className="py-3 px-4 font-semibold text-slate-800 min-w-[200px] print:min-w-0 print:py-2 print:px-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${COMPANY_PALETTES[idx % 5].badge}`}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <span>{r.company}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allSpecialTopics.map((spTopic) => (
                    <tr key={spTopic.topic} className="hover:bg-slate-50 transition-colors print:break-inside-avoid print:border-b print:border-slate-200">
                      <td className="py-3.5 px-4 font-semibold text-slate-800 print:py-2 print:px-2">
                        <span className="inline-flex items-center gap-1.5">
                          <Sparkles size={12} className="text-amber-500" />
                          {spTopic.topic}
                        </span>
                      </td>
                      {reports.map((r) => {
                        const item = (r.specialItems || []).find(i => i.topic === spTopic.topic);
                        return (
                          <td key={r.id} className="py-3.5 px-4 print:py-2 print:px-2">
                            {item ? (
                              <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-200 text-amber-900 space-y-0.5 print:bg-amber-50/50 print:p-1.5 print:rounded-lg print:border-slate-200">
                                <div className="font-bold flex items-center gap-1 text-xs print:text-[11px]">
                                  <CheckCircle2 size={12} className="text-amber-600" />
                                  มีบริการนี้
                                </div>
                                <p className="text-[11px] text-slate-600 print:text-[10px]">{item.detail}</p>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:flex items-center justify-between pt-4 mt-6 border-t border-slate-300 text-[10px] text-slate-500 print-avoid-break">
        <div>
          <span>รายงานเปรียบเทียบจัดทำโดยระบบ Home Inspection Analyzer | อ้างอิงแบบบ้านแก้วมุกดา</span>
        </div>
        <div>
          <span>เอกสารนี้ใช้สำหรับประกอบการตัดสินใจคัดเลือกผู้ให้บริการตรวจรับบ้าน</span>
        </div>
      </div>
    </div>
  );
}
