import React, { useState, useEffect } from 'react';
import { 
  X, 
  Home, 
  ShieldCheck, 
  Percent, 
  TrendingUp, 
  Gift, 
  AlertCircle, 
  Check, 
  Plus, 
  Trash2
} from 'lucide-react';
import { CustomBankOffer, SubLoanAccount, PrepaymentPlan, CustomOfferFees, CustomOfferPerk } from '../types/loan';

interface AdvancedOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: CustomBankOffer;
  onSave: (savedOffer: CustomBankOffer) => void;
  defaultPropertyPrice: number;
  defaultLoanAmount: number;
  defaultTermYears: number;
}

export const AdvancedOfferModal: React.FC<AdvancedOfferModalProps> = ({
  isOpen,
  onClose,
  offer,
  onSave,
  defaultPropertyPrice,
  defaultLoanAmount,
  defaultTermYears
}) => {
  const [activeTab, setActiveTab] = useState<'loans' | 'rates' | 'prepay' | 'fees'>('loans');

  // Form state
  const [bankName, setBankName] = useState<string>('');
  const [color, setColor] = useState<string>('#6366f1');
  const [propertyPrice, setPropertyPrice] = useState<number>(defaultPropertyPrice);

  // Sub-account 1: Home Loan
  const [homeLoan, setHomeLoan] = useState<SubLoanAccount>({
    loanAmount: defaultLoanAmount,
    termYears: defaultTermYears,
    rateYear1: 2.99,
    rateYear2: 3.50,
    rateYear3: 4.25,
    rateYear4PlusType: 'floating',
    rateYear4PlusFixed: 5.50,
    rateYear4PlusBase: 'MRR',
    rateYear4PlusSpread: -1.25,
    bankInstallmentYear1: undefined,
    bankInstallmentYear2: undefined,
    bankInstallmentYear3: undefined,
    bankInstallmentYear4Plus: undefined
  });

  // Sub-account 2: MRTA Loan
  const [hasMRTA, setHasMRTA] = useState<boolean>(true);
  const [mrtaTotalPremium, setMrtaTotalPremium] = useState<number>(120000);
  const [mrtaFinanceWithLoan, setMrtaFinanceWithLoan] = useState<boolean>(true);
  const [mrtaLoan, setMrtaLoan] = useState<SubLoanAccount>({
    loanAmount: 120000,
    termYears: 20,
    rateYear1: 3.50,
    rateYear2: 4.00,
    rateYear3: 4.50,
    rateYear4PlusType: 'floating',
    rateYear4PlusFixed: 6.00,
    rateYear4PlusBase: 'MRR',
    rateYear4PlusSpread: -1.00,
    bankInstallmentYear1: undefined,
    bankInstallmentYear2: undefined,
    bankInstallmentYear3: undefined,
    bankInstallmentYear4Plus: undefined
  });

  // Prepayment
  const [prepayment, setPrepayment] = useState<PrepaymentPlan>({
    mode: 'target_monthly',
    targetMonthlyYear1: 16000,
    targetMonthlyYear2: 18000,
    targetMonthlyYear3: 20000,
    targetMonthlyYear4Plus: 22000,
    fixedExtraMonthly: 3000,
    steppedYear1: 2000,
    steppedYear2: 4000,
    steppedYear3: 6000,
    steppedYear4Plus: 8000,
    annualBonusExtra: 0,
    allocation: 'smart_auto',
    manualHomeSplitPercent: 70
  });

  // Fees
  const [fees, setFees] = useState<CustomOfferFees>({
    mortgageFee: { payer: 'bank', customAmount: undefined },
    transferFee: { payer: 'borrower', customAmount: undefined },
    appraisalFee: { payer: 'bank', customAmount: undefined },
    stampDuty: { payer: 'borrower', customAmount: undefined },
    fireInsurance: { payer: 'borrower', customAmount: undefined },
    otherFees: { payer: 'borrower', customAmount: undefined, name: '' }
  });

  // Perks
  const [perks, setPerks] = useState<CustomOfferPerk[]>([
    { id: '1', name: 'เงินคืนเข้าบัญชี (Cashback)', value: 10000, type: 'cashback' }
  ]);
  const [newPerkName, setNewPerkName] = useState<string>('');
  const [newPerkValue, setNewPerkValue] = useState<number>(5000);
  const [newPerkType, setNewPerkType] = useState<CustomOfferPerk['type']>('cashback');

  // Terms & Lock-in
  const [lockInYears, setLockInYears] = useState<3 | 5>(3);
  const [notes, setNotes] = useState<string>('');

  // Sync with prop offer
  useEffect(() => {
    if (offer) {
      setBankName(offer.bankName || '');
      setColor(offer.color || '#6366f1');
      setPropertyPrice(offer.propertyPrice || defaultPropertyPrice);

      if (offer.homeLoan) {
        setHomeLoan({ ...offer.homeLoan });
      } else {
        setHomeLoan({
          loanAmount: defaultLoanAmount,
          termYears: defaultTermYears,
          rateYear1: offer.rateYear1 || 2.99,
          rateYear2: offer.rateYear2 || 3.50,
          rateYear3: offer.rateYear3 || 4.25,
          rateYear4PlusType: offer.rateYear4PlusType || 'floating',
          rateYear4PlusFixed: offer.rateYear4PlusFixed || 5.50,
          rateYear4PlusBase: offer.rateYear4PlusBase || 'MRR',
          rateYear4PlusSpread: offer.rateYear4PlusSpread || -1.25,
          bankInstallmentYear1: undefined,
          bankInstallmentYear2: undefined,
          bankInstallmentYear3: undefined,
          bankInstallmentYear4Plus: undefined
        });
      }

      if (offer.mrtaLoan) {
        setHasMRTA(true);
        setMrtaTotalPremium(offer.mrtaLoan.totalPremium || 120000);
        setMrtaFinanceWithLoan(offer.mrtaLoan.financeWithLoan ?? true);
        setMrtaLoan({ ...offer.mrtaLoan });
      }

      if (offer.prepayment) {
        setPrepayment({ ...offer.prepayment });
      }

      if (offer.fees) {
        setFees({ ...offer.fees });
      }

      if (offer.perks) {
        setPerks([...offer.perks]);
      }

      if (offer.lockInYears) {
        setLockInYears(offer.lockInYears);
      }

      if (offer.notes) {
        setNotes(offer.notes);
      }
    }
  }, [offer, defaultPropertyPrice, defaultLoanAmount, defaultTermYears]);

  if (!isOpen) return null;

  const handleAddPerk = () => {
    if (!newPerkName.trim()) return;
    setPerks([
      ...perks,
      {
        id: 'perk_' + Date.now(),
        name: newPerkName.trim(),
        value: newPerkValue,
        type: newPerkType
      }
    ]);
    setNewPerkName('');
    setNewPerkValue(5000);
  };

  const handleRemovePerk = (id: string) => {
    setPerks(perks.filter(p => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim()) {
      alert('กรุณาระบุชื่อธนาคารหรือชื่อข้อเสนอ');
      return;
    }

    const savedOffer: CustomBankOffer = {
      id: offer.id || 'custom_' + Date.now(),
      bankName: bankName.trim(),
      color,
      rateYear1: homeLoan.rateYear1,
      rateYear2: homeLoan.rateYear2,
      rateYear3: homeLoan.rateYear3,
      rateYear4PlusType: homeLoan.rateYear4PlusType,
      rateYear4PlusFixed: homeLoan.rateYear4PlusFixed,
      rateYear4PlusBase: homeLoan.rateYear4PlusBase,
      rateYear4PlusSpread: homeLoan.rateYear4PlusSpread,
      mrtaDiscountRate: 0,
      isAdvanced: true,
      propertyPrice,
      homeLoan,
      mrtaLoan: hasMRTA ? {
        ...mrtaLoan,
        totalPremium: mrtaTotalPremium,
        financeWithLoan: mrtaFinanceWithLoan,
        loanAmount: mrtaFinanceWithLoan ? mrtaLoan.loanAmount : 0
      } : undefined,
      prepayment,
      fees,
      perks,
      lockInYears,
      notes
    };

    onSave(savedOffer);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-9 rounded-full shadow-sm"
              style={{ backgroundColor: color }}
            />
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span>{offer.id ? '✏️ ปรับแต่งข้อเสนอสินเชื่อ' : '➕ เพิ่มข้อเสนอสินเชื่อใหม่'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Advanced Mode
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                แยกบัญชีบ้าน-MRTA, ค่างวดธนาคารแจ้งจริง, แผนโปะ Target Monthly และค่าธรรมเนียม
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-6 gap-2 overflow-x-auto text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('loans')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'loans'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>1. วงเงิน & สัญญา</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rates')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'rates'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>2. ดอกเบี้ย & ค่างวดสัญญา</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prepay')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'prepay'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>3. แผนโปะเพิ่ม</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fees')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'fees'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>4. ค่าธรรมเนียม & สิทธิประโยชน์</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: วงเงินและระยะเวลาผ่อน */}
          {activeTab === 'loans' && (
            <div className="space-y-6">
              {/* Header Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อธนาคาร / ข้อเสนอ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="เช่น ธอส. สวัสดิการ, KBank ดอกเบี้ยพิเศษ"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    สีประจำการ์ด
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-800"
                    />
                    <span className="text-xs text-slate-500 font-mono">{color}</span>
                  </div>
                </div>
              </div>

              {/* Sub-account 1: สินเชื่อบ้าน */}
              <div className="p-5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 space-y-4">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold text-base">
                  <Home className="w-5 h-5" />
                  <span>1️⃣ บัญชีวงเงินกู้บ้าน (Home Mortgage)</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      วงเงินกู้บ้าน (บาท)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={homeLoan.loanAmount}
                      onChange={e => setHomeLoan({ ...homeLoan, loanAmount: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                      ระยะเวลาผ่อนสัญญาบ้าน (ปี)
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={40}
                      value={homeLoan.termYears}
                      onChange={e => setHomeLoan({ ...homeLoan, termYears: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Sub-account 2: สินเชื่อเบี้ยประกัน MRTA */}
              <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-base">
                    <ShieldCheck className="w-5 h-5" />
                    <span>2️⃣ บัญชีวงเงินประกันชีวิตคุ้มครอง (MRTA)</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={hasMRTA}
                      onChange={e => setHasMRTA(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                    />
                    <span>มีประกัน MRTA</span>
                  </label>
                </div>

                {hasMRTA && (
                  <div className="space-y-4 pt-2 border-t border-emerald-100/60 dark:border-emerald-900/40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                          ยอดเบี้ยประกัน MRTA เต็มจำนวน (บาท)
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={mrtaTotalPremium}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setMrtaTotalPremium(val);
                            if (mrtaFinanceWithLoan) {
                              setMrtaLoan({ ...mrtaLoan, loanAmount: val });
                            }
                          }}
                          className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                          รูปแบบการชำระเบี้ย
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setMrtaFinanceWithLoan(true);
                              setMrtaLoan({ ...mrtaLoan, loanAmount: mrtaTotalPremium });
                            }}
                            className={`flex-1 py-2 px-3 text-xs rounded-lg font-semibold transition border ${
                              mrtaFinanceWithLoan
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            กู้เพิ่มรวมกับบ้าน
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMrtaFinanceWithLoan(false);
                              setMrtaLoan({ ...mrtaLoan, loanAmount: 0 });
                            }}
                            className={`flex-1 py-2 px-3 text-xs rounded-lg font-semibold transition border ${
                              !mrtaFinanceWithLoan
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            จ่ายสดวันโอน
                          </button>
                        </div>
                      </div>
                    </div>

                    {mrtaFinanceWithLoan && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                            วงเงินกู้เบี้ย MRTA (บาท)
                          </label>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={mrtaLoan.loanAmount}
                            onChange={e => setMrtaLoan({ ...mrtaLoan, loanAmount: Number(e.target.value) })}
                            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                            ระยะเวลาผ่อน MRTA (ปี - อาจสั้นกว่าบ้าน)
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={40}
                            value={mrtaLoan.termYears}
                            onChange={e => setMrtaLoan({ ...mrtaLoan, termYears: Number(e.target.value) })}
                            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ดอกเบี้ยและค่างวดสัญญา */}
          {activeTab === 'rates' && (
            <div className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>ยอดผ่อนที่ธนาคารแจ้งจริง (ทางเลือก):</strong> หากกรอก ยอดผ่อนต่อเดือนจะอิงตามที่ระบุในใบเสนอราคา โดยส่วนที่เกินดอกเบี้ยจะนำไปตัดเงินต้นจริง หากเว้นว่างไว้ ระบบจะคำนวณค่างวดด้วยสูตร PMT มาตรฐาน
                </div>
              </div>

              {/* Home Loan Rates */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  อัตราดอกเบี้ยและยอดผ่อน: วงเงินกู้บ้าน
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">ปีที่ 1</span>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] text-slate-500 block">ดอกเบี้ย (%/ปี)</label>
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={homeLoan.rateYear1}
                          onChange={e => setHomeLoan({ ...homeLoan, rateYear1: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 text-sm font-semibold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block">ยอดผ่อนที่แจ้ง (บ./ด.)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="Auto PMT"
                          value={homeLoan.bankInstallmentYear1 || ''}
                          onChange={e => setHomeLoan({ ...homeLoan, bankInstallmentYear1: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full px-2.5 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">ปีที่ 2</span>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] text-slate-500 block">ดอกเบี้ย (%/ปี)</label>
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={homeLoan.rateYear2}
                          onChange={e => setHomeLoan({ ...homeLoan, rateYear2: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 text-sm font-semibold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block">ยอดผ่อนที่แจ้ง (บ./ด.)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="Auto PMT"
                          value={homeLoan.bankInstallmentYear2 || ''}
                          onChange={e => setHomeLoan({ ...homeLoan, bankInstallmentYear2: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full px-2.5 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">ปีที่ 3</span>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] text-slate-500 block">ดอกเบี้ย (%/ปี)</label>
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={homeLoan.rateYear3}
                          onChange={e => setHomeLoan({ ...homeLoan, rateYear3: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 text-sm font-semibold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block">ยอดผ่อนที่แจ้ง (บ./ด.)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="Auto PMT"
                          value={homeLoan.bankInstallmentYear3 || ''}
                          onChange={e => setHomeLoan({ ...homeLoan, bankInstallmentYear3: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full px-2.5 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">ปีที่ 4 เป็นต้นไป</span>
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setHomeLoan({ ...homeLoan, rateYear4PlusType: 'fixed' })}
                          className={`flex-1 py-1 text-[11px] rounded font-semibold border ${
                            homeLoan.rateYear4PlusType === 'fixed'
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          คงที่ %
                        </button>
                        <button
                          type="button"
                          onClick={() => setHomeLoan({ ...homeLoan, rateYear4PlusType: 'floating' })}
                          className={`flex-1 py-1 text-[11px] rounded font-semibold border ${
                            homeLoan.rateYear4PlusType === 'floating'
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          ลอยตัว
                        </button>
                      </div>

                      {homeLoan.rateYear4PlusType === 'fixed' ? (
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={homeLoan.rateYear4PlusFixed}
                          onChange={e => setHomeLoan({ ...homeLoan, rateYear4PlusFixed: Number(e.target.value) })}
                          className="w-full px-2.5 py-1.5 text-sm font-semibold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                        />
                      ) : (
                        <div className="flex gap-1 items-center">
                          <select
                            value={homeLoan.rateYear4PlusBase}
                            onChange={e => setHomeLoan({ ...homeLoan, rateYear4PlusBase: e.target.value as 'MRR' | 'MLR' })}
                            className="w-16 px-1.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-bold"
                          >
                            <option value="MRR">MRR</option>
                            <option value="MLR">MLR</option>
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={homeLoan.rateYear4PlusSpread}
                            onChange={e => setHomeLoan({ ...homeLoan, rateYear4PlusSpread: Number(e.target.value) })}
                            className="flex-1 px-1.5 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                          />
                        </div>
                      )}

                      <div>
                        <label className="text-[11px] text-slate-500 block">ยอดผ่อนที่แจ้ง (บ./ด.)</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder="Auto PMT"
                          value={homeLoan.bankInstallmentYear4Plus || ''}
                          onChange={e => setHomeLoan({ ...homeLoan, bankInstallmentYear4Plus: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full px-2.5 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MRTA Loan Rates (if financed) */}
              {hasMRTA && mrtaFinanceWithLoan && (
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    อัตราดอกเบี้ยและยอดผ่อน: วงเงินกู้ MRTA
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">ปีที่ 1</span>
                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] text-slate-500 block">ดอกเบี้ย MRTA (%/ปี)</label>
                          <input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={mrtaLoan.rateYear1}
                            onChange={e => setMrtaLoan({ ...mrtaLoan, rateYear1: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 text-sm font-semibold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">ยอดผ่อน MRTA (บ./ด.)</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Auto PMT"
                            value={mrtaLoan.bankInstallmentYear1 || ''}
                            onChange={e => setMrtaLoan({ ...mrtaLoan, bankInstallmentYear1: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full px-2.5 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">ปีที่ 2</span>
                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] text-slate-500 block">ดอกเบี้ย MRTA (%/ปี)</label>
                          <input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={mrtaLoan.rateYear2}
                            onChange={e => setMrtaLoan({ ...mrtaLoan, rateYear2: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 text-sm font-semibold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">ยอดผ่อน MRTA (บ./ด.)</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Auto PMT"
                            value={mrtaLoan.bankInstallmentYear2 || ''}
                            onChange={e => setMrtaLoan({ ...mrtaLoan, bankInstallmentYear2: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full px-2.5 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">ปีที่ 3</span>
                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] text-slate-500 block">ดอกเบี้ย MRTA (%/ปี)</label>
                          <input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={mrtaLoan.rateYear3}
                            onChange={e => setMrtaLoan({ ...mrtaLoan, rateYear3: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 text-sm font-semibold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-500 block">ยอดผ่อน MRTA (บ./ด.)</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Auto PMT"
                            value={mrtaLoan.bankInstallmentYear3 || ''}
                            onChange={e => setMrtaLoan({ ...mrtaLoan, bankInstallmentYear3: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full px-2.5 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">ปีที่ 4 เป็นต้นไป</span>
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setMrtaLoan({ ...mrtaLoan, rateYear4PlusType: 'fixed' })}
                            className={`flex-1 py-1 text-[11px] rounded font-semibold border ${
                              mrtaLoan.rateYear4PlusType === 'fixed'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            คงที่
                          </button>
                          <button
                            type="button"
                            onClick={() => setMrtaLoan({ ...mrtaLoan, rateYear4PlusType: 'floating' })}
                            className={`flex-1 py-1 text-[11px] rounded font-semibold border ${
                              mrtaLoan.rateYear4PlusType === 'floating'
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            ลอยตัว
                          </button>
                        </div>

                        {mrtaLoan.rateYear4PlusType === 'fixed' ? (
                          <input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            value={mrtaLoan.rateYear4PlusFixed}
                            onChange={e => setMrtaLoan({ ...mrtaLoan, rateYear4PlusFixed: Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 text-sm font-semibold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                          />
                        ) : (
                          <div className="flex gap-1 items-center">
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">MRR</span>
                            <input
                              type="number"
                              step="0.01"
                              inputMode="decimal"
                              value={mrtaLoan.rateYear4PlusSpread}
                              onChange={e => setMrtaLoan({ ...mrtaLoan, rateYear4PlusSpread: Number(e.target.value) })}
                              className="flex-1 px-1.5 py-1.5 text-xs font-semibold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                            />
                          </div>
                        )}

                        <div>
                          <label className="text-[11px] text-slate-500 block">ยอดผ่อน MRTA (บ./ด.)</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="Auto PMT"
                            value={mrtaLoan.bankInstallmentYear4Plus || ''}
                            onChange={e => setMrtaLoan({ ...mrtaLoan, bankInstallmentYear4Plus: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full px-2.5 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: แผนการโปะเพิ่ม */}
          {activeTab === 'prepay' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  เลือกรูปแบบแผนโปะเงินกู้
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPrepayment({ ...prepayment, mode: 'target_monthly' })}
                    className={`p-4 rounded-xl text-left border transition ${
                      prepayment.mode === 'target_monthly'
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                      <span>🎯 ตั้งเป้าผ่อนรวมต่อเดือน</span>
                      {prepayment.mode === 'target_monthly' && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      ระบุยอดรวมที่ตั้งใจจ่ายต่อเดือนในแต่ละปี ส่วนเกินค่างวดธนาคารจะโปะอัตโนมัติ
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrepayment({ ...prepayment, mode: 'stepped' })}
                    className={`p-4 rounded-xl text-left border transition ${
                      prepayment.mode === 'stepped'
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                      <span>🪜 โปะเพิ่มขั้นบันได</span>
                      {prepayment.mode === 'stepped' && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      ระบุยอดเงินโปะพิเศษรายปี เช่น ปี 1-3 โปะ 2,000 ปี 4+ โปะ 5,000
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrepayment({ ...prepayment, mode: 'fixed_extra' })}
                    className={`p-4 rounded-xl text-left border transition ${
                      prepayment.mode === 'fixed_extra'
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
                      <span>➕ โปะเพิ่มคงที่</span>
                      {prepayment.mode === 'fixed_extra' && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      ระบุยอดโปะเพิ่มเท่ากันทุกเดือนตลอดสัญญา
                    </p>
                  </button>
                </div>
              </div>

              {/* Mode Detail Inputs */}
              {prepayment.mode === 'target_monthly' && (
                <div className="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                    กำหนดงบผ่อนรวมต่อเดือนในแต่ละปี (สะท้อนรายได้ที่เพิ่มขึ้น)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">ปีที่ 1 (บ./ด.)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={prepayment.targetMonthlyYear1 || ''}
                        onChange={e => setPrepayment({ ...prepayment, targetMonthlyYear1: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">ปีที่ 2 (บ./ด.)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={prepayment.targetMonthlyYear2 || ''}
                        onChange={e => setPrepayment({ ...prepayment, targetMonthlyYear2: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">ปีที่ 3 (บ./ด.)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={prepayment.targetMonthlyYear3 || ''}
                        onChange={e => setPrepayment({ ...prepayment, targetMonthlyYear3: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">ปีที่ 4+ (บ./ด.)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={prepayment.targetMonthlyYear4Plus || ''}
                        onChange={e => setPrepayment({ ...prepayment, targetMonthlyYear4Plus: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {prepayment.mode === 'stepped' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                    กำหนดยอดโปะส่วนเพิ่มในแต่ละปี (บวกเพิ่มจากค่างวดปกติ)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">ปีที่ 1 (บ./ด.)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={prepayment.steppedYear1 || ''}
                        onChange={e => setPrepayment({ ...prepayment, steppedYear1: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">ปีที่ 2 (บ./ด.)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={prepayment.steppedYear2 || ''}
                        onChange={e => setPrepayment({ ...prepayment, steppedYear2: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">ปีที่ 3 (บ./ด.)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={prepayment.steppedYear3 || ''}
                        onChange={e => setPrepayment({ ...prepayment, steppedYear3: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">ปีที่ 4+ (บ./ด.)</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={prepayment.steppedYear4Plus || ''}
                        onChange={e => setPrepayment({ ...prepayment, steppedYear4Plus: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {prepayment.mode === 'fixed_extra' && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    ยอดโปะเพิ่มต่อเดือน (บาท)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={prepayment.fixedExtraMonthly || ''}
                    onChange={e => setPrepayment({ ...prepayment, fixedExtraMonthly: Number(e.target.value) })}
                    className="w-full max-w-xs px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                </div>
              )}

              {/* Annual Bonus Lump-Sum Extra */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                    🎁 โปะก้อนใหญ่รายปี (เช่น โบนัสออกทุกสิ้นปี)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ระบบจะนำเงินยอดนี้ไปตัดเงินต้นในเดือนที่ 12, 24, 36... ทุกสิ้นปี
                  </p>
                </div>
                <div className="w-full sm:w-48">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0 บาท"
                    value={prepayment.annualBonusExtra || ''}
                    onChange={e => setPrepayment({ ...prepayment, annualBonusExtra: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Prepayment Allocation Strategy */}
              {hasMRTA && mrtaFinanceWithLoan && (
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                    กลยุทธ์การจัดสรรเงินโปะระหว่าง 2 บัญชี (บ้าน vs MRTA)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      prepayment.allocation === 'smart_auto'
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="allocation"
                        checked={prepayment.allocation === 'smart_auto'}
                        onChange={() => setPrepayment({ ...prepayment, allocation: 'smart_auto' })}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">ระบบแนะนำ (Smart Auto)</span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">ตัดบัญชีที่คิดดอกเบี้ยแพงกว่าก่อนอัตโนมัติ</span>
                      </div>
                    </label>

                    <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      prepayment.allocation === 'proportional'
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="allocation"
                        checked={prepayment.allocation === 'proportional'}
                        onChange={() => setPrepayment({ ...prepayment, allocation: 'proportional' })}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">สัดส่วนตามยอดหนี้</span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">เฉลี่ยเงินโปะตามยอดเงินต้นคงเหลือ</span>
                      </div>
                    </label>

                    <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      prepayment.allocation === 'manual_split'
                        ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}>
                      <input
                        type="radio"
                        name="allocation"
                        checked={prepayment.allocation === 'manual_split'}
                        onChange={() => setPrepayment({ ...prepayment, allocation: 'manual_split' })}
                        className="mt-0.5 text-indigo-600"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">กำหนดเองแยกช่อง</span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">ตัดเข้าบ้าน {prepayment.manualHomeSplitPercent}% / MRTA {100 - (prepayment.manualHomeSplitPercent || 50)}%</span>
                      </div>
                    </label>
                  </div>

                  {prepayment.allocation === 'manual_split' && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex items-center gap-4">
                      <span className="text-xs text-slate-600 dark:text-slate-300">สัดส่วนตัดเข้าบ้าน:</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={prepayment.manualHomeSplitPercent || 50}
                        onChange={e => setPrepayment({ ...prepayment, manualHomeSplitPercent: Number(e.target.value) })}
                        className="flex-1 accent-indigo-600"
                      />
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 w-16 text-right">
                        {prepayment.manualHomeSplitPercent}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ค่าธรรมเนียม & สิทธิประโยชน์ */}
          {activeTab === 'fees' && (
            <div className="space-y-6">
              {/* Fee Responsibility Matrix */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  ตารางค่าธรรมเนียม: ผู้กู้จ่ายเอง vs ธนาคารออกให้ฟรี
                </h3>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                  <table className="w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                      <tr>
                        <th className="py-2.5 px-3 text-left font-semibold">รายการค่าธรรมเนียม</th>
                        <th className="py-2.5 px-3 text-center font-semibold">ผู้รับผิดชอบค่าใช้จ่าย</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {/* Mortgage Fee */}
                      <tr>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-medium">
                          ค่าจดจำนอง (1% หรือ 0.01%)
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => setFees({ ...fees, mortgageFee: { ...fees.mortgageFee, payer: 'borrower' } })}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                                fees.mortgageFee.payer === 'borrower' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              ผู้กู้จ่าย
                            </button>
                            <button
                              type="button"
                              onClick={() => setFees({ ...fees, mortgageFee: { ...fees.mortgageFee, payer: 'bank' } })}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                                fees.mortgageFee.payer === 'bank' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              🎁 แบงก์ฟรี
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Transfer Fee */}
                      <tr>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-medium">
                          ค่าธรรมเนียมการโอน (2% หรือ 0.01%)
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => setFees({ ...fees, transferFee: { ...fees.transferFee, payer: 'borrower' } })}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                                fees.transferFee.payer === 'borrower' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              ผู้กู้จ่าย
                            </button>
                            <button
                              type="button"
                              onClick={() => setFees({ ...fees, transferFee: { ...fees.transferFee, payer: 'seller' } })}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                                fees.transferFee.payer === 'seller' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              🎁 ผู้ขาย/โครงการออก
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Appraisal Fee */}
                      <tr>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-medium">
                          ค่าประเมินราคาหลักทรัพย์ (~3,000 บ.)
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => setFees({ ...fees, appraisalFee: { ...fees.appraisalFee, payer: 'borrower' } })}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                                fees.appraisalFee.payer === 'borrower' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              ผู้กู้จ่าย
                            </button>
                            <button
                              type="button"
                              onClick={() => setFees({ ...fees, appraisalFee: { ...fees.appraisalFee, payer: 'bank' } })}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                                fees.appraisalFee.payer === 'bank' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              🎁 แบงก์ฟรี
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Stamp Duty */}
                      <tr>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-medium">
                          ค่าอากรแสตมป์สัญญาเงินกู้ (0.05%)
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
                            <button
                              type="button"
                              onClick={() => setFees({ ...fees, stampDuty: { ...fees.stampDuty, payer: 'borrower' } })}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                                fees.stampDuty.payer === 'borrower' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              ผู้กู้จ่าย
                            </button>
                            <button
                              type="button"
                              onClick={() => setFees({ ...fees, stampDuty: { ...fees.stampDuty, payer: 'bank' } })}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                                fees.stampDuty.payer === 'bank' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
                              }`}
                            >
                              🎁 แบงก์ฟรี
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Special Perks & Cashback */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  ของแถม & สิทธิประโยชน์ที่ตีเป็นมูลค่าเงิน (Cashback, สลาก, Voucher)
                </h3>

                <div className="space-y-2">
                  {perks.map(perk => (
                    <div 
                      key={perk.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">{perk.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{perk.value.toLocaleString()} บ.
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePerk(perk.id)}
                          className="p-1 text-slate-400 hover:text-red-500 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Perk Form */}
                  <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row gap-2 items-center">
                    <input
                      type="text"
                      placeholder="เช่น สลากออมสิน, บัตร HomePro"
                      value={newPerkName}
                      onChange={e => setNewPerkName(e.target.value)}
                      className="flex-1 w-full px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <input
                      type="number"
                      placeholder="มูลค่า (บาท)"
                      value={newPerkValue || ''}
                      onChange={e => setNewPerkValue(Number(e.target.value))}
                      className="w-full sm:w-28 px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={handleAddPerk}
                      className="w-full sm:w-auto px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded hover:bg-emerald-700 transition flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      เพิ่มของแถม
                    </button>
                  </div>
                </div>
              </div>

              {/* Refinance Lock-in Condition */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  เงื่อนไขสัญญาห้ามรีไฟแนนซ์ (Refinance Lock-in)
                </h3>

                <div className="flex gap-3">
                  <label className={`flex-1 p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition ${
                    lockInYears === 3
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="lockIn"
                      checked={lockInYears === 3}
                      onChange={() => setLockInYears(3)}
                      className="text-indigo-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">สัญญามาตรฐาน 3 ปี</span>
                      <span className="text-[11px] text-slate-500 block">สามารถรีไฟแนนซ์ได้หลังครบ 36 งวดโดยไม่มีค่าปรับ</span>
                    </div>
                  </label>

                  <label className={`flex-1 p-3 rounded-xl border cursor-pointer flex items-center gap-3 transition ${
                    lockInYears === 5
                      ? 'border-amber-600 bg-amber-50/40 dark:bg-amber-950/30'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="lockIn"
                      checked={lockInYears === 5}
                      onChange={() => setLockInYears(5)}
                      className="text-amber-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">⚠️ ติดสัญญา 5 ปี</span>
                      <span className="text-[11px] text-slate-500 block">มักมาพร้อมโปรฟรีจดจำนอง ห้ามรีไฟแนนซ์ก่อน 5 ปี</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold transition"
            >
              ยกเลิก
            </button>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-indigo-500/20 transition flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกข้อเสนอนี้</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
