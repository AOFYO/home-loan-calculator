import React from 'react';
import { X, Printer, CheckCircle2, AlertTriangle, ShieldCheck, Gift } from 'lucide-react';
import { AdvancedOfferCalculationResult } from '../types/loan';

interface NegotiationSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: AdvancedOfferCalculationResult[];
  propertyPrice: number;
  loanAmount: number;
}

export const NegotiationSheetModal: React.FC<NegotiationSheetModalProps> = ({
  isOpen,
  onClose,
  results,
  propertyPrice,
  loanAmount
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Find lowest True Net Cost 3 Years
  let lowestCost3Y = Infinity;
  let bestPickId = '';
  results.forEach(r => {
    if (r.trueNetCost3Years < lowestCost3Y) {
      lowestCost3Y = r.trueNetCost3Years;
      bestPickId = r.offerId;
    }
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Explicit Clean Light Card for Print & Screen */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-200 flex flex-col max-h-[95vh] print:max-h-none print:border-none print:shadow-none print:rounded-none overflow-hidden text-slate-900">
        
        {/* Header (No print close button) */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:bg-white print:border-b-2 print:border-slate-800 print:px-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 print:text-black">
              📑 ใบเปรียบเทียบข้อเสนอสินเชื่อเพื่อการเจรจาต่อรอง (Loan Negotiation Sheet)
            </h2>
            <p className="text-xs text-slate-600 print:text-slate-600 font-medium">
              ราคาบ้าน: ฿{propertyPrice.toLocaleString()} | วงเงินกู้: ฿{loanAmount.toLocaleString()} | ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH')}
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ / บันทึก PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto p-6 bg-white print:p-0 print:overflow-visible">
          {results.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              ไม่มีข้อเสนอให้เปรียบเทียบ กรุณาเพิ่มข้อเสนออย่างน้อย 1 รายการ
            </div>
          ) : (
            <div className="border border-slate-200 print:border-slate-300 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 print:bg-slate-100 print:text-black">
                    <th className="p-3 text-left font-bold border-b border-r border-slate-200 w-1/4">
                      หัวข้อเปรียบเทียบ
                    </th>
                    {results.map(r => (
                      <th 
                        key={r.offerId} 
                        className="p-3 text-center font-bold border-b border-r border-slate-200 last:border-r-0"
                        style={{ borderTop: `4px solid ${r.color || '#6366f1'}` }}
                      >
                        <div className="text-sm font-bold text-slate-900 print:text-black">
                          {r.offerName}
                        </div>
                        {r.offerId === bestPickId && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold print:border print:border-emerald-600">
                            🥇 คุ้มค่าที่สุด 3 ปี
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 print:divide-slate-300">
                  {/* วงเงินกู้ */}
                  <tr className="bg-slate-50/60">
                    <td className="p-3 font-semibold text-slate-800 border-r border-slate-200">
                      1. วงเงินกู้ (บ้าน + MRTA)
                    </td>
                    {results.map(r => (
                      <td key={r.offerId} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                        <div className="font-bold text-slate-900 print:text-black">
                          ฿{(r.totalPrincipalHome + r.totalPrincipalMRTA).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          (บ้าน ฿{r.totalPrincipalHome.toLocaleString()} {r.totalPrincipalMRTA > 0 && `+ MRTA ฿${r.totalPrincipalMRTA.toLocaleString()}`})
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* ดอกเบี้ยปีที่ 1 */}
                  <tr>
                    <td className="p-3 font-medium text-slate-800 border-r border-slate-200">
                      2. ดอกเบี้ยปีที่ 1 (บ้าน vs MRTA)
                    </td>
                    {results.map(r => {
                      const y1 = r.yearlyDetails.find(y => y.year === 1);
                      return (
                        <td key={r.offerId} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                          <div className="font-semibold text-indigo-700 print:text-indigo-800">
                            บ้าน: {y1?.homeRate}% | ฿{(y1?.homeInterest || 0).toLocaleString()}
                          </div>
                          {r.totalPrincipalMRTA > 0 && (
                            <div className="text-[11px] text-emerald-700 print:text-emerald-800 font-medium">
                              MRTA: {y1?.mrtaRate}% | ฿{(y1?.mrtaInterest || 0).toLocaleString()}
                            </div>
                          )}
                          <div className="font-bold text-slate-900 mt-0.5">
                            รวมปี 1: ฿{(y1?.totalInterest || 0).toLocaleString()}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* ดอกเบี้ยปีที่ 2 */}
                  <tr>
                    <td className="p-3 font-medium text-slate-800 border-r border-slate-200">
                      3. ดอกเบี้ยปีที่ 2 (บ้าน vs MRTA)
                    </td>
                    {results.map(r => {
                      const y2 = r.yearlyDetails.find(y => y.year === 2);
                      return (
                        <td key={r.offerId} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                          <div className="font-semibold text-indigo-700 print:text-indigo-800">
                            บ้าน: {y2?.homeRate}% | ฿{(y2?.homeInterest || 0).toLocaleString()}
                          </div>
                          {r.totalPrincipalMRTA > 0 && (
                            <div className="text-[11px] text-emerald-700 print:text-emerald-800 font-medium">
                              MRTA: {y2?.mrtaRate}% | ฿{(y2?.mrtaInterest || 0).toLocaleString()}
                            </div>
                          )}
                          <div className="font-bold text-slate-900 mt-0.5">
                            รวมปี 2: ฿{(y2?.totalInterest || 0).toLocaleString()}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* ดอกเบี้ยปีที่ 3 */}
                  <tr>
                    <td className="p-3 font-medium text-slate-800 border-r border-slate-200">
                      4. ดอกเบี้ยปีที่ 3 (บ้าน vs MRTA)
                    </td>
                    {results.map(r => {
                      const y3 = r.yearlyDetails.find(y => y.year === 3);
                      return (
                        <td key={r.offerId} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                          <div className="font-semibold text-indigo-700 print:text-indigo-800">
                            บ้าน: {y3?.homeRate}% | ฿{(y3?.homeInterest || 0).toLocaleString()}
                          </div>
                          {r.totalPrincipalMRTA > 0 && (
                            <div className="text-[11px] text-emerald-700 print:text-emerald-800 font-medium">
                              MRTA: {y3?.mrtaRate}% | ฿{(y3?.mrtaInterest || 0).toLocaleString()}
                            </div>
                          )}
                          <div className="font-bold text-slate-900 mt-0.5">
                            รวมปี 3: ฿{(y3?.totalInterest || 0).toLocaleString()}
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* รวมดอกเบี้ย 3 ปีแรก */}
                  <tr className="bg-indigo-50/80 font-bold">
                    <td className="p-3 text-indigo-900 border-r border-slate-200">
                      ⭐ ดอกเบี้ยรวม 3 ปีแรก
                    </td>
                    {results.map(r => (
                      <td key={r.offerId} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                        <div className="text-sm text-indigo-800 font-bold print:text-indigo-900">
                          ฿{r.interest3YearsTotal.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-600 font-normal">
                          (บ้าน ฿{r.interest3YearsHome.toLocaleString()} + MRTA ฿{r.interest3YearsMRTA.toLocaleString()})
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* ค่างวดผ่อนต่อเดือนเฉลี่ย 3 ปีแรก */}
                  <tr>
                    <td className="p-3 font-medium text-slate-800 border-r border-slate-200">
                      5. ค่างวดผ่อนเฉลี่ย (3 ปีแรก)
                    </td>
                    {results.map(r => (
                      <td key={r.offerId} className="p-3 text-center border-r border-slate-200 last:border-r-0 font-bold text-slate-900">
                        ฿{r.monthlyPaymentAvg3Years.toLocaleString()} /เดือน
                      </td>
                    ))}
                  </tr>

                  {/* โปรโมชัน: ค่าธรรมเนียมที่ธนาคารออกให้ */}
                  <tr>
                    <td className="p-3 font-medium text-slate-800 border-r border-slate-200">
                      6. ฟรีค่าธรรมเนียม (แบงก์ออกให้)
                    </td>
                    {results.map(r => (
                      <td key={r.offerId} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                        <span className="font-semibold text-emerald-700">
                          {r.bankCoveredFeesTotal > 0 ? `+฿${r.bankCoveredFeesTotal.toLocaleString()}` : '-'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* เบี้ยประกันอัคคีภัย */}
                  <tr>
                    <td className="p-3 font-medium text-slate-800 border-r border-slate-200">
                      7. เบี้ยประกันอัคคีภัย (วันโอน)
                    </td>
                    {results.map(r => {
                      const fireFee = r.offer.fees?.fireInsurance;
                      const payer = fireFee?.payer || 'borrower';
                      const defaultFire = Math.round(2000 * (r.offer.homeLoan?.termYears || 30));
                      const amt = fireFee?.customAmount !== undefined ? fireFee.customAmount : defaultFire;
                      return (
                        <td key={r.offerId} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                          {payer === 'bank' ? (
                            <span className="font-semibold text-emerald-700">🎁 ฟรีแบงก์ออกให้</span>
                          ) : (
                            <div>
                              <span className="font-bold text-slate-900">฿{amt.toLocaleString()}</span>
                              <span className="block text-[10px] text-slate-500 font-normal">ผู้กู้จ่ายสด</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* ของแถมและ Cashback */}
                  <tr>
                    <td className="p-3 font-medium text-slate-800 border-r border-slate-200">
                      8. ของแถม / เงินคืน (Cashback)
                    </td>
                    {results.map(r => (
                      <td key={r.offerId} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                        <span className="font-semibold text-emerald-700">
                          {r.totalPerksValue > 0 ? `+฿${r.totalPerksValue.toLocaleString()}` : '-'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* True Net Cost 3 ปีแรก */}
                  <tr className="bg-emerald-50 font-bold border-t-2 border-emerald-500">
                    <td className="p-3 text-emerald-900 border-r border-slate-200">
                      🥇 ต้นทุนสุทธิแท้จริง 3 ปีแรก (True Net Cost)
                      <span className="block text-[10px] font-normal text-slate-600">
                        (ดอกเบี้ย 3 ปี + เบี้ย MRTA + ค่าธรรมเนียมผู้กู้ - ของแถม)
                      </span>
                    </td>
                    {results.map(r => (
                      <td key={r.offerId} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                        <div className="text-base text-emerald-800 print:text-emerald-900 font-extrabold">
                          ฿{r.trueNetCost3Years.toLocaleString()}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* True Net Cost ตลอดสัญญา */}
                  <tr>
                    <td className="p-3 font-medium text-slate-800 border-r border-slate-200">
                      🏁 ต้นทุนสุทธิตลอดสัญญา
                    </td>
                    {results.map(r => (
                      <td key={r.offerId} className="p-3 text-center border-r border-slate-200 last:border-r-0 font-bold text-slate-800">
                        ฿{r.trueNetCostLifetime.toLocaleString()}
                      </td>
                    ))}
                  </tr>

                  {/* เงินสดวันโอน */}
                  <tr>
                    <td className="p-3 font-medium text-slate-800 border-r border-slate-200">
                      9. เงินสดที่ต้องเตรียมวันโอน
                    </td>
                    {results.map(r => (
                      <td key={r.offerId} className="p-3 text-center border-r border-slate-200 last:border-r-0 font-semibold text-slate-800">
                        ฿{r.upfrontCashRequired.toLocaleString()}
                      </td>
                    ))}
                  </tr>

                  {/* เงื่อนไขสัญญา */}
                  <tr className="bg-slate-50/60">
                    <td className="p-3 font-medium text-slate-800 border-r border-slate-200">
                      10. เงื่อนไขสัญญาห้ามรีไฟแนนซ์
                    </td>
                    {results.map(r => (
                      <td key={r.offerId} className="p-3 text-center border-r border-slate-200 last:border-r-0">
                        {r.lockInWarning ? (
                          <span className="inline-flex items-center gap-1 text-amber-800 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>ห้ามรีไฟแนนซ์ 5 ปี</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>3 ปีปกติ</span>
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Print Footer Notice */}
          <div className="mt-6 text-[11px] text-slate-600 border-t border-slate-200 pt-4 print:block">
            * เอกสารนี้จัดทำขึ้นโดยระบบจำลองทางการเงิน HomeLoan Pro TH เพื่อใช้เป็นข้อมูลเปรียบเทียบข้อเสนอสินเชื่อและประกอบการเจรจาต่อรอง อัตราดอกเบี้ยและเงื่อนไขสัญญาขั้นสุดท้ายขึ้นอยู่กับการอนุมัติของแต่ละสถาบันการเงิน
          </div>
        </div>

      </div>
    </div>
  );
};
