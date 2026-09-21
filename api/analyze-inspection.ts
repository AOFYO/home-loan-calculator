import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

// ============================================================
// POST /api/analyze-inspection
// รับใบเสนอราคา/รายการตรวจบ้านจากบริษัท ส่งให้ Gemini วิเคราะห์
// ============================================================

const SYSTEM_PROMPT = `คุณคือผู้เชี่ยวชาญด้านการตรวจสอบบ้านและอสังหาริมทรัพย์
งานของคุณคือการอ่าน "ใบเสนอราคา" หรือ "รายการที่บริษัทจะตรวจ" จากเอกสาร แล้วสกัดข้อมูลออกมาในรูปแบบ JSON ที่มีโครงสร้างชัดเจน

**สำคัญ**: เอกสารเหล่านี้คือ "ข้อเสนอ" ของบริษัทตรวจบ้าน (ยังไม่ได้ตรวจจริง)
เป้าหมายคือช่วยให้ผู้ใช้เปรียบเทียบว่าบริษัทไหนตรวจครอบคลุมมากกว่ากัน

กฎการทำงาน:
1. สกัดชื่อบริษัทจากเอกสาร (ถ้าพบ) ใส่ใน "companyName"
2. สกัดราคาที่เสนอ (ถ้าพบ) ใส่ใน "price" เป็นตัวเลขเท่านั้น ไม่มีหน่วย
   - หมายเหตุราคา เช่น "รวม VAT", "ไม่รวมค่าเดินทาง" ใส่ใน "priceNote"
   - ถ้าไม่พบราคา ให้ใส่ null
3. สกัดทุกหัวข้อที่บริษัทเสนอว่าจะตรวจ จัดเป็นหมวดหมู่ภาษาไทย
   (เช่น โครงสร้าง, ระบบไฟฟ้า, ระบบประปา, หลังคา, ประตูหน้าต่าง, ฝ้าเพดาน ฯลฯ)
4. status ของแต่ละรายการ:
   - "included" = อยู่ในรายการตรวจของบริษัทนี้
   - "not_included" = ไม่อยู่ในรายการ (ใช้เฉพาะเมื่อเอกสารระบุชัดว่าไม่รวม)
5. severity = ความสำคัญของหัวข้อนั้นในเชิงคุณภาพบ้าน:
   - "high" = สำคัญมาก เช่น โครงสร้าง ไฟฟ้า ประปา
   - "medium" = สำคัญปานกลาง เช่น งานสี ประตู หน้าต่าง
   - "low" = รายละเอียด เช่น อุปกรณ์ตกแต่ง
6. detail = สิ่งที่บริษัทระบุว่าจะตรวจในหัวข้อนั้น (กระชับ ≤100 ตัวอักษร)
7. Normalize ภาษาให้เป็นภาษาไทยทั้งหมด
8. ถ้ามีหลายไฟล์ ให้รวมข้อมูลจากทุกไฟล์

ตอบในรูปแบบ JSON เท่านั้น ห้ามมีข้อความอื่น:
{
  "companyName": "ชื่อบริษัท หรือ null ถ้าไม่พบ",
  "price": 12500,
  "priceNote": "รวม VAT แล้ว / null ถ้าไม่พบ",
  "items": [
    {
      "category": "ชื่อหมวดหมู่",
      "topic": "ชื่อหัวข้อย่อย",
      "status": "included",
      "detail": "รายละเอียดที่บริษัทระบุ",
      "severity": "high|medium|low"
    }
  ]
}`;

