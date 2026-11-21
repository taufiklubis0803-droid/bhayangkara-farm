import { isSupabaseConfigured, supabase, uploadReceiptFile } from '../lib/supabase';
import type {
  AccountingClass,
  AuditLog,
  ChickenStock,
  Customer,
  DebtOrReceivable,
  DebtReceivablePayment,
  Employee,
  ExpenseTransaction,
  FarmActivity,
  FarmBranch,
  FarmPeriod,
  FarmSettings,
  FeedInventory,
  FeedMovement,
  HealthRecord,
  IncomeCategory,
  IncomeTransaction,
  OperatorProfile,
  PaymentMethod,
  PaymentStatus,
  SalaryRecord,
  StockMovement,
  Supplier,
  Transaction,
  VaccinationRecord,
  WeightRecord,
} from '../types/database';
import { todayJakarta } from '../utils/format';

export interface PreviewDatabase {
  settings: FarmSettings;
  ownerPinPlainForPreviewOnly: string; // hanya dipakai di memory saat mode perancangan tanpa DB
  branches: FarmBranch[];
  operators: OperatorProfile[];
  periods: FarmPeriod[];
  chickenStocks: ChickenStock[];
  stockMovements: StockMovement[];
  feedInventory: FeedInventory[];
  feedMovements: FeedMovement[];
  transactions: Transaction[];
  incomeTransactions: IncomeTransaction[];
  expenseTransactions: ExpenseTransaction[];
  customers: Customer[];
  suppliers: Supplier[];
  employees: Employee[];
  salaries: SalaryRecord[];
  debts: DebtOrReceivable[];
  receivables: DebtOrReceivable[];
  payments: DebtReceivablePayment[];
  weightRecords: WeightRecord[];
  healthRecords: HealthRecord[];
  vaccinationRecords: VaccinationRecord[];
  farmActivities: FarmActivity[];
  auditLogs: AuditLog[];
}

function makeUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function createInitialPreviewDb(): PreviewDatabase {
  const nowIso = new Date().toISOString();
  const today = todayJakarta();

  const branchSiantarId = makeUuid();
  const branchMedanId = makeUuid();
  const periodSiantarId = makeUuid();
  const periodMedanId = makeUuid();

  const empSiantar1Id = makeUuid();
  const empMedan1Id = makeUuid();
  const empMedan2Id = makeUuid();

  return {
    settings: {
      id: makeUuid(),
      farm_name: 'RIZKA FARM',
      subtitle: 'FARM MANAGEMENT & FINANCIAL SYSTEM',
      initial_chicken_stock: 808,
      min_chicken_stock_alert: 100,
      min_feed_stock_kg_alert: 100,
      timezone: 'Asia/Jakarta',
      currency: 'IDR',
      updated_at: nowIso,
    },
    ownerPinPlainForPreviewOnly: '1234',
    branches: [
      {
        id: branchSiantarId,
        code: 'pematangsiantar',
        name: 'Cabang Pematangsiantar',
        city: 'Pematangsiantar',
        address: 'Pematangsiantar, Sumatera Utara',
        is_active: true,
        created_at: nowIso,
      },
      {
        id: branchMedanId,
        code: 'medan',
        name: 'Cabang Medan',
        city: 'Medan',
        address: 'Medan, Sumatera Utara',
        is_active: true,
        created_at: nowIso,
      },
    ],
    operators: [
      {
        id: makeUuid(),
        branch_id: branchSiantarId,
        employee_id: empSiantar1Id,
        slot_key: 'karyawan_1',
        display_name: 'Leman',
        role_label: 'Karyawan Kandang',
        is_active: true,
      },
      {
        id: makeUuid(),
        branch_id: branchMedanId,
        employee_id: empMedan1Id,
        slot_key: 'karyawan_1',
        display_name: 'Hana',
        role_label: 'Karyawan Kandang',
        is_active: true,
      },
      {
        id: makeUuid(),
        branch_id: branchMedanId,
        employee_id: empMedan2Id,
        slot_key: 'karyawan_2',
        display_name: 'Taufik',
        role_label: 'Karyawan Kandang',
        is_active: true,
      },
      {
        id: makeUuid(),
        branch_id: null,
        employee_id: null,
        slot_key: 'pemilik',
        display_name: 'Rizka',
        role_label: 'Pemilik Usaha',
        is_active: true,
      },
    ],
    periods: [
      {
        id: periodSiantarId,
        branch_id: branchSiantarId,
        name: 'Periode Ternak 1 - Pematangsiantar',
        start_date: today,
        end_date: null,
        status: 'active',
        initial_stock: 808,
        notes: 'Periode awal Cabang Pematangsiantar dengan stok 808 ekor ayam kampung',
        created_at: nowIso,
      },
      {
        id: periodMedanId,
        branch_id: branchMedanId,
        name: 'Periode Ternak 1 - Medan',
        start_date: today,
        end_date: null,
        status: 'active',
        initial_stock: 0,
        notes: 'Periode awal Cabang Medan RIZKA FARM',
        created_at: nowIso,
      },
    ],
    chickenStocks: [
      {
        id: makeUuid(),
        period_id: periodSiantarId,
        initial_stock: 808,
        total_in: 0,
        total_sold: 0,
        total_dead: 0,
        total_culled: 0,
        current_stock: 808,
        updated_at: nowIso,
      },
      {
        id: makeUuid(),
        period_id: periodMedanId,
        initial_stock: 0,
        total_in: 0,
        total_sold: 0,
        total_dead: 0,
        total_culled: 0,
        current_stock: 0,
        updated_at: nowIso,
      },
    ],
    stockMovements: [
      {
        id: makeUuid(),
        period_id: periodSiantarId,
        movement_date: today,
        movement_type: 'initial',
        quantity: 808,
        stock_before: 0,
        stock_after: 808,
        reason: 'Stok awal ayam kampung Cabang Pematangsiantar',
        operator_name: 'Leman',
        reference_table: null,
        reference_id: null,
        is_reversed: false,
        notes: 'Inisialisasi awal 808 ekor',
        created_at: nowIso,
      },
    ],
    feedInventory: [],
    feedMovements: [],
    transactions: [],
    incomeTransactions: [],
    expenseTransactions: [],
    customers: [],
    suppliers: [],
    employees: [
      {
        id: empSiantar1Id,
        branch_id: branchSiantarId,
        slot_number: 1,
        name: 'Leman',
        position: 'Perawatan & Pakan',
        monthly_salary: 0,
        phone: null,
        is_active: true,
        notes: null,
      },
      {
        id: empMedan1Id,
        branch_id: branchMedanId,
        slot_number: 1,
        name: 'Hana',
        position: 'Perawatan & Pakan',
        monthly_salary: 0,
        phone: null,
        is_active: true,
        notes: null,
      },
      {
        id: empMedan2Id,
        branch_id: branchMedanId,
        slot_number: 2,
        name: 'Taufik',
        position: 'Kandang & Kesehatan',
        monthly_salary: 0,
        phone: null,
        is_active: true,
        notes: null,
      },
    ],
    salaries: [],
    debts: [],
    receivables: [],
    payments: [],
    weightRecords: [],
    healthRecords: [],
    vaccinationRecords: [],
    farmActivities: [],
    auditLogs: [],
  };
}

const PREVIEW_STORAGE_KEY = 'rizka_farm_preview_db_v1';

function loadPreviewDb(): PreviewDatabase {
  const fresh = createInitialPreviewDb();
  if (typeof window === 'undefined') return fresh;
  try {
    const raw = window.localStorage.getItem(PREVIEW_STORAGE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw) as Partial<PreviewDatabase>;
    if (!parsed || !Array.isArray(parsed.branches) || !Array.isArray(parsed.periods)) {
      return fresh;
    }
    return {
      ...fresh,
      ...parsed,
      settings: parsed.settings ?? fresh.settings,
      branches: parsed.branches.length ? parsed.branches : fresh.branches,
      operators: parsed.operators?.length ? parsed.operators : fresh.operators,
      periods: parsed.periods.length ? parsed.periods : fresh.periods,
      chickenStocks: parsed.chickenStocks?.length ? parsed.chickenStocks : fresh.chickenStocks,
      employees: parsed.employees?.length ? parsed.employees : fresh.employees,
    };
  } catch {
    return fresh;
  }
}

function persistPreviewDb(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(previewDb));
  } catch {
    // Abaikan jika storage penuh atau diblokir browser
  }
}

// Store untuk Mode Pratinjau Lokal (tersimpan di localStorage agar tidak hilang saat refresh)
let previewDb: PreviewDatabase = loadPreviewDb();

export function getPreviewDbSnapshot(): PreviewDatabase {
  return previewDb;
}

