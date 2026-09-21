import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

// ============================================================
// POST /api/analyze-inspection
// รับใบเสนอราคา/รายการตรวจบ้านจากบริษัท ส่งให้ Gemini วิเคราะห์
// อ้างอิงตามเกณฑ์มาตรฐานแบบบ้านแก้วมุกดา (จอดรถขวา)
// ============================================================

const STANDARD_ITEMS_CONTEXT = `
[รายการตรวจมาตรฐานอ้างอิง: แบบบ้านพักอาศัย คสล. 2 ชั้น "บ้านแก้วมุกดา (จอดรถขวา)"]
หมวดสถาปัตยกรรมและโครงสร้าง:
- id: "arch-floor", topic: "งานพื้นและกระเบื้อง (ชั้น 1 & 2)", desc: "ระนาบ ความเรียบ รอยต่อ เสียงโพรงใต้กระเบื้อง"
- id: "arch-wall", topic: "งานผนัง ฉาก แนวดิ่ง และรอยร้าว", desc: "ความตั้งฉาก รอยแตกลายงา รอยต่อพรีคาสท์ งานสี"
- id: "arch-ceiling", topic: "งานฝ้าเพดานและช่องเปิดเซอร์วิส", desc: "รอยต่อแผ่นยิปซัม คราบน้ำรั่วซึม ช่องเปิดตรวจใต้หลังคา"
- id: "arch-door-window", topic: "ประตู-หน้าต่างและงานยาแนวกันซึม", desc: "บานเลื่อน/เปิดปิด ซีลยาง ยาแนวซิลิโคนกันน้ำซึม"
- id: "arch-stair", topic: "บันไดและราวจับ", desc: "ระยะลูกตั้งลูกนอน ความมั่นคงแข็งแรงของราวจับ"
- id: "arch-roof", topic: "หลังคาและฉนวนกันความร้อน", desc: "กระเบื้องหลังคา ครอบสันหลังคา ฉนวนกันความร้อน การรั่วซึม"

หมวดโรงจอดรถและภายนอก:
- id: "ext-garage-right", topic: "ลานจอดรถด้านขวาและรอยต่อโครงสร้าง", desc: "Slope ระบายน้ำ รอยต่อ Expansion Joint ป้องกันดึงรั้งตัวบ้าน"
- id: "ext-washing-balcony", topic: "ลานซักล้างและระเบียงชั้น 2", desc: "ระดับพื้นลด การระบายน้ำลง Floor drain และระบบกันซึม"
- id: "ext-gate-fence", topic: "รั้ว ประตูรั้ว และทางเข้าบ้าน", desc: "ความแข็งแรง รางเลื่อน จุดติดตั้งมิเตอร์ไฟ/น้ำ"

หมวดระบบวิศวกรรมไฟฟ้า:
- id: "elec-consumer-unit", topic: "ตู้ควบคุมไฟฟ้าหลัก (Consumer Unit / MDB)", desc: "ขนาดเมนเบรกเกอร์ ลูกย่อยตรงตามโหลด ป้ายชื่อวงจร"
- id: "elec-rcbo", topic: "ระบบตัดวงจรไฟฟ้ารั่ว (RCD / RCBO)", desc: "ทดสอบตัดไฟรั่ว/ไฟดูดในห้องน้ำและปั๊มน้ำ"
- id: "elec-outlet-ground", topic: "ระบบเต้ารับและการต่อสายดิน (L-N-G)", desc: "ขั้วสาย L-N-G ทุกเต้ารับ และค่าความต้านทานหลักดิน"
- id: "elec-lighting", topic: "ระบบแสงสว่างและสวิตช์ควบคุม", desc: "โคมไฟทุกจุด สวิตช์ 1 ทาง และ 2 ทางบันได"
- id: "elec-heavy-load", topic: "จุดเตรียมสำหรับแอร์และเครื่องทำน้ำอุ่น", desc: "สายไฟเมน ท่อร้อยสาย แอร์ทุกห้อง และเครื่องทำน้ำอุ่น"
- id: "elec-comms", topic: "ระบบกริ่งและจุดเต้ารับสัญญาณสื่อสาร", desc: "กริ่งหน้าบ้าน เต้ารับสายทีวี/LAN อินเทอร์เน็ต"

หมวดระบบสุขาภิบาลและประปา:
- id: "san-pressure-test", topic: "ระบบจ่ายน้ำดีและการทดสอบแรงดัน (Pressure Test)", desc: "ทดสอบแรงดันน้ำในเส้นท่อเพื่อตรวจหารอยรั่วใต้พื้นและผนัง"
- id: "san-pump-tank", topic: "ปั๊มน้ำ ถังเก็บน้ำ และระบบบายพาส", desc: "การทำงานปั๊มน้ำอัตโนมัติ ลูกลอยตัดน้ำ วาล์วบายพาส"
- id: "san-fixtures", topic: "สุขภัณฑ์และอุปกรณ์ในห้องน้ำทุกห้อง", desc: "โถสุขภัณฑ์ (การฟลัช ซีลกันกลิ่น) อ่างล้างหน้า สายฉีดชำระ ก็อก ฝักบัว"
- id: "san-flood-test", topic: "การขังน้ำทดสอบการรั่วซึม (Flood Test)", desc: "ขังน้ำในห้องน้ำและระเบียงทดสอบการรั่วซึมลงฝ้าชั้นล่าง"
- id: "san-drain-trap", topic: "ระบบระบายน้ำทิ้งและท่อดักกลิ่น (P-Trap)", desc: "Slope ท่อระบาย Floor drain ดักกลิ่น ป้องกันกลิ่นย้อน"
- id: "san-septic-tank", topic: "ถังบำบัดน้ำเสียและท่อระบายอากาศ", desc: "ระดับถังบำบัด ท่อระบายอากาศ ฝาเปิดตรวจบำรุงรักษา"
- id: "san-grease-trap", topic: "ถังดักไขมันใต้ซิงค์ครัว", desc: "ท่อน้ำทิ้งซิงค์เข้าถังดักไขมัน และท่อระบายออก"
- id: "san-manhole", topic: "บ่อพักและท่อระบายน้ำรอบบ้าน", desc: "ความสะอาดในบ่อพัก ระดับความลาดเอียงระบายสู่ท่อสาธารณะ"
`;

