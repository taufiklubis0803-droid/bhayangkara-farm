import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, Truck } from 'lucide-react';
import type { FarmDataState } from '../hooks/useFarmData';
import { insertSimpleRecord } from '../services/farmService';
import { formatDateID, formatRupiah } from '../utils/format';

interface SuppliersPageProps {
  data: FarmDataState;
  onRefresh: () => Promise<void>;
}

export const SuppliersPage: React.FC<SuppliersPageProps> = ({ data, onRefresh }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [productType, setProductType] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      await insertSimpleRecord(data.isLiveSupabase, 'suppliers', {
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        product_type: productType.trim() || null,
      });
      setName('');
      setPhone('');
      setAddress('');
      setProductType('');
      setFeedback({ type: 'ok', msg: 'Data pemasok berhasil ditambahkan.' });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Gagal menambah pemasok.' });
    } finally {
      setSubmitting(false);
    }
  };

  const supplierStats = useMemo(() => {
    return data.suppliers.map((s) => {
      const purchases = data.expenseTransactions.filter(
        (exp) =>
          !exp.is_deleted &&
          (exp.supplier_id === s.id ||
            (exp.supplier_or_store ?? '').toLowerCase() === s.name.toLowerCase())
      );
      const totalBought = purchases.reduce((sum, p) => sum + Number(p.total_amount), 0);
      return { supplier: s, purchases, totalBought };
    });
  }, [data.suppliers, data.expenseTransactions]);

  const activeDetail = supplierStats.find((x) => x.supplier.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="farm-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Truck className="h-5 w-5 text-[#167D8D] dark:text-[#B9E4E8]" />
          <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
            Tambah Pemasok / Toko
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

        <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama Pemasok *"
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm"
          />
          <input
            type="text"
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            placeholder="Jenis Produk (Bibit / Pakan)"
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm"
          />
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="No. Telepon"
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
            Simpan Pemasok
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="farm-card p-5 lg:col-span-7">
          <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#EEEEEE]">
            Database Pemasok ({supplierStats.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#167D8D]/20 text-[#355365] dark:border-[#B9E4E8]/15 dark:text-[#8BC2CB]">
                  <th className="py-2 pr-3 font-semibold">Nama Pemasok</th>
                  <th className="py-2 pr-3 font-semibold">Jenis Produk</th>
                  <th className="py-2 pr-3 font-semibold">Telepon</th>
                  <th className="py-2 font-semibold text-right">Total Pembelian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#167D8D]/10 dark:divide-[#B9E4E8]/10">
                {supplierStats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-[#355365] dark:text-[#8BC2CB]">
                      Belum ada pemasok terdaftar.
                    </td>
                  </tr>
                ) : (
                  supplierStats.map(({ supplier, totalBought }) => (
                    <tr
                      key={supplier.id}
                      onClick={() => setSelectedId(supplier.id)}
                      className={`cursor-pointer transition-colors hover:bg-[#EEEEEE]/70 dark:hover:bg-[#113047]/65 ${
                        selectedId === supplier.id
                          ? 'bg-[#B9E4E8]/40 dark:bg-[#167D8D]/25'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                          {supplier.name}
                        </div>
                        <div className="text-[11px] text-[#355365] dark:text-[#8BC2CB]">
                          {supplier.address || '-'}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">{supplier.product_type || '-'}</td>
                      <td className="py-2.5 pr-3 font-mono">{supplier.phone || '-'}</td>
                      <td className="py-2.5 text-right font-mono font-semibold text-red-600 dark:text-rose-400">
                        {formatRupiah(totalBought)}
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
            Riwayat Pembelian dari Pemasok
          </h3>
          {!activeDetail ? (
            <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
              Klik salah satu nama pemasok untuk melihat riwayat pembelian barang/bibit/pakan.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              {activeDetail.purchases.length === 0 ? (
                <p className="text-[#355365] dark:text-[#8BC2CB]">
                  Belum ada riwayat pembelian pada periode ini.
                </p>
              ) : (
                activeDetail.purchases.map((p) => (
                  <div
                    key={p.id}
                    className="farm-subcard flex justify-between px-3 py-2"
                  >
                    <div>
                      <div className="font-medium text-[#071B2B] dark:text-[#EEEEEE]">
                        {p.item_name}
                      </div>
                      <div className="text-[11px] text-[#355365] dark:text-[#8BC2CB]">
                        {formatDateID(p.tx_date)}
                      </div>
                    </div>
                    <div className="font-mono font-semibold text-red-600 dark:text-rose-400">
                      {formatRupiah(p.total_amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
