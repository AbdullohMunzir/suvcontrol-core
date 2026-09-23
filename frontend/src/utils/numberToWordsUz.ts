/**
 * O'zbek tilida (lotin alifbosida) sonlarni va pul summalarini so'z bilan ifodalash funksiyasi
 * Masalan: 1254000 -> "Bir million ikki yuz ellik to'rt ming so'm 00 tiyin"
 */

const ONES = ['', 'bir', 'ikki', 'uch', 'to‘rt', 'besh', 'olti', 'yetti', 'sakkiz', 'to‘qqiz'];
const TENS = ['', 'o‘n', 'yigirma', 'o‘ttiz', 'qirq', 'ellik', 'oltmish', 'yetmish', 'sakson', 'to‘qson'];
const SCALES = ['', 'ming', 'million', 'milliard', 'trillion'];

function convertGroup(n: number): string {
  let result = '';
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const tens = Math.floor(remainder / 10);
  const ones = remainder % 10;

  if (hundreds > 0) {
    result += ONES[hundreds] + ' yuz ';
  }

  if (tens > 0) {
    result += TENS[tens] + ' ';
  }

  if (ones > 0) {
    result += ONES[ones] + ' ';
  }

  return result.trim();
}

export function numberToWordsUz(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return "nol so'm 00 tiyin";

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const integerPart = Math.floor(absNum);
  const decimalPart = Math.round((absNum - integerPart) * 100);

  if (integerPart === 0) {
    const tiyinStr = decimalPart.toString().padStart(2, '0');
    return `${isNegative ? 'minus ' : ''}nol so‘m ${tiyinStr} tiyin`;
  }

  const groups: number[] = [];
  let temp = integerPart;
  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const words: string[] = [];
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (group > 0) {
      const groupText = convertGroup(group);
      const scale = SCALES[i];
      if (scale) {
        words.unshift(`${groupText} ${scale}`);
      } else {
        words.unshift(groupText);
      }
    }
  }

  let finalWords = words.join(' ').replace(/\s+/g, ' ').trim();
  // Bosh harfni katta qilish
  finalWords = finalWords.charAt(0).toUpperCase() + finalWords.slice(1);

  const tiyinStr = decimalPart.toString().padStart(2, '0');
  const prefix = isNegative ? 'Minus ' : '';

  return `${prefix}${finalWords} so‘m ${tiyinStr} tiyin`;
}

export default numberToWordsUz;
