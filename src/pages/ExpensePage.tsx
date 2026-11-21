import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Plus, Trash2, Upload, Check } from 'lucide-react';
import { PinConfirmModal } from '../components/PinConfirmModal';
import type { FarmDataState } from '../hooks/useFarmData';
import {
  confirmExpenseStock,
  recordExpense,
  softDeleteTransaction,
} from '../services/farmService';
import type {
  AccountingClass,
  NavMenuKey,
  PaymentMethod,
  PaymentStatus,
} from '../types/database';
import {
  ACCOUNTING_CLASS_LABELS,
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  createClientTxKey,
  formatDateID,
  formatNumber,
  formatRupiah,
  todayJakarta,
} from '../utils/format';

interface ExpensePageProps {
  data: FarmDataState;
  currentOperator: string;
  onRefresh: () => Promise<void>;
  onNavigate: (menu: NavMenuKey) => void;
}

const DEFAULT_ACCOUNTING_BY_CAT: Record<string, AccountingClass> = {
  bibit_ayam: 'pembelian_ternak',
  renovasi: 'renovasi',
  peralatan: 'peralatan',
  pakan: 'persediaan',
  vitamin: 'beban_operasional',
  vaksin: 'beban_operasional',
  sekam: 'beban_operasional',
  token_listrik: 'beban_operasional',
  jamu: 'beban_operasional',
  desinfektan: 'beban_operasional',
  gaji_karyawan: 'tenaga_kerja',
  lainnya: 'beban_operasional',
};

