import React, { useRef, useState } from 'react';
import { Modal, Button, Tag, InputNumber, Divider } from 'antd';
import { Printer, AlertOctagon, Scale, FileWarning } from 'lucide-react';
import dayjs from 'dayjs';
import { numberToWordsUz } from '../../utils/numberToWordsUz';

interface PretenziyaOfficialProps {
  visible: boolean;
  onClose: () => void;
  abonent: any;
  tenantInfo?: any;
}

export const PretenziyaOfficial: React.FC<PretenziyaOfficialProps> = ({
  visible,
  onClose,
  abonent,
  tenantInfo
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [delayDays, setDelayDays] = useState<number>(30);

  if (!abonent) return null;

  const tenantName = tenantInfo?.name || abonent.tenant?.name || "Suv Ta‘minoti Korxonasi";
  const principalDebt = Math.max(0, Number(abonent.balance || 0));
  // 0.1% per day, capped at max 50%
  const penaltyRate = Math.min(50, Number((delayDays * 0.1).toFixed(1)));
  const penaltyAmount = Math.round(principalDebt * (penaltyRate / 100));
  const grandTotal = principalDebt + penaltyAmount;

  const handlePrint = () => {
    const printContent = document.getElementById('printable-pretenziya');
    if (!printContent) return;

    const win = window.open('', '', 'width=900,height=800');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Da‘vo Xati (Pretenziya) - ${abonent.fullName}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 25px; font-size: 11pt; color: #000; line-height: 1.4; }
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
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <span className="font-bold text-slate-800 text-base">Sudgacha Bo‘lgan Rasmiy Da‘vo Xati (Pretenziya)</span>
            <Tag color="error" className="ml-2 font-mono">Penya 0.1%/kun</Tag>
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
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4 text-xs text-amber-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>Kechiktirilgan kunlar soni:</span>
          <InputNumber 
            min={1} 
            max={365} 
            value={delayDays} 
            onChange={(val) => setDelayDays(Number(val) || 1)} 
            className="w-20"
          />
          <span className="font-semibold text-rose-700">Penya stavkasi: {penaltyRate}% ({penaltyAmount.toLocaleString()} UZS)</span>
        </div>
        <Tag color="red" className="font-bold">O‘zR FK 327, 333-moddalari</Tag>
      </div>

      <div 
        id="printable-pretenziya" 
        ref={printRef}
        className="bg-white p-6 border border-slate-300 rounded shadow-sm text-slate-900 font-serif"
        style={{ minHeight: '600px', fontSize: '11pt' }}
      >
        <div className="text-right text-xs mb-4 space-y-1">
          <div className="font-bold">KIMGA: "{abonent.fullName}" rahbari va buxgalteriyasiga</div>
          <div>Manzil: {abonent.mahalla?.name || ''}, {abonent.street?.name || ''}, {abonent.house}-uy</div>
          <div>STIR: <span className="font-mono font-bold">{abonent.inn}</span> | Tel: {abonent.phone || '—'}</div>
        </div>

        <div className="text-left text-xs mb-4 text-slate-600">
          <div>Chiqish xati: № <b>PR-{dayjs().format('YYYYMM')}-{abonent.inn.slice(-4)}</b></div>
          <div>Sana: <b>{dayjs().format('DD.MM.YYYY')} yil</b></div>
        </div>

        <div className="text-center font-bold text-sm mb-1 tracking-wide uppercase">
          MUDDATI O‘TGAN QARZDORLIKNI TO‘LASH VA SHARTNOMA MAJBURIYATLARINI BAJARISH TO‘G‘RISIDA
        </div>
        <div className="text-center font-bold text-base mb-4 tracking-wider uppercase text-rose-900">
          TALABNOMA (PRETENZIYA)
        </div>

        <div className="text-justify text-xs mb-4 leading-relaxed space-y-2">
          <p>
            Siz va <b>"{tenantName}"</b> o‘rtasida tuzilgan {dayjs(abonent.contractDate).format('DD.MM.YYYY')} yildagi № <b>{abonent.contractNumber || '—'}</b>-sonli "Ichimlik suvi ta‘minoti va oqova suvlarni chiqarish xizmatlari ko‘rsatish to‘g‘risida"gi shartnomaga muvofiq, iste‘mol qilingan suv uchun to‘lovlarni o‘z vaqtida amalga oshirish Sizning asosiy shartnomaviy majburiyatingiz hisoblanadi.
          </p>
          <p>
            Biroq, {dayjs().format('DD.MM.YYYY')} yil holatiga o‘tkazilgan billing tekshiruvida Sizning korxonangiz tomonidan to‘lov majburiyatlari qo‘pol ravishda buzilib, <b>{principalDebt.toLocaleString()} so‘m</b> miqdorida muddati o‘tgan asosiy qarzdorlik vujudga kelganligi aniqlandi.
          </p>
          <p>
            O‘zbekiston Respublikasi Fuqarolik Kodeksining 327, 333-moddalari hamda tuzilgan shartnomaning tegishli bandlariga muvofiq, to‘lov muddati kechiktirilgan har bir kun uchun 0.1% miqdorida penya hisoblandi:
          </p>
        </div>

        <table className="w-full border-collapse border border-black text-xs mb-4">
          <thead>
            <tr className="bg-slate-100 font-bold text-center">
              <th className="border border-black p-1.5 w-10">T/r</th>
              <th className="border border-black p-1.5">Talab va to‘lov moddalari</th>
              <th className="border border-black p-1.5 w-28">Hisob-kitob</th>
              <th className="border border-black p-1.5 w-36">Summasi (so‘m)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1.5 text-center">1</td>
              <td className="border border-black p-1.5">Muddati o‘tgan asosiy qarzdorlik (suv va oqova xizmati)</td>
              <td className="border border-black p-1.5 text-center">Asosiy qarz</td>
              <td className="border border-black p-1.5 font-mono text-right font-bold">{principalDebt.toLocaleString()} so‘m</td>
            </tr>
            <tr>
              <td className="border border-black p-1.5 text-center">2</td>
              <td className="border border-black p-1.5">Shartnomaviy penya (kuniga 0.1%)</td>
              <td className="border border-black p-1.5 text-center font-mono">{delayDays} kun x 0.1% ({penaltyRate}%)</td>
              <td className="border border-black p-1.5 font-mono text-right font-bold text-rose-700">{penaltyAmount.toLocaleString()} so‘m</td>
            </tr>
            <tr className="bg-rose-50 font-bold text-rose-950">
              <td className="border border-black p-1.5 text-center">3</td>
              <td className="border border-black p-1.5">TO‘LANISHI SHART BO‘LGAN JAMI SUMMA</td>
              <td className="border border-black p-1.5 text-center">Jami talab</td>
              <td className="border border-black p-1.5 font-mono text-right text-sm">{grandTotal.toLocaleString()} so‘m</td>
            </tr>
          </tbody>
        </table>

        <div className="p-2.5 bg-slate-50 border border-slate-300 rounded text-xs mb-4">
          <b>Talab qilinayotgan summa so‘z bilan:</b> <span className="underline italic font-bold">{numberToWordsUz(grandTotal)}</span>
        </div>

        <div className="text-xs mb-4 space-y-2 font-medium text-slate-800">
          <p className="uppercase text-rose-900 font-bold">YUQORIDAGILARDAN KELIB CHIQIB TALAB QILAMIZ:</p>
          <ol className="list-decimal pl-5 space-y-1 text-slate-700">
            <li>Ushbu talabnoma olingan kundan boshlab <b>10 (o‘n) bank kuni ichida</b> ko‘rsatilgan <b>{grandTotal.toLocaleString()} so‘m</b> qarzdorlikni korxonaning hisob-kitob raqamiga to‘liq to‘lab berishingizni;</li>
            <li>To‘lov amalga oshirilgan to‘lov topshirig‘i nusxasini zudlik bilan taqdim etishingizni.</li>
          </ol>
        </div>

        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-900 mb-6 italic leading-relaxed text-justify">
          <b>OGOHLANTIRISH:</b> Agar belgilangan 10 kunlik muddat ichida qarzdorlik to‘liq qoplanmasa, O‘zbekiston Respublikasi Vazirlar Mahkamasining 194-sonli qaroriga asosan ob‘yektingiz ichimlik suvi ta‘minoti tarmog‘idan <b>majburiy tartibda uziladi</b> hamda qarzdorlik, hisoblangan penya, ko‘rilgan zararlar va davlat bojlari <b>Iqtisodiy sud orqali majburiy tartibda undirib olinadi</b>.
        </div>

        <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-slate-300">
          <div>
            <div className="font-bold mb-2">"{tenantName}" rahbari:</div>
            <div className="mb-4">Rahbar: _____________________ (F.I.Sh.)</div>
            <div className="border border-dashed border-slate-400 rounded p-2 text-center text-[10px] text-slate-400">
              M.O‘. (Muhr o‘rni)
            </div>
          </div>

          <div>
            <div className="font-bold mb-2">Yuriskonsult (Bosh huquqshunos):</div>
            <div className="mb-4">Imzo: _____________________ (F.I.Sh.)</div>
            <div className="text-[10px] text-slate-500 mt-2">
              Da‘vo xati 2 nusxada tuzildi va pochta/kuryer orqali yetkazildi.
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PretenziyaOfficial;
