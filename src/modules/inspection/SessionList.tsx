import React, { useEffect, useState, useMemo } from 'react';
import { 
  Loader2, 
  FolderOpen, 
  Trash2, 
  Clock, 
  Cloud, 
  HardDrive, 
  RefreshCw, 
  Search, 
  Calendar, 
  Database, 
  Filter, 
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import type { ComparisonSession, TimePeriodFilter, StorageCapacityInfo } from './types';

interface SessionListProps {
  onLoad: (session: ComparisonSession) => void;
}

const MAX_STORAGE_LIMIT = 50;

/**
 * คำนวณช่วงเวลาของการบันทึกประวัติ (วันนี้ / 7 วันล่าสุด / เดือนนี้ / เก่ากว่านี้)
 */
export function getTimePeriodCategory(dateStr: string): 'today' | 'week' | 'month' | 'older' {
  const date = new Date(dateStr);
  const now = new Date();

  // 1. วันนี้ (เริ่มจาก 00:00 น. ของวันนี้)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date.getTime() >= startOfToday) {
    return 'today';
  }

  // 2. 7 วันล่าสุด (ย้อนหลังจาก startOfToday ไป 7 วัน)
  const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;
  if (date.getTime() >= sevenDaysAgo) {
    return 'week';
  }

  // 3. เดือนนี้ / 30 วันล่าสุด (ย้อนหลังจาก startOfToday ไป 30 วัน)
  const thirtyDaysAgo = startOfToday - 30 * 24 * 60 * 60 * 1000;
  if (date.getTime() >= thirtyDaysAgo) {
    return 'month';
  }

  // 4. เก่ากว่า 30 วัน
  return 'older';
}

/**
 * จัดรูปแบบวันที่และเวลาแบบภาษาไทยที่อ่านง่าย
 */
function formatSessionDate(dateStr: string): { displayDate: string; timeAgo: string } {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  let timeAgo = '';
  if (diffMinutes < 1) {
    timeAgo = 'เมื่อสักครู่';
  } else if (diffMinutes < 60) {
    timeAgo = `${diffMinutes} นาทีที่แล้ว`;
  } else if (diffHours < 24) {
    timeAgo = `${diffHours} ชั่วโมงที่แล้ว`;
  } else if (diffDays === 1) {
    timeAgo = 'เมื่อวานนี้';
  } else {
    timeAgo = `${diffDays} วันที่แล้ว`;
  }

  const displayDate = date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return { displayDate, timeAgo };
}

