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
const MAX_SESSIONS = 50; // ขีดจำกัดสูงสุดที่ระบบจัดเก็บ

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!redis) {
    // Redis ไม่ได้ตั้งค่า — ส่ง empty sessions กลับไปพร้อม warning
    // GET → sessions ว่าง, POST/DELETE → no-op
    if (req.method === 'GET') {
      return res.status(200).json({
        success: true,
        sessions: [],
        storageInfo: {
          totalCount: 0,
          maxLimit: MAX_SESSIONS,
          usagePercent: 0,
        },
        warning: 'Redis ไม่ได้ตั้งค่า — ประวัติจะไม่ถูกบันทึก กรุณาเพิ่ม UPSTASH_REDIS_REST_URL และ UPSTASH_REDIS_REST_TOKEN ใน Vercel',
      });
    }
    return res.status(200).json({
      success: false,
      error: 'Redis ไม่ได้ตั้งค่า — ไม่สามารถบันทึกประวัติได้ กรุณาเพิ่ม UPSTASH_REDIS_REST_URL และ UPSTASH_REDIS_REST_TOKEN ใน Vercel Environment Variables',
    });
  }

  // =============== GET: รายการ sessions ===============
  if (req.method === 'GET') {
    try {
      // ดึง session IDs จาก sorted set (score = timestamp)
      const ids = await redis.zrange(SESSIONS_KEY, 0, -1, { rev: true });
      if (!ids || ids.length === 0) {
        return res.status(200).json({
          success: true,
          sessions: [],
          storageInfo: {
            totalCount: 0,
            maxLimit: MAX_SESSIONS,
            usagePercent: 0,
          },
        });
      }

      // ดึงข้อมูลแต่ละ session
      const sessions = await Promise.all(
        ids.map(async (id) => {
          const data = await redis!.get(`inspection:session:${id}`);
          if (!data) return null;
          return typeof data === 'string' ? JSON.parse(data) : data;
        })
      );

      const validSessions = sessions.filter(Boolean);

      return res.status(200).json({
        success: true,
        sessions: validSessions,
        storageInfo: {
          totalCount: validSessions.length,
          maxLimit: MAX_SESSIONS,
          usagePercent: Math.min(100, Math.round((validSessions.length / MAX_SESSIONS) * 100)),
        },
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
      // Payload Sanitization: ตัด files (Base64) ขนาดใหญ่ออก คงไว้เฉพาะ sourceFiles
      if (Array.isArray(session.reports)) {
        session.reports = session.reports.map((r: any) => {
          const { files, ...cleanReport } = r;
          return cleanReport;
        });
      }

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

      // ควบคุมไม่ให้เกินโควตาสูงสุด MAX_SESSIONS (FIFO Eviction)
      const totalCount = await redis.zcard(SESSIONS_KEY);
      if (totalCount > MAX_SESSIONS) {
        const excessCount = totalCount - MAX_SESSIONS;
        const oldestIds = await redis.zrange(SESSIONS_KEY, 0, excessCount - 1);
        if (oldestIds && oldestIds.length > 0) {
          for (const oldId of oldestIds) {
            await redis.del(`inspection:session:${oldId}`);
          }
          await redis.zremrangebyrank(SESSIONS_KEY, 0, excessCount - 1);
        }
      }

      return res.status(200).json({
        success: true,
        storageInfo: {
          totalCount: Math.min(totalCount, MAX_SESSIONS),
          maxLimit: MAX_SESSIONS,
          usagePercent: Math.min(100, Math.round((Math.min(totalCount, MAX_SESSIONS) / MAX_SESSIONS) * 100)),
        },
      });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // =============== DELETE: ลบ session ===============
  if (req.method === 'DELETE') {
    const { id, clear } = req.query as { id?: string; clear?: string };

    try {
      // ล้างข้อมูลที่เก่ากว่า 30 วัน (Bulk Cleanup)
      if (clear === 'older_than_30_days') {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        const oldIds = await redis.zrangebyscore(SESSIONS_KEY, 0, thirtyDaysAgo);
        if (oldIds && oldIds.length > 0) {
          for (const oldId of oldIds) {
            await redis.del(`inspection:session:${oldId}`);
          }
          await redis.zremrangebyscore(SESSIONS_KEY, 0, thirtyDaysAgo);
        }
        return res.status(200).json({ success: true, removedCount: oldIds?.length || 0 });
      }

      if (!id) return res.status(400).json({ success: false, error: 'ต้องการ id' });

      await redis.del(`inspection:session:${id}`);
      await redis.zrem(SESSIONS_KEY, id);
      return res.status(200).json({ success: true });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
