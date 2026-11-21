import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, Plus } from 'lucide-react';
import type { FarmDataState } from '../hooks/useFarmData';
import {
  createManualDebtOrReceivable,
  payDebtOrReceivable,
} from '../services/farmService';
import type { DebtOrReceivable } from '../types/database';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  formatDateID,
  formatRupiah,
  todayJakarta,
} from '../utils/format';

interface DebtsReceivablesPageProps {
  data: FarmDataState;
  currentOperator: string;
  onRefresh: () => Promise<void>;
}

export const DebtsReceivablesPage: React.FC<DebtsReceivablesPageProps> = ({
  data,
  currentOperator,
  onRefresh,
}) => {
  const [tab, setTab] = useState<'receivables' | 'debts'>('receivables');
  const [payModal, setPayModal] = useState<{
    type: 'debt' | 'receivable';
    record: DebtOrReceivable;
  } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(todayJakarta());
  const [payMethod, setPayMethod] = useState<'tunai' | 'transfer'>('tunai');
  const [payNotes, setPayNotes] = useState('');

  // Tambah Utang/Piutang Manual
  const [partyName, setPartyName] = useState('');
  const [txDate, setTxDate] = useState(todayJakarta());
  const [dueDate, setDueDate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!data.selectedPeriodId) {
      setFeedback({
        type: 'err',
        msg: 'Periode ternak aktif belum termuat. Muat ulang halaman atau periksa koneksi Supabase.',
      });
      return;
    }
    const amt = Number(totalAmount || 0);
    if (amt <= 0) {
      setFeedback({ type: 'err', msg: 'Nominal harus lebih dari Rp0.' });
      return;
    }
    setSubmitting(true);
    try {
      await createManualDebtOrReceivable(
        data.isLiveSupabase,
        tab === 'debts' ? 'debts' : 'receivables',
        {
          period_id: data.selectedPeriodId,
          party_name: partyName.trim(),
          tx_date: txDate,
          due_date: dueDate || null,
          total_amount: amt,
          operator_name: currentOperator,
          notes: notes.trim() || null,
        }
      );
      setPartyName('');
      setTotalAmount('');
      setNotes('');
      setFeedback({
        type: 'ok',
        msg: `Catatan ${tab === 'debts' ? 'utang' : 'piutang'} berhasil ditambahkan.`,
      });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal) return;
    setFeedback(null);
    setSubmitting(true);
    try {
      await payDebtOrReceivable(data.isLiveSupabase, {
        recordType: payModal.type,
        parentId: payModal.record.id,
        paymentDate: payDate,
        amount: Number(payAmount),
        paymentMethod: payMethod,
        operatorName: currentOperator,
        notes: payNotes.trim() || null,
      });
      setPayModal(null);
      setPayAmount('');
      setPayNotes('');
      setFeedback({
        type: 'ok',
        msg: 'Pembayaran cicilan/pelunasan berhasil dicatat ke arus kas tanpa menggandakan omzet.',
      });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Gagal memproses pelunasan.' });
    } finally {
      setSubmitting(false);
    }
  };

  const list =
    tab === 'receivables'
      ? data.receivables.filter((r) => !r.is_deleted)
      : data.debts.filter((d) => !d.is_deleted);

  const totalRemainingReceivable = data.receivables
    .filter((r) => !r.is_deleted && r.status !== 'lunas')
    .reduce((s, r) => s + Number(r.remaining_amount), 0);

  const totalRemainingDebt = data.debts
    .filter((d) => !d.is_deleted && d.status !== 'lunas')
    .reduce((s, d) => s + Number(d.remaining_amount), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="farm-card p-4">
          <div className="text-xs text-[#355365] dark:text-[#8BC2CB]">
            Total Sisa Piutang Penjualan
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#D4A359] tabular-nums">
            {formatRupiah(totalRemainingReceivable)}
          </div>
        </div>
        <div className="farm-card p-4">
          <div className="text-xs text-[#355365] dark:text-[#8BC2CB]">Total Sisa Utang Usaha</div>
          <div className="mt-1 font-mono text-2xl font-bold text-red-600 tabular-nums dark:text-rose-400">
            {formatRupiah(totalRemainingDebt)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('receivables')}
          className={`min-h-[42px] rounded-xl px-4 text-xs font-semibold transition-all ${
            tab === 'receivables'
              ? 'bg-[#167D8D] text-white shadow-sm dark:bg-[#B9E4E8] dark:text-[#071B2B]'
              : 'farm-card text-[#071B2B] hover:border-[#167D8D]/60 dark:text-[#B9E4E8]'
          }`}
        >
          Piutang Penjualan ({data.receivables.filter((r) => !r.is_deleted).length})
        </button>
        <button
          type="button"
          onClick={() => setTab('debts')}
          className={`min-h-[42px] rounded-xl px-4 text-xs font-semibold transition-all ${
            tab === 'debts'
              ? 'bg-[#167D8D] text-white shadow-sm dark:bg-[#B9E4E8] dark:text-[#071B2B]'
              : 'farm-card text-[#071B2B] hover:border-[#167D8D]/60 dark:text-[#B9E4E8]'
          }`}
        >
          Utang Usaha ({data.debts.filter((d) => !d.is_deleted).length})
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

      {/* Tambah Manual */}
      <div className="farm-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-[#167D8D] dark:text-[#B9E4E8]" />
          <h2 className="font-display text-sm font-bold text-[#071B2B] dark:text-[#EEEEEE]">
            Tambah Catatan {tab === 'receivables' ? 'Piutang' : 'Utang'} Manual
          </h2>
        </div>
        <form onSubmit={handleCreateManual} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            required
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder={tab === 'receivables' ? 'Nama Pembeli *' : 'Nama Pemasok/Pihak *'}
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm"
          />
          <input
            type="number"
            min={1}
            required
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="Nominal (Rp) *"
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 font-mono text-sm"
          />
          <input
            type="date"
            required
            value={txDate}
            onChange={(e) => setTxDate(e.target.value)}
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            title="Jatuh Tempo"
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#167D8D] px-4 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
          >
            <Plus className="h-4 w-4" />
            Simpan
          </button>
        </form>
      </div>

      {/* Tabel Utang / Piutang */}
      <div className="farm-card p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#167D8D]/20 text-[#355365] dark:border-[#B9E4E8]/15 dark:text-[#8BC2CB]">
                <th className="py-2 pr-3 font-semibold">Pihak</th>
                <th className="py-2 pr-3 font-semibold">Tanggal</th>
                <th className="py-2 pr-3 font-semibold">Jatuh Tempo</th>
                <th className="py-2 pr-3 font-semibold text-right">Total</th>
                <th className="py-2 pr-3 font-semibold text-right">Dibayar</th>
                <th className="py-2 pr-3 font-semibold text-right">Sisa</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#167D8D]/10 dark:divide-[#B9E4E8]/10">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#355365] dark:text-[#8BC2CB]">
                    Belum ada data {tab === 'receivables' ? 'piutang' : 'utang'}.
                  </td>
                </tr>
              ) : (
                list.map((row) => (
                  <tr key={row.id} className="hover:bg-[#EEEEEE]/70 dark:hover:bg-[#113047]/65">
                    <td className="py-2.5 pr-3 font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                      {row.party_name}
                    </td>
                    <td className="py-2.5 pr-3 font-mono">{formatDateID(row.tx_date)}</td>
                    <td className="py-2.5 pr-3 font-mono">
                      {row.due_date ? formatDateID(row.due_date) : '-'}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono">{formatRupiah(row.total_amount)}</td>
                    <td className="py-2.5 pr-3 text-right font-mono text-[#167D8D] dark:text-[#B9E4E8]">
                      {formatRupiah(row.paid_amount)}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono font-bold text-red-600 dark:text-rose-400">
                      {formatRupiah(row.remaining_amount)}
                    </td>
                    <td className="py-2.5 pr-3 font-semibold">
                      {PAYMENT_STATUS_LABELS[row.status]}
                    </td>
                    <td className="py-2.5 text-right">
                      {row.status !== 'lunas' && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayModal({
                              type: tab === 'debts' ? 'debt' : 'receivable',
                              record: row,
                            });
                            setPayAmount(String(row.remaining_amount));
                          }}
                          className="rounded-lg bg-[#167D8D] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
                        >
                          Bayar / Lunasi
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Histori Pelunasan */}
      <div className="farm-card p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#EEEEEE]">
          Histori Pelunasan ({data.payments.length})
        </h3>
        <div className="space-y-2 text-xs">
          {data.payments.length === 0 ? (
            <p className="text-[#355365] dark:text-[#8BC2CB]">Belum ada histori pelunasan.</p>
          ) : (
            data.payments.map((p) => (
              <div
                key={p.id}
                className="farm-subcard flex flex-wrap items-center justify-between gap-2 px-3 py-2"
              >
                <div>
                  <span className="font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                    {p.record_type === 'receivable' ? 'Penerimaan Piutang' : 'Pembayaran Utang'}
                  </span>{' '}
                  · <span className="font-mono text-[#355365] dark:text-[#8BC2CB]">{formatDateID(p.payment_date)}</span>{' '}
                  · <span>{PAYMENT_METHOD_LABELS[p.payment_method]}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#355365] dark:text-[#8BC2CB]">{p.operator_name}</span>
                  <span className="font-mono font-bold text-[#167D8D] dark:text-[#B9E4E8]">
                    {formatRupiah(p.amount)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Pelunasan */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071B2B]/75 p-4 backdrop-blur-xs">
          <div className="farm-card w-full max-w-md p-6">
            <h3 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              {payModal.type === 'receivable' ? 'Terima Pembayaran Piutang' : 'Bayar Utang Usaha'}
            </h3>
            <p className="mt-1 text-xs text-[#355365] dark:text-[#8BC2CB]">
              Pihak: <strong>{payModal.record.party_name}</strong> · Sisa:{' '}
              <strong className="font-mono">{formatRupiah(payModal.record.remaining_amount)}</strong>
            </p>
            <form onSubmit={handlePaySubmit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">Tanggal Pembayaran</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Nominal Dibayar (Rp)</label>
                <input
                  type="number"
                  min={1}
                  max={payModal.record.remaining_amount}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Metode</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as 'tunai' | 'transfer')}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:bg-[#091D2E]"
                >
                  <option value="tunai">Tunai</option>
                  <option value="transfer">Transfer Bank</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Catatan</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayModal(null)}
                  className="rounded-lg border border-[#167D8D]/25 px-4 py-2 text-xs font-semibold text-[#071B2B] hover:bg-[#EEEEEE] dark:border-[#B9E4E8]/25 dark:text-[#B9E4E8] dark:hover:bg-[#113047]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#167D8D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
                >
                  Simpan Pelunasan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
