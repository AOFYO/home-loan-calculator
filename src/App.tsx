import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Building2, 
  RefreshCw, 
  CheckCircle2, 
  BarChart3, 
  Calendar, 
  Sparkles, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  FolderOpen, 
  Sliders, 
  ChevronDown, 
  X,
  FileText,
  Printer,
  Edit3,
  Copy,
  AlertTriangle,
  Lightbulb
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
import { calculateLoanProgram, calculateAllFees, convertCustomOfferToProgram, calculateAdvancedCustomOffer } from './lib/calculator';
import { BankInfo, BotRateData, CalculationResult, CustomBankOffer, UserLoanProfile, AdvancedOfferCalculationResult } from './types/loan';
import { AdvancedOfferModal } from './components/AdvancedOfferModal';
import { NegotiationSheetModal } from './components/NegotiationSheetModal';

export default function App() {
  // --- Form Inputs State (Default: Down payment 0, Term 30 years) ---
  const [loanInputMode, setLoanInputMode] = useState<'direct' | 'property'>('direct');
  const [loanAmount, setLoanAmount] = useState<number>(3000000);
  const [propertyPrice, setPropertyPrice] = useState<number>(3000000);
  const [downPaymentAmount, setDownPaymentAmount] = useState<number>(0);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(0);
  const [loanTermYears, setLoanTermYears] = useState<number>(30);
  const [borrowerAge, setBorrowerAge] = useState<number>(32);

  const handlePropertyChange = (newPrice: number, newDown: number) => {
    setPropertyPrice(newPrice);
    setDownPaymentAmount(newDown);
    setDownPaymentPercent(newPrice > 0 ? Math.round((newDown / newPrice) * 100) : 0);
    setLoanAmount(Math.max(0, newPrice - newDown));
  };

  const handleDirectLoanChange = (newLoan: number) => {
    setLoanAmount(newLoan);
    setPropertyPrice(newLoan + downPaymentAmount);
    if (newLoan + downPaymentAmount > 0) {
      setDownPaymentPercent(Math.round((downPaymentAmount / (newLoan + downPaymentAmount)) * 100));
    }
  };

  const [banks] = useState<BankInfo[]>(DEFAULT_BANKS);
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>(['kbank', 'scb', 'ghb']);
  const [selectedPrograms, setSelectedPrograms] = useState<Record<string, string>>({
    kbank: 'kbank-p1',
    scb: 'scb-p1',
    ghb: 'ghb-p1'
  });

  const [customOffers, setCustomOffers] = useState<CustomBankOffer[]>([]);
  const [resultsTab, setResultsTab] = useState<'custom' | 'standard'>('custom');
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState<boolean>(false);
  const [isNegotiationModalOpen, setIsNegotiationModalOpen] = useState<boolean>(false);
  const [customViewMode, setCustomViewMode] = useState<'annual' | 'monthly'>('annual');
  const [showFullTermCustom, setShowFullTermCustom] = useState<boolean>(false);
  const [selectedAmortizationOfferId, setSelectedAmortizationOfferId] = useState<string>('');
  const [editingAdvancedOffer, setEditingAdvancedOffer] = useState<CustomBankOffer>({
    id: '',
    bankName: '',
    color: '#6366f1',
    rateYear1: 2.99,
    rateYear2: 3.50,
    rateYear3: 4.25,
    rateYear4PlusType: 'floating',
    rateYear4PlusFixed: 5.50,
    rateYear4PlusBase: 'MRR',
    rateYear4PlusSpread: -1.25,
    mrtaDiscountRate: 0
  });

  const [includeMRTA, setIncludeMRTA] = useState<boolean>(true);
  const [selectedMRTAId, setSelectedMRTAId] = useState<string>('aia');
  const [isCustomMRTA, setIsCustomMRTA] = useState<boolean>(false);
  const [customMRTACompany, setCustomMRTACompany] = useState<string>('ประกันแบบกำหนดเอง');
  const [customMRTARate, setCustomMRTARate] = useState<number>(55);
  const [financeMRTAWithLoan, setFinanceMRTAWithLoan] = useState<boolean>(false);

  const [profiles, setProfiles] = useState<UserLoanProfile[]>([]);
  const [currentProfileName, setCurrentProfileName] = useState<string>('โปรไฟล์ปัจจุบัน');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('homeloan_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProfiles(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load profiles:', e);
    }
  }, []);

  const saveProfilesToStorage = (updated: UserLoanProfile[]) => {
    setProfiles(updated);
    try {
      localStorage.setItem('homeloan_profiles', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save profiles:', e);
    }
  };

  const handleSaveCurrentProfile = () => {
    const name = prompt('ตั้งชื่อโปรไฟล์สำหรับบันทึกการเปรียบเทียบนี้:', currentProfileName) || currentProfileName;
    const newProfile: UserLoanProfile = {
      id: 'prof_' + Date.now(),
      name,
      updatedAt: new Date().toISOString(),
      propertyPrice,
      loanAmount,
      downPaymentAmount,
      downPaymentPercent,
      loanTermYears,
      borrowerAge,
      selectedBankIds,
      selectedPrograms,
      customOffers,
      includeMRTA,
      selectedMRTAId,
      isCustomMRTA,
      customMRTACompany,
      customMRTARate,
      financeMRTAWithLoan,
      isGovernmentMeasure
    };

    const existingIdx = profiles.findIndex(p => p.name === name);
    let updated: UserLoanProfile[];
    if (existingIdx >= 0) {
      updated = [...profiles];
      updated[existingIdx] = newProfile;
    } else {
      updated = [newProfile, ...profiles];
    }
    saveProfilesToStorage(updated);
    setCurrentProfileName(name);
    alert('บันทึกโปรไฟล์เรียบร้อยแล้ว!');
  };

  const handleLoadProfile = (prof: UserLoanProfile) => {
    setPropertyPrice(prof.propertyPrice);
    setLoanAmount(prof.loanAmount);
    setDownPaymentAmount(prof.downPaymentAmount || 0);
    setDownPaymentPercent(prof.downPaymentPercent || 0);
    setLoanTermYears(prof.loanTermYears || 30);
    setBorrowerAge(prof.borrowerAge || 32);
    setSelectedBankIds(prof.selectedBankIds || ['kbank', 'scb']);
    setSelectedPrograms(prof.selectedPrograms || {});
    setCustomOffers(prof.customOffers || []);
    setIncludeMRTA(prof.includeMRTA ?? true);
    setSelectedMRTAId(prof.selectedMRTAId || 'aia');
    setIsCustomMRTA(prof.isCustomMRTA ?? false);
    setCustomMRTACompany(prof.customMRTACompany || 'ประกันแบบกำหนดเอง');
    setCustomMRTARate(prof.customMRTARate || 55);
    setFinanceMRTAWithLoan(prof.financeMRTAWithLoan ?? false);
    setIsGovernmentMeasure(prof.isGovernmentMeasure ?? false);
    setCurrentProfileName(prof.name);
    setIsProfileDropdownOpen(false);
  };

  const handleDeleteProfile = (id: string, name: string) => {
    if (confirm('คุณต้องการลบโปรไฟล์ ' + name + ' หรือไม่?')) {
      const updated = profiles.filter(p => p.id !== id);
      saveProfilesToStorage(updated);
    }
  };

  const handleExportJSON = () => {
    const exportData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      currentProfileName,
      data: {
        propertyPrice,
        loanAmount,
        downPaymentAmount,
        loanTermYears,
        borrowerAge,
        selectedBankIds,
        selectedPrograms,
        customOffers,
        includeMRTA,
        selectedMRTAId,
        isCustomMRTA,
        customMRTACompany,
        customMRTARate,
        financeMRTAWithLoan,
        isGovernmentMeasure
      },
      allProfiles: profiles
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'homeloan-profile-' + currentProfileName.replace(/\s+/g, '_') + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string);
        if (imported.data) {
          const d = imported.data;
          setPropertyPrice(d.propertyPrice || 3000000);
          setLoanAmount(d.loanAmount || 3000000);
          setDownPaymentAmount(d.downPaymentAmount || 0);
          setLoanTermYears(d.loanTermYears || 30);
          setBorrowerAge(d.borrowerAge || 32);
          if (d.selectedBankIds) setSelectedBankIds(d.selectedBankIds);
          if (d.selectedPrograms) setSelectedPrograms(d.selectedPrograms);
          if (d.customOffers) setCustomOffers(d.customOffers);
          if (d.includeMRTA !== undefined) setIncludeMRTA(d.includeMRTA);
          if (imported.currentProfileName) setCurrentProfileName(imported.currentProfileName);
        }
        if (Array.isArray(imported.allProfiles)) {
          saveProfilesToStorage(imported.allProfiles);
        }
        alert('นำเข้าไฟล์สำเร็จแล้ว!');
      } catch (err) {
        alert('ไฟล์ JSON ไม่ถูกต้อง');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveAdvancedOffer = (saved: CustomBankOffer) => {
    const idx = customOffers.findIndex(o => o.id === saved.id);
    let updated: CustomBankOffer[];
    if (idx >= 0) {
      updated = [...customOffers];
      updated[idx] = saved;
    } else {
      updated = [...customOffers, saved];
    }
    setCustomOffers(updated);
    if (!selectedBankIds.includes(saved.id)) {
      setSelectedBankIds([...selectedBankIds, saved.id]);
    }
    setIsAdvancedModalOpen(false);
    setResultsTab('custom');
  };

  const handleOpenNewAdvancedOffer = () => {
    setEditingAdvancedOffer({
      id: '',
      bankName: '',
      color: '#6366f1',
      rateYear1: 2.99,
      rateYear2: 3.50,
      rateYear3: 4.25,
      rateYear4PlusType: 'floating',
      rateYear4PlusFixed: 5.50,
      rateYear4PlusBase: 'MRR',
      rateYear4PlusSpread: -1.25,
      mrtaDiscountRate: 0,
      isAdvanced: true,
      propertyPrice,
      homeLoan: {
        loanAmount,
        termYears: loanTermYears,
        rateYear1: 2.99,
        rateYear2: 3.50,
        rateYear3: 4.25,
        rateYear4PlusType: 'floating',
        rateYear4PlusFixed: 5.50,
        rateYear4PlusBase: 'MRR',
        rateYear4PlusSpread: -1.25
      },
      mrtaLoan: {
        totalPremium: 120000,
        financeWithLoan: true,
        loanAmount: 120000,
        termYears: 20,
        rateYear1: 3.50,
        rateYear2: 4.00,
        rateYear3: 4.50,
        rateYear4PlusType: 'floating',
        rateYear4PlusFixed: 6.00,
        rateYear4PlusBase: 'MRR',
        rateYear4PlusSpread: -1.00
      },
      prepayment: {
        enabled: true,
        mode: 'target_monthly',
        targetMonthlyYear1: 16000,
        targetMonthlyYear2: 18000,
        targetMonthlyYear3: 20000,
        targetMonthlyYear4Plus: 22000,
        allocation: 'smart_auto'
      },
      fees: {
        mortgageFee: { payer: 'bank' },
        transferFee: { payer: 'borrower' },
        appraisalFee: { payer: 'bank' },
        stampDuty: { payer: 'borrower' },
        fireInsurance: { payer: 'borrower' }
      },
      perks: [
        { id: 'p1', name: 'เงินคืนเข้าบัญชี (Cashback)', value: 10000, type: 'cashback' }
      ],
      lockInYears: 3
    });
    setIsAdvancedModalOpen(true);
  };

  const handleEditAdvancedOffer = (offer: CustomBankOffer) => {
    setEditingAdvancedOffer({ ...offer });
    setIsAdvancedModalOpen(true);
  };

  const handleDuplicateAdvancedOffer = (offer: CustomBankOffer) => {
    const copyOffer: CustomBankOffer = {
      ...offer,
      id: 'custom_' + Date.now(),
      bankName: `${offer.bankName} (สำเนา)`
    };
    setCustomOffers([...customOffers, copyOffer]);
    setSelectedBankIds([...selectedBankIds, copyOffer.id]);
  };

  const handleDeleteCustomOffer = (offerId: string) => {
    setCustomOffers(customOffers.filter(o => o.id !== offerId));
    setSelectedBankIds(selectedBankIds.filter(id => id !== offerId));
  };

  const handleTogglePrepayment = (offerId: string) => {
    setCustomOffers(prev => prev.map(o => {
      if (o.id === offerId && o.prepayment) {
        return {
          ...o,
          prepayment: {
            ...o.prepayment,
            enabled: o.prepayment.enabled === false ? true : false
          }
        };
      }
      return o;
    }));
  };

  const handleSeedSampleOffers = () => {
    const sample1: CustomBankOffer = {
      id: 'sample_ghb',
      bankName: 'ธอส. สวัสดิการ (GHB Privilege)',
      color: '#f97316',
      rateYear1: 1.99,
      rateYear2: 2.99,
      rateYear3: 3.99,
      rateYear4PlusType: 'floating',
      rateYear4PlusFixed: 5.80,
      rateYear4PlusBase: 'MRR',
      rateYear4PlusSpread: -1.50,
      mrtaDiscountRate: 0,
      isAdvanced: true,
      propertyPrice,
      homeLoan: {
        loanAmount,
        termYears: loanTermYears,
        rateYear1: 1.99,
        rateYear2: 2.99,
        rateYear3: 3.99,
        rateYear4PlusType: 'floating',
        rateYear4PlusFixed: 5.80,
        rateYear4PlusBase: 'MRR',
        rateYear4PlusSpread: -1.50,
        bankInstallmentYear1: 12500,
        bankInstallmentYear2: 13500,
        bankInstallmentYear3: 15000,
        bankInstallmentYear4Plus: 17000
      },
      mrtaLoan: {
        totalPremium: 110000,
        financeWithLoan: true,
        loanAmount: 110000,
        termYears: 15,
        rateYear1: 3.50,
        rateYear2: 4.00,
        rateYear3: 4.50,
        rateYear4PlusType: 'floating',
        rateYear4PlusFixed: 6.00,
        rateYear4PlusBase: 'MRR',
        rateYear4PlusSpread: -1.00,
        bankInstallmentYear1: 1000,
        bankInstallmentYear2: 1000,
        bankInstallmentYear3: 1000,
        bankInstallmentYear4Plus: 1200
      },
      prepayment: {
        mode: 'target_monthly',
        targetMonthlyYear1: 16000,
        targetMonthlyYear2: 18000,
        targetMonthlyYear3: 20000,
        targetMonthlyYear4Plus: 22000,
        allocation: 'smart_auto'
      },
      fees: {
        mortgageFee: { payer: 'bank' },
        transferFee: { payer: 'borrower' },
        appraisalFee: { payer: 'bank' },
        stampDuty: { payer: 'borrower' },
        fireInsurance: { payer: 'borrower' }
      },
      perks: [
        { id: 'p1', name: 'เงินคืนเข้าบัญชี (Cashback)', value: 10000, type: 'cashback' }
      ],
      lockInYears: 3,
      notes: 'ข้อเสนอพิเศษสวัสดิการหน่วยงานรัฐ'
    };

    const sample2: CustomBankOffer = {
      id: 'sample_kbank',
      bankName: 'KBank โปรโมชันพิเศษ (KBank Special)',
      color: '#10b981',
      rateYear1: 2.50,
      rateYear2: 2.95,
      rateYear3: 3.50,
      rateYear4PlusType: 'fixed',
      rateYear4PlusFixed: 5.50,
      rateYear4PlusBase: 'MRR',
      rateYear4PlusSpread: -1.25,
      mrtaDiscountRate: 0,
      isAdvanced: true,
      propertyPrice,
      homeLoan: {
        loanAmount,
        termYears: loanTermYears,
        rateYear1: 2.50,
        rateYear2: 2.95,
        rateYear3: 3.50,
        rateYear4PlusType: 'fixed',
        rateYear4PlusFixed: 5.50,
        rateYear4PlusBase: 'MRR',
        rateYear4PlusSpread: -1.25,
        bankInstallmentYear1: 13000,
        bankInstallmentYear2: 13000,
        bankInstallmentYear3: 14000,
        bankInstallmentYear4Plus: 17000
      },
      mrtaLoan: {
        totalPremium: 120000,
        financeWithLoan: true,
        loanAmount: 120000,
        termYears: 20,
        rateYear1: 2.50,
        rateYear2: 2.95,
        rateYear3: 3.50,
        rateYear4PlusType: 'fixed',
        rateYear4PlusFixed: 5.50,
        rateYear4PlusBase: 'MRR',
        rateYear4PlusSpread: -1.25,
        bankInstallmentYear1: 1000,
        bankInstallmentYear2: 1000,
        bankInstallmentYear3: 1000,
        bankInstallmentYear4Plus: 1100
      },
      prepayment: {
        mode: 'target_monthly',
        targetMonthlyYear1: 16000,
        targetMonthlyYear2: 18000,
        targetMonthlyYear3: 20000,
        targetMonthlyYear4Plus: 22000,
        allocation: 'smart_auto'
      },
      fees: {
        mortgageFee: { payer: 'borrower' },
        transferFee: { payer: 'borrower' },
        appraisalFee: { payer: 'bank' },
        stampDuty: { payer: 'bank' },
        fireInsurance: { payer: 'borrower' }
      },
      perks: [
        { id: 'p2', name: 'สลากออมสินพิเศษ', value: 15000, type: 'lottery' },
        { id: 'p3', name: 'บัตรกำนัล HomePro', value: 5000, type: 'voucher' }
      ],
      lockInYears: 5,
      notes: 'โปรโมชันแพ็กเกจของแถม ห้ามรีไฟแนนซ์ 5 ปี'
    };

    setCustomOffers([sample1, sample2]);
    setSelectedBankIds(['sample_ghb', 'sample_kbank']);
    setResultsTab('custom');
  };

  const handleDuplicateBankToCustom = (bank: BankInfo) => {
    const programId = selectedPrograms[bank.id] || bank.programs[0]?.id;
    const program = bank.programs.find(p => p.id === programId) || bank.programs[0];
    const newOffer: CustomBankOffer = {
      id: 'custom_' + Date.now(),
      bankName: `${bank.nameTh} (${program?.name || 'กำหนดเอง'})`,
      color: bank.color,
      rateYear1: 2.99,
      rateYear2: 3.50,
      rateYear3: 4.25,
      rateYear4PlusType: 'floating',
      rateYear4PlusFixed: 5.50,
      rateYear4PlusBase: 'MRR',
      rateYear4PlusSpread: -1.25,
      mrtaDiscountRate: 0,
      isAdvanced: true,
      propertyPrice,
      homeLoan: {
        loanAmount,
        termYears: loanTermYears,
        rateYear1: 2.99,
        rateYear2: 3.50,
        rateYear3: 4.25,
        rateYear4PlusType: 'floating',
        rateYear4PlusFixed: 5.50,
        rateYear4PlusBase: 'MRR',
        rateYear4PlusSpread: -1.25
      },
      mrtaLoan: {
        totalPremium: 120000,
        financeWithLoan: true,
        loanAmount: 120000,
        termYears: 20,
        rateYear1: 3.50,
        rateYear2: 4.00,
        rateYear3: 4.50,
        rateYear4PlusType: 'floating',
        rateYear4PlusFixed: 6.00,
        rateYear4PlusBase: 'MRR',
        rateYear4PlusSpread: -1.00
      },
      prepayment: {
        mode: 'target_monthly',
        targetMonthlyYear1: 16000,
        targetMonthlyYear2: 18000,
        targetMonthlyYear3: 20000,
        targetMonthlyYear4Plus: 22000,
        allocation: 'smart_auto'
      },
      fees: {
        mortgageFee: { payer: 'borrower' },
        transferFee: { payer: 'borrower' },
        appraisalFee: { payer: 'bank' },
        stampDuty: { payer: 'borrower' },
        fireInsurance: { payer: 'borrower' }
      },
      perks: [],
      lockInYears: 3
    };

    setEditingAdvancedOffer(newOffer);
    setIsAdvancedModalOpen(true);
  };

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
      const customOffer = customOffers.find(o => o.id === bankId);
      if (customOffer) {
        const { program, bank } = convertCustomOfferToProgram(customOffer, botRates);
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
            financeMRTAWithLoan,
            mrtaDiscountRate: customOffer.mrtaDiscountRate
          },
          feeConfig,
          botRates
        );
        results.push(res);
        continue;
      }

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
    customOffers,
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

  const bestResult = useMemo(() => {
    return calculationResults.find(r => r.isBestPick) || calculationResults[0];
  }, [calculationResults]);

  const advancedCustomResults = useMemo<AdvancedOfferCalculationResult[]>(() => {
    return customOffers.map(offer => {
      return calculateAdvancedCustomOffer(
        offer,
        propertyPrice,
        loanAmount,
        loanTermYears,
        borrowerAge,
        feeConfig,
        botRates
      );
    });
  }, [customOffers, propertyPrice, loanAmount, loanTermYears, borrowerAge, feeConfig, botRates]);

  const bestCustomPick = useMemo(() => {
    if (advancedCustomResults.length === 0) return null;
    return [...advancedCustomResults].sort((a, b) => a.trueNetCost3Years - b.trueNetCost3Years)[0];
  }, [advancedCustomResults]);

  const activeAmortizationOffer = useMemo(() => {
    if (advancedCustomResults.length === 0) return null;
    return (
      advancedCustomResults.find(r => r.offer.id === (selectedAmortizationOfferId || customOffers[0]?.id)) ||
      advancedCustomResults[0]
    );
  }, [advancedCustomResults, selectedAmortizationOfferId, customOffers]);

  const barChartData = useMemo(() => {
    return calculationResults.map(r => ({
      name: r.bankName.replace('ธนาคาร', '').substring(0, 10),
      'เงินต้น': Math.round(r.totalPrincipalPaid),
      'ดอกเบี้ยรวม': Math.round(r.totalInterestPaid),
      'ประกัน MRTA': Math.round(r.mrtaPremium),
      'ค่าธรรมเนียม': Math.round(r.totalFees),
    }));
  }, [calculationResults]);

  const [mobileTab, setMobileTab] = useState<'input' | 'results'>('input');
  const resultsRef = useRef<HTMLDivElement>(null);

  const scrollToResults = () => {
    setMobileTab('results');
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className='min-h-screen bg-slate-50 text-slate-800 pb-16'>
      <header className='bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs'>
        <div className='max-w-7xl mx-auto px-4 h-16 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md'>
              <Building2 className='w-5 h-5' />
            </div>
            <div>
              <h1 className='text-base md:text-lg font-bold text-slate-900 leading-tight'>HomeLoan Pro TH</h1>
              <p className='text-[10px] md:text-xs text-slate-500'>เปรียบเทียบสินเชื่อบ้าน & MRTA</p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <button
              onClick={fetchBotRates}
              disabled={botStatus.loading}
              className='hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700'
            >
              <RefreshCw className={`w-3 h-3 text-blue-600 ${botStatus.loading ? 'animate-spin' : ''}`} />
              <span>BOT Rates: {botStatus.source === 'live' ? 'Live' : botStatus.source === 'cache' ? 'Cached' : 'Standard'}</span>
            </button>

            <div className='relative'>
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className='inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 transition min-h-[44px]'
              >
                <FolderOpen className='w-4 h-4' />
                <span className='max-w-[120px] truncate'>{currentProfileName}</span>
                <ChevronDown className='w-3.5 h-3.5' />
              </button>

              {isProfileDropdownOpen && (
                <div className='absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50'>
                  <div className='text-xs font-bold text-slate-800 mb-2 px-1'>จัดการโปรไฟล์การคำนวณ</div>
                  
                  <div className='space-y-1 mb-3 max-h-48 overflow-y-auto'>
                    {profiles.length === 0 ? (
                      <div className='text-xs text-slate-400 py-2 text-center'>ยังไม่มีโปรไฟล์ที่บันทึกไว้</div>
                    ) : (
                      profiles.map(p => (
                        <div key={p.id} className='flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-xs'>
                          <button
                            onClick={() => handleLoadProfile(p)}
                            className='text-left font-medium text-slate-700 truncate flex-1 hover:text-blue-600'
                          >
                            {p.name}
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(p.id, p.name)}
                            className='text-slate-400 hover:text-rose-500 p-1'
                          >
                            <Trash2 className='w-3.5 h-3.5' />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className='pt-2 border-t border-slate-100 space-y-1.5'>
                    <button
                      onClick={handleSaveCurrentProfile}
                      className='w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 min-h-[40px]'
                    >
                      <Plus className='w-3.5 h-3.5' /> บันทึกโปรไฟล์ปัจจุบัน
                    </button>
                    <div className='grid grid-cols-2 gap-1.5 pt-1'>
                      <button
                        onClick={handleExportJSON}
                        className='py-2 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center justify-center gap-1'
                      >
                        <Download className='w-3.5 h-3.5' /> Export JSON
                      </button>
                      <label className='py-2 px-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center justify-center gap-1 cursor-pointer'>
                        <Upload className='w-3.5 h-3.5' /> Import JSON
                        <input
                          type='file'
                          ref={fileInputRef}
                          accept='.json'
                          onChange={handleImportJSON}
                          className='hidden'
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className='md:hidden flex border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs'>
          <button
            onClick={() => setMobileTab('input')}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition min-h-[44px] ${
              mobileTab === 'input' 
                ? 'border-blue-600 text-blue-600 bg-white' 
                : 'border-transparent text-slate-500'
            }`}
          >
            📝 กรอกข้อมูลสินเชื่อ
          </button>
          <button
            onClick={() => setMobileTab('results')}
            className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition min-h-[44px] ${
              mobileTab === 'results' 
                ? 'border-blue-600 text-blue-600 bg-white' 
                : 'border-transparent text-slate-500'
            }`}
          >
            📊 ผลลัพธ์เปรียบเทียบ {calculationResults.length > 0 && `(${calculationResults.length})`}
          </button>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 mt-6'>
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
          
          <div className={`lg:col-span-5 space-y-6 ${mobileTab === 'results' ? 'hidden md:block' : 'block'}`}>
            
            {/* Step 1: Property & Net Loan */}
            <div className='bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-xs'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-base font-bold text-slate-900 flex items-center gap-2'>
                  <span className='w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold'>1</span>
                  ข้อมูลทรัพย์สินและวงเงินกู้
                </h2>

                <div className='inline-flex bg-slate-100 p-1 rounded-lg text-[11px] font-medium'>
                  <button
                    onClick={() => setLoanInputMode('direct')}
                    className={`px-2.5 py-1 rounded-md transition ${loanInputMode === 'direct' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600'}`}
                  >
                    กรอกยอดกู้ตรง
                  </button>
                  <button
                    onClick={() => setLoanInputMode('property')}
                    className={`px-2.5 py-1 rounded-md transition ${loanInputMode === 'property' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600'}`}
                  >
                    คำนวณจากราคาบ้าน
                  </button>
                </div>
              </div>

              <div className='space-y-4'>
                {loanInputMode === 'direct' ? (
                  <div>
                    <label className='text-xs font-bold text-slate-700 block mb-1'>
                      ยอดขอกู้สุทธิ (Net Loan Amount) ⭐
                    </label>
                    <div className='relative'>
                      <input
                        type='number'
                        inputMode='numeric'
                        value={loanAmount}
                        onChange={e => handleDirectLoanChange(Number(e.target.value))}
                        className='w-full px-4 py-3 text-base md:text-lg font-extrabold bg-blue-50/50 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-blue-900 min-h-[48px]'
                      />
                      <span className='absolute right-4 top-3.5 text-xs font-bold text-blue-600'>บาท</span>
                    </div>
                    <div className='flex gap-2 mt-2'>
                      {[2000000, 3000000, 4000000, 5000000].map(val => (
                        <button
                          key={val}
                          type='button'
                          onClick={() => handleDirectLoanChange(val)}
                          className='px-2 py-1 rounded-md text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium'
                        >
                          {(val / 1000000).toFixed(0)}M
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    <div>
                      <div className='flex justify-between text-xs mb-1'>
                        <label className='font-medium text-slate-700'>ราคาบ้าน / คอนโด</label>
                        <span className='font-bold text-blue-600'>{propertyPrice.toLocaleString()} ฿</span>
                      </div>
                      <input
                        type='range'
                        min={500000}
                        max={20000000}
                        step={100000}
                        value={propertyPrice}
                        onChange={e => handlePropertyChange(Number(e.target.value), downPaymentAmount)}
                        className='w-full h-2 bg-slate-200 rounded-lg cursor-pointer accent-blue-600'
                      />
                    </div>

                    <div className='grid grid-cols-2 gap-3'>
                      <div>
                        <label className='text-xs font-medium text-slate-600 block mb-1'>เงินดาวน์ ({downPaymentPercent}%)</label>
                        <input
                          type='number'
                          inputMode='numeric'
                          value={downPaymentAmount}
                          onChange={e => handlePropertyChange(propertyPrice, Number(e.target.value))}
                          className='w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg min-h-[44px]'
                        />
                      </div>
                      <div>
                        <label className='text-xs font-medium text-slate-600 block mb-1'>ยอดกู้สุทธิ</label>
                        <div className='w-full px-3 py-2.5 text-sm bg-blue-50 border border-blue-200 rounded-lg font-bold text-blue-900 flex items-center min-h-[44px]'>
                          {loanAmount.toLocaleString()} ฿
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ระยะเวลาและอายุ (Default: 30 ปี, ดาวน์ 0) */}
                <div className='grid grid-cols-2 gap-3 pt-2 border-t border-slate-100'>
                  <div>
                    <label className='text-xs font-medium text-slate-600 block mb-1'>ระยะเวลาผ่อน (ปี)</label>
                    <select
                      value={loanTermYears}
                      onChange={e => setLoanTermYears(Number(e.target.value))}
                      className='w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]'
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
                      inputMode='numeric'
                      min={20}
                      max={65}
                      value={borrowerAge}
                      onChange={e => setBorrowerAge(Number(e.target.value))}
                      className='w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden min-h-[44px]'
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Banks & Custom Offers */}
            <div className='bg-white rounded-2xl p-5 md:p-6 border border-slate-200 shadow-xs'>
              <div className='flex items-center justify-between mb-3'>
                <h2 className='text-base font-bold text-slate-900 flex items-center gap-2'>
                  <span className='w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold'>2</span>
                  เลือกธนาคารเปรียบเทียบ
                </h2>
                <button
                  type='button'
                  onClick={handleOpenNewAdvancedOffer}
                  className='inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition min-h-[36px]'
                >
                  <Plus className='w-3.5 h-3.5' /> ➕ เพิ่มข้อเสนอจริง (Advanced)
                </button>
              </div>

              {/* Standard Bank Chips */}
              <div className='flex flex-wrap gap-2 mb-4'>
                {banks.map(bank => {
                  const isSelected = selectedBankIds.includes(bank.id);
                  return (
                    <button
                      key={bank.id}
                      onClick={() => toggleBank(bank.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 border min-h-[40px] ${
                        isSelected 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: bank.color }} />
                      {bank.nameTh.replace('ธนาคาร', '')}
                    </button>
                  );
                })}

                {/* Custom Offer Chips */}
                {customOffers.map(offer => {
                  const isSelected = selectedBankIds.includes(offer.id);
                  return (
                    <div key={offer.id} className='inline-flex items-center rounded-xl border border-indigo-200 overflow-hidden shadow-xs'>
                      <button
                        onClick={() => toggleBank(offer.id)}
                        className={`px-3 py-2 text-xs font-bold transition flex items-center gap-1.5 min-h-[40px] ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700'
                        }`}
                      >
                        <Sparkles className='w-3 h-3' />
                        {offer.bankName}
                      </button>
                      <button
                        type='button'
                        onClick={() => handleEditAdvancedOffer(offer)}
                        title='แก้ไขข้อเสนอ'
                        className='px-2 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition min-h-[40px]'
                      >
                        <Edit3 className='w-3.5 h-3.5' />
                      </button>
                      <button
                        type='button'
                        onClick={() => handleDeleteCustomOffer(offer.id)}
                        title='ลบข้อเสนอ'
                        className='px-2 py-2 bg-indigo-50 hover:bg-rose-100 text-rose-500 transition min-h-[40px]'
                      >
                        <Trash2 className='w-3.5 h-3.5' />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Bank Program Selectors */}
              <div className='space-y-3 pt-2 border-t border-slate-100'>
                {selectedBankIds.map(bankId => {
                  const custom = customOffers.find(o => o.id === bankId);
                  if (custom) {
                    return (
                      <div key={custom.id} className='p-3 bg-indigo-50/70 rounded-xl border border-indigo-200'>
                        <div className='flex items-center justify-between'>
                          <span className='text-xs font-bold text-indigo-950 flex items-center gap-1'>
                            <Sparkles className='w-3.5 h-3.5 text-indigo-600' /> {custom.bankName} (กำหนดเอง)
                          </span>
                          <span className='text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full'>
                            ปี 1-3 เฉลี่ย {((custom.rateYear1 + custom.rateYear2 + custom.rateYear3) / 3).toFixed(2)}%
                          </span>
                        </div>
                        <div className='text-[11px] text-indigo-700 mt-1'>
                          ปี 1: {custom.rateYear1}%, ปี 2: {custom.rateYear2}%, ปี 3: {custom.rateYear3}%, ปี 4+: {custom.rateYear4PlusType === 'fixed' ? `${custom.rateYear4PlusFixed}%` : `${custom.rateYear4PlusBase} ${custom.rateYear4PlusSpread >= 0 ? '+' : ''}${custom.rateYear4PlusSpread}%`}
                        </div>
                      </div>
                    );
                  }

                  const bank = banks.find(b => b.id === bankId);
                  if (!bank) return null;
                  return (
                    <div key={bank.id} className='p-3 bg-slate-50 rounded-xl border border-slate-200'>
                      <div className='flex items-center justify-between mb-1'>
                        <span className='text-xs font-bold text-slate-800 flex items-center gap-1.5'>
                          <span className='w-2 h-2 rounded-full' style={{ backgroundColor: bank.color }} />
                          {bank.nameTh}
                        </span>
                        <span className='text-[11px] text-slate-500'>MRR: {bank.defaultMRR}%</span>
                      </div>
                      <select
                        value={selectedPrograms[bank.id] || bank.programs[0]?.id}
                        onChange={e => setSelectedPrograms({ ...selectedPrograms, [bank.id]: e.target.value })}
                        className='w-full text-xs py-2 px-2 bg-white border border-slate-200 rounded-lg min-h-[40px]'
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
          <div ref={resultsRef} className='lg:col-span-7 space-y-6'>
            
            {/* Top Tab Switcher & Action Bar */}
            <div className='flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs'>
              <div className='flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl'>
                <button
                  type='button'
                  onClick={() => setResultsTab('custom')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 min-h-[40px] ${
                    resultsTab === 'custom'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className='w-3.5 h-3.5 text-indigo-600' />
                  <span>ข้อเสนอจริงของฉัน</span>
                  {customOffers.length > 0 && (
                    <span className='ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-extrabold'>
                      {customOffers.length}
                    </span>
                  )}
                </button>

                <button
                  type='button'
                  onClick={() => setResultsTab('standard')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 min-h-[40px] ${
                    resultsTab === 'standard'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className='w-3.5 h-3.5 text-blue-600' />
                  <span>ธนาคารทั่วไป (Market Standards)</span>
                  <span className='ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-extrabold'>
                    {banks.length}
                  </span>
                </button>
              </div>

              {customOffers.length > 0 && (
                <button
                  type='button'
                  onClick={() => setIsNegotiationModalOpen(true)}
                  className='inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition min-h-[40px]'
                >
                  <Printer className='w-3.5 h-3.5' />
                  <span>ใบเจรจาดอกเบี้ย (Negotiation Sheet)</span>
                </button>
              )}
            </div>

            {/* TAB CONTENT: ข้อเสนอจริงของฉัน (CUSTOM OFFERS) */}
            {resultsTab === 'custom' && (
              <div className='space-y-6'>
                {customOffers.length === 0 ? (
                  /* Empty State */
                  <div className='bg-white rounded-3xl p-8 border-2 border-dashed border-indigo-200 text-center space-y-4 shadow-xs'>
                    <div className='w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center'>
                      <Sparkles className='w-7 h-7' />
                    </div>
                    <div className='max-w-md mx-auto'>
                      <h3 className='text-base font-bold text-slate-900'>ยังไม่มีข้อเสนอจริงที่คุณบันทึกไว้</h3>
                      <p className='text-xs text-slate-500 mt-1'>
                        คุณได้รับเอกสารข้อเสนอจากธนาคารมาแล้วใช่ไหม? บันทึกแยกวงเงินกู้บ้าน & MRTA ค่างวดเรียกเก็บจริง และแผนผ่อนโปะ เพื่อคำนวณต้นทุนสุทธิแท้จริง 3 ปีแรก (True Net Cost) ได้ทันที
                      </p>
                    </div>
                    <div className='flex flex-wrap justify-center gap-3 pt-2'>
                      <button
                        type='button'
                        onClick={handleOpenNewAdvancedOffer}
                        className='px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5 min-h-[44px]'
                      >
                        <Plus className='w-4 h-4' /> สร้างข้อเสนอจริงใหม่
                      </button>
                      <button
                        type='button'
                        onClick={handleSeedSampleOffers}
                        className='px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 min-h-[44px]'
                      >
                        <Sparkles className='w-4 h-4 text-indigo-600' /> โหลด 2 ตัวอย่างข้อเสนอจริงมาทดลอง
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Top Action & Sub-heading */}
                    <div className='flex items-center justify-between'>
                      <div className='text-xs text-slate-600 font-medium'>
                        กำลังเปรียบเทียบ <span className='font-bold text-indigo-700'>{customOffers.length}</span> ข้อเสนอเฉพาะคุณ
                      </div>
                      <button
                        type='button'
                        onClick={handleOpenNewAdvancedOffer}
                        className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition min-h-[38px]'
                      >
                        <Plus className='w-3.5 h-3.5' /> เพิ่มข้อเสนออีก
                      </button>
                    </div>

                    {/* Best Pick 3-Year Focus Banner */}
                    {bestCustomPick && (
                      <div className='bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden'>
                        <div className='absolute -right-6 -bottom-6 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none' />
                        
                        <div className='flex items-center justify-between mb-3'>
                          <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold'>
                            <CheckCircle2 className='w-3.5 h-3.5 text-emerald-400' />
                            คุ้มค่าที่สุดในรอบ 3 ปีแรก (Best Pick 3-Year True Net Cost)
                          </div>
                          {bestCustomPick.offer.lockInYears >= 5 ? (
                            <span className='px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-[11px] font-bold flex items-center gap-1'>
                              <AlertTriangle className='w-3 h-3' /> ห้ามรีไฟแนนซ์ {bestCustomPick.offer.lockInYears} ปี
                            </span>
                          ) : (
                            <span className='px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-medium text-slate-300'>
                              รีไฟแนนซ์ได้หลังปี 3
                            </span>
                          )}
                        </div>

                        <h3 className='text-xl md:text-2xl font-black tracking-tight text-white mb-1'>
                          {bestCustomPick.offer.bankName}
                        </h3>
                        <p className='text-xs text-indigo-200 mb-4 line-clamp-1'>
                          {bestCustomPick.offer.notes || 'วิเคราะห์เปรียบเทียบด้วยเงื่อนไขจริง แยกวงเงินบ้าน & MRTA'}
                        </p>

                        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-indigo-700/50'>
                          <div className='bg-white/5 rounded-xl p-3 border border-white/10'>
                            <div className='text-[11px] text-indigo-200 font-medium'>
                              {bestCustomPick.interest3YearsMRTA > 0 ? 'ดอกเบี้ย 3 ปีแรก (บ้าน + MRTA)' : 'ดอกเบี้ย 3 ปีแรก'}
                            </div>
                            <div className='text-lg font-black text-white'>
                              {bestCustomPick.interest3YearsTotal.toLocaleString()} <span className='text-xs font-normal text-indigo-300'>฿</span>
                            </div>
                            <div className='text-[10px] text-indigo-300 mt-0.5'>
                              {bestCustomPick.interest3YearsMRTA > 0
                                ? `บ้าน: ${bestCustomPick.interest3YearsHome.toLocaleString()} | MRTA: ${bestCustomPick.interest3YearsMRTA.toLocaleString()}`
                                : `วงเงินกู้บ้าน ${bestCustomPick.offer.homeLoan.loanAmount.toLocaleString()} ฿`}
                            </div>
                          </div>

                          <div className='bg-white/5 rounded-xl p-3 border border-white/10'>
                            <div className='text-[11px] text-indigo-200 font-medium'>ผ่อนเฉลี่ยรายเดือน (3 ปีแรก)</div>
                            <div className='text-lg font-black text-emerald-400'>
                              {bestCustomPick.monthlyPaymentFirst3YearsAvg.toLocaleString()} <span className='text-xs font-normal text-indigo-300'>฿/ด.</span>
                            </div>
                            <div className='text-[10px] text-indigo-300 mt-0.5'>
                              {bestCustomPick.offer.prepayment && bestCustomPick.offer.prepayment.enabled !== false && bestCustomPick.offer.prepayment.mode === 'target_monthly' ? 'รวมยอดตั้งใจผ่อนโปะแล้ว' : 'ผ่อนตามเรียกเก็บ'}
                            </div>
                          </div>

                          <div className='bg-amber-400/10 rounded-xl p-3 border border-amber-400/30'>
                            <div className='text-[11px] text-amber-200 font-bold'>ต้นทุนสุทธิแท้จริง 3 ปี (True Net Cost)</div>
                            <div className='text-lg font-black text-amber-300'>
                              {bestCustomPick.trueNetCost3Years.toLocaleString()} <span className='text-xs font-normal text-amber-200'>฿</span>
                            </div>
                            <div className='text-[10px] text-amber-200/80 mt-0.5'>
                              หักของแถม {bestCustomPick.totalPerksValue.toLocaleString()} ฿ แล้ว
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Smart Prepayment Advisory & Lock-in Alerts */}
                    {bestCustomPick?.advisories && bestCustomPick.advisories.length > 0 && (
                      <div className='bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-xs space-y-2'>
                        <div className='flex items-center gap-2 text-xs font-bold text-amber-900'>
                          <Lightbulb className='w-4 h-4 text-amber-600' />
                          คำแนะนำกลยุทธ์การผ่อนชำระ & ข้อควรระวัง (Smart Advisory)
                        </div>
                        <div className='space-y-1.5 pl-6'>
                          {bestCustomPick.advisories.map((adv, i) => (
                            <div key={i} className='text-xs text-amber-800 leading-relaxed list-disc list-item'>
                              {adv}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cards Grid for Custom Offers */}
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      {advancedCustomResults.map(res => {
                        const isBest = bestCustomPick?.offer.id === res.offer.id;
                        return (
                          <div
                            key={res.offer.id}
                            className={`bg-white rounded-2xl p-5 border transition-all ${
                              isBest 
                                ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' 
                                : 'border-slate-200 shadow-xs hover:border-slate-300'
                            }`}
                          >
                            {/* Card Top */}
                            <div className='flex items-start justify-between gap-2 mb-3'>
                              <div>
                                <div className='flex items-center gap-1.5'>
                                  <span className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: res.offer.color }} />
                                  <h4 className='text-sm font-bold text-slate-900'>{res.offer.bankName}</h4>
                                </div>
                                {res.offer.notes && (
                                  <p className='text-[11px] text-slate-500 line-clamp-1 mt-0.5'>{res.offer.notes}</p>
                                )}
                              </div>
                              
                              <div className='flex items-center gap-1'>
                                <button
                                  type='button'
                                  onClick={() => handleEditAdvancedOffer(res.offer)}
                                  title='แก้ไขข้อเสนอนี้'
                                  className='p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 min-h-[36px]'
                                >
                                  <Edit3 className='w-3.5 h-3.5' />
                                </button>
                                <button
                                  type='button'
                                  onClick={() => handleDuplicateAdvancedOffer(res.offer)}
                                  title='ทำสำเนาข้อเสนอนี้'
                                  className='p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 min-h-[36px]'
                                >
                                  <Copy className='w-3.5 h-3.5' />
                                </button>
                                <button
                                  type='button'
                                  onClick={() => handleDeleteCustomOffer(res.offer.id)}
                                  title='ลบข้อเสนอนี้'
                                  className='p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 min-h-[36px]'
                                >
                                  <Trash2 className='w-3.5 h-3.5' />
                                </button>
                              </div>
                            </div>

                            {/* Lock-in and tags */}
                            <div className='flex flex-wrap items-center gap-1.5 mb-3'>
                              {isBest && (
                                <span className='px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold'>
                                  ⭐ คุ้มค่าที่สุด 3 ปี
                                </span>
                              )}
                              {res.offer.lockInYears >= 5 ? (
                                <span className='px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center gap-1'>
                                  <AlertTriangle className='w-3 h-3' /> ล็อกสัญญา {res.offer.lockInYears} ปี
                                </span>
                              ) : (
                                <span className='px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium'>
                                  สัญญามาตรฐาน {res.offer.lockInYears} ปี
                                </span>
                              )}
                              {res.offer.includeMRTA !== false && res.offer.mrtaLoan ? (
                                res.offer.mrtaLoan.financeWithLoan ? (
                                  <span className='px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-medium'>
                                    กู้เพิ่ม MRTA {(res.offer.mrtaLoan.loanAmount || 0).toLocaleString()} ฿
                                  </span>
                                ) : (
                                  <span className='px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium'>
                                    MRTA จ่ายสด {res.offer.mrtaLoan.totalPremium.toLocaleString()} ฿
                                  </span>
                                )
                              ) : (
                                <span className='px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium'>
                                  ไม่มีประกัน MRTA
                                </span>
                              )}
                            </div>

                            {/* Dual Accounts details */}
                            <div className='bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs text-slate-600 mb-3 border border-slate-100'>
                              <div className='flex justify-between items-center'>
                                <span className='font-semibold text-slate-800'>วงเงินกู้บ้าน</span>
                                <span className='font-bold text-slate-900'>{res.offer.homeLoan.loanAmount.toLocaleString()} ฿ ({res.offer.homeLoan.termYears} ปี)</span>
                              </div>
                              <div className='flex justify-between text-[11px] text-slate-500'>
                                <span>ดอกเบี้ยบ้านเฉลี่ย 3 ปี</span>
                                <span className='font-semibold text-blue-600'>
                                  {((res.offer.homeLoan.rateYear1 + res.offer.homeLoan.rateYear2 + res.offer.homeLoan.rateYear3) / 3).toFixed(2)}%
                                </span>
                              </div>
                              {res.offer.includeMRTA !== false && res.offer.mrtaLoan && res.offer.mrtaLoan.financeWithLoan && (
                                <>
                                  <div className='flex justify-between items-center pt-1 border-t border-slate-200/60'>
                                    <span className='font-semibold text-slate-800'>วงเงินกู้ MRTA</span>
                                    <span className='font-bold text-purple-700'>{(res.offer.mrtaLoan.loanAmount || 0).toLocaleString()} ฿ ({res.offer.mrtaLoan.termYears} ปี)</span>
                                  </div>
                                  <div className='flex justify-between text-[11px] text-slate-500'>
                                    <span>ดอกเบี้ย MRTA เฉลี่ย 3 ปี</span>
                                    <span className='font-semibold text-purple-600'>
                                      {((res.offer.mrtaLoan.rateYear1 + res.offer.mrtaLoan.rateYear2 + res.offer.mrtaLoan.rateYear3) / 3).toFixed(2)}%
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Cost details */}
                            <div className='space-y-1.5 text-xs py-2 border-y border-slate-100 mb-3'>
                              <div className='flex justify-between'>
                                <span className='text-slate-500'>
                                  {res.totalPrincipalMRTA > 0 ? 'ดอกเบี้ย 3 ปีแรก (บ้าน + MRTA)' : 'ดอกเบี้ย 3 ปีแรก'}
                                </span>
                                <span className='font-bold text-rose-600'>{res.interest3YearsTotal.toLocaleString()} ฿</span>
                              </div>
                              <div className='flex justify-between items-baseline'>
                                <span className='text-slate-500'>ผ่อนเฉลี่ย 3 ปีแรก</span>
                                <div className='text-right'>
                                  <span className='font-bold text-slate-900'>{res.monthlyPaymentFirst3YearsAvg.toLocaleString()} ฿/ด.</span>
                                  {res.totalPrincipalMRTA > 0 && res.avg3YearsMrtaMonthly && res.avg3YearsMrtaMonthly > 0 ? (
                                    <div className='text-[10px] text-slate-400 font-normal'>
                                      (บ้าน {res.avg3YearsHomeMonthly?.toLocaleString()} + MRTA {res.avg3YearsMrtaMonthly?.toLocaleString()})
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              <div className='flex justify-between'>
                                <span className='text-slate-500'>ค่าธรรมเนียมที่ผู้กู้จ่ายเอง</span>
                                <span className='font-medium text-slate-700'>{res.borrowerPaidFees.toLocaleString()} ฿</span>
                              </div>
                              {res.totalPerksValue > 0 && (
                                <div className='flex justify-between text-emerald-600'>
                                  <span>สิทธิประโยชน์ & Cashback</span>
                                  <span className='font-bold'>- {res.totalPerksValue.toLocaleString()} ฿</span>
                                </div>
                              )}
                            </div>

                            {/* Prepayment benefits or disabled status */}
                            {res.offer.prepayment && res.offer.prepayment.mode !== 'none' && (
                              <div className='mb-3'>
                                {res.offer.prepayment.enabled !== false ? (
                                  <div className='p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center justify-between gap-2 shadow-2xs'>
                                    <div className='flex items-center gap-1.5'>
                                      <span>💰 ผลการผ่อนโปะ:</span>
                                      <span className='font-bold'>
                                        {res.prepaymentSavingsInterest > 0 
                                          ? `ประหยัด ${res.prepaymentSavingsInterest.toLocaleString()} ฿ (ลด ${res.prepaymentYearsSaved} ปี)`
                                          : 'เปิดคำนวณเงินโปะ'}
                                      </span>
                                    </div>
                                    <button
                                      type='button'
                                      onClick={() => handleTogglePrepayment(res.offer.id)}
                                      title='กดเพื่อปิดแผนโปะชั่วคราว (คำนวณตามสัญญาปกติ)'
                                      className='px-2 py-0.5 rounded-md text-[10px] font-bold bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition whitespace-nowrap cursor-pointer shadow-2xs'
                                    >
                                      ปิดโปะ
                                    </button>
                                  </div>
                                ) : (
                                  <div className='p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between gap-2 shadow-2xs'>
                                    <div className='flex items-center gap-1.5'>
                                      <span className='w-2 h-2 rounded-full bg-slate-400' />
                                      <span className='font-medium text-slate-600'>ปิดแผนโปะไว้ (คำนวณตามสัญญาปกติ)</span>
                                    </div>
                                    <button
                                      type='button'
                                      onClick={() => handleTogglePrepayment(res.offer.id)}
                                      title='กดเพื่อเปิดใช้งานแผนโปะ'
                                      className='px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition whitespace-nowrap cursor-pointer shadow-2xs'
                                    >
                                      เปิดโปะ
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* True Net Cost 3 Years Highlight */}
                            <div className='bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 flex items-baseline justify-between mb-3'>
                              <div>
                                <div className='text-[11px] font-bold text-indigo-900'>ต้นทุนสุทธิแท้จริง 3 ปีแรก</div>
                                <div className='text-[10px] text-indigo-600'>True Net Cost (3 Yrs)</div>
                              </div>
                              <div className='text-right'>
                                <div className='text-lg font-extrabold text-indigo-700'>
                                  {res.trueNetCost3Years.toLocaleString()} <span className='text-xs font-normal'>฿</span>
                                </div>
                              </div>
                            </div>

                            <div className='flex items-center justify-between text-[11px] text-slate-500 pt-1'>
                              <span>ต้นทุนสุทธิตลอดสัญญา:</span>
                              <span className='font-semibold text-slate-800'>{res.trueNetCostLifetime.toLocaleString()} ฿</span>
                            </div>

                            <button
                              type='button'
                              onClick={() => {
                                setSelectedAmortizationOfferId(res.offer.id);
                                setCustomViewMode('monthly');
                              }}
                              className='w-full mt-3 py-2 px-3 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[38px]'
                            >
                              <Calendar className='w-3.5 h-3.5' /> ดูตารางแจกแจงค่างวดรายเดือน
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Granular Comparison Table */}
                    <div className='bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4'>
                      <div className='flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100'>
                        <div>
                          <h3 className='text-sm font-bold text-slate-900 flex items-center gap-2'>
                            <BarChart3 className='w-4 h-4 text-indigo-600' />
                            ตารางวิเคราะห์เปรียบเทียบเชิงลึก (Decision Matrix)
                          </h3>
                          <p className='text-xs text-slate-500 mt-0.5'>
                            {customViewMode === 'annual' 
                              ? 'สรุปดอกเบี้ยและยอดผ่อนแยกรายปี (บ้าน vs MRTA)' 
                              : `ตารางแจกแจงรายงวด (Monthly Amortization Schedule) ของ ${activeAmortizationOffer?.offer.bankName || ''}`
                            }
                          </p>
                        </div>

                        <div className='flex items-center gap-2'>
                          <div className='inline-flex bg-slate-100 p-1 rounded-xl text-xs'>
                            <button
                              type='button'
                              onClick={() => setCustomViewMode('annual')}
                              className={`px-3 py-1.5 rounded-lg font-bold transition min-h-[36px] ${
                                customViewMode === 'annual'
                                  ? 'bg-white text-indigo-700 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              📅 สรุปรายปี (Annual)
                            </button>
                            <button
                              type='button'
                              onClick={() => setCustomViewMode('monthly')}
                              className={`px-3 py-1.5 rounded-lg font-bold transition min-h-[36px] ${
                                customViewMode === 'monthly'
                                  ? 'bg-white text-indigo-700 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              📑 แจกแจงรายงวด (Monthly)
                            </button>
                          </div>

                          {customViewMode === 'annual' && (
                            <button
                              type='button'
                              onClick={() => setShowFullTermCustom(!showFullTermCustom)}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition min-h-[36px] ${
                                showFullTermCustom 
                                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700' 
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {showFullTermCustom ? 'ย่อเหลือ 3 ปี' : 'ขยายเต็มสัญญา'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* ANNUAL VIEW */}
                      {customViewMode === 'annual' && (
                        <div className='space-y-4'>
                          {advancedCustomResults.map(res => (
                            <div key={res.offer.id} className='border border-slate-200 rounded-2xl overflow-hidden'>
                              <div className='bg-slate-50 px-4 py-2.5 flex items-center justify-between border-b border-slate-200'>
                                <span className='font-bold text-xs text-slate-800 flex items-center gap-2'>
                                  <span className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: res.offer.color }} />
                                  {res.offer.bankName}
                                </span>
                                <span className='text-xs font-bold text-indigo-700'>
                                  True Net Cost 3 ปี: {res.trueNetCost3Years.toLocaleString()} ฿
                                </span>
                              </div>
                              <div className='overflow-x-auto'>
                                <table className='w-full text-left text-xs'>
                                  <thead className='bg-slate-100/60 text-slate-600 text-[11px]'>
                                    <tr>
                                      <th className='py-2 px-3 font-semibold'>ระยะเวลา</th>
                                      <th className='py-2 px-3 font-semibold text-right'>ดอกเบี้ยบ้าน</th>
                                      <th className='py-2 px-3 font-semibold text-right'>ดอกเบี้ย MRTA</th>
                                      <th className='py-2 px-3 font-semibold text-right text-rose-600'>รวมดอกเบี้ย</th>
                                      <th className='py-2 px-3 font-semibold text-right'>ผ่อนเรียกเก็บ</th>
                                      <th className='py-2 px-3 font-semibold text-right text-emerald-600'>ยอดโปะเพิ่ม</th>
                                      <th className='py-2 px-3 font-semibold text-right font-bold'>ยอดผ่อนรวม</th>
                                    </tr>
                                  </thead>
                                  <tbody className='divide-y divide-slate-100'>
                                    {(showFullTermCustom ? res.yearlyDetails : res.yearlyDetails.slice(0, 3)).map(yr => (
                                      <tr key={yr.year} className='hover:bg-slate-50/50'>
                                        <td className='py-2 px-3 font-medium text-slate-700'>ปีที่ {yr.year}</td>
                                        <td className='py-2 px-3 text-right text-slate-600'>{Math.round(yr.homeInterest).toLocaleString()}</td>
                                        <td className='py-2 px-3 text-right text-purple-600'>{Math.round(yr.mrtaInterest).toLocaleString()}</td>
                                        <td className='py-2 px-3 text-right font-bold text-rose-600'>{Math.round(yr.totalInterest).toLocaleString()}</td>
                                        <td className='py-2 px-3 text-right text-slate-600'>
                                          <div>{Math.round(yr.totalRegularPayment).toLocaleString()}</div>
                                          {yr.regularMrtaPayment && yr.regularMrtaPayment > 0 ? (
                                            <div className='text-[10px] text-slate-400 font-normal whitespace-nowrap'>
                                              (บ้าน {Math.round(yr.regularHomePayment || 0).toLocaleString()} + MRTA {Math.round(yr.regularMrtaPayment).toLocaleString()})
                                            </div>
                                          ) : null}
                                        </td>
                                        <td className='py-2 px-3 text-right text-emerald-600'>{Math.round(yr.totalPrepayment).toLocaleString()}</td>
                                        <td className='py-2 px-3 text-right font-bold text-slate-900'>{Math.round(yr.totalPaid).toLocaleString()}</td>
                                      </tr>
                                    ))}
                                    {/* 3-Year Summary Row */}
                                    <tr className='bg-indigo-50/50 font-bold text-slate-900 border-t-2 border-indigo-100'>
                                      <td className='py-2.5 px-3 text-indigo-900'>รวม 3 ปีแรก</td>
                                      <td className='py-2.5 px-3 text-right text-slate-800'>{res.interest3YearsHome.toLocaleString()}</td>
                                      <td className='py-2.5 px-3 text-right text-purple-700'>{res.interest3YearsMRTA.toLocaleString()}</td>
                                      <td className='py-2.5 px-3 text-right text-rose-600 font-extrabold'>{res.interest3YearsTotal.toLocaleString()}</td>
                                      <td className='py-2.5 px-3 text-right text-slate-800'>
                                        {Math.round(res.yearlyDetails.slice(0, 3).reduce((s, y) => s + y.totalRegularPayment, 0)).toLocaleString()}
                                      </td>
                                      <td className='py-2.5 px-3 text-right text-emerald-700'>
                                        {Math.round(res.yearlyDetails.slice(0, 3).reduce((s, y) => s + y.totalPrepayment, 0)).toLocaleString()}
                                      </td>
                                      <td className='py-2.5 px-3 text-right text-indigo-900 font-extrabold'>
                                        {Math.round(res.yearlyDetails.slice(0, 3).reduce((s, y) => s + y.totalPaid, 0)).toLocaleString()}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* MONTHLY AMORTIZATION VIEW */}
                      {customViewMode === 'monthly' && (
                        <div className='space-y-4'>
                          <div className='flex flex-wrap items-center justify-between gap-3'>
                            <div className='flex items-center gap-2'>
                              <span className='text-xs font-bold text-slate-700'>เลือกข้อเสนอ:</span>
                              <select
                                value={selectedAmortizationOfferId || customOffers[0]?.id}
                                onChange={e => setSelectedAmortizationOfferId(e.target.value)}
                                className='px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 min-h-[38px]'
                              >
                                {customOffers.map(o => (
                                  <option key={o.id} value={o.id}>{o.bankName}</option>
                                ))}
                              </select>
                            </div>
                            <button
                              type='button'
                              onClick={() => setShowFullTermCustom(!showFullTermCustom)}
                              className='text-xs font-semibold text-indigo-600 hover:text-indigo-800'
                            >
                              {showFullTermCustom ? 'แสดงเฉพาะ 36 งวดแรก (3 ปี)' : 'แสดงครบทุกงวดตลอดสัญญา'}
                            </button>
                          </div>

                          {activeAmortizationOffer ? (
                            <div className='overflow-x-auto max-h-[500px] border border-slate-200 rounded-2xl'>
                              <table className='w-full text-left text-xs'>
                                <thead className='bg-slate-100 text-slate-600 text-[11px] sticky top-0 z-10 shadow-xs'>
                                  <tr>
                                    <th className='py-2.5 px-2.5'>งวด</th>
                                    <th className='py-2.5 px-2.5 text-right'>ผ่อนเรียกเก็บ</th>
                                    <th className='py-2.5 px-2.5 text-right text-emerald-600'>โปะเพิ่ม</th>
                                    <th className='py-2.5 px-2.5 text-right font-bold'>รวมจ่าย</th>
                                    <th className='py-2.5 px-2.5 text-right text-rose-500'>ดอกเบี้ยบ้าน</th>
                                    <th className='py-2.5 px-2.5 text-right text-purple-600'>ดอก MRTA</th>
                                    <th className='py-2.5 px-2.5 text-right text-blue-600'>ตัดต้นบ้าน</th>
                                    <th className='py-2.5 px-2.5 text-right text-purple-700'>ตัดต้น MRTA</th>
                                    <th className='py-2.5 px-2.5 text-right font-bold text-slate-900'>หนี้คงเหลือรวม</th>
                                  </tr>
                                </thead>
                                <tbody className='divide-y divide-slate-100'>
                                  {(showFullTermCustom ? activeAmortizationOffer.monthlySchedule : activeAmortizationOffer.monthlySchedule.slice(0, 36)).map(m => (
                                    <tr key={m.month} className='hover:bg-slate-50/60'>
                                      <td className='py-2 px-2.5 font-medium text-slate-700'>
                                        งวด {m.month} <span className='text-[10px] text-slate-400'>(ปี {m.year})</span>
                                      </td>
                                       <td className='py-2 px-2.5 text-right text-slate-600'>
                                         <div>{Math.round(m.regularPayment).toLocaleString()}</div>
                                         {m.mrtaPayment > 0 && (
                                           <div className='text-[10px] text-slate-400 font-normal whitespace-nowrap'>
                                             (บ้าน {Math.round(m.homePayment).toLocaleString()} + MRTA {Math.round(m.mrtaPayment).toLocaleString()})
                                           </div>
                                         )}
                                       </td>
                                      <td className='py-2 px-2.5 text-right text-emerald-600 font-semibold'>{Math.round(m.prepayment).toLocaleString()}</td>
                                      <td className='py-2 px-2.5 text-right font-bold text-slate-900'>{Math.round(m.totalPayment).toLocaleString()}</td>
                                      <td className='py-2 px-2.5 text-right text-rose-500'>{Math.round(m.homeInterest).toLocaleString()}</td>
                                      <td className='py-2 px-2.5 text-right text-purple-600'>{Math.round(m.mrtaInterest).toLocaleString()}</td>
                                      <td className='py-2 px-2.5 text-right text-blue-600'>{Math.round(m.homePrincipal).toLocaleString()}</td>
                                      <td className='py-2 px-2.5 text-right text-purple-700'>{Math.round(m.mrtaPrincipal).toLocaleString()}</td>
                                      <td className='py-2 px-2.5 text-right font-bold text-slate-900'>{Math.round(m.balanceTotal).toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB CONTENT: ธนาคารทั่วไป (STANDARD BANKS) */}
            {resultsTab === 'standard' && (
              <div className='space-y-6'>
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
                  {calculationResults.map(res => {
                    const bank = banks.find(b => b.id === res.bankId) || banks[0];
                    return (
                      <div 
                        key={res.programId} 
                        className={`bg-white rounded-2xl p-5 border flex flex-col justify-between ${res.isBestPick ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm' : 'border-slate-200'}`}
                      >
                        <div>
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

                        {/* Duplicate to Custom Offer Button */}
                        <button
                          type='button'
                          onClick={() => handleDuplicateBankToCustom(bank)}
                          className='w-full mt-3 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 min-h-[38px]'
                        >
                          <Sparkles className='w-3.5 h-3.5' /> คัดลอกไปปรับแต่งในข้อเสนอของฉัน
                        </button>
                      </div>
                    );
                  })}
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
            )}

          </div>

        </div>
      </main>

      {/* ================= STICKY BOTTOM ACTION BAR (สำหรับ iPhone / Mobile) ================= */}
      {bestResult && (
        <div className='md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 px-4 z-40 flex items-center justify-between shadow-lg'>
          <div>
            <div className='text-[10px] text-slate-400 font-bold uppercase'>ดีที่สุด: {bestResult.bankName}</div>
            <div className='text-sm font-extrabold text-emerald-600'>
              ผ่อน {bestResult.monthlyPaymentFirst3YearsAvg.toLocaleString()} <span className='text-[10px] font-normal text-slate-600'>บ./ด.</span>
            </div>
          </div>
          {mobileTab === 'input' ? (
            <button
              onClick={scrollToResults}
              className='px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 min-h-[44px]'
            >
              ดูเปรียบเทียบผลลัพธ์ <BarChart3 className='w-3.5 h-3.5' />
            </button>
          ) : (
            <button
              onClick={() => setMobileTab('input')}
              className='px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 min-h-[44px]'
            >
              แก้ไขตัวเลข <Sliders className='w-3.5 h-3.5' />
            </button>
          )}
        </div>
      )}

      {/* ================= MODAL: กรอกข้อเสนอขั้นสูง & ข้อเสนอเฉพาะบุคคล ================= */}
      <AdvancedOfferModal
        isOpen={isAdvancedModalOpen}
        onClose={() => setIsAdvancedModalOpen(false)}
        offer={editingAdvancedOffer}
        onSave={handleSaveAdvancedOffer}
        propertyPrice={propertyPrice}
        defaultLoanAmount={loanAmount}
        defaultTermYears={loanTermYears}
      />

      {/* ================= MODAL: ใบเจรจาต่อรองดอกเบี้ยธนาคาร (Print / PDF) ================= */}
      <NegotiationSheetModal
        isOpen={isNegotiationModalOpen}
        onClose={() => setIsNegotiationModalOpen(false)}
        results={advancedCustomResults}
        propertyPrice={propertyPrice}
        loanAmount={loanAmount}
      />

    </div>
  );
}
