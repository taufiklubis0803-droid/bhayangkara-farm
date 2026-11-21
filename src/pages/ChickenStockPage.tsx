import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert, Skull } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CustomChartTooltip } from '../components/ChartTooltip';
import { PinConfirmModal } from '../components/PinConfirmModal';
import type { FarmDataState } from '../hooks/useFarmData';
import { useTheme } from '../hooks/useTheme';
import { adjustChickenStock, recordChickenLoss } from '../services/farmService';
import {
  BULAN_INDONESIA,
  MOVEMENT_TYPE_LABELS,
  formatDateID,
  formatNumber,
  todayJakarta,
} from '../utils/format';

interface ChickenStockPageProps {
  data: FarmDataState;
  currentOperator: string;
  onRefresh: () => Promise<void>;
}

export const ChickenStockPage: React.FC<ChickenStockPageProps> = ({
  data,
  currentOperator,
  onRefresh,
}) => {
  const { isDark } = useTheme();
  const [lossDate, setLossDate] = useState(todayJakarta());
  const [lossType, setLossType] = useState<'mati' | 'afkir'>('mati');
  const [lossQty, setLossQty] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [lossNotes, setLossNotes] = useState('');
  const [operatorName, setOperatorName] = useState(currentOperator);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [chartMode, setChartMode] = useState<'area' | 'bar'>('area');

  // Koreksi Stok Modal State
  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjType, setAdjType] = useState<'koreksi_tambah' | 'koreksi_kurang'>('koreksi_tambah');
  const [adjQty, setAdjQty] = useState('');
  const [adjDate, setAdjDate] = useState(todayJakarta());
  const [pinModalOpen, setPinModalOpen] = useState(false);

  useEffect(() => {
    setOperatorName(currentOperator);
  }, [currentOperator]);

  const stock = data.chickenStock;
  const minAlert = data.settings?.min_chicken_stock_alert ?? 100;
  const currentStock = stock?.current_stock ?? 0;

  const gridStroke = isDark ? 'rgba(185, 228, 232, 0.14)' : 'rgba(7, 27, 43, 0.10)';
  const axisTickColor = isDark ? '#B9E4E8' : '#355365';

  const handleRecordLoss = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!data.selectedPeriodId) {
      setFeedback({
        type: 'err',
        msg: 'Periode ternak aktif belum termuat. Muat ulang halaman atau periksa koneksi Supabase.',
      });
      return;
    }
    setSubmitting(true);
    try {
      await recordChickenLoss(data.isLiveSupabase, {
        periodId: data.selectedPeriodId,
        recordDate: lossDate,
        lossType,
        quantity: Number(lossQty),
        symptoms: symptoms.trim() || (lossType === 'mati' ? 'Ayam mati di kandang' : 'Ayam afkir'),
        actionTaken: actionTaken.trim() || null,
        notes: lossNotes.trim() || null,
        operatorName: operatorName || currentOperator,
      });
      setLossQty('');
      setSymptoms('');
      setActionTaken('');
      setLossNotes('');
      setFeedback({
        type: 'ok',
        msg: `Catatan ayam ${lossType} berhasil disimpan dan stok ayam diperbarui.`,
      });
      await onRefresh();
    } catch (err) {
      setFeedback({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Gagal mencatat pengurangan stok ayam.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Rekap Kematian Harian & Bulanan
  const mortalityRecap = useMemo(() => {
    const deadMoves = data.stockMovements.filter(
      (m) => !m.is_reversed && m.movement_type === 'mati'
    );
    const byDay = new Map<string, number>();
    const byMonth = new Map<string, number>();
    for (const m of deadMoves) {
      byDay.set(m.movement_date, (byDay.get(m.movement_date) ?? 0) + m.quantity);
      const ym = m.movement_date.slice(0, 7);
      byMonth.set(ym, (byMonth.get(ym) ?? 0) + m.quantity);
    }
    return {
      daily: Array.from(byDay.entries()).slice(0, 10),
      monthly: Array.from(byMonth.entries()).map(([ym, qty]) => {
        const [y, m] = ym.split('-');
        return { label: `${BULAN_INDONESIA[Number(m) - 1] ?? m} ${y}`, qty };
      }),
    };
  }, [data.stockMovements]);

  const chartData = useMemo(() => {
    return [...data.stockMovements]
      .filter((m) => !m.is_reversed)
      .reverse()
      .map((m) => ({
        tanggal: formatDateID(m.movement_date),
        stok: m.stock_after,
      }));
  }, [data.stockMovements]);

  return (
    <div className="space-y-6">
      {currentStock <= minAlert && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-rose-400" />
          <div>
            <strong>Peringatan Stok Minimum:</strong> Stok ayam tersedia saat ini ({formatNumber(currentStock)} ekor) sudah mencapai atau di bawah batas minimum ({formatNumber(minAlert)} ekor).
          </div>
        </div>
      )}

      {/* Ringkasan Formula Stok Ayam */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="farm-card p-4">
          <div className="text-xs text-[#355365] dark:text-[#8BC2CB]">Stok Awal</div>
          <div className="mt-1 font-mono text-xl font-bold text-[#071B2B] tabular-nums dark:text-[#B9E4E8]">
            {formatNumber(stock?.initial_stock ?? 808)}
          </div>
        </div>
        <div className="farm-card p-4">
          <div className="text-xs text-[#355365] dark:text-[#8BC2CB]">Total Masuk</div>
          <div className="mt-1 font-mono text-xl font-bold text-[#167D8D] tabular-nums dark:text-[#B9E4E8]">
            +{formatNumber(stock?.total_in ?? 0)}
          </div>
        </div>
        <div className="farm-card p-4">
          <div className="text-xs text-[#355365] dark:text-[#8BC2CB]">Total Terjual</div>
          <div className="mt-1 font-mono text-xl font-bold text-[#D4A359] tabular-nums">
            -{formatNumber(stock?.total_sold ?? 0)}
          </div>
        </div>
        <div className="farm-card p-4">
          <div className="text-xs text-[#355365] dark:text-[#8BC2CB]">Total Mati</div>
          <div className="mt-1 font-mono text-xl font-bold text-red-600 tabular-nums dark:text-rose-400">
            -{formatNumber(stock?.total_dead ?? 0)}
          </div>
        </div>
        <div className="farm-card p-4">
          <div className="text-xs text-[#355365] dark:text-[#8BC2CB]">Total Afkir</div>
          <div className="mt-1 font-mono text-xl font-bold text-amber-600 tabular-nums dark:text-amber-400">
            -{formatNumber(stock?.total_culled ?? 0)}
          </div>
        </div>
        <div className="rounded-2xl border border-[#167D8D]/40 bg-gradient-to-br from-[#071B2B] to-[#167D8D] p-4 text-[#EEEEEE] shadow-md">
          <div className="text-xs text-[#B9E4E8]">Stok Tersedia</div>
          <div className="mt-1 font-mono text-xl font-bold text-white tabular-nums">
            {formatNumber(currentStock)} ekor
          </div>
        </div>
      </div>

      {/* Form Catat Ayam Mati / Afkir & Koreksi */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="farm-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Skull className="h-5 w-5 text-red-600 dark:text-rose-400" />
            <div>
              <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#B9E4E8]">
                Catat Ayam Mati / Afkir
              </h2>
              <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
                Mengurangi stok ayam tersedia secara atomik dan mencatat histori kesehatan
              </p>
            </div>
          </div>

          {feedback && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                feedback.type === 'ok'
                  ? 'border-[#167D8D]/40 bg-[#B9E4E8]/50 text-[#071B2B] dark:border-[#B9E4E8]/30 dark:bg-[#167D8D]/30 dark:text-[#B9E4E8]'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300'
              }`}
            >
              {feedback.type === 'ok' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{feedback.msg}</span>
            </div>
          )}

          <form onSubmit={handleRecordLoss} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold">Tanggal</label>
              <input
                type="date"
                required
                value={lossDate}
                onChange={(e) => setLossDate(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Jenis Pengurangan</label>
              <select
                value={lossType}
                onChange={(e) => setLossType(e.target.value as 'mati' | 'afkir')}
                className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-[#167D8D]/40 dark:bg-[#091D2E]"
              >
                <option value="mati">Ayam Mati</option>
                <option value="afkir">Ayam Afkir</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Jumlah (ekor)</label>
              <input
                type="number"
                min={1}
                required
                value={lossQty}
                onChange={(e) => setLossQty(e.target.value)}
                placeholder="1"
                className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Operator</label>
              <select
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-[#167D8D]/40 dark:bg-[#091D2E]"
              >
                {data.operators.map((op) => (
                  <option key={op.id} value={op.display_name}>
                    {op.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold">Penyebab / Gejala</label>
              <input
                type="text"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Contoh: Lemas, cuaca dingin, atau cedera"
                className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold">Tindakan / Catatan</label>
              <input
                type="text"
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="Contoh: Dikubur / dipisahkan dari kandang utama"
                className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAdjustForm((prev) => !prev)}
                className="text-xs font-semibold text-[#D4A359] hover:underline"
              >
                {showAdjustForm ? 'Tutup Koreksi Stok Khusus' : 'Koreksi Stok Manual (PIN Pemilik)'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[42px] rounded-xl bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Pengurangan Stok'}
              </button>
            </div>
          </form>

          {showAdjustForm && (
            <div className="mt-4 border-t border-[#167D8D]/15 pt-4 dark:border-[#B9E4E8]/15">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#071B2B] dark:text-[#B9E4E8]">
                <ShieldAlert className="h-4 w-4 text-[#D4A359]" />
                Koreksi Stok Khusus (Dilindungi PIN Pemilik)
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as 'koreksi_tambah' | 'koreksi_kurang')}
                  className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs"
                >
                  <option value="koreksi_tambah">Tambah Stok (+)</option>
                  <option value="koreksi_kurang">Kurangi Stok (-)</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                  placeholder="Jumlah ekor"
                  className="min-h-[40px] rounded-lg border border-slate-300 px-2.5 font-mono text-xs"
                />
                <input
                  type="date"
                  value={adjDate}
                  onChange={(e) => setAdjDate(e.target.value)}
                  className="min-h-[40px] rounded-lg border border-slate-300 px-2.5 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => setPinModalOpen(true)}
                disabled={!adjQty || Number(adjQty) <= 0}
                className="mt-3 min-h-[40px] rounded-lg bg-[#167D8D] px-4 text-xs font-semibold text-white hover:bg-[#071B2B] disabled:opacity-50 dark:bg-[#B9E4E8] dark:text-[#071B2B]"
              >
                Ajukan Koreksi Stok dengan PIN
              </button>
            </div>
          )}
        </div>

        {/* Grafik Stok & Rekap Kematian */}
        <div className="space-y-4">
          <div className="farm-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold text-[#071B2B] dark:text-[#B9E4E8]">
                Grafik Perkembangan Stok Ayam
              </h3>
              <div className="inline-flex rounded-xl border border-[#167D8D]/20 bg-[#EEEEEE] p-1 dark:border-[#B9E4E8]/20 dark:bg-[#071B2B]">
                {(['area', 'bar'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setChartMode(m)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                      chartMode === m
                        ? 'bg-[#167D8D] text-white dark:bg-[#B9E4E8] dark:text-[#071B2B]'
                        : 'text-[#355365] dark:text-[#8BC2CB]'
                    }`}
                  >
                    {m === 'area' ? 'Kurva' : 'Batang'}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'area' ? (
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gradChickenArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#167D8D" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#B9E4E8" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="tanggal" tick={{ fontSize: 10, fill: axisTickColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: axisTickColor }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomChartTooltip valueType="ekor" />} />
                    <Area
                      type="monotone"
                      dataKey="stok"
                      name="Stok"
                      stroke={isDark ? '#B9E4E8' : '#167D8D'}
                      strokeWidth={2.5}
                      fill="url(#gradChickenArea)"
                      dot={{ r: 3.5, fill: '#167D8D', stroke: isDark ? '#071B2B' : '#FFFFFF', strokeWidth: 1.5 }}
                      activeDot={{ r: 5.5, fill: '#B9E4E8', stroke: '#071B2B', strokeWidth: 2 }}
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData}>
                    <defs>
                      <linearGradient id="gradChickenBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isDark ? '#B9E4E8' : '#167D8D'} />
                        <stop offset="100%" stopColor={isDark ? '#167D8D' : '#071B2B'} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="tanggal" tick={{ fontSize: 10, fill: axisTickColor }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: axisTickColor }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomChartTooltip valueType="ekor" />} />
                    <Bar dataKey="stok" name="Stok" fill="url(#gradChickenBar)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="farm-card p-4">
              <h4 className="mb-2 text-xs font-bold text-[#071B2B] dark:text-[#B9E4E8]">
                Rekap Kematian Harian
              </h4>
              {mortalityRecap.daily.length === 0 ? (
                <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
                  Belum ada catatan kematian.
                </p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {mortalityRecap.daily.map(([tgl, q]) => (
                    <div key={tgl} className="flex justify-between">
                      <span className="font-mono text-[#355365] dark:text-[#8BC2CB]">
                        {formatDateID(tgl)}
                      </span>
                      <span className="font-mono font-semibold text-red-600 dark:text-rose-400">
                        {q} ekor
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="farm-card p-4">
              <h4 className="mb-2 text-xs font-bold text-[#071B2B] dark:text-[#B9E4E8]">
                Rekap Kematian Bulanan
              </h4>
              {mortalityRecap.monthly.length === 0 ? (
                <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
                  Belum ada catatan kematian.
                </p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {mortalityRecap.monthly.map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span className="text-[#355365] dark:text-[#8BC2CB]">{row.label}</span>
                      <span className="font-mono font-semibold text-red-600 dark:text-rose-400">
                        {row.qty} ekor
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Histori Pergerakan Stok */}
      <div className="farm-card p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#B9E4E8]">
          Histori Pergerakan Stok Ayam ({data.stockMovements.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#167D8D]/20 text-[#355365] dark:border-[#B9E4E8]/15 dark:text-[#8BC2CB]">
                <th className="py-2.5 pr-3 font-semibold">Tanggal</th>
                <th className="py-2.5 pr-3 font-semibold">Pergerakan</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Jumlah</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Sebelum</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Sesudah</th>
                <th className="py-2.5 pr-3 font-semibold">Alasan / Referensi</th>
                <th className="py-2.5 font-semibold">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#167D8D]/10 dark:divide-[#B9E4E8]/10">
              {data.stockMovements.map((m) => (
                <tr
                  key={m.id}
                  className={
                    m.is_reversed
                      ? 'opacity-45 line-through'
                      : 'hover:bg-[#EEEEEE]/70 dark:hover:bg-[#113047]/60'
                  }
                >
                  <td className="py-2.5 pr-3 font-mono tabular-nums whitespace-nowrap">
                    {formatDateID(m.movement_date)}
                  </td>
                  <td className="py-2.5 pr-3 font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                    {MOVEMENT_TYPE_LABELS[m.movement_type] ?? m.movement_type}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono font-semibold tabular-nums">
                    {m.movement_type === 'masuk' ||
                    m.movement_type === 'koreksi_tambah' ||
                    m.movement_type === 'initial'
                      ? `+${m.quantity}`
                      : `-${m.quantity}`}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-[#355365] dark:text-[#8BC2CB]">
                    {m.stock_before}
                  </td>
                  <td className="py-2.5 pr-3 text-right font-mono font-bold text-[#167D8D] tabular-nums dark:text-[#B9E4E8]">
                    {m.stock_after}
                  </td>
                  <td className="py-2.5 pr-3">{m.reason}</td>
                  <td className="py-2.5 text-[#355365] dark:text-[#8BC2CB]">{m.operator_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PinConfirmModal
        open={pinModalOpen}
        title="Konfirmasi Koreksi Stok Ayam"
        description={`Anda akan melakukan ${adjType === 'koreksi_tambah' ? 'penambahan' : 'pengurangan'} stok sebanyak ${adjQty} ekor.`}
        reasonLabel="Alasan Koreksi Stok"
        onClose={() => setPinModalOpen(false)}
        onConfirm={async (pin, reason) => {
          if (!data.selectedPeriodId) {
            throw new Error('Periode ternak aktif belum termuat.');
          }
          await adjustChickenStock(data.isLiveSupabase, {
            periodId: data.selectedPeriodId,
            adjustmentDate: adjDate,
            adjustmentType: adjType,
            quantity: Number(adjQty),
            reason,
            operatorName: currentOperator,
            pin,
          });
          setAdjQty('');
          setShowAdjustForm(false);
          setFeedback({ type: 'ok', msg: 'Koreksi stok berhasil diterapkan dan dicatat di audit log.' });
          await onRefresh();
        }}
      />
    </div>
  );
};
