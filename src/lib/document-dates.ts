const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseLocalDate = (value: string): Date | null => {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const addDaysToLocalDate = (value: string, days: number): string => {
  const date = parseLocalDate(value);
  if (!date || !Number.isFinite(days)) return value;
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
};

export const differenceInLocalCalendarDays = (start: string, end: string): number | null => {
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  if (!startDate || !endDate) return null;
  return Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000);
};

export const getPaymentTermDays = (term: string): number | null => {
  if (term === "ชำระทันที") return 0;
  const match = /ชำระภายใน\s*(\d+)\s*วัน/.exec(term);
  return match ? Number(match[1]) : null;
};
