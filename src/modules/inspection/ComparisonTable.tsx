import React, { useState, useMemo } from 'react';
import { Download, Filter, AlertTriangle, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import type { CompanyReport, InspectionItem, InspectionStatus } from './types';

interface ComparisonTableProps {
  reports: CompanyReport[];
  sessionName: string;
}

const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}> = {
  included: {
    label: 'รวมในรายการ',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    icon: <CheckCircle2 size={14} className="text-emerald-500" />,
  },
  not_included: {
    label: 'ไม่รวม',
    color: 'text-slate-500',
    bgColor: 'bg-slate-50',
    icon: <MinusCircle size={14} className="text-slate-400" />,
  },
  // backward compat
  ok: {
    label: 'รวมในรายการ',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    icon: <CheckCircle2 size={14} className="text-emerald-500" />,
  },
  warning: {
    label: 'รวม (มีเงื่อนไข)',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    icon: <AlertTriangle size={14} className="text-amber-500" />,
  },
  critical: {
    label: 'รวม (สำคัญ)',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    icon: <XCircle size={14} className="text-red-500" />,
  },
  not_checked: {
    label: 'ไม่ระบุ',
    color: 'text-slate-500',
    bgColor: 'bg-slate-50',
    icon: <MinusCircle size={14} className="text-slate-400" />,
  },
};

// สร้าง merged topic map: { category -> [topic1, topic2, ...] }
function buildTopicMap(reports: CompanyReport[]): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};
  for (const report of reports) {
    for (const item of report.items) {
      if (!map[item.category]) map[item.category] = new Set();
      map[item.category].add(item.topic);
    }
  }
  return Object.fromEntries(
    Object.entries(map).map(([cat, topics]) => [cat, Array.from(topics).sort()])
  );
}

// หา item ของบริษัทนั้น ตาม category + topic
function findItem(report: CompanyReport, category: string, topic: string): InspectionItem | undefined {
  return report.items.find(i => i.category === category && i.topic === topic);
}