export function getPendingPreviewCount(): number {
  return (
    previewDb.incomeTransactions.filter((i) => !i.is_deleted).length +
    previewDb.expenseTransactions.filter((e) => !e.is_deleted).length +
    previewDb.weightRecords.length +
    previewDb.healthRecords.length +
    previewDb.vaccinationRecords.length +
    previewDb.farmActivities.length +
    previewDb.customers.length +
    previewDb.suppliers.length +
    previewDb.debts.filter((d) => !d.transaction_id && !d.is_deleted).length +
    previewDb.receivables.filter((r) => !r.transaction_id && !r.is_deleted).length +
    previewDb.salaries.length
  );
}

export function clearPendingPreviewData(): void {
  previewDb = createInitialPreviewDb();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(PREVIEW_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

function useLiveSupabase(isLiveDatabase: boolean): boolean {
  return Boolean(isSupabaseConfigured && supabase && isLiveDatabase);
}

async function assertLiveSupabaseSession(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Klien Supabase belum terkonfigurasi.');
  }
}

function throwPgError(
  error: { code?: string; message: string; details?: string | null; hint?: string | null },
  context: string
): never {
  const msg = error.message || 'Kesalahan database';
  if (error.code === '42501' || msg.toLowerCase().includes('permission denied')) {
    throw new Error(
      `${context}: Izin akses tabel/fungsi ditolak (42501). Jalankan SQL Migration terbaru (termasuk perintah GRANT) di Supabase SQL Editor.`
    );
  }
  if (error.code === '42703') {
    throw new Error(
      `${context}: Kolom database belum sinkron (${msg}). Jalankan ulang SQL Migration terbaru di Supabase SQL Editor.`
    );
  }
  if (error.code === 'PGRST202' || error.code === 'PGRST205') {
    throw new Error(
      `${context}: Fungsi RPC atau tabel belum ditemukan (${msg}). Pastikan SQL Migration sudah dijalankan di Supabase.`
    );
  }
  throw new Error(`${context}: ${msg}${error.details ? ` (${error.details})` : ''}`);
}

async function ensureCustomerIdLive(
  buyerName: string,
  buyerPhone: string | null,
  explicitCustomerId: string | null
): Promise<string | null> {
  if (explicitCustomerId) return explicitCustomerId;
  const cleanName = buyerName.trim();
  if (!cleanName || cleanName.toLowerCase() === 'pembeli umum') return null;
  try {
    const { data: existing } = await supabase!
      .from('customers')
      .select('id, phone')
      .ilike('name', cleanName)
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      if (buyerPhone && !existing.phone) {
        await supabase!.from('customers').update({ phone: buyerPhone }).eq('id', existing.id);
      }
      return existing.id as string;
    }
    const { data: created } = await supabase!
      .from('customers')
      .insert({ name: cleanName, phone: buyerPhone || null })
      .select('id')
      .single();
    return (created?.id as string | undefined) ?? null;
  } catch {
    return null;
  }
}

