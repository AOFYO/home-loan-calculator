import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

// ============================================================
// GET  /api/inspection-sessions        — รายการ sessions
// POST /api/inspection-sessions        — บันทึก session ใหม่
// DELETE /api/inspection-sessions?id=X — ลบ session
// ============================================================

let redis: Redis | null = null;
try {
  const url = process.env.STORAGE_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.STORAGE_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redis = new Redis({ url, token });
  }
} catch (e) {
  console.warn('Redis init skipped:', e);
}

const SESSION_TTL = 60 * 60 * 24 * 30; // 30 วัน
const SESSIONS_KEY = 'inspection:sessions';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!redis) {
    return res.status(503).json({ success: false, error: 'Redis ไม่ได้ตั้งค่า' });
  }

  // =============== GET: รายการ sessions ===============
  if (req.method === 'GET') {
    try {
      // ดึง session IDs จาก sorted set (score = timestamp)
      const ids = await redis.zrange(SESSIONS_KEY, 0, -1, { rev: true });
      if (!ids || ids.length === 0) {
        return res.status(200).json({ success: true, sessions: [] });
      }

      // ดึงข้อมูลแต่ละ session
      const sessions = await Promise.all(
        ids.map(async (id) => {
          const data = await redis!.get(`inspection:session:${id}`);
          if (!data) return null;
          return typeof data === 'string' ? JSON.parse(data) : data;
        })
      );

      return res.status(200).json({
        success: true,
        sessions: sessions.filter(Boolean),
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // =============== POST: บันทึก session ===============
  if (req.method === 'POST') {
    const session = req.body;
    if (!session?.id) {
      return res.status(400).json({ success: false, error: 'ต้องการ session.id' });
    }

    try {
      // บันทึกข้อมูล session
      await redis.set(
        `inspection:session:${session.id}`,
        JSON.stringify(session),
        { ex: SESSION_TTL }
      );

      // เพิ่ม ID เข้า sorted set (score = timestamp)
      await redis.zadd(SESSIONS_KEY, {
        score: Date.now(),
        member: session.id,
      });

      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // =============== DELETE: ลบ session ===============
  if (req.method === 'DELETE') {
    const { id } = req.query as { id: string };
    if (!id) return res.status(400).json({ success: false, error: 'ต้องการ id' });

    try {
      await redis.del(`inspection:session:${id}`);
      await redis.zrem(SESSIONS_KEY, id);
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
