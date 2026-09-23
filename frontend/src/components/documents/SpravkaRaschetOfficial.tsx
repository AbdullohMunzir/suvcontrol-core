import React, { useRef } from 'react';
import { Modal, Button, Tag } from 'antd';
import { Printer, Landmark, FileText, CheckCircle2 } from 'lucide-react';
import dayjs from 'dayjs';
import { numberToWordsUz } from '../../utils/numberToWordsUz';

interface SpravkaRaschetOfficialProps {
  visible: boolean;
  onClose: () => void;
  abonent: any;
  tenantInfo?: any;
}

export const SpravkaRaschetOfficial: React.FC<SpravkaRaschetOfficialProps> = ({
  visible,
  onClose,
  abonent,
  tenantInfo
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!abonent) return null;

  const tenantName = tenantInfo?.name || abonent.tenant?.name || "Suv Ta‘minoti Korxonasi";
  const limitObj = abonent.AbonentLimits?.[0];
  const annualVolLimit = Number(limitObj?.volumeLimitM3 || 2500);
  const annualAmtLimit = Number(limitObj?.amountLimitUzs || 14000000);
  const actualVol = Number(limitObj?.actualVolumeM3 || 1200);
  const currentMonthVol = 150; // joriy oy hisobi
  const baseTariff = Number(abonent.tariff?.price || 5000);
  const monthBase = Math.round(currentMonthVol * baseTariff);
  const monthVat = Math.round(monthBase * 0.12);
  const monthTotal = monthBase + monthVat;
  const remainingVol = Math.max(0, annualVolLimit - actualVol);
  const remainingAmt = Math.max(0, annualAmtLimit - Math.round(actualVol * baseTariff * 1.12));
  const isOver = actualVol >= annualVolLimit;

  const handlePrint = () => {
    const printContent = document.getElementById('printable-spravka-raschet');
    if (!printContent) return;

    const win = window.open('', '', 'width=900,height=800');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Spravka-Raschet - ${abonent.fullName}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 25px; font-size: 11pt; color: #000; line-height: 1.35; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            th, td { border: 1px solid #000; padding: 6px 8px; font-size: 10pt; }
            th { background-color: #f2f2f2; text-align: center; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            @media print {
              body { margin: 10mm; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body onload="window.print();window.close()">
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      width={900}
      title={
        <div className="flex items-center justify-between pr-8">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-purple-600" />
            <span className="font-bold text-slate-800 text-base">G‘aznachilik (UzASBO) uchun Hisob-kitob Ma‘lumotnomasi</span>
            <Tag color="purple" className="ml-2 font-mono">Справка-расчет</Tag>
          </div>
          <Button icon={<Printer className="w-4 h-4" />} type="primary" onClick={handlePrint} className="bg-purple-600 hover:bg-purple-700">
            Chop etish (Print / PDF)
          </Button>
        </div>
      }
      footer={[
        <Button key="close" onClick={onClose}>Yopish</Button>,
        <Button key="print" type="primary" icon={<Printer className="w-4 h-4" />} onClick={handlePrint} className="bg-purple-600 hover:bg-purple-700">
          Chop etish (PDF)
        </Button>
      ]}
    >
      <div 
        id="printable-spravka-raschet" 
        ref={printRef}
        className="bg-white p-6 border border-slate-300 rounded shadow-sm text-slate-900 font-serif"
        style={{ minHeight: '600px', fontSize: '11pt' }}
      >
        <div className="text-right text-[10px] text-slate-500 mb-2 italic">
          O‘zbekiston Respublikasi Iqtisodiyot va Moliya Vazirligi G‘aznachilik xizmati talablariga muvofiq
        </div>

        <div className="text-center font-bold text-sm mb-1 tracking-wide uppercase">
          MOLIYA VAZIRLIGI G‘AZNACHILIK BO‘LINMASIGA TAQDIM ETILADIGAN
        </div>
        <div className="text-center font-bold text-base mb-1 tracking-wider uppercase text-purple-950">
          SUV ISTE‘MOLI VA TO‘LOVLAR TO‘G‘RISIDA HISOB-KITOB MA‘LUMOTNOMASI (СПРАВКА-РАСЧЕТ)
        </div>
        <div className="text-center font-medium text-xs mb-4 text-slate-600">
          {dayjs().format('YYYY')}-yil {dayjs().format('MMMM')} oyi holatiga
        </div>

        <div className="text-xs mb-4 space-y-1.5 p-3 bg-purple-50/50 border border-purple-100 rounded">
          <div><b>Iste‘molchi (Byudjet tashkiloti):</b> {abonent.fullName}</div>
          <div><b>STIR (INN):</b> <span className="font-mono font-bold">{abonent.inn}</span> | <b>G‘aznachilik 27 xonali sh/h:</b> <span className="font-mono font-bold text-purple-900">{abonent.treasuryAccount || '—'}</span></div>
          <div><b>Xarajatlar moddasi:</b> <span className="font-mono">{abonent.budgetClassifier || '4211100 (Kommunal xizmatlar)'}</span></div>
          <div><b>Shartnoma:</b> № {abonent.contractNumber || '—'} ({dayjs(abonent.contractDate).format('DD.MM.YYYY')} yil)</div>
          <div><b>Yetkazib beruvchi korxona:</b> {tenantName} (STIR: {tenantInfo?.inn || '200123456'})</div>
        </div>

        <table className="w-full border-collapse border border-black text-xs mb-4">
          <thead>
            <tr className="bg-slate-100 font-bold text-center">
              <th className="border border-black p-1.5 w-10">T/r</th>
              <th className="border border-black p-1.5">Ko‘rsatkichlar nomi</th>
              <th className="border border-black p-1.5 w-24">O‘lchov birligi</th>
              <th className="border border-black p-1.5 w-32">Miqdori / Qiymati</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1.5 text-center">1</td>
              <td className="border border-black p-1.5">G‘aznachilikda ro‘yxatga olingan yillik hajm limiti</td>
              <td className="border border-black p-1.5 text-center">m³</td>
              <td className="border border-black p-1.5 font-mono text-right font-bold">{annualVolLimit.toLocaleString()} m³</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">2</td>
              <td className="border border-black p-1.5">G‘aznachilikda ro‘yxatga olingan yillik summa limiti</td>
              <td className="border border-black p-1.5 text-center">so‘m</td>
              <td className="border border-black p-1.5 font-mono text-right font-bold">{annualAmtLimit.toLocaleString()} so‘m</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">3</td>
              <td className="border border-black p-1.5">Yil boshidan amalda iste‘mol qilingan umumiy hajm</td>
              <td className="border border-black p-1.5 text-center">m³</td>
              <td className="border border-black p-1.5 font-mono text-right">{actualVol.toLocaleString()} m³</td>
            </tr>
            <tr className="bg-slate-50 font-bold">
              <td className="border border-black p-1.5 text-center">4</td>
              <td className="border border-black p-1.5">Joriy hisob-kitob oyida iste‘mol qilingan hajm</td>
              <td className="border border-black p-1.5 text-center">m³</td>
              <td className="border border-black p-1.5 font-mono text-right">{currentMonthVol.toLocaleString()} m³</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">5</td>
              <td className="border border-black p-1.5">Amaldagi tarif (1 m³ uchun, QQSsiz)</td>
              <td className="border border-black p-1.5 text-center">so‘m</td>
              <td className="border border-black p-1.5 font-mono text-right">{baseTariff.toLocaleString()} so‘m</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">6</td>
              <td className="border border-black p-1.5">Joriy oy uchun hisoblangan sof qiymat</td>
              <td className="border border-black p-1.5 text-center">so‘m</td>
              <td className="border border-black p-1.5 font-mono text-right">{monthBase.toLocaleString()} so‘m</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">7</td>
              <td className="border border-black p-1.5">Qo‘shilgan qiymat solig‘i (QQS 12%)</td>
              <td className="border border-black p-1.5 text-center">so‘m</td>
              <td className="border border-black p-1.5 font-mono text-right">{monthVat.toLocaleString()} so‘m</td>
            </tr>
            <tr className="bg-purple-50 font-bold text-purple-950">
              <td className="border border-black p-1.5 text-center">8</td>
              <td className="border border-black p-1.5">G‘AZNACHILIK ORQALI TO‘LANISHI LOZIM BO‘LGAN JAMI SUMMA</td>
              <td className="border border-black p-1.5 text-center">so‘m</td>
              <td className="border border-black p-1.5 font-mono text-right text-sm">{monthTotal.toLocaleString()} so‘m</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">9</td>
              <td className="border border-black p-1.5">Yil oxirigacha qolgan hajm limiti zaxirasi</td>
              <td className="border border-black p-1.5 text-center">m³</td>
              <td className={`border border-black p-1.5 font-mono text-right font-bold ${isOver ? 'text-rose-600' : 'text-emerald-700'}`}>
                {remainingVol.toLocaleString()} m³ {isOver ? '(LIMIT TUGAGAN)' : ''}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="p-2.5 bg-slate-50 border border-slate-300 rounded text-xs mb-4">
          <b>To‘lov summasi so‘z bilan:</b> <span className="underline italic font-medium">{numberToWordsUz(monthTotal)}</span>
        </div>

        <div className="text-[11px] text-slate-600 mb-6 italic leading-relaxed text-justify">
          Ushbu ma‘lumotnoma G‘aznachilik xizmati organlariga taqdim etilayotgan elektron hisobvaraq-faktura bilan birga haqiqiy suv iste‘moli hamda tasdiqlangan limit doirasida xarajat qilinganligini tasdiqlash uchun xizmat qiladi.
        </div>

        <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-slate-300">
          <div>
            <div className="font-bold mb-2">SUV TA‘MINOTI KORXONASI:</div>
            <div className="mb-4">Rahbar: _____________________ (F.I.Sh.)</div>
            <div className="mb-4">Bosh buxgalter: _____________________ (F.I.Sh.)</div>
            <div className="border border-dashed border-slate-400 rounded p-2 text-center text-[10px] text-slate-400">
              M.O‘. (Muhr o‘rni)
            </div>
          </div>

          <div>
            <div className="font-bold mb-2">BYUDJET TASHKILOTI:</div>
            <div className="mb-4">Rahbar: _____________________ (F.I.Sh.)</div>
            <div className="mb-4">Bosh buxgalter: _____________________ (F.I.Sh.)</div>
            <div className="border border-dashed border-slate-400 rounded p-2 text-center text-[10px] text-slate-400">
              M.O‘. (Muhr o‘rni)
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SpravkaRaschetOfficial;