export const ExpensePage: React.FC<ExpensePageProps> = ({
  data,
  currentOperator,
  onRefresh,
  onNavigate,
}) => {
  const [category, setCategory] = useState<string>('pakan');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [accountingClass, setAccountingClass] = useState<AccountingClass>('persediaan');
  const [txDate, setTxDate] = useState(todayJakarta());
  const [supplierId, setSupplierId] = useState('');
  const [supplierOrStore, setSupplierOrStore] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('unit');
  const [unitPrice, setUnitPrice] = useState('');
  const [manualTotal, setManualTotal] = useState('');

  // Pakan specific (1 sak = 50 kg)
  const [feedType, setFeedType] = useState('Pakan Ayam Kampung');
  const [feedBrand, setFeedBrand] = useState('');
  const [sackCount, setSackCount] = useState('1');

  // Vaksin specific (100 / 500 / 1000 ekor)
  const [vaccinePackage, setVaccinePackage] = useState('100 ekor');
  const [vaccinatedCount, setVaccinatedCount] = useState('');

  // Peralatan specific
  const [condition, setCondition] = useState('Baru');

  // Konfirmasi stok masuk untuk bibit & pakan
  const [stockConfirmed, setStockConfirmed] = useState(true);

  // Pembayaran
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('lunas');
  const [paidAmount, setPaidAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [operatorName, setOperatorName] = useState(currentOperator);
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    setOperatorName(currentOperator);
  }, [currentOperator]);

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    setAccountingClass(DEFAULT_ACCOUNTING_BY_CAT[newCat] ?? 'beban_operasional');
    setManualTotal('');
    if (newCat === 'bibit_ayam') {
      setUnit('ekor');
      setUnitPrice('8350');
      setStockConfirmed(false);
    } else if (newCat === 'pakan') {
      setUnit('sak');
      setUnitPrice('');
      setStockConfirmed(true);
    } else if (newCat === 'vitamin') {
      setUnit('kemasan (500g)');
      setUnitPrice('');
    } else if (newCat === 'sekam') {
      setUnit('goni');
      setUnitPrice('');
    } else if (newCat === 'desinfektan') {
      setUnit('liter');
      setUnitPrice('');
    } else if (newCat === 'jamu') {
      setUnit('kg');
      setUnitPrice('');
    } else {
      setUnit('unit');
      setUnitPrice('');
    }
  };

  const totalWeightFeedKg = useMemo(() => Number(sackCount || 0) * 50, [sackCount]);
  const totalVitaminGrams = useMemo(() => Number(quantity || 0) * 500, [quantity]);

  const computedTotal = useMemo(() => {
    if (category === 'token_listrik') return Number(manualTotal || 0);
    if (category === 'pakan') return Number(sackCount || 0) * Number(unitPrice || 0);
    if (category === 'lainnya' && !unitPrice) return Number(manualTotal || 0);
    return Number(quantity || 0) * Number(unitPrice || 0);
  }, [category, sackCount, quantity, unitPrice, manualTotal]);

  const handleSelectSupplier = (id: string) => {
    setSupplierId(id);
    const found = data.suppliers.find((s) => s.id === id);
    if (found) setSupplierOrStore(found.name);
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

    if (computedTotal <= 0) {
      setFeedback({ type: 'err', msg: 'Total pengeluaran harus lebih dari Rp0.' });
      return;
    }

    setSubmitting(true);
    try {
      const finalCat =
        category === 'lainnya' && customCategoryName.trim()
          ? customCategoryName.trim().toLowerCase().replace(/\s+/g, '_')
          : category;

      const resolvedItemName =
        itemName.trim() ||
        (category === 'pakan'
          ? `Pakan ${feedType}${feedBrand ? ` (${feedBrand})` : ''} - ${sackCount} sak`
          : category === 'bibit_ayam'
          ? `Bibit Ayam Kampung (${quantity} ekor)`
          : category === 'token_listrik'
          ? 'Token Listrik Kandang'
          : category === 'sekam'
          ? `Sekam (${quantity} goni)`
          : category === 'jamu'
          ? `Bahan Herbal Pembuatan Jamu (${quantity} ${unit})`
          : customCategoryName.trim() || EXPENSE_CATEGORY_LABELS[category] || 'Pengeluaran');

      await recordExpense(data.isLiveSupabase, {
        periodId: data.selectedPeriodId,
        clientTxKey: createClientTxKey('exp'),
        txDate,
        category: finalCat,
        accountingClass,
        supplierId: supplierId || null,
        supplierOrStore: supplierOrStore.trim() || null,
        itemName: resolvedItemName,
        quantity: category === 'pakan' ? Number(sackCount || 0) : Number(quantity || 1),
        unit,
        unitPrice: category === 'token_listrik' ? computedTotal : Number(unitPrice || 0),
        totalAmount: computedTotal,
        feedType: category === 'pakan' ? feedType.trim() : null,
        feedBrand: category === 'pakan' ? feedBrand.trim() || 'Umum' : null,
        sackCount: category === 'pakan' ? Number(sackCount || 0) : 0,
        totalWeightKg: category === 'pakan' ? totalWeightFeedKg : 0,
        packCount: category === 'vitamin' || category === 'vaksin' ? Number(quantity || 0) : 0,
        vaccinePackage: category === 'vaksin' ? vaccinePackage : null,
        vaccinatedCount: category === 'vaksin' ? Number(vaccinatedCount || 0) : 0,
        condition: category === 'peralatan' ? condition : null,
        stockConfirmed:
          category === 'bibit_ayam' || category === 'pakan' ? stockConfirmed : true,
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
        receiptFile,
      });

      setItemName('');
      setCustomCategoryName('');
      setUnitPrice('');
      setManualTotal('');
      setNotes('');
      setReceiptFile(null);
      setFeedback({
        type: 'ok',
        msg: data.isLiveSupabase
          ? 'Pengeluaran berhasil disimpan permanen ke database Supabase.'
          : 'Tersimpan di pratinjau lokal browser (hubungkan ke Supabase melalui tombol di atas agar tersimpan ke database).',
      });
      await onRefresh();
    } catch (err) {
      setFeedback({
        type: 'err',
        msg: err instanceof Error ? err.message : 'Gagal menyimpan pengeluaran.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPendingStock = async (expenseId: string) => {
    try {
      await confirmExpenseStock(data.isLiveSupabase, expenseId, currentOperator);
      setFeedback({ type: 'ok', msg: 'Stok masuk berhasil dikonfirmasi ke inventaris.' });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Gagal konfirmasi stok.' });
    }
  };

  const activeExpenses = data.expenseTransactions.filter((e) => !e.is_deleted);
  const pendingStockConfirmations = activeExpenses.filter(
    (e) => !e.stock_confirmed && (e.category === 'bibit_ayam' || e.category === 'pakan')
  );

  return (
    <div className="space-y-6">
      {/* Pembelian Menunggu Konfirmasi Masuk Stok */}
      {pendingStockConfirmations.length > 0 && (
        <div className="rounded-2xl border border-amber-300/70 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-950/35">
          <div className="mb-2 text-xs font-bold text-amber-900 dark:text-amber-300">
            Menunggu Konfirmasi Masuk Stok ({pendingStockConfirmations.length})
          </div>
          <div className="space-y-2">
            {pendingStockConfirmations.map((item) => (
              <div
                key={item.id}
                className="farm-subcard flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
              >
                <div>
                  <span className="font-semibold text-[#071B2B] dark:text-[#B9E4E8]">
                    {item.item_name}
                  </span>{' '}
                  ·{' '}
                  <span className="text-[#355365] dark:text-[#8BC2CB]">
                    {formatDateID(item.tx_date)}
                  </span>{' '}
                  ·{' '}
                  <span className="font-mono font-semibold">{formatRupiah(item.total_amount)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleConfirmPendingStock(item.id)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#167D8D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
                >
                  <Check className="h-3.5 w-3.5" />
                  Konfirmasi Masuk Stok
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulir Pengeluaran */}
      <div className="farm-card p-5 md:p-6">
        <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
          Catat Pengeluaran Usaha
        </h2>
        <p className="mt-1 text-xs text-[#355365] dark:text-[#8BC2CB]">
          Pilih kategori pengeluaran sesuai kebutuhan operasional, persediaan, ternak, atau investasi.
        </p>

        {/* Category Selector Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key === 'gaji_karyawan') {
                  onNavigate('gaji');
                } else {
                  handleCategoryChange(key);
                }
              }}
              className={`min-h-[42px] rounded-xl px-2.5 py-2 text-xs font-semibold transition-all ${
                category === key
                  ? 'bg-[#167D8D] text-white shadow-sm dark:bg-[#B9E4E8] dark:text-[#071B2B]'
                  : 'border border-[#167D8D]/20 bg-[#EEEEEE] text-[#071B2B] hover:border-[#167D8D]/60 dark:border-[#B9E4E8]/15 dark:bg-[#113047] dark:text-[#B9E4E8] dark:hover:border-[#B9E4E8]/45'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {feedback && (
          <div
            className={`mt-4 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
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

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
              Klasifikasi Biaya
            </label>
            <select
              value={accountingClass}
              onChange={(e) => setAccountingClass(e.target.value as AccountingClass)}
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:bg-[#091D2E]"
            >
              {Object.entries(ACCOUNTING_CLASS_LABELS)
                .filter(([k]) => k !== 'pendapatan')
                .map(([k, lbl]) => (
                  <option key={k} value={k}>
                    {lbl}
                  </option>
                ))}
            </select>
          </div>

          {category === 'lainnya' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                Nama Kategori Bebas
              </label>
              <input
                type="text"
                value={customCategoryName}
                onChange={(e) => setCustomCategoryName(e.target.value)}
                placeholder="Contoh: Transportasi / Kemasan"
                className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
          )}

          {category !== 'token_listrik' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                Pemasok / Nama Toko
              </label>
              <div className="flex gap-2">
                {data.suppliers.length > 0 && (
                  <select
                    value={supplierId}
                    onChange={(e) => handleSelectSupplier(e.target.value)}
                    className="min-h-[44px] w-1/2 rounded-xl border border-slate-300 bg-white px-2 text-xs dark:bg-[#091D2E]"
                  >
                    <option value="">-- Pemasok --</option>
                    {data.suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  value={supplierOrStore}
                  onChange={(e) => {
                    setSupplierOrStore(e.target.value);
                    setSupplierId('');
                  }}
                  placeholder="Nama toko / pemasok"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
            </div>
          )}

          {/* Field Spesifik Kategori */}
          {category === 'bibit_ayam' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Jumlah Bibit (ekor)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Harga/Ekor (Ref: Rp8.200–Rp8.500)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  id="chk-bibit-confirm"
                  type="checkbox"
                  checked={stockConfirmed}
                  onChange={(e) => setStockConfirmed(e.target.checked)}
                  className="h-4 w-4 accent-[#167D8D]"
                />
                <label
                  htmlFor="chk-bibit-confirm"
                  className="text-xs font-medium text-[#071B2B] dark:text-[#EEEEEE]"
                >
                  Konfirmasi bibit sudah masuk kandang sekarang
                </label>
              </div>
            </>
          )}

          {category === 'pakan' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Jenis Pakan
                </label>
                <input
                  type="text"
                  required
                  value={feedType}
                  onChange={(e) => setFeedType(e.target.value)}
                  placeholder="Contoh: Starter / Grower / Dedak"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Merek Pakan
                </label>
                <input
                  type="text"
                  value={feedBrand}
                  onChange={(e) => setFeedBrand(e.target.value)}
                  placeholder="Contoh: Pokphand / Japfa"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Jumlah Sak (1 sak = 50 kg)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={sackCount}
                  onChange={(e) => setSackCount(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
                <div className="mt-1 font-mono text-[11px] text-[#167D8D] dark:text-[#B9E4E8]">
                  Berat total: {formatNumber(totalWeightFeedKg)} kg
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Harga Per Sak (Rp)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="420000"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  id="chk-pakan-confirm"
                  type="checkbox"
                  checked={stockConfirmed}
                  onChange={(e) => setStockConfirmed(e.target.checked)}
                  className="h-4 w-4 accent-[#167D8D]"
                />
                <label
                  htmlFor="chk-pakan-confirm"
                  className="text-xs font-medium text-[#071B2B] dark:text-[#EEEEEE]"
                >
                  Konfirmasi pakan sudah masuk stok gudang
                </label>
              </div>
            </>
          )}

          {category === 'vitamin' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Nama Vitamin
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Contoh: Vita Chicks / Neobro"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Jumlah Kemasan (1 kemasan = 500 g)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
                <div className="mt-1 font-mono text-[11px] text-[#167D8D] dark:text-[#B9E4E8]">
                  Total berat: {formatNumber(totalVitaminGrams)} gram
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Harga Per Kemasan (Rp)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
            </>
          )}

          {category === 'vaksin' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Nama Vaksin
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Contoh: ND IB / Gumboro"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Paket Vaksin
                </label>
                <select
                  value={vaccinePackage}
                  onChange={(e) => setVaccinePackage(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:bg-[#091D2E]"
                >
                  <option value="100 ekor">Paket 100 ekor</option>
                  <option value="500 ekor">Paket 500 ekor</option>
                  <option value="1.000 ekor">Paket 1.000 ekor</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Jumlah Paket
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Harga Per Paket (Rp)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Jumlah Ayam Divaksin (ekor)
                </label>
                <input
                  type="number"
                  min={0}
                  value={vaccinatedCount}
                  onChange={(e) => setVaccinatedCount(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
            </>
          )}

          {category === 'token_listrik' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                Nominal Token Listrik (Rp)
              </label>
              <input
                type="number"
                min={1}
                required
                value={manualTotal}
                onChange={(e) => setManualTotal(e.target.value)}
                placeholder="100000"
                className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
          )}

          {!['bibit_ayam', 'pakan', 'vitamin', 'vaksin', 'token_listrik'].includes(category) && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  {category === 'jamu' ? 'Bahan Herbal Pembuatan Jamu' : 'Nama Barang / Pekerjaan'}
                </label>
                <input
                  type="text"
                  required={category !== 'sekam'}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder={
                    category === 'jamu'
                      ? 'Contoh: Kunyit, Jahe Merah, Temulawak, Gula Merah, Serai'
                      : 'Contoh: Kayu reng, Tempat minum otomatis, Sekam'
                  }
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Jumlah
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Satuan
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder={category === 'jamu' ? 'kg / ikat / bungkus / liter' : 'goni / liter / unit / m'}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Harga Satuan (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              {category === 'peralatan' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                    Kondisi
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:bg-[#091D2E]"
                  >
                    <option value="Baru">Baru</option>
                    <option value="Bekas Layak">Bekas Layak</option>
                  </select>
                </div>
              )}
            </>
          )}

          {/* Pembayaran */}
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
              <option value="belum_dibayar">Belum Dibayar (Utang)</option>
            </select>
          </div>

          {paymentStatus === 'dibayar_sebagian' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                Nominal Dibayar (Rp)
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
                Jatuh Tempo
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
              Upload Foto Nota / Bukti (Opsional)
            </label>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#167D8D]/35 bg-[#EEEEEE] px-3 text-xs text-[#355365] hover:border-[#167D8D] dark:border-[#B9E4E8]/25 dark:bg-[#113047] dark:text-[#8BC2CB]">
              <Upload className="h-4 w-4 text-[#167D8D] dark:text-[#B9E4E8]" />
              <span className="truncate">{receiptFile ? receiptFile.name : 'Pilih foto/PDF nota'}</span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
              Catatan
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Keterangan tambahan"
              className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm"
            />
          </div>

          <div className="flex flex-col justify-end rounded-xl border border-red-200/80 bg-red-50 px-4 py-2.5 dark:border-red-500/30 dark:bg-red-950/35">
            <div className="text-[11px] font-medium text-red-700 dark:text-rose-300">
              Total Pengeluaran
            </div>
            <div className="font-mono text-lg font-bold text-red-700 tabular-nums dark:text-rose-400">
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
              {submitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Pengeluaran */}
      <div className="farm-card p-5">
        <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#EEEEEE]">
          Daftar Pengeluaran Periode Ini ({activeExpenses.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#167D8D]/20 text-[#355365] dark:border-[#B9E4E8]/15 dark:text-[#8BC2CB]">
                <th className="py-2.5 pr-3 font-semibold">Tanggal</th>
                <th className="py-2.5 pr-3 font-semibold">Kategori</th>
                <th className="py-2.5 pr-3 font-semibold">Item / Keterangan</th>
                <th className="py-2.5 pr-3 font-semibold">Pemasok/Toko</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Total</th>
                <th className="py-2.5 pr-3 font-semibold">Status</th>
                <th className="py-2.5 pr-3 font-semibold">Operator</th>
                <th className="py-2.5 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#167D8D]/10 dark:divide-[#B9E4E8]/10">
              {activeExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#355365] dark:text-[#8BC2CB]">
                    Belum ada transaksi pengeluaran pada periode ini.
                  </td>
                </tr>
              ) : (
                activeExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#EEEEEE]/70 dark:hover:bg-[#113047]/65">
                    <td className="py-3 pr-3 font-mono tabular-nums whitespace-nowrap">
                      {formatDateID(exp.tx_date)}
                    </td>
                    <td className="py-3 pr-3 font-medium text-[#071B2B] dark:text-[#EEEEEE]">
                      {EXPENSE_CATEGORY_LABELS[exp.category] ?? exp.category}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-medium text-[#071B2B] dark:text-[#EEEEEE]">
                        {exp.item_name}
                      </div>
                      {exp.attachment_url && (
                        <a
                          href={exp.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-medium text-[#167D8D] underline dark:text-[#B9E4E8]"
                        >
                          Lihat Nota
                        </a>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-[#355365] dark:text-[#8BC2CB]">
                      {exp.supplier_or_store || '-'}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono font-semibold text-red-600 tabular-nums dark:text-rose-400">
                      {formatRupiah(exp.total_amount)}
                    </td>
                    <td className="py-3 pr-3">
                      {PAYMENT_METHOD_LABELS[exp.payment_method]} ·{' '}
                      <span
                        className={
                          exp.payment_status === 'lunas'
                            ? 'font-semibold text-[#167D8D] dark:text-[#B9E4E8]'
                            : 'font-semibold text-[#D4A359]'
                        }
                      >
                        {PAYMENT_STATUS_LABELS[exp.payment_status]}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-[#355365] dark:text-[#8BC2CB]">
                      {exp.operator_name}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(exp.transaction_id)}
                        title="Hapus (Soft Delete)"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-rose-400 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PinConfirmModal
        open={Boolean(deleteTargetId)}
        title="Batalkan Transaksi Pengeluaran"
        description="Transaksi akan ditandai terhapus (soft delete) dan tercatat pada audit log. Jika pembelian bibit atau pakan sudah masuk stok, stok akan disesuaikan kembali."
        onClose={() => setDeleteTargetId(null)}
        onConfirm={async (pin, reason) => {
          if (!deleteTargetId) return;
          await softDeleteTransaction(data.isLiveSupabase, {
            transactionId: deleteTargetId,
            operatorName: currentOperator,
            reason,
            pin,
          });
          setFeedback({ type: 'ok', msg: 'Pengeluaran dibatalkan dan tercatat di audit log.' });
          await onRefresh();
        }}
      />
    </div>
  );
};
