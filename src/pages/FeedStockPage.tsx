import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, MinusCircle, Package } from 'lucide-react';
import type { FarmDataState } from '../hooks/useFarmData';
import { recordFeedUsage } from '../services/farmService';
import type { NavMenuKey } from '../types/database';
import { formatDateID, formatNumber, formatRupiah, todayJakarta } from '../utils/format';

interface FeedStockPageProps {
  data: FarmDataState;
  currentOperator: string;
  onRefresh: () => Promise<void>;
  onNavigate: (menu: NavMenuKey) => void;
}

export const FeedStockPage: React.FC<FeedStockPageProps> = ({
  data,
  currentOperator,
  onRefresh,
  onNavigate,
}) => {
  const [selectedFeedId, setSelectedFeedId] = useState(data.feedInventory[0]?.id ?? '');
  const [usageDate, setUsageDate] = useState(todayJakarta());
  const [weightKg, setWeightKg] = useState('');
  const [reason, setReason] = useState('Pemberian pakan harian');
  const [notes, setNotes] = useState('');
  const [operatorName, setOperatorName] = useState(currentOperator);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    setOperatorName(currentOperator);
  }, [currentOperator]);

  useEffect(() => {
    if (data.feedInventory.length === 0) {
      setSelectedFeedId('');
    } else if (!data.feedInventory.some((f) => f.id === selectedFeedId)) {
      setSelectedFeedId(data.feedInventory[0].id);
    }
  }, [data.feedInventory, selectedFeedId]);

  const totalFeedKg = data.feedInventory.reduce((s, f) => s + Number(f.current_stock_kg), 0);
  const totalFeedValue = data.feedInventory.reduce((s, f) => s + Number(f.total_value), 0);
  const minFeedAlert = data.settings?.min_feed_stock_kg_alert ?? 100;

  const totalInKg = data.feedMovements
    .filter((m) => !m.is_reversed && m.movement_type === 'masuk')
    .reduce((s, m) => s + Number(m.weight_kg), 0);
  const totalUsedKg = data.feedMovements
    .filter((m) => !m.is_reversed && m.movement_type === 'pakai')
    .reduce((s, m) => s + Number(m.weight_kg), 0);

  const handleRecordUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!data.selectedPeriodId) {
      setFeedback({
        type: 'err',
        msg: 'Periode ternak aktif belum termuat. Muat ulang halaman atau periksa koneksi Supabase.',
      });
      return;
    }

    const feedId = selectedFeedId || data.feedInventory[0]?.id;
    if (!feedId) {
      setFeedback({ type: 'err', msg: 'Belum ada stok pakan tersedia. Catat pembelian pakan terlebih dahulu.' });
      return;
    }

    setSubmitting(true);
    try {
      await recordFeedUsage(data.isLiveSupabase, {
        periodId: data.selectedPeriodId,
        feedInventoryId: feedId,
        movementDate: usageDate,
        weightKg: Number(weightKg),
        reason: reason.trim() || 'Pemakaian pakan harian',
        notes: notes.trim() || null,
        operatorName: operatorName || currentOperator,
      });
      setWeightKg('');
      setNotes('');
      setFeedback({ type: 'ok', msg: 'Pemakaian pakan berhasil dicatat dan sisa stok diperbarui.' });
      await onRefresh();
    } catch (err) {
      setFeedback({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Gagal mencatat pemakaian pakan.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {totalFeedKg <= minFeedAlert && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-rose-400" />
            <span>
              <strong>Peringatan Stok Pakan Rendah:</strong> Sisa pakan total ({formatNumber(totalFeedKg, 1)} kg) di bawah batas minimum ({formatNumber(minFeedAlert)} kg).
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('pengeluaran')}
            className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            Catat Pembelian Pakan
          </button>
        </div>
      )}

      {/* Ringkasan Pakan */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#167D8D]/40 bg-gradient-to-br from-[#071B2B] to-[#167D8D] p-4 text-[#EEEEEE] shadow-md">
          <div className="text-xs text-[#B9E4E8]">Sisa Stok Pakan</div>
          <div className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {formatNumber(totalFeedKg, 1)} kg
          </div>
          <div className="mt-1 text-[11px] text-[#B9E4E8]/85">
            Setara {formatNumber(totalFeedKg / 50, 1)} sak (50 kg/sak)
          </div>
        </div>
        <div className="farm-card p-4">
          <div className="text-xs text-[#355365] dark:text-[#8BC2CB]">Total Nilai Persediaan</div>
          <div className="mt-1 font-mono text-xl font-bold text-[#071B2B] tabular-nums dark:text-[#EEEEEE]">
            {formatRupiah(totalFeedValue)}
          </div>
        </div>
        <div className="farm-card p-4">
          <div className="text-xs text-[#355365] dark:text-[#8BC2CB]">Pakan Masuk (Periode)</div>
          <div className="mt-1 font-mono text-xl font-bold text-[#167D8D] tabular-nums dark:text-[#B9E4E8]">
            +{formatNumber(totalInKg, 1)} kg
          </div>
        </div>
        <div className="farm-card p-4">
          <div className="text-xs text-[#355365] dark:text-[#8BC2CB]">Pakan Terpakai (Periode)</div>
          <div className="mt-1 font-mono text-xl font-bold text-[#D4A359] tabular-nums">
            -{formatNumber(totalUsedKg, 1)} kg
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Pemakaian Pakan */}
        <div className="farm-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <MinusCircle className="h-5 w-5 text-[#D4A359]" />
            <div>
              <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
                Catat Pemakaian Pakan Harian (kg)
              </h2>
              <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
                Stok berkurang secara atomik sesuai kilogram aktual yang dipakai
              </p>
            </div>
          </div>

          {feedback && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                feedback.type === 'ok'
                  ? 'border-[#167D8D]/35 bg-[#B9E4E8]/45 text-[#071B2B] dark:border-[#B9E4E8]/30 dark:bg-[#167D8D]/25 dark:text-[#B9E4E8]'
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

          <form onSubmit={handleRecordUsage} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold">Pilih Jenis &amp; Merek Pakan</label>
              <select
                required
                value={selectedFeedId || data.feedInventory[0]?.id || ''}
                onChange={(e) => setSelectedFeedId(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:bg-[#091D2E]"
              >
                {data.feedInventory.length === 0 ? (
                  <option value="">Belum ada stok pakan tersedia</option>
                ) : (
                  data.feedInventory.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.feed_type} ({f.brand}) — Sisa {formatNumber(f.current_stock_kg, 1)} kg
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Tanggal Pemakaian</label>
              <input
                type="date"
                required
                value={usageDate}
                onChange={(e) => setUsageDate(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Jumlah Dipakai (kg)</label>
              <input
                type="number"
                step="0.1"
                min={0.1}
                required
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="Contoh: 25"
                className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Operator</label>
              <select
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:bg-[#091D2E]"
              >
                {data.operators.map((op) => (
                  <option key={op.id} value={op.display_name}>
                    {op.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Keterangan</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting || data.feedInventory.length === 0}
                className="min-h-[44px] rounded-xl bg-[#167D8D] px-5 py-2 text-xs font-semibold text-white hover:bg-[#071B2B] disabled:opacity-50 dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
              >
                {submitting ? 'Menyimpan...' : 'Catat Pemakaian Pakan'}
              </button>
            </div>
          </form>
        </div>

        {/* Daftar Inventaris Pakan per Jenis */}
        <div className="farm-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              Stok Pakan Per Jenis &amp; Merek
            </h3>
            <Package className="h-4 w-4 text-[#167D8D] dark:text-[#B9E4E8]" />
          </div>
          {data.feedInventory.length === 0 ? (
            <div className="farm-subcard p-6 text-center text-xs text-[#355365] dark:text-[#8BC2CB]">
              Belum ada persediaan pakan. Tambahkan pembelian pakan di menu Pengeluaran.
            </div>
          ) : (
            <div className="space-y-2.5">
              {data.feedInventory.map((f) => (
                <div
                  key={f.id}
                  className="farm-subcard flex items-center justify-between p-3.5 text-xs"
                >
                  <div>
                    <div className="font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                      {f.feed_type} · {f.brand}
                    </div>
                    <div className="mt-0.5 text-[#355365] dark:text-[#8BC2CB]">
                      Harga rata-rata:{' '}
                      <span className="font-mono">{formatRupiah(f.unit_price_per_kg)}/kg</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold text-[#167D8D] tabular-nums dark:text-[#B9E4E8]">
                      {formatNumber(f.current_stock_kg, 1)} kg
                    </div>
                    <div className="font-mono text-[11px] text-[#355365] tabular-nums dark:text-[#8BC2CB]">
                      Nilai: {formatRupiah(f.total_value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Riwayat Pergerakan Pakan */}
      <div className="farm-card p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#EEEEEE]">
          Riwayat Masuk &amp; Pemakaian Pakan ({data.feedMovements.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#167D8D]/20 text-[#355365] dark:border-[#B9E4E8]/15 dark:text-[#8BC2CB]">
                <th className="py-2.5 pr-3 font-semibold">Tanggal</th>
                <th className="py-2.5 pr-3 font-semibold">Jenis</th>
                <th className="py-2.5 pr-3 font-semibold">Pakan / Merek</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Berat (kg)</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Nilai</th>
                <th className="py-2.5 pr-3 font-semibold">Alasan</th>
                <th className="py-2.5 font-semibold">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#167D8D]/10 dark:divide-[#B9E4E8]/10">
              {data.feedMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#355365] dark:text-[#8BC2CB]">
                    Belum ada riwayat pergerakan pakan.
                  </td>
                </tr>
              ) : (
                data.feedMovements.map((fm) => (
                  <tr key={fm.id} className="hover:bg-[#EEEEEE]/70 dark:hover:bg-[#113047]/65">
                    <td className="py-2.5 pr-3 font-mono tabular-nums">
                      {formatDateID(fm.movement_date)}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold">
                      <span
                        className={
                          fm.movement_type === 'masuk'
                            ? 'text-[#167D8D] dark:text-[#B9E4E8]'
                            : 'text-[#D4A359]'
                        }
                      >
                        {fm.movement_type === 'masuk' ? 'Masuk' : 'Pemakaian'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      {fm.feed_type} ({fm.brand})
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono font-semibold tabular-nums">
                      {fm.movement_type === 'masuk' ? '+' : '-'}
                      {formatNumber(fm.weight_kg, 1)} kg
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                      {formatRupiah(fm.total_value)}
                    </td>
                    <td className="py-2.5 pr-3">{fm.reason}</td>
                    <td className="py-2.5 text-[#355365] dark:text-[#8BC2CB]">{fm.operator_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