async function ensureSupplierIdLive(
  supplierName: string | null,
  explicitSupplierId: string | null
): Promise<string | null> {
  if (explicitSupplierId) return explicitSupplierId;
  const cleanName = supplierName?.trim() ?? '';
  if (!cleanName) return null;
  try {
    const { data: existing } = await supabase!
      .from('suppliers')
      .select('id')
      .ilike('name', cleanName)
      .limit(1)
      .maybeSingle();
    if (existing?.id) return existing.id as string;
    const { data: created } = await supabase!
      .from('suppliers')
      .insert({ name: cleanName })
      .select('id')
      .single();
    return (created?.id as string | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function recordIncomeSale(
  hasRealSession: boolean,
  params: {
    periodId: string;
    clientTxKey: string;
    txDate: string;
    category: IncomeCategory;
    customerId: string | null;
    buyerName: string;
    buyerPhone: string | null;
    chickenCount: number;
    weightKg: number;
    sackCount: number;
    unitPrice: number;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    paidAmount: number;
    dueDate: string | null;
    operatorName: string;
    notes: string | null;
    customTitle: string | null;
  }
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const resolvedCustomerId = await ensureCustomerIdLive(
      params.buyerName,
      params.buyerPhone,
      params.customerId
    );
    const { error } = await supabase!.rpc('rpc_record_income_sale', {
      p_period_id: params.periodId,
      p_client_tx_key: params.clientTxKey,
      p_tx_date: params.txDate,
      p_category: params.category,
      p_customer_id: resolvedCustomerId,
      p_buyer_name: params.buyerName,
      p_buyer_phone: params.buyerPhone,
      p_chicken_count: params.chickenCount,
      p_weight_kg: params.weightKg,
      p_sack_count: params.sackCount,
      p_unit_price: params.unitPrice,
      p_total_amount: params.totalAmount,
      p_payment_method: params.paymentMethod,
      p_payment_status: params.paymentStatus,
      p_paid_amount: params.paidAmount,
      p_due_date: params.dueDate,
      p_operator_name: params.operatorName,
      p_notes: params.notes,
      p_custom_title: params.customTitle,
    });
    if (error) throwPgError(error, 'Gagal menyimpan pemasukan ke Supabase');
    return;
  }

  // Mode Perancangan (In-Memory Atomic)
  if (previewDb.transactions.some((t) => t.client_tx_key === params.clientTxKey)) return;
  if (params.totalAmount <= 0) throw new Error('Nominal total harus lebih dari 0.');

  const stock = previewDb.chickenStocks.find((s) => s.period_id === params.periodId);
  if (params.category === 'penjualan_ekor' || params.category === 'penjualan_kg') {
    if (params.category === 'penjualan_kg' && params.weightKg <= 0) {
      throw new Error('Berat timbangan (kg) wajib lebih dari 0.');
    }
    if (params.chickenCount <= 0) throw new Error('Jumlah ekor wajib lebih dari 0.');
    if (!stock || stock.current_stock < params.chickenCount) {
      throw new Error(
        `Stok ayam tidak mencukupi. Tersedia: ${stock?.current_stock ?? 0} ekor.`
      );
    }
  }

  const nowIso = new Date().toISOString();
  const txId = makeUuid();
  const title =
    params.customTitle ||
    (params.category === 'penjualan_ekor'
      ? `Penjualan ${params.chickenCount} ekor ayam (${params.buyerName})`
      : params.category === 'penjualan_kg'
      ? `Penjualan ${params.weightKg} kg / ${params.chickenCount} ekor ayam (${params.buyerName})`
      : params.category === 'penjualan_kotoran'
      ? `Penjualan ${params.sackCount} goni kotoran ayam (${params.buyerName})`
      : 'Pemasukan Lainnya');

  const effectivePaid =
    params.paymentStatus === 'lunas'
      ? params.totalAmount
      : params.paymentStatus === 'belum_dibayar'
      ? 0
      : Math.min(Math.max(params.paidAmount, 0), params.totalAmount);

  previewDb.transactions.unshift({
    id: txId,
    period_id: params.periodId,
    client_tx_key: params.clientTxKey,
    tx_date: params.txDate,
    tx_type: 'income',
    category: params.category,
    sub_category: params.category,
    title,
    amount: params.totalAmount,
    paid_amount: effectivePaid,
    payment_method: params.paymentMethod,
    payment_status: params.paymentStatus,
    accounting_class: 'pendapatan',
    operator_name: params.operatorName,
    reference_name: params.buyerName,
    notes: params.notes,
    attachment_url: null,
    is_deleted: false,
    deleted_at: null,
    deleted_by_operator: null,
    delete_reason: null,
    recorded_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  });

  previewDb.incomeTransactions.unshift({
    id: makeUuid(),
    transaction_id: txId,
    period_id: params.periodId,
    tx_date: params.txDate,
    category: params.category,
    customer_id: params.customerId,
    buyer_name: params.buyerName,
    buyer_phone: params.buyerPhone,
    chicken_count: params.chickenCount,
    weight_kg: params.weightKg,
    sack_count: params.sackCount,
    unit_price: params.unitPrice,
    total_amount: params.totalAmount,
    payment_method: params.paymentMethod,
    payment_status: params.paymentStatus,
    paid_amount: effectivePaid,
    operator_name: params.operatorName,
    notes: params.notes,
    is_deleted: false,
    created_at: nowIso,
  });

  let resolvedPreviewCustomerId = params.customerId;
  const cleanBuyer = params.buyerName.trim();
  if (!resolvedPreviewCustomerId && cleanBuyer && cleanBuyer.toLowerCase() !== 'pembeli umum') {
    const existingCust = previewDb.customers.find(
      (c) => c.name.toLowerCase() === cleanBuyer.toLowerCase()
    );
    if (existingCust) {
      resolvedPreviewCustomerId = existingCust.id;
      if (params.buyerPhone && !existingCust.phone) existingCust.phone = params.buyerPhone;
    } else {
      const newCustId = makeUuid();
      previewDb.customers.push({
        id: newCustId,
        name: cleanBuyer,
        phone: params.buyerPhone,
        address: null,
        notes: null,
        created_at: nowIso,
      });
      resolvedPreviewCustomerId = newCustId;
      const latestInc = previewDb.incomeTransactions[0];
      if (latestInc && latestInc.transaction_id === txId) {
        latestInc.customer_id = newCustId;
      }
    }
  } else if (resolvedPreviewCustomerId && params.buyerPhone) {
    const cust = previewDb.customers.find((c) => c.id === resolvedPreviewCustomerId);
    if (cust && !cust.phone) cust.phone = params.buyerPhone;
  }

  if (stock && (params.category === 'penjualan_ekor' || params.category === 'penjualan_kg')) {
    const before = stock.current_stock;
    stock.total_sold += params.chickenCount;
    stock.current_stock -= params.chickenCount;
    previewDb.stockMovements.unshift({
      id: makeUuid(),
      period_id: params.periodId,
      movement_date: params.txDate,
      movement_type: 'terjual',
      quantity: params.chickenCount,
      stock_before: before,
      stock_after: stock.current_stock,
      reason: title,
      operator_name: params.operatorName,
      reference_table: 'transactions',
      reference_id: txId,
      is_reversed: false,
      notes: params.notes,
      created_at: nowIso,
    });
  }

  const remaining = params.totalAmount - effectivePaid;
  if (remaining > 0) {
    previewDb.receivables.unshift({
      id: makeUuid(),
      period_id: params.periodId,
      transaction_id: txId,
      customer_id: params.customerId,
      party_name: params.buyerName,
      tx_date: params.txDate,
      due_date: params.dueDate,
      total_amount: params.totalAmount,
      paid_amount: effectivePaid,
      remaining_amount: remaining,
      status: params.paymentStatus,
      operator_name: params.operatorName,
      notes: params.notes,
      is_deleted: false,
      created_at: nowIso,
    });
  }

  previewDb.auditLogs.unshift({
    id: makeUuid(),
    period_id: params.periodId,
    table_name: 'transactions',
    record_id: txId,
    action: 'INSERT',
    before_data: null,
    after_data: { tx_type: 'income', category: params.category, amount: params.totalAmount },
    reason: 'Pencatatan pemasukan baru',
    operator_name: params.operatorName,
    created_at: nowIso,
  });
  persistPreviewDb();
}

export async function updateIncomeTransaction(
  hasRealSession: boolean,
  params: {
    transactionId: string;
    txDate: string;
    buyerName: string;
    buyerPhone: string | null;
    chickenCount: number;
    weightKg: number;
    sackCount: number;
    unitPrice: number;
    totalAmount: number;
    notes: string | null;
    operatorName: string;
    editReason: string;
  }
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { error } = await supabase!.rpc('rpc_update_income_transaction', {
      p_transaction_id: params.transactionId,
      p_tx_date: params.txDate,
      p_buyer_name: params.buyerName,
      p_buyer_phone: params.buyerPhone,
      p_chicken_count: params.chickenCount,
      p_weight_kg: params.weightKg,
      p_sack_count: params.sackCount,
      p_unit_price: params.unitPrice,
      p_total_amount: params.totalAmount,
      p_notes: params.notes,
      p_operator_name: params.operatorName,
      p_edit_reason: params.editReason,
    });
    if (error) throwPgError(error, 'Gagal mengubah transaksi pemasukan');
    return;
  }

  const tx = previewDb.transactions.find((t) => t.id === params.transactionId && !t.is_deleted);
  const inc = previewDb.incomeTransactions.find((i) => i.transaction_id === params.transactionId);
  if (!tx || !inc) throw new Error('Transaksi tidak ditemukan.');

  if (inc.category === 'penjualan_ekor' || inc.category === 'penjualan_kg') {
    const delta = params.chickenCount - inc.chicken_count;
    if (delta !== 0) {
      const stock = previewDb.chickenStocks.find((s) => s.period_id === tx.period_id);
      if (!stock) throw new Error('Data stok tidak ditemukan.');
      if (delta > 0 && stock.current_stock < delta) {
        throw new Error('Stok tidak mencukupi untuk penambahan jumlah ekor.');
      }
      const before = stock.current_stock;
      stock.total_sold += delta;
      stock.current_stock -= delta;
      previewDb.stockMovements.unshift({
        id: makeUuid(),
        period_id: tx.period_id,
        movement_date: params.txDate,
        movement_type: delta > 0 ? 'terjual' : 'koreksi_tambah',
        quantity: Math.abs(delta),
        stock_before: before,
        stock_after: stock.current_stock,
        reason: `Penyesuaian edit transaksi: ${params.editReason}`,
        operator_name: params.operatorName,
        reference_table: 'transactions',
        reference_id: tx.id,
        is_reversed: false,
        notes: null,
        created_at: new Date().toISOString(),
      });
    }
  }

  const beforeAmt = tx.amount;
  const beforeCount = inc.chicken_count;
  tx.tx_date = params.txDate;
  tx.amount = params.totalAmount;
  tx.reference_name = params.buyerName;
  tx.notes = params.notes;
  if (inc.category === 'penjualan_kg') {
    tx.title = `Penjualan ${params.weightKg} kg / ${params.chickenCount} ekor ayam (${params.buyerName})`;
  } else if (inc.category === 'penjualan_ekor') {
    tx.title = `Penjualan ${params.chickenCount} ekor ayam (${params.buyerName})`;
  } else if (inc.category === 'penjualan_kotoran') {
    tx.title = `Penjualan ${params.sackCount} goni kotoran ayam (${params.buyerName})`;
  }
  inc.tx_date = params.txDate;
  inc.buyer_name = params.buyerName;
  inc.buyer_phone = params.buyerPhone;
  inc.chicken_count = params.chickenCount;
  inc.weight_kg = params.weightKg;
  inc.sack_count = params.sackCount;
  inc.unit_price = params.unitPrice;
  inc.total_amount = params.totalAmount;
  inc.notes = params.notes;

  previewDb.auditLogs.unshift({
    id: makeUuid(),
    period_id: tx.period_id,
    table_name: 'transactions',
    record_id: tx.id,
    action: 'UPDATE',
    before_data: { amount: beforeAmt, chicken_count: beforeCount },
    after_data: { amount: params.totalAmount, chicken_count: params.chickenCount },
    reason: params.editReason,
    operator_name: params.operatorName,
    created_at: new Date().toISOString(),
  });
  persistPreviewDb();
}

export async function recordExpense(
  hasRealSession: boolean,
  params: {
    periodId: string;
    clientTxKey: string;
    txDate: string;
    category: string;
    accountingClass: AccountingClass;
    supplierId: string | null;
    supplierOrStore: string | null;
    itemName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalAmount: number;
    feedType: string | null;
    feedBrand: string | null;
    sackCount: number;
    totalWeightKg: number;
    packCount: number;
    vaccinePackage: string | null;
    vaccinatedCount: number;
    condition: string | null;
    stockConfirmed: boolean;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    paidAmount: number;
    dueDate: string | null;
    operatorName: string;
    notes: string | null;
    receiptFile: File | null;
  }
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    let attachmentUrl: string | null = null;
    if (params.receiptFile) {
      const up = await uploadReceiptFile(params.receiptFile, params.periodId, params.operatorName);
      attachmentUrl = up.publicUrl;
    }
    const resolvedSupplierId = await ensureSupplierIdLive(
      params.supplierOrStore,
      params.supplierId
    );
    const { error } = await supabase!.rpc('rpc_record_expense', {
      p_period_id: params.periodId,
      p_client_tx_key: params.clientTxKey,
      p_tx_date: params.txDate,
      p_category: params.category,
      p_accounting_class: params.accountingClass,
      p_supplier_id: resolvedSupplierId,
      p_supplier_or_store: params.supplierOrStore,
      p_item_name: params.itemName,
      p_quantity: params.quantity,
      p_unit: params.unit,
      p_unit_price: params.unitPrice,
      p_total_amount: params.totalAmount,
      p_feed_type: params.feedType,
      p_feed_brand: params.feedBrand,
      p_sack_count: params.sackCount,
      p_total_weight_kg: params.totalWeightKg,
      p_pack_count: params.packCount,
      p_vaccine_package: params.vaccinePackage,
      p_vaccinated_count: params.vaccinatedCount,
      p_condition: params.condition,
      p_stock_confirmed: params.stockConfirmed,
      p_payment_method: params.paymentMethod,
      p_payment_status: params.paymentStatus,
      p_paid_amount: params.paidAmount,
      p_due_date: params.dueDate,
      p_operator_name: params.operatorName,
      p_notes: params.notes,
      p_attachment_url: attachmentUrl,
    });
    if (error) throwPgError(error, 'Gagal menyimpan pengeluaran ke Supabase');
    return;
  }

  // Mode Perancangan In-Memory
  if (previewDb.transactions.some((t) => t.client_tx_key === params.clientTxKey)) return;
  const nowIso = new Date().toISOString();
  const txId = makeUuid();
  const effectivePaid =
    params.paymentStatus === 'lunas'
      ? params.totalAmount
      : params.paymentStatus === 'belum_dibayar'
      ? 0
      : Math.min(Math.max(params.paidAmount, 0), params.totalAmount);

  const previewUrl = params.receiptFile ? URL.createObjectURL(params.receiptFile) : null;

  previewDb.transactions.unshift({
    id: txId,
    period_id: params.periodId,
    client_tx_key: params.clientTxKey,
    tx_date: params.txDate,
    tx_type: 'expense',
    category: params.category,
    sub_category: params.category,
    title: params.itemName,
    amount: params.totalAmount,
    paid_amount: effectivePaid,
    payment_method: params.paymentMethod,
    payment_status: params.paymentStatus,
    accounting_class: params.accountingClass,
    operator_name: params.operatorName,
    reference_name: params.supplierOrStore,
    notes: params.notes,
    attachment_url: previewUrl,
    is_deleted: false,
    deleted_at: null,
    deleted_by_operator: null,
    delete_reason: null,
    recorded_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  });

  previewDb.expenseTransactions.unshift({
    id: makeUuid(),
    transaction_id: txId,
    period_id: params.periodId,
    tx_date: params.txDate,
    category: params.category,
    accounting_class: params.accountingClass,
    supplier_id: params.supplierId,
    supplier_or_store: params.supplierOrStore,
    item_name: params.itemName,
    quantity: params.quantity,
    unit: params.unit,
    unit_price: params.unitPrice,
    total_amount: params.totalAmount,
    feed_type: params.feedType,
    feed_brand: params.feedBrand,
    sack_count: params.sackCount,
    total_weight_kg: params.totalWeightKg,
    pack_count: params.packCount,
    vaccine_package: params.vaccinePackage,
    vaccinated_count: params.vaccinatedCount,
    condition: params.condition,
    stock_confirmed: params.stockConfirmed,
    payment_method: params.paymentMethod,
    payment_status: params.paymentStatus,
    paid_amount: effectivePaid,
    operator_name: params.operatorName,
    notes: params.notes,
    attachment_url: previewUrl,
    is_deleted: false,
    created_at: nowIso,
  });

  if (params.category === 'bibit_ayam' && params.stockConfirmed) {
    const qty = Math.round(params.quantity);
    const stock = previewDb.chickenStocks.find((s) => s.period_id === params.periodId);
    if (stock && qty > 0) {
      const before = stock.current_stock;
      stock.total_in += qty;
      stock.current_stock += qty;
      previewDb.stockMovements.unshift({
        id: makeUuid(),
        period_id: params.periodId,
        movement_date: params.txDate,
        movement_type: 'masuk',
        quantity: qty,
        stock_before: before,
        stock_after: stock.current_stock,
        reason: `Pembelian bibit ayam (${params.supplierOrStore || 'Pemasok'})`,
        operator_name: params.operatorName,
        reference_table: 'transactions',
        reference_id: txId,
        is_reversed: false,
        notes: params.notes,
        created_at: nowIso,
      });
    }
  }

  if (params.category === 'pakan' && params.stockConfirmed) {
    const kg = params.totalWeightKg > 0 ? params.totalWeightKg : params.sackCount * 50;
    if (kg > 0) {
      const fType = params.feedType || 'Pakan Ayam';
      const fBrand = params.feedBrand || 'Umum';
      let inv = previewDb.feedInventory.find(
        (f) => f.period_id === params.periodId && f.feed_type === fType && f.brand === fBrand
      );
      if (!inv) {
        inv = {
          id: makeUuid(),
          period_id: params.periodId,
          feed_type: fType,
          brand: fBrand,
          current_stock_kg: 0,
          unit_price_per_kg: 0,
          total_value: 0,
          updated_at: nowIso,
        };
        previewDb.feedInventory.push(inv);
      }
      inv.current_stock_kg += kg;
      inv.total_value += params.totalAmount;
      inv.unit_price_per_kg = inv.total_value / inv.current_stock_kg;

      previewDb.feedMovements.unshift({
        id: makeUuid(),
        period_id: params.periodId,
        feed_inventory_id: inv.id,
        movement_date: params.txDate,
        movement_type: 'masuk',
        feed_type: fType,
        brand: fBrand,
        sack_count: params.sackCount,
        weight_kg: kg,
        unit_price_per_sack: params.unitPrice,
        total_value: params.totalAmount,
        reason: `Pembelian pakan (${params.supplierOrStore || 'Pemasok'})`,
        operator_name: params.operatorName,
        reference_id: txId,
        is_reversed: false,
        notes: params.notes,
        created_at: nowIso,
      });
    }
  }

  const remaining = params.totalAmount - effectivePaid;
  if (remaining > 0) {
    previewDb.debts.unshift({
      id: makeUuid(),
      period_id: params.periodId,
      transaction_id: txId,
      supplier_id: params.supplierId,
      party_name: params.supplierOrStore || 'Pemasok',
      tx_date: params.txDate,
      due_date: params.dueDate,
      total_amount: params.totalAmount,
      paid_amount: effectivePaid,
      remaining_amount: remaining,
      status: params.paymentStatus,
      operator_name: params.operatorName,
      notes: params.notes,
      is_deleted: false,
      created_at: nowIso,
    });
  }

  const cleanSupplier = params.supplierOrStore?.trim() ?? '';
  if (!params.supplierId && cleanSupplier) {
    const existsSup = previewDb.suppliers.some(
      (s) => s.name.toLowerCase() === cleanSupplier.toLowerCase()
    );
    if (!existsSup) {
      previewDb.suppliers.push({
        id: makeUuid(),
        name: cleanSupplier,
        phone: null,
        address: null,
        product_type: null,
        notes: null,
        created_at: nowIso,
      });
    }
  }

  previewDb.auditLogs.unshift({
    id: makeUuid(),
    period_id: params.periodId,
    table_name: 'transactions',
    record_id: txId,
    action: 'INSERT',
    before_data: null,
    after_data: { tx_type: 'expense', category: params.category, amount: params.totalAmount },
    reason: 'Pencatatan pengeluaran baru',
    operator_name: params.operatorName,
    created_at: nowIso,
  });
  persistPreviewDb();
}

