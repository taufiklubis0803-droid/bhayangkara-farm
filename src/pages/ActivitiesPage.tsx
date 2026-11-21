import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardList, Plus } from 'lucide-react';
import type { FarmDataState } from '../hooks/useFarmData';
import { insertSimpleRecord } from '../services/farmService';
import type { FarmActivity } from '../types/database';
import { formatDateID, todayJakarta } from '../utils/format';

interface ActivitiesPageProps {
  data: FarmDataState;
  currentOperator: string;
  onRefresh: () => Promise<void>;
}

const ACTIVITY_LABELS: Record<FarmActivity['activity_type'], string> = {
  pembersihan_kandang: 'Pembersihan Kandang',
  pemberian_pakan: 'Pemberian Pakan',
  pemberian_minum: 'Pemberian Minum',
  pemberian_jamu: 'Pembuatan & Pemberian Jamu Herbal',
  desinfeksi: 'Desinfeksi Kandang',
  lainnya: 'Kegiatan Lainnya',
};

export const ActivitiesPage: React.FC<ActivitiesPageProps> = ({
  data,
  currentOperator,
  onRefresh,
}) => {
  const [activityDate, setActivityDate] = useState(todayJakarta());
  const [activityType, setActivityType] =
    useState<FarmActivity['activity_type']>('pembersihan_kandang');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [operatorName, setOperatorName] = useState(currentOperator);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    setOperatorName(currentOperator);
  }, [currentOperator]);

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
    setSubmitting(true);
    try {
      await insertSimpleRecord(data.isLiveSupabase, 'farm_activities', {
        period_id: data.selectedPeriodId,
        activity_date: activityDate,
        activity_type: activityType,
        title: title.trim() || ACTIVITY_LABELS[activityType],
        description: description.trim() || null,
        operator_name: operatorName || currentOperator,
      });
      setTitle('');
      setDescription('');
      setFeedback({ type: 'ok', msg: 'Aktivitas perawatan peternakan berhasil dicatat.' });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Gagal mencatat aktivitas.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="farm-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-[#167D8D] dark:text-[#B9E4E8]" />
          <div>
            <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              Catat Aktivitas Perawatan Kandang
            </h2>
            <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
              Pembersihan kandang, pemberian pakan/minum, racikan jamu bahan herbal, desinfeksi, dan pekerjaan harian
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

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold">Tanggal</label>
            <input
              type="date"
              required
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
              className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Jenis Aktivitas</label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value as FarmActivity['activity_type'])}
              className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:bg-[#091D2E]"
            >
              {Object.entries(ACTIVITY_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Operator</label>
            <select
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:bg-[#091D2E]"
            >
              {data.operators.map((op) => (
                <option key={op.id} value={op.display_name}>
                  {op.display_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">Judul Aktivitas</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={ACTIVITY_LABELS[activityType]}
              className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold">Rincian Kegiatan</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Bersihkan tempat minum & semprot desinfektan area selatan"
              className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[#167D8D] px-5 py-2 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
            >
              <Plus className="h-4 w-4" />
              Simpan Aktivitas
            </button>
          </div>
        </form>
      </div>

      <div className="farm-card p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#EEEEEE]">
          Daftar Aktivitas Peternakan ({data.farmActivities.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#167D8D]/20 text-[#355365] dark:border-[#B9E4E8]/15 dark:text-[#8BC2CB]">
                <th className="py-2 pr-3 font-semibold">Tanggal</th>
                <th className="py-2 pr-3 font-semibold">Kategori</th>
                <th className="py-2 pr-3 font-semibold">Kegiatan</th>
                <th className="py-2 pr-3 font-semibold">Keterangan</th>
                <th className="py-2 font-semibold">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#167D8D]/10 dark:divide-[#B9E4E8]/10">
              {data.farmActivities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#355365] dark:text-[#8BC2CB]">
                    Belum ada aktivitas peternakan tercatat.
                  </td>
                </tr>
              ) : (
                data.farmActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-[#EEEEEE]/70 dark:hover:bg-[#113047]/65">
                    <td className="py-2.5 pr-3 font-mono">{formatDateID(act.activity_date)}</td>
                    <td className="py-2.5 pr-3 font-medium text-[#071B2B] dark:text-[#EEEEEE]">
                      {ACTIVITY_LABELS[act.activity_type]}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold">{act.title}</td>
                    <td className="py-2.5 pr-3 text-[#355365] dark:text-[#8BC2CB]">
                      {act.description || '-'}
                    </td>
                    <td className="py-2.5 text-[#355365] dark:text-[#8BC2CB]">
                      {act.operator_name}
                    </td>
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
