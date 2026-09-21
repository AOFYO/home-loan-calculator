import React, { useEffect, useState } from 'react';
import { Loader2, FolderOpen, Trash2, Clock, Cloud, HardDrive, RefreshCw } from 'lucide-react';
import type { ComparisonSession } from './types';

interface SessionListProps {
  onLoad: (session: ComparisonSession) => void;
}

export function SessionList({ onLoad }: SessionListProps) {
  const [sessions, setSessions] = useState<ComparisonSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redisWarning, setRedisWarning] = useState<string | null>(null);

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
      combinedMap.set(s.id, { ...s, storageSource: 'local' });
    }

    // ใส่ Cloud ทับ (ถ้ามี Cloud จะถือเป็น Cloud)
    for (const s of cloudSessions) {
      combinedMap.set(s.id, { ...s, storageSource: 'cloud' });
    }

    const merged = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    setSessions(merged);
    setLoading(false);
  };

  const deleteSession = async (id: string) => {
    if (!confirm('ต้องการลบประวัติตรวจบ้านนี้ใช่หรือไม่?')) return;

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

  useEffect(() => {
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
        <Loader2 size={28} className="animate-spin text-violet-500" />
        <span className="text-xs">กำลังโหลดประวัติการเปรียบเทียบ...</span>
      </div>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700">
        <p className="font-medium">เกิดข้อผิดพลาด</p>
        <p className="text-sm mt-1">{error}</p>
        <button
          onClick={fetchSessions}
          className="mt-3 px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium"
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800">ประวัติการเปรียบเทียบ</h2>
          <p className="text-xs text-slate-500">บันทึกทั้งบนคลาวด์และในเครื่อง เปิดดูได้ตลอดเวลา</p>
        </div>
        <button
          onClick={fetchSessions}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors bg-white shadow-sm"
        >
          <RefreshCw size={12} />
          รีเฟรช
        </button>
      </div>

      {/* Redis notification banner */}
      {redisWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 shadow-sm text-xs text-amber-800">
          <div className="flex items-start gap-2.5">
            <span className="text-lg shrink-0">💡</span>
            <div>
              <p className="font-semibold text-amber-900">กำลังใช้พื้นที่จัดเก็บบนเครื่อง (Local Storage)</p>
              <p className="text-amber-700 text-[11px] mt-0.5 leading-relaxed">
                ประวัติของคุณจะถูกบันทึกไว้ในเบราว์เซอร์เครื่องนี้โดยอัตโนมัติ (หากต้องการซิงค์ข้ามมือถือ/คอม สามารถเพิ่มตัวแปร Redis ใน Vercel ได้ในภายหลัง)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {sessions.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-2">
          <FolderOpen size={40} className="text-slate-300 mx-auto" />
          <p className="text-slate-600 font-semibold text-sm">ยังไม่มีประวัติการเปรียบเทียบ</p>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            หลังจากอัปโหลดเอกสารและให้ AI วิเคราะห์แล้ว ให้กดปุ่ม <strong>"บันทึกประวัติ"</strong> ในหน้าเปรียบเทียบ ข้อมูลจะมาแสดงที่นี่ทันที
          </p>
        </div>
      )}

      {/* Session Cards */}
      {sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map(session => (
            <div
              key={session.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-slate-800 text-sm">{session.name || 'ไม่มีชื่อ'}</p>
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

                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(session.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                  <span>• {session.reports.length} บริษัท</span>
                  <span>
                    • รายชื่อ:{' '}
                    <span className="text-slate-700 font-medium">
                      {session.reports.map(r => r.company).join(', ')}
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onLoad(session)}
                  className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors shadow-sm"
                >
                  เปิดดูผลเปรียบเทียบ
                </button>
                <button
                  onClick={() => deleteSession(session.id)}
                  className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                  title="ลบประวัติตรวจนี้"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
