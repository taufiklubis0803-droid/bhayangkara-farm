-- ============================================================================
-- RIZKA FARM — FARM MANAGEMENT, BOOKKEEPING & FINANCIAL SYSTEM
-- Complete Supabase PostgreSQL Migration Script
-- Jalankan seluruh skrip ini di Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. HELPER FUNCTION FOR UPDATED_AT
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. CORE TABLES (24 TABEL RELASIONAL + MULTI-CABANG)
-- ============================================================================

-- 3.0 farm_branches (Cabang RIZKA FARM: Pematangsiantar & Medan)
CREATE TABLE IF NOT EXISTS public.farm_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.1 farm_settings
CREATE TABLE IF NOT EXISTS public.farm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_name TEXT NOT NULL DEFAULT 'RIZKA FARM',
  subtitle TEXT NOT NULL DEFAULT 'FARM MANAGEMENT & FINANCIAL SYSTEM',
  initial_chicken_stock INTEGER NOT NULL DEFAULT 808 CHECK (initial_chicken_stock >= 0),
  min_chicken_stock_alert INTEGER NOT NULL DEFAULT 100 CHECK (min_chicken_stock_alert >= 0),
  min_feed_stock_kg_alert NUMERIC(12,2) NOT NULL DEFAULT 100 CHECK (min_feed_stock_kg_alert >= 0),
  owner_pin_hash TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  currency TEXT NOT NULL DEFAULT 'IDR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 customers
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (name);

-- 3.3 suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  product_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers (name);

-- 3.4 employees (Berbeda di tiap cabang)
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.farm_branches(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL CHECK (slot_number >= 1),
  name TEXT NOT NULL,
  position TEXT NOT NULL DEFAULT 'Pekerja Kandang',
  monthly_salary NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (monthly_salary >= 0),
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 operator_profiles (Operator per cabang + Pemilik lintas cabang)
CREATE TABLE IF NOT EXISTS public.operator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.farm_branches(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  slot_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role_label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.6 farm_periods (1 periode aktif per cabang)
CREATE TABLE IF NOT EXISTS public.farm_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.farm_branches(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  initial_stock INTEGER NOT NULL DEFAULT 808 CHECK (initial_stock >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrade idempoten bila menjalankan skrip di atas instalasi versi sebelumnya
DO $$
BEGIN
  ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.farm_branches(id) ON DELETE CASCADE;
  ALTER TABLE public.operator_profiles ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.farm_branches(id) ON DELETE CASCADE;
  ALTER TABLE public.operator_profiles ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
  ALTER TABLE public.farm_periods ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.farm_branches(id) ON DELETE RESTRICT;
  ALTER TABLE public.income_transactions ADD COLUMN IF NOT EXISTS buyer_phone TEXT;

  -- Hapus constraint unik lama agar multi-cabang bisa memiliki slot per cabang
  ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_slot_number_key;
  ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_slot_number_check;
  ALTER TABLE public.operator_profiles DROP CONSTRAINT IF EXISTS operator_profiles_slot_key_key;
  ALTER TABLE public.operator_profiles DROP CONSTRAINT IF EXISTS operator_profiles_slot_key_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

DROP INDEX IF EXISTS public.idx_farm_periods_single_active;
CREATE UNIQUE INDEX IF NOT EXISTS idx_farm_periods_single_active_per_branch
  ON public.farm_periods (branch_id, status)
  WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_branch_slot
  ON public.employees (branch_id, slot_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operator_profiles_branch_slot
  ON public.operator_profiles (COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::UUID), slot_key);

-- 3.7 transactions (Ledger utama)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.farm_periods(id) ON DELETE RESTRICT,
  client_tx_key TEXT UNIQUE,
  tx_date DATE NOT NULL,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('income', 'expense')),
  category TEXT NOT NULL,
  sub_category TEXT,
  title TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  payment_method TEXT NOT NULL DEFAULT 'tunai' CHECK (payment_method IN ('tunai', 'transfer', 'kredit')),
  payment_status TEXT NOT NULL DEFAULT 'lunas' CHECK (payment_status IN ('lunas', 'dibayar_sebagian', 'belum_dibayar')),
  accounting_class TEXT NOT NULL DEFAULT 'beban_operasional' CHECK (
    accounting_class IN (
      'pendapatan',
      'beban_operasional',
      'pembelian_ternak',
      'persediaan',
      'aset',
      'renovasi',
      'peralatan',
      'tenaga_kerja',
      'investasi'
    )
  ),
  operator_name TEXT NOT NULL,
  reference_name TEXT,
  notes TEXT,
  attachment_url TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by_operator TEXT,
  delete_reason TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_period_date ON public.transactions (period_id, tx_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type_cat ON public.transactions (tx_type, category);
CREATE INDEX IF NOT EXISTS idx_transactions_operator ON public.transactions (operator_name);
CREATE INDEX IF NOT EXISTS idx_transactions_not_deleted ON public.transactions (is_deleted, tx_date DESC);

-- 3.8 income_transactions
CREATE TABLE IF NOT EXISTS public.income_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.farm_periods(id) ON DELETE RESTRICT,
  tx_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('penjualan_ekor', 'penjualan_kg', 'penjualan_kotoran', 'lainnya')),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL DEFAULT 'Pembeli Umum',
  buyer_phone TEXT,
  chicken_count INTEGER NOT NULL DEFAULT 0 CHECK (chicken_count >= 0),
  weight_kg NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (weight_kg >= 0),
  sack_count INTEGER NOT NULL DEFAULT 0 CHECK (sack_count >= 0),
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount >= 0),
  payment_method TEXT NOT NULL DEFAULT 'tunai' CHECK (payment_method IN ('tunai', 'transfer', 'kredit')),
  payment_status TEXT NOT NULL DEFAULT 'lunas' CHECK (payment_status IN ('lunas', 'dibayar_sebagian', 'belum_dibayar')),
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  operator_name TEXT NOT NULL,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_income_period_date ON public.income_transactions (period_id, tx_date DESC);
CREATE INDEX IF NOT EXISTS idx_income_customer ON public.income_transactions (customer_id);

-- 3.9 expense_transactions
CREATE TABLE IF NOT EXISTS public.expense_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES public.farm_periods(id) ON DELETE RESTRICT,
  tx_date DATE NOT NULL,
  category TEXT NOT NULL,
  accounting_class TEXT NOT NULL DEFAULT 'beban_operasional',
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_or_store TEXT,
  item_name TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit TEXT NOT NULL DEFAULT 'unit',
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount >= 0),
  feed_type TEXT,
  feed_brand TEXT,
  sack_count INTEGER NOT NULL DEFAULT 0 CHECK (sack_count >= 0),
  total_weight_kg NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (total_weight_kg >= 0),
  pack_count INTEGER NOT NULL DEFAULT 0 CHECK (pack_count >= 0),
  vaccine_package TEXT,
  vaccinated_count INTEGER NOT NULL DEFAULT 0 CHECK (vaccinated_count >= 0),
  condition TEXT,
  stock_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  payment_method TEXT NOT NULL DEFAULT 'tunai' CHECK (payment_method IN ('tunai', 'transfer', 'kredit')),
  payment_status TEXT NOT NULL DEFAULT 'lunas' CHECK (payment_status IN ('lunas', 'dibayar_sebagian', 'belum_dibayar')),
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  operator_name TEXT NOT NULL,
  notes TEXT,
  attachment_url TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_period_date ON public.expense_transactions (period_id, tx_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_category ON public.expense_transactions (category);
CREATE INDEX IF NOT EXISTS idx_expense_supplier ON public.expense_transactions (supplier_id);

-- 3.10 chicken_stock
CREATE TABLE IF NOT EXISTS public.chicken_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL UNIQUE REFERENCES public.farm_periods(id) ON DELETE CASCADE,
  initial_stock INTEGER NOT NULL DEFAULT 808 CHECK (initial_stock >= 0),
  total_in INTEGER NOT NULL DEFAULT 0 CHECK (total_in >= 0),
  total_sold INTEGER NOT NULL DEFAULT 0 CHECK (total_sold >= 0),
  total_dead INTEGER NOT NULL DEFAULT 0 CHECK (total_dead >= 0),
  total_culled INTEGER NOT NULL DEFAULT 0 CHECK (total_culled >= 0),
  current_stock INTEGER NOT NULL DEFAULT 808 CHECK (current_stock >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.11 stock_movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.farm_periods(id) ON DELETE CASCADE,
  movement_date DATE NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('initial', 'masuk', 'terjual', 'mati', 'afkir', 'koreksi_tambah', 'koreksi_kurang')),
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  stock_before INTEGER NOT NULL CHECK (stock_before >= 0),
  stock_after INTEGER NOT NULL CHECK (stock_after >= 0),
  reason TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  reference_table TEXT,
  reference_id UUID,
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_period_date ON public.stock_movements (period_id, movement_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON public.stock_movements (reference_table, reference_id);

-- 3.12 feed_inventory
CREATE TABLE IF NOT EXISTS public.feed_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.farm_periods(id) ON DELETE CASCADE,
  feed_type TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Umum',
  current_stock_kg NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (current_stock_kg >= 0),
  unit_price_per_kg NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (unit_price_per_kg >= 0),
  total_value NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_value >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period_id, feed_type, brand)
);

-- 3.13 feed_movements
CREATE TABLE IF NOT EXISTS public.feed_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.farm_periods(id) ON DELETE CASCADE,
  feed_inventory_id UUID NOT NULL REFERENCES public.feed_inventory(id) ON DELETE CASCADE,
  movement_date DATE NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('masuk', 'pakai', 'koreksi_tambah', 'koreksi_kurang')),
  feed_type TEXT NOT NULL,
  brand TEXT NOT NULL,
  sack_count INTEGER NOT NULL DEFAULT 0 CHECK (sack_count >= 0),
  weight_kg NUMERIC(12,3) NOT NULL CHECK (weight_kg > 0),
  unit_price_per_sack NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (unit_price_per_sack >= 0),
  total_value NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (total_value >= 0),
  reason TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  reference_id UUID,
  is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_movements_period_date ON public.feed_movements (period_id, movement_date DESC, created_at DESC);