export async function confirmExpenseStock(
  hasRealSession: boolean,
  expenseId: string,
  operatorName: string
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { error } = await supabase!.rpc('rpc_confirm_expense_stock', {
      p_expense_id: expenseId,
      p_operator_name: operatorName,
    });
    if (error) throwPgError(error, 'Gagal konfirmasi stok masuk');
    return;
  }

  const exp = previewDb.expenseTransactions.find((e) => e.id === expenseId && !e.is_deleted);
  if (!exp) throw new Error('Data pembelian tidak ditemukan.');
  if (exp.stock_confirmed) throw new Error('Stok sudah pernah dikonfirmasi.');

  const nowIso = new Date().toISOString();
  if (exp.category === 'bibit_ayam') {
    const qty = Math.round(exp.quantity);
    const stock = previewDb.chickenStocks.find((s) => s.period_id === exp.period_id);
    if (stock && qty > 0) {
      const before = stock.current_stock;
      stock.total_in += qty;
      stock.current_stock += qty;
      previewDb.stockMovements.unshift({
        id: makeUuid(),
        period_id: exp.period_id,
        movement_date: todayJakarta(),
        movement_type: 'masuk',
        quantity: qty,
        stock_before: before,
        stock_after: stock.current_stock,
        reason: `Konfirmasi bibit masuk (${exp.supplier_or_store || 'Pemasok'})`,
        operator_name: operatorName,
        reference_table: 'transactions',
        reference_id: exp.transaction_id,
        is_reversed: false,
        notes: null,
        created_at: nowIso,
      });
    }
  } else if (exp.category === 'pakan') {
    const kg = exp.total_weight_kg > 0 ? exp.total_weight_kg : exp.sack_count * 50;
    const fType = exp.feed_type || 'Pakan Ayam';
    const fBrand = exp.feed_brand || 'Umum';
    let inv = previewDb.feedInventory.find(
      (f) => f.period_id === exp.period_id && f.feed_type === fType && f.brand === fBrand
    );
    if (!inv) {
      inv = {
        id: makeUuid(),
        period_id: exp.period_id,
        feed_type: fType,
        brand: fBrand,
        current_stock_kg: 0,
        unit_price_per_kg: 0,
        total_value: 0,
        updated_at: nowIso,
      };
      previewDb.feedInventory.push(inv);
    }
    inv.current_stock_kg += kg;
    inv.total_value += exp.total_amount;
    inv.unit_price_per_kg = inv.total_value / inv.current_stock_kg;
  }
  exp.stock_confirmed = true;
  persistPreviewDb();
}

