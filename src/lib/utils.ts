import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("th-TH").format(num);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatThaiDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
    "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
    "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

export function numberToThaiText(num: number): string {
  const units = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

  if (num === 0) return "ศูนย์";

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  let result = "";

  const convertGroup = (n: number): string => {
    if (n === 0) return "";
    let str = "";
    const digits = n.toString().split("").reverse();

    for (let i = 0; i < digits.length; i++) {
      const digit = parseInt(digits[i]);
      if (digit === 0) continue;

      if (i === 0) {
        str = (digit === 1 ? "เอ็ด" : units[digit]) + str;
      } else if (i === 1) {
        if (digit === 1) {
          str = "สิบ" + str;
        } else if (digit === 2) {
          str = "ยี่สิบ" + str;
        } else {
          str = units[digit] + "สิบ" + str;
        }
      } else {
        str = units[digit] + positions[i] + str;
      }
    }
    return str;
  };

  if (intPart >= 1000000) {
    const millions = Math.floor(intPart / 1000000);
    result += convertGroup(millions) + "ล้าน";
    const remainder = intPart % 1000000;
    if (remainder > 0) {
      result += convertGroup(remainder);
    }
  } else {
    result = convertGroup(intPart);
  }

  if (decPart > 0) {
    result += "บาท" + convertGroup(decPart) + "สตางค์";
  } else {
    result += "บาทถ้วน";
  }

  return result;
}

export function generateDocumentNumber(prefix: string, nextNumber: number): string {
  const year = new Date().getFullYear();
  const paddedNumber = String(nextNumber).padStart(5, "0");
  return `${prefix}${year}${paddedNumber}`;
}
