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

/**
 * คำนวณข้อเสนอสินเชื่อแบบละเอียด (Advanced Custom Offer)
 * รองรับ 2 บัญชีอิสระ (บ้าน + MRTA), ยอดผ่อนธนาคารแจ้งจริง, แผนโปะ Target Monthly,
 * ตารางสรุป 3 ปีแรกทั้งรายปี/รายงวด, ค่าธรรมเนียมแยกผู้รับผิดชอบ และ True Net Cost
 */
export function calculateAdvancedCustomOffer(
  offer: CustomBankOffer,
  defaultPropertyPrice: number,
  defaultLoanAmount: number,
  defaultTermYears: number,
  defaultBorrowerAge: number,
  defaultFeeConfig: FeeConfig,
  botRates?: Record<string, BotRateData>
): import('../types/loan').AdvancedOfferCalculationResult {
  const homePrincipal = offer.homeLoan?.loanAmount ?? defaultLoanAmount;
  const homeTermYears = offer.homeLoan?.termYears ?? defaultTermYears;
  const mrtaPremium = offer.mrtaLoan?.totalPremium ?? 0;
  const mrtaFinance = offer.mrtaLoan?.financeWithLoan ?? false;
  const mrtaPrincipal = mrtaFinance ? (offer.mrtaLoan?.loanAmount ?? mrtaPremium) : 0;
  const mrtaTermYears = offer.mrtaLoan?.termYears ?? Math.min(20, homeTermYears);
  const propertyPrice = offer.propertyPrice ?? defaultPropertyPrice;
  const maxTermYears = Math.max(homeTermYears, mrtaTermYears);
  const totalMonths = maxTermYears * 12;

  const getHomeRate = (yr: number): number => {
    const hl = offer.homeLoan;
    if (yr === 1) return hl?.rateYear1 ?? offer.rateYear1 ?? 3.0;
    if (yr === 2) return hl?.rateYear2 ?? offer.rateYear2 ?? 3.5;
    if (yr === 3) return hl?.rateYear3 ?? offer.rateYear3 ?? 4.0;
    
    const type = hl?.rateYear4PlusType ?? offer.rateYear4PlusType;
    if (type === 'fixed') {
      return hl?.rateYear4PlusFixed ?? offer.rateYear4PlusFixed ?? 5.5;
    }
    const base = hl?.rateYear4PlusBase ?? offer.rateYear4PlusBase ?? 'MRR';
    const spread = hl?.rateYear4PlusSpread ?? offer.rateYear4PlusSpread ?? 0;
    let baseVal = 7.30;
    if (botRates && base === 'MLR') baseVal = 7.05;
    return Number((baseVal + spread).toFixed(3));
  };

  const getMRTARate = (yr: number): number => {
    const ml = offer.mrtaLoan;
    if (!ml) return getHomeRate(yr);
    if (yr === 1) return ml.rateYear1 ?? getHomeRate(1);
    if (yr === 2) return ml.rateYear2 ?? getHomeRate(2);
    if (yr === 3) return ml.rateYear3 ?? getHomeRate(3);

    if (ml.rateYear4PlusType === 'fixed') {
      return ml.rateYear4PlusFixed ?? getHomeRate(yr);
    }
    const base = ml.rateYear4PlusBase ?? 'MRR';
    const spread = ml.rateYear4PlusSpread ?? 0;
    let baseVal = 7.30;
    if (botRates && base === 'MLR') baseVal = 7.05;
    return Number((baseVal + spread).toFixed(3));
  };

  // Helper สำหรับคำนวณการผ่อนชำระ
  const runSimulation = (applyPrepayment: boolean) => {
    let hBal = homePrincipal;
    let mBal = mrtaPrincipal;
    const monthlySchedule: import('../types/loan').MonthlyAmortizationRow[] = [];
    const yearlyMap = new Map<number, import('../types/loan').YearlyInterestDetail>();

    let totalMonthsToPayoff = 0;
    let totalHomeInterest = 0;
    let totalMrtaInterest = 0;
    let first3YearsHomeMonthly: number[] = [];
    let first3YearsMrtaMonthly: number[] = [];

    for (let m = 1; m <= totalMonths; m++) {
      if (hBal <= 0 && mBal <= 0) break;
      totalMonthsToPayoff = m;

      const yr = Math.ceil(m / 12);
      const hRate = getHomeRate(yr);
      const mRate = getMRTARate(yr);

      // ดอกเบี้ยประจำเดือน
      const hInt = hBal > 0 ? Math.round(hBal * (hRate / 100) / 12) : 0;
      const mInt = mBal > 0 ? Math.round(mBal * (mRate / 100) / 12) : 0;

      // ค่างวดที่ธนาคารแจ้ง หรือคำนวณ PMT
      const hl = offer.homeLoan;
      const ml = offer.mrtaLoan;
      const hRemMonths = Math.max(1, (homeTermYears * 12) - m + 1);
      const mRemMonths = Math.max(1, (mrtaTermYears * 12) - m + 1);

      let hStatedPmt = 0;
      if (hBal > 0) {
        if (yr === 1 && hl?.bankInstallmentYear1) hStatedPmt = hl.bankInstallmentYear1;
        else if (yr === 2 && hl?.bankInstallmentYear2) hStatedPmt = hl.bankInstallmentYear2;
        else if (yr === 3 && hl?.bankInstallmentYear3) hStatedPmt = hl.bankInstallmentYear3;
        else if (yr >= 4 && hl?.bankInstallmentYear4Plus) hStatedPmt = hl.bankInstallmentYear4Plus;
        else hStatedPmt = calculatePMT(hBal, hRate, hRemMonths);
      }

      let mStatedPmt = 0;
      if (mBal > 0) {
        if (yr === 1 && ml?.bankInstallmentYear1) mStatedPmt = ml.bankInstallmentYear1;
        else if (yr === 2 && ml?.bankInstallmentYear2) mStatedPmt = ml.bankInstallmentYear2;
        else if (yr === 3 && ml?.bankInstallmentYear3) mStatedPmt = ml.bankInstallmentYear3;
        else if (yr >= 4 && ml?.bankInstallmentYear4Plus) mStatedPmt = ml.bankInstallmentYear4Plus;
        else mStatedPmt = calculatePMT(mBal, mRate, mRemMonths);
      }

      // ตรวจสอบยอดผ่อนปกติ
      let hPrinFromPmt = Math.max(0, hStatedPmt - hInt);
      if (hPrinFromPmt > hBal) {
        hPrinFromPmt = hBal;
        hStatedPmt = hPrinFromPmt + hInt;
      }

      let mPrinFromPmt = Math.max(0, mStatedPmt - mInt);
      if (mPrinFromPmt > mBal) {
        mPrinFromPmt = mBal;
        mStatedPmt = mPrinFromPmt + mInt;
      }

      // แผนการโปะ
      let extraPool = 0;
      const prepay = offer.prepayment;
      const isPrepaymentActive = prepay && prepay.enabled !== false && prepay.mode !== 'none';
      if (applyPrepayment && isPrepaymentActive) {
        if (prepay.mode === 'target_monthly') {
          let target = 0;
          if (yr === 1) target = prepay.targetMonthlyYear1 || 0;
          else if (yr === 2) target = prepay.targetMonthlyYear2 || 0;
          else if (yr === 3) target = prepay.targetMonthlyYear3 || 0;
          else target = prepay.targetMonthlyYear4Plus || 0;

          const regularSum = hStatedPmt + mStatedPmt;
          if (target > regularSum) {
            extraPool = target - regularSum;
          }
        } else if (prepay.mode === 'fixed_extra') {
          extraPool = prepay.fixedExtraMonthly || 0;
        } else if (prepay.mode === 'stepped') {
          if (yr === 1) extraPool = prepay.steppedYear1 || 0;
          else if (yr === 2) extraPool = prepay.steppedYear2 || 0;
          else if (yr === 3) extraPool = prepay.steppedYear3 || 0;
          else extraPool = prepay.steppedYear4Plus || 0;
        }

        if (m % 12 === 0 && prepay.annualBonusExtra) {
          extraPool += prepay.annualBonusExtra;
        }
      }

      // จัดสรรเงินโปะ
      let hExtra = 0;
      let mExtra = 0;
      const hRemAfterPmt = Math.max(0, hBal - hPrinFromPmt);
      const mRemAfterPmt = Math.max(0, mBal - mPrinFromPmt);

      if (extraPool > 0 && (hRemAfterPmt > 0 || mRemAfterPmt > 0)) {
        const alloc = prepay?.allocation || 'smart_auto';
        if (alloc === 'smart_auto') {
          if (mRemAfterPmt > 0 && mRate >= hRate) {
            mExtra = Math.min(mRemAfterPmt, extraPool);
            hExtra = Math.min(hRemAfterPmt, extraPool - mExtra);
          } else {
            hExtra = Math.min(hRemAfterPmt, extraPool);
            mExtra = Math.min(mRemAfterPmt, extraPool - hExtra);
          }
        } else if (alloc === 'proportional') {
          const totRem = hRemAfterPmt + mRemAfterPmt;
          if (totRem > 0) {
            hExtra = Math.min(hRemAfterPmt, extraPool * (hRemAfterPmt / totRem));
            mExtra = Math.min(mRemAfterPmt, extraPool - hExtra);
          }
        } else if (alloc === 'manual_split') {
          const splitPct = (prepay?.manualHomeSplitPercent ?? 50) / 100;
          hExtra = Math.min(hRemAfterPmt, extraPool * splitPct);
          mExtra = Math.min(mRemAfterPmt, extraPool * (1 - splitPct));
        }
      }

      // ตัดเงินต้น
      const hPrinTotal = hPrinFromPmt + hExtra;
      const mPrinTotal = mPrinFromPmt + mExtra;
      hBal = Math.max(0, hBal - hPrinTotal);
      mBal = Math.max(0, mBal - mPrinTotal);

      totalHomeInterest += hInt;
      totalMrtaInterest += mInt;

      if (m <= 36) {
        first3YearsHomeMonthly.push(hStatedPmt + hExtra);
        if (mStatedPmt + mExtra > 0) first3YearsMrtaMonthly.push(mStatedPmt + mExtra);
      }

      // บันทึกตารางรายงวด
      monthlySchedule.push({
        month: m,
        year: yr,
        homePayment: hStatedPmt,
        homeInterest: hInt,
        homePrincipal: hPrinTotal,
        homeBalance: hBal,
        mrtaPayment: mStatedPmt,
        mrtaInterest: mInt,
        mrtaPrincipal: mPrinTotal,
        mrtaBalance: mBal,
        extraPrepayment: hExtra + mExtra,
        totalPayment: hStatedPmt + mStatedPmt + hExtra + mExtra,
        totalEndingBalance: hBal + mBal,
        regularPayment: hStatedPmt + mStatedPmt,
        prepayment: hExtra + mExtra,
        balanceTotal: hBal + mBal
      });

      // รวมรายปี
      if (!yearlyMap.has(yr)) {
        yearlyMap.set(yr, {
          year: yr,
          homeRate: hRate,
          mrtaRate: mRate,
          homePayment: 0,
          homeInterest: 0,
          homePrincipal: 0,
          mrtaPayment: 0,
          mrtaInterest: 0,
          mrtaPrincipal: 0,
          extraPrepayment: 0,
          totalInterest: 0,
          totalPayment: 0,
          homeEndingBalance: 0,
          mrtaEndingBalance: 0,
          totalEndingBalance: 0,
          totalRegularPayment: 0,
          totalPrepayment: 0,
          totalPaid: 0
        });
      }

      const yItem = yearlyMap.get(yr)!;
      yItem.homePayment += (hStatedPmt + hExtra);
      yItem.homeInterest += hInt;
      yItem.homePrincipal += hPrinTotal;
      yItem.mrtaPayment += (mStatedPmt + mExtra);
      yItem.mrtaInterest += mInt;
      yItem.mrtaPrincipal += mPrinTotal;
      yItem.extraPrepayment += (hExtra + mExtra);
      yItem.totalInterest += (hInt + mInt);
      yItem.totalPayment += (hStatedPmt + mStatedPmt + hExtra + mExtra);
      yItem.totalRegularPayment += (hStatedPmt + mStatedPmt);
      yItem.totalPrepayment += (hExtra + mExtra);
      yItem.totalPaid += (hStatedPmt + mStatedPmt + hExtra + mExtra);
      yItem.homeEndingBalance = hBal;
      yItem.mrtaEndingBalance = mBal;
      yItem.totalEndingBalance = hBal + mBal;
    }

    return {
      monthlySchedule,
      yearlyDetails: Array.from(yearlyMap.values()),
      totalMonthsToPayoff,
      totalHomeInterest,
      totalMrtaInterest,
      totalInterest: totalHomeInterest + totalMrtaInterest,
      avg3YearsMonthly: first3YearsHomeMonthly.length > 0 
        ? Math.round(first3YearsHomeMonthly.reduce((a, b) => a + b, 0) / first3YearsHomeMonthly.length)
        : 0
    };
  };

  const simWithPrepay = runSimulation(true);
  const simBaseline = runSimulation(false);

  // ดอกเบี้ย 3 ปีแรก
  let int3YHome = 0;
  let int3YMRTA = 0;
  for (const yd of simWithPrepay.yearlyDetails) {
    if (yd.year <= 3) {
      int3YHome += yd.homeInterest;
      int3YMRTA += yd.mrtaInterest;
    }
  }
  const int3YTotal = int3YHome + int3YMRTA;

  // ค่าธรรมเนียม
  const defaultMortgage = Math.round(homePrincipal * defaultFeeConfig.mortgageFeeRate);
  const defaultTransfer = Math.round(propertyPrice * defaultFeeConfig.transferFeeRate);
  const defaultStamp = Math.round(homePrincipal * defaultFeeConfig.stampDutyRate);
  const defaultAppraisal = defaultFeeConfig.appraisalFee;
  const defaultFire = Math.round(defaultFeeConfig.fireInsurancePerYear * homeTermYears);

  let borrowerFees = 0;
  let bankFees = 0;

  const f = offer.fees;
  const processFee = (feeItem: import('../types/loan').FeeItemConfig | undefined, defaultAmt: number) => {
    const payer = feeItem?.payer || 'borrower';
    const amt = feeItem?.customAmount !== undefined ? feeItem.customAmount : defaultAmt;
    if (payer === 'borrower') borrowerFees += amt;
    else if (payer === 'bank') bankFees += amt;
  };

  processFee(f?.mortgageFee, defaultMortgage);
  processFee(f?.transferFee, defaultTransfer);
  processFee(f?.appraisalFee, defaultAppraisal);
  processFee(f?.stampDuty, defaultStamp);
  processFee(f?.fireInsurance, defaultFire);
  if (f?.otherFees?.customAmount) {
    if (f.otherFees.payer === 'borrower') borrowerFees += f.otherFees.customAmount;
    else if (f.otherFees.payer === 'bank') bankFees += f.otherFees.customAmount;
  }

  // Perks
  const totalPerks = offer.perks ? offer.perks.reduce((sum, p) => sum + (p.value || 0), 0) : 0;

  // True Net Costs
  const trueNetCost3Years = int3YTotal + (mrtaFinance ? 0 : mrtaPremium) + borrowerFees - totalPerks;
  const trueNetCostLifetime = homePrincipal + mrtaPrincipal + simWithPrepay.totalInterest + (mrtaFinance ? 0 : mrtaPremium) + borrowerFees - totalPerks;

  const downPayment = Math.max(0, propertyPrice - homePrincipal);
  const upfrontCash = downPayment + borrowerFees + (mrtaFinance ? 0 : mrtaPremium);

  // Prepayment Savings
  const monthsSaved = Math.max(0, simBaseline.totalMonthsToPayoff - simWithPrepay.totalMonthsToPayoff);
  const interestSaved = Math.max(0, simBaseline.totalInterest - simWithPrepay.totalInterest);

  // Smart Prepayment Advice
  let smartAdvice: string | undefined = undefined;
  const y1Home = getHomeRate(1);
  const y1Mrta = getMRTARate(1);
  if (mrtaPrincipal > 0) {
    if (y1Mrta > y1Home) {
      smartAdvice = `💡 แนะนำ: ดอกเบี้ยวงเงิน MRTA ปีที่ 1 (${y1Mrta}%) สูงกว่าสินเชื่อบ้าน (${y1Home}%) ควรจัดสรรเงินโปะไปที่วงเงิน MRTA ก่อน (โหมด Smart Auto) เพื่อตัดหนี้ที่มีดอกเบี้ยแพงที่สุดออกก่อน`;
    } else if (y1Home > y1Mrta) {
      smartAdvice = `💡 แนะนำ: ดอกเบี้ยสินเชื่อบ้านปีที่ 1 (${y1Home}%) สูงกว่าวงเงิน MRTA (${y1Mrta}%) ควรจัดสรรเงินโปะตัดเงินต้นบ้านก่อน`;
    }
  }

  const advisories: string[] = [];
  if (smartAdvice) advisories.push(smartAdvice);
  if (offer.lockInYears === 5) {
    advisories.push(`⚠️ ข้อเสนอนี้มีเงื่อนไขห้ามรีไฟแนนซ์ 5 ปี กรุณาตรวจสอบอัตราดอกเบี้ยปีที่ 4-5 เพิ่มเติมก่อนตัดสินใจ`);
  }

  return {
    offer,
    offerId: offer.id,
    offerName: offer.bankName,
    color: offer.color || '#6366f1',
    yearlyDetails: simWithPrepay.yearlyDetails,
    interest3YearsHome: int3YHome,
    interest3YearsMRTA: int3YMRTA,
    interest3YearsTotal: int3YTotal,
    totalInterestLifetime: simWithPrepay.totalInterest,
    totalPrincipalHome: homePrincipal,
    totalPrincipalMRTA: mrtaPrincipal,
    mrtaPremiumTotal: mrtaPremium,
    borrowerFeesTotal: borrowerFees,
    borrowerPaidFees: borrowerFees,
    bankCoveredFeesTotal: bankFees,
    totalPerksValue: totalPerks,
    trueNetCost3Years,
    trueNetCostLifetime,
    upfrontCashRequired: upfrontCash,
    monthlyPaymentAvg3Years: simWithPrepay.avg3YearsMonthly,
    monthlyPaymentFirst3YearsAvg: simWithPrepay.avg3YearsMonthly,
    totalMonthsToPayoff: simWithPrepay.totalMonthsToPayoff,
    monthsSavedByPrepayment: monthsSaved,
    interestSavedByPrepayment: interestSaved,
    prepaymentSavingsInterest: interestSaved,
    prepaymentYearsSaved: Number((monthsSaved / 12).toFixed(1)),
    monthlySchedule: simWithPrepay.monthlySchedule,
    smartPrepaymentAdvice: smartAdvice,
    advisories,
    lockInWarning: offer.lockInYears === 5
  };
}