export async function recordChickenLoss(
  hasRealSession: boolean,
  params: {
    periodId: string;
    recordDate: string;
    lossType: 'mati' | 'afkir';
    quantity: number;
    symptoms: string;
    actionTaken: string | null;
    notes: string | null;
    operatorName: string;
  }
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { error } = await supabase!.rpc('rpc_record_chicken_loss', {
      p_period_id: params.periodId,
      p_record_date: params.recordDate,
      p_loss_type: params.lossType,
      p_quantity: params.quantity,
      p_symptoms: params.symptoms,
      p_action_taken: params.actionTaken,
      p_notes: params.notes,
      p_operator_name: params.operatorName,
    });
    if (error) throwPgError(error, 'Gagal mencatat pengurangan stok ayam');
    return;
  }

  const stock = previewDb.chickenStocks.find((s) => s.period_id === params.periodId);
  if (!stock || stock.current_stock < params.quantity) {
    throw new Error(`Stok ayam tersedia (${stock?.current_stock ?? 0} ekor) tidak mencukupi.`);
  }
  const nowIso = new Date().toISOString();
  const before = stock.current_stock;
  if (params.lossType === 'mati') stock.total_dead += params.quantity;
  else stock.total_culled += params.quantity;
  stock.current_stock -= params.quantity;

  const movId = makeUuid();
  previewDb.stockMovements.unshift({
    id: movId,
    period_id: params.periodId,
    movement_date: params.recordDate,
    movement_type: params.lossType,
    quantity: params.quantity,
    stock_before: before,
    stock_after: stock.current_stock,
    reason: params.symptoms,
    operator_name: params.operatorName,
    reference_table: null,
    reference_id: null,
    is_reversed: false,
    notes: params.notes,
    created_at: nowIso,
  });

  previewDb.healthRecords.unshift({
    id: makeUuid(),
    period_id: params.periodId,
    record_date: params.recordDate,
    record_type: params.lossType === 'mati' ? 'kematian' : 'afkir',
    chicken_count: params.quantity,
    symptoms: params.symptoms,
    action_taken: params.actionTaken,
    notes: params.notes,
    operator_name: params.operatorName,
    stock_movement_id: movId,
    created_at: nowIso,
  });
  persistPreviewDb();
}

export async function adjustChickenStock(
  hasRealSession: boolean,
  params: {
    periodId: string;
    adjustmentDate: string;
    adjustmentType: 'koreksi_tambah' | 'koreksi_kurang';
    quantity: number;
    reason: string;
    operatorName: string;
    pin: string;
  }
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { error } = await supabase!.rpc('rpc_adjust_chicken_stock', {
      p_period_id: params.periodId,
      p_adjustment_date: params.adjustmentDate,
      p_adjustment_type: params.adjustmentType,
      p_quantity: params.quantity,
      p_reason: params.reason,
      p_operator_name: params.operatorName,
      p_pin: params.pin,
    });
    if (error) throwPgError(error, 'Gagal koreksi stok ayam');
    return;
  }

  if (params.pin !== previewDb.ownerPinPlainForPreviewOnly) {
    throw new Error('PIN Pemilik tidak valid (PIN awal: 1234).');
  }
  const stock = previewDb.chickenStocks.find((s) => s.period_id === params.periodId);
  if (!stock) throw new Error('Stok tidak ditemukan.');
  const before = stock.current_stock;
  if (params.adjustmentType === 'koreksi_tambah') {
    stock.total_in += params.quantity;
    stock.current_stock += params.quantity;
  } else {
    if (stock.current_stock < params.quantity) throw new Error('Stok tidak cukup.');
    stock.current_stock -= params.quantity;
  }
  const nowIso = new Date().toISOString();
  previewDb.stockMovements.unshift({
    id: makeUuid(),
    period_id: params.periodId,
    movement_date: params.adjustmentDate,
    movement_type: params.adjustmentType,
    quantity: params.quantity,
    stock_before: before,
    stock_after: stock.current_stock,
    reason: params.reason,
    operator_name: params.operatorName,
    reference_table: null,
    reference_id: null,
    is_reversed: false,
    notes: null,
    created_at: nowIso,
  });
  previewDb.auditLogs.unshift({
    id: makeUuid(),
    period_id: params.periodId,
    table_name: 'chicken_stock',
    record_id: stock.id,
    action: 'STOCK_CORRECTION',
    before_data: { current_stock: before },
    after_data: { current_stock: stock.current_stock },
    reason: params.reason,
    operator_name: params.operatorName,
    created_at: nowIso,
  });
  persistPreviewDb();
}

export async function recordFeedUsage(
  hasRealSession: boolean,
  params: {
    periodId: string;
    feedInventoryId: string;
    movementDate: string;
    weightKg: number;
    reason: string;
    notes: string | null;
    operatorName: string;
  }
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { error } = await supabase!.rpc('rpc_record_feed_usage', {
      p_period_id: params.periodId,
      p_feed_inventory_id: params.feedInventoryId,
      p_movement_date: params.movementDate,
      p_weight_kg: params.weightKg,
      p_reason: params.reason,
      p_notes: params.notes,
      p_operator_name: params.operatorName,
    });
    if (error) throwPgError(error, 'Gagal mencatat pemakaian pakan');
    return;
  }

  const feed = previewDb.feedInventory.find((f) => f.id === params.feedInventoryId);
  if (!feed) throw new Error('Stok pakan tidak ditemukan.');
  if (feed.current_stock_kg < params.weightKg) {
    throw new Error(`Stok pakan tidak cukup. Sisa: ${feed.current_stock_kg} kg.`);
  }
  const usedVal = Number((params.weightKg * feed.unit_price_per_kg).toFixed(2));
  feed.current_stock_kg -= params.weightKg;
  feed.total_value = Math.max(0, feed.total_value - usedVal);

  previewDb.feedMovements.unshift({
    id: makeUuid(),
    period_id: params.periodId,
    feed_inventory_id: feed.id,
    movement_date: params.movementDate,
    movement_type: 'pakai',
    feed_type: feed.feed_type,
    brand: feed.brand,
    sack_count: 0,
    weight_kg: params.weightKg,
    unit_price_per_sack: 0,
    total_value: usedVal,
    reason: params.reason,
    operator_name: params.operatorName,
    reference_id: null,
    is_reversed: false,
    notes: params.notes,
    created_at: new Date().toISOString(),
  });
  persistPreviewDb();
}

export async function softDeleteTransaction(
  hasRealSession: boolean,
  params: {
    transactionId: string;
    operatorName: string;
    reason: string;
    pin: string;
  }
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { error } = await supabase!.rpc('rpc_soft_delete_transaction', {
      p_transaction_id: params.transactionId,
      p_operator_name: params.operatorName,
      p_reason: params.reason,
      p_pin: params.pin,
    });
    if (error) throwPgError(error, 'Gagal menghapus transaksi');
    return;
  }

  if (params.pin !== previewDb.ownerPinPlainForPreviewOnly) {
    throw new Error('PIN Pemilik salah (PIN awal: 1234).');
  }
  const tx = previewDb.transactions.find((t) => t.id === params.transactionId && !t.is_deleted);
  if (!tx) throw new Error('Transaksi tidak ditemukan.');

  const nowIso = new Date().toISOString();
  if (tx.tx_type === 'income') {
    const inc = previewDb.incomeTransactions.find((i) => i.transaction_id === tx.id);
    if (inc && (inc.category === 'penjualan_ekor' || inc.category === 'penjualan_kg')) {
      const stock = previewDb.chickenStocks.find((s) => s.period_id === tx.period_id);
      if (stock) {
        const before = stock.current_stock;
        stock.total_sold = Math.max(0, stock.total_sold - inc.chicken_count);
        stock.current_stock += inc.chicken_count;
        previewDb.stockMovements.unshift({
          id: makeUuid(),
          period_id: tx.period_id,
          movement_date: todayJakarta(),
          movement_type: 'koreksi_tambah',
          quantity: inc.chicken_count,
          stock_before: before,
          stock_after: stock.current_stock,
          reason: `Pembatalan penjualan: ${params.reason}`,
          operator_name: params.operatorName,
          reference_table: 'transactions',
          reference_id: tx.id,
          is_reversed: false,
          notes: null,
          created_at: nowIso,
        });
      }
    }
    if (inc) inc.is_deleted = true;
    previewDb.receivables.filter((r) => r.transaction_id === tx.id).forEach((r) => (r.is_deleted = true));
  } else {
    const exp = previewDb.expenseTransactions.find((e) => e.transaction_id === tx.id);
    if (exp) exp.is_deleted = true;
    previewDb.debts.filter((d) => d.transaction_id === tx.id).forEach((d) => (d.is_deleted = true));
  }

  tx.is_deleted = true;
  tx.deleted_at = nowIso;
  tx.deleted_by_operator = params.operatorName;
  tx.delete_reason = params.reason;

  previewDb.auditLogs.unshift({
    id: makeUuid(),
    period_id: tx.period_id,
    table_name: 'transactions',
    record_id: tx.id,
    action: 'SOFT_DELETE',
    before_data: { title: tx.title, amount: tx.amount },
    after_data: null,
    reason: params.reason,
    operator_name: params.operatorName,
    created_at: nowIso,
  });
  persistPreviewDb();
}

