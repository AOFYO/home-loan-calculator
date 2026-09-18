import { describe, it, expect } from 'vitest';
import { 
  calculatePMT, 
  calculateAllFees,
  calculateMRTAPremium,
  calculateLoanProgram,
  calculateAdvancedCustomOffer 
} from './calculator';
import { CustomBankOffer, FeeConfig } from '../types/loan';
import { DEFAULT_BANKS, DEFAULT_MRTA_COMPANIES } from '../data/masterData';

const mockFeeConfig: FeeConfig = {
  mortgageFeeRate: 0.01,
  transferFeeRate: 0.02,
  stampDutyRate: 0.0005,
  appraisalFee: 3000,
  fireInsurancePerYear: 1000
};

describe('Financial Formula: calculatePMT', () => {
  it('calculates standard monthly installment accurately', () => {
    // กู้ 1,000,000 ดอกเบี้ย 3% ระยะเวลา 30 ปี (360 งวด)
    const pmt = calculatePMT(1000000, 3.0, 360);
    // ตามสูตร PMT มาตรฐาน = ~4,216 บาท
    expect(pmt).toBeGreaterThan(4200);
    expect(pmt).toBeLessThan(4250);
  });

  it('handles 0% interest rate gracefully', () => {
    const pmt = calculatePMT(120000, 0, 12);
    expect(pmt).toBe(10000);
  });
});

describe('MRTA Premium Calculation', () => {
  it('calculates MRTA premium based on age bracket and loan term', () => {
    const premium = calculateMRTAPremium(1000000, 30, 10, DEFAULT_MRTA_COMPANIES[0]);
    expect(premium).toBeGreaterThan(0);
    // AIA: อายุ 30 กู้ 10 ปี เรท 30.0 บาทต่อพัน -> 1,000,000 / 1,000 * 30.0 = 30,000 บาท
    expect(premium).toBe(30000);
  });
});

describe('Fee & Stamp Duty Calculations', () => {
  it('calculates stamp duty with 0.05% rate and 10,000 THB legal cap', () => {
    // 1 ล้าน -> 500 บ.
    const fees1M = calculateAllFees(1200000, 1000000, 30, mockFeeConfig);
    expect(fees1M.stampDuty).toBe(500);

    // 3,575,000 -> 1,788 บ. (ปัดเศษ 1 บ. ทุก 2,000 บ.)
    const fees3_5M = calculateAllFees(4000000, 3575000, 30, mockFeeConfig);
    expect(fees3_5M.stampDuty).toBe(1788);

    // 25,000,000 -> เพดานตามกฎหมายสูงสุดไม่เกิน 10,000 บ.
    const fees25M = calculateAllFees(30000000, 25000000, 30, mockFeeConfig);
    expect(fees25M.stampDuty).toBe(10000);
  });
});

