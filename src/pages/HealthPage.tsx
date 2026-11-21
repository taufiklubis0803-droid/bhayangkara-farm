import React, { useEffect, useState } from 'react';
import { CheckCircle2, HeartPulse, Syringe, AlertCircle } from 'lucide-react';
import type { FarmDataState } from '../hooks/useFarmData';
import { insertSimpleRecord } from '../services/farmService';
import { formatDateID, todayJakarta } from '../utils/format';

interface HealthPageProps {
  data: FarmDataState;
  currentOperator: string;
  onRefresh: () => Promise<void>;
}

export const HealthPage: React.FC<HealthPageProps> = ({ data, currentOperator, onRefresh }) => {
  const [tab, setTab] = useState<'kesehatan' | 'vaksin'>('kesehatan');

  // Health Form
  const [recordDate, setRecordDate] = useState(todayJakarta());
  const [recordType, setRecordType] = useState<'sakit' | 'pemulihan'>('sakit');
  const [chickenCount, setChickenCount] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [notes, setNotes] = useState('');
  const [operatorName, setOperatorName] = useState(currentOperator);

  // Vaksin & Vitamin Form
  const [vacDate, setVacDate] = useState(todayJakarta());
  const [vacCategory, setVacCategory] = useState<'vaksin' | 'vitamin'>('vitamin');
  const [itemName, setItemName] = useState('');
  const [vacCount, setVacCount] = useState('');
  const [dosage, setDosage] = useState('');
  const [nextSchedule, setNextSchedule] = useState('');
  const [vacNotes, setVacNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    setOperatorName(currentOperator);
  }, [currentOperator]);

  const handleSaveHealth = async (e: React.FormEvent) => {
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
      await insertSimpleRecord(data.isLiveSupabase, 'health_records', {
        period_id: data.selectedPeriodId,
        record_date: recordDate,
        record_type: recordType,
        chicken_count: Number(chickenCount),
        symptoms: symptoms.trim(),
        action_taken: actionTaken.trim() || null,
        notes: notes.trim() || null,
        operator_name: operatorName || currentOperator,
      });
      setChickenCount('');
      setSymptoms('');
      setActionTaken('');
      setNotes('');
      setFeedback({ type: 'ok', msg: 'Catatan kesehatan ayam berhasil disimpan.' });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveVac = async (e: React.FormEvent) => {
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
      await insertSimpleRecord(data.isLiveSupabase, 'vaccination_records', {
        period_id: data.selectedPeriodId,
        record_date: vacDate,
        category: vacCategory,
        item_name: itemName.trim(),
        chicken_count: Number(vacCount),
        dosage: dosage.trim() || null,
        next_schedule_date: nextSchedule || null,
        notes: vacNotes.trim() || null,
        operator_name: operatorName || currentOperator,
      });
      setItemName('');
      setVacCount('');
      setDosage('');
      setNextSchedule('');
      setVacNotes('');
      setFeedback({ type: 'ok', msg: 'Jadwal & pemberian vaksin/vitamin berhasil dicatat.' });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('kesehatan')}
          className={`flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-xs font-semibold transition-all ${
            tab === 'kesehatan'
              ? 'bg-[#167D8D] text-white shadow-sm dark:bg-[#B9E4E8] dark:text-[#071B2B]'
              : 'farm-card text-[#071B2B] hover:border-[#167D8D]/60 dark:text-[#B9E4E8]'
          }`}
        >
          <HeartPulse className="h-4 w-4" />
          Kesehatan &amp; Ayam Sakit
        </button>
        <button
          type="button"
          onClick={() => setTab('vaksin')}
          className={`flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-xs font-semibold transition-all ${
            tab === 'vaksin'
              ? 'bg-[#167D8D] text-white shadow-sm dark:bg-[#B9E4E8] dark:text-[#071B2B]'
              : 'farm-card text-[#071B2B] hover:border-[#167D8D]/60 dark:text-[#B9E4E8]'
          }`}
        >
          <Syringe className="h-4 w-4" />
          Vaksin &amp; Vitamin
        </button>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
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

      {tab === 'kesehatan' ? (
        <>
          <div className="farm-card p-5">
            <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              Catat Kondisi Kesehatan Ayam
            </h2>
            <p className="mt-1 text-xs text-[#355365] dark:text-[#8BC2CB]">
              Untuk pencatatan ayam mati/afkir yang mengurangi stok, gunakan modul Stok Ayam.
            </p>
            <form onSubmit={handleSaveHealth} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">Tanggal</label>
                <input
                  type="date"
                  required
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Status Kondisi</label>
                <select
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value as 'sakit' | 'pemulihan')}
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:bg-[#091D2E]"
                >
                  <option value="sakit">Ayam Sakit / Karantina</option>
                  <option value="pemulihan">Pemulihan / Sembuh</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Jumlah Ayam (ekor)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={chickenCount}
                  onChange={(e) => setChickenCount(e.target.value)}
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Gejala Teramati</label>
                <input
                  type="text"
                  required
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Contoh: Ngorok, nafsu makan turun"
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Tindakan Penanganan</label>
                <input
                  type="text"
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="Contoh: Pisahkan kandang & beri racikan jamu herbal (kunyit/jahe)"
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
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
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] rounded-xl bg-[#167D8D] px-5 py-2 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
                >
                  Simpan Catatan Kesehatan
                </button>
              </div>
            </form>
          </div>

          <div className="farm-card p-5">
            <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              Riwayat Kesehatan &amp; Kematian ({data.healthRecords.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#167D8D]/20 text-[#355365] dark:border-[#B9E4E8]/15 dark:text-[#8BC2CB]">
                    <th className="py-2 pr-3 font-semibold">Tanggal</th>
                    <th className="py-2 pr-3 font-semibold">Jenis</th>
                    <th className="py-2 pr-3 font-semibold text-right">Jumlah</th>
                    <th className="py-2 pr-3 font-semibold">Gejala</th>
                    <th className="py-2 pr-3 font-semibold">Tindakan</th>
                    <th className="py-2 font-semibold">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#167D8D]/10 dark:divide-[#B9E4E8]/10">
                  {data.healthRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#355365] dark:text-[#8BC2CB]">
                        Belum ada catatan kesehatan.
                      </td>
                    </tr>
                  ) : (
                    data.healthRecords.map((h) => (
                      <tr key={h.id} className="hover:bg-[#EEEEEE]/70 dark:hover:bg-[#113047]/65">
                        <td className="py-2.5 pr-3 font-mono">{formatDateID(h.record_date)}</td>
                        <td className="py-2.5 pr-3 font-semibold capitalize">{h.record_type}</td>
                        <td className="py-2.5 pr-3 text-right font-mono">{h.chicken_count} ekor</td>
                        <td className="py-2.5 pr-3">{h.symptoms}</td>
                        <td className="py-2.5 pr-3">{h.action_taken || '-'}</td>
                        <td className="py-2.5 text-[#355365] dark:text-[#8BC2CB]">{h.operator_name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="farm-card p-5">
            <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              Catat Pemberian Vaksin &amp; Vitamin
            </h2>
            <p className="mt-1 text-xs text-[#355365] dark:text-[#8BC2CB]">
              Jadwal berikutnya disesuaikan dengan kondisi ternak dan arahan tenaga kesehatan hewan.
            </p>
            <form onSubmit={handleSaveVac} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">Tanggal Pemberian</label>
                <input
                  type="date"
                  required
                  value={vacDate}
                  onChange={(e) => setVacDate(e.target.value)}
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Jenis</label>
                <select
                  value={vacCategory}
                  onChange={(e) => setVacCategory(e.target.value as 'vaksin' | 'vitamin')}
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:bg-[#091D2E]"
                >
                  <option value="vitamin">Vitamin</option>
                  <option value="vaksin">Vaksin</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Nama Vaksin / Vitamin</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Contoh: ND-IB / Vita Stress"
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Jumlah Ayam (ekor)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={vacCount}
                  onChange={(e) => setVacCount(e.target.value)}
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Dosis</label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="Contoh: 1 tetes/ekor atau 5g/10L air"
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Jadwal Berikutnya (Opsional)</label>
                <input
                  type="date"
                  value={nextSchedule}
                  onChange={(e) => setNextSchedule(e.target.value)}
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] rounded-xl bg-[#167D8D] px-5 py-2 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
                >
                  Simpan Catatan Vaksin / Vitamin
                </button>
              </div>
            </form>
          </div>

          <div className="farm-card p-5">
            <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              Riwayat Vaksin &amp; Vitamin ({data.vaccinationRecords.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#167D8D]/20 text-[#355365] dark:border-[#B9E4E8]/15 dark:text-[#8BC2CB]">
                    <th className="py-2 pr-3 font-semibold">Tanggal</th>
                    <th className="py-2 pr-3 font-semibold">Jenis</th>
                    <th className="py-2 pr-3 font-semibold">Nama</th>
                    <th className="py-2 pr-3 font-semibold text-right">Jumlah Ayam</th>
                    <th className="py-2 pr-3 font-semibold">Dosis</th>
                    <th className="py-2 pr-3 font-semibold">Jadwal Berikutnya</th>
                    <th className="py-2 font-semibold">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#167D8D]/10 dark:divide-[#B9E4E8]/10">
                  {data.vaccinationRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#355365] dark:text-[#8BC2CB]">
                        Belum ada catatan vaksin atau vitamin.
                      </td>
                    </tr>
                  ) : (
                    data.vaccinationRecords.map((v) => (
                      <tr key={v.id} className="hover:bg-[#EEEEEE]/70 dark:hover:bg-[#113047]/65">
                        <td className="py-2.5 pr-3 font-mono">{formatDateID(v.record_date)}</td>
                        <td className="py-2.5 pr-3 font-semibold capitalize">{v.category}</td>
                        <td className="py-2.5 pr-3">{v.item_name}</td>
                        <td className="py-2.5 pr-3 text-right font-mono">{v.chicken_count} ekor</td>
                        <td className="py-2.5 pr-3">{v.dosage || '-'}</td>
                        <td className="py-2.5 pr-3 font-mono">
                          {v.next_schedule_date ? formatDateID(v.next_schedule_date) : '-'}
                        </td>
                        <td className="py-2.5 text-[#355365] dark:text-[#8BC2CB]">{v.operator_name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
