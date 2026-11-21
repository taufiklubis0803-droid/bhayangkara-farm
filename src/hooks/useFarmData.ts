import { useCallback, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getPreviewDbSnapshot } from '../services/farmService';
import type {
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
  IncomeTransaction,
  OperatorProfile,
  SalaryRecord,
  StockMovement,
  Supplier,
  Transaction,
  VaccinationRecord,
  WeightRecord,
} from '../types/database';

export interface FarmDataState {
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  isLiveSupabase: boolean;
  settings: FarmSettings | null;
  branches: FarmBranch[];
  selectedBranchId: string | null;
  selectedBranch: FarmBranch | null;
  operators: OperatorProfile[];
  periods: FarmPeriod[];
  activePeriod: FarmPeriod | null;
  selectedPeriodId: string | null;
  chickenStock: ChickenStock | null;
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

function sortBranchOperators(ops: OperatorProfile[], branchId: string | null): OperatorProfile[] {
  return ops
    .filter((o) => o.branch_id === branchId || o.branch_id === null)
    .sort((a, b) => {
      // Operator khusus cabang (karyawan) tampil sebelum Pemilik lintas cabang agar default cabang = Leman / Hana
      const aOwner = a.branch_id === null ? 1 : 0;
      const bOwner = b.branch_id === null ? 1 : 0;
      if (aOwner !== bOwner) return aOwner - bOwner;
      return a.slot_key.localeCompare(b.slot_key);
    });
}

function parseSupabaseError(
  err: unknown,
  context?: string
): { code: string | null; message: string } {
  if (!err) {
    return { code: null, message: 'Gagal memuat data dari Supabase.' };
  }
  if (err instanceof Error) {
    return { code: null, message: context ? `${context}: ${err.message}` : err.message };
  }
  if (typeof err === 'object') {
    const rec = err as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown };
    const code = typeof rec.code === 'string' ? rec.code : null;
    const rawMsg = typeof rec.message === 'string' ? rec.message : 'Gagal mengakses database Supabase.';
    if (code === '42501' || rawMsg.toLowerCase().includes('permission denied')) {
      return {
        code: code ?? '42501',
        message:
          `Hak akses tabel PostgreSQL ditolak (${rawMsg}). Jalankan SQL perbaikan GRANT hak akses untuk role "anon, authenticated" atau jalankan ulang Skrip SQL Migration terbaru di Supabase SQL Editor.`,
      };
    }
    if (code === 'PGRST202' || code === 'PGRST205') {
      return {
        code,
        message:
          `Struktur tabel/fungsi RPC di Supabase belum lengkap (${rawMsg}). Silakan jalankan seluruh Skrip SQL Migration di Supabase Dashboard → SQL Editor.`,
      };
    }
    const detailText = typeof rec.details === 'string' && rec.details ? ` (${rec.details})` : '';
    return {
      code,
      message: context ? `${context}: ${rawMsg}${detailText}` : `${rawMsg}${detailText}`,
    };
  }
  return { code: null, message: String(err) };
}

