export type InterestRateType = 'fixed' | 'floating' | 'stepped';

export interface RatePeriod {
  yearFrom: number;
  yearTo: number | null; // null = ตลอดอายุสัญญา
  rateType: 'fixed' | 'floating';
  fixedRate?: number;    // % ต่อปี เช่น 3.5
  baseRateType?: 'MRR' | 'MLR' | 'MOR';
  spread?: number;       // เช่น -0.5 หมายถึง MRR - 0.5%
}

export interface BankProgram {
  id: string;
  bankId: string;
  name: string;
  interestType: InterestRateType;
  periods: RatePeriod[];
  description?: string;
  isCustom?: boolean;
}

export interface BankInfo {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  color: string;
  defaultMRR: number;
  defaultMLR: number;
  defaultMOR: number;
  programs: BankProgram[];
}

export interface MRTACompany {
  id: string;
  name: string;
  partnerBanks: string[];
  isCustom?: boolean;
  rates: {
    [age: number]: {
      [termYears: number]: number; // อัตราเบี้ยต่อ 1,000 บาทวงเงินกู้
    };
  };
}

export interface FeeConfig {
  mortgageFeeRate: number; // ปกติ 1% (หรือ 0.01% ตามมาตรการรัฐ)
  stampDutyRate: number;   // 0.05%
  transferFeeRate: number; // 2% (หรือ 0.01% ตามมาตรการรัฐ)
  appraisalFee: number;    // ค่าประเมินราคาหลักทรัพย์ (บาท)
  fireInsurancePerYear: number; // ค่าเบี้ยประกันอัคคีภัยต่อปี (บาท)
}

export interface AmortizationRow {
  month: number;
  year: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  currentRate: number;
}

export interface CalculationResult {
  programId: string;
  bankId: string;
  bankName: string;
  programName: string;
  monthlyPaymentFirst3YearsAvg: number;
  monthlyPaymentMax: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  totalLoanPayment: number;
  mrtaPremium: number;
  totalFees: number;
  grandTotalCost: number; // เงินกู้ + ดอกเบี้ย + MRTA + ค่าธรรมเนียมทั้งหมด
  effectiveInterestRate: number; // ดอกเบี้ยเฉลี่ย 3 ปีแรก
  schedule: AmortizationRow[];
  isBestPick?: boolean;
}

export interface BotRateData {
  bankCode: string;
  bankName: string;
  mrr: number;
  mlr: number;
  mor: number;
  updatedAt: string;
  source: 'live' | 'cache' | 'default';
}

export interface CustomBankOffer {
  id: string;
  bankName: string;
  color: string;
  rateYear1: number;
  rateYear2: number;
  rateYear3: number;
  rateYear4PlusType: 'fixed' | 'floating';
  rateYear4PlusFixed: number;
  rateYear4PlusBase: 'MRR' | 'MLR' | 'MOR';
  rateYear4PlusSpread: number;
  mrtaDiscountRate: number; // เช่น 0.25 (ถ้าทำ MRTA ลดดอกเบี้ย 0.25% 3 ปีแรก)
}

export interface UserLoanProfile {
  id: string;
  name: string;
  updatedAt: string;
  propertyPrice: number;
  loanAmount: number;
  downPaymentAmount: number;
  downPaymentPercent: number;
  loanTermYears: number;
  borrowerAge: number;
  selectedBankIds: string[];
  selectedPrograms: Record<string, string>;
  customOffers: CustomBankOffer[];
  includeMRTA: boolean;
  selectedMRTAId: string;
  isCustomMRTA: boolean;
  customMRTACompany: string;
  customMRTARate: number;
  financeMRTAWithLoan: boolean;
  isGovernmentMeasure: boolean;
}