// รายชื่อ model ที่ลองตามลำดับ — ถ้าตัวแรก 404 จะลองตัวถัดไปอัตโนมัติ
const MODEL_FALLBACK_LIST = [
  'gemini-3.6-flash',
  'gemini-2.5-flash-preview-05-20',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'GEMINI_API_KEY not configured' });
  }

  const { company, files } = req.body as {
    company: string;
    files: { name: string; type: string; base64: string }[];
  };

  if (!company || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ success: false, error: 'กรุณาระบุชื่อบริษัทและไฟล์อย่างน้อย 1 ไฟล์' });
  }

  // ตรวจขนาดรวม
  const totalBase64Bytes = files.reduce((sum, f) => sum + f.base64.length, 0);
  const totalDecodedMB = (totalBase64Bytes * 0.75 / 1048576).toFixed(1);
  console.log(`[analyze-inspection] company="${company}" files=${files.length} decoded≈${totalDecodedMB}MB`);

  if (totalBase64Bytes > 4 * 1024 * 1024) {
    return res.status(400).json({
      success: false,
      error: `ไฟล์รวมใหญ่เกินไป (${totalDecodedMB} MB) — กรุณาลดจำนวนไฟล์หรือใช้ไฟล์ขนาดเล็กลง`,
    });
  }

  const ai = new GoogleGenAI({ apiKey });

  const parts: any[] = [
    {
      text: `วิเคราะห์ใบเสนอราคา/รายการตรวจบ้านของ "${company}" จากเอกสารต่อไปนี้ (${files.length} ไฟล์):\n${SYSTEM_PROMPT}`,
    },
  ];

  for (const file of files) {
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      parts.push({ text: `[ไฟล์ ${file.name}: Word document — วิเคราะห์จากไฟล์อื่นที่แนบมา]` });
      continue;
    }
    parts.push({ inlineData: { mimeType: file.type, data: file.base64 } });
    parts.push({ text: `(ไฟล์: ${file.name})` });
  }

  let lastError: any = null;

  for (const modelName of MODEL_FALLBACK_LIST) {
    try {
      console.log(`[analyze-inspection] trying model: ${modelName}`);

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts }],
        config: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      });

      const rawText = response.text ?? '';

      let parsed: { companyName?: string | null; price?: number | null; priceNote?: string | null; items: any[] };
      try {
        const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        console.error(`[analyze-inspection] JSON parse error from ${modelName}:`, rawText.substring(0, 300));
        lastError = new Error('AI ตอบในรูปแบบที่ไม่ถูกต้อง');
        continue;
      }

      // Validate items
      const validStatuses = ['included', 'not_included', 'ok', 'warning', 'critical', 'not_checked'];
      const validSeverities = ['low', 'medium', 'high'];
      const items = (parsed.items || []).filter(
        (item: any) =>
          item.category && item.topic && item.detail &&
          validStatuses.includes(item.status) &&
          validSeverities.includes(item.severity)
      );

      // Normalize legacy statuses → new ones
      const normalizedItems = items.map((item: any) => ({
        ...item,
        status: item.status === 'ok' || item.status === 'warning' || item.status === 'critical'
          ? 'included'
          : item.status,
      }));

      console.log(`[analyze-inspection] success with ${modelName}, items=${normalizedItems.length}, price=${parsed.price}`);

      return res.status(200).json({
        success: true,
        company,
        companyNameFromDoc: parsed.companyName || null,
        items: normalizedItems,
        price: typeof parsed.price === 'number' ? parsed.price : null,
        priceNote: parsed.priceNote || null,
        model: modelName,
      });

    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      if (msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('no longer available') || msg.includes('not found')) {
        console.warn(`[analyze-inspection] model ${modelName} unavailable, trying next...`);
        lastError = err;
        continue;
      }
      console.error(`[analyze-inspection] fatal error with ${modelName}:`, msg);
      return res.status(500).json({ success: false, error: msg });
    }
  }

  console.error('[analyze-inspection] all models exhausted');
  return res.status(500).json({
    success: false,
    error: `ไม่สามารถเชื่อมต่อ Gemini AI ได้ในขณะนี้ กรุณาลองใหม่ภายหลัง (${lastError?.message ?? 'unknown'})`,
  });
}
