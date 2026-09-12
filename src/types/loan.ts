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

export interface SubLoanAccount {
  loanAmount: number;
  termYears: number;
  rateYear1: number;
  rateYear2: number;
  rateYear3: number;
  rateYear4PlusType: 'fixed' | 'floating';
  rateYear4PlusFixed: number;
  rateYear4PlusBase: 'MRR' | 'MLR' | 'MOR';
  rateYear4PlusSpread: number;
  bankInstallmentYear1?: number; // ค่างวดที่ธนาคารแจ้งจริง (บาท/ด)
  bankInstallmentYear2?: number;
  bankInstallmentYear3?: number;
  bankInstallmentYear4Plus?: number;
}

export type PrepaymentMode = 'none' | 'target_monthly' | 'fixed_extra' | 'stepped';
export type PrepaymentAllocation = 'smart_auto' | 'proportional' | 'manual_split';

export interface PrepaymentPlan {
  enabled?: boolean; // เปิดใช้งานหรือปิดไว้ก่อนไม่ให้มีผลในการคำนวณ
  mode: PrepaymentMode;
  // สำหรับ target_monthly: ยอดผ่อนรวมเป้าหมายต่อเดือนในแต่ละปี (เช่น ปี 1 อยากจ่าย 16,000)
  targetMonthlyYear1?: number;
  targetMonthlyYear2?: number;
  targetMonthlyYear3?: number;
  targetMonthlyYear4Plus?: number;
  // สำหรับ fixed_extra: ยอดโปะเพิ่มคงที่ต่อเดือน
  fixedExtraMonthly?: number;
  // สำหรับ stepped: ยอดโปะเพิ่มในแต่ละช่วงปี
  steppedYear1?: number;
  steppedYear2?: number;
  steppedYear3?: number;
  steppedYear4Plus?: number;
  // โปะก้อนใหญ่รายปี (เช่น โบนัสออกทุกสิ้นปี)
  annualBonusExtra?: number;
  // การจัดสรรเงินโปะ
  allocation: PrepaymentAllocation;
  manualHomeSplitPercent?: number; // 0-100 (เปอร์เซ็นต์ที่ตัดเข้าบ้าน ส่วนที่เหลือตัด MRTA)
}

export type FeePayer = 'borrower' | 'bank' | 'seller';

export interface FeeItemConfig {
  payer: FeePayer;
  customAmount?: number; // ยอดค่าธรรมเนียมที่ระบุเจาะจง
}

export interface CustomOfferFees {
  mortgageFee: FeeItemConfig;     // ค่าจดจำนอง (1% หรือ 0.01%)
  transferFee: FeeItemConfig;     // ค่าธรรมเนียมโอน (2% หรือ 0.01%)
  appraisalFee: FeeItemConfig;    // ค่าประเมิน (3,000 บาท)
  stampDuty: FeeItemConfig;       // ค่าอากรแสตมป์ (0.05%)
  fireInsurance: FeeItemConfig;   // ค่าประกันอัคคีภัย
  otherFees?: FeeItemConfig & { name?: string };
}

export interface CustomOfferPerk {
  id: string;
  name: string;
  value: number;
  type: 'cashback' | 'lottery' | 'voucher' | 'other';
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

  // ฟิลด์ส่วนต่อขยายแบบละเอียด (Advanced Offer Mode)
  isAdvanced?: boolean;
  propertyPrice?: number;
  homeLoan?: SubLoanAccount;
  mrtaLoan?: SubLoanAccount & {
    totalPremium: number;
    financeWithLoan: boolean;
  };
  prepayment?: PrepaymentPlan;
  fees?: CustomOfferFees;
  perks?: CustomOfferPerk[];
  lockInYears?: 3 | 5;
  notes?: string;
}

export interface YearlyInterestDetail {
  year: number;
  homeRate: number;
  mrtaRate: number;
  homePayment: number;
  homeInterest: number;
  homePrincipal: number;
  mrtaPayment: number;
  mrtaInterest: number;
  mrtaPrincipal: number;
  extraPrepayment: number;
  totalInterest: number;
  totalPayment: number;
  homeEndingBalance: number;
  mrtaEndingBalance: number;
  totalEndingBalance: number;
  totalRegularPayment: number;
  totalPrepayment: number;
  totalPaid: number;
}

export interface MonthlyAmortizationRow {
  month: number;
  year: number;
  homePayment: number;
  homeInterest: number;
  homePrincipal: number;
  homeBalance: number;
  mrtaPayment: number;
  mrtaInterest: number;
  mrtaPrincipal: number;
  mrtaBalance: number;
  extraPrepayment: number;
  totalPayment: number;
  totalEndingBalance: number;
  regularPayment: number;
  prepayment: number;
  balanceTotal: number;
}

export interface AdvancedOfferCalculationResult {
  offer: CustomBankOffer;
  offerId: string;
  offerName: string;
  color: string;
  yearlyDetails: YearlyInterestDetail[];
  interest3YearsHome: number;
  interest3YearsMRTA: number;
  interest3YearsTotal: number;
  totalInterestLifetime: number;
  totalPrincipalHome: number;
  totalPrincipalMRTA: number;
  mrtaPremiumTotal: number;
  borrowerFeesTotal: number;
  borrowerPaidFees: number;
  bankCoveredFeesTotal: number;
  totalPerksValue: number;
  trueNetCost3Years: number;     // ดอกเบี้ย 3 ปี + เบี้ย MRTA + ค่าธรรมเนียมผู้กู้จ่าย - Perks
  trueNetCostLifetime: number;   // เงินต้น + ดอกเบี้ยตลอดสัญญา + เบี้ย MRTA + ค่าธรรมเนียมผู้กู้จ่าย - Perks
  upfrontCashRequired: number;   // เงินดาวน์ + ค่าธรรมเนียมผู้กู้จ่าย + เบี้ย MRTA จ่ายสด
  monthlyPaymentAvg3Years: number;
  monthlyPaymentFirst3YearsAvg: number;
  totalMonthsToPayoff: number;
  monthsSavedByPrepayment: number;
  interestSavedByPrepayment: number;
  prepaymentSavingsInterest: number;
  prepaymentYearsSaved: number;
  monthlySchedule: MonthlyAmortizationRow[];
  smartPrepaymentAdvice?: string;
  advisories?: string[];
  lockInWarning?: boolean;
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


