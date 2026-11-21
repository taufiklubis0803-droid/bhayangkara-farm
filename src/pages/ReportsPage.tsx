import React, { useMemo, useState } from 'react';
import { BarChart2, Download, FileSpreadsheet, FileText, Printer, TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CustomChartTooltip } from '../components/ChartTooltip';
import { Logo } from '../components/Logo';
import type { FarmDataState } from '../hooks/useFarmData';
import { useTheme } from '../hooks/useTheme';
import type { DateFilterPreset } from '../types/database';
import { exportTransactionsToExcel, exportTransactionsToPDF } from '../utils/exportReports';
import { buildMonthlyFinancialSeries, computeFinancialSummary } from '../utils/financial';
import {
  EXPENSE_CATEGORY_LABELS,
  INCOME_CATEGORY_LABELS,
  formatDateID,
  formatRupiah,
  getDateRangeFromPreset,
  todayJakarta,
} from '../utils/format';

interface ReportsPageProps {
  data: FarmDataState;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ data }) => {
  const { isDark } = useTheme();
  const [filterMode, setFilterMode] = useState<DateFilterPreset | 'full_period'>('this_month');
  const [customStart, setCustomStart] = useState(todayJakarta());
  const [customEnd, setCustomEnd] = useState(todayJakarta());
  const [activeTab, setActiveTab] = useState<'laba_rugi' | 'arus_kas' | 'pemasukan' | 'pengeluaran'>(
    'laba_rugi'
  );
  const [trendMode, setTrendMode] = useState<'bar' | 'area'>('area');

  const today = todayJakarta();
  const currentPeriod =
    data.periods.find((p) => p.id === data.selectedPeriodId) ?? data.activePeriod;

  const gridStroke = isDark ? 'rgba(185, 228, 232, 0.14)' : 'rgba(7, 27, 43, 0.10)';
  const axisTickColor = isDark ? '#B9E4E8' : '#355365';

  const dateRange = useMemo(() => {
    if (filterMode === 'full_period') {
      const start = currentPeriod?.start_date ?? '2020-01-01';
      const end = currentPeriod?.end_date ?? today;
      return {
        start,
        end,
        label: `Satu Periode (${currentPeriod?.name ?? 'Aktif'})`,
      };
    }
    return getDateRangeFromPreset(filterMode, customStart, customEnd);
  }, [filterMode, customStart, customEnd, currentPeriod, today]);

  const summary = useMemo(
    () =>
      computeFinancialSummary({
        transactions: data.transactions,
        incomeTransactions: data.incomeTransactions,
        expenseTransactions: data.expenseTransactions,
        feedMovements: data.feedMovements,
        feedInventory: data.feedInventory,
        debts: data.debts,
        receivables: data.receivables,
        payments: data.payments,
        startDate: dateRange.start,
        endDate: dateRange.end,
      }),
    [data, dateRange]
  );

  // Perbandingan Bulan Ini vs Bulan Lalu
  const thisMonthRange = useMemo(() => getDateRangeFromPreset('this_month'), []);
  const lastMonthRange = useMemo(() => getDateRangeFromPreset('last_month'), []);
  const thisMonthSum = useMemo(
    () =>
      computeFinancialSummary({
        transactions: data.transactions,
        incomeTransactions: data.incomeTransactions,
        expenseTransactions: data.expenseTransactions,
        feedMovements: data.feedMovements,
        feedInventory: data.feedInventory,
        debts: data.debts,
        receivables: data.receivables,
        payments: data.payments,
        startDate: thisMonthRange.start,
        endDate: thisMonthRange.end,
      }),
    [data, thisMonthRange]
  );
  const lastMonthSum = useMemo(
    () =>
      computeFinancialSummary({
        transactions: data.transactions,
        incomeTransactions: data.incomeTransactions,
        expenseTransactions: data.expenseTransactions,
        feedMovements: data.feedMovements,
        feedInventory: data.feedInventory,
        debts: data.debts,
        receivables: data.receivables,
        payments: data.payments,
        startDate: lastMonthRange.start,
        endDate: lastMonthRange.end,
      }),
    [data, lastMonthRange]
  );

  const txInRange = useMemo(
    () =>
      data.transactions.filter(
        (t) => !t.is_deleted && t.tx_date >= dateRange.start && t.tx_date <= dateRange.end
      ),
    [data.transactions, dateRange]
  );

  const incomeByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txInRange.filter((x) => x.tx_type === 'income')) {
      map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount));
    }
    return Array.from(map.entries());
  }, [txInRange]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of txInRange.filter((x) => x.tx_type === 'expense')) {
      map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [txInRange]);

  const monthlyTrend = useMemo(
    () => buildMonthlyFinancialSeries(data.transactions, Number(today.slice(0, 4))),
    [data.transactions, today]
  );

  const exportPayload = {
    farmName: `${data.settings?.farm_name ?? 'RIZKA FARM'}${data.selectedBranch ? ` — ${data.selectedBranch.name}` : ''}`,
    periodLabel: dateRange.label,
    activePeriod: currentPeriod,
    transactions: txInRange,
    summary,
  };

  return (
    <div className="space-y-6">
      {/* Header Print Only */}
      <div className="hidden print-only mb-4 border-b border-slate-300 pb-4">
        <div className="flex items-center justify-between">
          <Logo size="md" />
          <div className="text-right text-xs">
            <div className="font-bold">
              Laporan Keuangan {data.selectedBranch?.name ?? ''} — {dateRange.label}
            </div>
            <div>Tanggal Cetak: {formatDateID(today)}</div>
          </div>
        </div>
      </div>

      {/* Filter & Export Controls */}
      <div className="no-print farm-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'today', label: 'Harian (Hari Ini)' },
              { id: 'this_week', label: 'Mingguan' },
              { id: 'this_month', label: 'Bulanan' },
              { id: 'this_year', label: 'Tahunan' },
              { id: 'full_period', label: 'Satu Periode Ternak' },
              { id: 'custom', label: 'Rentang Khusus' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterMode(f.id as DateFilterPreset | 'full_period')}
                className={`min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filterMode === f.id
                    ? 'bg-[#167D8D] text-white dark:bg-[#B9E4E8] dark:text-[#071B2B]'
                    : 'bg-[#EEEEEE] text-[#071B2B] hover:bg-[#B9E4E8]/55 dark:bg-[#113047] dark:text-[#B9E4E8]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportTransactionsToExcel(exportPayload)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#167D8D]/25 bg-white px-3 text-xs font-semibold text-[#071B2B] hover:bg-[#EEEEEE] dark:border-[#B9E4E8]/25 dark:bg-[#113047] dark:text-[#B9E4E8]"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#167D8D] dark:text-[#B9E4E8]" />
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => exportTransactionsToPDF(exportPayload)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#167D8D]/25 bg-white px-3 text-xs font-semibold text-[#071B2B] hover:bg-[#EEEEEE] dark:border-[#B9E4E8]/25 dark:bg-[#113047] dark:text-[#B9E4E8]"
            >
              <FileText className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#167D8D] px-3.5 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B]"
            >
              <Printer className="h-4 w-4" />
              Cetak
            </button>
          </div>
        </div>

        {filterMode === 'custom' && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#167D8D]/15 pt-3 dark:border-[#B9E4E8]/15">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="min-h-[38px] rounded-lg border border-[#167D8D]/25 px-2.5 text-xs"
            />
            <span className="text-xs text-[#355365] dark:text-[#8BC2CB]">s/d</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="min-h-[38px] rounded-lg border border-[#167D8D]/25 px-2.5 text-xs"
            />
          </div>
        )}
      </div>

      {/* Ringkasan Laba Rugi, Arus Kas, & Perbandingan */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="farm-card p-5">
          <div className="text-xs font-semibold text-[#355365] dark:text-[#8BC2CB]">
            Laba Rugi ({dateRange.label})
          </div>
          <div
            className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
              summary.netProfit >= 0
                ? 'text-[#167D8D] dark:text-[#B9E4E8]'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatRupiah(summary.netProfit)}
          </div>
          <div className="mt-2.5 space-y-1 text-xs text-[#355365] dark:text-[#8BC2CB]">
            <div className="flex justify-between">
              <span>Pendapatan</span>
              <span className="font-mono text-[#167D8D] dark:text-[#B9E4E8]">
                {formatRupiah(summary.totalRevenue)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Beban Periode (termasuk pakan terpakai)</span>
              <span className="font-mono text-rose-600 dark:text-rose-400">
                {formatRupiah(summary.totalOperatingExpense)}
              </span>
            </div>
          </div>
        </div>

        <div className="farm-card p-5">
          <div className="text-xs font-semibold text-[#355365] dark:text-[#8BC2CB]">
            Arus Kas Aktual
          </div>
          <div
            className={`mt-1 font-mono text-2xl font-bold tabular-nums ${
              summary.netCashFlow >= 0
                ? 'text-[#167D8D] dark:text-[#B9E4E8]'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatRupiah(summary.netCashFlow)}
          </div>
          <div className="mt-2.5 space-y-1 text-xs text-[#355365] dark:text-[#8BC2CB]">
            <div className="flex justify-between">
              <span>Uang Masuk Aktual</span>
              <span className="font-mono text-[#167D8D] dark:text-[#B9E4E8]">
                {formatRupiah(summary.totalCashIn)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Uang Keluar Aktual</span>
              <span className="font-mono text-rose-600 dark:text-rose-400">
                {formatRupiah(summary.totalCashOut)}
              </span>
            </div>
          </div>
        </div>

        <div className="farm-card p-5">
          <div className="text-xs font-semibold text-[#355365] dark:text-[#8BC2CB]">
            Perbandingan Bulan Ini vs Bulan Lalu
          </div>
          <div className="mt-2.5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#355365] dark:text-[#8BC2CB]">Laba Bulan Ini</span>
              <span className="font-mono font-bold text-[#071B2B] dark:text-[#B9E4E8]">
                {formatRupiah(thisMonthSum.netProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#355365] dark:text-[#8BC2CB]">Laba Bulan Lalu</span>
              <span className="font-mono font-semibold text-[#355365] dark:text-[#8BC2CB]">
                {formatRupiah(lastMonthSum.netProfit)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#167D8D]/15 pt-1.5 dark:border-[#B9E4E8]/15">
              <span className="text-[#355365] dark:text-[#8BC2CB]">Pengeluaran Terbesar</span>
              <span className="font-semibold text-[#071B2B] dark:text-[#B9E4E8]">
                {summary.topExpenseCategory
                  ? `${summary.topExpenseCategory.label} (${formatRupiah(summary.topExpenseCategory.amount)})`
                  : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Laporan Detail */}
      <div className="no-print flex flex-wrap gap-2">
        {[
          { id: 'laba_rugi', label: 'A. Laporan Laba Rugi' },
          { id: 'arus_kas', label: 'B. Laporan Arus Kas' },
          { id: 'pemasukan', label: 'C. Laporan Pemasukan' },
          { id: 'pengeluaran', label: 'D. Laporan Pengeluaran' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={`min-h-[40px] rounded-xl px-4 text-xs font-semibold transition-colors ${
              activeTab === t.id
                ? 'bg-[#167D8D] text-white dark:bg-[#B9E4E8] dark:text-[#071B2B]'
                : 'farm-card text-[#071B2B] hover:bg-[#B9E4E8]/40 dark:text-[#B9E4E8]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'laba_rugi' && (
        <div className="farm-card p-5">
          <h3 className="font-display text-sm font-bold text-[#071B2B] dark:text-[#B9E4E8]">
            Laporan Laba Rugi — {dateRange.label}
          </h3>
          <p className="mt-1 text-xs text-[#355365] dark:text-[#8BC2CB]">
            Persediaan pakan yang belum terpakai serta pembelian aset/investasi dipisahkan dari beban periode berjalan.
          </p>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between font-semibold text-[#071B2B] dark:text-[#B9E4E8]">
              <span>PENDAPATAN</span>
              <span className="font-mono">{formatRupiah(summary.totalRevenue)}</span>
            </div>
            <div className="flex justify-between pl-4 text-[#355365] dark:text-[#B9E4E8]/85">
              <span>Penjualan Ayam</span>
              <span className="font-mono">{formatRupiah(summary.salesChickenRevenue)}</span>
            </div>
            <div className="flex justify-between pl-4 text-[#355365] dark:text-[#B9E4E8]/85">
              <span>Penjualan Kotoran Ayam</span>
              <span className="font-mono">{formatRupiah(summary.salesManureRevenue)}</span>
            </div>
            <div className="flex justify-between pl-4 text-[#355365] dark:text-[#B9E4E8]/85">
              <span>Pemasukan Lainnya</span>
              <span className="font-mono">{formatRupiah(summary.otherIncomeRevenue)}</span>
            </div>

            <div className="mt-4 flex justify-between border-t border-[#167D8D]/15 pt-3 font-semibold text-[#071B2B] dark:border-[#B9E4E8]/15 dark:text-[#B9E4E8]">
              <span>BEBAN PERIODE BERJALAN</span>
              <span className="font-mono text-rose-600 dark:text-rose-400">
                {formatRupiah(summary.totalOperatingExpense)}
              </span>
            </div>
            <div className="flex justify-between pl-4 text-[#355365] dark:text-[#B9E4E8]/85">
              <span>Pemakaian Persediaan Pakan Aktual</span>
              <span className="font-mono">{formatRupiah(summary.feedConsumedCost)}</span>
            </div>
            <div className="flex justify-between pl-4 text-[#355365] dark:text-[#B9E4E8]/85">
              <span>Pembelian Bibit Ayam</span>
              <span className="font-mono">{formatRupiah(summary.bibitCost)}</span>
            </div>
            <div className="flex justify-between pl-4 text-[#355365] dark:text-[#B9E4E8]/85">
              <span>Beban Operasional (Vitamin, Vaksin, Sekam, Listrik, Bahan Herbal Jamu, Desinfektan)</span>
              <span className="font-mono">{formatRupiah(summary.operationalCost)}</span>
            </div>
            <div className="flex justify-between pl-4 text-[#355365] dark:text-[#B9E4E8]/85">
              <span>Tenaga Kerja (Gaji Dibayar)</span>
              <span className="font-mono">{formatRupiah(summary.salaryPaidCost)}</span>
            </div>
            <div className="flex justify-between pl-4 text-[#355365] dark:text-[#B9E4E8]/85">
              <span>Renovasi &amp; Peralatan (Non-Aset)</span>
              <span className="font-mono">
                {formatRupiah(summary.renovationExpenseCost + summary.equipmentExpenseCost)}
              </span>
            </div>

            <div className="mt-4 flex justify-between border-t-2 border-[#167D8D] pt-3 text-sm font-bold dark:border-[#B9E4E8]">
              <span>LABA BERSIH</span>
              <span
                className={`font-mono ${
                  summary.netProfit >= 0
                    ? 'text-[#167D8D] dark:text-[#B9E4E8]'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatRupiah(summary.netProfit)}
              </span>
            </div>

            <div className="farm-subcard mt-4 p-3 text-[11px] text-[#355365] dark:text-[#B9E4E8]/85">
              Catatan Neraca Terpisah: Pembelian Persediaan Pakan periode ini sebesar{' '}
              <strong className="font-mono text-[#071B2B] dark:text-[#B9E4E8]">
                {formatRupiah(summary.feedInventoryPurchaseInRange)}
              </strong>{' '}
              (nilai sisa stok pakan saat ini:{' '}
              <strong className="font-mono text-[#071B2B] dark:text-[#B9E4E8]">
                {formatRupiah(summary.currentFeedInventoryValue)}
              </strong>
              ) dan Pembelian Aset/Investasi sebesar{' '}
              <strong className="font-mono text-[#071B2B] dark:text-[#B9E4E8]">
                {formatRupiah(summary.assetAndInvestmentInRange)}
              </strong>
              .
            </div>
          </div>
        </div>
      )}

      {activeTab === 'arus_kas' && (
        <div className="farm-card p-5">
          <h3 className="font-display text-sm font-bold text-[#071B2B] dark:text-[#B9E4E8]">
            Laporan Arus Kas Aktual — {dateRange.label}
          </h3>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between font-semibold text-[#167D8D] dark:text-[#B9E4E8]">
              <span>UANG MASUK AKTUAL</span>
              <span className="font-mono">{formatRupiah(summary.totalCashIn)}</span>
            </div>
            <div className="flex justify-between pl-4 text-[#355365] dark:text-[#B9E4E8]/85">
              <span>Penerimaan Penjualan Tunai/Transfer</span>
              <span className="font-mono">{formatRupiah(summary.cashInSalesInitial)}</span>
            </div>
            <div className="flex justify-between pl-4 text-[#355365] dark:text-[#B9E4E8]/85">
              <span>Penerimaan Pelunasan Piutang</span>
              <span className="font-mono">{formatRupiah(summary.cashInReceivablePayments)}</span>
            </div>

            <div className="mt-4 flex justify-between border-t border-[#167D8D]/15 pt-3 font-semibold text-rose-600 dark:border-[#B9E4E8]/15 dark:text-rose-400">
              <span>UANG KELUAR AKTUAL</span>
              <span className="font-mono">{formatRupiah(summary.totalCashOut)}</span>
            </div>
            <div className="flex justify-between pl-4 text-[#355365] dark:text-[#B9E4E8]/85">
              <span>Pengeluaran Operasional, Bibit &amp; Gaji Tunai/Transfer</span>
              <span className="font-mono">{formatRupiah(summary.cashOutDirectExpenses)}</span>
            </div>
            <div className="flex justify-between pl-4 text-[#355365] dark:text-[#B9E4E8]/85">
              <span>Pembelian Persediaan Pakan Tunai/Transfer</span>
              <span className="font-mono">{formatRupiah(summary.cashOutInventoryPurchase)}</span>
            </div>
            <div className="flex justify-between pl-4 text-[#355365] dark:text-[#B9E4E8]/85">
              <span>Pembelian Aset &amp; Investasi</span>
              <span className="font-mono">{formatRupiah(summary.cashOutAssetInvestment)}</span>
            </div>
            <div className="flex justify-between pl-4 text-[#355365] dark:text-[#B9E4E8]/85">
              <span>Pembayaran Utang Usaha</span>
              <span className="font-mono">{formatRupiah(summary.cashOutDebtPayments)}</span>
            </div>

            <div className="mt-4 flex justify-between border-t-2 border-[#167D8D] pt-3 text-sm font-bold dark:border-[#B9E4E8]">
              <span>ARUS KAS BERSIH</span>
              <span
                className={`font-mono ${
                  summary.netCashFlow >= 0
                    ? 'text-[#167D8D] dark:text-[#B9E4E8]'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatRupiah(summary.netCashFlow)}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pemasukan' && (
        <div className="farm-card p-5">
          <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#B9E4E8]">
            Rekap Pemasukan Per Kategori ({dateRange.label})
          </h3>
          <div className="space-y-2 text-xs">
            {incomeByCategory.length === 0 ? (
              <p className="text-[#355365] dark:text-[#8BC2CB]">
                Tidak ada pemasukan pada rentang ini.
              </p>
            ) : (
              incomeByCategory.map(([cat, amt]) => (
                <div
                  key={cat}
                  className="flex justify-between border-b border-[#167D8D]/15 py-2 dark:border-[#B9E4E8]/15"
                >
                  <span className="font-medium">{INCOME_CATEGORY_LABELS[cat] ?? cat}</span>
                  <span className="font-mono font-bold text-[#167D8D] dark:text-[#B9E4E8]">
                    {formatRupiah(amt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'pengeluaran' && (
        <div className="farm-card p-5">
          <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#B9E4E8]">
            Rekap Pengeluaran Per Kategori ({dateRange.label})
          </h3>
          <div className="space-y-2 text-xs">
            {expenseByCategory.length === 0 ? (
              <p className="text-[#355365] dark:text-[#8BC2CB]">
                Tidak ada pengeluaran pada rentang ini.
              </p>
            ) : (
              expenseByCategory.map(([cat, amt]) => (
                <div
                  key={cat}
                  className="flex justify-between border-b border-[#167D8D]/15 py-2 dark:border-[#B9E4E8]/15"
                >
                  <span className="font-medium">{EXPENSE_CATEGORY_LABELS[cat] ?? cat}</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {formatRupiah(amt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tren Pendapatan Tahunan dengan Mode Grafik */}
      <div className="no-print farm-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-[#167D8D] dark:text-[#B9E4E8]" />
            <h3 className="font-display text-sm font-bold text-[#071B2B] dark:text-[#B9E4E8]">
              Tren Pendapatan &amp; Pengeluaran Tahun Berjalan
            </h3>
          </div>
          <div className="inline-flex rounded-xl border border-[#167D8D]/20 bg-[#EEEEEE] p-0.5 dark:border-[#B9E4E8]/20 dark:bg-[#071B2B]">
            {[
              { id: 'area' as const, label: 'Gelombang', icon: TrendingUp },
              { id: 'bar' as const, label: 'Batang', icon: BarChart2 },
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTrendMode(m.id)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                    trendMode === m.id
                      ? 'bg-[#167D8D] text-white dark:bg-[#B9E4E8] dark:text-[#071B2B]'
                      : 'text-[#355365] hover:text-[#071B2B] dark:text-[#8BC2CB]'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {trendMode === 'area' ? (
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="repIncomeArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#167D8D" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#B9E4E8" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="repExpenseArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E11D48" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#E11D48" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisTickColor }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: axisTickColor }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}rb`}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="pemasukan"
                  name="Pendapatan"
                  stroke={isDark ? '#B9E4E8' : '#167D8D'}
                  strokeWidth={2.5}
                  fill="url(#repIncomeArea)"
                />
                <Area
                  type="monotone"
                  dataKey="pengeluaran"
                  name="Pengeluaran"
                  stroke="#E11D48"
                  strokeWidth={2.2}
                  fill="url(#repExpenseArea)"
                />
              </AreaChart>
            ) : (
              <BarChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="repIncomeBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isDark ? '#B9E4E8' : '#167D8D'} />
                    <stop offset="100%" stopColor={isDark ? '#167D8D' : '#071B2B'} />
                  </linearGradient>
                  <linearGradient id="repExpenseBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FB7185" />
                    <stop offset="100%" stopColor="#BE123C" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisTickColor }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: axisTickColor }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}rb`}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="pemasukan" name="Pendapatan" fill="url(#repIncomeBar)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill="url(#repExpenseBar)" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
