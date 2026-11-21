import type {
  DebtOrReceivable,
  DebtReceivablePayment,
  ExpenseTransaction,
  FeedInventory,
  FeedMovement,
  IncomeTransaction,
  Transaction,
} from '../types/database';
import { BULAN_INDONESIA, EXPENSE_CATEGORY_LABELS } from './format';

export interface FinancialSummary {
  // Laba Rugi (Accrual / Periode Berjalan)
  totalRevenue: number;
  salesChickenRevenue: number;
  salesManureRevenue: number;
  otherIncomeRevenue: number;
  feedConsumedCost: number;
  bibitCost: number;
  operationalCost: number;
  salaryPaidCost: number;
  renovationExpenseCost: number;
  equipmentExpenseCost: number;
  totalOperatingExpense: number;
  netProfit: number;

  // Arus Kas (Cash Flow Aktual - Tanpa Ganda)
  cashInSalesInitial: number;
  cashInReceivablePayments: number;
  totalCashIn: number;
  cashOutDirectExpenses: number;
  cashOutDebtPayments: number;
  cashOutAssetInvestment: number;
  cashOutInventoryPurchase: number;
  totalCashOut: number;
  netCashFlow: number;

  // Posisi Persediaan & Aset
  feedInventoryPurchaseInRange: number;
  assetAndInvestmentInRange: number;
  currentFeedInventoryValue: number;
  outstandingReceivables: number;
  outstandingDebts: number;

  // Top Expense
  topExpenseCategory: { category: string; label: string; amount: number } | null;
}