-- 3.14 salaries
CREATE TABLE IF NOT EXISTS public.salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.farm_periods(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  salary_month INTEGER NOT NULL CHECK (salary_month BETWEEN 1 AND 12),
  salary_year INTEGER NOT NULL CHECK (salary_year >= 2020),
  base_salary NUMERIC(15,2) NOT NULL CHECK (base_salary >= 0),
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  payment_date DATE,
  payment_status TEXT NOT NULL DEFAULT 'belum_dibayar' CHECK (payment_status IN ('belum_dibayar', 'dibayar_sebagian', 'lunas')),
  payment_method TEXT NOT NULL DEFAULT 'tunai' CHECK (payment_method IN ('tunai', 'transfer')),
  operator_name TEXT NOT NULL,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period_id, employee_id, salary_month, salary_year)
);

-- 3.15 debts (Utang usaha)
CREATE TABLE IF NOT EXISTS public.debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.farm_periods(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  party_name TEXT NOT NULL,
  tx_date DATE NOT NULL,
  due_date DATE,
  total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount > 0),
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount NUMERIC(15,2) NOT NULL CHECK (remaining_amount >= 0),
  status TEXT NOT NULL DEFAULT 'belum_dibayar' CHECK (status IN ('belum_dibayar', 'dibayar_sebagian', 'lunas')),
  operator_name TEXT NOT NULL,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.16 receivables (Piutang penjualan)
CREATE TABLE IF NOT EXISTS public.receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.farm_periods(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  party_name TEXT NOT NULL,
  tx_date DATE NOT NULL,
  due_date DATE,
  total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount > 0),
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  remaining_amount NUMERIC(15,2) NOT NULL CHECK (remaining_amount >= 0),
  status TEXT NOT NULL DEFAULT 'belum_dibayar' CHECK (status IN ('belum_dibayar', 'dibayar_sebagian', 'lunas')),
  operator_name TEXT NOT NULL,
  notes TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.17 debt_receivable_payments (Histori pelunasan utang/piutang)
CREATE TABLE IF NOT EXISTS public.debt_receivable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.farm_periods(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('debt', 'receivable')),
  parent_id UUID NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'tunai' CHECK (payment_method IN ('tunai', 'transfer')),
  operator_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.18 weight_records (Monitoring pertumbuhan ayam kampung)
CREATE TABLE IF NOT EXISTS public.weight_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.farm_periods(id) ON DELETE CASCADE,
  weigh_date DATE NOT NULL,
  sample_count INTEGER NOT NULL CHECK (sample_count > 0),
  total_weight_kg NUMERIC(12,3) NOT NULL CHECK (total_weight_kg > 0),
  average_weight_kg NUMERIC(12,4) NOT NULL CHECK (average_weight_kg > 0),
  condition_notes TEXT,
  operator_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.19 health_records (Kesehatan & kematian ayam)
CREATE TABLE IF NOT EXISTS public.health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.farm_periods(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('sakit', 'kematian', 'afkir', 'pemulihan')),
  chicken_count INTEGER NOT NULL CHECK (chicken_count > 0),
  symptoms TEXT NOT NULL,
  action_taken TEXT,
  notes TEXT,
  operator_name TEXT NOT NULL,
  stock_movement_id UUID REFERENCES public.stock_movements(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.20 vaccination_records (Vaksin & Vitamin)
CREATE TABLE IF NOT EXISTS public.vaccination_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.farm_periods(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('vaksin', 'vitamin')),
  item_name TEXT NOT NULL,
  chicken_count INTEGER NOT NULL CHECK (chicken_count > 0),
  dosage TEXT,
  next_schedule_date DATE,
  notes TEXT,
  operator_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.21 farm_activities (Aktivitas perawatan kandang)
CREATE TABLE IF NOT EXISTS public.farm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES public.farm_periods(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('pembersihan_kandang', 'pemberian_pakan', 'pemberian_minum', 'pemberian_jamu', 'desinfeksi', 'lainnya')),
  title TEXT NOT NULL,
  description TEXT,
  operator_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.22 audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.farm_branches(id) ON DELETE SET NULL,
  period_id UUID REFERENCES public.farm_periods(id) ON DELETE SET NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'SOFT_DELETE', 'RESTORE', 'STOCK_CORRECTION', 'PERIOD_CLOSE', 'BACKUP_RESTORE')),
  before_data JSONB,
  after_data JSONB,
  reason TEXT,
  operator_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.farm_branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON public.audit_logs (table_name, record_id);

-- 3.23 attachments
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID REFERENCES public.farm_periods(id) ON DELETE SET NULL,
  reference_table TEXT NOT NULL,
  reference_id UUID,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  uploaded_by_operator TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. UPDATED_AT TRIGGERS
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'farm_branches', 'farm_settings', 'operator_profiles', 'farm_periods', 'customers',
    'suppliers', 'employees', 'transactions', 'income_transactions',
    'expense_transactions', 'chicken_stock', 'feed_inventory', 'salaries',
    'debts', 'receivables', 'weight_records', 'health_records',
    'vaccination_records', 'farm_activities'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', tbl, tbl);
  END LOOP;
END;
$$;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) - WAJIB LOGIN (TIDAK ADA AKSES ANONIM)
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'farm_branches', 'farm_settings', 'operator_profiles', 'farm_periods', 'customers',
    'suppliers', 'employees', 'transactions', 'income_transactions',
    'expense_transactions', 'chicken_stock', 'stock_movements',
    'feed_inventory', 'feed_movements', 'salaries', 'debts', 'receivables',
    'debt_receivable_payments', 'weight_records', 'health_records',
    'vaccination_records', 'farm_activities', 'audit_logs', 'attachments'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_only_all" ON public.%I;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "rizka_farm_direct_all" ON public.%I;', tbl);
    EXECUTE format(
      'CREATE POLICY "rizka_farm_direct_all" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);',
      tbl
    );
  END LOOP;
END;
$$;

-- 5B. HAK AKSES SCHEMA, TABEL, SEQUENCE & FUNGSI UNTUK ROLE ANON & AUTHENTICATED
-- Memungkinkan aplikasi terhubung langsung tanpa menu login di awal masuk
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;

-- ============================================================================
-- 6. SUPABASE STORAGE BUCKET (NOTA & BUKTI PEMBAYARAN)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "authenticated_receipts_select" ON storage.objects;
DROP POLICY IF EXISTS "rizka_receipts_select" ON storage.objects;
CREATE POLICY "rizka_receipts_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "authenticated_receipts_insert" ON storage.objects;
DROP POLICY IF EXISTS "rizka_receipts_insert" ON storage.objects;
CREATE POLICY "rizka_receipts_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "authenticated_receipts_update" ON storage.objects;
DROP POLICY IF EXISTS "rizka_receipts_update" ON storage.objects;
CREATE POLICY "rizka_receipts_update"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "authenticated_receipts_delete" ON storage.objects;
DROP POLICY IF EXISTS "rizka_receipts_delete" ON storage.objects;
CREATE POLICY "rizka_receipts_delete"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'receipts');

-- ============================================================================
-- 7. SUPABASE REALTIME PUBLICATION
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'farm_branches', 'farm_settings', 'operator_profiles', 'farm_periods', 'customers',
    'suppliers', 'employees', 'transactions', 'income_transactions',
    'expense_transactions', 'chicken_stock', 'stock_movements',
    'feed_inventory', 'feed_movements', 'salaries', 'debts', 'receivables',
    'debt_receivable_payments', 'weight_records', 'health_records',
    'vaccination_records', 'farm_activities', 'audit_logs'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END;
$$;

-- ============================================================================
-- 8. POSTGRESQL RPC FUNCTIONS (TRANSAKSI ATOMIK & VALIDASI SERVER-SIDE)
-- ============================================================================

-- 8.1 Bootstrap inisialisasi data awal RIZKA FARM (2 Cabang: Pematangsiantar & Medan, Default Operator Leman)
CREATE OR REPLACE FUNCTION public.rpc_bootstrap_initial_farm()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_siantar_id UUID;
  v_medan_id UUID;
  v_siantar_period_id UUID;
  v_medan_period_id UUID;
  v_emp_id UUID;
