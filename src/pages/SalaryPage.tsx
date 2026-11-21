import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Wallet } from 'lucide-react';
import type { FarmDataState } from '../hooks/useFarmData';
import { recordSalaryPayment } from '../services/farmService';
import {
  BULAN_INDONESIA,
  PAYMENT_STATUS_LABELS,
  formatDateID,
  formatRupiah,
  todayJakarta,
} from '../utils/format';

interface SalaryPageProps {
  data: FarmDataState;
  currentOperator: string;
  onRefresh: () => Promise<void>;
}

export const SalaryPage: React.FC<SalaryPageProps> = ({ data, currentOperator, onRefresh }) => {
  const today = todayJakarta();
  const [employeeId, setEmployeeId] = useState(data.employees[0]?.id ?? '');
  const [salaryMonth, setSalaryMonth] = useState(Number(today.slice(5, 7)));
  const [salaryYear, setSalaryYear] = useState(Number(today.slice(0, 4)));
  const [baseSalary, setBaseSalary] = useState(
    String(data.employees[0]?.monthly_salary ?? 0)
  );
  const [payNow, setPayNow] = useState('');
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState<'tunai' | 'transfer'>('tunai');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    const stillValid = data.employees.find((e) => e.id === employeeId);
    if (!stillValid) {
      const first = data.employees[0];
      setEmployeeId(first?.id ?? '');
      setBaseSalary(String(first?.monthly_salary ?? 0));
    }
  }, [data.employees, employeeId]);

  const handleEmployeeChange = (id: string) => {
    setEmployeeId(id);
    const emp = data.employees.find((e) => e.id === id);
    if (emp) setBaseSalary(String(emp.monthly_salary));
  };

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
    const targetEmpId = employeeId || data.employees[0]?.id;
    if (!targetEmpId) {
      setFeedback({
        type: 'err',
        msg: 'Belum ada karyawan terdaftar untuk cabang ini. Tambahkan karyawan di menu Karyawan terlebih dahulu.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await recordSalaryPayment(data.isLiveSupabase, {
        periodId: data.selectedPeriodId,
        employeeId: targetEmpId,
        salaryMonth,
        salaryYear,
        baseSalary: Number(baseSalary || 0),
        payNow: Number(payNow || 0),
        paymentDate,
        paymentMethod,
        operatorName: currentOperator,
        notes: notes.trim() || null,
      });
      setPayNow('');
      setNotes('');
      setFeedback({
        type: 'ok',
        msg:
          Number(payNow || 0) > 0
            ? 'Pembayaran gaji disimpan dan otomatis dicatat sebagai pengeluaran kas.'
            : 'Tagihan gaji disimpan (belum dicatat sebagai kas keluar sebelum dibayarkan).',
      });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan gaji.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="farm-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-[#167D8D] dark:text-[#B9E4E8]" />
          <div>
            <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              Penggajian Karyawan — {data.selectedBranch?.name ?? 'Cabang Aktif'}
            </h2>
            <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
              Gaji hanya dicatat sebagai uang keluar apabila nominal dibayarkan &gt; Rp0.
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

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold">Karyawan</label>
            <select
              value={employeeId || data.employees[0]?.id || ''}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:bg-[#091D2E]"
            >
              {data.employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.position})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">Bulan Gaji</label>
            <select
              value={salaryMonth}
              onChange={(e) => setSalaryMonth(Number(e.target.value))}
              className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:bg-[#091D2E]"
            >
              {BULAN_INDONESIA.map((b, idx) => (
                <option key={b} value={idx + 1}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">Tahun</label>
            <input
              type="number"
              min={2020}
              value={salaryYear}
              onChange={(e) => setSalaryYear(Number(e.target.value))}
              className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">Gaji Bulanan (Rp)</label>
            <input
              type="number"
              min={0}
              required
              value={baseSalary}
              onChange={(e) => setBaseSalary(e.target.value)}
              className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">Nominal Dibayarkan Sekarang (Rp)</label>
            <input
              type="number"
              min={0}
              value={payNow}
              onChange={(e) => setPayNow(e.target.value)}
              placeholder="0 jika belum dibayar"
              className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">Tanggal Pembayaran</label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">Metode</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'tunai' | 'transfer')}
              className="min-h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:bg-[#091D2E]"
            >
              <option value="tunai">Tunai</option>
              <option value="transfer">Transfer Bank</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold">Catatan</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan bonus/potongan"
              className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] rounded-xl bg-[#167D8D] px-5 py-2 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Data Gaji'}
            </button>
          </div>
        </form>
      </div>

      {/* Riwayat Gaji */}
      <div className="farm-card p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#EEEEEE]">
          Riwayat Gaji Karyawan ({data.salaries.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#167D8D]/20 text-[#355365] dark:border-[#B9E4E8]/15 dark:text-[#8BC2CB]">
                <th className="py-2 pr-3 font-semibold">Karyawan</th>
                <th className="py-2 pr-3 font-semibold">Periode Gaji</th>
                <th className="py-2 pr-3 font-semibold text-right">Gaji Bulanan</th>
                <th className="py-2 pr-3 font-semibold text-right">Sudah Dibayar</th>
                <th className="py-2 pr-3 font-semibold">Tanggal Bayar</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 font-semibold">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#167D8D]/10 dark:divide-[#B9E4E8]/10">
              {data.salaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#355365] dark:text-[#8BC2CB]">
                    Belum ada riwayat penggajian pada periode ini.
                  </td>
                </tr>
              ) : (
                data.salaries.map((s) => {
                  const emp = data.employees.find((e) => e.id === s.employee_id);
                  return (
                    <tr key={s.id} className="hover:bg-[#EEEEEE]/70 dark:hover:bg-[#113047]/65">
                      <td className="py-2.5 pr-3 font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                        {emp?.name ?? 'Karyawan'}
                      </td>
                      <td className="py-2.5 pr-3">
                        {BULAN_INDONESIA[s.salary_month - 1]} {s.salary_year}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono">
                        {formatRupiah(s.base_salary)}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono font-bold text-[#167D8D] dark:text-[#B9E4E8]">
                        {formatRupiah(s.paid_amount)}
                      </td>
                      <td className="py-2.5 pr-3 font-mono">
                        {s.payment_date ? formatDateID(s.payment_date) : '-'}
                      </td>
                      <td className="py-2.5 pr-3 font-semibold">
                        <span
                          className={
                            s.payment_status === 'lunas'
                              ? 'text-[#167D8D] dark:text-[#B9E4E8]'
                              : s.payment_status === 'dibayar_sebagian'
                              ? 'text-[#D4A359]'
                              : 'text-red-600 dark:text-rose-400'
                          }
                        >
                          {PAYMENT_STATUS_LABELS[s.payment_status]}
                        </span>
                      </td>
                      <td className="py-2.5 text-[#355365] dark:text-[#8BC2CB]">
                        {s.operator_name}
                      </td>
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
