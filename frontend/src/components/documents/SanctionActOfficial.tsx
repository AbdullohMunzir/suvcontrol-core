import React, { useRef } from 'react';
import { Modal, Button, Tag, Alert } from 'antd';
import { Printer, ShieldAlert, FileText, CheckCircle2, UserCheck } from 'lucide-react';
import dayjs from 'dayjs';
import { numberToWordsUz } from '../../utils/numberToWordsUz';

interface SanctionActOfficialProps {
  visible: boolean;
  onClose: () => void;
  abonent: any;
  actData: any;
}

export const SanctionActOfficial: React.FC<SanctionActOfficialProps> = ({
  visible,
  onClose,
  abonent,
  actData
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!abonent || !actData) return null;

  const tenantName = abonent.tenant?.name || "Suv Ta‘minoti Korxonasi";
  const actNumber = actData.actNumber || `AKT-${dayjs().format('MMDD')}-001`;
  const actDate = actData.actDate ? dayjs(actData.actDate).format('DD.MM.YYYY') : dayjs().format('DD.MM.YYYY');
  const pipeDiameter = Number(actData.pipeDiameterMm || 25);
  const durationHours = Number(actData.durationHours || 24);
  const velocity = Number(actData.assumedVelocityMps || 1.2);
  const volumeM3 = Number(actData.calculatedVolumeM3 || 0);
  const tariffPrice = Number(actData.tariffPrice || 5000);
  const totalAmount = Number(actData.totalSanctionAmount || 0);
  const vatAmount = Number(actData.vatAmount || 0);
  const baseAmount = totalAmount - vatAmount;
  const reason = actData.reason || "Hisoblagich davlat qiyoslovi muddati o‘tganligi yoki tamg‘a butunligi buzilganligi sababli";
  const inspectorName = actData.inspectorName || "Suv ta‘minoti inspektori";

  const handlePrint = () => {
    const printContent = document.getElementById('printable-sanction-act');
    if (!printContent) return;

    const win = window.open('', '', 'width=900,height=800');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Sanksiya Dalolatnomasi - № ${actNumber}</title>
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
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <span className="font-bold text-slate-800 text-base">Quvur Sanksiyasi Rasmiy Dalolatnomasi</span>
            <Tag color="red" className="ml-2 font-mono">№ {actNumber}</Tag>
          </div>
          <Button icon={<Printer className="w-4 h-4" />} type="primary" danger onClick={handlePrint}>
            Chop etish (Print / PDF)
          </Button>
        </div>
      }
      footer={[
        <Button key="close" onClick={onClose}>Yopish</Button>,
        <Button key="print" type="primary" danger icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
          Chop etish (PDF)
        </Button>
      ]}
    >
      <div 
        id="printable-sanction-act" 
        ref={printRef}
        className="bg-white p-6 border border-slate-300 rounded shadow-sm text-slate-900 font-serif"
        style={{ minHeight: '600px', fontSize: '11pt' }}
      >
        {/* Rasmiy havola */}
        <div className="text-right text-[10px] text-slate-500 mb-2 italic">
          O‘zbekiston Respublikasi Vazirlar Mahkamasining 2014-yil 15-iyuldagi 194-son qarori talablari asosida
        </div>

        {/* Hujjat sarlavhasi */}
        <div className="text-center font-bold text-base mb-1 tracking-wide uppercase">
          ICHIMLIK SUVI TA‘MINOTI QOIDALARINI BUZGANLIK TO‘G‘RISIDA
        </div>
        <div className="text-center font-bold text-lg mb-1 tracking-wider">
          DALOLATNOMA № {actNumber}
        </div>
        <div className="flex justify-between text-xs font-semibold mb-4 px-2">
          <div>Manzil: {abonent.mahalla?.name || "Tuman markazi"}</div>
          <div>Sana: {actDate} yil</div>
        </div>

        {/* Mazmun matni */}
        <div className="text-justify text-xs mb-4 leading-relaxed space-y-2">
          <p>
            Biz, quyida imzo chekuvchilar: <b>"{tenantName}"</b> nazoratchi-inspektori <b>{inspectorName}</b>, 
            bir tomondan, va iste‘molchi <b>"{abonent.fullName}"</b> (STIR: <span className="font-mono font-bold">{abonent.inn}</span>, Shartnoma: № {abonent.contractNumber || '—'}) nomidan mas‘ul vakil ________________________ ikkinchi tomondan, ushbu dalolatnomani tuzdik.
          </p>
          <p>
            O‘tkazilgan texnik ko‘rik va nazorat natijasida iste‘molchi ob‘yektida ichimlik suvi hisobini yuritish qoidalarining buzilganligi aniqlandi:
          </p>
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-900 font-medium">
            <b>Qoidabuzarlik holati:</b> {reason}
          </div>
          <p>
            Vazirlar Mahkamasining amaldagi qoidalariga muvofiq, hisobga olish asbobi yaroqsiz holga kelganda yoki qiyoslov muddati o‘tganda, suv sarfi ulangan suv quvurining to‘liq o‘tkazish qobiliyati va 24 soatlik uzluksiz suv oqimi tezligi (v = 1.2 m/s) bo‘yicha quyidagicha hisoblab chiqildi:
          </p>
        </div>

        {/* Hisob-kitob jadvali */}
        <table className="w-full border-collapse border border-black text-xs mb-4">
          <thead>
            <tr className="bg-slate-100 font-bold text-center">
              <th className="border border-black p-1.5 w-10">T/r</th>
              <th className="border border-black p-1.5">Parametr va hisob-kitob ko‘rsatkichi</th>
              <th className="border border-black p-1.5 w-28">O‘lchov birligi</th>
              <th className="border border-black p-1.5 w-36">Miqdori</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1.5 text-center">1</td>
              <td className="border border-black p-1.5">Ulangan suv quvurining ichki diametri (d)</td>
              <td className="border border-black p-1.5 text-center">mm</td>
              <td className="border border-black p-1.5 font-mono text-right font-bold">{pipeDiameter} mm</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">2</td>
              <td className="border border-black p-1.5">Suv oqimining me‘yoriy harakat tezligi (v)</td>
              <td className="border border-black p-1.5 text-center">m/s</td>
              <td className="border border-black p-1.5 font-mono text-right">{velocity} m/s</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">3</td>
              <td className="border border-black p-1.5">Hisoblangan qoidabuzarlik davri davomiyligi (t)</td>
              <td className="border border-black p-1.5 text-center">soat ({Math.round(durationHours / 24)} kun)</td>
              <td className="border border-black p-1.5 font-mono text-right font-bold">{durationHours} soat</td>
            </tr>
            <tr className="bg-slate-50 font-bold">
              <td className="border border-black p-1.5 text-center">4</td>
              <td className="border border-black p-1.5">Hisoblab chiqarilgan jami suv hajmi (Q)</td>
              <td className="border border-black p-1.5 text-center">m³</td>
              <td className="border border-black p-1.5 font-mono text-right text-rose-700">{volumeM3.toLocaleString()} m³</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">5</td>
              <td className="border border-black p-1.5">Yuridik shaxs uchun amaldagi suv tarifi (QQSsiz)</td>
              <td className="border border-black p-1.5 text-center">so‘m / m³</td>
              <td className="border border-black p-1.5 font-mono text-right">{tariffPrice.toLocaleString()} so‘m</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">6</td>
              <td className="border border-black p-1.5">Suvning sof qiymati (Asosiy summa)</td>
              <td className="border border-black p-1.5 text-center">so‘m</td>
              <td className="border border-black p-1.5 font-mono text-right">{baseAmount.toLocaleString()} so‘m</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">7</td>
              <td className="border border-black p-1.5">Qo‘shilgan qiymat solig‘i (QQS 12%)</td>
              <td className="border border-black p-1.5 text-center">so‘m</td>
              <td className="border border-black p-1.5 font-mono text-right">{vatAmount.toLocaleString()} so‘m</td>
            </tr>
            <tr className="bg-rose-100 font-bold text-rose-950">
              <td className="border border-black p-1.5 text-center">8</td>
              <td className="border border-black p-1.5 uppercase">JAMI UNDIRILADIGAN SANSIYA SUMMASI</td>
              <td className="border border-black p-1.5 text-center">so‘m</td>
              <td className="border border-black p-1.5 font-mono text-right text-sm">{totalAmount.toLocaleString()} so‘m</td>
            </tr>
          </tbody>
        </table>

        {/* Summa so'z bilan */}
        <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs mb-6">
          <b>Undiriladigan summa so‘z bilan:</b> <span className="underline italic font-bold">{numberToWordsUz(totalAmount)}</span>
        </div>

        {/* Ogohlantirish */}
        <div className="text-[11px] text-slate-700 mb-6 italic text-justify leading-normal">
          Ushbu dalolatnoma asosida hisoblangan summa iste‘molchining billing hisobvarag‘iga qarz sifatida kiritildi. Iste‘molchi ushbu to‘lovni 10 (o‘n) bank kuni ichida to‘lashi hamda qoidabuzarlik sababini zudlik bilan bartaraf etib yangi hisoblagich o‘rnatishi shart.
        </div>

        {/* Imzolar */}
        <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-slate-300">
          <div>
            <div className="font-bold mb-2">DALOLATNOMANI TUZDI (INSPEKTOR):</div>
            <div className="mb-4">Inspektor: _________________ / {inspectorName} /</div>
            <div className="border border-dashed border-slate-400 rounded p-3 text-center text-[10px] text-slate-400">
              Imzo va sana
            </div>
          </div>

          <div>
            <div className="font-bold mb-2">DALOLATNOMA BILAN TANISHDI (ISTE‘MOLCHI):</div>
            <div className="mb-4">Iste‘molchi: _________________ / {abonent.fullName} /</div>
            <div className="border border-dashed border-slate-400 rounded p-3 text-center text-[10px] text-slate-400">
              Imzo / Muhr o‘rni
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SanctionActOfficial;