export function computeFinancialSummary(params: {
  transactions: Transaction[];
  incomeTransactions: IncomeTransaction[];
  expenseTransactions: ExpenseTransaction[];
  feedMovements: FeedMovement[];
  feedInventory: FeedInventory[];
  debts: DebtOrReceivable[];
  receivables: DebtOrReceivable[];
  payments: DebtReceivablePayment[];
  startDate: string;
  endDate: string;
}): FinancialSummary {
  const {
    transactions,
    incomeTransactions,
    expenseTransactions,
    feedMovements,
    feedInventory,
    debts,
    receivables,
    payments,
    startDate,
    endDate,
  } = params;

  const inRange = (d: string) => d >= startDate && d <= endDate;

  const activeTx = transactions.filter((t) => !t.is_deleted);
  const txInRange = activeTx.filter((t) => inRange(t.tx_date));

  const activeInc = incomeTransactions.filter((i) => !i.is_deleted && inRange(i.tx_date));
  const activeExp = expenseTransactions.filter((e) => !e.is_deleted && inRange(e.tx_date));

  // Hitung total pembayaran utang/piutang per transaction_id agar tidak double counting
  const paymentSumByTxId = new Map<string, number>();
  for (const p of payments) {
    if (p.transaction_id) {
      paymentSumByTxId.set(
        p.transaction_id,
        (paymentSumByTxId.get(p.transaction_id) ?? 0) + Number(p.amount)
      );
    }
  }

  // Pendapatan (Laba Rugi)
  let salesChickenRevenue = 0;
  let salesManureRevenue = 0;
  let otherIncomeRevenue = 0;
  for (const inc of activeInc) {
    const amt = Number(inc.total_amount);
    if (inc.category === 'penjualan_ekor' || inc.category === 'penjualan_kg') {
      salesChickenRevenue += amt;
    } else if (inc.category === 'penjualan_kotoran') {
      salesManureRevenue += amt;
    } else {
      otherIncomeRevenue += amt;
    }
  }
  const totalRevenue = salesChickenRevenue + salesManureRevenue + otherIncomeRevenue;

  // Beban Pemakaian Pakan Aktual (dari feed_movements 'pakai')
  const feedConsumedCost = feedMovements
    .filter((fm) => !fm.is_reversed && fm.movement_type === 'pakai' && inRange(fm.movement_date))
    .reduce((sum, fm) => sum + Number(fm.total_value), 0);

  // Klasifikasi Pengeluaran (Laba Rugi vs Persediaan vs Aset/Investasi)
  let bibitCost = 0;
  let operationalCost = 0;
  let salaryPaidCost = 0;
  let renovationExpenseCost = 0;
  let equipmentExpenseCost = 0;
  let feedInventoryPurchaseInRange = 0;
  let assetAndInvestmentInRange = 0;

  const expenseCategoryTotals = new Map<string, number>();

  for (const tx of txInRange.filter((t) => t.tx_type === 'expense')) {
    const amt = Number(tx.amount);
    expenseCategoryTotals.set(tx.category, (expenseCategoryTotals.get(tx.category) ?? 0) + amt);

    if (tx.accounting_class === 'persediaan') {
      feedInventoryPurchaseInRange += amt;
    } else if (tx.accounting_class === 'aset' || tx.accounting_class === 'investasi') {
      assetAndInvestmentInRange += amt;
    } else if (tx.accounting_class === 'pembelian_ternak') {
      bibitCost += amt;
    } else if (tx.accounting_class === 'tenaga_kerja') {
      salaryPaidCost += amt;
    } else if (tx.accounting_class === 'renovasi') {
      renovationExpenseCost += amt;
    } else if (tx.accounting_class === 'peralatan') {
      equipmentExpenseCost += amt;
    } else {
      // beban_operasional (catatan: jika pakan diklasifikasikan beban_operasional langsung tanpa persediaan)
      if (tx.category === 'pakan') {
        feedInventoryPurchaseInRange += amt;
      } else {
        operationalCost += amt;
      }
    }
  }

  // Beban Periode Berjalan untuk Laba Rugi:
  // Menggunakan pemakaian persediaan pakan aktual (feedConsumedCost), bukan stok pakan yang belum terpakai.
  const totalOperatingExpense =
    feedConsumedCost +
    bibitCost +
    operationalCost +
    salaryPaidCost +
    renovationExpenseCost +
    equipmentExpenseCost;

  const netProfit = totalRevenue - totalOperatingExpense;

  // Arus Kas Masuk Aktual
  let cashInSalesInitial = 0;
  for (const tx of txInRange.filter((t) => t.tx_type === 'income')) {
    const laterPayments = paymentSumByTxId.get(tx.id) ?? 0;
    const initialPaid = Math.max(0, Number(tx.paid_amount) - laterPayments);
    cashInSalesInitial += initialPaid;
  }
  const cashInReceivablePayments = payments
    .filter((p) => p.record_type === 'receivable' && inRange(p.payment_date))
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalCashIn = cashInSalesInitial + cashInReceivablePayments;

  // Arus Kas Keluar Aktual
  let cashOutDirectExpenses = 0;
  let cashOutAssetInvestment = 0;
  let cashOutInventoryPurchase = 0;
  for (const tx of txInRange.filter((t) => t.tx_type === 'expense')) {
    const laterPayments = paymentSumByTxId.get(tx.id) ?? 0;
    const initialPaid = Math.max(0, Number(tx.paid_amount) - laterPayments);
    if (tx.accounting_class === 'aset' || tx.accounting_class === 'investasi') {
      cashOutAssetInvestment += initialPaid;
    } else if (tx.accounting_class === 'persediaan' || tx.category === 'pakan') {
      cashOutInventoryPurchase += initialPaid;
    } else {
      cashOutDirectExpenses += initialPaid;
    }
  }
  const cashOutDebtPayments = payments
    .filter((p) => p.record_type === 'debt' && inRange(p.payment_date))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalCashOut =
    cashOutDirectExpenses +
    cashOutAssetInvestment +
    cashOutInventoryPurchase +
    cashOutDebtPayments;
  const netCashFlow = totalCashIn - totalCashOut;

  const currentFeedInventoryValue = feedInventory.reduce(
    (sum, f) => sum + Number(f.total_value),
    0
  );

  const outstandingReceivables = receivables
    .filter((r) => !r.is_deleted && r.status !== 'lunas')
    .reduce((sum, r) => sum + Number(r.remaining_amount), 0);

  const outstandingDebts = debts
    .filter((d) => !d.is_deleted && d.status !== 'lunas')
    .reduce((sum, d) => sum + Number(d.remaining_amount), 0);

  // Kategori pengeluaran terbesar
  let topExpenseCategory: FinancialSummary['topExpenseCategory'] = null;
  for (const [cat, amt] of expenseCategoryTotals.entries()) {
    if (!topExpenseCategory || amt > topExpenseCategory.amount) {
      topExpenseCategory = {
        category: cat,
        label: EXPENSE_CATEGORY_LABELS[cat] ?? cat,
        amount: amt,
      };
    }
  }

  // Prevent unused lint on activeExp
  void activeExp.length;

  return {
    totalRevenue,
    salesChickenRevenue,
    salesManureRevenue,
    otherIncomeRevenue,
    feedConsumedCost,
    bibitCost,
    operationalCost,
    salaryPaidCost,
    renovationExpenseCost,
    equipmentExpenseCost,
    totalOperatingExpense,
    netProfit,
    cashInSalesInitial,
    cashInReceivablePayments,
    totalCashIn,
    cashOutDirectExpenses,
    cashOutDebtPayments,
    cashOutAssetInvestment,
    cashOutInventoryPurchase,
    totalCashOut,
    netCashFlow,
    feedInventoryPurchaseInRange,
    assetAndInvestmentInRange,
    currentFeedInventoryValue,
    outstandingReceivables,
    outstandingDebts,
    topExpenseCategory,
  };
}

export interface MonthlyChartPoint {
  monthKey: string;
  label: string;
  pemasukan: number;
  pengeluaran: number;
  labaBersih: number;
}

export function buildMonthlyFinancialSeries(
  transactions: Transaction[],
  year: number
): MonthlyChartPoint[] {
  const active = transactions.filter((t) => !t.is_deleted && t.tx_date.startsWith(`${year}-`));
  return BULAN_INDONESIA.map((monthName, idx) => {
    const mm = String(idx + 1).padStart(2, '0');
    const prefix = `${year}-${mm}`;
    const monthTx = active.filter((t) => t.tx_date.startsWith(prefix));
    const pemasukan = monthTx
      .filter((t) => t.tx_type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const pengeluaran = monthTx
      .filter((t) => t.tx_type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);
    return {
      monthKey: prefix,
      label: monthName.slice(0, 3),
      pemasukan,
      pengeluaran,
      labaBersih: pemasukan - pengeluaran,
    };
  });
}