export function ComparisonTable({ reports, sessionName }: ComparisonTableProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  const topicMap = useMemo(() => buildTopicMap(reports), [reports]);
  const categories = useMemo(() => Object.keys(topicMap).sort(), [topicMap]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['หมวดหมู่', 'หัวข้อ', ...reports.map(r => r.company)];
    const rows: string[][] = [];

    for (const [category, topics] of Object.entries(topicMap)) {
      for (const topic of topics) {
        const row = [category, topic];
        for (const report of reports) {
          const item = findItem(report, category, topic);
          row.push(item ? `${STATUS_CONFIG[item.status].label}: ${item.detail}` : '-');
        }
        rows.push(row);
      }
    }

    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ตรวจบ้าน_${sessionName || 'report'}_${new Date().toLocaleDateString('th-TH')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredCategories = categories.filter(c => filterCategory === 'all' || c === filterCategory);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-600">กรอง:</span>
        </div>

        {/* Category filter */}
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="all">ทุกหมวดหมู่</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Severity filter */}
        <select
          value={filterSeverity}
          onChange={e => setFilterSeverity(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="all">ทุกระดับความสำคัญ</option>
          <option value="high">🔴 สำคัญมาก (โครงสร้าง/ระบบหลัก)</option>
          <option value="medium">🟡 สำคัญปานกลาง</option>
          <option value="low">🟢 รายละเอียด</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Summary cards — ราคา + ความครอบคลุม */}
      <div className={`grid gap-3 ${reports.length <= 2 ? 'grid-cols-2' : reports.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {reports.map((report, idx) => {
          const totalTopics = Object.values(topicMap).reduce((sum, t) => sum + t.length, 0);
          const covered = report.items.filter(i => i.status === 'included' || i.status === 'ok').length;
          const coveragePct = totalTopics > 0 ? Math.round((covered / totalTopics) * 100) : 0;
          const pricePerTopic = report.price && covered > 0
            ? Math.round(report.price / covered)
            : null;

          const BADGE_COLORS = ['border-blue-200 bg-blue-50', 'border-emerald-200 bg-emerald-50', 'border-amber-200 bg-amber-50', 'border-rose-200 bg-rose-50', 'border-violet-200 bg-violet-50'];
          const TEXT_COLORS = ['text-blue-700', 'text-emerald-700', 'text-amber-700', 'text-rose-700', 'text-violet-700'];

          return (
            <div key={report.id} className={`rounded-xl border-2 ${BADGE_COLORS[idx % 5]} p-3 shadow-sm`}>
              <p className={`text-xs font-bold truncate mb-2 ${TEXT_COLORS[idx % 5]}`}>{report.company}</p>

              {/* ราคา */}
              <div className="mb-2">
                {report.price != null ? (
                  <div>
                    <div className="text-base font-bold text-slate-800">
                      ฿{report.price.toLocaleString('th-TH')}
                    </div>
                    {report.priceNote && (
                      <div className="text-[10px] text-slate-500 mt-0.5">{report.priceNote}</div>
                    )}
                    {pricePerTopic && (
                      <div className="text-[10px] text-slate-500">
                        ≈ ฿{pricePerTopic.toLocaleString('th-TH')} / หัวข้อ
                      </div>
                    )}
                    <div className={`text-[10px] mt-0.5 ${report.priceSource === 'ai' ? 'text-violet-500' : 'text-slate-400'}`}>
                      {report.priceSource === 'ai' ? '🤖 AI สกัดอัตโนมัติ' : '✏️ กรอกเอง'}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">ไม่ระบุราคา</div>
                )}
              </div>

              {/* Coverage */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">ครอบคลุม</span>
                  <span className={`font-bold ${coveragePct >= 80 ? 'text-emerald-600' : coveragePct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                    {covered}/{totalTopics} หัวข้อ ({coveragePct}%)
                  </span>
                </div>
                <div className="h-1.5 bg-white rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${coveragePct >= 80 ? 'bg-emerald-400' : coveragePct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${coveragePct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main comparison table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold text-slate-600 w-40">หมวดหมู่</th>
                <th className="py-3 px-4 font-semibold text-slate-600 w-44">หัวข้อ</th>
                {reports.map((r, idx) => (
                  <th key={r.id} className="py-3 px-4 font-semibold text-slate-700 min-w-[160px]">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold
                        ${['bg-blue-600','bg-emerald-600','bg-amber-600','bg-rose-600','bg-violet-600'][idx % 5]}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {r.company}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCategories.map(category => {
                const topics = topicMap[category];
                return topics.map((topic, topicIdx) => {
                  // ตรวจว่ามีความแตกต่างระหว่างบริษัท?
                  const statuses = reports.map(r => findItem(r, category, topic)?.status ?? 'not_checked');
                  const hasDiff = new Set(statuses).size > 1;

                  return (
                    <tr
                      key={`${category}-${topic}`}
                      className={`${hasDiff ? 'bg-amber-50/30' : ''} hover:bg-slate-50/80 transition-colors`}
                    >
                      {/* Category (only show on first row) */}
                      {topicIdx === 0 ? (
                        <td
                          rowSpan={topics.length}
                          className="py-3 px-4 font-semibold text-slate-700 text-xs bg-slate-50/50 border-r border-slate-100 align-top"
                        >
                          <div className="sticky top-0 py-1">{category}</div>
                        </td>
                      ) : null}

                      {/* Topic */}
                      <td className="py-3 px-4 text-slate-600 border-r border-slate-100">
                        <div className="flex items-center gap-1.5">
                          {hasDiff && (
                            <span title="ผลต่างกันระหว่างบริษัท" className="text-amber-500">⚠</span>
                          )}
                          {topic}
                        </div>
                      </td>

                      {/* Company columns */}
                      {reports.map(report => {
                        const item = findItem(report, category, topic);
                        const cellId = `${report.id}-${category}-${topic}`;
                        const isExpanded = expandedCell === cellId;
                        const cfg = item ? STATUS_CONFIG[item.status] : STATUS_CONFIG.not_checked;

                        return (
                          <td key={report.id} className="py-2 px-3 border-r border-slate-100 last:border-r-0">
                            {item ? (
                              <button
                                onClick={() => setExpandedCell(isExpanded ? null : cellId)}
                                className={`w-full text-left rounded-lg px-2.5 py-2 ${cfg.bgColor} transition-all`}
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  {cfg.icon}
                                  <span className={`text-[11px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                                </div>
                                <p className={`text-[10px] ${cfg.color} opacity-80 ${isExpanded ? '' : 'line-clamp-2'}`}>
                                  {item.detail}
                                </p>
                              </button>
                            ) : (
                              <div className="px-2.5 py-2 text-[10px] text-slate-400 italic">
                                — ไม่มีข้อมูล
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
