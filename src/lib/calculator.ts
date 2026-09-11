import { BankProgram, BankInfo, BotRateData, AmortizationRow, CalculationResult, FeeConfig, MRTACompany } from '../types/loan';

/**
 * คำนวณค่างวดรายเดือนด้วยสูตร PMT มาตรฐาน
 * PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calculatePMT(principal: number, annualRatePercent: number, totalMonths: number): number {
  if (annualRatePercent <= 0) {
    return principal / totalMonths;
  }
  const monthlyRate = (annualRatePercent / 100) / 12;
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const pmt = (principal * monthlyRate * factor) / (factor - 1);
  return Math.round(pmt);
}

/**
 * หาอัตราดอกเบี้ยประจำปีตามปีที่ระบุในโปรแกรมสินเชื่อ
 */
export function getRateForYear(
  program: BankProgram,
  year: number,
  bankInfo?: BankInfo,
  botRates?: Record<string, BotRateData>
): number {
  // หาช่วงเวลาที่ตรงกับปี
  const period = program.periods.find(p => {
    if (p.yearTo === null) {
      return year >= p.yearFrom;
    }
    return year >= p.yearFrom && year <= p.yearTo;
  });

  if (!period) {
    // ถ้าไม่เจอ ให้ใช้ตัวสุดท้าย
    const last = program.periods[program.periods.length - 1];
    return last ? (last.fixedRate ?? 5.0) : 5.0;
  }

  if (period.rateType === 'fixed') {
    return period.fixedRate ?? 0;
  }

  // Floating rate (อิง MRR / MLR / MOR)
  const baseType = period.baseRateType || 'MRR';
  let baseValue = 7.0; // fallback default

  if (bankInfo) {
    if (baseType === 'MRR') baseValue = bankInfo.defaultMRR;
    else if (baseType === 'MLR') baseValue = bankInfo.defaultMLR;
    else if (baseType === 'MOR') baseValue = bankInfo.defaultMOR;
  }

  // ถ้ามี BOT Rates อัพเดทใหม่ ให้ใช้อันนั้น
  if (bankInfo && botRates && botRates[bankInfo.code]) {
    const live = botRates[bankInfo.code];
    if (baseType === 'MRR' && live.mrr > 0) baseValue = live.mrr;
    else if (baseType === 'MLR' && live.mlr > 0) baseValue = live.mlr;
    else if (baseType === 'MOR' && live.mor > 0) baseValue = live.mor;
  }

  return Number((baseValue + (period.spread || 0)).toFixed(3));
}

/**
 * คำนวณเบี้ยประกัน MRTA (Single Premium ชำระครั้งเดียว)
 */
export function calculateMRTAPremium(
  loanAmount: number,
  borrowerAge: number,
  termYears: number,
  company?: MRTACompany,
  customRatePerThousand?: number
): number {
  if (customRatePerThousand !== undefined && customRatePerThousand > 0) {
    return Math.round((loanAmount / 1000) * customRatePerThousand);
  }

  if (!company) return 0;

  // หาอายุที่ใกล้เคียงที่สุดในตาราง (25, 30, 35, 40, 45, 50)
  const availableAges = Object.keys(company.rates).map(Number).sort((a, b) => a - b);
  let closestAge = availableAges[0];
  for (const age of availableAges) {
    if (borrowerAge >= age) closestAge = age;
  }

  // หาระยะคุ้มครองที่ใกล้เคียง (10, 15, 20, 25, 30)
  const ageRates = company.rates[closestAge];
  if (!ageRates) return 0;

  const availableTerms = Object.keys(ageRates).map(Number).sort((a, b) => a - b);
  let closestTerm = availableTerms[0];
  for (const term of availableTerms) {
    if (termYears >= term) closestTerm = term;
  }

  const ratePerThousand = ageRates[closestTerm] || 50;
  return Math.round((loanAmount / 1000) * ratePerThousand);
}

/**
 * คำนวณค่าธรรมเนียมทั้งหมด
 */
export function calculateAllFees(
  propertyPrice: number,
  loanAmount: number,
  loanTermYears: number,
  feeConfig: FeeConfig
): {
  mortgageFee: number;
  stampDuty: number;
  transferFee: number;
  appraisalFee: number;
  fireInsurance: number;
  totalFees: number;
} {
  const mortgageFee = Math.round(loanAmount * feeConfig.mortgageFeeRate);
  const stampDuty = Math.round(loanAmount * feeConfig.stampDutyRate);
  const transferFee = Math.round(propertyPrice * feeConfig.transferFeeRate);
  const appraisalFee = feeConfig.appraisalFee;
  const fireInsurance = Math.round(feeConfig.fireInsurancePerYear * loanTermYears);

  const totalFees = mortgageFee + stampDuty + transferFee + appraisalFee + fireInsurance;

  return {
    mortgageFee,
    stampDuty,
    transferFee,
    appraisalFee,
    fireInsurance,
    totalFees
  };
}