describe('Advanced Custom Offer Calculations', () => {
  const baseOffer: CustomBankOffer = {
    id: 'test_offer',
    bankName: 'ธนาคารทดสอบ',
    color: '#3b82f6',
    rateYear1: 2.5,
    rateYear2: 3.0,
    rateYear3: 3.5,
    rateYear4PlusType: 'fixed',
    rateYear4PlusFixed: 5.5,
    rateYear4PlusBase: 'MRR',
    rateYear4PlusSpread: -1.5,
    mrtaDiscountRate: 0,
    isAdvanced: true,
    propertyPrice: 4000000,
    homeLoan: {
      loanAmount: 3575000,
      termYears: 30,
      rateYear1: 2.29,
      rateYear2: 2.29,
      rateYear3: 2.29,
      rateYear4PlusType: 'floating',
      rateYear4PlusFixed: 5.5,
      rateYear4PlusBase: 'MRR',
      rateYear4PlusSpread: -1.25,
      bankInstallmentYear1: 16000,
      bankInstallmentYear2: 16000,
      bankInstallmentYear3: 16000,
      bankInstallmentYear4Plus: 16000
    }
  };

  it('calculates dual-account installment accurately when MRTA is included (16,000 + 1,100 = 17,100)', () => {
    const offerWithMRTA: CustomBankOffer = {
      ...baseOffer,
      includeMRTA: true,
      mrtaLoan: {
        totalPremium: 143000,
        financeWithLoan: true,
        loanAmount: 143000,
        termYears: 10,
        rateYear1: 2.29,
        rateYear2: 2.29,
        rateYear3: 2.29,
        rateYear4PlusType: 'floating',
        rateYear4PlusFixed: 5.5,
        rateYear4PlusBase: 'MRR',
        rateYear4PlusSpread: -1.0,
        bankInstallmentYear1: 1100,
        bankInstallmentYear2: 1100,
        bankInstallmentYear3: 1100,
        bankInstallmentYear4Plus: 1100
      }
    };

    const result = calculateAdvancedCustomOffer(offerWithMRTA, 4000000, 3575000, 30, 30, mockFeeConfig);

    // ตรวจสอบค่างวดเรียกเก็บรวมงวดแรกในตาราง = 16,000 + 1,100 = 17,100
    expect(result.monthlySchedule[0].regularPayment).toBe(17100);
    expect(result.monthlySchedule[0].homePayment).toBe(16000);
    expect(result.monthlySchedule[0].mrtaPayment).toBe(1100);

    // ตรวจสอบค่าเฉลี่ย 3 ปีแรกในการ์ด = 17,100
    expect(result.monthlyPaymentFirst3YearsAvg).toBe(17100);
    expect(result.avg3YearsHomeMonthly).toBe(16000);
    expect(result.avg3YearsMrtaMonthly).toBe(1100);
    expect(result.totalPrincipalMRTA).toBe(143000);
  });

  it('runs safely without error when MRTA is unchecked (includeMRTA: false, mrtaLoan: undefined)', () => {
    const offerWithoutMRTA: CustomBankOffer = {
      ...baseOffer,
      includeMRTA: false,
      mrtaLoan: undefined
    };

    // ต้องไม่โยน runtime exception
    expect(() => {
      const result = calculateAdvancedCustomOffer(offerWithoutMRTA, 4000000, 3575000, 30, 30, mockFeeConfig);
      expect(result.totalPrincipalMRTA).toBe(0);
      expect(result.mrtaPremiumTotal).toBe(0);
      expect(result.interest3YearsMRTA).toBe(0);
      expect(result.monthlyPaymentFirst3YearsAvg).toBe(16000);
    }).not.toThrow();
  });

  it('calculates prepayment savings correctly in target_monthly mode', () => {
    const offerWithPrepayment: CustomBankOffer = {
      ...baseOffer,
      includeMRTA: false,
      prepayment: {
        mode: 'target_monthly',
        enabled: true,
        targetMonthlyYear1: 20000, // สัญญา 16,000 ตั้งใจผ่อน 20,000 -> โปะเดือนละ 4,000
        targetMonthlyYear2: 20000,
        targetMonthlyYear3: 20000,
        targetMonthlyYear4Plus: 20000
      }
    };

    const result = calculateAdvancedCustomOffer(offerWithPrepayment, 4000000, 3575000, 30, 30, mockFeeConfig);

    // ตรวจสอบยอดโปะงวดแรก = 20,000 - 16,000 = 4,000
    expect(result.monthlySchedule[0].prepayment).toBe(4000);
    expect(result.monthlySchedule[0].totalPayment).toBe(20000);
    expect(result.prepaymentSavingsInterest).toBeGreaterThan(0);
    expect(result.prepaymentYearsSaved).toBeGreaterThan(0);
  });

  it('calculates upfront cash and net cost correctly when MRTA is paid in cash', () => {
    const offerCashMRTA: CustomBankOffer = {
      ...baseOffer,
      includeMRTA: true,
      mrtaLoan: {
        totalPremium: 143000,
        financeWithLoan: false, // จ่ายสดวันโอน
        loanAmount: 0,
        termYears: 10,
        rateYear1: 2.29,
        rateYear2: 2.29,
        rateYear3: 2.29,
        rateYear4PlusType: 'floating',
        rateYear4PlusFixed: 5.5,
        rateYear4PlusBase: 'MRR',
        rateYear4PlusSpread: -1.0
      }
    };

    const result = calculateAdvancedCustomOffer(offerCashMRTA, 4000000, 3575000, 30, 30, mockFeeConfig);
    // เมื่อจ่ายสด: ยอดกู้ MRTA = 0
    expect(result.totalPrincipalMRTA).toBe(0);
    expect(result.mrtaPremiumTotal).toBe(143000);
    // เงินสดวันโอนต้องรวมเบี้ย MRTA 143,000 เข้าไปด้วย
    expect(result.upfrontCashRequired).toBeGreaterThanOrEqual(143000);
    // ผ่อนรายเดือนคิดเฉพาะบ้าน = 16,000
    expect(result.monthlyPaymentFirst3YearsAvg).toBe(16000);
  });

  it('deducts perks and cashback from true net cost', () => {
    const offerWithPerks: CustomBankOffer = {
      ...baseOffer,
      includeMRTA: false,
      perks: [
        { id: 'p1', name: 'Cashback โอนบ้าน', value: 10000, type: 'cashback' },
        { id: 'p2', name: 'บัตรกำนัล', value: 5000, type: 'voucher' }
      ]
    };

    const result = calculateAdvancedCustomOffer(offerWithPerks, 4000000, 3575000, 30, 30, mockFeeConfig);
    expect(result.totalPerksValue).toBe(15000);
  });
});

