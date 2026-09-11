import { BankInfo, MRTACompany, FeeConfig } from '../types/loan';

export const DEFAULT_BANKS: BankInfo[] = [
  {
    id: 'kbank',
    code: '004',
    nameTh: 'ธนาคารกสิกรไทย',
    nameEn: 'Kasikornbank (KBank)',
    color: '#138f2d',
    defaultMRR: 7.30,
    defaultMLR: 7.27,
    defaultMOR: 7.59,
    programs: [
      {
        id: 'kbank-p1',
        bankId: 'kbank',
        name: 'สินเชื่อบ้านกสิกรไทย ดอกเบี้ยคงที่พิเศษ (ทำ MRTA)',
        interestType: 'stepped',
        description: 'ปี 1-3 ดอกเบี้ยคงที่พิเศษ ปีที่ 4 เป็นต้นไป MRR - 1.25%',
        periods: [
          { yearFrom: 1, yearTo: 3, rateType: 'fixed', fixedRate: 3.85 },
          { yearFrom: 4, yearTo: null, rateType: 'floating', baseRateType: 'MRR', spread: -1.25 }
        ]
      },
      {
        id: 'kbank-p2',
        bankId: 'kbank',
        name: 'สินเชื่อบ้านกสิกรไทย อัตราดอกเบี้ยลอยตัวตลอดอายุสัญญา',
        interestType: 'floating',
        description: 'ปี 1-3 MRR - 3.10% หลังจากนั้น MRR - 1.20%',
        periods: [
          { yearFrom: 1, yearTo: 3, rateType: 'floating', baseRateType: 'MRR', spread: -3.10 },
          { yearFrom: 4, yearTo: null, rateType: 'floating', baseRateType: 'MRR', spread: -1.20 }
        ]
      }
    ]
  },
  {
    id: 'scb',
    code: '014',
    nameTh: 'ธนาคารไทยพาณิชย์',
    nameEn: 'Siam Commercial Bank (SCB)',
    color: '#4e2a84',
    defaultMRR: 7.30,
    defaultMLR: 7.05,
    defaultMOR: 7.575,
    programs: [
      {
        id: 'scb-p1',
        bankId: 'scb',
        name: 'สินเชื่อบ้าน SCB ดอกเบี้ยคงที่ 3 ปีแรก',
        interestType: 'stepped',
        description: 'ปี 1-3 ดอกเบี้ยคงที่ 3.90% หลังจากนั้น MRR - 1.25%',
        periods: [
          { yearFrom: 1, yearTo: 3, rateType: 'fixed', fixedRate: 3.90 },
          { yearFrom: 4, yearTo: null, rateType: 'floating', baseRateType: 'MRR', spread: -1.25 }
        ]
      }
    ]
  },
  {
    id: 'ktb',
    code: '006',
    nameTh: 'ธนาคารกรุงไทย',
    nameEn: 'Krungthai Bank (KTB)',
    color: '#00a3e0',
    defaultMRR: 7.57,
    defaultMLR: 7.05,
    defaultMOR: 7.52,
    programs: [
      {
        id: 'ktb-p1',
        bankId: 'ktb',
        name: 'สินเชื่อบ้านกรุงไทย สุขใจ ดอกเบี้ยเฉลี่ย 3 ปีต่ำ',
        interestType: 'stepped',
        description: 'ปีที่ 1: 2.99%, ปีที่ 2: 3.75%, ปีที่ 3: 4.50%, หลังจากนั้น MRR - 1.50%',
        periods: [
          { yearFrom: 1, yearTo: 1, rateType: 'fixed', fixedRate: 2.99 },
          { yearFrom: 2, yearTo: 2, rateType: 'fixed', fixedRate: 3.75 },
          { yearFrom: 3, yearTo: 3, rateType: 'fixed', fixedRate: 4.50 },
          { yearFrom: 4, yearTo: null, rateType: 'floating', baseRateType: 'MRR', spread: -1.50 }
        ]
      }
    ]
  },
  {
    id: 'ghb',
    code: '033',
    nameTh: 'ธนาคารอาคารสงเคราะห์ (ธอส.)',
    nameEn: 'Government Housing Bank (GHB)',
    color: '#f37021',
    defaultMRR: 6.545,
    defaultMLR: 6.50,
    defaultMOR: 6.90,
    programs: [
      {
        id: 'ghb-p1',
        bankId: 'ghb',
        name: 'โครงการบ้าน ธอส. เพื่อสานรัก (ดอกเบี้ยพิเศษ)',
        interestType: 'stepped',
        description: 'ปีที่ 1: 3.00%, ปีที่ 2: 4.00%, ปีที่ 3: MRR - 2.00%, หลังจากนั้น MRR - 1.00%',
        periods: [
          { yearFrom: 1, yearTo: 1, rateType: 'fixed', fixedRate: 3.00 },
          { yearFrom: 2, yearTo: 2, rateType: 'fixed', fixedRate: 4.00 },
          { yearFrom: 3, yearTo: 3, rateType: 'floating', baseRateType: 'MRR', spread: -2.00 },
          { yearFrom: 4, yearTo: null, rateType: 'floating', baseRateType: 'MRR', spread: -1.00 }
        ]
      }
    ]
  },
  {
    id: 'gsb',
    code: '030',
    nameTh: 'ธนาคารออมสิน',
    nameEn: 'Government Savings Bank (GSB)',
    color: '#eb008b',
    defaultMRR: 6.595,
    defaultMLR: 6.90,
    defaultMOR: 6.995,
    programs: [
      {
        id: 'gsb-p1',
        bankId: 'gsb',
        name: 'สินเชื่อเคหะออมสิน กู้บ้านดอกเบี้ยต่ำ',
        interestType: 'stepped',
        description: 'ปี 1-3 เฉลี่ย 3.65% ปีที่ 4 เป็นต้นไป MRR - 1.25%',
        periods: [
          { yearFrom: 1, yearTo: 3, rateType: 'fixed', fixedRate: 3.65 },
          { yearFrom: 4, yearTo: null, rateType: 'floating', baseRateType: 'MRR', spread: -1.25 }
        ]
      }
    ]
  },
  {
    id: 'bay',
    code: '025',
    nameTh: 'ธนาคารกรุงศรีอยุธยา',
    nameEn: 'Bank of Ayudhya (Krungsri)',
    color: '#fec300',
    defaultMRR: 7.40,
    defaultMLR: 7.28,
    defaultMOR: 7.575,
    programs: [
      {
        id: 'bay-p1',
        bankId: 'bay',
        name: 'สินเชื่อบ้านกรุงศรี เพื่อที่อยู่อาศัย',
        interestType: 'stepped',
        description: 'ปี 1-3 ดอกเบี้ยคงที่ 3.75% หลังจากนั้น MRR - 1.35%',
        periods: [
          { yearFrom: 1, yearTo: 3, rateType: 'fixed', fixedRate: 3.75 },
          { yearFrom: 4, yearTo: null, rateType: 'floating', baseRateType: 'MRR', spread: -1.35 }
        ]
      }
    ]
  },
  {
    id: 'bbl',
    code: '002',
    nameTh: 'ธนาคารกรุงเทพ',
    nameEn: 'Bangkok Bank (BBL)',
    color: '#1e3a8a',
    defaultMRR: 7.05,
    defaultMLR: 7.00,
    defaultMOR: 7.55,
    programs: [
      {
        id: 'bbl-p1',
        bankId: 'bbl',
        name: 'สินเชื่อบ้านบัวหลวง ดอกเบี้ยสบายกระเป๋า',
        interestType: 'stepped',
        description: 'ปี 1-3 ดอกเบี้ยคงที่ 3.80% หลังจากนั้น MRR - 1.00%',
        periods: [
          { yearFrom: 1, yearTo: 3, rateType: 'fixed', fixedRate: 3.80 },
          { yearFrom: 4, yearTo: null, rateType: 'floating', baseRateType: 'MRR', spread: -1.00 }
        ]
      }
    ]
  },
  {
    id: 'ttb',
    code: '011',
    nameTh: 'ธนาคารทหารไทยธนชาต (ttb)',
    nameEn: 'TMBThanachart Bank (ttb)',
    color: '#002d62',
    defaultMRR: 7.83,
    defaultMLR: 7.775,
    defaultMOR: 7.775,
    programs: [
      {
        id: 'ttb-p1',
        bankId: 'ttb',
        name: 'สินเชื่อบ้าน ttb ดอกเบี้ยพิเศษเมื่อสมัครพร้อมประกันชีวิตคุ้มครองวงเงิน',
        interestType: 'stepped',
        description: 'ปี 1-3 ดอกเบี้ยคงที่ 3.69% หลังจากนั้น MRR - 1.70%',
        periods: [
          { yearFrom: 1, yearTo: 3, rateType: 'fixed', fixedRate: 3.69 },
          { yearFrom: 4, yearTo: null, rateType: 'floating', baseRateType: 'MRR', spread: -1.70 }
        ]
      }
    ]
  }
];

