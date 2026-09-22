// ============================================================
// Home Inspection Comparator — Type Definitions
// ============================================================

export type InspectionCoverage = 'included' | 'not_included';
export type Severity = 'low' | 'medium' | 'high';

// เก็บ alias เดิมไว้สำหรับ backward compat
export type InspectionStatus = InspectionCoverage;

export interface InspectionItem {
  /** รหัสรายการมาตรฐานที่จับคู่ได้ (ถ้ามี เช่น "arch-floor", "elec-rcbo") */
  standardItemId?: string;
  /** หมวดหมู่หลัก (เช่น "สถาปัตยกรรมและโครงสร้าง", "ระบบวิศวกรรมไฟฟ้า") */
  category: string;
  /** หัวข้อย่อย (เช่น "งานพื้นและกระเบื้อง", "ระบบตัดวงจรไฟฟ้ารั่ว") */
  topic: string;
  /** บริษัทนี้รวมหัวข้อนี้ในการตรวจหรือไม่ */
  status: InspectionCoverage;
  /** รายละเอียดเพิ่มเติม เช่น วิธีการตรวจ เครื่องมือที่ใช้ */
  detail: string;
  /** ความสำคัญของหัวข้อนี้ */
  severity: Severity;
}

/**
 * เงื่อนไขการให้บริการของบริษัทตรวจบ้าน
 */
export interface ServiceTerms {
  /** จำนวนครั้ง/รอบที่เข้าตรวจ (เช่น "2 ครั้ง (ก่อนโอน + หลังแก้งาน)") */
  rounds?: string;
  /** จำนวนทีมงาน/ผู้ตรวจ (เช่น "2 คน") */
  teamSize?: string;
  /** ระยะเวลาส่งมอบเล่มรายงาน (เช่น "ภายใน 2-3 วันทำการ") */
  reportDelivery?: string;
  /** รูปแบบรายงาน (เช่น "เล่มรูปเล่มจริง + ไฟล์ PDF") */
  reportFormat?: string;
  /** เครื่องมือ/เทคโนโลยีพิเศษที่ใช้ (เช่น ["กล้องอินฟราเรดความร้อน (Thermal)", "โดรนบินสำรวจหลังคา", "เลเซอร์วัดระดับ"]) */
  specialTools?: string[];
  /** เงื่อนไขหรือจุดเด่นอื่นๆ */
  specialNotes?: string;
}

export interface UploadedFileItem {
  name: string;
  type: string;
  base64: string;
  size: number;          // ขนาดหลัง compress (bytes)
  originalSize: number;  // ขนาดก่อน compress
}

export interface CompanyReport {
  /** Unique ID ของรายงานนี้ */
  id: string;
  /** ชื่อบริษัทตรวจบ้าน (AI สกัดอัตโนมัติ หรือผู้ใช้กรอก) */
  company: string;
  /** วันที่ upload */
  uploadedAt: string;
  /** รายการตรวจมาตรฐานที่บริษัทนี้ครอบคลุม */
  items: InspectionItem[];
  /** รายการตรวจพิเศษ / บริการเสริม นอกเหนือจากมาตรฐานตัวบ้าน */
  specialItems?: InspectionItem[];
  /** เงื่อนไขการให้บริการ (รอบตรวจ, ทีมงาน, ส่งรายงาน ฯลฯ) */
  serviceTerms?: ServiceTerms;
  /** ชื่อไฟล์ต้นฉบับที่ upload */
  sourceFiles: string[];
  /** รายการไฟล์ที่แนบไว้สำหรับการวิเคราะห์ */
  files?: UploadedFileItem[];
  /** สถานะการประมวลผล AI */
  processingStatus: 'idle' | 'queued' | 'processing' | 'done' | 'error';
  /** โมเดล Gemini ที่กำลังวิเคราะห์ หรือวิเคราะห์สำเร็จ */
  currentModel?: string;
  /** จำนวนครั้งที่พยายามลองใหม่ */
  retryCount?: number;
  /** ข้อความ error (ถ้ามี) */
  errorMessage?: string;

  // ========== ข้อมูลราคา ==========
  /** ราคาที่บริษัทเสนอ (บาท) — null ถ้ายังไม่ระบุ */
  price?: number | null;
  /** แหล่งที่มาของราคา */
  priceSource?: 'ai' | 'manual';
  /** หมายเหตุราคา เช่น "รวม VAT", "ต่อจุด", "ไม่รวมค่าเดินทาง" */
  priceNote?: string;
}

export type TimePeriodFilter = 'all' | 'today' | 'week' | 'month' | 'older';

export interface StorageCapacityInfo {
  totalCount: number;
  maxLimit: number;
  usagePercent: number;
  approximateSizeKb: number;
  cloudCount: number;
  localCount: number;
}

export interface ComparisonSession {
  /** Unique ID ของ session นี้ */
  id: string;
  /** ชื่อ session (Default: "บ้านในฝัน 8") */
  name: string;
  /** วันที่สร้าง session */
  createdAt: string;
  /** วันที่แก้ไขล่าสุด */
  updatedAt: string;
  /** รายงานจากแต่ละบริษัท */
  reports: CompanyReport[];
  /** หัวข้อทั้งหมดที่ AI สกัดได้ (union จากทุกบริษัท) */
  allTopics: string[];
  /** หมวดหมู่ทั้งหมด (สำหรับ filter) */
  allCategories: string[];
  /** แหล่งที่มาของข้อมูลการบันทึก */
  storageSource?: 'cloud' | 'local';
  /** ช่วงเวลาที่บันทึก (คำนวณหรือระบุไว้) */
  periodCategory?: 'today' | 'week' | 'month' | 'older';
}

// DTO ที่รับจาก API /api/analyze-inspection
export interface AnalyzeInspectionResponse {
  success: boolean;
  company: string;
  companyNameFromDoc?: string;
  items: InspectionItem[];
  specialItems?: InspectionItem[];
  serviceTerms?: ServiceTerms;
  price?: number | null;
  priceNote?: string;
  model?: string;
  error?: string;
}

// Request ที่ส่งไป API
export interface AnalyzeInspectionRequest {
  company: string;
  files: {
    name: string;
    type: string;
    base64: string;
  }[];
}