export function SessionList({ onLoad }: SessionListProps) {
  const [sessions, setSessions] = useState<ComparisonSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redisWarning, setRedisWarning] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<TimePeriodFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isClearingOlder, setIsClearingOlder] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);

    // 1. อ่านข้อมูลจาก LocalStorage สำรองก่อนเสมอ
    let localSessions: ComparisonSession[] = [];
    try {
      const raw = localStorage.getItem('inspection_sessions_backup');
      if (raw) {
        localSessions = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Cannot read local sessions:', e);
    }

    // 2. ดึงข้อมูลจาก Cloud (Upstash Redis API)
    let cloudSessions: ComparisonSession[] = [];
    try {
      const res = await fetch('/api/inspection-sessions');
      const json = await res.json();
      if (json.success) {
        cloudSessions = (json.sessions || []).map((s: ComparisonSession) => ({
          ...s,
          storageSource: 'cloud' as const,
        }));
        if (json.warning) setRedisWarning(json.warning);
      } else {
        if (json.warning) setRedisWarning(json.warning);
      }
    } catch (e: any) {
      console.warn('Cannot fetch cloud sessions:', e.message);
    }

    // 3. รวมทั้งสองแหล่ง (De-duplicate โดยยึด id)
    const combinedMap = new Map<string, ComparisonSession>();

    // ใส่ Local ก่อน
    for (const s of localSessions) {
      combinedMap.set(s.id, { 
        ...s, 
        storageSource: 'local',
        periodCategory: getTimePeriodCategory(s.createdAt)
      });
    }

    // ใส่ Cloud ทับ (ถ้ามี Cloud จะถือเป็น Cloud)
    for (const s of cloudSessions) {
      combinedMap.set(s.id, { 
        ...s, 
        storageSource: 'cloud',
        periodCategory: getTimePeriodCategory(s.createdAt)
      });
    }

    const merged = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setSessions(merged);
    setLoading(false);
  };

  const deleteSession = async (id: string, name: string) => {
    if (!confirm(`ต้องการลบประวัติ "${name || 'ไม่มีชื่อ'}" ใช่หรือไม่?`)) return;

    // ลบจาก LocalStorage
    try {
      const raw = localStorage.getItem('inspection_sessions_backup');
      if (raw) {
        const local = JSON.parse(raw).filter((s: any) => s.id !== id);
        localStorage.setItem('inspection_sessions_backup', JSON.stringify(local));
      }
    } catch (e) {
      console.warn('Local delete error', e);
    }

    // ลบจาก Cloud API
    try {
      await fetch(`/api/inspection-sessions?id=${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Cloud delete error', e);
    }

    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const clearOlderSessions = async () => {
    const olderCount = sessions.filter(s => getTimePeriodCategory(s.createdAt) === 'older').length;
    if (olderCount === 0) {
      alert('ไม่มีประวัติการเปรียบเทียบที่เก่ากว่า 30 วันในระบบ');
      return;
    }

    if (!confirm(`ต้องการล้างประวัติที่เก่ากว่า 30 วันทั้งหมด (${olderCount} รายการ) เพื่อคืนพื้นที่ความจุใช่หรือไม่?`)) {
      return;
    }

    setIsClearingOlder(true);

    // 1. ล้างจาก LocalStorage
    try {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const raw = localStorage.getItem('inspection_sessions_backup');
      if (raw) {
        const local = JSON.parse(raw).filter((s: any) => new Date(s.createdAt).getTime() >= thirtyDaysAgo);
        localStorage.setItem('inspection_sessions_backup', JSON.stringify(local));
      }
    } catch (e) {
      console.warn('Local clear older error', e);
    }

    // 2. ล้างจาก Cloud API
    try {
      await fetch('/api/inspection-sessions?clear=older_than_30_days', { method: 'DELETE' });
    } catch (e) {
      console.warn('Cloud clear older error', e);
    }

    setIsClearingOlder(false);
    await fetchSessions();
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // คำนวณความจุและโควตาการจัดเก็บ
  const storageInfo = useMemo<StorageCapacityInfo>(() => {
    const totalCount = sessions.length;
    const usagePercent = Math.min(100, Math.round((totalCount / MAX_STORAGE_LIMIT) * 100));
    
    let approximateSizeKb = 0;
    try {
      const raw = localStorage.getItem('inspection_sessions_backup') || '';
      approximateSizeKb = Math.max(1, Math.round(new Blob([raw]).size / 1024));
    } catch {
      approximateSizeKb = totalCount * 15;
    }

    const cloudCount = sessions.filter(s => s.storageSource === 'cloud').length;
    const localCount = sessions.filter(s => s.storageSource === 'local').length;

    return {
      totalCount,
      maxLimit: MAX_STORAGE_LIMIT,
      usagePercent,
      approximateSizeKb,
      cloudCount,
      localCount,
    };
  }, [sessions]);

  // สถิติจำนวนตามช่วงเวลา
  const periodCounts = useMemo(() => {
    const counts = {
      all: sessions.length,
      today: 0,
      week: 0,
      month: 0,
      older: 0,
    };

    for (const s of sessions) {
      const cat = getTimePeriodCategory(s.createdAt);
      counts[cat]++;
    }

    return counts;
  }, [sessions]);

  // กรองรายการตามช่วงเวลาและคำค้นหา
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      // ตัวกรองช่วงเวลา
      if (activeFilter !== 'all') {
        const cat = getTimePeriodCategory(s.createdAt);
        if (cat !== activeFilter) return false;
      }

      // ตัวกรองคำค้นหา
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.name.toLowerCase().includes(q);
        const matchCompany = s.reports.some(r => r.company.toLowerCase().includes(q));
        const matchDate = s.createdAt.includes(q);
        if (!matchName && !matchCompany && !matchDate) return false;
      }

      return true;
    });
  }, [sessions, activeFilter, searchQuery]);

  // จัดกลุ่มรายการสำหรับแท็บ 'all'
  const groupedSessions = useMemo(() => {
    const groups: {
      category: 'today' | 'week' | 'month' | 'older';
      title: string;
      icon: string;
      items: ComparisonSession[];
    }[] = [
      { category: 'today', title: 'วันนี้ (Today)', icon: '⚡', items: [] },
      { category: 'week', title: '7 วันล่าสุด (This Week)', icon: '🗓️', items: [] },
      { category: 'month', title: 'เดือนนี้ (This Month)', icon: '📅', items: [] },
      { category: 'older', title: 'เก่ากว่า 1 เดือน (Older)', icon: '📁', items: [] },
    ];

    for (const s of filteredSessions) {
      const cat = getTimePeriodCategory(s.createdAt);
      const grp = groups.find(g => g.category === cat);
      if (grp) grp.items.push(s);
    }

    return groups.filter(g => g.items.length > 0);
  }, [filteredSessions]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 size={32} className="animate-spin text-violet-600" />
        <span className="text-xs font-medium text-slate-600">กำลังโหลดประวัติการเปรียบเทียบตามช่วงเวลา...</span>
      </div>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700 space-y-2">
        <p className="font-bold text-sm">เกิดข้อผิดพลาดในการโหลดประวัติ</p>
        <p className="text-xs">{error}</p>
        <button
          onClick={fetchSessions}
          className="mt-2 px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header & Storage Capacity Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">ประวัติการเปรียบเทียบตรวจบ้าน</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700">
                แยกตามช่วงเวลา
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ระบบจัดเก็บแยกตามช่วงเวลาที่บันทึก สามารถเลือกดูย้อนหลังได้โดยไม่เกินขีดจำกัดสูงสุด
            </p>
          </div>

          <div className="flex items-center gap-2">
            {periodCounts.older > 0 && (
              <button
                onClick={clearOlderSessions}
                disabled={isClearingOlder}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 text-xs font-medium text-slate-600 hover:text-red-600 transition-colors shadow-xs disabled:opacity-50"
                title="ลบประวัติที่เก่ากว่า 30 วันเพื่อเพิ่มความจุ"
              >
                {isClearingOlder ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                <span>ล้างประวัติเก่า ({periodCounts.older})</span>
              </button>
            )}

            <button
              onClick={fetchSessions}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors bg-white shadow-xs"
            >
              <RefreshCw size={12} />
              <span>รีเฟรช</span>
            </button>
          </div>
        </div>

        {/* Storage Capacity Meter (ควบคุมความจุไม่ให้เกินขีดจำกัด) */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-violet-600" />
              <span className="font-bold text-slate-700">พื้นที่จัดเก็บประวัติ:</span>
              <span className="font-semibold text-slate-900">
                {storageInfo.totalCount} / {storageInfo.maxLimit} รายการ
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                storageInfo.usagePercent >= 90
                  ? 'bg-rose-100 text-rose-700'
                  : storageInfo.usagePercent >= 70
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {storageInfo.usagePercent}% ของขีดจำกัด
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span>ขนาดประมาณ: <strong>~{storageInfo.approximateSizeKb} KB</strong></span>
              {storageInfo.cloudCount > 0 && <span>☁️ คลาวด์ {storageInfo.cloudCount}</span>}
              {storageInfo.localCount > 0 && <span>💾 ในเครื่อง {storageInfo.localCount}</span>}
            </div>
          </div>

          {/* Capacity Progress Bar */}
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                storageInfo.usagePercent >= 90
                  ? 'bg-rose-500'
                  : storageInfo.usagePercent >= 70
                  ? 'bg-amber-500'
                  : 'bg-violet-600'
              }`}
              style={{ width: `${Math.max(4, storageInfo.usagePercent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Info size={11} className="text-slate-400" />
              ระบบตั้งค่าความจุสูงสุดไว้ที่ {MAX_STORAGE_LIMIT} รายการเพื่อความเสถียร (หากเกิน รายการเก่าที่สุดจะถูกหมุนเวียนออกอัตโนมัติ)
            </span>
            <span className="font-mono">ขีดจำกัด: {MAX_STORAGE_LIMIT} Sessions</span>
          </div>
        </div>
      </div>

      {/* Redis notification banner */}
      {redisWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 shadow-xs text-xs text-amber-800">
          <div className="flex items-start gap-2.5">
            <span className="text-base shrink-0">💡</span>
            <div>
              <p className="font-semibold text-amber-900">กำลังใช้พื้นที่จัดเก็บบนเครื่อง (Local Storage)</p>
              <p className="text-amber-700 text-[11px] mt-0.5 leading-relaxed">
                ประวัติของคุณจะถูกบันทึกไว้ในเบราว์เซอร์เครื่องนี้โดยอัตโนมัติ และจะคงอยู่ตลอดไปตามโควตาที่กำหนด (หากต้องการซิงค์ข้ามมือถือ/คอม สามารถเพิ่มตัวแปร Redis ใน Vercel ได้ในภายหลัง)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Controls: Time Period Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Filter Tabs by Time Period */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1 mr-1">
              <Filter size={12} />
              <span>ช่วงเวลา:</span>
            </span>

            {([
              { id: 'all', label: 'ทั้งหมด', count: periodCounts.all },
              { id: 'today', label: 'วันนี้', count: periodCounts.today },
              { id: 'week', label: '7 วันล่าสุด', count: periodCounts.week },
              { id: 'month', label: 'เดือนนี้', count: periodCounts.month },
              { id: 'older', label: 'เก่ากว่า 1 เดือน', count: periodCounts.older },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                  ${activeFilter === tab.id
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }
                `}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeFilter === tab.id
                    ? 'bg-violet-800 text-violet-100'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อบ้าน, โครงการ, บริษัท..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400 text-slate-800 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Empty State */}
      {filteredSessions.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-3">
          <FolderOpen size={44} className="text-slate-300 mx-auto" />
          <div>
            <p className="text-slate-700 font-bold text-sm">
              {sessions.length === 0
                ? 'ยังไม่มีประวัติการเปรียบเทียบในระบบ'
                : 'ไม่พบประวัติในช่วงเวลาหรือคำค้นหาที่เลือก'}
            </p>
            <p className="text-slate-400 text-xs max-w-sm mx-auto mt-1">
              {sessions.length === 0
                ? 'หลังจากอัปโหลดเอกสารและให้ AI วิเคราะห์แล้ว ให้กดปุ่ม "บันทึกประวัติ" ในหน้าเปรียบเทียบ ข้อมูลจะมาบันทึกแยกตามช่วงเวลาที่นี่ทันที'
                : 'ลองเปลี่ยนช่วงเวลาที่ต้องการดู หรือล้างคำค้นหาเพื่อแสดงรายการทั้งหมด'}
            </p>
          </div>
          {activeFilter !== 'all' && (
            <button
              onClick={() => setActiveFilter('all')}
              className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              ดูประวัติทั้งหมด ({sessions.length} รายการ)
            </button>
          )}
        </div>
      )}

      {/* 4. Session Cards: Grouped by Time Period or Filtered List */}
      {filteredSessions.length > 0 && (
        <div className="space-y-6">
          {activeFilter === 'all' && !searchQuery.trim() ? (
            // แสดงแบบแบ่งตามกลุ่มช่วงเวลา (Grouped View)
            groupedSessions.map(group => (
              <div key={group.category} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-base">{group.icon}</span>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {group.title}
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600 font-semibold">
                    {group.items.length} รายการ
                  </span>
                </div>

                <div className="space-y-3">
                  {group.items.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onLoad={onLoad}
                      onDelete={() => deleteSession(session.id, session.name)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            // แสดงรายการที่กรองไว้ตามช่วงเวลาที่เลือก
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
                <span>แสดงผล {filteredSessions.length} รายการ</span>
                {activeFilter !== 'all' && (
                  <span className="text-violet-600 font-semibold">
                    กรองเฉพาะ: {activeFilter === 'today' ? 'วันนี้' : activeFilter === 'week' ? '7 วันล่าสุด' : activeFilter === 'month' ? 'เดือนนี้' : 'เก่ากว่า 1 เดือน'}
                  </span>
                )}
              </div>

              {filteredSessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onLoad={onLoad}
                  onDelete={() => deleteSession(session.id, session.name)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Component ย่อยแสดงการ์ดประวัติแต่ละ Session พร้อมรายละเอียด
 */
interface SessionCardProps {
  session: ComparisonSession;
  onLoad: (session: ComparisonSession) => void;
  onDelete: () => void;
}

function SessionCard({ session, onLoad, onDelete }: SessionCardProps) {
  const { displayDate, timeAgo } = formatSessionDate(session.createdAt);
  const period = getTimePeriodCategory(session.createdAt);

  const periodBadge = {
    today: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'วันนี้' },
    week: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: '7 วันล่าสุด' },
    month: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'เดือนนี้' },
    older: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', label: 'เก่ากว่า 1 เดือน' },
  }[period];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex-1 space-y-2">
        {/* Title and Storage Source Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-slate-900 text-sm">{session.name || 'บ้านในฝัน 8'}</p>

          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${periodBadge.border} ${periodBadge.bg} ${periodBadge.text}`}>
            <Clock size={10} />
            {periodBadge.label} ({timeAgo})
          </span>

          {session.storageSource === 'cloud' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
              <Cloud size={10} />
              คลาวด์
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
              <HardDrive size={10} />
              ในเครื่อง
            </span>
          )}
        </div>

        {/* Detailed Metadata: Date, Companies, Prices */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
          <span className="flex items-center gap-1 font-mono text-slate-600">
            <Calendar size={12} className="text-slate-400" />
            {displayDate}
          </span>
          <span>•</span>
          <span>
            เปรียบเทียบ <strong>{session.reports.length} บริษัท</strong>
          </span>
          <span>•</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {session.reports.map((r, i) => (
              <span key={r.id || i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block" />
                {r.company}
                {r.price != null && (
                  <span className="text-violet-700 font-bold ml-0.5">
                    (฿{r.price.toLocaleString('th-TH')})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        <button
          onClick={() => onLoad(session)}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm"
        >
          <span>เปิดดูผลเปรียบเทียบ</span>
          <ChevronRight size={14} />
        </button>
        <button
          onClick={onDelete}
          className="p-2.5 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shadow-xs"
          title="ลบประวัติตรวจนี้"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