export const DEFAULT_MRTA_COMPANIES: MRTACompany[] = [
  {
    id: 'aia',
    name: 'AIA Thailand (เอไอเอ)',
    partnerBanks: ['kbank'],
    rates: {
      25: { 10: 25.5, 15: 36.2, 20: 48.0, 25: 62.5, 30: 82.0 },
      30: { 10: 30.0, 15: 42.8, 20: 57.5, 25: 76.0, 30: 98.5 },
      35: { 10: 38.0, 15: 54.5, 20: 74.0, 25: 98.0, 30: 128.0 },
      40: { 10: 51.0, 15: 73.5, 20: 101.0, 25: 135.0, 30: 178.0 },
      45: { 10: 72.0, 15: 105.0, 20: 146.0, 25: 198.0, 30: 260.0 },
      50: { 10: 105.0, 15: 155.0, 20: 218.0, 25: 295.0, 30: 390.0 }
    }
  },
  {
    id: 'muangthai',
    name: 'Muang Thai Life (เมืองไทยประกันชีวิต)',
    partnerBanks: ['kbank', 'ktb'],
    rates: {
      25: { 10: 26.0, 15: 37.0, 20: 49.0, 25: 64.0, 30: 83.5 },
      30: { 10: 31.0, 15: 43.5, 20: 58.5, 25: 77.5, 30: 100.0 },
      35: { 10: 39.0, 15: 55.5, 20: 75.5, 25: 99.5, 30: 130.0 },
      40: { 10: 52.0, 15: 75.0, 20: 103.0, 25: 138.0, 30: 181.0 },
      45: { 10: 74.0, 15: 107.5, 20: 149.0, 25: 202.0, 30: 265.0 },
      50: { 10: 108.0, 15: 159.0, 20: 223.0, 25: 301.0, 30: 398.0 }
    }
  },
  {
    id: 'fwd',
    name: 'FWD Thailand (เอฟดับบลิวดี)',
    partnerBanks: ['scb', 'ttb'],
    rates: {
      25: { 10: 24.8, 15: 35.5, 20: 47.0, 25: 61.2, 30: 80.5 },
      30: { 10: 29.5, 15: 41.8, 20: 56.0, 25: 74.2, 30: 96.5 },
      35: { 10: 37.2, 15: 53.2, 20: 72.5, 25: 96.0, 30: 125.5 },
      40: { 10: 50.0, 15: 72.0, 20: 99.0, 25: 132.5, 30: 174.5 },
      45: { 10: 70.5, 15: 103.0, 20: 143.0, 25: 194.0, 30: 255.0 },
      50: { 10: 103.0, 15: 152.0, 20: 213.0, 25: 289.0, 30: 382.0 }
    }
  },
  {
    id: 'ktaxa',
    name: 'Krungthai-AXA Life (กรุงไทย-แอกซ่า)',
    partnerBanks: ['ktb'],
    rates: {
      25: { 10: 25.8, 15: 36.8, 20: 48.5, 25: 63.2, 30: 82.5 },
      30: { 10: 30.5, 15: 43.0, 20: 58.0, 25: 76.8, 30: 99.0 },
      35: { 10: 38.5, 15: 55.0, 20: 74.8, 25: 98.8, 30: 129.0 },
      40: { 10: 51.5, 15: 74.2, 20: 102.0, 25: 136.5, 30: 179.5 },
      45: { 10: 73.0, 15: 106.0, 20: 147.5, 25: 200.0, 30: 262.5 },
      50: { 10: 106.5, 15: 157.0, 20: 220.0, 25: 298.0, 30: 394.0 }
    }
  },
  {
    id: 'bla',
    name: 'Bangkok Life (กรุงเทพประกันชีวิต)',
    partnerBanks: ['bbl'],
    rates: {
      25: { 10: 25.2, 15: 36.0, 20: 47.8, 25: 62.0, 30: 81.2 },
      30: { 10: 29.8, 15: 42.2, 20: 57.0, 25: 75.5, 30: 97.8 },
      35: { 10: 37.8, 15: 54.0, 20: 73.5, 25: 97.2, 30: 127.0 },
      40: { 10: 50.8, 15: 73.0, 20: 100.5, 25: 134.0, 30: 176.5 },
      45: { 10: 71.5, 15: 104.5, 20: 145.0, 25: 196.5, 30: 258.0 },
      50: { 10: 104.5, 15: 154.0, 20: 216.0, 25: 292.0, 30: 386.0 }
    }
  },
  {
    id: 'azay',
    name: 'Allianz Ayudhya (อลิอันซ์ อยุธยา)',
    partnerBanks: ['bay'],
    rates: {
      25: { 10: 25.0, 15: 35.8, 20: 47.5, 25: 61.8, 30: 81.0 },
      30: { 10: 29.6, 15: 42.0, 20: 56.8, 25: 75.0, 30: 97.2 },
      35: { 10: 37.5, 15: 53.8, 20: 73.0, 25: 96.8, 30: 126.5 },
      40: { 10: 50.5, 15: 72.5, 20: 99.8, 25: 133.5, 30: 175.8 },
      45: { 10: 71.0, 15: 103.8, 20: 144.2, 25: 195.5, 30: 256.8 },
      50: { 10: 104.0, 15: 153.2, 20: 214.8, 25: 290.5, 30: 384.5 }
    }
  }
];

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  mortgageFeeRate: 0.01,    // 1%
  stampDutyRate: 0.0005,    // 0.05%
  transferFeeRate: 0.02,    // 2%
  appraisalFee: 3000,       // 3,000 บาท
  fireInsurancePerYear: 2000 // 2,000 บาท/ปี
};
