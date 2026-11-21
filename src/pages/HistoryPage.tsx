import React, { useMemo, useState } from 'react';
import { History, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { PinConfirmModal } from '../components/PinConfirmModal';
import type { FarmDataState } from '../hooks/useFarmData';
import { softDeleteTransaction } from '../services/farmService';
import {
  EXPENSE_CATEGORY_LABELS,
  INCOME_CATEGORY_LABELS,
  formatDateID,
  formatDateTimeID,
  formatRupiah,
} from '../utils/format';

interface HistoryPageProps {
  data: FarmDataState;
  currentOperator: string;
  onRefresh: () => Promise<void>;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ data, currentOperator, onRefresh }) => {
  const [tab, setTab] = useState<'transaksi' | 'audit'>('transaksi');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterOperator, setFilterOperator] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    data.transactions.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [data.transactions]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data.transactions.filter((t) => {
      if (!showDeleted && t.is_deleted) return false;
      if (filterType !== 'all' && t.tx_type !== filterType) return false;
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      if (filterOperator !== 'all' && t.operator_name !== filterOperator) return false;
      if (filterMonth && !t.tx_date.startsWith(filterMonth)) return false;
      if (q) {
        const hay = `${t.id} ${t.title} ${t.reference_name ?? ''} ${t.operator_name} ${t.notes ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const cmp = a.tx_date.localeCompare(b.tx_date) || a.created_at.localeCompare(b.created_at);
      return sortOrder === 'newest' ? -cmp : cmp;
    });
  }, [
    data.transactions,
    showDeleted,
    filterType,
    filterCategory,
    filterOperator,
    filterMonth,
    search,
    sortOrder,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab('transaksi')}
            className={`flex min-h-[42px] items-center gap-2 rounded-xl px-4 text-xs font-semibold transition-all ${
              tab === 'transaksi'
                ? 'bg-[#167D8D] text-white shadow-sm dark:bg-[#B9E4E8] dark:text-[#071B2B]'
                : 'farm-card text-[#071B2B] hover:border-[#167D8D]/60 dark:text-[#B9E4E8]'
            }`}
          >
            <History className="h-4 w-4" />
            Histori Transaksi
          </button>
          <button
            type="button"
            onClick={() => setTab('audit')}
            className={`flex min-h-[42px] items-center gap-2 rounded-xl px-4 text-xs font-semibold transition-all ${
              tab === 'audit'
                ? 'bg-[#167D8D] text-white shadow-sm dark:bg-[#B9E4E8] dark:text-[#071B2B]'
                : 'farm-card text-[#071B2B] hover:border-[#167D8D]/60 dark:text-[#B9E4E8]'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Audit Log ({data.auditLogs.length})
          </button>
        </div>

        {feedback && (
          <span className="text-xs font-semibold text-[#167D8D] dark:text-[#B9E4E8]">
            {feedback}
          </span>
        )}
      </div>

      {tab === 'transaksi' ? (
        <>
          <div className="farm-card p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#355365] dark:text-[#8BC2CB]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari ID, keterangan, pembeli, catatan..."
                  className="min-h-[40px] w-full rounded-xl border border-slate-300 pr-3 pl-9 text-xs"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
                className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:bg-[#091D2E]"
              >
                <option value="all">Semua Jenis</option>
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:bg-[#091D2E]"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {INCOME_CATEGORY_LABELS[c] ?? EXPENSE_CATEGORY_LABELS[c] ?? c}
                  </option>
                ))}
              </select>

              <select
                value={filterOperator}
                onChange={(e) => setFilterOperator(e.target.value)}
                className="min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:bg-[#091D2E]"
              >
                <option value="all">Semua Operator</option>
                {data.operators.map((op) => (
                  <option key={op.id} value={op.display_name}>
                    {op.display_name}
                  </option>
                ))}
              </select>

              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="min-h-[40px] rounded-xl border border-slate-300 px-3 text-xs"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#167D8D]/20 pt-3 text-xs dark:border-[#B9E4E8]/15">
              <label className="flex items-center gap-2 text-[#355365] dark:text-[#8BC2CB]">
                <input
                  type="checkbox"
                  checked={showDeleted}
                  onChange={(e) => setShowDeleted(e.target.checked)}
                  className="accent-[#167D8D]"
                />
                Tampilkan transaksi yang dibatalkan (soft delete)
              </label>

              <div className="flex items-center gap-2">
                <span className="text-[#355365] dark:text-[#8BC2CB]">Urutan:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium dark:bg-[#091D2E]"
                >
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                </select>
              </div>
            </div>
          </div>

          <div className="farm-card p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#167D8D]/20 text-[#355365] dark:border-[#B9E4E8]/15 dark:text-[#8BC2CB]">
                    <th className="py-2.5 pr-3 font-semibold">ID</th>
                    <th className="py-2.5 pr-3 font-semibold">Tanggal</th>
                    <th className="py-2.5 pr-3 font-semibold">Jenis &amp; Kategori</th>
                    <th className="py-2.5 pr-3 font-semibold">Keterangan</th>
                    <th className="py-2.5 pr-3 font-semibold text-right">Nominal</th>
                    <th className="py-2.5 pr-3 font-semibold">Operator</th>
                    <th className="py-2.5 pr-3 font-semibold">Waktu Input</th>
                    <th className="py-2.5 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#167D8D]/10 dark:divide-[#B9E4E8]/10">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#355365] dark:text-[#8BC2CB]">
                        Tidak ada transaksi yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t) => (
                      <tr
                        key={t.id}
                        className={
                          t.is_deleted
                            ? 'bg-red-50/50 opacity-60 dark:bg-red-950/20'
                            : 'hover:bg-[#EEEEEE]/70 dark:hover:bg-[#113047]/65'
                        }
                      >
                        <td className="py-2.5 pr-3 font-mono text-[11px] text-[#355365] dark:text-[#8BC2CB]">
                          {t.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="py-2.5 pr-3 font-mono tabular-nums whitespace-nowrap">
                          {formatDateID(t.tx_date)}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={`font-semibold ${
                              t.tx_type === 'income'
                                ? 'text-[#167D8D] dark:text-[#B9E4E8]'
                                : 'text-red-600 dark:text-rose-400'
                            }`}
                          >
                            {t.tx_type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                          </span>
                          <div className="text-[11px] text-[#355365] dark:text-[#8BC2CB]">
                            {INCOME_CATEGORY_LABELS[t.category] ??
                              EXPENSE_CATEGORY_LABELS[t.category] ??
                              t.category}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <div className={`font-medium ${t.is_deleted ? 'line-through' : ''}`}>
                            {t.title}
                          </div>
                          {t.is_deleted && (
                            <div className="text-[11px] text-red-600 dark:text-rose-400">
                              Dibatalkan oleh {t.deleted_by_operator}: {t.delete_reason}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-mono font-bold tabular-nums">
                          {formatRupiah(t.amount)}
                        </td>
                        <td className="py-2.5 pr-3 text-[#355365] dark:text-[#8BC2CB]">
                          {t.operator_name}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-[11px] text-[#355365] whitespace-nowrap dark:text-[#8BC2CB]">
                          {formatDateTimeID(t.recorded_at)}
                        </td>
                        <td className="py-2.5 text-right">
                          {!t.is_deleted && (
                            <button
                              type="button"
                              onClick={() => setDeleteTargetId(t.id)}
                              title="Batalkan (Soft Delete)"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-rose-400 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
        </>
      ) : (
        <div className="farm-card p-5">
          <p className="mb-4 text-xs text-[#355365] dark:text-[#8BC2CB]">
            Catatan setiap penambahan, perubahan, koreksi stok, dan pembatalan transaksi. Nama
            operator merupakan identitas pencatat yang dipilih pada akun bersama.
          </p>
          <div className="space-y-2.5">
            {data.auditLogs.map((log) => (
              <div key={log.id} className="farm-subcard p-3.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                    {log.action} ·{' '}
                    <span className="font-mono text-[#167D8D] dark:text-[#B9E4E8]">{log.table_name}</span>
                  </div>
                  <div className="font-mono text-[11px] text-[#355365] dark:text-[#8BC2CB]">
                    {formatDateTimeID(log.created_at)} · Pencatat: {log.operator_name}
                  </div>
                </div>
                {log.reason && (
                  <div className="mt-1 text-[#355365] dark:text-[#8BC2CB]">Alasan: {log.reason}</div>
                )}
                {(log.before_data || log.after_data) && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {log.before_data && (
                      <pre className="overflow-x-auto rounded-lg bg-red-50/70 p-2 font-mono text-[10px] text-red-900 dark:bg-red-950/40 dark:text-rose-300">
                        Sebelum: {JSON.stringify(log.before_data)}
                      </pre>
                    )}
                    {log.after_data && (
                      <pre className="overflow-x-auto rounded-lg bg-[#B9E4E8]/45 p-2 font-mono text-[10px] text-[#071B2B] dark:bg-[#167D8D]/25 dark:text-[#B9E4E8]">
                        Sesudah: {JSON.stringify(log.after_data)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <PinConfirmModal
        open={Boolean(deleteTargetId)}
        title="Batalkan Transaksi (Soft Delete)"
        description="Penghapusan transaksi bersifat soft delete dan memerlukan PIN Pemilik. Data tetap tersimpan di histori & audit log."
        onClose={() => setDeleteTargetId(null)}
        onConfirm={async (pin, reason) => {
          if (!deleteTargetId) return;
          await softDeleteTransaction(data.isLiveSupabase, {
            transactionId: deleteTargetId,
            operatorName: currentOperator,
            reason,
            pin,
          });
          setFeedback('Transaksi dibatalkan dan tercatat di audit log.');
          await onRefresh();
        }}
      />
    </div>
  );
};