/**
 * ฟังก์ชันหลักในการคำนวณสินเชื่อตลอดอายุสัญญา (Amortization Schedule)
 */
export function calculateLoanProgram(
  program: BankProgram,
  bankInfo: BankInfo,
  propertyPrice: number,
  loanAmount: number,
  loanTermYears: number,
  borrowerAge: number,
  mrtaOption: {
    includeMRTA: boolean;
    company?: MRTACompany;
    customRate?: number;
    financeMRTAWithLoan?: boolean; // กู้รวมกับยอดบ้าน
  },
  feeConfig: FeeConfig,
  botRates?: Record<string, BotRateData>
): CalculationResult {
  const totalMonths = loanTermYears * 12;

  // คำนวณเบี้ย MRTA
  let mrtaPremium = 0;
  if (mrtaOption.includeMRTA) {
    mrtaPremium = calculateMRTAPremium(
      loanAmount,
      borrowerAge,
      loanTermYears,
      mrtaOption.company,
      mrtaOption.customRate
    );
  }

  // วงเงินกู้ตั้งต้น (ถ้ารวม MRTA ในเงินกู้)
  const initialPrincipal = mrtaOption.financeMRTAWithLoan
    ? loanAmount + mrtaPremium
    : loanAmount;

  let balance = initialPrincipal;
  const schedule: AmortizationRow[] = [];
  let totalInterest = 0;
  let totalPrincipalPaid = 0;
  const first3YearsPayments: number[] = [];
  let maxMonthlyPayment = 0;

  let currentYear = 1;
  let remainingMonths = totalMonths;
  let currentPMT = calculatePMT(balance, getRateForYear(program, 1, bankInfo, botRates), totalMonths);

  for (let m = 1; m <= totalMonths; m++) {
    const year = Math.ceil(m / 12);

    // ปรับดอกเบี้ยและคำนวณ PMT ใหม่เมื่อเปลี่ยนปี
    if (year !== currentYear) {
      currentYear = year;
      remainingMonths = totalMonths - m + 1;
      const rate = getRateForYear(program, year, bankInfo, botRates);
      currentPMT = calculatePMT(balance, rate, remainingMonths);
    }

    const currentRate = getRateForYear(program, year, bankInfo, botRates);
    const monthlyRate = (currentRate / 100) / 12;
    const interest = Math.round(balance * monthlyRate);

    // งวดสุดท้ายตัดยอดที่เหลือ
    let payment = currentPMT;
    let principal = payment - interest;

    if (m === totalMonths || principal > balance) {
      principal = balance;
      payment = principal + interest;
    }

    balance = Math.max(0, balance - principal);
    totalInterest += interest;
    totalPrincipalPaid += principal;

    if (m <= 36) {
      first3YearsPayments.push(payment);
    }
    if (payment > maxMonthlyPayment) {
      maxMonthlyPayment = payment;
    }

    schedule.push({
      month: m,
      year,
      payment,
      principal,
      interest,
      balance,
      currentRate
    });

    if (balance <= 0) break;
  }

  // ค่าเฉลี่ยผ่อน 3 ปีแรก
  const avg3Years = first3YearsPayments.length > 0
    ? Math.round(first3YearsPayments.reduce((a, b) => a + b, 0) / first3YearsPayments.length)
    : currentPMT;

  // ดอกเบี้ยเฉลี่ย 3 ปีแรก
  let sumRates3Years = 0;
  for (let y = 1; y <= 3; y++) {
    sumRates3Years += getRateForYear(program, y, bankInfo, botRates);
  }
  const effectiveRate = Number((sumRates3Years / 3).toFixed(2));

  // ค่าธรรมเนียม
  const fees = calculateAllFees(propertyPrice, loanAmount, loanTermYears, feeConfig);

  const totalLoanPayment = totalPrincipalPaid + totalInterest;
  const grandTotalCost = totalInterest + (mrtaOption.financeMRTAWithLoan ? 0 : mrtaPremium) + fees.totalFees;

  return {
    programId: program.id,
    bankId: bankInfo.id,
    bankName: bankInfo.nameTh,
    programName: program.name,
    monthlyPaymentFirst3YearsAvg: avg3Years,
    monthlyPaymentMax: maxMonthlyPayment,
    totalInterestPaid: totalInterest,
    totalPrincipalPaid,
    totalLoanPayment,
    mrtaPremium,
    totalFees: fees.totalFees,
    grandTotalCost,
    effectiveInterestRate: effectiveRate,
    schedule
  };
}