const SYSTEM_PROMPT = `คุณคือผู้เชี่ยวชาญด้านการตรวจสอบบ้านและวิศวกรรมอาคาร
หน้าที่ของคุณคืออ่าน "เอกสารข้อเสนอ/ใบเสนอราคาตรวจบ้าน" แล้วสกัดข้อมูลเพื่อเปรียบเทียบกับ "เกณฑ์มาตรฐานแบบบ้านแก้วมุกดา (จอดรถขวา)"

${STANDARD_ITEMS_CONTEXT}

คำแนะนำการสกัดข้อมูล:
1. **ชื่อบริษัท (companyName)**: สกัดชื่อบริษัทที่ถูกต้อง (ถ้าไม่พบให้ใส่ null)
2. **ราคา (price)**: สกัดราคาเสนอขายเป็นตัวเลขจำนวนเต็ม (บาท) เท่านั้น ถ้าไม่พบให้ใส่ null
3. **หมายเหตุราคา (priceNote)**: เช่น "รวม VAT แล้ว", "ยังไม่รวมค่าเดินทาง", "ราคาตรวจ 2 ครั้ง" (ถ้าไม่มีให้ใส่ null)
4. **เงื่อนไขบริการ (serviceTerms)**:
   - rounds: จำนวนครั้งที่เข้าตรวจ เช่น "2 ครั้ง (ก่อนโอน + หลังแก้ไขงาน)" หรือ "1 ครั้ง"
   - teamSize: จำนวนคนในทีมตรวจ เช่น "2 คน (วิศวกร 1 + ช่างเทคนิค 1)"
   - reportDelivery: ระยะเวลาออกเล่มรายงาน เช่น "ภายใน 24 ชม.", "ภายใน 3 วันทำการ"
   - reportFormat: รูปแบบรายงาน เช่น "ไฟล์ PDF ทางไลน์/อีเมล", "รูปเล่มปกแข็งเข้าเล่ม + PDF"
   - specialTools: เครื่องมือ/เทคโนโลยีพิเศษที่ระบุ เช่น ["กล้องอินฟราเรดความร้อน (Thermal Camera)", "โดรนบินสำรวจหลังคา", "เครื่องเลเซอร์วัดระดับ"]
   - specialNotes: ข้อความหรือการรับประกันเพิ่มเติม
5. **รายการตรวจมาตรฐาน (items)**:
   - จับคู่สิ่งที่บริษัทระบุในเอกสารเข้ากับรายการมาตรฐานข้างต้น
   - ต้องระบุ standardItemId ให้ตรงกับ id ในรายการมาตรฐาน
   - status ให้เป็น "included"
   - detail สรุปวิธีการตรวจ หรืออุปกรณ์ที่บริษัทระบุ (กระชับ ≤100 ตัวอักษร)
6. **รายการตรวจพิเศษ (specialItems)**:
   - รายการตรวจใดที่บริษัทเสนอ แต่ **ไม่อยู่ในรายการมาตรฐาน 23 ข้อข้างต้น** (เช่น ตรวจวัดคลื่นแม่เหล็กไฟฟ้า, ตรวจฟอร์มาลดีไฮด์ในอากาศ, ตรวจสิ่งแวดล้อมรอบบ้าน, สแกนความร้อนใต้ดิน) ให้ใส่ใน array นี้

ตอบเป็น JSON เท่านั้น โครงสร้างดังนี้:
{
  "companyName": "ชื่อบริษัท",
  "price": 8500,
  "priceNote": "รวม VAT ตรวจ 2 ครั้ง",
  "serviceTerms": {
    "rounds": "2 ครั้ง (ตรวจจริง + ตรวจซ่อม)",
    "teamSize": "2-3 คน",
    "reportDelivery": "ภายใน 3 วันทำการ",
    "reportFormat": "เล่มรูปเล่มจริง + ไฟล์ PDF",
    "specialTools": ["กล้อง Thermal Scan", "โดรนบินตรวจหลังคา", "เครื่องวัดเลเซอร์"],
    "specialNotes": "มีวิศวกร กว. เซ็นรับรอง"
  },
  "items": [
    {
      "standardItemId": "arch-floor",
      "category": "สถาปัตยกรรมและโครงสร้าง",
      "topic": "งานพื้นและกระเบื้อง (ชั้น 1 & 2)",
      "status": "included",
      "detail": "เคาะกระเบื้องทุกแผ่น ตรวจโพรงใต้กระเบื้องด้วยไม้เคาะ",
      "severity": "high"
    }
  ],
  "specialItems": [
    {
      "category": "รายการตรวจพิเศษ",
      "topic": "กล้องสแกนความร้อน Thermal Scan",
      "status": "included",
      "detail": "สแกนหาจุดรั่วซึมและความร้อนสะสมในผนัง/ฝ้า",
      "severity": "medium"
    }
  ]
}`;

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
      text: `วิเคราะห์เอกสารข้อเสนอตรวจบ้านของ "${company}" จากไฟล์ที่แนบมาต่อไปนี้ (${files.length} ไฟล์):\n${SYSTEM_PROMPT}`,
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

      let parsed: {
        companyName?: string | null;
        price?: number | null;
        priceNote?: string | null;
        serviceTerms?: any;
        items?: any[];
        specialItems?: any[];
      };

      try {
        const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        console.error(`[analyze-inspection] JSON parse error from ${modelName}:`, rawText.substring(0, 300));
        lastError = new Error('AI ตอบในรูปแบบที่ไม่ถูกต้อง');
        continue;
      }

      // Validate items
      const validSeverities = ['low', 'medium', 'high'];
      const items = (parsed.items || []).filter(
        (item: any) =>
          item.category && item.topic && item.detail &&
          validSeverities.includes(item.severity)
      ).map((item: any) => ({
        ...item,
        status: 'included' as const,
      }));

      // Validate specialItems
      const specialItems = (parsed.specialItems || []).filter(
        (item: any) => item.topic && item.detail
      ).map((item: any) => ({
        category: item.category || 'รายการตรวจพิเศษ',
        topic: item.topic,
        status: 'included' as const,
        detail: item.detail,
        severity: item.severity && validSeverities.includes(item.severity) ? item.severity : 'medium',
      }));

      console.log(`[analyze-inspection] success with ${modelName}, items=${items.length}, specialItems=${specialItems.length}, price=${parsed.price}`);

      return res.status(200).json({
        success: true,
        company,
        companyNameFromDoc: parsed.companyName || null,
        items,
        specialItems,
        serviceTerms: parsed.serviceTerms || undefined,
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
