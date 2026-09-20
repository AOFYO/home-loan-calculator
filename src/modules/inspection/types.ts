// ============================================================
// Home Inspection Comparator — Type Definitions
// ============================================================

export type InspectionStatus = 'ok' | 'warning' | 'critical' | 'not_checked';
export type Severity = 'low' | 'medium' | 'high';

export interface InspectionItem {
  /** หมวดหมู่หลัก (AI สร้างจากเอกสาร เช่น "โครงสร้าง", "ระบบไฟฟ้า") */
  category: string;
  /** หัวข้อย่อย (เช่น "เสาและคาน", "วงจรไฟฟ้า") */
  topic: string;
  /** สถานะที่พบ */
  status: InspectionStatus;
  /** รายละเอียดที่ AI สกัดได้ */
  detail: string;
  /** ระดับความรุนแรง */
  severity: Severity;
}

export interface CompanyReport {
  /** Unique ID ของรายงานนี้ */
  id: string;
  /** ชื่อบริษัทตรวจบ้าน */
  company: string;
  /** วันที่ upload */
  uploadedAt: string;
  /** รายการผลตรวจทั้งหมด */
  items: InspectionItem[];
  /** ชื่อไฟล์ต้นฉบับที่ upload */
  sourceFiles: string[];
  /** สถานะการประมวลผล AI */
  processingStatus: 'idle' | 'processing' | 'done' | 'error';
  /** ข้อความ error (ถ้ามี) */
  errorMessage?: string;
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
  items: InspectionItem[];
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
