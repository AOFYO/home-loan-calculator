import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

// ============================================================
// POST /api/analyze-inspection
// รับไฟล์จากบริษัทตรวจบ้าน ส่งให้ Gemini วิเคราะห์
// ============================================================

const SYSTEM_PROMPT = `คุณคือผู้เชี่ยวชาญด้านการตรวจสอบบ้านและอสังหาริมทรัพย์
งานของคุณคือการอ่านรายงานตรวจบ้านจากเอกสาร (PDF, รูปภาพ, ข้อความ) แล้วสกัดข้อมูลออกมาในรูปแบบ JSON ที่มีโครงสร้างชัดเจน

กฎการทำงาน:
1. สกัดทุกหัวข้อที่พบในเอกสาร จัดเป็นหมวดหมู่ที่มีความหมาย (เช่น โครงสร้าง, ระบบไฟฟ้า, ระบบประปา, หลังคา, ประตูหน้าต่าง ฯลฯ)
2. Normalize ภาษาให้เป็นภาษาไทยทั้งหมด
3. สรุป status ของแต่ละรายการ:
   - "ok" = ปกติ ไม่มีปัญหา
   - "warning" = มีสิ่งที่ควรระวังหรือซ่อมแซมในอนาคต
   - "critical" = มีปัญหาเร่งด่วน ต้องซ่อมทันที
   - "not_checked" = ไม่ได้ระบุหรือไม่ได้ตรวจ
4. ระบุ severity:
   - "high" = ความเสียหายรุนแรง ส่งผลต่อความปลอดภัยหรือโครงสร้าง
   - "medium" = ความเสียหายระดับปานกลาง ควรแก้ไขภายใน 6 เดือน
   - "low" = ความเสียหายเล็กน้อย สามารถเลื่อนได้
5. detail ควรกระชับ ไม่เกิน 100 ตัวอักษร
6. ถ้าเอกสารมีหลายไฟล์ ให้รวมข้อมูลจากทุกไฟล์เข้าด้วยกัน

ตอบในรูปแบบ JSON เท่านั้น ห้ามมีข้อความอื่น:
{
  "items": [
    {
      "category": "ชื่อหมวดหมู่",
      "topic": "ชื่อหัวข้อย่อย",
      "status": "ok|warning|critical|not_checked",
      "detail": "รายละเอียดสั้นๆ",
      "severity": "low|medium|high"
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
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  // ตรวจ API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'GEMINI_API_KEY not configured' });
  }

  // Parse request
  const { company, files } = req.body as {
    company: string;
    files: { name: string; type: string; base64: string }[];
  };

  if (!company || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ success: false, error: 'กรุณาระบุชื่อบริษัทและไฟล์อย่างน้อย 1 ไฟล์' });
  }

  // ตรวจขนาดรวม (base64 byte count)
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

  // สร้าง parts สำหรับ Gemini (multimodal)
  const parts: any[] = [
    {
      text: `วิเคราะห์รายงานตรวจบ้านของ "${company}" จากเอกสารต่อไปนี้ (${files.length} ไฟล์):\n${SYSTEM_PROMPT}`,
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

  // ===============================================================
  // ลอง model ตามลำดับ fallback
  // ===============================================================
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

      // Parse JSON
      let parsed: { items: any[] };
      try {
        const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        console.error(`[analyze-inspection] JSON parse error from ${modelName}:`, rawText.substring(0, 300));
        // ถ้า parse ไม่ได้ ลอง model ถัดไป
        lastError = new Error('AI ตอบในรูปแบบที่ไม่ถูกต้อง');
        continue;
      }

      // Validate
      const validStatuses = ['ok', 'warning', 'critical', 'not_checked'];
      const validSeverities = ['low', 'medium', 'high'];
      const items = (parsed.items || []).filter(
        (item: any) =>
          item.category && item.topic && item.detail &&
          validStatuses.includes(item.status) &&
          validSeverities.includes(item.severity)
      );

      console.log(`[analyze-inspection] success with ${modelName}, items=${items.length}`);

      return res.status(200).json({ success: true, company, items, model: modelName });

    } catch (err: any) {
      const msg: string = err?.message ?? String(err);
      // ถ้าเป็น 404 (model ไม่มี) → ลองตัวถัดไป
      if (msg.includes('404') || msg.includes('NOT_FOUND') || msg.includes('no longer available') || msg.includes('not found')) {
        console.warn(`[analyze-inspection] model ${modelName} unavailable, trying next...`);
        lastError = err;
        continue;
      }
      // Error อื่น (quota, auth, network) → หยุดทันที
      console.error(`[analyze-inspection] fatal error with ${modelName}:`, msg);
      return res.status(500).json({ success: false, error: msg });
    }
  }

  // ลองครบทุก model แล้วยังไม่ได้
  console.error('[analyze-inspection] all models exhausted');
  return res.status(500).json({
    success: false,
    error: `ไม่สามารถเชื่อมต่อ Gemini AI ได้ในขณะนี้ กรุณาลองใหม่ภายหลัง (${lastError?.message ?? 'unknown'})`,
  });
}
