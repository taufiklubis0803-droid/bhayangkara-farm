export type TxType = 'income' | 'expense';

export type IncomeCategory =
  | 'penjualan_ekor'
  | 'penjualan_kg'
  | 'penjualan_kotoran'
  | 'lainnya';

export type ExpenseCategory =
  | 'bibit_ayam'
  | 'renovasi'
  | 'peralatan'
  | 'pakan'
  | 'vitamin'
  | 'vaksin'
  | 'sekam'
  | 'token_listrik'
  | 'jamu'
  | 'desinfektan'
  | 'gaji_karyawan'
  | 'lainnya'
  | string;

export type PaymentMethod = 'tunai' | 'transfer' | 'kredit';
export type PaymentStatus = 'lunas' | 'dibayar_sebagian' | 'belum_dibayar';

export type AccountingClass =
  | 'pendapatan'
  | 'beban_operasional'
  | 'pembelian_ternak'
  | 'persediaan'
  | 'aset'
  | 'renovasi'
  | 'peralatan'
  | 'tenaga_kerja'
  | 'investasi';

export type DateFilterPreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export type NavMenuKey =
  | 'dashboard'
  | 'pemasukan'
  | 'pengeluaran'
  | 'stok_ayam'
  | 'stok_pakan'
  | 'pertumbuhan'
  | 'kesehatan'
  | 'kalender'
  | 'laporan'
  | 'histori'
  | 'pembeli'
  | 'pemasok'
  | 'karyawan'
  | 'gaji'
  | 'utang_piutang'
  | 'aktivitas'
  | 'pengaturan';

export interface FarmSettings {
  id: string;
  farm_name: string;
  subtitle: string;
  initial_chicken_stock: number;
  min_chicken_stock_alert: number;
  min_feed_stock_kg_alert: number;
  timezone: string;
  currency: string;
  updated_at: string;
}

export interface FarmBranch {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OperatorProfile {
  id: string;
  branch_id: string | null;
  employee_id: string | null;
  slot_key: string;
  display_name: string;
  role_label: string;
  is_active: boolean;
}

export interface FarmPeriod {
  id: string;
  branch_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'closed';
  initial_stock: number;
  notes: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  product_type: string | null;
  notes: string | null;
  created_at: string;
}

export interface Employee {
  id: string;
  branch_id: string;
  slot_number: number;
  name: string;
  position: string;
  monthly_salary: number;
  phone: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface Transaction {
  id: string;
  period_id: string;
  client_tx_key: string | null;
  tx_date: string;
  tx_type: TxType;
  category: string;
  sub_category: string | null;
  title: string;
  amount: number;
  paid_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  accounting_class: AccountingClass;
  operator_name: string;
  reference_name: string | null;
  notes: string | null;
  attachment_url: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by_operator: string | null;
  delete_reason: string | null;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

export interface IncomeTransaction {
  id: string;
  transaction_id: string;
  period_id: string;
  tx_date: string;
  category: IncomeCategory;
  customer_id: string | null;
  buyer_name: string;
  buyer_phone: string | null;
  chicken_count: number;
  weight_kg: number;
  sack_count: number;
  unit_price: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  paid_amount: number;
  operator_name: string;
  notes: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface ExpenseTransaction {
  id: string;
  transaction_id: string;
  period_id: string;
  tx_date: string;
  category: ExpenseCategory;
  accounting_class: AccountingClass;
  supplier_id: string | null;
  supplier_or_store: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  feed_type: string | null;
  feed_brand: string | null;
  sack_count: number;
  total_weight_kg: number;
  pack_count: number;
  vaccine_package: string | null;
  vaccinated_count: number;
  condition: string | null;
  stock_confirmed: boolean;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  paid_amount: number;
  operator_name: string;
  notes: string | null;
  attachment_url: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface ChickenStock {
  id: string;
  period_id: string;
  initial_stock: number;
  total_in: number;
  total_sold: number;
  total_dead: number;
  total_culled: number;
  current_stock: number;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  period_id: string;
  movement_date: string;
  movement_type:
    | 'initial'
    | 'masuk'
    | 'terjual'
    | 'mati'
    | 'afkir'
    | 'koreksi_tambah'
    | 'koreksi_kurang';
  quantity: number;
  stock_before: number;
  stock_after: number;
  reason: string;
  operator_name: string;
  reference_table: string | null;
  reference_id: string | null;
  is_reversed: boolean;
  notes: string | null;
  created_at: string;
}

export interface FeedInventory {
  id: string;
  period_id: string;
  feed_type: string;
  brand: string;
  current_stock_kg: number;
  unit_price_per_kg: number;
  total_value: number;
  updated_at: string;
}

export interface FeedMovement {
  id: string;
  period_id: string;
  feed_inventory_id: string;
  movement_date: string;
  movement_type: 'masuk' | 'pakai' | 'koreksi_tambah' | 'koreksi_kurang';
  feed_type: string;
  brand: string;
  sack_count: number;
  weight_kg: number;
  unit_price_per_sack: number;
  total_value: number;
  reason: string;
  operator_name: string;
  reference_id: string | null;
  is_reversed: boolean;
  notes: string | null;
  created_at: string;
}

export interface SalaryRecord {
  id: string;
  period_id: string;
  employee_id: string;
  transaction_id: string | null;
  salary_month: number;
  salary_year: number;
  base_salary: number;
  paid_amount: number;
  payment_date: string | null;
  payment_status: PaymentStatus;
  payment_method: 'tunai' | 'transfer';
  operator_name: string;
  notes: string | null;
  is_deleted: boolean;
}

export interface DebtOrReceivable {
  id: string;
  period_id: string;
  transaction_id: string | null;
  supplier_id?: string | null;
  customer_id?: string | null;
  party_name: string;
  tx_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: PaymentStatus;
  operator_name: string;
  notes: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface DebtReceivablePayment {
  id: string;
  period_id: string;
  record_type: 'debt' | 'receivable';
  parent_id: string;
  transaction_id: string | null;
  payment_date: string;
  amount: number;
  payment_method: 'tunai' | 'transfer';
  operator_name: string;
  notes: string | null;
  created_at: string;
}

export interface WeightRecord {
  id: string;
  period_id: string;
  weigh_date: string;
  sample_count: number;
  total_weight_kg: number;
  average_weight_kg: number;
  condition_notes: string | null;
  operator_name: string;
  created_at: string;
}

export interface HealthRecord {
  id: string;
  period_id: string;
  record_date: string;
  record_type: 'sakit' | 'kematian' | 'afkir' | 'pemulihan';
  chicken_count: number;
  symptoms: string;
  action_taken: string | null;
  notes: string | null;
  operator_name: string;
  stock_movement_id: string | null;
  created_at: string;
}

export interface VaccinationRecord {
  id: string;
  period_id: string;
  record_date: string;
  category: 'vaksin' | 'vitamin';
  item_name: string;
  chicken_count: number;
  dosage: string | null;
  next_schedule_date: string | null;
  notes: string | null;
  operator_name: string;
  created_at: string;
}

export interface FarmActivity {
  id: string;
  period_id: string;
  activity_date: string;
  activity_type:
    | 'pembersihan_kandang'
    | 'pemberian_pakan'
    | 'pemberian_minum'
    | 'pemberian_jamu'
    | 'desinfeksi'
    | 'lainnya';
  title: string;
  description: string | null;
  operator_name: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  branch_id?: string | null;
  period_id: string | null;
  table_name: string;
  record_id: string | null;
  action: string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  reason: string | null;
  operator_name: string;
  created_at: string;
}
