import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart2,
  Bird,
  Layers,
  Package,
  Plus,
  Skull,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CustomChartTooltip } from '../components/ChartTooltip';
import type { FarmDataState } from '../hooks/useFarmData';
import { useTheme } from '../hooks/useTheme';
import type { DateFilterPreset, NavMenuKey } from '../types/database';
import { buildMonthlyFinancialSeries, computeFinancialSummary } from '../utils/financial';
import {
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  formatDateID,
  formatNumber,
  formatRupiah,
  getDateRangeFromPreset,
  todayJakarta,
} from '../utils/format';

interface DashboardPageProps {
  data: FarmDataState;
  onNavigate: (menu: NavMenuKey, subAction?: string) => void;
}

type FinanceChartMode = 'composed' | 'area' | 'bar';
type ProfitChartMode = 'area' | 'bar';

const CHART_COLORS_LIGHT = ['#167D8D', '#071B2B', '#289BA8', '#52B7C4', '#86CED6', '#D4A359', '#E11D48'];
const CHART_COLORS_DARK = ['#B9E4E8', '#167D8D', '#62C7D4', '#8AD6DF', '#EEEEEE', '#D4A359', '#FB7185'];

export const DashboardPage: React.FC<DashboardPageProps> = ({ data, onNavigate }) => {
  const { isDark } = useTheme();
  const [filterPreset, setFilterPreset] = useState<DateFilterPreset>('this_month');
  const [customStart, setCustomStart] = useState(todayJakarta());
  const [customEnd, setCustomEnd] = useState(todayJakarta());
  const [financeChartMode, setFinanceChartMode] = useState<FinanceChartMode>('composed');
  const [profitChartMode, setProfitChartMode] = useState<ProfitChartMode>('area');

  const today = todayJakarta();
  const currentYear = Number(today.slice(0, 4));
  const dateRange = useMemo(
    () => getDateRangeFromPreset(filterPreset, customStart, customEnd),
    [filterPreset, customStart, customEnd]
  );

  const gridStroke = isDark ? 'rgba(185, 228, 232, 0.14)' : 'rgba(7, 27, 43, 0.10)';
  const axisTickColor = isDark ? '#B9E4E8' : '#355365';
  const chartPalette = isDark ? CHART_COLORS_DARK : CHART_COLORS_LIGHT;

  // Ringkasan Hari Ini
  const todaySummary = useMemo(
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
        startDate: today,
        endDate: today,
      }),
    [data, today]
  );

  // Ringkasan Filter Aktif (Default Bulan Ini)
  const filteredSummary = useMemo(
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

  // Stok Ayam Metrics
  const stock = data.chickenStock;
  const initialStock = stock?.initial_stock ?? data.settings?.initial_chicken_stock ?? 808;
  const totalIn = stock?.total_in ?? 0;
  const totalSold = stock?.total_sold ?? 0;
  const totalDead = stock?.total_dead ?? 0;
  const totalCulled = stock?.total_culled ?? 0;
  const currentStock = stock?.current_stock ?? initialStock;
  const totalPopulationHandled = initialStock + totalIn;
  const mortalityPct =
    totalPopulationHandled > 0 ? (totalDead / totalPopulationHandled) * 100 : 0;

  const latestWeight =
    data.weightRecords.length > 0
      ? data.weightRecords[data.weightRecords.length - 1]
      : null;

  const totalFeedKg = data.feedInventory.reduce(
    (s, f) => s + Number(f.current_stock_kg),
    0
  );
  const minChickenAlert = data.settings?.min_chicken_stock_alert ?? 100;
  const minFeedAlert = data.settings?.min_feed_stock_kg_alert ?? 100;

  // Grafik Bulanan
  const monthlySeries = useMemo(
    () => buildMonthlyFinancialSeries(data.transactions, currentYear),
    [data.transactions, currentYear]
  );

  // Grafik Perkembangan Stok Ayam
  const stockTrendSeries = useMemo(() => {
    const ordered = [...data.stockMovements]
      .filter((m) => !m.is_reversed)
      .reverse()
      .slice(-20);
    return ordered.map((m) => ({
      tanggal: formatDateID(m.movement_date),
      stok: m.stock_after,
      keterangan: m.reason,
    }));
  }, [data.stockMovements]);

  // Grafik Pengeluaran Berdasarkan Kategori
  const { expenseByCategory, expenseCategoryTotal } = useMemo(() => {
    const map = new Map<string, number>();
    let totalAll = 0;
    for (const tx of data.transactions) {
      if (
        !tx.is_deleted &&
        tx.tx_type === 'expense' &&
        tx.tx_date >= dateRange.start &&
        tx.tx_date <= dateRange.end
      ) {
        const amt = Number(tx.amount);
        map.set(tx.category, (map.get(tx.category) ?? 0) + amt);
        totalAll += amt;
      }
    }
    const items = Array.from(map.entries())
      .map(([cat, total]) => ({
        name: EXPENSE_CATEGORY_LABELS[cat] ?? cat,
        total,
        pct: totalAll > 0 ? (total / totalAll) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
    return { expenseByCategory: items, expenseCategoryTotal: totalAll };
  }, [data.transactions, dateRange]);

  // Grafik Penjualan Ayam Berdasarkan Metode Pembayaran
  const salesByMethod = useMemo(() => {
    const map = new Map<string, number>();
    for (const inc of data.incomeTransactions) {
      if (
        !inc.is_deleted &&
        (inc.category === 'penjualan_ekor' || inc.category === 'penjualan_kg') &&
        inc.tx_date >= dateRange.start &&
        inc.tx_date <= dateRange.end
      ) {
        map.set(inc.payment_method, (map.get(inc.payment_method) ?? 0) + Number(inc.total_amount));
      }
    }
    return Array.from(map.entries()).map(([method, total]) => ({
      name: PAYMENT_METHOD_LABELS[method] ?? method,
      total,
    }));
  }, [data.incomeTransactions, dateRange]);

  return (
    <div className="space-y-6">
      {/* Peringatan Stok Minimum */}
      {(currentStock <= minChickenAlert || totalFeedKg <= minFeedAlert) && (
        <div className="flex flex-col gap-2 rounded-2xl border border-red-300/70 bg-red-50/90 p-4 text-sm text-red-800 dark:border-red-500/35 dark:bg-red-950/35 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <div className="font-semibold">Peringatan Batas Minimum Stok</div>
              <div className="text-xs text-red-700 dark:text-red-300/90">
                {currentStock <= minChickenAlert && (
                  <span>
                    Stok ayam ({formatNumber(currentStock)} ekor) berada di bawah batas minimum (
                    {formatNumber(minChickenAlert)} ekor).{' '}
                  </span>
                )}
                {totalFeedKg <= minFeedAlert && (
                  <span>
                    Stok pakan ({formatNumber(totalFeedKg, 1)} kg) berada di bawah batas minimum (
                    {formatNumber(minFeedAlert)} kg).
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {totalFeedKg <= minFeedAlert && (
              <button
                type="button"
                onClick={() => onNavigate('pengeluaran', 'pakan')}
                className="min-h-[38px] rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 whitespace-nowrap"
              >
                Beli Pakan
              </button>
            )}
          </div>
        </div>
      )}

      {/* Menu Cepat (Quick Actions) */}
      <section aria-label="Menu Cepat">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#B9E4E8]">
              Aksi Cepat Harian
            </h2>
            <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
              {data.selectedBranch?.name ?? 'Cabang Aktif'} · {data.activePeriod?.name ?? 'Periode Aktif'} · Zona Waktu Asia/Jakarta
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <button
            type="button"
            onClick={() => onNavigate('pemasukan')}
            className="flex min-h-[54px] items-center gap-2.5 rounded-2xl bg-gradient-to-br from-[#167D8D] to-[#071B2B] px-3.5 py-2.5 text-left text-xs font-semibold text-[#EEEEEE] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border dark:border-[#B9E4E8]/30"
          >
            <ArrowUpCircle className="h-4 w-4 shrink-0 text-[#B9E4E8]" />
            <span>Tambah Pemasukan</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('pengeluaran')}
            className="farm-card flex min-h-[54px] items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-[#071B2B] transition-all hover:-translate-y-0.5 hover:border-[#167D8D]/50 dark:text-[#EEEEEE]"
          >
            <ArrowDownCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>Tambah Pengeluaran</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('pemasukan', 'penjualan_kg')}
            className="farm-card flex min-h-[54px] items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-[#071B2B] transition-all hover:-translate-y-0.5 hover:border-[#167D8D]/50 dark:text-[#EEEEEE]"
          >
            <Bird className="h-4 w-4 shrink-0 text-[#167D8D] dark:text-[#B9E4E8]" />
            <span>Penjualan Ayam</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('pengeluaran', 'bibit_ayam')}
            className="farm-card flex min-h-[54px] items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-[#071B2B] transition-all hover:-translate-y-0.5 hover:border-[#167D8D]/50 dark:text-[#EEEEEE]"
          >
            <Plus className="h-4 w-4 shrink-0 text-[#D4A359]" />
            <span>Pembelian Bibit</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('stok_ayam', 'mati')}
            className="farm-card flex min-h-[54px] items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-[#071B2B] transition-all hover:-translate-y-0.5 hover:border-[#167D8D]/50 dark:text-[#EEEEEE]"
          >
            <Skull className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>Catat Ayam Mati</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('stok_pakan', 'pakai')}
            className="farm-card flex min-h-[54px] items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold text-[#071B2B] transition-all hover:-translate-y-0.5 hover:border-[#167D8D]/50 dark:text-[#EEEEEE]"
          >
            <Package className="h-4 w-4 shrink-0 text-[#167D8D] dark:text-[#B9E4E8]" />
            <span>Pemakaian Pakan</span>
          </button>
        </div>
      </section>

      {/* Filter Periode Waktu Dashboard */}
      <section className="farm-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'today', label: 'Hari Ini' },
              { id: 'yesterday', label: 'Kemarin' },
              { id: 'this_week', label: 'Minggu Ini' },
              { id: 'this_month', label: 'Bulan Ini' },
              { id: 'last_month', label: 'Bulan Lalu' },
              { id: 'this_year', label: 'Tahun Ini' },
              { id: 'custom', label: 'Pilih Tanggal' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterPreset(f.id as DateFilterPreset)}
                className={`min-h-[36px] rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  filterPreset === f.id
                    ? 'bg-[#167D8D] text-white dark:bg-[#B9E4E8] dark:text-[#071B2B]'
                    : 'bg-[#EEEEEE] text-[#071B2B] hover:bg-[#B9E4E8]/55 dark:bg-[#113047] dark:text-[#B9E4E8] dark:hover:bg-[#167D8D]/45'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="text-xs font-medium text-[#355365] dark:text-[#8BC2CB]">
            Rentang:{' '}
            <span className="font-semibold text-[#071B2B] dark:text-[#B9E4E8]">
              {dateRange.label}
            </span>
          </div>
        </div>

        {filterPreset === 'custom' && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#167D8D]/15 pt-3 dark:border-[#B9E4E8]/15">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[#355365] dark:text-[#8BC2CB]">Dari:</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="min-h-[38px] rounded-lg border border-[#167D8D]/25 px-2.5 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[#355365] dark:text-[#8BC2CB]">
                Sampai:
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="min-h-[38px] rounded-lg border border-[#167D8D]/25 px-2.5 text-xs"
              />
            </div>
          </div>
        )}
      </section>

      {/* A. INFORMASI STOK AYAM */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#B9E4E8]">
            Informasi Stok Ayam Kampung
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('stok_ayam')}
            className="text-xs font-semibold text-[#167D8D] hover:text-[#071B2B] hover:underline dark:text-[#B9E4E8]"
          >
            Lihat Rincian Stok &rarr;
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <div className="relative overflow-hidden rounded-2xl border border-[#167D8D]/40 bg-gradient-to-br from-[#071B2B] via-[#0C2C44] to-[#167D8D] p-4.5 text-[#EEEEEE] shadow-md">
            <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-[#B9E4E8]/20 blur-xl" />
            <div className="text-xs font-medium text-[#B9E4E8]">Stok Ayam Saat Ini</div>
            <div className="mt-1.5 font-mono text-2xl font-bold text-white tabular-nums">
              {formatNumber(currentStock)}{' '}
              <span className="text-sm font-normal text-[#B9E4E8]">ekor</span>
            </div>
            <div className="mt-1 text-[11px] text-[#B9E4E8]/85">
              Stok awal periode: {formatNumber(initialStock)} ekor
            </div>
          </div>

          <div className="farm-card p-4.5">
            <div className="text-xs font-medium text-[#355365] dark:text-[#8BC2CB]">
              Ayam Masuk / Terjual
            </div>
            <div className="mt-1.5 flex items-baseline gap-2 font-mono text-lg font-bold tabular-nums">
              <span className="text-[#071B2B] dark:text-[#B9E4E8]">+{formatNumber(totalIn)}</span>
              <span className="text-slate-300 dark:text-[#167D8D]">/</span>
              <span className="text-[#167D8D] dark:text-[#EEEEEE]">-{formatNumber(totalSold)}</span>
            </div>
            <div className="mt-1 text-[11px] text-[#355365] dark:text-[#8BC2CB]">
              Masuk bibit · Terjual
            </div>
          </div>

          <div className="farm-card p-4.5">
            <div className="text-xs font-medium text-[#355365] dark:text-[#8BC2CB]">
              Mati / Afkir / Mortalitas
            </div>
            <div className="mt-1.5 font-mono text-lg font-bold text-rose-600 tabular-nums dark:text-rose-400">
              {formatNumber(totalDead)}{' '}
              <span className="text-xs font-normal text-[#355365] dark:text-[#8BC2CB]">mati</span> ·{' '}
              {formatNumber(totalCulled)}{' '}
              <span className="text-xs font-normal text-[#355365] dark:text-[#8BC2CB]">afkir</span>
            </div>
            <div className="mt-1 text-[11px] text-[#355365] tabular-nums dark:text-[#8BC2CB]">
              Persentase kematian: {formatNumber(mortalityPct, 2)}%
            </div>
          </div>

          <div className="farm-card p-4.5">
            <div className="text-xs font-medium text-[#355365] dark:text-[#8BC2CB]">
              Berat Rata-Rata Terakhir
            </div>
            <div className="mt-1.5 font-mono text-2xl font-bold text-[#071B2B] tabular-nums dark:text-[#B9E4E8]">
              {latestWeight ? `${formatNumber(latestWeight.average_weight_kg, 2)} kg` : '-'}
            </div>
            <div className="mt-1 text-[11px] text-[#355365] dark:text-[#8BC2CB]">
              {latestWeight
                ? `Penimbangan ${formatDateID(latestWeight.weigh_date)}`
                : 'Belum ada data penimbangan'}
            </div>
          </div>
        </div>
      </section>

      {/* B. INFORMASI KEUANGAN */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#B9E4E8]">
            Ringkasan Keuangan
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('laporan')}
            className="text-xs font-semibold text-[#167D8D] hover:text-[#071B2B] hover:underline dark:text-[#B9E4E8]"
          >
            Buka Laporan Lengkap &rarr;
          </button>
        </div>

        {/* Hari Ini vs Filter Aktif */}
        <div className="grid gap-3.5 md:grid-cols-3">
          <div className="farm-card p-4.5">
            <div className="text-xs font-medium text-[#355365] dark:text-[#8BC2CB]">
              Hari Ini ({formatDateID(today)})
            </div>
            <div className="mt-2.5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#355365] dark:text-[#8BC2CB]">Pemasukan</span>
                <span className="font-mono font-semibold text-[#167D8D] tabular-nums dark:text-[#B9E4E8]">
                  {formatRupiah(todaySummary.totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#355365] dark:text-[#8BC2CB]">Pengeluaran Aktual</span>
                <span className="font-mono font-semibold text-rose-600 tabular-nums dark:text-rose-400">
                  {formatRupiah(todaySummary.totalCashOut)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#167D8D]/15 pt-2 dark:border-[#B9E4E8]/15">
                <span className="font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Keuntungan Bersih
                </span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    todaySummary.netProfit >= 0
                      ? 'text-[#167D8D] dark:text-[#B9E4E8]'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatRupiah(todaySummary.netProfit)}
                </span>
              </div>
            </div>
          </div>

          <div className="farm-card p-4.5">
            <div className="text-xs font-medium text-[#355365] dark:text-[#8BC2CB]">
              Periode Terpilih ({dateRange.label})
            </div>
            <div className="mt-2.5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#355365] dark:text-[#8BC2CB]">Total Pendapatan</span>
                <span className="font-mono font-semibold text-[#167D8D] tabular-nums dark:text-[#B9E4E8]">
                  {formatRupiah(filteredSummary.totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#355365] dark:text-[#8BC2CB]">
                  Beban Operasional &amp; Pakan Terpakai
                </span>
                <span className="font-mono font-semibold text-rose-600 tabular-nums dark:text-rose-400">
                  {formatRupiah(filteredSummary.totalOperatingExpense)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#167D8D]/15 pt-2 dark:border-[#B9E4E8]/15">
                <span className="font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Keuntungan Bersih (Laba Rugi)
                </span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    filteredSummary.netProfit >= 0
                      ? 'text-[#167D8D] dark:text-[#B9E4E8]'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatRupiah(filteredSummary.netProfit)}
                </span>
              </div>
            </div>
          </div>

          <div className="farm-card p-4.5">
            <div className="text-xs font-medium text-[#355365] dark:text-[#8BC2CB]">
              Arus Kas &amp; Tagihan
            </div>
            <div className="mt-2.5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#355365] dark:text-[#8BC2CB]">Kas Masuk Aktual</span>
                <span className="font-mono font-semibold text-[#167D8D] tabular-nums dark:text-[#B9E4E8]">
                  {formatRupiah(filteredSummary.totalCashIn)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#355365] dark:text-[#8BC2CB]">Piutang Belum Lunas</span>
                <span className="font-mono font-semibold text-[#D4A359] tabular-nums">
                  {formatRupiah(filteredSummary.outstandingReceivables)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#167D8D]/15 pt-2 dark:border-[#B9E4E8]/15">
                <span className="text-[#355365] dark:text-[#8BC2CB]">Utang Usaha Belum Lunas</span>
                <span className="font-mono font-semibold text-rose-600 tabular-nums dark:text-rose-400">
                  {formatRupiah(filteredSummary.outstandingDebts)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rincian Pos Utama */}
        <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              label: 'Penjualan Ayam',
              val: filteredSummary.salesChickenRevenue,
              tone: 'text-[#167D8D] dark:text-[#B9E4E8]',
            },
            {
              label: 'Penjualan Kotoran',
              val: filteredSummary.salesManureRevenue,
              tone: 'text-[#167D8D] dark:text-[#B9E4E8]',
            },
            {
              label: 'Biaya Bibit',
              val: filteredSummary.bibitCost,
              tone: 'text-[#071B2B] dark:text-[#EEEEEE]',
            },
            {
              label: 'Pembelian Pakan',
              val: filteredSummary.feedInventoryPurchaseInRange,
              tone: 'text-[#071B2B] dark:text-[#EEEEEE]',
            },
            {
              label: 'Biaya Operasional',
              val: filteredSummary.operationalCost,
              tone: 'text-[#071B2B] dark:text-[#EEEEEE]',
            },
            {
              label: 'Gaji Dibayar',
              val: filteredSummary.salaryPaidCost,
              tone: 'text-[#071B2B] dark:text-[#EEEEEE]',
            },
          ].map((item) => (
            <div key={item.label} className="farm-card px-3.5 py-3">
              <div className="text-[11px] font-medium text-[#355365] dark:text-[#8BC2CB]">
                {item.label}
              </div>
              <div className={`mt-1 font-mono text-sm font-bold tabular-nums ${item.tone}`}>
                {formatRupiah(item.val)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* C. GRAFIK VISUAL PREMIUM + MODE GRAFIK INTERAKTIF */}
      <section className="grid gap-4.5 lg:grid-cols-2">
        {/* 1. Pemasukan, Pengeluaran & Laba (3 Mode Grafik) */}
        <div className="farm-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-bold text-[#071B2B] dark:text-[#B9E4E8]">
                Arus Keuangan Bulanan ({currentYear})
              </h3>
              <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
                Visualisasi pemasukan, pengeluaran &amp; tren laba
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-[#167D8D]/20 bg-[#EEEEEE] p-0.5 dark:border-[#B9E4E8]/20 dark:bg-[#071B2B]">
              {[
                { id: 'composed' as FinanceChartMode, label: 'Kombinasi', icon: Layers },
                { id: 'area' as FinanceChartMode, label: 'Gelombang', icon: TrendingUp },
                { id: 'bar' as FinanceChartMode, label: 'Batang', icon: BarChart2 },
              ].map((m) => {
                const Icon = m.icon;
                const active = financeChartMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setFinanceChartMode(m.id)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all whitespace-nowrap ${
                      active
                        ? 'bg-[#167D8D] text-white shadow-xs dark:bg-[#B9E4E8] dark:text-[#071B2B]'
                        : 'text-[#355365] hover:text-[#071B2B] dark:text-[#8BC2CB] dark:hover:text-[#B9E4E8]'
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-68 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {financeChartMode === 'area' ? (
                <AreaChart data={monthlySeries}>
                  <defs>
                    <linearGradient id="gradIncomeArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#167D8D" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#B9E4E8" stopOpacity={0.04} />
                    </linearGradient>
                    <linearGradient id="gradExpenseArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E11D48" stopOpacity={0.34} />
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
                    name="Pemasukan"
                    stroke={isDark ? '#B9E4E8' : '#167D8D'}
                    strokeWidth={2.5}
                    fill="url(#gradIncomeArea)"
                    activeDot={{ r: 5, fill: '#B9E4E8', stroke: '#071B2B', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pengeluaran"
                    name="Pengeluaran"
                    stroke="#E11D48"
                    strokeWidth={2.2}
                    fill="url(#gradExpenseArea)"
                    activeDot={{ r: 5, fill: '#FB7185', stroke: '#881337', strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : financeChartMode === 'bar' ? (
                <BarChart data={monthlySeries} barGap={4}>
                  <defs>
                    <linearGradient id="gradIncomeBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isDark ? '#B9E4E8' : '#167D8D'} />
                      <stop offset="100%" stopColor={isDark ? '#167D8D' : '#071B2B'} />
                    </linearGradient>
                    <linearGradient id="gradExpenseBar" x1="0" y1="0" x2="0" y2="1">
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
                  <Bar dataKey="pemasukan" name="Pemasukan" fill="url(#gradIncomeBar)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="pengeluaran" name="Pengeluaran" fill="url(#gradExpenseBar)" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <ComposedChart data={monthlySeries} barGap={4}>
                  <defs>
                    <linearGradient id="gradCompIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isDark ? '#B9E4E8' : '#167D8D'} />
                      <stop offset="100%" stopColor={isDark ? '#167D8D' : '#071B2B'} />
                    </linearGradient>
                    <linearGradient id="gradCompExpense" x1="0" y1="0" x2="0" y2="1">
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
                  <Bar dataKey="pemasukan" name="Pemasukan" fill="url(#gradCompIncome)" radius={[5, 5, 0, 0]} barSize={14} />
                  <Bar dataKey="pengeluaran" name="Pengeluaran" fill="url(#gradCompExpense)" radius={[5, 5, 0, 0]} barSize={14} />
                  <Line
                    type="monotone"
                    dataKey="labaBersih"
                    name="Laba Bersih"
                    stroke={isDark ? '#EEEEEE' : '#071B2B'}
                    strokeWidth={2.6}
                    dot={{ r: 3.5, fill: '#167D8D', strokeWidth: 1.5, stroke: isDark ? '#071B2B' : '#FFFFFF' }}
                    activeDot={{ r: 6, fill: '#B9E4E8', stroke: '#071B2B', strokeWidth: 2 }}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Keuntungan Bersih Per Bulan (Mode Area / Batang) */}
        <div className="farm-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-bold text-[#071B2B] dark:text-[#B9E4E8]">
                Keuntungan Bersih Per Bulan ({currentYear})
              </h3>
              <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
                Selisih pemasukan dan pengeluaran bulanan
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-[#167D8D]/20 bg-[#EEEEEE] p-0.5 dark:border-[#B9E4E8]/20 dark:bg-[#071B2B]">
              {[
                { id: 'area' as ProfitChartMode, label: 'Kurva' },
                { id: 'bar' as ProfitChartMode, label: 'Batang' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setProfitChartMode(m.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                    profitChartMode === m.id
                      ? 'bg-[#167D8D] text-white dark:bg-[#B9E4E8] dark:text-[#071B2B]'
                      : 'text-[#355365] hover:text-[#071B2B] dark:text-[#8BC2CB]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-68 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {profitChartMode === 'area' ? (
                <AreaChart data={monthlySeries}>
                  <defs>
                    <linearGradient id="gradProfitArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isDark ? '#B9E4E8' : '#167D8D'} stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#167D8D" stopOpacity={0.02} />
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
                  <ReferenceLine y={0} stroke={isDark ? '#B9E4E8' : '#167D8D'} strokeDasharray="3 3" strokeOpacity={0.5} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="labaBersih"
                    name="Keuntungan Bersih"
                    stroke={isDark ? '#B9E4E8' : '#167D8D'}
                    strokeWidth={2.5}
                    fill="url(#gradProfitArea)"
                    dot={{ r: 3, fill: '#167D8D' }}
                    activeDot={{ r: 5.5, fill: '#B9E4E8', stroke: '#071B2B', strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={monthlySeries}>
                  <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: axisTickColor }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: axisTickColor }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${Math.round(Number(v) / 1000)}rb`}
                  />
                  <ReferenceLine y={0} stroke={axisTickColor} strokeOpacity={0.4} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="labaBersih" name="Keuntungan Bersih" radius={[6, 6, 0, 0]}>
                    {monthlySeries.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          entry.labaBersih >= 0
                            ? isDark
                              ? '#B9E4E8'
                              : '#167D8D'
                            : '#E11D48'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Perkembangan Stok Ayam */}
        <div className="farm-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-[#071B2B] dark:text-[#B9E4E8]">
                Perkembangan Populasi Ayam
              </h3>
              <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
                Riwayat perubahan stok ekor ternak aktif
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-[#167D8D] dark:text-[#B9E4E8]">
              {formatNumber(currentStock)} ekor
            </span>
          </div>
          <div className="h-64 w-full">
            {stockTrendSeries.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-[#355365] dark:text-[#8BC2CB]">
                Belum ada pergerakan stok tercatat.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stockTrendSeries}>
                  <defs>
                    <linearGradient id="gradStockArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#167D8D" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#B9E4E8" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 10, fill: axisTickColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: axisTickColor }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomChartTooltip valueType="ekor" />} />
                  <Area
                    type="monotone"
                    dataKey="stok"
                    name="Populasi"
                    stroke={isDark ? '#B9E4E8' : '#167D8D'}
                    strokeWidth={2.5}
                    fill="url(#gradStockArea)"
                    dot={{ r: 3.5, fill: '#167D8D', stroke: isDark ? '#071B2B' : '#FFFFFF', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#B9E4E8', stroke: '#071B2B', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 4 & 5. Donut Pengeluaran per Kategori + Metode Penjualan */}
        <div className="grid gap-4.5 sm:grid-cols-2">
          <div className="farm-card p-5">
            <h3 className="font-display text-sm font-bold text-[#071B2B] dark:text-[#B9E4E8]">
              Pengeluaran per Kategori
            </h3>
            <p className="mb-2 text-xs text-[#355365] dark:text-[#8BC2CB]">{dateRange.label}</p>
            <div className="h-44 w-full">
              {expenseByCategory.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-[#355365] dark:text-[#8BC2CB]">
                  Belum ada pengeluaran pada periode ini.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={68}
                      paddingAngle={2.5}
                      stroke="none"
                    >
                      {expenseByCategory.map((_, i) => (
                        <Cell key={i} fill={chartPalette[i % chartPalette.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {expenseByCategory.length > 0 && (
              <div className="mt-2 space-y-1.5 border-t border-[#167D8D]/15 pt-2.5 text-[11px] dark:border-[#B9E4E8]/15">
                <div className="flex justify-between font-semibold text-[#071B2B] dark:text-[#B9E4E8]">
                  <span>Total Kategori</span>
                  <span className="font-mono tabular-nums">{formatRupiah(expenseCategoryTotal)}</span>
                </div>
                {expenseByCategory.slice(0, 3).map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate text-[#355365] dark:text-[#8BC2CB]">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: chartPalette[idx % chartPalette.length] }}
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-mono font-semibold text-[#071B2B] tabular-nums dark:text-[#EEEEEE]">
                      {formatNumber(item.pct, 0)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="farm-card p-5">
            <h3 className="font-display text-sm font-bold text-[#071B2B] dark:text-[#B9E4E8]">
              Penjualan Ayam per Metode
            </h3>
            <p className="mb-3 text-xs text-[#355365] dark:text-[#8BC2CB]">{dateRange.label}</p>
            <div className="h-52 w-full">
              {salesByMethod.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-[#355365] dark:text-[#8BC2CB]">
                  Belum ada penjualan ayam pada periode ini.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesByMethod} layout="vertical">
                    <defs>
                      <linearGradient id="gradSalesMethod" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={isDark ? '#167D8D' : '#071B2B'} />
                        <stop offset="100%" stopColor={isDark ? '#B9E4E8' : '#167D8D'} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={86}
                      tick={{ fontSize: 11, fill: axisTickColor }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar
                      dataKey="total"
                      name="Total Penjualan"
                      fill="url(#gradSalesMethod)"
                      radius={[0, 8, 8, 0]}
                      barSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
