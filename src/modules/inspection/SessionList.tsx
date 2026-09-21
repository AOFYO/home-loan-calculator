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
  const [redisWarning, setRedisWarning] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inspection-sessions');
      const json = await res.json();
      if (json.success) {
        setSessions(json.sessions || []);
        if (json.warning) setRedisWarning(json.warning);
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
      <div className="space-y-4">
        {/* Redis not configured warning */}
        {redisWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-amber-800 mb-1">ระบบประวัติยังไม่พร้อมใช้งาน</p>
                <p className="text-sm text-amber-700 mb-3">
                  ต้องตั้งค่า Upstash Redis ใน Vercel เพื่อใช้ฟีเจอร์บันทึกประวัติ
                </p>
                <div className="bg-white rounded-xl border border-amber-200 p-4 space-y-2 text-sm">
                  <p className="font-semibold text-slate-700">วิธีตั้งค่า:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                    <li>ไปที่ <a href="https://upstash.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">upstash.com</a> → สร้าง Redis database ฟรี</li>
                    <li>คัดลอก <code className="bg-slate-100 px-1 rounded text-xs">REST URL</code> และ <code className="bg-slate-100 px-1 rounded text-xs">REST Token</code></li>
                    <li>ไปที่ Vercel → Project Settings → Environment Variables</li>
                    <li>เพิ่ม 2 variables:
                      <div className="mt-1 ml-4 space-y-1">
                        <div className="bg-slate-50 rounded px-2 py-1 font-mono text-xs">UPSTASH_REDIS_REST_URL = &lt;REST URL&gt;</div>
                        <div className="bg-slate-50 rounded px-2 py-1 font-mono text-xs">UPSTASH_REDIS_REST_TOKEN = &lt;REST Token&gt;</div>
                      </div>
                    </li>
                    <li>Redeploy แล้วกลับมาลองใหม่</li>
                  </ol>
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  💡 ฟีเจอร์อัปโหลดและเปรียบเทียบยังใช้งานได้ปกติ — เพียงแต่ประวัติจะไม่ถูกบันทึก
                </p>
              </div>
            </div>
          </div>
        )}

        {!redisWarning && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <FolderOpen size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">ยังไม่มีประวัติการเปรียบเทียบ</p>
            <p className="text-slate-400 text-sm mt-1">เมื่อวิเคราะห์และบันทึกแล้ว จะแสดงที่นี่</p>
          </div>
        )}
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