export async function insertSimpleRecord(
  hasRealSession: boolean,
  table:
    | 'weight_records'
    | 'health_records'
    | 'vaccination_records'
    | 'farm_activities'
    | 'customers'
    | 'suppliers',
  payload: Record<string, unknown>
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { error } = await supabase!.from(table).insert(payload);
    if (error) throwPgError(error, `Gagal menyimpan data ke tabel ${table}`);
    return;
  }

  const nowIso = new Date().toISOString();
  const row = { id: makeUuid(), created_at: nowIso, ...payload };
  if (table === 'weight_records') previewDb.weightRecords.push(row as unknown as WeightRecord);
  if (table === 'health_records') previewDb.healthRecords.unshift(row as unknown as HealthRecord);
  if (table === 'vaccination_records')
    previewDb.vaccinationRecords.unshift(row as unknown as VaccinationRecord);
  if (table === 'farm_activities') previewDb.farmActivities.unshift(row as unknown as FarmActivity);
  if (table === 'customers') previewDb.customers.push(row as unknown as Customer);
  if (table === 'suppliers') previewDb.suppliers.push(row as unknown as Supplier);
  persistPreviewDb();
}

export async function updateEmployeeProfile(
  hasRealSession: boolean,
  emp: Employee,
  patch: { name: string; position: string; monthly_salary: number; phone: string | null }
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { error } = await supabase!.from('employees').update(patch).eq('id', emp.id);
    if (error) throwPgError(error, 'Gagal memperbarui data karyawan');

    const { data: updatedByEmp, error: opErr1 } = await supabase!
      .from('operator_profiles')
      .update({ display_name: patch.name })
      .eq('employee_id', emp.id)
      .select('id');
    if (opErr1) throwPgError(opErr1, 'Gagal memperbarui operator pencatat');

    if (!updatedByEmp || updatedByEmp.length === 0) {
      const slotKey = `karyawan_${emp.slot_number}`;
      const { error: opErr2 } = await supabase!
        .from('operator_profiles')
        .update({ display_name: patch.name })
        .eq('branch_id', emp.branch_id)
        .eq('slot_key', slotKey);
      if (opErr2) throwPgError(opErr2, 'Gagal menyinkronkan profil operator');
    }
    return;
  }

  const target = previewDb.employees.find((e) => e.id === emp.id);
  if (target) Object.assign(target, patch);
  const op =
    previewDb.operators.find((o) => o.employee_id === emp.id) ??
    previewDb.operators.find(
      (o) => o.branch_id === emp.branch_id && o.slot_key === `karyawan_${emp.slot_number}`
    );
  if (op) op.display_name = patch.name;
  persistPreviewDb();
}

export async function addBranchEmployee(
  hasRealSession: boolean,
  params: {
    branchId: string;
    name: string;
    position: string;
    monthlySalary: number;
    phone: string | null;
  }
): Promise<void> {
  const cleanName = params.name.trim();
  const cleanPos = params.position.trim() || 'Pekerja Kandang';
  if (!cleanName) throw new Error('Nama karyawan wajib diisi.');

  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { data: existing, error: existingErr } = await supabase!
      .from('employees')
      .select('slot_number')
      .eq('branch_id', params.branchId)
      .order('slot_number', { ascending: false })
      .limit(1);
    if (existingErr) throwPgError(existingErr, 'Gagal memeriksa slot karyawan');

    const nextSlot = (existing?.[0]?.slot_number ?? 0) + 1;

    const { data: insertedEmp, error: empErr } = await supabase!
      .from('employees')
      .insert({
        branch_id: params.branchId,
        slot_number: nextSlot,
        name: cleanName,
        position: cleanPos,
        monthly_salary: params.monthlySalary,
        phone: params.phone,
      })
      .select('*')
      .single();
    if (empErr) throwPgError(empErr, 'Gagal menambahkan karyawan ke Supabase');

    const { error: opInsertErr } = await supabase!.from('operator_profiles').insert({
      branch_id: params.branchId,
      employee_id: insertedEmp.id,
      slot_key: `karyawan_${nextSlot}`,
      display_name: cleanName,
      role_label: 'Karyawan Kandang',
    });
    if (opInsertErr) throwPgError(opInsertErr, 'Karyawan tersimpan namun gagal membuat profil operator');
    return;
  }

  const branchEmployees = previewDb.employees.filter((e) => e.branch_id === params.branchId);
  const nextSlot = branchEmployees.reduce((max, e) => Math.max(max, e.slot_number), 0) + 1;
  const newEmpId = makeUuid();
  previewDb.employees.push({
    id: newEmpId,
    branch_id: params.branchId,
    slot_number: nextSlot,
    name: cleanName,
    position: cleanPos,
    monthly_salary: params.monthlySalary,
    phone: params.phone,
    is_active: true,
    notes: null,
  });

  // Sisipkan sebelum Pemilik agar urutan default operator cabang tetap di depan
  const ownerIdx = previewDb.operators.findIndex((o) => o.branch_id === null);
  const newOp: OperatorProfile = {
    id: makeUuid(),
    branch_id: params.branchId,
    employee_id: newEmpId,
    slot_key: `karyawan_${nextSlot}`,
    display_name: cleanName,
    role_label: 'Karyawan Kandang',
    is_active: true,
  };
  if (ownerIdx >= 0) {
    previewDb.operators.splice(ownerIdx, 0, newOp);
  } else {
    previewDb.operators.push(newOp);
  }
  persistPreviewDb();
}

export async function recordSalaryPayment(
  hasRealSession: boolean,
  params: {
    periodId: string;
    employeeId: string;
    salaryMonth: number;
    salaryYear: number;
    baseSalary: number;
    payNow: number;
    paymentDate: string;
    paymentMethod: 'tunai' | 'transfer';
    operatorName: string;
    notes: string | null;
  }
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { error } = await supabase!.rpc('rpc_record_salary_payment', {
      p_period_id: params.periodId,
      p_employee_id: params.employeeId,
      p_salary_month: params.salaryMonth,
      p_salary_year: params.salaryYear,
      p_base_salary: params.baseSalary,
      p_pay_now: params.payNow,
      p_payment_date: params.paymentDate,
      p_payment_method: params.paymentMethod,
      p_operator_name: params.operatorName,
      p_notes: params.notes,
    });
    if (error) throwPgError(error, 'Gagal menyimpan pembayaran gaji');
    return;
  }

  const emp = previewDb.employees.find((e) => e.id === params.employeeId);
  if (!emp) throw new Error('Karyawan tidak ditemukan.');
  const nowIso = new Date().toISOString();

  let sal = previewDb.salaries.find(
    (s) =>
      s.period_id === params.periodId &&
      s.employee_id === params.employeeId &&
      s.salary_month === params.salaryMonth &&
      s.salary_year === params.salaryYear
  );

  const newPaid = Math.min(params.baseSalary, (sal?.paid_amount ?? 0) + params.payNow);
  const status: PaymentStatus =
    newPaid <= 0 ? 'belum_dibayar' : newPaid < params.baseSalary ? 'dibayar_sebagian' : 'lunas';

  let txId: string | null = null;
  if (params.payNow > 0) {
    txId = makeUuid();
    previewDb.transactions.unshift({
      id: txId,
      period_id: params.periodId,
      client_tx_key: null,
      tx_date: params.paymentDate,
      tx_type: 'expense',
      category: 'gaji_karyawan',
      sub_category: 'gaji_karyawan',
      title: `Gaji ${emp.name} (${String(params.salaryMonth).padStart(2, '0')}/${params.salaryYear})`,
      amount: params.payNow,
      paid_amount: params.payNow,
      payment_method: params.paymentMethod,
      payment_status: 'lunas',
      accounting_class: 'tenaga_kerja',
      operator_name: params.operatorName,
      reference_name: emp.name,
      notes: params.notes,
      attachment_url: null,
      is_deleted: false,
      deleted_at: null,
      deleted_by_operator: null,
      delete_reason: null,
      recorded_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    });
  }

  if (sal) {
    sal.base_salary = params.baseSalary;
    sal.paid_amount = newPaid;
    sal.payment_status = status;
    sal.payment_date = params.payNow > 0 ? params.paymentDate : sal.payment_date;
  } else {
    previewDb.salaries.unshift({
      id: makeUuid(),
      period_id: params.periodId,
      employee_id: params.employeeId,
      transaction_id: txId,
      salary_month: params.salaryMonth,
      salary_year: params.salaryYear,
      base_salary: params.baseSalary,
      paid_amount: newPaid,
      payment_date: params.payNow > 0 ? params.paymentDate : null,
      payment_status: status,
      payment_method: params.paymentMethod,
      operator_name: params.operatorName,
      notes: params.notes,
      is_deleted: false,
    });
  }
  persistPreviewDb();
}

