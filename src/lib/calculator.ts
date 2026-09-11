import { BankProgram, BankInfo, BotRateData, AmortizationRow, CalculationResult, FeeConfig, MRTACompany, CustomBankOffer } from '../types/loan';

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
 * แปลง CustomBankOffer ให้กลายเป็น BankProgram + BankInfo
 */
export function convertCustomOfferToProgram(offer: CustomBankOffer, botRates?: Record<string, BotRateData>): { program: BankProgram; bank: BankInfo } {
  const bank: BankInfo = {
    id: offer.id,
    code: 'CUSTOM',
    nameTh: offer.bankName,
    nameEn: offer.bankName,
    color: offer.color || '#6366f1',
    defaultMRR: 7.30,
    defaultMLR: 7.05,
    defaultMOR: 7.50,
    programs: []
  };

  const periods: any[] = [
    { yearFrom: 1, yearTo: 1, rateType: 'fixed', fixedRate: offer.rateYear1 },
    { yearFrom: 2, yearTo: 2, rateType: 'fixed', fixedRate: offer.rateYear2 },
    { yearFrom: 3, yearTo: 3, rateType: 'fixed', fixedRate: offer.rateYear3 },
  ];

  if (offer.rateYear4PlusType === 'fixed') {
    periods.push({ yearFrom: 4, yearTo: null, rateType: 'fixed', fixedRate: offer.rateYear4PlusFixed });
  } else {
    periods.push({
      yearFrom: 4,
      yearTo: null,
      rateType: 'floating',
      baseRateType: offer.rateYear4PlusBase || 'MRR',
      spread: offer.rateYear4PlusSpread || 0
    });
  }

  const program: BankProgram = {
    id: offer.id,
    bankId: offer.id,
    name: offer.bankName,
    interestType: 'stepped',
    description: `ปี 1: ${offer.rateYear1}%, ปี 2: ${offer.rateYear2}%, ปี 3: ${offer.rateYear3}%, ปี 4+: ${offer.rateYear4PlusType === 'fixed' ? offer.rateYear4PlusFixed + '%' : (offer.rateYear4PlusBase || 'MRR') + ' ' + (offer.rateYear4PlusSpread >= 0 ? '+' : '') + offer.rateYear4PlusSpread + '%'}`,
    isCustom: true,
    periods
  };

  bank.programs.push(program);
  return { program, bank };
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
  const period = program.periods.find(p => {
    if (p.yearTo === null) {
      return year >= p.yearFrom;
    }
    return year >= p.yearFrom && year <= p.yearTo;
  });

  if (!period) {
    const last = program.periods[program.periods.length - 1];
    return last ? (last.fixedRate ?? 5.0) : 5.0;
  }

  if (period.rateType === 'fixed') {
    return period.fixedRate ?? 0;
  }

  const baseType = period.baseRateType || 'MRR';
  let baseValue = 7.0;

  if (bankInfo) {
    if (baseType === 'MRR') baseValue = bankInfo.defaultMRR;
    else if (baseType === 'MLR') baseValue = bankInfo.defaultMLR;
    else if (baseType === 'MOR') baseValue = bankInfo.defaultMOR;
  }

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

  const availableAges = Object.keys(company.rates).map(Number).sort((a, b) => a - b);
  let closestAge = availableAges[0];
  for (const age of availableAges) {
    if (borrowerAge >= age) closestAge = age;
  }

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
    financeMRTAWithLoan?: boolean;
    mrtaDiscountRate?: number; // ส่วนลดดอกเบี้ยถ้าทำ MRTA
  },
  feeConfig: FeeConfig,
  botRates?: Record<string, BotRateData>
): CalculationResult {
  const totalMonths = loanTermYears * 12;

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

  // คำนวณอัตราพร้อมหักส่วนลด MRTA (ถ้ามี)
  const getEffectiveRate = (yr: number) => {
    let r = getRateForYear(program, yr, bankInfo, botRates);
    if (mrtaOption.includeMRTA && mrtaOption.mrtaDiscountRate && yr <= 3) {
      r = Math.max(0, r - mrtaOption.mrtaDiscountRate);
    }
    return r;
  };

  let currentPMT = calculatePMT(balance, getEffectiveRate(1), totalMonths);

  for (let m = 1; m <= totalMonths; m++) {
    const year = Math.ceil(m / 12);

    if (year !== currentYear) {
      currentYear = year;
      remainingMonths = totalMonths - m + 1;
      const rate = getEffectiveRate(year);
      currentPMT = calculatePMT(balance, rate, remainingMonths);
    }

    const currentRate = getEffectiveRate(year);
    const monthlyRate = (currentRate / 100) / 12;
    const interest = Math.round(balance * monthlyRate);

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

  const avg3Years = first3YearsPayments.length > 0
    ? Math.round(first3YearsPayments.reduce((a, b) => a + b, 0) / first3YearsPayments.length)
    : currentPMT;

  let sumRates3Years = 0;
  for (let y = 1; y <= 3; y++) {
    sumRates3Years += getEffectiveRate(y);
  }
  const effectiveRate = Number((sumRates3Years / 3).toFixed(2));

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
