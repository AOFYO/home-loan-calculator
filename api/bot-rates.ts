import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

// ถ้ามี Upstash Redis ให้เปิดใช้ ถ้าไม่มีจะ fallback ได้
let redis: Redis | null = null;
try {
  if (process.env.STORAGE_REST_API_URL && process.env.STORAGE_REST_API_TOKEN) {
    redis = new Redis({
      url: process.env.STORAGE_REST_API_URL,
      token: process.env.STORAGE_REST_API_TOKEN,
    });
  } else if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (e) {
  console.warn('Redis initialization skipped:', e);
}

const CACHE_KEY = 'bot_interest_rates';
const CACHE_TTL_SECONDS = 60 * 60 * 6; // Cache ไว้ 6 ชั่วโมง

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. ลองอ่านจาก Upstash Redis Cache ก่อน
  if (redis) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        return res.status(200).json({
          source: 'cache',
          data: typeof cached === 'string' ? JSON.parse(cached) : cached,
        });
      }
    } catch (err) {
      console.warn('Redis read failed:', err);
    }
  }

  // 2. ถ้าไม่มี cache ให้เรียก BOT API
  const botApiKey = process.env.BOT_API_KEY;
  if (!botApiKey) {
    return res.status(200).json({
      source: 'default',
      message: 'BOT_API_KEY not configured, using fallback default bank rates',
      data: null
    });
  }

  try {
    const botUrl = 'https://gateway.api.bot.or.th/LoanRate/v2';
    const response = await fetch(botUrl, {
      method: 'GET',
      headers: {
        'Authorization': botApiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`BOT API responded with status ${response.status}`);
    }

    const result = await response.json();

    // บันทึกลง Redis Cache
    if (redis && result) {
      try {
        await redis.set(CACHE_KEY, JSON.stringify(result), { ex: CACHE_TTL_SECONDS });
      } catch (e) {
        console.warn('Redis write failed:', e);
      }
    }

    return res.status(200).json({
      source: 'live',
      data: result,
      fetchedAt: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(200).json({
      source: 'error_fallback',
      message: error.message || 'Failed to fetch from BOT API',
      data: null
    });
  }
}