describe('Standard Preset Bank Loan Calculation', () => {
  it('calculates standard loan program amortization correctly', () => {
    const bank = DEFAULT_BANKS[0];
    const program = bank.programs[0];

    const result = calculateLoanProgram(
      program,
      bank,
      4000000,
      3575000,
      30,
      30,
      { includeMRTA: false },
      mockFeeConfig
    );

    expect(result.monthlyPaymentFirst3YearsAvg).toBeGreaterThan(0);
    expect(result.totalInterestPaid).toBeGreaterThan(0);
    expect(result.grandTotalCost).toBeGreaterThan(3575000);
    expect(result.schedule.length).toBe(360);
  });
});

describe('Feature 1: Year 4+ Growth Rate in Prepayment', () => {
  const baseOffer: CustomBankOffer = {
    id: 'growth-test',
    bankName: 'TestBank Growth',
    color: '#000',
    rateYear1: 3.0, rateYear2: 3.0, rateYear3: 3.0,
    rateYear4PlusType: 'fixed', rateYear4PlusFixed: 5.0,
    rateYear4PlusBase: 'MRR', rateYear4PlusSpread: 0,
    mrtaDiscountRate: 0,
    isAdvanced: true,
    includeMRTA: false,
    homeLoan: {
      loanAmount: 2000000, termYears: 30,
      rateYear1: 3.0, rateYear2: 3.0, rateYear3: 3.0,
      rateYear4PlusType: 'fixed', rateYear4PlusFixed: 5.0,
      rateYear4PlusBase: 'MRR', rateYear4PlusSpread: 0
    },
    prepayment: {
      enabled: true,
      mode: 'target_monthly',
      targetMonthlyYear1: 12000,
      targetMonthlyYear2: 13000,
      targetMonthlyYear3: 14000,
      targetMonthlyYear4Plus: 15000,
      targetMonthlyYear4PlusGrowth: 500,
      targetMonthlyYear4PlusGrowthType: 'fixed',
      allocation: 'smart_auto'
    }
  };

  it('target_monthly with fixed growth pays off earlier than no-growth', () => {
    const withGrowth = calculateAdvancedCustomOffer(baseOffer, 2500000, 2000000, 30, 30, mockFeeConfig);
    const noGrowth = calculateAdvancedCustomOffer({
      ...baseOffer,
      prepayment: { ...baseOffer.prepayment!, targetMonthlyYear4PlusGrowth: 0 }
    }, 2500000, 2000000, 30, 30, mockFeeConfig);

    // ผ่อนโปะมากขึ้นทุกปี ควรผ่อนหมดเร็วกว่า
    expect(withGrowth.totalMonthsToPayoff).toBeLessThan(noGrowth.totalMonthsToPayoff);
    // และประหยัดดอกเบี้ยได้มากกว่า
    expect(withGrowth.totalInterestLifetime).toBeLessThan(noGrowth.totalInterestLifetime);
  });

  it('stepped mode with percent growth escalates extraPool correctly', () => {
    const steppedOffer: CustomBankOffer = {
      ...baseOffer,
      prepayment: {
        enabled: true,
        mode: 'stepped',
        steppedYear1: 1000,
        steppedYear2: 2000,
        steppedYear3: 3000,
        steppedYear4Plus: 4000,
        steppedYear4PlusGrowth: 10,
        steppedYear4PlusGrowthType: 'percent',
        allocation: 'smart_auto'
      }
    };
    const withGrowth = calculateAdvancedCustomOffer(steppedOffer, 2500000, 2000000, 30, 30, mockFeeConfig);
    const noGrowth = calculateAdvancedCustomOffer({
      ...steppedOffer,
      prepayment: { ...steppedOffer.prepayment!, steppedYear4PlusGrowth: 0 }
    }, 2500000, 2000000, 30, 30, mockFeeConfig);

    expect(withGrowth.totalMonthsToPayoff).toBeLessThan(noGrowth.totalMonthsToPayoff);
  });
});

