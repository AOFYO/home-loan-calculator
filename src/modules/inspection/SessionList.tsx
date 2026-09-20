import React, { useEffect, useState } from 'react';
import { Loader2, FolderOpen, Trash2, Clock } from 'lucide-react';
import type { ComparisonSession } from './types';

interface SessionListProps {
  onLoad: (session: ComparisonSession) => void;
}

export function SessionList({ onLoad }: SessionListProps) {
  const [sessions, setSessions] = useState<ComparisonSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inspection-sessions');
      const json = await res.json();
      if (json.success) {
        setSessions(json.sessions || []);
      } else {
        setError(json.error || 'ไม่สามารถโหลด session ได้');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('ลบ session นี้?')) return;
    try {
      await fetch(`/api/inspection-sessions?id=${id}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      alert('ไม่สามารถลบได้');
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-2" />
        <span>กำลังโหลดประวัติ...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-700">
        <p className="font-medium">เกิดข้อผิดพลาด</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <FolderOpen size={36} className="text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500 font-medium">ยังไม่มีประวัติการเปรียบเทียบ</p>
        <p className="text-slate-400 text-sm mt-1">เมื่อวิเคราะห์และบันทึกแล้ว จะแสดงที่นี่</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map(session => (
        <div
          key={session.id}
          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
        >
          <div className="flex-1">
            <p className="font-semibold text-slate-800">{session.name || 'ไม่มีชื่อ'}</p>
            <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {new Date(session.createdAt).toLocaleDateString('th-TH', {
                  year: 'numeric', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </span>
              <span>{session.reports.length} บริษัท</span>
              <span>{session.allTopics.length} หัวข้อ</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onLoad(session)}
              className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 transition-colors"
            >
              เปิด
            </button>
            <button
              onClick={() => deleteSession(session.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
