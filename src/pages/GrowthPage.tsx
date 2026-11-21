import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Scale, AlertCircle } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CustomChartTooltip } from '../components/ChartTooltip';
import type { FarmDataState } from '../hooks/useFarmData';
import { useTheme } from '../hooks/useTheme';
import { insertSimpleRecord } from '../services/farmService';
import { formatDateID, formatNumber, todayJakarta } from '../utils/format';

interface GrowthPageProps {
  data: FarmDataState;
  currentOperator: string;
  onRefresh: () => Promise<void>;
}

export const GrowthPage: React.FC<GrowthPageProps> = ({ data, currentOperator, onRefresh }) => {
  const { isDark } = useTheme();
  const [weighDate, setWeighDate] = useState(todayJakarta());
  const [sampleCount, setSampleCount] = useState('10');
  const [totalWeightKg, setTotalWeightKg] = useState('');
  const [conditionNotes, setConditionNotes] = useState('');
  const [operatorName, setOperatorName] = useState(currentOperator);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    setOperatorName(currentOperator);
  }, [currentOperator]);

  const gridStroke = isDark ? 'rgba(185, 228, 232, 0.14)' : 'rgba(7, 27, 43, 0.10)';
  const axisTickColor = isDark ? '#B9E4E8' : '#355365';

  const avgWeight = useMemo(() => {
    const cnt = Number(sampleCount || 0);
    const kg = Number(totalWeightKg || 0);
    return cnt > 0 && kg > 0 ? kg / cnt : 0;
  }, [sampleCount, totalWeightKg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!data.selectedPeriodId) {
      setFeedback({
        type: 'err',
        msg: 'Periode ternak aktif belum termuat. Muat ulang halaman atau periksa koneksi Supabase.',
      });
      return;
    }
    if (avgWeight <= 0) {
      setFeedback({ type: 'err', msg: 'Jumlah sampel dan total berat harus lebih dari 0.' });
      return;
    }

    setSubmitting(true);
    try {
      await insertSimpleRecord(data.isLiveSupabase, 'weight_records', {
        period_id: data.selectedPeriodId,
        weigh_date: weighDate,
        sample_count: Number(sampleCount),
        total_weight_kg: Number(totalWeightKg),
        average_weight_kg: Number(avgWeight.toFixed(4)),
        condition_notes: conditionNotes.trim() || null,
        operator_name: operatorName || currentOperator,
      });
      setTotalWeightKg('');
      setConditionNotes('');
      setFeedback({ type: 'ok', msg: 'Data penimbangan ayam kampung berhasil disimpan.' });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan.' });
    } finally {
      setSubmitting(false);
    }
  };

  const chartSeries = useMemo(() => {
    return data.weightRecords.map((w, idx) => {
      const prev = idx > 0 ? Number(data.weightRecords[idx - 1].average_weight_kg) : null;
      const delta = prev !== null ? Number(w.average_weight_kg) - prev : 0;
      return {
        tanggal: formatDateID(w.weigh_date),
        rataRataKg: Number(Number(w.average_weight_kg).toFixed(3)),
        perubahanKg: Number(delta.toFixed(3)),
      };
    });
  }, [data.weightRecords]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="farm-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Scale className="h-5 w-5 text-[#167D8D] dark:text-[#B9E4E8]" />
            <div>
              <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#B9E4E8]">
                Penimbangan Sampel Ayam Kampung
              </h2>
              <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
                Evaluasi disesuaikan dengan kondisi aktual ternak dan arahan tenaga kesehatan hewan.
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

          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold">Tanggal Penimbangan</label>
              <input
                type="date"
                required
                value={weighDate}
                onChange={(e) => setWeighDate(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
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
            <div>
              <label className="mb-1 block text-xs font-semibold">Jumlah Ayam Sampel (ekor)</label>
              <input
                type="number"
                min={1}
                required
                value={sampleCount}
                onChange={(e) => setSampleCount(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Total Berat Sampel (kg)</label>
              <input
                type="number"
                step="0.01"
                min={0.01}
                required
                value={totalWeightKg}
                onChange={(e) => setTotalWeightKg(e.target.value)}
                placeholder="Contoh: 8.5"
                className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold">Catatan Kondisi Ayam</label>
              <input
                type="text"
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                placeholder="Contoh: Nafsu makan baik, pertumbuhan merata"
                className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
            <div className="farm-mint-box sm:col-span-2 flex items-center justify-between px-4 py-2.5">
              <span className="text-xs font-medium text-[#071B2B] dark:text-[#B9E4E8]">
                Berat Rata-Rata Otomatis:
              </span>
              <span className="font-mono text-lg font-bold text-[#071B2B] tabular-nums dark:text-[#EEEEEE]">
                {formatNumber(avgWeight, 3)} kg/ekor ({formatNumber(avgWeight * 1000, 0)} gram)
              </span>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] rounded-xl bg-[#167D8D] px-5 py-2 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Data Penimbangan'}
              </button>
            </div>
          </form>
        </div>

        {/* Grafik Pertumbuhan */}
        <div className="farm-card p-5">
          <h3 className="mb-1 font-display text-sm font-bold text-[#071B2B] dark:text-[#B9E4E8]">
            Grafik Berat Rata-Rata Pertumbuhan
          </h3>
          <p className="mb-4 text-xs text-[#355365] dark:text-[#8BC2CB]">
            Perkembangan bobot sampel (kg/ekor)
          </p>
          <div className="h-64 w-full">
            {chartSeries.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-[#355365] dark:text-[#8BC2CB]">
                Belum ada riwayat penimbangan.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartSeries}>
                  <defs>
                    <linearGradient id="gradWeightArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#167D8D" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#B9E4E8" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="tanggal" tick={{ fontSize: 11, fill: axisTickColor }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: axisTickColor }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomChartTooltip valueType="kg" />} />
                  <Area
                    type="monotone"
                    dataKey="rataRataKg"
                    name="Rata-Rata"
                    stroke={isDark ? '#B9E4E8' : '#167D8D'}
                    strokeWidth={2.6}
                    fill="url(#gradWeightArea)"
                    dot={{ r: 4, fill: '#167D8D', stroke: isDark ? '#071B2B' : '#FFFFFF', strokeWidth: 1.5 }}
                    activeDot={{ r: 6, fill: '#B9E4E8', stroke: '#071B2B', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Riwayat Penimbangan */}
      <div className="farm-card p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#B9E4E8]">
          Riwayat Penimbangan ({data.weightRecords.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#167D8D]/20 text-[#355365] dark:border-[#B9E4E8]/15 dark:text-[#8BC2CB]">
                <th className="py-2.5 pr-3 font-semibold">Tanggal</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Sampel</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Total Berat</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Rata-Rata (kg)</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Perubahan</th>
                <th className="py-2.5 pr-3 font-semibold">Catatan Kondisi</th>
                <th className="py-2.5 font-semibold">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#167D8D]/10 dark:divide-[#B9E4E8]/10">
              {data.weightRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#355365] dark:text-[#8BC2CB]">
                    Belum ada riwayat penimbangan sampel.
                  </td>
                </tr>
              ) : (
                data.weightRecords.map((w, idx) => {
                  const prev = idx > 0 ? Number(data.weightRecords[idx - 1].average_weight_kg) : null;
                  const delta = prev !== null ? Number(w.average_weight_kg) - prev : null;
                  return (
                    <tr key={w.id} className="hover:bg-[#EEEEEE]/70 dark:hover:bg-[#113047]/60">
                      <td className="py-2.5 pr-3 font-mono tabular-nums">
                        {formatDateID(w.weigh_date)}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                        {w.sample_count} ekor
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                        {formatNumber(w.total_weight_kg, 2)} kg
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono font-bold text-[#167D8D] tabular-nums dark:text-[#B9E4E8]">
                        {formatNumber(w.average_weight_kg, 3)} kg
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">
                        {delta === null ? (
                          '-'
                        ) : (
                          <span className={delta >= 0 ? 'text-[#167D8D] dark:text-[#B9E4E8]' : 'text-rose-600 dark:text-rose-400'}>
                            {delta >= 0 ? '+' : ''}
                            {formatNumber(delta, 3)} kg
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">{w.condition_notes || '-'}</td>
                      <td className="py-2.5 text-[#355365] dark:text-[#8BC2CB]">{w.operator_name}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
