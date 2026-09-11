import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  RefreshCw, 
  CheckCircle2, 
  BarChart3, 
  Calendar
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  Legend
} from 'recharts';

import { DEFAULT_BANKS, DEFAULT_MRTA_COMPANIES, DEFAULT_FEE_CONFIG } from './data/masterData';
import { calculateLoanProgram, calculateAllFees } from './lib/calculator';
import { BankInfo, BotRateData, CalculationResult } from './types/loan';

export default function App() {
  const [propertyPrice, setPropertyPrice] = useState<number>(3500000);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(10);
  const [loanTermYears, setLoanTermYears] = useState<number>(30);
  const [borrowerAge, setBorrowerAge] = useState<number>(32);

  const downPaymentAmount = Math.round((propertyPrice * downPaymentPercent) / 100);
  const loanAmount = Math.max(0, propertyPrice - downPaymentAmount);

  const [banks] = useState<BankInfo[]>(DEFAULT_BANKS);
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>(['kbank', 'scb', 'ghb']);
  const [selectedPrograms, setSelectedPrograms] = useState<Record<string, string>>({
    kbank: 'kbank-p1',
    scb: 'scb-p1',
    ghb: 'ghb-p1'
  });

  const [includeMRTA, setIncludeMRTA] = useState<boolean>(true);
  const [selectedMRTAId, setSelectedMRTAId] = useState<string>('aia');
  const [isCustomMRTA, setIsCustomMRTA] = useState<boolean>(false);
  const [customMRTACompany, setCustomMRTACompany] = useState<string>('ประกันแบบกำหนดเอง');
  const [customMRTARate, setCustomMRTARate] = useState<number>(55);
  const [financeMRTAWithLoan, setFinanceMRTAWithLoan] = useState<boolean>(false);

  const [feeConfig, setFeeConfig] = useState(DEFAULT_FEE_CONFIG);
  const [isGovernmentMeasure, setIsGovernmentMeasure] = useState<boolean>(false);

  useEffect(() => {
    if (isGovernmentMeasure) {
      setFeeConfig(prev => ({
        ...prev,
        mortgageFeeRate: 0.0001,
        transferFeeRate: 0.0001
      }));
    } else {
      setFeeConfig(DEFAULT_FEE_CONFIG);
    }
  }, [isGovernmentMeasure]);

  const [botRates] = useState<Record<string, BotRateData>>({});
  const [botStatus, setBotStatus] = useState<{ loading: boolean; source: string }>({
    loading: false,
    source: 'default',
  });

  const fetchBotRates = async () => {
    setBotStatus(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/bot-rates');
      const json = await res.json();
      if (json.source === 'live' || json.source === 'cache') {
        setBotStatus({ loading: false, source: json.source });
      } else {
        setBotStatus({ loading: false, source: 'default' });
      }
    } catch {
      setBotStatus({ loading: false, source: 'default' });
    }
  };

  useEffect(() => {
    fetchBotRates();
  }, []);

  const currentMRTACompany = useMemo(() => {
    return DEFAULT_MRTA_COMPANIES.find(c => c.id === selectedMRTAId);
  }, [selectedMRTAId]);

  const calculationResults = useMemo<CalculationResult[]>(() => {
    const results: CalculationResult[] = [];

    for (const bankId of selectedBankIds) {
      const bank = banks.find(b => b.id === bankId);
      if (!bank) continue;

      const programId = selectedPrograms[bankId] || bank.programs[0]?.id;
      const program = bank.programs.find(p => p.id === programId) || bank.programs[0];
      if (!program) continue;

      const res = calculateLoanProgram(
        program,
        bank,
        propertyPrice,
        loanAmount,
        loanTermYears,
        borrowerAge,
        {
          includeMRTA,
          company: isCustomMRTA ? undefined : currentMRTACompany,
          customRate: isCustomMRTA ? customMRTARate : undefined,
          financeMRTAWithLoan
        },
        feeConfig,
        botRates
      );
      results.push(res);
    }

    if (results.length > 0) {
      let lowestCost = Infinity;
      let bestIndex = -1;
      results.forEach((r, idx) => {
        if (r.grandTotalCost < lowestCost) {
          lowestCost = r.grandTotalCost;
          bestIndex = idx;
        }
      });
      if (bestIndex !== -1) {
        results[bestIndex].isBestPick = true;
      }
    }

    return results;
  }, [
    selectedBankIds,
    selectedPrograms,
    banks,
    propertyPrice,
    loanAmount,
    loanTermYears,
    borrowerAge,
    includeMRTA,
    selectedMRTAId,
    isCustomMRTA,
    customMRTARate,
    financeMRTAWithLoan,
    feeConfig,
    botRates,
    currentMRTACompany
  ]);

  const generalFees = useMemo(() => {
    return calculateAllFees(propertyPrice, loanAmount, loanTermYears, feeConfig);
  }, [propertyPrice, loanAmount, loanTermYears, feeConfig]);

  const toggleBank = (bankId: string) => {
    if (selectedBankIds.includes(bankId)) {
      if (selectedBankIds.length === 1) return;
      setSelectedBankIds(selectedBankIds.filter(id => id !== bankId));
    } else {
      setSelectedBankIds([...selectedBankIds, bankId]);
    }
  };

  const barChartData = useMemo(() => {
    return calculationResults.map(r => ({
      name: r.bankName.replace('ธนาคาร', '').substring(0, 10),
      'เงินต้น': Math.round(r.totalPrincipalPaid),
      'ดอกเบี้ยรวม': Math.round(r.totalInterestPaid),
      'ประกัน MRTA': Math.round(r.mrtaPremium),
      'ค่าธรรมเนียม': Math.round(r.totalFees),
    }));
  }, [calculationResults]);

  return (
    <div className='min-h-screen bg-slate-50 text-slate-800 pb-16'>
      <header className='bg-white border-b border-slate-200 sticky top-0 z-30'>
        <div className='max-w-7xl mx-auto px-4 h-16 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md'>
              <Building2 className='w-5 h-5' />
            </div>
            <div>
              <h1 className='text-lg font-bold text-slate-900'>HomeLoan Pro TH</h1>
              <p className='text-xs text-slate-500'>เปรียบเทียบสินเชื่อบ้าน ประกัน MRTA & ค่าธรรมเนียม</p>
            </div>
          </div>

          <button
            onClick={fetchBotRates}
            disabled={botStatus.loading}
            className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700'
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${botStatus.loading ? 'animate-spin' : ''}`} />
            <span>BOT Rates: {botStatus.source === 'live' ? 'Live' : botStatus.source === 'cache' ? 'Cached' : 'Standard'}</span>
          </button>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 mt-6'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
          
          <div className='lg:col-span-5 space-y-6'>
            
            {/* Step 1: Property */}
            <div className='bg-white rounded-2xl p-6 border border-slate-200'>
              <h2 className='text-base font-bold text-slate-900 flex items-center gap-2 mb-4'>
                <span className='w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold'>1</span>
                ข้อมูลทรัพย์สินและวงเงินกู้
              </h2>
              <div className='space-y-4'>
                <div>
                  <div className='flex justify-between text-sm mb-1'>
                    <label className='font-medium text-slate-700'>ราคาบ้าน / คอนโด</label>
                    <span className='font-bold text-blue-600'>{propertyPrice.toLocaleString()} บาท</span>
                  </div>
                  <input
                    type='range'
                    min={500000}
                    max={20000000}
                    step={100000}
                    value={propertyPrice}
                    onChange={e => setPropertyPrice(Number(e.target.value))}
                    className='w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-blue-600'
                  />
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='text-xs font-medium text-slate-600 block mb-1'>เงินดาวน์ ({downPaymentPercent}%)</label>
                    <input
                      type='number'
                      value={downPaymentAmount}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setDownPaymentPercent(Math.round((val / propertyPrice) * 100));
                      }}
                      className='w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg'
                    />
                  </div>
                  <div>
                    <label className='text-xs font-medium text-slate-600 block mb-1'>ยอดกู้สุทธิ</label>
                    <div className='w-full px-3 py-2 text-sm bg-blue-50 border border-blue-200 rounded-lg font-bold text-blue-900'>
                      {loanAmount.toLocaleString()} ฿
                    </div>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3 pt-2'>
                  <div>
                    <label className='text-xs font-medium text-slate-600 block mb-1'>ระยะเวลาผ่อน (ปี)</label>
                    <select
                      value={loanTermYears}
                      onChange={e => setLoanTermYears(Number(e.target.value))}
                      className='w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg'
                    >
                      {[10, 15, 20, 25, 30, 35, 40].map(y => (
                        <option key={y} value={y}>{y} ปี ({y * 12} งวด)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className='text-xs font-medium text-slate-600 block mb-1'>อายุผู้กู้ (ปี)</label>
                    <input
                      type='number'
                      min={20}
                      max={65}
                      value={borrowerAge}
                      onChange={e => setBorrowerAge(Number(e.target.value))}
                      className='w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg'
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Banks */}
            <div className='bg-white rounded-2xl p-6 border border-slate-200'>
              <h2 className='text-base font-bold text-slate-900 flex items-center gap-2 mb-3'>
                <span className='w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold'>2</span>
                เลือกธนาคารเปรียบเทียบ
              </h2>
              <div className='flex flex-wrap gap-2 mb-4'>
                {banks.map(bank => {
                  const isSelected = selectedBankIds.includes(bank.id);
                  return (
                    <button
                      key={bank.id}
                      onClick={() => toggleBank(bank.id)}
                      className={isSelected ? 'px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border bg-slate-900 text-white border-slate-900' : 'px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}
                    >
                      <span className='w-2 h-2 rounded-full' style={{ backgroundColor: bank.color }} />
                      {bank.nameTh.replace('ธนาคาร', '')}
                    </button>
                  );
                })}
              </div>

              <div className='space-y-3 pt-2 border-t border-slate-100'>
                {selectedBankIds.map(bankId => {
                  const bank = banks.find(b => b.id === bankId);
                  if (!bank) return null;
                  return (
                    <div key={bank.id} className='p-3 bg-slate-50 rounded-xl border border-slate-200'>
                      <div className='flex items-center justify-between mb-1'>
                        <span className='text-xs font-bold text-slate-800'>{bank.nameTh}</span>
                        <span className='text-[11px] text-slate-500'>MRR: {bank.defaultMRR}%</span>
                      </div>
                      <select
                        value={selectedPrograms[bank.id] || bank.programs[0]?.id}
                        onChange={e => setSelectedPrograms({ ...selectedPrograms, [bank.id]: e.target.value })}
                        className='w-full text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-lg'
                      >
                        {bank.programs.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: MRTA */}
            <div className='bg-white rounded-2xl p-6 border border-slate-200'>
              <div className='flex items-center justify-between mb-3'>
                <h2 className='text-base font-bold text-slate-900 flex items-center gap-2'>
                  <span className='w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold'>3</span>
                  ประกันคุ้มครองวงเงิน (MRTA)
                </h2>
                <div className='flex items-center gap-2'>
                  <input
                    type='checkbox'
                    id='includeMRTA'
                    checked={includeMRTA}
                    onChange={e => setIncludeMRTA(e.target.checked)}
                    className='w-4 h-4 rounded text-blue-600'
                  />
                  <label htmlFor='includeMRTA' className='text-xs font-medium'>ทำประกัน</label>
                </div>
              </div>

              {includeMRTA && (
                <div className='space-y-3 pt-2'>
                  <div className='flex gap-2'>
                    <button
                      type='button'
                      onClick={() => setIsCustomMRTA(false)}
                      className={`flex-1 py-1.5 px-2 text-xs rounded-lg border ${!isCustomMRTA ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold' : 'bg-white border-slate-200'}`}
                    >
                      เลือกจาก 6 บริษัท
                    </button>
                    <button
                      type='button'
                      onClick={() => setIsCustomMRTA(true)}
                      className={`flex-1 py-1.5 px-2 text-xs rounded-lg border ${isCustomMRTA ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold' : 'bg-white border-slate-200'}`}
                    >
                      กำหนด Rate เอง
                    </button>
                  </div>

                  {!isCustomMRTA ? (
                    <select
                      value={selectedMRTAId}
                      onChange={e => setSelectedMRTAId(e.target.value)}
                      className='w-full text-xs py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg'
                    >
                      {DEFAULT_MRTA_COMPANIES.map(comp => (
                        <option key={comp.id} value={comp.id}>{comp.name}</option>
                      ))}
                    </select>
                  ) : (
                    <div className='p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2'>
                      <div>
                        <label className='text-xs text-amber-900 block mb-1'>ชื่อบริษัท</label>
                        <input
                          type='text'
                          value={customMRTACompany}
                          onChange={e => setCustomMRTACompany(e.target.value)}
                          className='w-full text-xs py-1 px-2 bg-white border border-amber-300 rounded-lg'
                        />
                      </div>
                      <div>
                        <label className='text-xs text-amber-900 block mb-1'>อัตราเบี้ย (บาท / 1,000 บาทกู้)</label>
                        <input
                          type='number'
                          value={customMRTARate}
                          onChange={e => setCustomMRTARate(Number(e.target.value))}
                          className='w-full text-xs py-1 px-2 bg-white border border-amber-300 rounded-lg font-bold'
                        />
                      </div>
                    </div>
                  )}

                  <div className='flex items-center gap-2 pt-1'>
                    <input
                      type='checkbox'
                      id='financeMRTA'
                      checked={financeMRTAWithLoan}
                      onChange={e => setFinanceMRTAWithLoan(e.target.checked)}
                      className='w-4 h-4 rounded text-blue-600'
                    />
                    <label htmlFor='financeMRTA' className='text-xs text-slate-600'>กู้เพิ่มรวมกับยอดบ้าน</label>
                  </div>
                </div>
              )}
            </div>

            {/* Step 4: Fees */}
            <div className='bg-white rounded-2xl p-6 border border-slate-200'>
              <h2 className='text-base font-bold text-slate-900 flex items-center gap-2 mb-3'>
                <span className='w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold'>4</span>
                ค่าธรรมเนียมและค่าใช้จ่าย
              </h2>
              <div className='mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between'>
                <div className='text-xs font-bold text-emerald-900'>มาตรการรัฐบาล (ลดค่าโอน/จดจำนอง 0.01%)</div>
                <input
                  type='checkbox'
                  checked={isGovernmentMeasure}
                  onChange={e => setIsGovernmentMeasure(e.target.checked)}
                  className='w-4 h-4 rounded text-emerald-600'
                />
              </div>

              <div className='space-y-1.5 text-xs text-slate-600'>
                <div className='flex justify-between py-1 border-b border-slate-100'>
                  <span>ค่าจดจำนอง ({(feeConfig.mortgageFeeRate * 100).toFixed(2)}%)</span>
                  <span className='font-semibold text-slate-800'>{generalFees.mortgageFee.toLocaleString()} ฿</span>
                </div>
                <div className='flex justify-between py-1 border-b border-slate-100'>
                  <span>ค่าธรรมเนียมการโอน ({(feeConfig.transferFeeRate * 100).toFixed(2)}%)</span>
                  <span className='font-semibold text-slate-800'>{generalFees.transferFee.toLocaleString()} ฿</span>
                </div>
                <div className='flex justify-between py-1 border-b border-slate-100'>
                  <span>อากรแสตมป์ + ประเมิน + อัคคีภัย</span>
                  <span className='font-semibold text-slate-800'>{(generalFees.stampDuty + generalFees.appraisalFee + generalFees.fireInsurance).toLocaleString()} ฿</span>
                </div>
                <div className='flex justify-between pt-2 text-sm font-bold text-slate-900'>
                  <span>รวมค่าธรรมเนียม</span>
                  <span className='text-blue-600'>{generalFees.totalFees.toLocaleString()} ฿</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Results */}
          <div className='lg:col-span-7 space-y-6'>
            
            {/* Best Value Highlight */}
            {calculationResults.find(r => r.isBestPick) && (
              <div className='bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-md'>
                <div className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold mb-2'>
                  <CheckCircle2 className='w-3.5 h-3.5' /> ต้นทุนรวมต่ำที่สุด (Best Pick)
                </div>
                <h3 className='text-xl font-bold'>
                  {calculationResults.find(r => r.isBestPick)?.bankName}
                </h3>
                <p className='text-xs text-emerald-100 mb-4'>
                  {calculationResults.find(r => r.isBestPick)?.programName}
                </p>
                <div className='grid grid-cols-3 gap-4 pt-3 border-t border-emerald-500/50'>
                  <div>
                    <div className='text-[11px] text-emerald-200'>ผ่อนเฉลี่ย 3 ปีแรก</div>
                    <div className='text-lg font-bold'>
                      {calculationResults.find(r => r.isBestPick)?.monthlyPaymentFirst3YearsAvg.toLocaleString()} <span className='text-xs font-normal'>บ./ด.</span>
                    </div>
                  </div>
                  <div>
                    <div className='text-[11px] text-emerald-200'>ดอกเบี้ยรวมตลอดสัญญา</div>
                    <div className='text-lg font-bold'>
                      {((calculationResults.find(r => r.isBestPick)?.totalInterestPaid || 0) / 1000000).toFixed(2)} ล้าน
                    </div>
                  </div>
                  <div>
                    <div className='text-[11px] text-emerald-200'>ต้นทุนรวม (True Cost)</div>
                    <div className='text-lg font-bold text-amber-300'>
                      {((calculationResults.find(r => r.isBestPick)?.grandTotalCost || 0) / 1000000).toFixed(2)} ล้าน
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comparison Cards Grid */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {calculationResults.map(res => (
                <div 
                  key={res.programId} 
                  className={`bg-white rounded-2xl p-5 border ${res.isBestPick ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm' : 'border-slate-200'}`}
                >
                  <div className='flex justify-between items-start mb-2'>
                    <div>
                      <h4 className='text-sm font-bold text-slate-900'>{res.bankName}</h4>
                      <p className='text-[11px] text-slate-500 line-clamp-1'>{res.programName}</p>
                    </div>
                    {res.isBestPick && (
                      <span className='px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold'>
                        ดีที่สุด
                      </span>
                    )}
                  </div>

                  <div className='space-y-1.5 text-xs py-2 border-y border-slate-100 my-2'>
                    <div className='flex justify-between'>
                      <span className='text-slate-500'>ดอกเบี้ยเฉลี่ย 3 ปีแรก</span>
                      <span className='font-bold text-blue-600'>{res.effectiveInterestRate}%</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-slate-500'>ผ่อนเฉลี่ยต่อเดือน (3 ปีแรก)</span>
                      <span className='font-bold text-slate-900'>{res.monthlyPaymentFirst3YearsAvg.toLocaleString()} ฿</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-slate-500'>ดอกเบี้ยรวมตลอดสัญญา</span>
                      <span className='font-semibold text-rose-600'>{res.totalInterestPaid.toLocaleString()} ฿</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-slate-500'>ประกัน MRTA</span>
                      <span className='font-semibold'>{res.mrtaPremium.toLocaleString()} ฿</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-slate-500'>ค่าธรรมเนียมทั้งหมด</span>
                      <span className='font-semibold'>{res.totalFees.toLocaleString()} ฿</span>
                    </div>
                  </div>

                  <div className='flex items-baseline justify-between pt-1'>
                    <span className='text-xs text-slate-500'>ต้นทุนรวมสุทธิ:</span>
                    <span className='text-base font-extrabold text-slate-900'>
                      {res.grandTotalCost.toLocaleString()} <span className='text-xs font-normal'>฿</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Comparison Charts */}
            <div className='bg-white rounded-2xl p-6 border border-slate-200'>
              <h3 className='text-sm font-bold text-slate-900 mb-4 flex items-center gap-2'>
                <BarChart3 className='w-4 h-4 text-blue-600' />
                เปรียบเทียบสัดส่วนต้นทุน (เงินต้น vs ดอกเบี้ย vs MRTA vs ค่าธรรมเนียม)
              </h3>
              <div className='h-64 w-full'>
                <ResponsiveContainer width='100%' height='100%'>
                  <BarChart data={barChartData}>
                    <XAxis dataKey='name' tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(val: any) => [`${Number(val).toLocaleString()} บาท`]} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey='เงินต้น' stackId='a' fill='#3b82f6' />
                    <Bar dataKey='ดอกเบี้ยรวม' stackId='a' fill='#f43f5e' />
                    <Bar dataKey='ประกัน MRTA' stackId='a' fill='#10b981' />
                    <Bar dataKey='ค่าธรรมเนียม' stackId='a' fill='#f59e0b' />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Amortization Table */}
            <div className='bg-white rounded-2xl p-6 border border-slate-200'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-sm font-bold text-slate-900 flex items-center gap-2'>
                  <Calendar className='w-4 h-4 text-indigo-600' />
                  ตารางผ่อนชำระตัวอย่าง (12 งวดแรก)
                </h3>
                <span className='text-xs text-slate-500'>
                  {calculationResults[0]?.bankName}
                </span>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full text-left text-xs'>
                  <thead className='bg-slate-50 text-slate-500 text-[11px]'>
                    <tr>
                      <th className='py-2 px-3'>งวด</th>
                      <th className='py-2 px-3'>ยอดผ่อน</th>
                      <th className='py-2 px-3'>เงินต้น</th>
                      <th className='py-2 px-3'>ดอกเบี้ย</th>
                      <th className='py-2 px-3'>ยอดคงเหลือ</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {calculationResults[0]?.schedule.slice(0, 12).map(row => (
                      <tr key={row.month}>
                        <td className='py-2 px-3 text-slate-700'>เดือน {row.month}</td>
                        <td className='py-2 px-3 font-bold text-slate-900'>{row.payment.toLocaleString()}</td>
                        <td className='py-2 px-3 text-emerald-600'>{row.principal.toLocaleString()}</td>
                        <td className='py-2 px-3 text-rose-500'>{row.interest.toLocaleString()}</td>
                        <td className='py-2 px-3 text-slate-600'>{row.balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
