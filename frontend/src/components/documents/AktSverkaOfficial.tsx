import React, { useRef } from 'react';
import { Modal, Button, Tag, Divider } from 'antd';
import { Printer, FileText, CheckCircle2, Building, ShieldCheck } from 'lucide-react';
import dayjs from 'dayjs';
import { numberToWordsUz } from '../../utils/numberToWordsUz';

interface AktSverkaOfficialProps {
  visible: boolean;
  onClose: () => void;
  abonent: any;
  aktData: any;
  year?: number;
}

export const AktSverkaOfficial: React.FC<AktSverkaOfficialProps> = ({
  visible,
  onClose,
  abonent,
  aktData,
  year = dayjs().year()
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!abonent) return null;

  const tenantName = aktData?.abonent?.tenant?.name || abonent.tenant?.name || "Suv Ta‘minoti Korxonasi";
  const tenantDirector = abonent.tenant?.directorName || aktData?.abonent?.tenant?.directorName || "Qodirov D.R.";
  const tenantAccountant = abonent.tenant?.accountantName || aktData?.abonent?.tenant?.accountantName || "Soliyev A.N.";
  const buyerName = abonent.fullName || "Iste‘molchi tashkilot";
  const currentBalance = Number(aktData?.summary?.currentBalance ?? abonent.balance ?? 0);
  const totalInvoiced = Number(aktData?.summary?.totalInvoiced ?? 0);
  const totalPaid = Number(aktData?.summary?.totalPaid ?? 0);

  const ledgers = aktData?.ledgers || [];
  const invoices = aktData?.invoices || [];
  const payments = aktData?.payments || [];

  const handlePrint = () => {
    const printContent = document.getElementById('printable-akt-sverka');
    if (!printContent) return;

    const win = window.open('', '', 'width=900,height=800');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Akt-Sverka - ${buyerName} (${year})</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 20px; font-size: 11pt; color: #000; line-height: 1.3; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #000; padding: 4px 6px; font-size: 9pt; }
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
      width={980}
      title={
        <div className="flex items-center justify-between pr-8">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-slate-800 text-base">O‘zaro hisob-kitoblar Solishtirma Dalolatnomasi (Akt-Sverka)</span>
            <Tag color="purple" className="ml-2 font-mono">{year}-yil holatiga</Tag>
          </div>
          <Button icon={<Printer className="w-4 h-4" />} type="primary" onClick={handlePrint}>
            Chop etish (Print / PDF)
          </Button>
        </div>
      }
      footer={[
        <Button key="close" onClick={onClose}>Yopish</Button>,
        <Button key="print" type="primary" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
          Chop etish (PDF)
        </Button>
      ]}
    >
      <div 
        id="printable-akt-sverka" 
        ref={printRef}
        className="bg-white p-6 border border-slate-300 rounded shadow-sm text-slate-900 font-serif"
        style={{ minHeight: '600px', fontSize: '11pt' }}
      >
        {/* Sarlavha */}
        <div className="text-center font-bold text-base mb-1 tracking-wide uppercase">
          O‘ZARO HISOB-KITOBLARNI SOLISHTIRMA DALOLATNOMASI
        </div>
        <div className="text-center font-medium text-xs mb-4 text-slate-700">
          01.01.{year} dan {dayjs().format('DD.MM.YYYY')} gacha bo‘lgan davr uchun
        </div>

        {/* Kirish matni */}
        <div className="text-justify text-xs mb-4 leading-relaxed">
          Biz, quyida imzo chekuvchilar: bir tomondan yetkazib beruvchi <b>"{tenantName}"</b> nomidan Bosh buxgalter _________________ va ikkinchi tomondan iste‘molchi <b>"{buyerName}"</b> (STIR: <span className="font-mono font-bold">{abonent.inn}</span>{abonent.treasuryAccount ? `, G‘aznachilik sh/h: ${abonent.treasuryAccount}` : ''}) nomidan Bosh buxgalter _________________ ushbu dalolatnomani tuzdik, shu haqdakim, tomonlar o‘rtasidagi o‘zaro hisob-kitoblar holati quyidagicha:
        </div>

        {/* 2 tomonlama Buxgalteriya solishtirma jadvali */}
        <table className="w-full border-collapse border border-black text-xs mb-4">
          <thead>
            <tr className="bg-slate-100 font-bold text-center">
              <th className="border border-black p-1 w-10" rowSpan={2}>T/r</th>
              <th className="border border-black p-1 w-24" rowSpan={2}>Sana</th>
              <th className="border border-black p-1" rowSpan={2}>Hujjat nomi va operatsiya mazmuni</th>
              <th className="border border-black p-1" colSpan={2}>"{tenantName}" hisobi bo‘yicha (so‘m)</th>
              <th className="border border-black p-1" colSpan={2}>"{buyerName}" hisobi bo‘yicha (so‘m)</th>
            </tr>
            <tr className="bg-slate-100 font-bold text-center text-[10px]">
              <th className="border border-black p-1 w-24">Debet (Hisoblangan)</th>
              <th className="border border-black p-1 w-24">Kredit (To‘langan)</th>
              <th className="border border-black p-1 w-24">Debet</th>
              <th className="border border-black p-1 w-24">Kredit</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-slate-50 font-bold">
              <td className="border border-black p-1 text-center">—</td>
              <td className="border border-black p-1 text-center">01.01.{year}</td>
              <td className="border border-black p-1">Davr boshiga qoldiq (Boshlang‘ich saldo)</td>
              <td className="border border-black p-1 font-mono text-right">0</td>
              <td className="border border-black p-1 font-mono text-right">0</td>
              <td className="border border-black p-1 font-mono text-right">0</td>
              <td className="border border-black p-1 font-mono text-right">0</td>
            </tr>

            {ledgers.length === 0 ? (
              <tr>
                <td className="border border-black p-2 text-center text-slate-400 italic" colSpan={7}>
                  Ushbu davrda hisoblangan operatsiyalar mavjud emas
                </td>
              </tr>
            ) : (
              ledgers.map((l: any, idx: number) => {
                const isDebit = l.type === 'DEBIT';
                const amt = Number(l.amount || 0);
                return (
                  <tr key={l.id || idx}>
                    <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                    <td className="border border-black p-1 text-center font-mono">{dayjs(l.createdAt).format('DD.MM.YYYY')}</td>
                    <td className="border border-black p-1 text-left">{l.description || 'Xizmat hisob-kitobi'}</td>
                    <td className="border border-black p-1 font-mono text-right font-medium">{isDebit ? amt.toLocaleString() : '—'}</td>
                    <td className="border border-black p-1 font-mono text-right font-medium">{!isDebit ? amt.toLocaleString() : '—'}</td>
                    <td className="border border-black p-1 font-mono text-right text-slate-400">{!isDebit ? amt.toLocaleString() : '—'}</td>
                    <td className="border border-black p-1 font-mono text-right text-slate-400">{isDebit ? amt.toLocaleString() : '—'}</td>
                  </tr>
                );
              })
            )}

            {/* Aylanma jami */}
            <tr className="bg-slate-100 font-bold">
              <td className="border border-black p-1 text-right" colSpan={3}>Davr bo‘yicha aylanma (Jami):</td>
              <td className="border border-black p-1 font-mono text-right">{currentBalance.toLocaleString()}</td>
              <td className="border border-black p-1 font-mono text-right">{totalPaid.toLocaleString()}</td>
              <td className="border border-black p-1 font-mono text-right">{totalPaid.toLocaleString()}</td>
              <td className="border border-black p-1 font-mono text-right">{currentBalance.toLocaleString()}</td>
            </tr>

            {/* Yakuniy saldo */}
            <tr className="bg-amber-50 font-bold">
              <td className="border border-black p-1 text-right text-amber-900" colSpan={3}>
                {dayjs().format('DD.MM.YYYY')} holatiga yakuniy qoldiq (Saldo):
              </td>
              <td className="border border-black p-1 font-mono text-right text-amber-900" colSpan={2}>
                {currentBalance > 0 ? `${currentBalance.toLocaleString()} (Qarzdorlik)` : '0 (To‘liq hisoblashilgan)'}
              </td>
              <td className="border border-black p-1 font-mono text-right text-amber-900" colSpan={2}>
                {currentBalance > 0 ? `${currentBalance.toLocaleString()} (Kreditor qarz)` : '0'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Xulosa matni */}
        <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs mb-6 leading-relaxed">
          <b>XULOSA:</b> {dayjs().format('DD.MM.YYYY')} yil holatiga ko‘ra, <b>"{buyerName}"</b> ning <b>"{tenantName}"</b> oldidagi qarzdorligi <b>{currentBalance.toLocaleString()} so‘m</b> (<span className="underline italic font-medium">{numberToWordsUz(currentBalance)}</span>)ni tashkil etadi.
        </div>

        {/* Tomonlar imzosi va muhr o'rni */}
        <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-slate-300">
          <div>
            <div className="font-bold mb-2">"{tenantName}" nomidan:</div>
            <div className="mb-4">Rahbar: _____________________ ({tenantDirector})</div>
            <div className="mb-6">Bosh buxgalter: _____________________ ({tenantAccountant})</div>
            <div className="border border-dashed border-slate-400 rounded p-4 text-center text-[10px] text-slate-400">
              M.O‘. (Muhr o‘rni)
            </div>
          </div>

          <div>
            <div className="font-bold mb-2">"{buyerName}" nomidan:</div>
            <div className="mb-6">Rahbar: _____________________ (F.I.Sh.)</div>
            <div className="mb-6">Bosh buxgalter: _____________________ (F.I.Sh.)</div>
            <div className="border border-dashed border-slate-400 rounded p-4 text-center text-[10px] text-slate-400">
              M.O‘. (Muhr o‘rni)
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AktSverkaOfficial;
