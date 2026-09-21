// ============================================================
// Home Inspection Comparator — Type Definitions
// ============================================================

/**
 * ระดับความครอบคลุมของรายการตรวจในใบเสนอราคา
 * (ปรับ use case ให้ถูกต้อง: เอกสารเป็น "ใบเสนอราคา/รายการตรวจ" ไม่ใช่ผลตรวจจริง)
 */
export type InspectionCoverage = 'included' | 'not_included';
export type Severity = 'low' | 'medium' | 'high';

// เก็บ alias เดิมไว้สำหรับ backward compat
export type InspectionStatus = InspectionCoverage;

export interface InspectionItem {
  /** หมวดหมู่หลัก (AI สร้างจากเอกสาร เช่น "โครงสร้าง", "ระบบไฟฟ้า") */
  category: string;
  /** หัวข้อย่อย (เช่น "เสาและคาน", "วงจรไฟฟ้า") */
  topic: string;
  /** บริษัทนี้รวมหัวข้อนี้ในการตรวจหรือไม่ */
  status: InspectionCoverage;
  /** รายละเอียดเพิ่มเติม เช่น วิธีการตรวจ เครื่องมือที่ใช้ */
  detail: string;
  /** ความสำคัญของหัวข้อนี้ (AI ประเมิน) */
  severity: Severity;
}

export interface CompanyReport {
  /** Unique ID ของรายงานนี้ */
  id: string;
  /** ชื่อบริษัทตรวจบ้าน (AI สกัดอัตโนมัติ หรือผู้ใช้กรอก) */
  company: string;
  /** วันที่ upload */
  uploadedAt: string;
  /** รายการหัวข้อตรวจทั้งหมด */
  items: InspectionItem[];
  /** ชื่อไฟล์ต้นฉบับที่ upload */
  sourceFiles: string[];
  /** สถานะการประมวลผล AI */
  processingStatus: 'idle' | 'processing' | 'done' | 'error';
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

export interface ComparisonSession {
  /** Unique ID ของ session นี้ */
  id: string;
  /** ชื่อ session (เช่น "บ้านหมู่ 5 ถ.เพชรบุรี") */
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
}

// DTO ที่รับจาก API /api/analyze-inspection
export interface AnalyzeInspectionResponse {
  success: boolean;
  company: string;
  companyNameFromDoc?: string;  // ชื่อบริษัทที่ AI สกัดได้จากเอกสาร
  items: InspectionItem[];
  price?: number | null;
  priceNote?: string;
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