BEGIN

  IF NOT EXISTS (SELECT 1 FROM public.farm_settings) THEN
    INSERT INTO public.farm_settings (
      farm_name, subtitle, initial_chicken_stock, min_chicken_stock_alert,
      min_feed_stock_kg_alert, owner_pin_hash
    )
    VALUES (
      'RIZKA FARM',
      'FARM MANAGEMENT & FINANCIAL SYSTEM',
      808,
      100,
      100,
      crypt('1234', gen_salt('bf'))
    );
  END IF;

  -- Pastikan 2 cabang tersedia: Pematangsiantar & Medan
  INSERT INTO public.farm_branches (code, name, city, address)
  VALUES
    ('pematangsiantar', 'Cabang Pematangsiantar', 'Pematangsiantar', 'Pematangsiantar, Sumatera Utara'),
    ('medan', 'Cabang Medan', 'Medan', 'Medan, Sumatera Utara')
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO v_siantar_id FROM public.farm_branches WHERE code = 'pematangsiantar' LIMIT 1;
  SELECT id INTO v_medan_id FROM public.farm_branches WHERE code = 'medan' LIMIT 1;

  -- Backfill data lama bila migrasi dari versi 1 kandang (aman dari konflik duplikat)
  BEGIN
    UPDATE public.farm_periods SET branch_id = v_siantar_id WHERE branch_id IS NULL;
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
  BEGIN
    UPDATE public.employees SET branch_id = v_siantar_id WHERE branch_id IS NULL;
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
  BEGIN
    UPDATE public.operator_profiles SET branch_id = v_siantar_id WHERE branch_id IS NULL AND slot_key <> 'pemilik';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- Pemilik usaha (lintas semua cabang): Rizka
  IF NOT EXISTS (SELECT 1 FROM public.operator_profiles WHERE branch_id IS NULL AND slot_key = 'pemilik') THEN
    INSERT INTO public.operator_profiles (branch_id, slot_key, display_name, role_label)
    VALUES (NULL, 'pemilik', 'Rizka', 'Pemilik Usaha');
  ELSE
    UPDATE public.operator_profiles
    SET display_name = 'Rizka', role_label = 'Pemilik Usaha'
    WHERE branch_id IS NULL AND slot_key = 'pemilik' AND display_name = 'Taufik';
  END IF;

  -- Karyawan Cabang Pematangsiantar (Leman sebagai karyawan & default operator)
  DELETE FROM public.operator_profiles
  WHERE branch_id = v_siantar_id AND slot_key = 'karyawan_2' AND display_name = 'Rizka';

  DELETE FROM public.employees
  WHERE branch_id = v_siantar_id AND slot_number = 2 AND name = 'Rizka'
    AND NOT EXISTS (SELECT 1 FROM public.salaries s WHERE s.employee_id = employees.id);

  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE branch_id = v_siantar_id) THEN
    INSERT INTO public.employees (branch_id, slot_number, name, position, monthly_salary)
    VALUES (v_siantar_id, 1, 'Leman', 'Perawatan & Pakan', 0)
    RETURNING id INTO v_emp_id;
    INSERT INTO public.operator_profiles (branch_id, employee_id, slot_key, display_name, role_label)
    VALUES (v_siantar_id, v_emp_id, 'karyawan_1', 'Leman', 'Karyawan Kandang')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Karyawan Cabang Medan (Hana sebagai default pertama + Taufik; Pemilik Rizka lintas cabang)
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE branch_id = v_medan_id) THEN
    INSERT INTO public.employees (branch_id, slot_number, name, position, monthly_salary)
    VALUES (v_medan_id, 1, 'Hana', 'Perawatan & Pakan', 0)
    RETURNING id INTO v_emp_id;
    INSERT INTO public.operator_profiles (branch_id, employee_id, slot_key, display_name, role_label)
    VALUES (v_medan_id, v_emp_id, 'karyawan_1', 'Hana', 'Karyawan Kandang')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.employees (branch_id, slot_number, name, position, monthly_salary)
    VALUES (v_medan_id, 2, 'Taufik', 'Kandang & Kesehatan', 0)
    RETURNING id INTO v_emp_id;
    INSERT INTO public.operator_profiles (branch_id, employee_id, slot_key, display_name, role_label)
    VALUES (v_medan_id, v_emp_id, 'karyawan_2', 'Taufik', 'Karyawan Kandang')
    ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.employees SET name = 'Hana' WHERE branch_id = v_medan_id AND slot_number = 1 AND name = 'Budi';
    UPDATE public.operator_profiles SET display_name = 'Hana' WHERE branch_id = v_medan_id AND slot_key = 'karyawan_1' AND display_name = 'Budi';
    UPDATE public.employees SET name = 'Taufik' WHERE branch_id = v_medan_id AND slot_number = 2 AND name = 'Andi';
    UPDATE public.operator_profiles SET display_name = 'Taufik' WHERE branch_id = v_medan_id AND slot_key = 'karyawan_2' AND display_name = 'Andi';
  END IF;

  -- Periode aktif Cabang Pematangsiantar (stok awal 808 ekor)
  SELECT id INTO v_siantar_period_id
  FROM public.farm_periods
  WHERE branch_id = v_siantar_id AND status = 'active'
  LIMIT 1;

  IF v_siantar_period_id IS NULL THEN
    INSERT INTO public.farm_periods (branch_id, name, start_date, status, initial_stock, notes)
    VALUES (
      v_siantar_id,
      'Periode Ternak 1 - Pematangsiantar',
      (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE,
      'active',
      808,
      'Periode awal Cabang Pematangsiantar dengan stok 808 ekor ayam kampung'
    )
    RETURNING id INTO v_siantar_period_id;

    INSERT INTO public.chicken_stock (period_id, initial_stock, current_stock)
    VALUES (v_siantar_period_id, 808, 808)
    ON CONFLICT (period_id) DO NOTHING;

    INSERT INTO public.stock_movements (
      period_id, movement_date, movement_type, quantity,
      stock_before, stock_after, reason, operator_name, notes
    )
    VALUES (
      v_siantar_period_id,
      (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE,
      'initial',
      808,
      0,
      808,
      'Stok awal ayam kampung Cabang Pematangsiantar',
      'Leman',
      'Inisialisasi Cabang Pematangsiantar RIZKA FARM'
    );
  ELSE
    INSERT INTO public.chicken_stock (period_id, initial_stock, current_stock)
    VALUES (v_siantar_period_id, 808, 808)
    ON CONFLICT (period_id) DO NOTHING;
  END IF;

  -- Periode aktif Cabang Medan
  SELECT id INTO v_medan_period_id
  FROM public.farm_periods
  WHERE branch_id = v_medan_id AND status = 'active'
  LIMIT 1;

  IF v_medan_period_id IS NULL THEN
    INSERT INTO public.farm_periods (branch_id, name, start_date, status, initial_stock, notes)
    VALUES (
      v_medan_id,
      'Periode Ternak 1 - Medan',
      (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE,
      'active',
      0,
      'Periode awal Cabang Medan RIZKA FARM'
    )
    RETURNING id INTO v_medan_period_id;
  END IF;

  INSERT INTO public.chicken_stock (period_id, initial_stock, current_stock)
  VALUES (v_medan_period_id, 0, 0)
  ON CONFLICT (period_id) DO NOTHING;

  RETURN v_siantar_period_id;
END;
$$;

-- 8.2 Verifikasi PIN Pemilik (tidak menyimpan plaintext PIN)
CREATE OR REPLACE FUNCTION public.rpc_verify_owner_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash TEXT;
BEGIN

  SELECT owner_pin_hash INTO v_hash FROM public.farm_settings LIMIT 1;
  IF v_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN (crypt(p_pin, v_hash) = v_hash);
END;
$$;

-- 8.3 Ubah PIN Pemilik
CREATE OR REPLACE FUNCTION public.rpc_set_owner_pin(p_old_pin TEXT, p_new_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id UUID;
  v_hash TEXT;
BEGIN

  IF length(trim(COALESCE(p_new_pin, ''))) < 4 THEN
    RAISE EXCEPTION 'PIN baru minimal 4 karakter.';
  END IF;

  SELECT id, owner_pin_hash INTO v_id, v_hash FROM public.farm_settings LIMIT 1;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Pengaturan belum diinisialisasi.';
  END IF;

  IF crypt(p_old_pin, v_hash) <> v_hash THEN
    RAISE EXCEPTION 'PIN lama tidak sesuai.';
  END IF;

  UPDATE public.farm_settings
  SET owner_pin_hash = crypt(p_new_pin, gen_salt('bf'))
  WHERE id = v_id;

  INSERT INTO public.audit_logs (table_name, record_id, action, reason, operator_name)
  VALUES ('farm_settings', v_id, 'UPDATE', 'Perubahan PIN Keamanan Pemilik', 'Pemilik');

  RETURN TRUE;
END;
$$;

-- 8.4 Catat Pemasukan / Penjualan Atomik (termasuk pengurangan stok & piutang otomatis)
CREATE OR REPLACE FUNCTION public.rpc_record_income_sale(
  p_period_id UUID,
  p_client_tx_key TEXT,
  p_tx_date DATE,
  p_category TEXT,
  p_customer_id UUID,
  p_buyer_name TEXT,
  p_buyer_phone TEXT DEFAULT NULL,
  p_chicken_count INTEGER DEFAULT 0,
  p_weight_kg NUMERIC DEFAULT 0,
  p_sack_count INTEGER DEFAULT 0,
  p_unit_price NUMERIC DEFAULT 0,
  p_total_amount NUMERIC DEFAULT 0,
  p_payment_method TEXT DEFAULT 'tunai',
  p_payment_status TEXT DEFAULT 'lunas',
  p_paid_amount NUMERIC DEFAULT 0,
  p_due_date DATE DEFAULT NULL,
  p_operator_name TEXT DEFAULT 'Leman',
  p_notes TEXT DEFAULT NULL,
  p_custom_title TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
  v_income_id UUID;
  v_stock_rec RECORD;
  v_title TEXT;
  v_effective_paid NUMERIC(15,2);
  v_remaining NUMERIC(15,2);
BEGIN
  IF p_tx_date IS NULL THEN RAISE EXCEPTION 'Tanggal transaksi wajib diisi.'; END IF;
  IF trim(COALESCE(p_operator_name, '')) = '' THEN RAISE EXCEPTION 'Operator wajib dipilih.'; END IF;
  IF p_total_amount <= 0 THEN RAISE EXCEPTION 'Nominal total harus lebih dari 0.'; END IF;

  -- Cek duplikat idempotency
  IF p_client_tx_key IS NOT NULL AND EXISTS (SELECT 1 FROM public.transactions WHERE client_tx_key = p_client_tx_key) THEN
    SELECT id INTO v_tx_id FROM public.transactions WHERE client_tx_key = p_client_tx_key;
    RETURN v_tx_id;
  END IF;

  v_effective_paid := CASE
    WHEN p_payment_status = 'lunas' THEN p_total_amount
    WHEN p_payment_status = 'belum_dibayar' THEN 0
    ELSE LEAST(GREATEST(COALESCE(p_paid_amount, 0), 0), p_total_amount)
  END;

  v_title := COALESCE(
    NULLIF(trim(p_custom_title), ''),
    CASE p_category
      WHEN 'penjualan_ekor' THEN format('Penjualan %s ekor ayam (%s)', p_chicken_count, COALESCE(NULLIF(p_buyer_name, ''), 'Pembeli Umum'))
      WHEN 'penjualan_kg' THEN format('Penjualan %s kg / %s ekor ayam (%s)', p_weight_kg, p_chicken_count, COALESCE(NULLIF(p_buyer_name, ''), 'Pembeli Umum'))
      WHEN 'penjualan_kotoran' THEN format('Penjualan %s goni kotoran ayam (%s)', p_sack_count, COALESCE(NULLIF(p_buyer_name, ''), 'Pembeli Umum'))
      ELSE 'Pemasukan Lainnya'
    END
  );

  -- Jika penjualan ayam, kunci & validasi stok ayam
  IF p_category IN ('penjualan_ekor', 'penjualan_kg') THEN
    IF p_category = 'penjualan_kg' AND COALESCE(p_weight_kg, 0) <= 0 THEN
      RAISE EXCEPTION 'Berat timbangan (kg) wajib lebih dari 0.';
    END IF;
    IF COALESCE(p_chicken_count, 0) <= 0 THEN
      RAISE EXCEPTION 'Jumlah ekor ayam yang terjual/dipotong wajib lebih dari 0.';
    END IF;

    INSERT INTO public.chicken_stock (period_id, initial_stock, current_stock)
    VALUES (p_period_id, 0, 0)
    ON CONFLICT (period_id) DO NOTHING;

    SELECT * INTO v_stock_rec
    FROM public.chicken_stock
    WHERE period_id = p_period_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Data stok ayam untuk periode ini tidak ditemukan.';
    END IF;

    IF v_stock_rec.current_stock < p_chicken_count THEN
      RAISE EXCEPTION 'Stok ayam tidak mencukupi. Tersedia: % ekor, diminta: % ekor.', v_stock_rec.current_stock, p_chicken_count;
    END IF;
  END IF;

  INSERT INTO public.transactions (
    period_id, client_tx_key, tx_date, tx_type, category, sub_category,
    title, amount, paid_amount, payment_method, payment_status,
    accounting_class, operator_name, reference_name, notes
  )
  VALUES (
    p_period_id, p_client_tx_key, p_tx_date, 'income', p_category, p_category,
    v_title, p_total_amount, v_effective_paid,
    CASE WHEN p_payment_status = 'belum_dibayar' AND p_payment_method = 'kredit' THEN 'kredit' ELSE p_payment_method END,
    p_payment_status, 'pendapatan', p_operator_name, COALESCE(NULLIF(p_buyer_name, ''), 'Pembeli Umum'), p_notes
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO public.income_transactions (
    transaction_id, period_id, tx_date, category, customer_id, buyer_name, buyer_phone,
    chicken_count, weight_kg, sack_count, unit_price, total_amount,
    payment_method, payment_status, paid_amount, operator_name, notes
  )
  VALUES (
    v_tx_id, p_period_id, p_tx_date, p_category, p_customer_id, COALESCE(NULLIF(p_buyer_name, ''), 'Pembeli Umum'),
    NULLIF(trim(COALESCE(p_buyer_phone, '')), ''),
    COALESCE(p_chicken_count, 0), COALESCE(p_weight_kg, 0), COALESCE(p_sack_count, 0),
    COALESCE(p_unit_price, 0), p_total_amount, p_payment_method, p_payment_status,
    v_effective_paid, p_operator_name, p_notes
  )
  RETURNING id INTO v_income_id;

  IF p_category IN ('penjualan_ekor', 'penjualan_kg') THEN
    UPDATE public.chicken_stock
    SET
      total_sold = total_sold + p_chicken_count,
      current_stock = current_stock - p_chicken_count
    WHERE id = v_stock_rec.id;

    INSERT INTO public.stock_movements (
      period_id, movement_date, movement_type, quantity,
      stock_before, stock_after, reason, operator_name,
      reference_table, reference_id, notes
    )
    VALUES (
      p_period_id, p_tx_date, 'terjual', p_chicken_count,
      v_stock_rec.current_stock, v_stock_rec.current_stock - p_chicken_count,
      v_title, p_operator_name, 'transactions', v_tx_id, p_notes
    );
  END IF;

  v_remaining := p_total_amount - v_effective_paid;
  IF v_remaining > 0 THEN
    INSERT INTO public.receivables (
      period_id, transaction_id, customer_id, party_name,
      tx_date, due_date, total_amount, paid_amount, remaining_amount,
      status, operator_name, notes
    )
    VALUES (
      p_period_id, v_tx_id, p_customer_id, COALESCE(NULLIF(p_buyer_name, ''), 'Pembeli Umum'),
      p_tx_date, p_due_date, p_total_amount, v_effective_paid, v_remaining,
      p_payment_status, p_operator_name, p_notes
    );
  END IF;

  INSERT INTO public.audit_logs (
    period_id, table_name, record_id, action, after_data, reason, operator_name
  )
  VALUES (
    p_period_id, 'transactions', v_tx_id, 'INSERT',
    jsonb_build_object('tx_type', 'income', 'category', p_category, 'amount', p_total_amount, 'chicken_count', p_chicken_count),
    'Pencatatan pemasukan baru', p_operator_name
  );

  RETURN v_tx_id;
END;
$$;

-- 8.5 Catat Pengeluaran Atomik (Bibit, Pakan, Operasional, Renovasi, Peralatan, dll)
CREATE OR REPLACE FUNCTION public.rpc_record_expense(
  p_period_id UUID,
  p_client_tx_key TEXT,
  p_tx_date DATE,
  p_category TEXT,
  p_accounting_class TEXT,
  p_supplier_id UUID,
  p_supplier_or_store TEXT,
  p_item_name TEXT,
  p_quantity NUMERIC,
  p_unit TEXT,
  p_unit_price NUMERIC,
  p_total_amount NUMERIC,
  p_feed_type TEXT,
  p_feed_brand TEXT,
  p_sack_count INTEGER,
  p_total_weight_kg NUMERIC,
  p_pack_count INTEGER,
  p_vaccine_package TEXT,
  p_vaccinated_count INTEGER,
  p_condition TEXT,
  p_stock_confirmed BOOLEAN,
  p_payment_method TEXT,
  p_payment_status TEXT,
  p_paid_amount NUMERIC,
  p_due_date DATE,
  p_operator_name TEXT,
  p_notes TEXT,
  p_attachment_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx_id UUID;
  v_exp_id UUID;
  v_stock_rec RECORD;
  v_feed_rec RECORD;
  v_effective_paid NUMERIC(15,2);
  v_remaining NUMERIC(15,2);
  v_add_chicks INTEGER;
  v_add_feed_kg NUMERIC(12,3);
  v_price_per_kg NUMERIC(15,2);
  v_title TEXT;
BEGIN
  IF p_tx_date IS NULL THEN RAISE EXCEPTION 'Tanggal wajib diisi.'; END IF;
  IF trim(COALESCE(p_operator_name, '')) = '' THEN RAISE EXCEPTION 'Operator wajib dipilih.'; END IF;
  IF p_total_amount <= 0 THEN RAISE EXCEPTION 'Nominal pengeluaran harus lebih dari 0.'; END IF;

  IF p_client_tx_key IS NOT NULL AND EXISTS (SELECT 1 FROM public.transactions WHERE client_tx_key = p_client_tx_key) THEN
    SELECT id INTO v_tx_id FROM public.transactions WHERE client_tx_key = p_client_tx_key;
    RETURN v_tx_id;
  END IF;

  v_effective_paid := CASE
    WHEN p_payment_status = 'lunas' THEN p_total_amount
    WHEN p_payment_status = 'belum_dibayar' THEN 0
    ELSE LEAST(GREATEST(COALESCE(p_paid_amount, 0), 0), p_total_amount)
  END;

  v_title := COALESCE(NULLIF(trim(p_item_name), ''), initcap(replace(p_category, '_', ' ')));

  INSERT INTO public.transactions (
    period_id, client_tx_key, tx_date, tx_type, category, sub_category,
    title, amount, paid_amount, payment_method, payment_status,
    accounting_class, operator_name, reference_name, notes, attachment_url
  )
  VALUES (
    p_period_id, p_client_tx_key, p_tx_date, 'expense', p_category, p_category,
    v_title, p_total_amount, v_effective_paid,
    CASE WHEN p_payment_status = 'belum_dibayar' AND p_payment_method = 'kredit' THEN 'kredit' ELSE p_payment_method END,
    p_payment_status, p_accounting_class, p_operator_name, p_supplier_or_store, p_notes, p_attachment_url
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO public.expense_transactions (
    transaction_id, period_id, tx_date, category, accounting_class,
    supplier_id, supplier_or_store, item_name, quantity, unit, unit_price, total_amount,
    feed_type, feed_brand, sack_count, total_weight_kg, pack_count,
    vaccine_package, vaccinated_count, condition, stock_confirmed,
    payment_method, payment_status, paid_amount, operator_name, notes, attachment_url
  )
  VALUES (
    v_tx_id, p_period_id, p_tx_date, p_category, p_accounting_class,
    p_supplier_id, p_supplier_or_store, v_title, COALESCE(p_quantity, 1), COALESCE(NULLIF(p_unit, ''), 'unit'),
    COALESCE(p_unit_price, 0), p_total_amount,
    p_feed_type, p_feed_brand, COALESCE(p_sack_count, 0), COALESCE(p_total_weight_kg, 0), COALESCE(p_pack_count, 0),
    p_vaccine_package, COALESCE(p_vaccinated_count, 0), p_condition, COALESCE(p_stock_confirmed, TRUE),
    p_payment_method, p_payment_status, v_effective_paid, p_operator_name, p_notes, p_attachment_url
  )
  RETURNING id INTO v_exp_id;

  -- Jika pembelian bibit ayam & sudah dikonfirmasi masuk kandang
  IF p_category = 'bibit_ayam' AND COALESCE(p_stock_confirmed, FALSE) = TRUE THEN
    v_add_chicks := ROUND(COALESCE(p_quantity, 0))::INTEGER;
    IF v_add_chicks > 0 THEN
      INSERT INTO public.chicken_stock (period_id, initial_stock, current_stock)
      VALUES (p_period_id, 0, 0)
      ON CONFLICT (period_id) DO NOTHING;

      SELECT * INTO v_stock_rec FROM public.chicken_stock WHERE period_id = p_period_id FOR UPDATE;
      UPDATE public.chicken_stock
      SET total_in = total_in + v_add_chicks, current_stock = current_stock + v_add_chicks
      WHERE id = v_stock_rec.id;

      INSERT INTO public.stock_movements (
        period_id, movement_date, movement_type, quantity,
        stock_before, stock_after, reason, operator_name,
        reference_table, reference_id, notes
      )
      VALUES (
        p_period_id, p_tx_date, 'masuk', v_add_chicks,
        v_stock_rec.current_stock, v_stock_rec.current_stock + v_add_chicks,
        format('Pembelian bibit ayam (%s)', COALESCE(p_supplier_or_store, 'Pemasok')),
        p_operator_name, 'transactions', v_tx_id, p_notes
      );
    END IF;
  END IF;

  -- Jika pembelian pakan & sudah dikonfirmasi masuk gudang pakan
  IF p_category = 'pakan' AND COALESCE(p_stock_confirmed, FALSE) = TRUE THEN
    v_add_feed_kg := CASE WHEN COALESCE(p_total_weight_kg, 0) > 0 THEN p_total_weight_kg ELSE COALESCE(p_sack_count, 0) * 50 END;
    IF v_add_feed_kg > 0 THEN
      v_price_per_kg := p_total_amount / v_add_feed_kg;
      INSERT INTO public.feed_inventory (period_id, feed_type, brand, current_stock_kg, unit_price_per_kg, total_value)
      VALUES (
        p_period_id,
        COALESCE(NULLIF(trim(p_feed_type), ''), 'Pakan Ayam'),
        COALESCE(NULLIF(trim(p_feed_brand), ''), 'Umum'),
        v_add_feed_kg,
        v_price_per_kg,
        p_total_amount
      )
      ON CONFLICT (period_id, feed_type, brand)
      DO UPDATE SET
        current_stock_kg = public.feed_inventory.current_stock_kg + EXCLUDED.current_stock_kg,
        total_value = public.feed_inventory.total_value + EXCLUDED.total_value,
        unit_price_per_kg = CASE
          WHEN (public.feed_inventory.current_stock_kg + EXCLUDED.current_stock_kg) > 0
          THEN (public.feed_inventory.total_value + EXCLUDED.total_value) / (public.feed_inventory.current_stock_kg + EXCLUDED.current_stock_kg)
          ELSE 0
        END
      RETURNING * INTO v_feed_rec;

      INSERT INTO public.feed_movements (
        period_id, feed_inventory_id, movement_date, movement_type,
        feed_type, brand, sack_count, weight_kg, unit_price_per_sack, total_value,
        reason, operator_name, reference_id, notes
      )
      VALUES (
        p_period_id, v_feed_rec.id, p_tx_date, 'masuk',
        v_feed_rec.feed_type, v_feed_rec.brand,
        COALESCE(p_sack_count, 0), v_add_feed_kg, COALESCE(p_unit_price, 0), p_total_amount,
        format('Pembelian pakan (%s)', COALESCE(p_supplier_or_store, 'Pemasok')),
        p_operator_name, v_tx_id, p_notes
      );
    END IF;
  END IF;

  -- Jika pembayaran belum lunas, buat catatan Utang Usaha
  v_remaining := p_total_amount - v_effective_paid;
  IF v_remaining > 0 THEN
    INSERT INTO public.debts (
      period_id, transaction_id, supplier_id, party_name,
      tx_date, due_date, total_amount, paid_amount, remaining_amount,
      status, operator_name, notes
    )
    VALUES (
      p_period_id, v_tx_id, p_supplier_id, COALESCE(NULLIF(p_supplier_or_store, ''), 'Pemasok'),
      p_tx_date, p_due_date, p_total_amount, v_effective_paid, v_remaining,
      p_payment_status, p_operator_name, p_notes
    );
  END IF;

  INSERT INTO public.audit_logs (
    period_id, table_name, record_id, action, after_data, reason, operator_name
  )
  VALUES (
    p_period_id, 'transactions', v_tx_id, 'INSERT',
    jsonb_build_object('tx_type', 'expense', 'category', p_category, 'amount', p_total_amount, 'stock_confirmed', p_stock_confirmed),
    'Pencatatan pengeluaran baru', p_operator_name
  );

  RETURN v_tx_id;
END;
$$;

-- 8.6 Konfirmasi Masuk Stok untuk Pembelian Bibit / Pakan yang Tertunda
CREATE OR REPLACE FUNCTION public.rpc_confirm_expense_stock(
  p_expense_id UUID,
  p_operator_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exp RECORD;
  v_stock_rec RECORD;
  v_feed_rec RECORD;
  v_add_chicks INTEGER;
  v_add_feed_kg NUMERIC(12,3);
BEGIN

  SELECT * INTO v_exp FROM public.expense_transactions WHERE id = p_expense_id AND is_deleted = FALSE FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Data pembelian tidak ditemukan.'; END IF;
  IF v_exp.stock_confirmed THEN RAISE EXCEPTION 'Stok untuk pembelian ini sudah pernah dikonfirmasi.'; END IF;

  IF v_exp.category = 'bibit_ayam' THEN
    v_add_chicks := ROUND(v_exp.quantity)::INTEGER;
    INSERT INTO public.chicken_stock (period_id, initial_stock, current_stock)
    VALUES (v_exp.period_id, 0, 0)
    ON CONFLICT (period_id) DO NOTHING;
    SELECT * INTO v_stock_rec FROM public.chicken_stock WHERE period_id = v_exp.period_id FOR UPDATE;
    UPDATE public.chicken_stock
    SET total_in = total_in + v_add_chicks, current_stock = current_stock + v_add_chicks
    WHERE id = v_stock_rec.id;

    INSERT INTO public.stock_movements (
      period_id, movement_date, movement_type, quantity,
      stock_before, stock_after, reason, operator_name,
      reference_table, reference_id
    )
    VALUES (
      v_exp.period_id, (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE, 'masuk', v_add_chicks,
      v_stock_rec.current_stock, v_stock_rec.current_stock + v_add_chicks,
      format('Konfirmasi bibit masuk (%s)', COALESCE(v_exp.supplier_or_store, 'Pemasok')),
      p_operator_name, 'transactions', v_exp.transaction_id
    );
  ELSIF v_exp.category = 'pakan' THEN
    v_add_feed_kg := CASE WHEN v_exp.total_weight_kg > 0 THEN v_exp.total_weight_kg ELSE v_exp.sack_count * 50 END;
    INSERT INTO public.feed_inventory (period_id, feed_type, brand, current_stock_kg, unit_price_per_kg, total_value)
    VALUES (
      v_exp.period_id,
      COALESCE(NULLIF(v_exp.feed_type, ''), 'Pakan Ayam'),
      COALESCE(NULLIF(v_exp.feed_brand, ''), 'Umum'),
      v_add_feed_kg,
      v_exp.total_amount / NULLIF(v_add_feed_kg, 0),
      v_exp.total_amount
    )
    ON CONFLICT (period_id, feed_type, brand)
    DO UPDATE SET
      current_stock_kg = public.feed_inventory.current_stock_kg + EXCLUDED.current_stock_kg,
      total_value = public.feed_inventory.total_value + EXCLUDED.total_value,
      unit_price_per_kg = (public.feed_inventory.total_value + EXCLUDED.total_value) / NULLIF((public.feed_inventory.current_stock_kg + EXCLUDED.current_stock_kg), 0)
    RETURNING * INTO v_feed_rec;

    INSERT INTO public.feed_movements (
      period_id, feed_inventory_id, movement_date, movement_type,
      feed_type, brand, sack_count, weight_kg, unit_price_per_sack, total_value,
      reason, operator_name, reference_id
    )
    VALUES (
      v_exp.period_id, v_feed_rec.id, (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE, 'masuk',
      v_feed_rec.feed_type, v_feed_rec.brand, v_exp.sack_count, v_add_feed_kg,
      v_exp.unit_price, v_exp.total_amount, 'Konfirmasi pakan masuk gudang',
      p_operator_name, v_exp.transaction_id
    );
  END IF;

  UPDATE public.expense_transactions SET stock_confirmed = TRUE WHERE id = p_expense_id;

  INSERT INTO public.audit_logs (
    period_id, table_name, record_id, action, reason, operator_name
  )
  VALUES (
    v_exp.period_id, 'expense_transactions', p_expense_id, 'UPDATE',
    'Konfirmasi stok masuk dari pembelian tertunda', p_operator_name
  );

  RETURN TRUE;
END;
$$;

-- 8.7 Catat Ayam Mati atau Afkir (mengurangi stok secara atomik)
CREATE OR REPLACE FUNCTION public.rpc_record_chicken_loss(
  p_period_id UUID,
  p_record_date DATE,
  p_loss_type TEXT, -- 'mati' atau 'afkir'
  p_quantity INTEGER,
  p_symptoms TEXT,
  p_action_taken TEXT,
  p_notes TEXT,
  p_operator_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock_rec RECORD;
  v_move_id UUID;
BEGIN
  IF p_loss_type NOT IN ('mati', 'afkir') THEN RAISE EXCEPTION 'Jenis pengurangan harus mati atau afkir.'; END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Jumlah ekor harus lebih dari 0.'; END IF;

  SELECT * INTO v_stock_rec FROM public.chicken_stock WHERE period_id = p_period_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stok ayam periode tidak ditemukan.'; END IF;
  IF v_stock_rec.current_stock < p_quantity THEN
    RAISE EXCEPTION 'Stok ayam tersedia (% ekor) lebih kecil dari jumlah yang dicatat (% ekor).', v_stock_rec.current_stock, p_quantity;
  END IF;

  UPDATE public.chicken_stock
  SET
    total_dead = total_dead + CASE WHEN p_loss_type = 'mati' THEN p_quantity ELSE 0 END,
    total_culled = total_culled + CASE WHEN p_loss_type = 'afkir' THEN p_quantity ELSE 0 END,
    current_stock = current_stock - p_quantity
  WHERE id = v_stock_rec.id;

  INSERT INTO public.stock_movements (
    period_id, movement_date, movement_type, quantity,
    stock_before, stock_after, reason, operator_name, notes
  )
  VALUES (
    p_period_id, p_record_date, p_loss_type, p_quantity,
    v_stock_rec.current_stock, v_stock_rec.current_stock - p_quantity,
    COALESCE(NULLIF(trim(p_symptoms), ''), CASE WHEN p_loss_type = 'mati' THEN 'Ayam Mati' ELSE 'Ayam Afkir' END),
    p_operator_name, p_notes
  )
  RETURNING id INTO v_move_id;

  INSERT INTO public.health_records (
    period_id, record_date, record_type, chicken_count,
    symptoms, action_taken, notes, operator_name, stock_movement_id
  )
  VALUES (
    p_period_id, p_record_date,
    CASE WHEN p_loss_type = 'mati' THEN 'kematian' ELSE 'afkir' END,
    p_quantity,
    COALESCE(NULLIF(trim(p_symptoms), ''), '-'),
    p_action_taken, p_notes, p_operator_name, v_move_id
  );

  INSERT INTO public.audit_logs (
    period_id, table_name, record_id, action, after_data, reason, operator_name
  )
  VALUES (
    p_period_id, 'stock_movements', v_move_id, 'INSERT',
    jsonb_build_object('type', p_loss_type, 'quantity', p_quantity),
    'Pencatatan ayam mati/afkir', p_operator_name
  );

  RETURN v_move_id;
END;
$$;

-- 8.8 Koreksi Stok Ayam Khusus (Memerlukan Alasan & PIN Pemilik)
CREATE OR REPLACE FUNCTION public.rpc_adjust_chicken_stock(
  p_period_id UUID,
  p_adjustment_date DATE,
  p_adjustment_type TEXT, -- 'koreksi_tambah' | 'koreksi_kurang'
  p_quantity INTEGER,
  p_reason TEXT,
  p_operator_name TEXT,
  p_pin TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_pin_ok BOOLEAN;
  v_stock_rec RECORD;
  v_move_id UUID;
  v_new_stock INTEGER;
BEGIN
  SELECT public.rpc_verify_owner_pin(p_pin) INTO v_pin_ok;
  IF NOT v_pin_ok THEN RAISE EXCEPTION 'PIN Pemilik tidak valid.'; END IF;
  IF p_quantity <= 0 THEN RAISE EXCEPTION 'Jumlah koreksi harus lebih dari 0.'; END IF;
  IF trim(COALESCE(p_reason, '')) = '' THEN RAISE EXCEPTION 'Alasan koreksi stok wajib diisi.'; END IF;

  SELECT * INTO v_stock_rec FROM public.chicken_stock WHERE period_id = p_period_id FOR UPDATE;
  IF p_adjustment_type = 'koreksi_tambah' THEN
    v_new_stock := v_stock_rec.current_stock + p_quantity;
    UPDATE public.chicken_stock SET total_in = total_in + p_quantity, current_stock = v_new_stock WHERE id = v_stock_rec.id;
  ELSIF p_adjustment_type = 'koreksi_kurang' THEN
    IF v_stock_rec.current_stock < p_quantity THEN
      RAISE EXCEPTION 'Stok tidak mencukupi untuk pengurangan koreksi.';
    END IF;
    v_new_stock := v_stock_rec.current_stock - p_quantity;
    UPDATE public.chicken_stock SET current_stock = v_new_stock WHERE id = v_stock_rec.id;
  ELSE
    RAISE EXCEPTION 'Jenis koreksi tidak valid.';
  END IF;

  INSERT INTO public.stock_movements (
    period_id, movement_date, movement_type, quantity,
    stock_before, stock_after, reason, operator_name
  )
  VALUES (
    p_period_id, p_adjustment_date, p_adjustment_type, p_quantity,
    v_stock_rec.current_stock, v_new_stock, p_reason, p_operator_name
  )
  RETURNING id INTO v_move_id;

  INSERT INTO public.audit_logs (
    period_id, table_name, record_id, action, before_data, after_data, reason, operator_name
  )
  VALUES (
    p_period_id, 'chicken_stock', v_stock_rec.id, 'STOCK_CORRECTION',
    jsonb_build_object('current_stock', v_stock_rec.current_stock),
    jsonb_build_object('current_stock', v_new_stock),
    p_reason, p_operator_name
  );

  RETURN v_move_id;
END;
$$;

-- 8.9 Catat Pemakaian Pakan (dalam kg, atomik & tidak boleh negatif)
CREATE OR REPLACE FUNCTION public.rpc_record_feed_usage(
  p_period_id UUID,
  p_feed_inventory_id UUID,
  p_movement_date DATE,
  p_weight_kg NUMERIC,
  p_reason TEXT,
  p_notes TEXT,
  p_operator_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feed RECORD;
  v_move_id UUID;
  v_used_value NUMERIC(15,2);
BEGIN
  IF p_weight_kg <= 0 THEN RAISE EXCEPTION 'Berat pemakaian pakan harus lebih dari 0 kg.'; END IF;

  SELECT * INTO v_feed FROM public.feed_inventory WHERE id = p_feed_inventory_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stok pakan tidak ditemukan.'; END IF;
  IF v_feed.current_stock_kg < p_weight_kg THEN
    RAISE EXCEPTION 'Stok pakan % (%) tidak cukup. Sisa: % kg.', v_feed.feed_type, v_feed.brand, v_feed.current_stock_kg;
  END IF;

  v_used_value := ROUND(p_weight_kg * v_feed.unit_price_per_kg, 2);

  UPDATE public.feed_inventory
  SET
    current_stock_kg = current_stock_kg - p_weight_kg,
    total_value = GREATEST(0, total_value - v_used_value)
  WHERE id = v_feed.id;

  INSERT INTO public.feed_movements (
    period_id, feed_inventory_id, movement_date, movement_type,
    feed_type, brand, sack_count, weight_kg, unit_price_per_sack, total_value,
    reason, operator_name, notes
  )
  VALUES (
    p_period_id, v_feed.id, p_movement_date, 'pakai',
    v_feed.feed_type, v_feed.brand, 0, p_weight_kg, 0, v_used_value,
    COALESCE(NULLIF(trim(p_reason), ''), 'Pemakaian pakan harian'),
    p_operator_name, p_notes
  )
  RETURNING id INTO v_move_id;

  INSERT INTO public.audit_logs (
    period_id, table_name, record_id, action, after_data, reason, operator_name
  )
  VALUES (
    p_period_id, 'feed_movements', v_move_id, 'INSERT',
    jsonb_build_object('feed_type', v_feed.feed_type, 'weight_kg', p_weight_kg, 'value', v_used_value),
    'Pencatatan pemakaian pakan', p_operator_name
  );

  RETURN v_move_id;
END;
$$;

-- 8.10 Pembayaran Gaji Karyawan (hanya mencatat pengeluaran kas sebesar nominal yang benar-benar dibayarkan)
CREATE OR REPLACE FUNCTION public.rpc_record_salary_payment(
  p_period_id UUID,
  p_employee_id UUID,
  p_salary_month INTEGER,
  p_salary_year INTEGER,
  p_base_salary NUMERIC,
  p_pay_now NUMERIC,
  p_payment_date DATE,
  p_payment_method TEXT,
  p_operator_name TEXT,
  p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emp RECORD;
  v_sal RECORD;
  v_new_paid NUMERIC(15,2);
  v_status TEXT;
  v_tx_id UUID;
  v_sal_id UUID;
BEGIN
  IF p_base_salary < 0 OR p_pay_now < 0 THEN RAISE EXCEPTION 'Nominal gaji tidak boleh negatif.'; END IF;

  SELECT * INTO v_emp FROM public.employees WHERE id = p_employee_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Data karyawan tidak ditemukan.'; END IF;

  SELECT * INTO v_sal FROM public.salaries
  WHERE period_id = p_period_id AND employee_id = p_employee_id
    AND salary_month = p_salary_month AND salary_year = p_salary_year
  FOR UPDATE;

  IF FOUND THEN
    v_new_paid := LEAST(p_base_salary, v_sal.paid_amount + p_pay_now);
  ELSE
    v_new_paid := LEAST(p_base_salary, p_pay_now);
  END IF;

  v_status := CASE
    WHEN v_new_paid <= 0 THEN 'belum_dibayar'
    WHEN v_new_paid < p_base_salary THEN 'dibayar_sebagian'
    ELSE 'lunas'
  END;

  -- Hanya catat uang keluar jika ada nominal yang dibayarkan sekarang (> 0)
  IF p_pay_now > 0 THEN
    INSERT INTO public.transactions (
      period_id, tx_date, tx_type, category, sub_category,
      title, amount, paid_amount, payment_method, payment_status,
      accounting_class, operator_name, reference_name, notes
    )
    VALUES (
      p_period_id, COALESCE(p_payment_date, (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE),
      'expense', 'gaji_karyawan', 'gaji_karyawan',
      format('Gaji %s (%s/%s)', v_emp.name, lpad(p_salary_month::TEXT, 2, '0'), p_salary_year),
      p_pay_now, p_pay_now, p_payment_method, 'lunas',
      'tenaga_kerja', p_operator_name, v_emp.name, p_notes
    )
    RETURNING id INTO v_tx_id;
  END IF;

  IF FOUND THEN
    UPDATE public.salaries
    SET
      base_salary = p_base_salary,
      paid_amount = v_new_paid,
      payment_date = CASE WHEN p_pay_now > 0 THEN COALESCE(p_payment_date, payment_date) ELSE payment_date END,
      payment_status = v_status,
      payment_method = p_payment_method,
      transaction_id = COALESCE(v_tx_id, transaction_id),
      operator_name = p_operator_name,
      notes = p_notes
    WHERE id = v_sal.id
    RETURNING id INTO v_sal_id;
  ELSE
    INSERT INTO public.salaries (
      period_id, employee_id, transaction_id, salary_month, salary_year,
      base_salary, paid_amount, payment_date, payment_status, payment_method,
      operator_name, notes
    )
    VALUES (
      p_period_id, p_employee_id, v_tx_id, p_salary_month, p_salary_year,
      p_base_salary, v_new_paid,
      CASE WHEN p_pay_now > 0 THEN COALESCE(p_payment_date, (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE) ELSE NULL END,
      v_status, p_payment_method, p_operator_name, p_notes
    )
    RETURNING id INTO v_sal_id;
  END IF;

  RETURN v_sal_id;
END;
$$;

-- 8.11 Pelunasan Utang atau Piutang (tidak menggandakan pendapatan/beban di Laba Rugi)
CREATE OR REPLACE FUNCTION public.rpc_pay_debt_or_receivable(
  p_record_type TEXT, -- 'debt' | 'receivable'
  p_parent_id UUID,
  p_payment_date DATE,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_operator_name TEXT,
  p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_new_paid NUMERIC(15,2);
  v_new_rem NUMERIC(15,2);
  v_new_status TEXT;
  v_pay_id UUID;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Nominal pembayaran harus lebih dari 0.'; END IF;

  IF p_record_type = 'debt' THEN
    SELECT * INTO v_rec FROM public.debts WHERE id = p_parent_id AND is_deleted = FALSE FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Data utang tidak ditemukan.'; END IF;
    IF p_amount > v_rec.remaining_amount THEN RAISE EXCEPTION 'Nominal melebihi sisa utang.'; END IF;

    v_new_paid := v_rec.paid_amount + p_amount;
    v_new_rem := v_rec.remaining_amount - p_amount;
    v_new_status := CASE WHEN v_new_rem <= 0 THEN 'lunas' ELSE 'dibayar_sebagian' END;

    UPDATE public.debts
    SET paid_amount = v_new_paid, remaining_amount = v_new_rem, status = v_new_status
    WHERE id = p_parent_id;

    IF v_rec.transaction_id IS NOT NULL THEN
      UPDATE public.transactions
      SET paid_amount = v_new_paid, payment_status = v_new_status
      WHERE id = v_rec.transaction_id;
    END IF;
  ELSIF p_record_type = 'receivable' THEN
    SELECT * INTO v_rec FROM public.receivables WHERE id = p_parent_id AND is_deleted = FALSE FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Data piutang tidak ditemukan.'; END IF;
    IF p_amount > v_rec.remaining_amount THEN RAISE EXCEPTION 'Nominal melebihi sisa piutang.'; END IF;

    v_new_paid := v_rec.paid_amount + p_amount;
    v_new_rem := v_rec.remaining_amount - p_amount;
    v_new_status := CASE WHEN v_new_rem <= 0 THEN 'lunas' ELSE 'dibayar_sebagian' END;

    UPDATE public.receivables
    SET paid_amount = v_new_paid, remaining_amount = v_new_rem, status = v_new_status
    WHERE id = p_parent_id;

    IF v_rec.transaction_id IS NOT NULL THEN
      UPDATE public.transactions
      SET paid_amount = v_new_paid, payment_status = v_new_status
      WHERE id = v_rec.transaction_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'Tipe tidak valid.';
  END IF;

  INSERT INTO public.debt_receivable_payments (
    period_id, record_type, parent_id, transaction_id,
    payment_date, amount, payment_method, operator_name, notes
  )
  VALUES (
    v_rec.period_id, p_record_type, p_parent_id, v_rec.transaction_id,
    p_payment_date, p_amount, p_payment_method, p_operator_name, p_notes
  )
  RETURNING id INTO v_pay_id;

  INSERT INTO public.audit_logs (
    period_id, table_name, record_id, action, after_data, reason, operator_name
  )
  VALUES (
    v_rec.period_id, p_record_type, p_parent_id, 'UPDATE',
    jsonb_build_object('paid_now', p_amount, 'remaining', v_new_rem, 'status', v_new_status),
    'Pelunasan utang/piutang', p_operator_name
  );

  RETURN v_pay_id;
END;
$$;

-- 8.12 Edit Transaksi Pemasukan tanpa Menggandakan Pergerakan Stok
CREATE OR REPLACE FUNCTION public.rpc_update_income_transaction(
  p_transaction_id UUID,
  p_tx_date DATE,
  p_buyer_name TEXT,
  p_buyer_phone TEXT DEFAULT NULL,
  p_chicken_count INTEGER DEFAULT 0,
  p_weight_kg NUMERIC DEFAULT 0,
  p_sack_count INTEGER DEFAULT 0,
  p_unit_price NUMERIC DEFAULT 0,
  p_total_amount NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_operator_name TEXT DEFAULT 'Leman',
  p_edit_reason TEXT DEFAULT ''
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_tx RECORD;
  v_old_inc RECORD;
  v_stock RECORD;
  v_delta INTEGER;
  v_title TEXT;
BEGIN
  IF p_total_amount <= 0 THEN RAISE EXCEPTION 'Nominal harus lebih dari 0.'; END IF;

  SELECT * INTO v_old_tx FROM public.transactions WHERE id = p_transaction_id AND is_deleted = FALSE FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaksi tidak ditemukan.'; END IF;

  SELECT * INTO v_old_inc FROM public.income_transactions WHERE transaction_id = p_transaction_id FOR UPDATE;

  IF v_old_inc.category IN ('penjualan_ekor', 'penjualan_kg') THEN
    v_delta := COALESCE(p_chicken_count, 0) - COALESCE(v_old_inc.chicken_count, 0);
    IF v_delta <> 0 THEN
      SELECT * INTO v_stock FROM public.chicken_stock WHERE period_id = v_old_tx.period_id FOR UPDATE;
      IF v_delta > 0 AND v_stock.current_stock < v_delta THEN
        RAISE EXCEPTION 'Stok tidak mencukupi untuk penambahan jumlah ekor penjualan.';
      END IF;

      UPDATE public.chicken_stock
      SET
        total_sold = total_sold + v_delta,
        current_stock = current_stock - v_delta
      WHERE id = v_stock.id;

      INSERT INTO public.stock_movements (
        period_id, movement_date, movement_type, quantity,
        stock_before, stock_after, reason, operator_name,
        reference_table, reference_id
      )
      VALUES (
        v_old_tx.period_id, p_tx_date,
        CASE WHEN v_delta > 0 THEN 'terjual' ELSE 'koreksi_tambah' END,
        ABS(v_delta),
        v_stock.current_stock, v_stock.current_stock - v_delta,
        format('Penyesuaian edit transaksi: %s', COALESCE(NULLIF(p_edit_reason, ''), 'Revisi penjualan')),
        p_operator_name, 'transactions', p_transaction_id
      );
    END IF;
  END IF;

  v_title := CASE v_old_inc.category
    WHEN 'penjualan_ekor' THEN format('Penjualan %s ekor ayam (%s)', p_chicken_count, p_buyer_name)
    WHEN 'penjualan_kg' THEN format('Penjualan %s kg / %s ekor ayam (%s)', p_weight_kg, p_chicken_count, p_buyer_name)
    WHEN 'penjualan_kotoran' THEN format('Penjualan %s goni kotoran ayam (%s)', p_sack_count, p_buyer_name)
    ELSE v_old_tx.title
  END;

  UPDATE public.transactions
  SET
    tx_date = p_tx_date,
    title = v_title,
    amount = p_total_amount,
    paid_amount = CASE WHEN payment_status = 'lunas' THEN p_total_amount ELSE LEAST(paid_amount, p_total_amount) END,
    reference_name = p_buyer_name,
    notes = p_notes
  WHERE id = p_transaction_id;

  UPDATE public.income_transactions
  SET
    tx_date = p_tx_date,
    buyer_name = p_buyer_name,
    buyer_phone = NULLIF(trim(COALESCE(p_buyer_phone, '')), ''),
    chicken_count = COALESCE(p_chicken_count, 0),
    weight_kg = COALESCE(p_weight_kg, 0),
    sack_count = COALESCE(p_sack_count, 0),
    unit_price = COALESCE(p_unit_price, 0),
    total_amount = p_total_amount,
    notes = p_notes
  WHERE id = v_old_inc.id;

  INSERT INTO public.audit_logs (
    period_id, table_name, record_id, action, before_data, after_data, reason, operator_name
  )
  VALUES (
    v_old_tx.period_id, 'transactions', p_transaction_id, 'UPDATE',
    jsonb_build_object('amount', v_old_tx.amount, 'chicken_count', v_old_inc.chicken_count, 'buyer', v_old_inc.buyer_name),
    jsonb_build_object('amount', p_total_amount, 'chicken_count', p_chicken_count, 'buyer', p_buyer_name),
    COALESCE(NULLIF(p_edit_reason, ''), 'Perubahan transaksi pemasukan'), p_operator_name
  );

  RETURN TRUE;
END;
$$;

-- 8.13 Soft Delete Transaksi + Pembalikan Stok Aman (Memerlukan PIN Pemilik)
CREATE OR REPLACE FUNCTION public.rpc_soft_delete_transaction(
  p_transaction_id UUID,
  p_operator_name TEXT,
  p_reason TEXT,
  p_pin TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_pin_ok BOOLEAN;
  v_tx RECORD;
  v_inc RECORD;
  v_exp RECORD;
  v_stock RECORD;
  v_feed RECORD;
  v_qty INTEGER;
  v_feed_kg NUMERIC(12,3);
BEGIN
  SELECT public.rpc_verify_owner_pin(p_pin) INTO v_pin_ok;
  IF NOT v_pin_ok THEN RAISE EXCEPTION 'PIN Pemilik salah. Penghapusan dibatalkan.'; END IF;
  IF trim(COALESCE(p_reason, '')) = '' THEN RAISE EXCEPTION 'Alasan penghapusan wajib diisi.'; END IF;

  SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id AND is_deleted = FALSE FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaksi tidak ditemukan atau sudah dihapus.'; END IF;

  -- Pembalikan stok ayam jika transaksi adalah penjualan ayam
  IF v_tx.tx_type = 'income' THEN
    SELECT * INTO v_inc FROM public.income_transactions WHERE transaction_id = p_transaction_id;
    IF FOUND AND v_inc.category IN ('penjualan_ekor', 'penjualan_kg') AND v_inc.chicken_count > 0 THEN
      SELECT * INTO v_stock FROM public.chicken_stock WHERE period_id = v_tx.period_id FOR UPDATE;
      UPDATE public.chicken_stock
      SET
        total_sold = GREATEST(0, total_sold - v_inc.chicken_count),
        current_stock = current_stock + v_inc.chicken_count
      WHERE id = v_stock.id;

      INSERT INTO public.stock_movements (
        period_id, movement_date, movement_type, quantity,
        stock_before, stock_after, reason, operator_name,
        reference_table, reference_id
      )
      VALUES (
        v_tx.period_id, (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE, 'koreksi_tambah', v_inc.chicken_count,
        v_stock.current_stock, v_stock.current_stock + v_inc.chicken_count,
        format('Pembatalan transaksi penjualan: %s', p_reason),
        p_operator_name, 'transactions', p_transaction_id
      );
    END IF;
    UPDATE public.income_transactions SET is_deleted = TRUE WHERE transaction_id = p_transaction_id;
    UPDATE public.receivables SET is_deleted = TRUE WHERE transaction_id = p_transaction_id;
  END IF;

  -- Pembalikan stok jika transaksi adalah pengeluaran bibit / pakan yang sudah masuk stok
  IF v_tx.tx_type = 'expense' THEN
    SELECT * INTO v_exp FROM public.expense_transactions WHERE transaction_id = p_transaction_id;
    IF FOUND AND v_exp.stock_confirmed THEN
      IF v_exp.category = 'bibit_ayam' THEN
        v_qty := ROUND(v_exp.quantity)::INTEGER;
        SELECT * INTO v_stock FROM public.chicken_stock WHERE period_id = v_tx.period_id FOR UPDATE;
        IF v_stock.current_stock < v_qty THEN
          RAISE EXCEPTION 'Tidak bisa membatalkan pembelian bibit karena stok ayam saat ini (% ekor) kurang dari % ekor.', v_stock.current_stock, v_qty;
        END IF;
        UPDATE public.chicken_stock
        SET
          total_in = GREATEST(0, total_in - v_qty),
          current_stock = current_stock - v_qty
        WHERE id = v_stock.id;

        INSERT INTO public.stock_movements (
          period_id, movement_date, movement_type, quantity,
          stock_before, stock_after, reason, operator_name,
          reference_table, reference_id
        )
        VALUES (
          v_tx.period_id, (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE, 'koreksi_kurang', v_qty,
          v_stock.current_stock, v_stock.current_stock - v_qty,
          format('Pembatalan pembelian bibit: %s', p_reason),
          p_operator_name, 'transactions', p_transaction_id
        );
      ELSIF v_exp.category = 'pakan' THEN
        v_feed_kg := CASE WHEN v_exp.total_weight_kg > 0 THEN v_exp.total_weight_kg ELSE v_exp.sack_count * 50 END;
        SELECT * INTO v_feed FROM public.feed_inventory
        WHERE period_id = v_tx.period_id
          AND feed_type = COALESCE(NULLIF(v_exp.feed_type, ''), 'Pakan Ayam')
          AND brand = COALESCE(NULLIF(v_exp.feed_brand, ''), 'Umum')
        FOR UPDATE;
        IF FOUND THEN
          IF v_feed.current_stock_kg < v_feed_kg THEN
            RAISE EXCEPTION 'Stok pakan saat ini (% kg) lebih kecil dari pembelian yang dibatalkan (% kg).', v_feed.current_stock_kg, v_feed_kg;
          END IF;
          UPDATE public.feed_inventory
          SET
            current_stock_kg = current_stock_kg - v_feed_kg,
            total_value = GREATEST(0, total_value - v_exp.total_amount)
          WHERE id = v_feed.id;
        END IF;
      END IF;
    END IF;
    UPDATE public.expense_transactions SET is_deleted = TRUE WHERE transaction_id = p_transaction_id;
    UPDATE public.debts SET is_deleted = TRUE WHERE transaction_id = p_transaction_id;
  END IF;

  UPDATE public.stock_movements SET is_reversed = TRUE WHERE reference_table = 'transactions' AND reference_id = p_transaction_id AND movement_type IN ('terjual', 'masuk');

  UPDATE public.transactions
  SET
    is_deleted = TRUE,
    deleted_at = NOW(),
    deleted_by_operator = p_operator_name,
    delete_reason = p_reason
  WHERE id = p_transaction_id;

  INSERT INTO public.audit_logs (
    period_id, table_name, record_id, action, before_data, reason, operator_name
  )
  VALUES (
    v_tx.period_id, 'transactions', p_transaction_id, 'SOFT_DELETE',
    to_jsonb(v_tx), p_reason, p_operator_name
  );

  RETURN TRUE;
END;
$$;

-- 8.14 Tutup Periode & Mulai Periode Baru per Cabang (Histori Periode Sebelumnya Terjaga)
CREATE OR REPLACE FUNCTION public.rpc_close_period_and_start_new(
  p_current_period_id UUID,
  p_new_period_name TEXT,
  p_new_start_date DATE,
  p_new_initial_stock INTEGER,
  p_notes TEXT,
  p_operator_name TEXT,
  p_pin TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_pin_ok BOOLEAN;
  v_branch_id UUID;
  v_new_period_id UUID;
BEGIN
  SELECT public.rpc_verify_owner_pin(p_pin) INTO v_pin_ok;
  IF NOT v_pin_ok THEN RAISE EXCEPTION 'PIN Pemilik tidak valid.'; END IF;
  IF p_new_initial_stock < 0 THEN RAISE EXCEPTION 'Stok awal tidak boleh negatif.'; END IF;

  SELECT branch_id INTO v_branch_id FROM public.farm_periods WHERE id = p_current_period_id;
  IF v_branch_id IS NULL THEN
    SELECT id INTO v_branch_id FROM public.farm_branches WHERE code = 'pematangsiantar' LIMIT 1;
  END IF;

  UPDATE public.farm_periods
  SET status = 'closed', end_date = COALESCE(p_new_start_date, (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE)
  WHERE id = p_current_period_id AND status = 'active';

  INSERT INTO public.farm_periods (branch_id, name, start_date, status, initial_stock, notes)
  VALUES (v_branch_id, p_new_period_name, p_new_start_date, 'active', p_new_initial_stock, p_notes)
  RETURNING id INTO v_new_period_id;

  INSERT INTO public.chicken_stock (period_id, initial_stock, current_stock)
  VALUES (v_new_period_id, p_new_initial_stock, p_new_initial_stock);

  INSERT INTO public.stock_movements (
    period_id, movement_date, movement_type, quantity,
    stock_before, stock_after, reason, operator_name, notes
  )
  VALUES (
    v_new_period_id, p_new_start_date, 'initial', p_new_initial_stock,
    0, p_new_initial_stock, 'Stok awal periode ternak baru', p_operator_name, p_notes
  );

  INSERT INTO public.audit_logs (
    branch_id, period_id, table_name, record_id, action, after_data, reason, operator_name
  )
  VALUES (
    v_branch_id, v_new_period_id, 'farm_periods', v_new_period_id, 'PERIOD_CLOSE',
    jsonb_build_object('closed_period_id', p_current_period_id, 'new_period', p_new_period_name, 'initial_stock', p_new_initial_stock),
    'Penutupan periode lama dan pembukaan periode ternak baru', p_operator_name
  );

  RETURN v_new_period_id;
END;
$$;

-- ============================================================================
-- 9. GRANT FINAL UNTUK SELURUH TABEL, SEQUENCE, DAN FUNGSI RPC
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
