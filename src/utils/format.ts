import type { DateFilterPreset } from '../types/database';

/**
 * Format angka ke format Rupiah Indonesia: Rp1.000.000
 */
export function formatRupiah(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0);
  if (Number.isNaN(num)) return 'Rp0';
  const isNeg = num < 0;
  const abs = Math.abs(Math.round(num));
  const formatted = new Intl.NumberFormat('id-ID').format(abs);
  return `${isNeg ? '-' : ''}Rp${formatted}`;
}

/**
 * Format angka biasa dengan pemisah ribuan Indonesia
 */
export function formatNumber(val: number | string | null | undefined, decimals = 0): string {
  const num = Number(val ?? 0);
  if (Number.isNaN(num)) return '0';
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Mengambil tanggal hari ini dalam zona waktu Asia/Jakarta format YYYY-MM-DD
 */
export function todayJakarta(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

/**
 * Format tanggal YYYY-MM-DD ke DD/MM/YYYY
 */
export function formatDateID(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const clean = dateStr.slice(0, 10);
  const [y, m, d] = clean.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

/**
 * Format timestamp ISO ke DD/MM/YYYY HH:mm WIB
 */
export function formatDateTimeID(isoStr: string | null | undefined): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  const datePart = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${datePart} ${timePart} WIB`;
}

/**
 * Hitung rentang tanggal (start, end YYYY-MM-DD) berdasarkan filter preset
 */
export function getDateRangeFromPreset(
  preset: DateFilterPreset,
  customStart?: string,
  customEnd?: string
): { start: string; end: string; label: string } {
  const today = todayJakarta();
  const [y, m, d] = today.split('-').map(Number);
  const baseDate = new Date(Date.UTC(y, m - 1, d));

  const toStr = (dt: Date) => dt.toISOString().slice(0, 10);

  if (preset === 'today') {
    return { start: today, end: today, label: `Hari Ini (${formatDateID(today)})` };
  }

  if (preset === 'yesterday') {
    const yest = new Date(baseDate);
    yest.setUTCDate(yest.getUTCDate() - 1);
    const s = toStr(yest);
    return { start: s, end: s, label: `Kemarin (${formatDateID(s)})` };
  }

  if (preset === 'this_week') {
    const dayOfWeek = baseDate.getUTCDay(); // 0=Sun..6=Sat
    const diffToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const mon = new Date(baseDate);
    mon.setUTCDate(mon.getUTCDate() - diffToMon);
    return {
      start: toStr(mon),
      end: today,
      label: `Minggu Ini (${formatDateID(toStr(mon))} - ${formatDateID(today)})`,
    };
  }

  if (preset === 'this_month') {
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end, label: `Bulan ${BULAN_INDONESIA[m - 1]} ${y}` };
  }

  if (preset === 'last_month') {
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const start = `${prevY}-${String(prevM).padStart(2, '0')}-01`;
    const lastDay = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate();
    const end = `${prevY}-${String(prevM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end, label: `Bulan ${BULAN_INDONESIA[prevM - 1]} ${prevY}` };
  }

  if (preset === 'this_year') {
    return { start: `${y}-01-01`, end: `${y}-12-31`, label: `Tahun ${y}` };
  }

  const s = customStart || today;
  const e = customEnd || today;
  return {
    start: s <= e ? s : e,
    end: s <= e ? e : s,
    label: `${formatDateID(s)} - ${formatDateID(e)}`,
  };
}

export const BULAN_INDONESIA = [
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

export const INCOME_CATEGORY_LABELS: Record<string, string> = {
  penjualan_ekor: 'Penjualan Ayam (Per Ekor)',
  penjualan_kg: 'Penjualan Ayam (Per Kilogram)',
  penjualan_kotoran: 'Penjualan Kotoran Ayam',
  lainnya: 'Pemasukan Lainnya',
};

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  bibit_ayam: 'Bibit Ayam (DOC/Pullet)',
  renovasi: 'Renovasi Kandang',
  peralatan: 'Peralatan Kandang',
  pakan: 'Pakan Ayam',
  vitamin: 'Vitamin',
  vaksin: 'Vaksin',
  sekam: 'Sekam',
  token_listrik: 'Token Listrik',
  jamu: 'Bahan Herbal Jamu',
  desinfektan: 'Desinfektan',
  gaji_karyawan: 'Gaji Karyawan',
  lainnya: 'Pengeluaran Lainnya',
};

export const ACCOUNTING_CLASS_LABELS: Record<string, string> = {
  pendapatan: 'Pendapatan',
  beban_operasional: 'Beban Operasional',
  pembelian_ternak: 'Pembelian Ternak (Bibit)',
  persediaan: 'Pembelian Persediaan (Pakan/Stok)',
  aset: 'Pembelian Aset',
  renovasi: 'Renovasi',
  peralatan: 'Peralatan',
  tenaga_kerja: 'Tenaga Kerja (Gaji)',
  investasi: 'Investasi',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  tunai: 'Tunai',
  transfer: 'Transfer Bank',
  kredit: 'Kredit / Tempo',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  lunas: 'Lunas',
  dibayar_sebagian: 'Dibayar Sebagian',
  belum_dibayar: 'Belum Dibayar',
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  initial: 'Stok Awal',
  masuk: 'Ayam Masuk',
  terjual: 'Terjual',
  mati: 'Ayam Mati',
  afkir: 'Ayam Afkir',
  koreksi_tambah: 'Koreksi Tambah',
  koreksi_kurang: 'Koreksi Kurang',
};

export function createClientTxKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
