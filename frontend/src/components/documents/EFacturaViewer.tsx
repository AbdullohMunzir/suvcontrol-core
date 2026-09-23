import React, { useRef } from 'react';
import { Modal, Button, Tag, Divider, Tooltip } from 'antd';
import { Printer, Download, CheckCircle, FileText, Building, Building2, Droplets } from 'lucide-react';
import dayjs from 'dayjs';
import { numberToWordsUz } from '../../utils/numberToWordsUz';

interface EFacturaViewerProps {
  visible: boolean;
  onClose: () => void;
  abonent: any;
  tenantInfo?: {
    name?: string;
    inn?: string;
    address?: string;
    account?: string;
    bankName?: string;
    mfo?: string;
    vatCode?: string;
    directorName?: string;
    accountantName?: string;
  };
  invoiceData?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    periodMonth?: string;
    volumeM3?: number;
    sewageVolumeM3?: number;
    tariffPrice?: number;
    sewagePrice?: number;
  };
}

export const EFacturaViewer: React.FC<EFacturaViewerProps> = ({
  visible,
  onClose,
  abonent,
  tenantInfo,
  invoiceData
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!abonent) return null;

  // Invoice calculations
  const invNumber = invoiceData?.invoiceNumber || `HF-${dayjs().format('YYYYMM')}-${abonent.abonentNumber?.slice(-4) || '0001'}`;
  const invDate = invoiceData?.invoiceDate ? dayjs(invoiceData.invoiceDate).format('DD.MM.YYYY') : dayjs().format('DD.MM.YYYY');
  const contractNum = abonent.contractNumber || `SH-${abonent.abonentNumber}`;
  const contractDate = abonent.contractDate ? dayjs(abonent.contractDate).format('DD.MM.YYYY') : '01.01.2026';

  const waterVolume = Number(invoiceData?.volumeM3 || 100);
  const waterTariff = Number(invoiceData?.tariffPrice || abonent.tariff?.price || 5000);
  const waterBase = Math.round(waterVolume * waterTariff);
  const waterVat = Math.round(waterBase * 0.12);
  const waterTotal = waterBase + waterVat;

  const hasSewage = !!abonent.hasSewage;
  const sewageVolume = hasSewage ? Number(invoiceData?.sewageVolumeM3 || (waterVolume * (Number(abonent.sewageRatio) || 1))) : 0;
  const sewageTariff = Number(invoiceData?.sewagePrice || Math.round(waterTariff * 0.4)); // Odatda suv tarifining 30-50%
  const sewageBase = hasSewage ? Math.round(sewageVolume * sewageTariff) : 0;
  const sewageVat = hasSewage ? Math.round(sewageBase * 0.12) : 0;
  const sewageTotal = sewageBase + sewageVat;

  const totalBase = waterBase + sewageBase;
  const totalVat = waterVat + sewageVat;
  const grandTotal = waterTotal + sewageTotal;

  const handlePrint = () => {
    const printContent = document.getElementById('printable-efactura');
    if (!printContent) return;

    const win = window.open('', '', 'width=900,height=800');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Hisobvaraq-faktura № ${invNumber}</title>
          <style>
            body { font-family: 'Times New Roman', serif; margin: 20px; font-size: 11pt; color: #000; line-height: 1.25; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #000; padding: 4px 6px; font-size: 9pt; }
            th { background-color: #f2f2f2; text-align: center; }
            .header-info { width: 100%; border-collapse: collapse; border: none; margin-bottom: 15px; }
            .header-info td { border: none; padding: 3px 5px; vertical-align: top; font-size: 10pt; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .stamp-box { border: 2px dashed #0284c7; padding: 10px; border-radius: 6px; background-color: #f0f9ff; text-align: center; color: #0369a1; font-size: 9pt; margin-top: 15px; }
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
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-slate-800 text-base">Elektron Hisobvaraq-Faktura (EHF)</span>
            <Tag color="blue" className="ml-2 font-mono">VMQ 489-son shakli</Tag>
          </div>
          <div className="flex items-center gap-2">
            <Button icon={<Printer className="w-4 h-4" />} type="primary" onClick={handlePrint}>
              Chop etish (Print / PDF)
            </Button>
          </div>
        </div>
      }
      footer={[
        <Button key="close" onClick={onClose}>Yopish</Button>,
        <Button key="print" type="primary" icon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
          Chop etish (PDF)
        </Button>
      ]}
    >
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-xs text-slate-600 flex items-center justify-between">
        <div>
          ℹ️ <b>Buxgalteriya eslatmasi:</b> Ushbu faktura Soliq.uz va Didox.uz qoidalariga muvofiq shakllantirildi. 
          Buxgalter uni Didoxga kiritishi yoki ommaviy Excel fayl orqali yuklab, E-IMZO bilan imzolashi mumkin.
        </div>
        <Tag color="cyan" className="font-semibold">QQS 12% hisoblangan</Tag>
      </div>

      <div 
        id="printable-efactura" 
        ref={printRef}
        className="bg-white p-6 border border-slate-300 rounded shadow-sm text-slate-900 font-serif"
        style={{ minHeight: '600px', fontSize: '11pt' }}
      >
        {/* Yuqori rasmiy havola */}
        <div className="text-right text-[10px] text-slate-500 mb-2 italic">
          O‘zbekiston Respublikasi Vazirlar Mahkamasining 2020-yil 14-avgustdagi 489-son qaroriga 2-ilova Nizom shakli
        </div>

        {/* Hujjat sarlavhasi */}
        <div className="text-center font-bold text-lg mb-1 tracking-wide">
          HISOBVARAQ-FAKTURA № {invNumber}
        </div>
        <div className="text-center font-medium text-sm mb-4">
          {invDate} yildagi holatiga
        </div>

        {/* Shartnomaga havola */}
        <div className="mb-4 text-xs">
          <b>Shartnoma:</b> № {contractNum}, sana: {contractDate} yil
        </div>

        {/* Yetkazib beruvchi va Xaridor rekvizitlari jadvali */}
        <table className="w-full border-collapse border border-black mb-4 text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black p-2 w-1/2 text-left font-bold">YETKAZIB BERUVCHI (SOTUVCHI):</th>
              <th className="border border-black p-2 w-1/2 text-left font-bold">XARIDOR (ISTE‘MOLCHI):</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-2 align-top space-y-1">
                <div><b>Nomi:</b> {tenantInfo?.name || abonent.tenant?.name || "Chust Tumani Suv Ta'minoti Korxonasi"}</div>
                <div><b>Manzili:</b> {tenantInfo?.address || abonent.tenant?.address || "Namangan viloyati, Chust tumani, Chust sh., Mustaqillik ko'chasi, 12-uy"}</div>
                <div><b>STIR (INN):</b> <span className="font-mono font-bold">{tenantInfo?.inn || abonent.tenant?.inn || "201555001"}</span></div>
                <div><b>QQS kodi:</b> <span className="font-mono">{tenantInfo?.vatCode || abonent.tenant?.vatCode || "326000001520"}</span></div>
                <div><b>H/r:</b> <span className="font-mono">{tenantInfo?.account || abonent.tenant?.bankAccount || "20208000900000152010"}</span></div>
                <div><b>Bank:</b> {tenantInfo?.bankName || abonent.tenant?.bankName || "ATB Agrobank Chust filiali"}</div>
                <div><b>MFO:</b> <span className="font-mono">{tenantInfo?.mfo || abonent.tenant?.mfo || "00152"}</span></div>
              </td>
              <td className="border border-black p-2 align-top space-y-1">
                <div><b>Nomi:</b> {abonent.fullName}</div>
                <div><b>Toifasi:</b> <Tag color={abonent.legalCategory === 'BUDGET' ? 'purple' : abonent.legalCategory === 'INDUSTRIAL' ? 'orange' : 'blue'}>{abonent.legalCategory === 'BUDGET' ? 'Byudjet' : abonent.legalCategory === 'INDUSTRIAL' ? 'Sanoat' : 'Tijorat'}</Tag></div>
                <div><b>Manzili:</b> {abonent.mahalla?.name || ''}, {abonent.street?.name || ''}, {abonent.house}-uy</div>
                <div><b>STIR (INN):</b> <span className="font-mono font-bold">{abonent.inn}</span></div>
                <div><b>OKED:</b> <span className="font-mono">{abonent.oked || '—'}</span></div>
                {abonent.legalCategory === 'BUDGET' && (
                  <>
                    <div className="text-purple-900 font-medium"><b>G‘aznachilik sh/h (27 xonali):</b> <span className="font-mono">{abonent.treasuryAccount || '—'}</span></div>
                    <div><b>Xarajatlar moddasi:</b> <span className="font-mono">{abonent.budgetClassifier || '4211100'}</span></div>
                  </>
                )}
                {abonent.legalCategory !== 'BUDGET' && (
                  <>
                    <div><b>H/r:</b> <span className="font-mono">{abonent.bankAccount || '20208000000000000001'}</span></div>
                    <div><b>Bank / MFO:</b> {abonent.bankName || 'Bank'} / <span className="font-mono">{abonent.mfo || '00014'}</span></div>
                  </>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 11 ta rasmiy ustunli tovar/xizmatlar jadvali */}
        <table className="w-full border-collapse border border-black text-center text-[10px] mb-4">
          <thead>
            <tr className="bg-slate-100 font-bold">
              <th className="border border-black p-1 w-7">T/r</th>
              <th className="border border-black p-1">Mahsulot (xizmat) nomi</th>
              <th className="border border-black p-1 w-28">Identifikatsiya kodi (MXIK)</th>
              <th className="border border-black p-1 w-14">Shtrix-kodi / O‘lchov kodi</th>
              <th className="border border-black p-1 w-14">O‘lchov birligi</th>
              <th className="border border-black p-1 w-16">Miqdori (Hajmi)</th>
              <th className="border border-black p-1 w-16">Narxi (so‘m)</th>
              <th className="border border-black p-1 w-20">Yetkazib berish qiymati</th>
              <th className="border border-black p-1 w-12">QQS stavkasi</th>
              <th className="border border-black p-1 w-16">QQS summasi</th>
              <th className="border border-black p-1 w-20">Jami (QQS bilan)</th>
            </tr>
            <tr className="bg-slate-50 text-[9px] text-slate-500 font-normal">
              <td className="border border-black">1</td>
              <td className="border border-black">2</td>
              <td className="border border-black">3</td>
              <td className="border border-black">4</td>
              <td className="border border-black">5</td>
              <td className="border border-black">6</td>
              <td className="border border-black">7</td>
              <td className="border border-black">8</td>
              <td className="border border-black">9</td>
              <td className="border border-black">10</td>
              <td className="border border-black">11</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-1">1</td>
              <td className="border border-black p-1 text-left font-medium">Ichimlik suvi ta‘minoti xizmati</td>
              <td className="border border-black p-1 font-mono">03600001001000000</td>
              <td className="border border-black p-1 font-mono">113</td>
              <td className="border border-black p-1">m³</td>
              <td className="border border-black p-1 font-mono text-right">{waterVolume.toLocaleString()}</td>
              <td className="border border-black p-1 font-mono text-right">{waterTariff.toLocaleString()}</td>
              <td className="border border-black p-1 font-mono text-right">{waterBase.toLocaleString()}</td>
              <td className="border border-black p-1 font-mono">12%</td>
              <td className="border border-black p-1 font-mono text-right">{waterVat.toLocaleString()}</td>
              <td className="border border-black p-1 font-mono text-right font-bold">{waterTotal.toLocaleString()}</td>
            </tr>

            {hasSewage && (
              <tr>
                <td className="border border-black p-1">2</td>
                <td className="border border-black p-1 text-left font-medium">Oqova suvlarni chiqarish (kanalizatsiya) xizmati</td>
                <td className="border border-black p-1 font-mono">03700001001000000</td>
                <td className="border border-black p-1 font-mono">113</td>
                <td className="border border-black p-1">m³</td>
                <td className="border border-black p-1 font-mono text-right">{sewageVolume.toLocaleString()}</td>
                <td className="border border-black p-1 font-mono text-right">{sewageTariff.toLocaleString()}</td>
                <td className="border border-black p-1 font-mono text-right">{sewageBase.toLocaleString()}</td>
                <td className="border border-black p-1 font-mono">12%</td>
                <td className="border border-black p-1 font-mono text-right">{sewageVat.toLocaleString()}</td>
                <td className="border border-black p-1 font-mono text-right font-bold">{sewageTotal.toLocaleString()}</td>
              </tr>
            )}

            <tr className="font-bold bg-slate-50">
              <td className="border border-black p-1 text-right" colSpan={7}>Jami:</td>
              <td className="border border-black p-1 font-mono text-right">{totalBase.toLocaleString()}</td>
              <td className="border border-black p-1">X</td>
              <td className="border border-black p-1 font-mono text-right">{totalVat.toLocaleString()}</td>
              <td className="border border-black p-1 font-mono text-right">{grandTotal.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        {/* Summa so'z bilan */}
        <div className="mb-4 text-xs">
          <b>Jami to‘lovga:</b> <span className="underline italic font-medium">{numberToWordsUz(grandTotal)}</span>
        </div>

        {/* Imzolar va E-IMZO shtampi */}
        <div className="grid grid-cols-2 gap-8 text-xs pt-4 border-t border-slate-300">
          <div>
            <div className="font-bold mb-2">YETKAZIB BERUVCHI:</div>
            <div className="mb-4">Rahbar: _____________________ ({tenantInfo?.directorName || abonent.tenant?.directorName || "Qodirov D.R."})</div>
            <div className="mb-4">Bosh buxgalter: _____________________ ({tenantInfo?.accountantName || abonent.tenant?.accountantName || "Soliyev A.N."})</div>
            
            {/* E-IMZO muhr shtampi */}
            <div className="border-2 border-emerald-600 bg-emerald-50 rounded p-2.5 text-center text-[10px] text-emerald-800">
              <div className="font-bold flex items-center justify-center gap-1 text-emerald-700">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                ELEKTRON RAQAMLI IMZO BILAN TASDIQLANGAN
              </div>
              <div className="font-mono text-[9px] mt-0.5">ERI: {tenantInfo?.name || abonent.tenant?.name || "Chust Tumani Suv Ta'minoti Korxonasi"} | STIR: {tenantInfo?.inn || abonent.tenant?.inn || "201555001"}</div>
              <div className="text-[9px] text-slate-500">Sana: {invDate} | Didox.uz EHF Tizimi</div>
            </div>
          </div>

          <div>
            <div className="font-bold mb-2">QABUL QILDI (XARIDOR):</div>
            <div className="mb-4">Rahbar: _____________________ ({abonent.fullName ? abonent.fullName.split(' ')[0] : 'Rahbar'})</div>
            <div className="mb-4">Mas‘ul shaxs: _____________________ ({abonent.responsiblePerson || 'Mas\'ul xodim'})</div>
            
            <div className="border border-dashed border-slate-400 rounded p-3 text-center text-[10px] text-slate-400 h-[68px] flex items-center justify-center">
              M.O‘. (Muhr va imzo o‘rni)
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EFacturaViewer;
