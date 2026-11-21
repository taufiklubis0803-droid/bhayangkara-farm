import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { FarmPeriod, Transaction } from '../types/database';
import type { FinancialSummary } from './financial';
import {
  EXPENSE_CATEGORY_LABELS,
  INCOME_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  formatDateID,
  formatRupiah,
  todayJakarta,
} from './format';

export interface ReportExportPayload {
  farmName: string;
  periodLabel: string;
  activePeriod?: FarmPeriod | null;
  transactions: Transaction[];
  summary: FinancialSummary;
}

export function exportTransactionsToExcel(payload: ReportExportPayload): void {
  const { farmName, periodLabel, transactions, summary } = payload;
  const activeTx = transactions.filter((t) => !t.is_deleted);

  const summaryRows = [
    ['LAPORAN KEUANGAN', farmName],
    ['Periode Laporan', periodLabel],
    ['Tanggal Cetak', formatDateID(todayJakarta())],
    [],
    ['RINGKASAN LABA RUGI', 'NOMINAL (IDR)'],
    ['Total Pendapatan', summary.totalRevenue],
    ['Penjualan Ayam', summary.salesChickenRevenue],
    ['Penjualan Kotoran Ayam', summary.salesManureRevenue],
    ['Pemasukan Lainnya', summary.otherIncomeRevenue],
    ['Pemakaian Persediaan Pakan', summary.feedConsumedCost],
    ['Biaya Pembelian Bibit', summary.bibitCost],
    ['Biaya Operasional', summary.operationalCost],
    ['Gaji Karyawan Dibayar', summary.salaryPaidCost],
    ['Biaya Renovasi & Peralatan', summary.renovationExpenseCost + summary.equipmentExpenseCost],
    ['Total Beban Periode Berjalan', summary.totalOperatingExpense],
    ['KEUNTUNGAN BERSIH (LABA RUGI)', summary.netProfit],
    [],
    ['RINGKASAN ARUS KAS AKTUAL', 'NOMINAL (IDR)'],
    ['Total Uang Masuk Aktual', summary.totalCashIn],
    ['Total Uang Keluar Aktual', summary.totalCashOut],
    ['ARUS KAS BERSIH', summary.netCashFlow],
  ];

  const txRows = activeTx.map((t, idx) => ({
    No: idx + 1,
    'ID Transaksi': t.id.slice(0, 8).toUpperCase(),
    Tanggal: formatDateID(t.tx_date),
    Jenis: t.tx_type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    Kategori:
      t.tx_type === 'income'
        ? INCOME_CATEGORY_LABELS[t.category] ?? t.category
        : EXPENSE_CATEGORY_LABELS[t.category] ?? t.category,
    Keterangan: t.title,
    'Pihak Terkait': t.reference_name || '-',
    Nominal: Number(t.amount),
    'Sudah Dibayar': Number(t.paid_amount),
    Metode: PAYMENT_METHOD_LABELS[t.payment_method] ?? t.payment_method,
    Status: PAYMENT_STATUS_LABELS[t.payment_status] ?? t.payment_status,
    Operator: t.operator_name,
    Catatan: t.notes || '-',
  }));

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 36 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Keuangan');

  const wsTx = XLSX.utils.json_to_sheet(txRows);
  wsTx['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 12 },
    { wch: 13 },
    { wch: 26 },
    { wch: 32 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTx, 'Rincian Transaksi');

  const safePeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `Laporan_${farmName.replace(/\s+/g, '_')}_${safePeriod}.xlsx`);
}

export function exportTransactionsToPDF(payload: ReportExportPayload): void {
  const { farmName, periodLabel, transactions, summary } = payload;
  const activeTx = transactions.filter((t) => !t.is_deleted);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header RIZKA FARM (Palet #071B2B, #167D8D, #B9E4E8, #EEEEEE)
  doc.setFillColor(7, 27, 43); // Deep Abyssal Navy #071B2B
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(238, 238, 238); // Crisp Alabaster #EEEEEE
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(farmName, 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(185, 228, 232); // Ice Aqua #B9E4E8
  doc.text('FARM MANAGEMENT & FINANCIAL SYSTEM — PETERNAKAN AYAM KAMPUNG', 14, 18);
  doc.text(`Periode: ${periodLabel}   |   Tanggal Cetak: ${formatDateID(todayJakarta())}`, 14, 23);

  // Ringkasan Keuangan Table
  doc.setTextColor(7, 27, 43);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Ringkasan Keuangan Periode', 14, 36);

  autoTable(doc, {
    startY: 39,
    theme: 'grid',
    headStyles: { fillColor: [7, 27, 43], textColor: [185, 228, 232], fontSize: 9 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    head: [['Pos Keuangan', 'Nominal', 'Keterangan Arus Kas', 'Nominal Aktual']],
    body: [
      ['Total Pendapatan', formatRupiah(summary.totalRevenue), 'Total Uang Masuk Aktual', formatRupiah(summary.totalCashIn)],
      ['Total Beban Operasional', formatRupiah(summary.totalOperatingExpense), 'Total Uang Keluar Aktual', formatRupiah(summary.totalCashOut)],
      ['Keuntungan Bersih (Laba Rugi)', formatRupiah(summary.netProfit), 'Arus Kas Bersih', formatRupiah(summary.netCashFlow)],
    ],
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 72;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rincian Transaksi (${activeTx.length} catatan)`, 14, finalY + 9);

  autoTable(doc, {
    startY: finalY + 12,
    theme: 'striped',
    headStyles: { fillColor: [22, 125, 141], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    head: [['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Nominal', 'Status', 'Operator']],
    body: activeTx.map((t) => [
      formatDateID(t.tx_date),
      t.tx_type === 'income' ? 'Masuk' : 'Keluar',
      t.tx_type === 'income'
        ? INCOME_CATEGORY_LABELS[t.category] ?? t.category
        : EXPENSE_CATEGORY_LABELS[t.category] ?? t.category,
      t.title,
      formatRupiah(t.amount),
      PAYMENT_STATUS_LABELS[t.payment_status] ?? t.payment_status,
      t.operator_name,
    ]),
  });

  const safePeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Laporan_${farmName.replace(/\s+/g, '_')}_${safePeriod}.pdf`);
}
