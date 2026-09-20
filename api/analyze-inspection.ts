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

  try {
    const ai = new GoogleGenAI({ apiKey });

    // สร้าง parts สำหรับ Gemini (multimodal)
    const parts: any[] = [
      {
        text: `วิเคราะห์รายงานตรวจบ้านของ "${company}" จากเอกสารต่อไปนี้ (${files.length} ไฟล์):\n${SYSTEM_PROMPT}`,
      },
    ];

    // เพิ่มทุกไฟล์เป็น inline data
    for (const file of files) {
      // แปลง MIME type ให้ Gemini รองรับ
      let mimeType = file.type;
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Gemini ไม่รองรับ .docx โดยตรง — แจ้งชื่อไฟล์ให้รู้
        parts.push({ text: `[ไฟล์ ${file.name}: เนื้อหาจาก Word document — กรุณาวิเคราะห์จากไฟล์อื่นที่แนบมา]` });
        continue;
      }

      parts.push({
        inlineData: {
          mimeType,
          data: file.base64,
        },
      });
      parts.push({ text: `(ไฟล์ชื่อ: ${file.name})` });
    }

    // เรียก Gemini 2.0 Flash
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts }],
      config: {
        temperature: 0.1,      // ต้องการความแม่นยำ ไม่ใช่ creativity
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text ?? '';

    // Parse JSON จาก response
    let parsed: { items: any[] };
    try {
      // ลบ markdown code block ถ้ามี
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('JSON parse error:', rawText.substring(0, 500));
      return res.status(500).json({
        success: false,
        error: 'AI ตอบในรูปแบบที่ไม่ถูกต้อง กรุณาลองใหม่',
      });
    }

    // Validate items
    const validStatuses = ['ok', 'warning', 'critical', 'not_checked'];
    const validSeverities = ['low', 'medium', 'high'];
    const items = (parsed.items || []).filter(
      (item: any) =>
        item.category && item.topic && item.detail &&
        validStatuses.includes(item.status) &&
        validSeverities.includes(item.severity)
    );

    return res.status(200).json({
      success: true,
      company,
      items,
    });

  } catch (error: any) {
    console.error('Gemini API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการเรียก AI',
    });
  }
}
