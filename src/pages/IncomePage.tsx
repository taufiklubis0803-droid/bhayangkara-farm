import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Edit3, Plus, Trash2, AlertCircle } from 'lucide-react';
import { PinConfirmModal } from '../components/PinConfirmModal';
import type { FarmDataState } from '../hooks/useFarmData';
import {
  recordIncomeSale,
  softDeleteTransaction,
  updateIncomeTransaction,
} from '../services/farmService';
import type { IncomeCategory, IncomeTransaction, PaymentMethod, PaymentStatus } from '../types/database';
import {
  INCOME_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  createClientTxKey,
  formatDateID,
  formatNumber,
  formatRupiah,
  todayJakarta,
} from '../utils/format';

interface IncomePageProps {
  data: FarmDataState;
  currentOperator: string;
  onRefresh: () => Promise<void>;
}

const ACTIVE_INCOME_CATEGORIES: IncomeCategory[] = [
  'penjualan_kg',
  'penjualan_kotoran',
  'lainnya',
];

export const IncomePage: React.FC<IncomePageProps> = ({ data, currentOperator, onRefresh }) => {
  const [category, setCategory] = useState<IncomeCategory>('penjualan_kg');
  const [txDate, setTxDate] = useState(todayJakarta());
  const [customerId, setCustomerId] = useState<string>('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [chickenCount, setChickenCount] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [sackCount, setSackCount] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('lunas');
  const [paidAmount, setPaidAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [operatorName, setOperatorName] = useState(currentOperator);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Edit & Delete State
  const [editingItem, setEditingItem] = useState<IncomeTransaction | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editBuyer, setEditBuyer] = useState('');
  const [editBuyerPhone, setEditBuyerPhone] = useState('');
  const [editChickenCount, setEditChickenCount] = useState('');
  const [editWeightKg, setEditWeightKg] = useState('');
  const [editSackCount, setEditSackCount] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState('');
  const [editTotal, setEditTotal] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    setOperatorName(currentOperator);
  }, [currentOperator]);

  const computedTotal = useMemo(() => {
    const price = Number(unitPrice || 0);
    if (category === 'penjualan_kg') return Number(weightKg || 0) * price;
    if (category === 'penjualan_kotoran') return Number(sackCount || 0) * price;
    return Number(manualAmount || 0);
  }, [category, weightKg, sackCount, unitPrice, manualAmount]);

  const avgWeightPerChicken = useMemo(() => {
    const kg = Number(weightKg || 0);
    const ekor = Number(chickenCount || 0);
    if (kg > 0 && ekor > 0) return kg / ekor;
    return null;
  }, [weightKg, chickenCount]);

  const handleSelectCustomer = (id: string) => {
    setCustomerId(id);
    const found = data.customers.find((c) => c.id === id);
    if (found) {
      setBuyerName(found.name);
      setBuyerPhone(found.phone ?? '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!data.selectedPeriodId) {
      setFeedback({
        type: 'err',
        msg: 'Periode ternak aktif belum termuat. Periksa koneksi database Supabase atau muat ulang halaman.',
      });
      return;
    }

    if (category === 'penjualan_kg') {
      if (Number(weightKg || 0) <= 0) {
        setFeedback({ type: 'err', msg: 'Berat timbangan (kg) wajib diisi lebih dari 0.' });
        return;
      }
      if (Number(chickenCount || 0) <= 0) {
        setFeedback({
          type: 'err',
          msg: 'Jumlah ayam (ekor) wajib diisi agar stok kandang berkurang sesuai jumlah aktual.',
        });
        return;
      }
    }

    if (computedTotal <= 0) {
      setFeedback({ type: 'err', msg: 'Total nominal pemasukan harus lebih dari Rp0.' });
      return;
    }

    setSubmitting(true);
    try {
      await recordIncomeSale(data.isLiveSupabase, {
        periodId: data.selectedPeriodId,
        clientTxKey: createClientTxKey('inc'),
        txDate,
        category,
        customerId: customerId || null,
        buyerName: buyerName.trim() || 'Pembeli Umum',
        buyerPhone: buyerPhone.trim() || null,
        chickenCount: category === 'penjualan_kg' ? Number(chickenCount || 0) : 0,
        weightKg: category === 'penjualan_kg' ? Number(weightKg || 0) : 0,
        sackCount: category === 'penjualan_kotoran' ? Number(sackCount || 0) : 0,
        unitPrice: category === 'lainnya' ? computedTotal : Number(unitPrice || 0),
        totalAmount: computedTotal,
        paymentMethod:
          paymentStatus === 'belum_dibayar' && paymentMethod === 'tunai' ? 'kredit' : paymentMethod,
        paymentStatus,
        paidAmount:
          paymentStatus === 'lunas'
            ? computedTotal
            : paymentStatus === 'belum_dibayar'
            ? 0
            : Number(paidAmount || 0),
        dueDate: dueDate || null,
        operatorName: operatorName || currentOperator,
        notes: notes.trim() || null,
        customTitle: category === 'lainnya' ? customTitle.trim() : null,
      });

      setBuyerName('');
      setBuyerPhone('');
      setCustomerId('');
      setCustomTitle('');
      setChickenCount('');
      setWeightKg('');
      setSackCount('');
      setUnitPrice('');
      setManualAmount('');
      setPaidAmount('');
      setNotes('');
      setFeedback({
        type: 'ok',
        msg: data.isLiveSupabase
          ? 'Pemasukan berhasil disimpan ke Supabase dan stok otomatis diperbarui.'
          : 'Tersimpan di pratinjau lokal browser (hubungkan ke Supabase melalui tombol di atas agar tersimpan ke database).',
      });
      await onRefresh();
    } catch (err) {
      setFeedback({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Gagal menyimpan pemasukan.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (item: IncomeTransaction) => {
    setEditingItem(item);
    setEditDate(item.tx_date);
    setEditBuyer(item.buyer_name);
    setEditBuyerPhone(item.buyer_phone ?? '');
    setEditChickenCount(String(item.chicken_count));
    setEditWeightKg(String(item.weight_kg));
    setEditSackCount(String(item.sack_count));
    setEditUnitPrice(String(item.unit_price));
    setEditTotal(String(item.total_amount));
    setEditNotes(item.notes ?? '');
    setEditReason('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await updateIncomeTransaction(data.isLiveSupabase, {
        transactionId: editingItem.transaction_id,
        txDate: editDate,
        buyerName: editBuyer.trim() || 'Pembeli Umum',
        buyerPhone: editBuyerPhone.trim() || null,
        chickenCount: Number(editChickenCount || 0),
        weightKg: Number(editWeightKg || 0),
        sackCount: Number(editSackCount || 0),
        unitPrice: Number(editUnitPrice || 0),
        totalAmount: Number(editTotal || 0),
        notes: editNotes.trim() || null,
        operatorName: currentOperator,
        editReason: editReason.trim() || 'Revisi transaksi penjualan',
      });
      setEditingItem(null);
      setFeedback({
        type: 'ok',
        msg: 'Transaksi pemasukan diperbarui tanpa menggandakan pengurangan stok.',
      });
      await onRefresh();
    } catch (err) {
      setFeedback({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Gagal mengubah transaksi.',
      });
    }
  };

  const activeIncomes = data.incomeTransactions.filter((i) => !i.is_deleted);

  return (
    <div className="space-y-6">
      {/* Formulir Input Pemasukan */}
      <div className="farm-card p-5 md:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              Catat Pemasukan &amp; Penjualan
            </h2>
            <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
              Stok ayam saat ini:{' '}
              <strong className="font-mono text-[#167D8D] dark:text-[#B9E4E8]">
                {formatNumber(data.chickenStock?.current_stock ?? 0)} ekor
              </strong>
            </p>
          </div>
        </div>

        {/* Kategori Tabs (Penjualan ayam hanya 1 kategori: Per Kilogram) */}
        <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {ACTIVE_INCOME_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`min-h-[44px] rounded-xl px-3 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                category === cat
                  ? 'bg-[#167D8D] text-white shadow-sm dark:bg-[#B9E4E8] dark:text-[#071B2B]'
                  : 'border border-[#167D8D]/20 bg-[#EEEEEE] text-[#071B2B] hover:border-[#167D8D]/60 dark:border-[#B9E4E8]/15 dark:bg-[#113047] dark:text-[#B9E4E8] dark:hover:border-[#B9E4E8]/45'
              }`}
            >
              {INCOME_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {feedback && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
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
            <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
              Tanggal
            </label>
            <input
              type="date"
              required
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
              Operator Pencatat
            </label>
            <select
              required
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

          {category !== 'lainnya' ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                Pembeli (Pilih / Ketik Manual)
              </label>
              <div className="flex gap-2">
                {data.customers.length > 0 && (
                  <select
                    value={customerId}
                    onChange={(e) => handleSelectCustomer(e.target.value)}
                    className="min-h-[44px] w-1/2 rounded-xl border border-slate-300 bg-white px-2.5 text-xs dark:bg-[#091D2E]"
                  >
                    <option value="">-- Database --</option>
                    {data.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => {
                    setBuyerName(e.target.value);
                    setCustomerId('');
                  }}
                  placeholder="Nama pembeli"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                Nama Pemasukan <span className="text-red-600 dark:text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Contoh: Jual karung bekas / Bonus pakan"
                className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
              No. Handphone Pembeli / Pihak Terkait
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              placeholder="Contoh: 081234567890"
              className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
            />
          </div>

          {category === 'penjualan_kg' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Jumlah Kilogram (kg) <span className="text-red-600 dark:text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0.01}
                  required
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="Contoh: 12.5"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Harga Per Kilogram (Rp) <span className="text-red-600 dark:text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="42000"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Jumlah Ayam (Ekor) <span className="text-red-600 dark:text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={chickenCount}
                  onChange={(e) => setChickenCount(e.target.value)}
                  placeholder="Contoh: 10"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
                <p className="mt-1 text-[11px] text-[#355365] dark:text-[#8BC2CB]">
                  1 ekor belum tentu 1 kg — jumlah ekor mengurangi stok ayam kandang.
                </p>
              </div>
            </>
          )}

          {category === 'penjualan_kotoran' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Jumlah Goni <span className="text-red-600 dark:text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={sackCount}
                  onChange={(e) => setSackCount(e.target.value)}
                  placeholder="10"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Harga Per Goni (Rp) <span className="text-red-600 dark:text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="15000"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
            </>
          )}

          {category === 'lainnya' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                Nominal Pemasukan (Rp) <span className="text-red-600 dark:text-rose-400">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="100000"
                className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
              Metode Pembayaran
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:bg-[#091D2E]"
            >
              <option value="tunai">Tunai</option>
              <option value="transfer">Transfer Bank</option>
              <option value="kredit">Kredit / Tempo</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
              Status Pembayaran
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:bg-[#091D2E]"
            >
              <option value="lunas">Lunas</option>
              <option value="dibayar_sebagian">Dibayar Sebagian</option>
              <option value="belum_dibayar">Belum Dibayar (Piutang)</option>
            </select>
          </div>

          {paymentStatus === 'dibayar_sebagian' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                Nominal Sudah Diterima (Rp)
              </label>
              <input
                type="number"
                min={0}
                max={computedTotal}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
          )}

          {paymentStatus !== 'lunas' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                Tanggal Jatuh Tempo
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
          )}

          <div className="sm:col-span-2 lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
              Catatan
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan tambahan transaksi"
              className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </div>

          <div className="farm-mint-box flex flex-col justify-end px-4 py-2.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-[#167D8D] dark:text-[#B9E4E8]">
              <span>Total Otomatis</span>
              {avgWeightPerChicken !== null && (
                <span className="font-mono">
                  Rata-rata {formatNumber(avgWeightPerChicken, 2)} kg/ekor
                </span>
              )}
            </div>
            <div className="font-mono text-lg font-bold text-[#071B2B] tabular-nums dark:text-[#EEEEEE]">
              {formatRupiah(computedTotal)}
            </div>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-[46px] items-center gap-2 rounded-xl bg-[#167D8D] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#071B2B] disabled:opacity-60 dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
            >
              <Plus className="h-4 w-4" />
              {submitting ? 'Menyimpan...' : 'Simpan Pemasukan'}
            </button>
          </div>
        </form>
      </div>

      {/* Daftar Pemasukan */}
      <div className="farm-card p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#EEEEEE]">
          Daftar Pemasukan Periode Ini ({activeIncomes.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#167D8D]/20 text-[#355365] dark:border-[#B9E4E8]/15 dark:text-[#8BC2CB]">
                <th className="py-2.5 pr-3 font-semibold">Tanggal</th>
                <th className="py-2.5 pr-3 font-semibold">Kategori</th>
                <th className="py-2.5 pr-3 font-semibold">Pembeli</th>
                <th className="py-2.5 pr-3 font-semibold">No. Handphone</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Volume</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Total</th>
                <th className="py-2.5 pr-3 font-semibold">Pembayaran</th>
                <th className="py-2.5 pr-3 font-semibold">Operator</th>
                <th className="py-2.5 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#167D8D]/10 dark:divide-[#B9E4E8]/10">
              {activeIncomes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#355365] dark:text-[#8BC2CB]">
                    Belum ada transaksi pemasukan pada periode ini.
                  </td>
                </tr>
              ) : (
                activeIncomes.map((inc) => (
                  <tr key={inc.id} className="hover:bg-[#EEEEEE]/70 dark:hover:bg-[#113047]/65">
                    <td className="py-3 pr-3 font-mono tabular-nums whitespace-nowrap">
                      {formatDateID(inc.tx_date)}
                    </td>
                    <td className="py-3 pr-3 font-medium text-[#071B2B] dark:text-[#EEEEEE]">
                      {INCOME_CATEGORY_LABELS[inc.category] ?? inc.category}
                    </td>
                    <td className="py-3 pr-3">{inc.buyer_name}</td>
                    <td className="py-3 pr-3 font-mono text-[#355365] whitespace-nowrap dark:text-[#8BC2CB]">
                      {inc.buyer_phone || '-'}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono tabular-nums whitespace-nowrap">
                      {inc.category === 'penjualan_ekor' && `${inc.chicken_count} ekor`}
                      {inc.category === 'penjualan_kg' &&
                        `${inc.weight_kg} kg (${inc.chicken_count} ekor)`}
                      {inc.category === 'penjualan_kotoran' && `${inc.sack_count} goni`}
                      {inc.category === 'lainnya' && '-'}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono font-semibold text-[#167D8D] tabular-nums dark:text-[#B9E4E8]">
                      {formatRupiah(inc.total_amount)}
                    </td>
                    <td className="py-3 pr-3">
                      <span className="text-[#355365] dark:text-[#8BC2CB]">
                        {PAYMENT_METHOD_LABELS[inc.payment_method]} ·{' '}
                      </span>
                      <span
                        className={
                          inc.payment_status === 'lunas'
                            ? 'font-semibold text-[#167D8D] dark:text-[#B9E4E8]'
                            : 'font-semibold text-[#D4A359]'
                        }
                      >
                        {PAYMENT_STATUS_LABELS[inc.payment_status]}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-[#355365] dark:text-[#8BC2CB]">
                      {inc.operator_name}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(inc)}
                          title="Edit"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#355365] hover:bg-[#EEEEEE] dark:text-[#8BC2CB] dark:hover:bg-[#113047]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(inc.transaction_id)}
                          title="Hapus (Soft Delete)"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-rose-400 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Pemasukan */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071B2B]/75 p-4 backdrop-blur-xs">
          <div className="farm-card w-full max-w-lg p-6">
            <h3 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              Edit Transaksi Pemasukan
            </h3>
            <p className="mt-1 text-xs text-[#355365] dark:text-[#8BC2CB]">
              Perubahan jumlah ekor akan menghitung selisih stok secara otomatis tanpa pengurangan ganda.
            </p>
            <form onSubmit={handleSaveEdit} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold">Tanggal</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Pembeli</label>
                <input
                  type="text"
                  value={editBuyer}
                  onChange={(e) => setEditBuyer(e.target.value)}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">No. Handphone</label>
                <input
                  type="tel"
                  value={editBuyerPhone}
                  onChange={(e) => setEditBuyerPhone(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              {editingItem.category === 'penjualan_kg' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold">Jumlah Kilogram (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0.01}
                    value={editWeightKg}
                    onChange={(e) => setEditWeightKg(e.target.value)}
                    className="min-h-[40px] w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
                  />
                </div>
              )}
              {(editingItem.category === 'penjualan_ekor' ||
                editingItem.category === 'penjualan_kg') && (
                <div>
                  <label className="mb-1 block text-xs font-semibold">Jumlah Ekor</label>
                  <input
                    type="number"
                    min={1}
                    value={editChickenCount}
                    onChange={(e) => setEditChickenCount(e.target.value)}
                    className="min-h-[40px] w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold">Total Nominal (Rp)</label>
                <input
                  type="number"
                  min={1}
                  value={editTotal}
                  onChange={(e) => setEditTotal(e.target.value)}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold">Alasan Perubahan</label>
                <input
                  type="text"
                  required
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Contoh: Koreksi jumlah ekor timbangan"
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg border border-[#167D8D]/25 px-4 py-2 text-xs font-semibold text-[#071B2B] hover:bg-[#EEEEEE] dark:border-[#B9E4E8]/25 dark:text-[#B9E4E8] dark:hover:bg-[#113047]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#167D8D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Soft Delete dengan PIN Pemilik */}
      <PinConfirmModal
        open={Boolean(deleteTargetId)}
        title="Batalkan Transaksi Pemasukan"
        description="Transaksi akan ditandai terhapus (soft delete) dan tercatat di audit log. Jika penjualan ayam, stok akan dikembalikan otomatis."
        onClose={() => setDeleteTargetId(null)}
        onConfirm={async (pin, reason) => {
          if (!deleteTargetId) return;
          await softDeleteTransaction(data.isLiveSupabase, {
            transactionId: deleteTargetId,
            operatorName: currentOperator,
            reason,
            pin,
          });
          setFeedback({ type: 'ok', msg: 'Transaksi dibatalkan dan tercatat di audit log.' });
          await onRefresh();
        }}
      />
    </div>
  );
};