export async function createManualDebtOrReceivable(
  hasRealSession: boolean,
  table: 'debts' | 'receivables',
  payload: {
    period_id: string;
    party_name: string;
    tx_date: string;
    due_date: string | null;
    total_amount: number;
    operator_name: string;
    notes: string | null;
  }
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { error } = await supabase!.from(table).insert({
      ...payload,
      paid_amount: 0,
      remaining_amount: payload.total_amount,
      status: 'belum_dibayar',
    });
    if (error) throwPgError(error, `Gagal mencatat data ${table}`);
    return;
  }

  const row: DebtOrReceivable = {
    id: makeUuid(),
    period_id: payload.period_id,
    transaction_id: null,
    party_name: payload.party_name,
    tx_date: payload.tx_date,
    due_date: payload.due_date,
    total_amount: payload.total_amount,
    paid_amount: 0,
    remaining_amount: payload.total_amount,
    status: 'belum_dibayar',
    operator_name: payload.operator_name,
    notes: payload.notes,
    is_deleted: false,
    created_at: new Date().toISOString(),
  };
  if (table === 'debts') previewDb.debts.unshift(row);
  else previewDb.receivables.unshift(row);
  persistPreviewDb();
}

export async function payDebtOrReceivable(
  hasRealSession: boolean,
  params: {
    recordType: 'debt' | 'receivable';
    parentId: string;
    paymentDate: string;
    amount: number;
    paymentMethod: 'tunai' | 'transfer';
    operatorName: string;
    notes: string | null;
  }
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { error } = await supabase!.rpc('rpc_pay_debt_or_receivable', {
      p_record_type: params.recordType,
      p_parent_id: params.parentId,
      p_payment_date: params.paymentDate,
      p_amount: params.amount,
      p_payment_method: params.paymentMethod,
      p_operator_name: params.operatorName,
      p_notes: params.notes,
    });
    if (error) throwPgError(error, 'Gagal memproses pembayaran utang/piutang');
    return;
  }

  const list = params.recordType === 'debt' ? previewDb.debts : previewDb.receivables;
  const rec = list.find((r) => r.id === params.parentId && !r.is_deleted);
  if (!rec) throw new Error('Tagihan tidak ditemukan.');
  if (params.amount > rec.remaining_amount) throw new Error('Nominal melebihi sisa tagihan.');

  rec.paid_amount += params.amount;
  rec.remaining_amount -= params.amount;
  rec.status = rec.remaining_amount <= 0 ? 'lunas' : 'dibayar_sebagian';

  if (rec.transaction_id) {
    const tx = previewDb.transactions.find((t) => t.id === rec.transaction_id);
    if (tx) {
      tx.paid_amount = rec.paid_amount;
      tx.payment_status = rec.status;
    }
  }

  previewDb.payments.unshift({
    id: makeUuid(),
    period_id: rec.period_id,
    record_type: params.recordType,
    parent_id: rec.id,
    transaction_id: rec.transaction_id,
    payment_date: params.paymentDate,
    amount: params.amount,
    payment_method: params.paymentMethod,
    operator_name: params.operatorName,
    notes: params.notes,
    created_at: new Date().toISOString(),
  });
  persistPreviewDb();
}

export async function saveFarmSettingsAndOperators(
  hasRealSession: boolean,
  params: {
    settingsId: string;
    minChickenAlert: number;
    minFeedAlert: number;
    operatorUpdates: Array<{ id: string; display_name: string; employee_id?: string | null }>;
  }
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { error } = await supabase!
      .from('farm_settings')
      .update({
        min_chicken_stock_alert: params.minChickenAlert,
        min_feed_stock_kg_alert: params.minFeedAlert,
      })
      .eq('id', params.settingsId);
    if (error) throwPgError(error, 'Gagal menyimpan pengaturan');

    for (const op of params.operatorUpdates) {
      const { error: opErr } = await supabase!
        .from('operator_profiles')
        .update({ display_name: op.display_name })
        .eq('id', op.id);
      if (opErr) throwPgError(opErr, 'Gagal memperbarui nama operator');
      if (op.employee_id) {
        const { error: empErr } = await supabase!
          .from('employees')
          .update({ name: op.display_name })
          .eq('id', op.employee_id);
        if (empErr) throwPgError(empErr, 'Gagal menyinkronkan nama karyawan');
      }
    }
    return;
  }

  previewDb.settings.min_chicken_stock_alert = params.minChickenAlert;
  previewDb.settings.min_feed_stock_kg_alert = params.minFeedAlert;
  for (const upd of params.operatorUpdates) {
    const op = previewDb.operators.find((o) => o.id === upd.id);
    if (op) {
      op.display_name = upd.display_name;
      if (op.employee_id) {
        const emp = previewDb.employees.find((e) => e.id === op.employee_id);
        if (emp) emp.name = upd.display_name;
      }
    }
  }
  persistPreviewDb();
}

export async function setOwnerPin(
  hasRealSession: boolean,
  oldPin: string,
  newPin: string
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { error } = await supabase!.rpc('rpc_set_owner_pin', {
      p_old_pin: oldPin,
      p_new_pin: newPin,
    });
    if (error) throwPgError(error, 'Gagal mengubah PIN Pemilik');
    return;
  }
  if (oldPin !== previewDb.ownerPinPlainForPreviewOnly) throw new Error('PIN lama tidak sesuai.');
  if (newPin.length < 4) throw new Error('PIN baru minimal 4 karakter.');
  previewDb.ownerPinPlainForPreviewOnly = newPin;
  persistPreviewDb();
}

export async function closePeriodAndStartNew(
  hasRealSession: boolean,
  params: {
    currentPeriodId: string;
    newPeriodName: string;
    newStartDate: string;
    newInitialStock: number;
    notes: string | null;
    operatorName: string;
    pin: string;
  }
): Promise<void> {
  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { error } = await supabase!.rpc('rpc_close_period_and_start_new', {
      p_current_period_id: params.currentPeriodId,
      p_new_period_name: params.newPeriodName,
      p_new_start_date: params.newStartDate,
      p_new_initial_stock: params.newInitialStock,
      p_notes: params.notes,
      p_operator_name: params.operatorName,
      p_pin: params.pin,
    });
    if (error) throwPgError(error, 'Gagal menutup periode dan memulai periode baru');
    return;
  }

  if (params.pin !== previewDb.ownerPinPlainForPreviewOnly) {
    throw new Error('PIN Pemilik tidak valid (PIN awal: 1234).');
  }
  const cur = previewDb.periods.find((p) => p.id === params.currentPeriodId);
  const branchId = cur?.branch_id ?? previewDb.branches[0]?.id ?? '';
  if (cur) {
    cur.status = 'closed';
    cur.end_date = params.newStartDate;
  }
  const newId = makeUuid();
  const nowIso = new Date().toISOString();
  previewDb.periods.unshift({
    id: newId,
    branch_id: branchId,
    name: params.newPeriodName,
    start_date: params.newStartDate,
    end_date: null,
    status: 'active',
    initial_stock: params.newInitialStock,
    notes: params.notes,
    created_at: nowIso,
  });
  previewDb.chickenStocks.push({
    id: makeUuid(),
    period_id: newId,
    initial_stock: params.newInitialStock,
    total_in: 0,
    total_sold: 0,
    total_dead: 0,
    total_culled: 0,
    current_stock: params.newInitialStock,
    updated_at: nowIso,
  });
  previewDb.stockMovements.unshift({
    id: makeUuid(),
    period_id: newId,
    movement_date: params.newStartDate,
    movement_type: 'initial',
    quantity: params.newInitialStock,
    stock_before: 0,
    stock_after: params.newInitialStock,
    reason: 'Stok awal periode ternak baru',
    operator_name: params.operatorName,
    reference_table: null,
    reference_id: null,
    is_reversed: false,
    notes: params.notes,
    created_at: nowIso,
  });
  persistPreviewDb();
}