export function useFarmData(useLiveDatabase: boolean, autoEnterDesignMode: boolean) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const selectedBranchIdRef = useRef<string | null>(null);
  const selectedPeriodIdRef = useRef<string | null>(null);
  const fetchSeqRef = useRef(0);

  const [state, setState] = useState<FarmDataState>({
    loading: true,
    error: null,
    errorCode: null,
    isLiveSupabase: false,
    settings: null,
    branches: [],
    selectedBranchId: null,
    selectedBranch: null,
    operators: [],
    periods: [],
    activePeriod: null,
    selectedPeriodId: null,
    chickenStock: null,
    stockMovements: [],
    feedInventory: [],
    feedMovements: [],
    transactions: [],
    incomeTransactions: [],
    expenseTransactions: [],
    customers: [],
    suppliers: [],
    employees: [],
    salaries: [],
    debts: [],
    receivables: [],
    payments: [],
    weightRecords: [],
    healthRecords: [],
    vaccinationRecords: [],
    farmActivities: [],
    auditLogs: [],
  });

  const refreshData = useCallback(
    async (overridePeriodId?: string | null, overrideBranchId?: string | null) => {
      const requestSeq = ++fetchSeqRef.current;
      const liveReady = Boolean(isSupabaseConfigured && supabase && useLiveDatabase);

      if (!liveReady) {
        if (!autoEnterDesignMode) {
          if (requestSeq !== fetchSeqRef.current) return;
          setState((prev) => ({
            ...prev,
            loading: false,
            error: null,
            errorCode: null,
            isLiveSupabase: false,
          }));
          return;
        }
        const snap = getPreviewDbSnapshot();
        const branches = [...snap.branches];
        const defaultBranch =
          branches.find((b) => b.code === 'pematangsiantar') ?? branches[0] ?? null;
        const candidateBranchId =
          overrideBranchId !== undefined ? overrideBranchId : selectedBranchIdRef.current;
        const selectedBranch =
          branches.find((b) => b.id === candidateBranchId) ?? defaultBranch;
        const targetBranchId = selectedBranch?.id ?? null;

        const branchPeriods = snap.periods.filter((p) => p.branch_id === targetBranchId);
        const activePeriod =
          branchPeriods.find((p) => p.status === 'active') ?? branchPeriods[0] ?? null;
        const candidatePeriodId =
          overridePeriodId !== undefined ? overridePeriodId : selectedPeriodIdRef.current;
        const validPeriod = candidatePeriodId
          ? branchPeriods.find((p) => p.id === candidatePeriodId)
          : null;
        const targetPeriodId = validPeriod?.id ?? activePeriod?.id ?? null;

        selectedBranchIdRef.current = targetBranchId;
        selectedPeriodIdRef.current = targetPeriodId;
        setSelectedBranchId(targetBranchId);
        setSelectedPeriodId(targetPeriodId);

        const branchEmployees = snap.employees
          .filter((e) => e.branch_id === targetBranchId)
          .sort((a, b) => a.slot_number - b.slot_number);
        const branchOperators = sortBranchOperators(snap.operators, targetBranchId);

        if (requestSeq !== fetchSeqRef.current) return;
        setState({
          loading: false,
          error: null,
          errorCode: null,
          isLiveSupabase: false,
          settings: { ...snap.settings },
          branches,
          selectedBranchId: targetBranchId,
          selectedBranch,
          operators: branchOperators,
          periods: branchPeriods,
          activePeriod,
          selectedPeriodId: targetPeriodId,
          chickenStock: snap.chickenStocks.find((s) => s.period_id === targetPeriodId) ?? null,
          stockMovements: snap.stockMovements.filter((m) => m.period_id === targetPeriodId),
          feedInventory: snap.feedInventory.filter((f) => f.period_id === targetPeriodId),
          feedMovements: snap.feedMovements.filter((fm) => fm.period_id === targetPeriodId),
          transactions: snap.transactions.filter((t) => t.period_id === targetPeriodId),
          incomeTransactions: snap.incomeTransactions.filter(
            (i) => i.period_id === targetPeriodId
          ),
          expenseTransactions: snap.expenseTransactions.filter(
            (e) => e.period_id === targetPeriodId
          ),
          customers: [...snap.customers],
          suppliers: [...snap.suppliers],
          employees: branchEmployees,
          salaries: snap.salaries.filter((s) => s.period_id === targetPeriodId),
          debts: snap.debts.filter((d) => d.period_id === targetPeriodId),
          receivables: snap.receivables.filter((r) => r.period_id === targetPeriodId),
          payments: snap.payments.filter((p) => p.period_id === targetPeriodId),
          weightRecords: snap.weightRecords.filter((w) => w.period_id === targetPeriodId),
          healthRecords: snap.healthRecords.filter((h) => h.period_id === targetPeriodId),
          vaccinationRecords: snap.vaccinationRecords.filter(
            (v) => v.period_id === targetPeriodId
          ),
          farmActivities: snap.farmActivities.filter((a) => a.period_id === targetPeriodId),
          auditLogs: snap.auditLogs.filter(
            (log) =>
              log.branch_id === targetBranchId ||
              log.period_id === targetPeriodId ||
              (!log.branch_id && !log.period_id)
          ),
        });
        return;
      }

      try {
        const { error: bootErr } = await supabase!.rpc('rpc_bootstrap_initial_farm');
        if (bootErr) {
          const parsed = parseSupabaseError(bootErr, 'Inisialisasi database (rpc_bootstrap_initial_farm)');
          const errObj = new Error(parsed.message) as Error & { code?: string | null };
          errObj.code = parsed.code ?? bootErr.code ?? 'BOOTSTRAP_ERROR';
          throw errObj;
        }

        const [
          settingsRes,
          branchesRes,
          operatorsRes,
          periodsRes,
          customersRes,
          suppliersRes,
          employeesRes,
        ] = await Promise.all([
          supabase!.from('farm_settings').select('*').limit(1).maybeSingle(),
          supabase!.from('farm_branches').select('*').order('created_at'),
          supabase!.from('operator_profiles').select('*').order('slot_key'),
          supabase!.from('farm_periods').select('*').order('created_at', { ascending: false }),
          supabase!.from('customers').select('*').order('name'),
          supabase!.from('suppliers').select('*').order('name'),
          supabase!.from('employees').select('*').order('slot_number'),
        ]);

        const firstBatchErrors = [
          { label: 'farm_settings', err: settingsRes.error },
          { label: 'farm_branches', err: branchesRes.error },
          { label: 'operator_profiles', err: operatorsRes.error },
          { label: 'farm_periods', err: periodsRes.error },
          { label: 'customers', err: customersRes.error },
          { label: 'suppliers', err: suppliersRes.error },
          { label: 'employees', err: employeesRes.error },
        ].find((item) => item.err);

        if (firstBatchErrors?.err) {
          const parsed = parseSupabaseError(firstBatchErrors.err, `Tabel ${firstBatchErrors.label}`);
          const errObj = new Error(parsed.message) as Error & { code?: string | null };
          errObj.code = parsed.code;
          throw errObj;
        }

        const branches = (branchesRes.data ?? []) as FarmBranch[];
        const defaultBranch =
          branches.find((b) => b.code === 'pematangsiantar') ?? branches[0] ?? null;
        const candidateBranchId =
          overrideBranchId !== undefined ? overrideBranchId : selectedBranchIdRef.current;
        const selectedBranch =
          branches.find((b) => b.id === candidateBranchId) ?? defaultBranch;
        const targetBranchId = selectedBranch?.id ?? null;

        const allPeriods = (periodsRes.data ?? []) as FarmPeriod[];
        const branchPeriods = targetBranchId
          ? allPeriods.filter(
              (p) =>
                p.branch_id === targetBranchId ||
                (!p.branch_id && selectedBranch?.code === 'pematangsiantar')
            )
          : allPeriods;
        const activePeriod =
          branchPeriods.find((p) => p.status === 'active') ?? branchPeriods[0] ?? null;
        const candidatePeriodId =
          overridePeriodId !== undefined ? overridePeriodId : selectedPeriodIdRef.current;
        const validPeriod = candidatePeriodId
          ? branchPeriods.find((p) => p.id === candidatePeriodId)
          : null;
        const targetPeriodId = validPeriod?.id ?? activePeriod?.id ?? null;

        if (requestSeq !== fetchSeqRef.current) return;

        selectedBranchIdRef.current = targetBranchId;
        selectedPeriodIdRef.current = targetPeriodId;
        setSelectedBranchId(targetBranchId);
        setSelectedPeriodId(targetPeriodId);

        if (!targetPeriodId) {
          setState((prev) => ({
            ...prev,
            loading: false,
            isLiveSupabase: true,
            branches,
            selectedBranchId: targetBranchId,
            selectedBranch,
            error: 'Periode ternak tidak ditemukan untuk cabang ini.',
            errorCode: 'NO_PERIOD',
          }));
          return;
        }

        const allOperators = (operatorsRes.data ?? []) as OperatorProfile[];
        const branchOperators = sortBranchOperators(allOperators, targetBranchId);
        const allEmployees = (employeesRes.data ?? []) as Employee[];
        const branchEmployees = (
          targetBranchId ? allEmployees.filter((e) => e.branch_id === targetBranchId) : allEmployees
        ).sort((a, b) => a.slot_number - b.slot_number);

        const [
          stockRes,
          stockMovRes,
          feedInvRes,
          feedMovRes,
          txRes,
          incRes,
          expRes,
          salRes,
          debtsRes,
          recvRes,
          payRes,
          weightRes,
          healthRes,
          vacRes,
          actRes,
          auditRes,
        ] = await Promise.all([
          supabase!.from('chicken_stock').select('*').eq('period_id', targetPeriodId).maybeSingle(),
          supabase!
            .from('stock_movements')
            .select('*')
            .eq('period_id', targetPeriodId)
            .order('movement_date', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase!
            .from('feed_inventory')
            .select('*')
            .eq('period_id', targetPeriodId)
            .order('feed_type'),
          supabase!
            .from('feed_movements')
            .select('*')
            .eq('period_id', targetPeriodId)
            .order('movement_date', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase!
            .from('transactions')
            .select('*')
            .eq('period_id', targetPeriodId)
            .order('tx_date', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase!
            .from('income_transactions')
            .select('*')
            .eq('period_id', targetPeriodId)
            .order('tx_date', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase!
            .from('expense_transactions')
            .select('*')
            .eq('period_id', targetPeriodId)
            .order('tx_date', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase!
            .from('salaries')
            .select('*')
            .eq('period_id', targetPeriodId)
            .order('salary_year', { ascending: false })
            .order('salary_month', { ascending: false }),
          supabase!
            .from('debts')
            .select('*')
            .eq('period_id', targetPeriodId)
            .order('tx_date', { ascending: false }),
          supabase!
            .from('receivables')
            .select('*')
            .eq('period_id', targetPeriodId)
            .order('tx_date', { ascending: false }),
          supabase!
            .from('debt_receivable_payments')
            .select('*')
            .eq('period_id', targetPeriodId)
            .order('payment_date', { ascending: false }),
          supabase!
            .from('weight_records')
            .select('*')
            .eq('period_id', targetPeriodId)
            .order('weigh_date', { ascending: true }),
          supabase!
            .from('health_records')
            .select('*')
            .eq('period_id', targetPeriodId)
            .order('record_date', { ascending: false }),
          supabase!
            .from('vaccination_records')
            .select('*')
            .eq('period_id', targetPeriodId)
            .order('record_date', { ascending: false }),
          supabase!
            .from('farm_activities')
            .select('*')
            .eq('period_id', targetPeriodId)
            .order('activity_date', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase!
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200),
        ]);

        const secondBatchError = [
          { label: 'chicken_stock', err: stockRes.error },
          { label: 'stock_movements', err: stockMovRes.error },
          { label: 'feed_inventory', err: feedInvRes.error },
          { label: 'feed_movements', err: feedMovRes.error },
          { label: 'transactions', err: txRes.error },
          { label: 'income_transactions', err: incRes.error },
          { label: 'expense_transactions', err: expRes.error },
          { label: 'salaries', err: salRes.error },
          { label: 'debts', err: debtsRes.error },
          { label: 'receivables', err: recvRes.error },
          { label: 'debt_receivable_payments', err: payRes.error },
          { label: 'weight_records', err: weightRes.error },
          { label: 'health_records', err: healthRes.error },
          { label: 'vaccination_records', err: vacRes.error },
          { label: 'farm_activities', err: actRes.error },
          { label: 'audit_logs', err: auditRes.error },
        ].find((item) => item.err);

        if (secondBatchError?.err) {
          const parsed = parseSupabaseError(secondBatchError.err, `Tabel ${secondBatchError.label}`);
          const errObj = new Error(parsed.message) as Error & { code?: string | null };
          errObj.code = parsed.code;
          throw errObj;
        }

        const allAudits = (auditRes.data ?? []) as AuditLog[];
        const branchAudits = allAudits.filter(
          (log) =>
            log.branch_id === targetBranchId ||
            log.period_id === targetPeriodId ||
            (!log.branch_id && !log.period_id)
        );

        if (requestSeq !== fetchSeqRef.current) return;

        setState({
          loading: false,
          error: null,
          errorCode: null,
          isLiveSupabase: true,
          settings: (settingsRes.data as FarmSettings | null) ?? null,
          branches,
          selectedBranchId: targetBranchId,
          selectedBranch,
          operators: branchOperators,
          periods: branchPeriods,
          activePeriod,
          selectedPeriodId: targetPeriodId,
          chickenStock: (stockRes.data as ChickenStock | null) ?? null,
          stockMovements: (stockMovRes.data ?? []) as StockMovement[],
          feedInventory: (feedInvRes.data ?? []) as FeedInventory[],
          feedMovements: (feedMovRes.data ?? []) as FeedMovement[],
          transactions: (txRes.data ?? []) as Transaction[],
          incomeTransactions: (incRes.data ?? []) as IncomeTransaction[],
          expenseTransactions: (expRes.data ?? []) as ExpenseTransaction[],
          customers: (customersRes.data ?? []) as Customer[],
          suppliers: (suppliersRes.data ?? []) as Supplier[],
          employees: branchEmployees,
          salaries: (salRes.data ?? []) as SalaryRecord[],
          debts: (debtsRes.data ?? []) as DebtOrReceivable[],
          receivables: (recvRes.data ?? []) as DebtOrReceivable[],
          payments: (payRes.data ?? []) as DebtReceivablePayment[],
          weightRecords: (weightRes.data ?? []) as WeightRecord[],
          healthRecords: (healthRes.data ?? []) as HealthRecord[],
          vaccinationRecords: (vacRes.data ?? []) as VaccinationRecord[],
          farmActivities: (actRes.data ?? []) as FarmActivity[],
          auditLogs: branchAudits,
        });
      } catch (err) {
        if (requestSeq !== fetchSeqRef.current) return;
        const parsed = parseSupabaseError(err);
        const errWithCode = err as { code?: unknown } | null;
        const explicitCode =
          errWithCode && typeof errWithCode === 'object' && typeof errWithCode.code === 'string'
            ? errWithCode.code
            : parsed.code;
        setState((prev) => ({
          ...prev,
          loading: false,
          isLiveSupabase: false,
          error: parsed.message,
          errorCode: explicitCode,
        }));
      }
    },
    [useLiveDatabase, autoEnterDesignMode]
  );

  useEffect(() => {
    void refreshData();

    if (!isSupabaseConfigured || !supabase || !useLiveDatabase) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel('rizka-farm-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          void refreshData();
        }, 300);
      })
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase?.removeChannel(channel);
    };
  }, [useLiveDatabase, refreshData]);

  const selectBranch = useCallback(
    (branchId: string) => {
      selectedBranchIdRef.current = branchId;
      selectedPeriodIdRef.current = null;
      setSelectedBranchId(branchId);
      setSelectedPeriodId(null);
      setState((prev) => ({ ...prev, loading: true, error: null }));
      void refreshData(null, branchId);
    },
    [refreshData]
  );

  const selectPeriod = useCallback(
    (periodId: string) => {
      selectedPeriodIdRef.current = periodId;
      setSelectedPeriodId(periodId);
      setState((prev) => ({ ...prev, loading: true, error: null }));
      void refreshData(periodId);
    },
    [refreshData]
  );

  return {
    ...state,
    selectedBranchId: state.selectedBranchId ?? selectedBranchId,
    selectedPeriodId: state.selectedPeriodId ?? selectedPeriodId,
    refreshData,
    selectBranch,
    selectPeriod,
  };
}