describe('Feature 2: Loan Summary Fields (totalHomePaid, homePayoffYear, etc.)', () => {
  const summaryOffer: CustomBankOffer = {
    id: 'summary-test',
    bankName: 'TestBank Summary',
    color: '#000',
    rateYear1: 2.75, rateYear2: 2.75, rateYear3: 2.75,
    rateYear4PlusType: 'fixed', rateYear4PlusFixed: 4.5,
    rateYear4PlusBase: 'MRR', rateYear4PlusSpread: 0,
    mrtaDiscountRate: 0,
    isAdvanced: true,
    includeMRTA: false,
    homeLoan: {
      loanAmount: 3000000, termYears: 30,
      rateYear1: 2.75, rateYear2: 2.75, rateYear3: 2.75,
      rateYear4PlusType: 'fixed', rateYear4PlusFixed: 4.5,
      rateYear4PlusBase: 'MRR', rateYear4PlusSpread: 0
    }
  };

  it('returns totalHomePaid = totalPrincipalHome + totalHomeInterestPaid', () => {
    const result = calculateAdvancedCustomOffer(summaryOffer, 3600000, 3000000, 30, 30, mockFeeConfig);
    expect(result.totalHomePaid).toBe(result.totalPrincipalHome + result.totalHomeInterestPaid);
    expect(result.totalHomeInterestPaid).toBeGreaterThan(0);
    expect(result.homePayoffYear).toBeGreaterThan(0);
    expect(result.homePayoffYear).toBeLessThanOrEqual(30);
  });

  it('homePayoffYear is less than termYears when prepayment is active', () => {
    const offerWithPrepay: CustomBankOffer = {
      ...summaryOffer,
      prepayment: {
        enabled: true,
        mode: 'fixed_extra',
        fixedExtraMonthly: 5000,
        allocation: 'smart_auto'
      }
    };
    const withPrepay = calculateAdvancedCustomOffer(offerWithPrepay, 3600000, 3000000, 30, 30, mockFeeConfig);
    const baseline = calculateAdvancedCustomOffer(summaryOffer, 3600000, 3000000, 30, 30, mockFeeConfig);

    // โปะเพิ่มต้องผ่อนหมดเร็วกว่า
    expect(withPrepay.homePayoffYear).toBeLessThan(baseline.homePayoffYear);
  });
});
