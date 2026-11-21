import React, { useMemo, useState } from 'react';
import { CheckCircle2, Plus, Users, AlertCircle } from 'lucide-react';
import type { FarmDataState } from '../hooks/useFarmData';
import { insertSimpleRecord } from '../services/farmService';
import { formatDateID, formatRupiah } from '../utils/format';

interface CustomersPageProps {
  data: FarmDataState;
  onRefresh: () => Promise<void>;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ data, onRefresh }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      await insertSimpleRecord(data.isLiveSupabase, 'customers', {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
      setFeedback({ type: 'ok', msg: 'Data pembeli berhasil ditambahkan.' });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Gagal menambah pembeli.' });
    } finally {
      setSubmitting(false);
    }
  };

  const customerStats = useMemo(() => {
    return data.customers.map((c) => {
      const purchases = data.incomeTransactions.filter(
        (inc) => !inc.is_deleted && (inc.customer_id === c.id || inc.buyer_name.toLowerCase() === c.name.toLowerCase())
      );
      const totalBought = purchases.reduce((s, p) => s + Number(p.total_amount), 0);
      const remainingReceivable = data.receivables
        .filter(
          (r) =>
            !r.is_deleted &&
            r.status !== 'lunas' &&
            (r.customer_id === c.id || r.party_name.toLowerCase() === c.name.toLowerCase())
        )
        .reduce((s, r) => s + Number(r.remaining_amount), 0);
      return { customer: c, purchases, totalBought, remainingReceivable };
    });
  }, [data.customers, data.incomeTransactions, data.receivables]);

  const activeDetail = customerStats.find((x) => x.customer.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="farm-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-[#167D8D] dark:text-[#B9E4E8]" />
          <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
            Tambah Pembeli
          </h2>
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

        <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama Pembeli *"
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm"
          />
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="No. Telepon / WA"
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm"
          />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Alamat"
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#167D8D] px-4 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
          >
            <Plus className="h-4 w-4" />
            Simpan Pembeli
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="farm-card p-5 lg:col-span-7">
          <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#EEEEEE]">
            Database Pembeli ({customerStats.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#167D8D]/20 text-[#355365] dark:border-[#B9E4E8]/15 dark:text-[#8BC2CB]">
                  <th className="py-2 pr-3 font-semibold">Nama</th>
                  <th className="py-2 pr-3 font-semibold">Telepon</th>
                  <th className="py-2 pr-3 font-semibold text-right">Total Pembelian</th>
                  <th className="py-2 font-semibold text-right">Sisa Piutang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#167D8D]/10 dark:divide-[#B9E4E8]/10">
                {customerStats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#355365] dark:text-[#8BC2CB]">
                      Belum ada pembeli terdaftar.
                    </td>
                  </tr>
                ) : (
                  customerStats.map(({ customer, totalBought, remainingReceivable }) => (
                    <tr
                      key={customer.id}
                      onClick={() => setSelectedId(customer.id)}
                      className={`cursor-pointer transition-colors hover:bg-[#EEEEEE]/70 dark:hover:bg-[#113047]/65 ${
                        selectedId === customer.id
                          ? 'bg-[#B9E4E8]/40 dark:bg-[#167D8D]/25'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                          {customer.name}
                        </div>
                        <div className="text-[11px] text-[#355365] dark:text-[#8BC2CB]">
                          {customer.address || '-'}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 font-mono">{customer.phone || '-'}</td>
                      <td className="py-2.5 pr-3 text-right font-mono font-semibold text-[#167D8D] dark:text-[#B9E4E8]">
                        {formatRupiah(totalBought)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-semibold text-[#D4A359]">
                        {formatRupiah(remainingReceivable)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="farm-card p-5 lg:col-span-5">
          <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#EEEEEE]">
            Riwayat Pembelian Pelanggan
          </h3>
          {!activeDetail ? (
            <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
              Klik salah satu nama pembeli di tabel untuk melihat riwayat pembelian dan sisa piutang.
            </p>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="farm-subcard p-3">
                <div className="font-bold text-[#071B2B] dark:text-[#EEEEEE]">
                  {activeDetail.customer.name}
                </div>
                <div className="text-[#355365] dark:text-[#8BC2CB]">
                  {activeDetail.customer.phone || '-'} · {activeDetail.customer.address || '-'}
                </div>
              </div>
              {activeDetail.purchases.length === 0 ? (
                <p className="text-[#355365] dark:text-[#8BC2CB]">
                  Belum ada riwayat pembelian pada periode ini.
                </p>
              ) : (
                <div className="space-y-2">
                  {activeDetail.purchases.map((p) => (
                    <div
                      key={p.id}
                      className="farm-subcard flex justify-between px-3 py-2"
                    >
                      <div>
                        <div className="font-medium">{formatDateID(p.tx_date)}</div>
                        <div className="text-[11px] text-[#355365] dark:text-[#8BC2CB]">
                          {p.category}
                        </div>
                      </div>
                      <div className="font-mono font-semibold text-[#167D8D] dark:text-[#B9E4E8]">
                        {formatRupiah(p.total_amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