export async function verifyAndRestoreBackup(
  hasRealSession: boolean,
  params: {
    periodId: string;
    fileName: string;
    jsonText: string;
    operatorName: string;
    pin: string;
  }
): Promise<void> {
  const parsed = JSON.parse(params.jsonText) as {
    data: { customers?: Customer[]; suppliers?: Supplier[] };
  };

  if (useLiveSupabase(hasRealSession)) {
    await assertLiveSupabaseSession();
    const { data: pinValid, error: pinErr } = await supabase!.rpc('rpc_verify_owner_pin', {
      p_pin: params.pin,
    });
    if (pinErr || !pinValid) throw new Error('PIN Pemilik tidak sesuai.');
    if (parsed.data.customers?.length) {
      const { error: custErr } = await supabase!
        .from('customers')
        .upsert(parsed.data.customers, { onConflict: 'id' });
      if (custErr) throwPgError(custErr, 'Gagal memulihkan data pembeli');
    }
    if (parsed.data.suppliers?.length) {
      const { error: supErr } = await supabase!
        .from('suppliers')
        .upsert(parsed.data.suppliers, { onConflict: 'id' });
      if (supErr) throwPgError(supErr, 'Gagal memulihkan data pemasok');
    }
    const { error: logErr } = await supabase!.from('audit_logs').insert({
      period_id: params.periodId,
      table_name: 'backup_restore',
      action: 'BACKUP_RESTORE',
      reason: `Restore terverifikasi dari ${params.fileName}`,
      operator_name: params.operatorName,
    });
    if (logErr) throwPgError(logErr, 'Gagal mencatat log pemulihan');
    return;
  }

  if (params.pin !== previewDb.ownerPinPlainForPreviewOnly) {
    throw new Error('PIN Pemilik tidak sesuai (PIN awal: 1234).');
  }
  if (parsed.data.customers) previewDb.customers = parsed.data.customers;
  if (parsed.data.suppliers) previewDb.suppliers = parsed.data.suppliers;
  persistPreviewDb();
}

export async function syncPreviewDataToSupabase(fallbackPeriodId: string): Promise<number> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Klien Supabase belum terkonfigurasi.');
  }

  const [{ data: liveBranches }, { data: livePeriods }] = await Promise.all([
    supabase.from('farm_branches').select('*'),
    supabase.from('farm_periods').select('*').eq('status', 'active'),
  ]);

  const resolvePeriodId = (previewPeriodId: string): string => {
    const previewPeriod = previewDb.periods.find((p) => p.id === previewPeriodId);
    const previewBranch = previewPeriod
      ? previewDb.branches.find((b) => b.id === previewPeriod.branch_id)
      : null;
    if (previewBranch && liveBranches && livePeriods) {
      const liveBranch = (liveBranches as FarmBranch[]).find((b) => b.code === previewBranch.code);
      if (liveBranch) {
        const livePeriod = (livePeriods as FarmPeriod[]).find((p) => p.branch_id === liveBranch.id);
        if (livePeriod) return livePeriod.id;
      }
    }
    return fallbackPeriodId;
  };

  let synced = 0;

  for (const c of previewDb.customers) {
    await ensureCustomerIdLive(c.name, c.phone, null);
    synced += 1;
  }

  for (const s of previewDb.suppliers) {
    await ensureSupplierIdLive(s.name, null);
    synced += 1;
  }

  for (const inc of [...previewDb.incomeTransactions].reverse()) {
    if (inc.is_deleted) continue;
    const tx = previewDb.transactions.find((t) => t.id === inc.transaction_id);
    const key = tx?.client_tx_key || `sync_inc_${inc.id}`;
    await recordIncomeSale(true, {
      periodId: resolvePeriodId(inc.period_id),
      clientTxKey: key,
      txDate: inc.tx_date,
      category: inc.category,
      customerId: null,
      buyerName: inc.buyer_name,
      buyerPhone: inc.buyer_phone,
      chickenCount: inc.chicken_count,
      weightKg: inc.weight_kg,
      sackCount: inc.sack_count,
      unitPrice: inc.unit_price,
      totalAmount: inc.total_amount,
      paymentMethod: inc.payment_method,
      paymentStatus: inc.payment_status,
      paidAmount: inc.paid_amount,
      dueDate: null,
      operatorName: inc.operator_name,
      notes: inc.notes,
      customTitle: inc.category === 'lainnya' ? tx?.title ?? null : null,
    });
    synced += 1;
  }

  for (const exp of [...previewDb.expenseTransactions].reverse()) {
    if (exp.is_deleted) continue;
    const tx = previewDb.transactions.find((t) => t.id === exp.transaction_id);
    const key = tx?.client_tx_key || `sync_exp_${exp.id}`;
    await recordExpense(true, {
      periodId: resolvePeriodId(exp.period_id),
      clientTxKey: key,
      txDate: exp.tx_date,
      category: exp.category,
      accountingClass: exp.accounting_class,
      supplierId: null,
      supplierOrStore: exp.supplier_or_store,
      itemName: exp.item_name,
      quantity: exp.quantity,
      unit: exp.unit,
      unitPrice: exp.unit_price,
      totalAmount: exp.total_amount,
      feedType: exp.feed_type,
      feedBrand: exp.feed_brand,
      sackCount: exp.sack_count,
      totalWeightKg: exp.total_weight_kg,
      packCount: exp.pack_count,
      vaccinePackage: exp.vaccine_package,
      vaccinatedCount: exp.vaccinated_count,
      condition: exp.condition,
      stockConfirmed: exp.stock_confirmed,
      paymentMethod: exp.payment_method,
      paymentStatus: exp.payment_status,
      paidAmount: exp.paid_amount,
      dueDate: null,
      operatorName: exp.operator_name,
      notes: exp.notes,
      receiptFile: null,
    });
    synced += 1;
  }

  for (const w of previewDb.weightRecords) {
    await insertSimpleRecord(true, 'weight_records', {
      period_id: resolvePeriodId(w.period_id),
      weigh_date: w.weigh_date,
      sample_count: w.sample_count,
      total_weight_kg: w.total_weight_kg,
      average_weight_kg: w.average_weight_kg,
      condition_notes: w.condition_notes,
      operator_name: w.operator_name,
    });
    synced += 1;
  }

  for (const h of previewDb.healthRecords) {
    await insertSimpleRecord(true, 'health_records', {
      period_id: resolvePeriodId(h.period_id),
      record_date: h.record_date,
      record_type: h.record_type,
      chicken_count: h.chicken_count,
      symptoms: h.symptoms,
      action_taken: h.action_taken,
      notes: h.notes,
      operator_name: h.operator_name,
    });
    synced += 1;
  }

  for (const v of previewDb.vaccinationRecords) {
    await insertSimpleRecord(true, 'vaccination_records', {
      period_id: resolvePeriodId(v.period_id),
      record_date: v.record_date,
      category: v.category,
      item_name: v.item_name,
      chicken_count: v.chicken_count,
      dosage: v.dosage,
      next_schedule_date: v.next_schedule_date,
      notes: v.notes,
      operator_name: v.operator_name,
    });
    synced += 1;
  }

  for (const a of previewDb.farmActivities) {
    await insertSimpleRecord(true, 'farm_activities', {
      period_id: resolvePeriodId(a.period_id),
      activity_date: a.activity_date,
      activity_type: a.activity_type,
      title: a.title,
      description: a.description,
      operator_name: a.operator_name,
    });
    synced += 1;
  }

  for (const d of previewDb.debts) {
    if (d.transaction_id || d.is_deleted) continue;
    await createManualDebtOrReceivable(true, 'debts', {
      period_id: resolvePeriodId(d.period_id),
      party_name: d.party_name,
      tx_date: d.tx_date,
      due_date: d.due_date,
      total_amount: d.total_amount,
      operator_name: d.operator_name,
      notes: d.notes,
    });
    synced += 1;
  }

  for (const r of previewDb.receivables) {
    if (r.transaction_id || r.is_deleted) continue;
    await createManualDebtOrReceivable(true, 'receivables', {
      period_id: resolvePeriodId(r.period_id),
      party_name: r.party_name,
      tx_date: r.tx_date,
      due_date: r.due_date,
      total_amount: r.total_amount,
      operator_name: r.operator_name,
      notes: r.notes,
    });
    synced += 1;
  }

  clearPendingPreviewData();
  return synced;
}
