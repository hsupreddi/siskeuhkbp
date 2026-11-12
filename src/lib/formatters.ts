/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

export const MONTH_NAMES_INDO = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatRupiah(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  if (isNaN(num)) return 'Rp 0';

  const isNegative = num < 0;
  const absValue = Math.abs(num);

  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(absValue)
    .replace(/\u00a0/g, ' ');

  return isNegative ? `-${formatted}` : formatted;
}

export function formatDateIndo(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(d, 'd MMMM yyyy', { locale: id });
  } catch {
    return String(dateInput);
  }
}

export function formatDateShort(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(d, 'dd/MM/yyyy', { locale: id });
  } catch {
    return String(dateInput);
  }
}

export function formatDateTimeIndo(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    return format(d, 'd MMMM yyyy HH:mm', { locale: id });
  } catch {
    return String(dateInput);
  }
}

export function getIndoMonthName(monthIndex1to12: number): string {
  return MONTH_NAMES_INDO[Math.max(0, Math.min(11, monthIndex1to12 - 1))] || '';
}
