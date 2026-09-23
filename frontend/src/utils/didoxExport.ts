import { utils, writeFile } from 'xlsx';
import dayjs from 'dayjs';

export interface B2BInvoiceExportItem {
  id: string;
  abonentNumber: string;
  fullName: string;
  inn: string;
  legalCategory?: string;
  contractNumber?: string;
  contractDate?: string;
  bankAccount?: string;
  treasuryAccount?: string;
  mfo?: string;
  vatPayer?: boolean;
  vatRegCode?: string;
  tariff?: {
    price: number | string;
    category?: string;
  };
  monthlyVolumeM3?: number;
  balance?: number | string;
}

export function exportToDidoxExcel(
  items: B2BInvoiceExportItem[], 
  tenantInfo: { name: string; inn?: string; account?: string; mfo?: string },
  periodMonthYear: string = dayjs().format('MM.YYYY')
) {
  const invoiceDate = dayjs().format('DD.MM.YYYY');
  const monthName = dayjs().format('MMMM YYYY');

  // Didox va Soliq.uz qabul qiladigan ustunlar
  const rows = items.map((item, idx) => {
    const volume = item.monthlyVolumeM3 && item.monthlyVolumeM3 > 0 ? item.monthlyVolumeM3 : 100; // Standart yoki o'lchangan sarf
    const baseTariff = Number(item.tariff?.price) || 5000;
    const baseAmount = Math.round(volume * baseTariff);
    const vatRate = 12;
    const vatAmount = Math.round(baseAmount * 0.12);
    const totalAmount = baseAmount + vatAmount;

    // Xaridor hisob raqami: agar byudjet bo'lsa 27 xonali g'azna hisobi, aks holda bank hisobi
    const buyerAccount = (item.legalCategory === 'BUDGET' && item.treasuryAccount) 
      ? item.treasuryAccount 
      : (item.bankAccount || '20208000000000000001');

    return {
      'T/r': idx + 1,
      'Faktura raqami': `HF-${dayjs().format('YYYYMM')}-${String(idx + 1).padStart(4, '0')}`,
      'Faktura sanasi': invoiceDate,
      'Shartnoma №': item.contractNumber || `SH-${item.abonentNumber}`,
      'Shartnoma sanasi': item.contractDate ? dayjs(item.contractDate).format('DD.MM.YYYY') : '01.01.2026',
      'Xaridor STIR': item.inn,
      'Xaridor nomi': item.fullName,
      'Xaridor toifasi': item.legalCategory === 'BUDGET' ? 'Byudjet' : item.legalCategory === 'INDUSTRIAL' ? 'Sanoat' : 'Tijorat',
      'Xaridor hisob raqami': buyerAccount,
      'Xaridor MFO': item.mfo || '00014',
      'Xizmat nomi': 'Ichimlik suvi ta‘minoti xizmati',
      'MXIK (IKPU) kodi': '03600001001000000',
      'O‘lchov birligi': 'm³',
      'Miqdori (m³)': volume,
      'Tarif (so‘m, QQSsiz)': baseTariff,
      'Yetkazib berish qiymati': baseAmount,
      'QQS stavkasi (%)': vatRate,
      'QQS summasi': vatAmount,
      'Jami to‘lov (so‘m)': totalAmount,
      'Davr / Izoh': `${periodMonthYear} oyi uchun ichimlik suvi iste‘moli`
    };
  });

  const worksheet = utils.json_to_sheet(rows);

  // Ustun kengliklarini chiroyli formatlash
  const colWidths = [
    { wch: 6 },  // T/r
    { wch: 18 }, // Faktura raqami
    { wch: 14 }, // Faktura sanasi
    { wch: 16 }, // Shartnoma №
    { wch: 16 }, // Shartnoma sanasi
    { wch: 14 }, // Xaridor STIR
    { wch: 32 }, // Xaridor nomi
    { wch: 16 }, // Xaridor toifasi
    { wch: 30 }, // Xaridor hisob raqami
    { wch: 12 }, // Xaridor MFO
    { wch: 30 }, // Xizmat nomi
    { wch: 20 }, // MXIK (IKPU)
    { wch: 14 }, // O'lchov birligi
    { wch: 14 }, // Miqdori
    { wch: 18 }, // Tarif
    { wch: 22 }, // Yetkazib berish qiymati
    { wch: 14 }, // QQS stavkasi
    { wch: 16 }, // QQS summasi
    { wch: 20 }, // Jami to'lov
    { wch: 35 }  // Izoh
  ];
  worksheet['!cols'] = colWidths;

  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Didox_Fakturalar');

  const fileName = `Didox_EHF_Import_${dayjs().format('YYYY-MM-DD_HHmm')}.xlsx`;
  writeFile(workbook, fileName);
}
