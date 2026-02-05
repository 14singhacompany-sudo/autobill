/**
 * แปลงตัวเลขเป็นคำอ่านภาษาไทย
 * รองรับจำนวนเงินถึงหลักล้านล้าน (trillion)
 */

const thaiDigits = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const thaiPositions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

function convertChunk(num: number): string {
  if (num === 0) return '';

  let result = '';
  let position = 0;

  while (num > 0) {
    const digit = num % 10;

    if (digit !== 0) {
      let digitText = thaiDigits[digit];

      // กรณีพิเศษสำหรับหลักสิบ
      if (position === 1) {
        if (digit === 1) {
          digitText = ''; // สิบ ไม่ใช่ หนึ่งสิบ
        } else if (digit === 2) {
          digitText = 'ยี่'; // ยี่สิบ ไม่ใช่ สองสิบ
        }
      }

      // กรณีพิเศษสำหรับหลักหน่วยที่เป็น 1 (และไม่ใช่เลขหลักเดียว)
      if (position === 0 && digit === 1 && num >= 10) {
        digitText = 'เอ็ด';
      }

      result = digitText + thaiPositions[position] + result;
    }

    num = Math.floor(num / 10);
    position++;
  }

  return result;
}

export function numberToThaiText(num: number): string {
  if (num === 0) return 'ศูนย์บาทถ้วน';
  if (num < 0) return 'ลบ' + numberToThaiText(Math.abs(num));

  // แยกส่วนจำนวนเต็มและทศนิยม
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100); // สตางค์ (2 ตำแหน่ง)

  let result = '';

  // แปลงส่วนจำนวนเต็ม
  if (intPart === 0) {
    result = '';
  } else if (intPart < 1000000) {
    // น้อยกว่าล้าน
    result = convertChunk(intPart);
  } else {
    // ล้านขึ้นไป
    const millions = Math.floor(intPart / 1000000);
    const remainder = intPart % 1000000;

    if (millions < 1000000) {
      result = convertChunk(millions) + 'ล้าน';
    } else {
      // ล้านล้านขึ้นไป
      const trillions = Math.floor(millions / 1000000);
      const millionsRemainder = millions % 1000000;
      result = convertChunk(trillions) + 'ล้าน' +
               (millionsRemainder > 0 ? convertChunk(millionsRemainder) : '') + 'ล้าน';
    }

    if (remainder > 0) {
      result += convertChunk(remainder);
    }
  }

  // เพิ่มคำว่า "บาท"
  if (intPart > 0) {
    result += 'บาท';
  }

  // แปลงส่วนสตางค์
  if (decPart === 0) {
    result += 'ถ้วน';
  } else {
    if (intPart === 0) {
      result = convertChunk(decPart) + 'สตางค์';
    } else {
      result += convertChunk(decPart) + 'สตางค์';
    }
  }

  return result;
}

/**
 * แปลงตัวเลขเป็นคำอ่านภาษาไทยแบบย่อ (ไม่มี "บาท" และ "ถ้วน")
 */
export function numberToThaiTextSimple(num: number): string {
  if (num === 0) return 'ศูนย์';
  if (num < 0) return 'ลบ' + numberToThaiTextSimple(Math.abs(num));

  const intPart = Math.floor(num);

  if (intPart < 1000000) {
    return convertChunk(intPart);
  }

  const millions = Math.floor(intPart / 1000000);
  const remainder = intPart % 1000000;

  let result = convertChunk(millions) + 'ล้าน';

  if (remainder > 0) {
    result += convertChunk(remainder);
  }

  return result;
}
