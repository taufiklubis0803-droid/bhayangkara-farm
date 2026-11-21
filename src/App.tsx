import { useEffect, useState } from 'react';
import { AlertCircle, Check, Copy, RefreshCw } from 'lucide-react';
import { Layout } from './components/Layout';
import { SupabaseSetupGuide } from './components/SupabaseSetupGuide';
import { useFarmData } from './hooks/useFarmData';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  clearPendingPreviewData,
  getPendingPreviewCount,
  syncPreviewDataToSupabase,
} from './services/farmService';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { CalendarPage } from './pages/CalendarPage';
import { ChickenStockPage } from './pages/ChickenStockPage';
import { CustomersPage } from './pages/CustomersPage';
import { DashboardPage } from './pages/DashboardPage';
import { DebtsReceivablesPage } from './pages/DebtsReceivablesPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { ExpensePage } from './pages/ExpensePage';
import { FeedStockPage } from './pages/FeedStockPage';
import { GrowthPage } from './pages/GrowthPage';
import { HealthPage } from './pages/HealthPage';
import { HistoryPage } from './pages/HistoryPage';
import { IncomePage } from './pages/IncomePage';
import { ReportsPage } from './pages/ReportsPage';
import { SalaryPage } from './pages/SalaryPage';
import { SettingsPage } from './pages/SettingsPage';
import { SuppliersPage } from './pages/SuppliersPage';
import type { NavMenuKey } from './types/database';

export default function App() {
  const [autoDesignMode, setAutoDesignMode] = useState(() => !isSupabaseConfigured);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [copiedGrantSql, setCopiedGrantSql] = useState(false);
  const [activeMenu, setActiveMenu] = useState<NavMenuKey>('dashboard');
  const [currentOperator, setCurrentOperator] = useState<string>('Leman');
  const [pendingPreviewCount, setPendingPreviewCount] = useState<number>(() =>
    getPendingPreviewCount()
  );
  const [syncingPreview, setSyncingPreview] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const quickGrantSql = `GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;`;

  const handleCopyGrantSql = async () => {
    try {
      await navigator.clipboard.writeText(quickGrantSql);
      setCopiedGrantSql(true);
      setTimeout(() => setCopiedGrantSql(false), 2500);
    } catch {
      // ignore clipboard error
    }
  };

  // Opsional: jika kredensial auto-login diset di env, aktifkan sesi di background tanpa layar login
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const autoEmail = (import.meta.env.VITE_AUTO_LOGIN_EMAIL as string | undefined)?.trim();
    const autoPass = (import.meta.env.VITE_AUTO_LOGIN_PASSWORD as string | undefined)?.trim();
    if (!autoEmail || !autoPass) return;
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        void supabase?.auth.signInWithPassword({ email: autoEmail, password: autoPass });
      }
    });
  }, []);

  const useLiveDatabase = Boolean(isSupabaseConfigured && !autoDesignMode);
  const farmData = useFarmData(useLiveDatabase, autoDesignMode);

  useEffect(() => {
    setPendingPreviewCount(getPendingPreviewCount());
  }, [
    farmData.isLiveSupabase,
    farmData.transactions.length,
    farmData.customers.length,
    farmData.suppliers.length,
    farmData.farmActivities.length,
    farmData.weightRecords.length,
    farmData.healthRecords.length,
    farmData.vaccinationRecords.length,
  ]);

  const handleSyncPreviewToSupabase = async () => {
    if (!farmData.selectedPeriodId) return;
    setSyncingPreview(true);
    setSyncNotice(null);
    try {
      const count = await syncPreviewDataToSupabase(farmData.selectedPeriodId);
      setPendingPreviewCount(0);
      setSyncNotice(`${count} data pratinjau lokal berhasil dikirim ke Supabase.`);
      await farmData.refreshData();
    } catch (err) {
      setSyncNotice(
        err instanceof Error ? err.message : 'Gagal menyinkronkan data pratinjau ke Supabase.'
      );
    } finally {
      setSyncingPreview(false);
    }
  };

  const handleDiscardPreview = () => {
    clearPendingPreviewData();
    setPendingPreviewCount(0);
    setSyncNotice('Data pratinjau lokal telah dibersihkan.');
  };

  useEffect(() => {
    if (farmData.operators.length > 0) {
      const exists = farmData.operators.some((o) => o.display_name === currentOperator);
      if (!exists) {
        setCurrentOperator(farmData.operators[0].display_name);
      }
    }
  }, [farmData.operators, currentOperator]);

  if (showSetupGuide) {
    return <SupabaseSetupGuide onBackToApp={() => setShowSetupGuide(false)} />;
  }

  const renderPage = () => {
    if (farmData.loading && !farmData.activePeriod) {
      return (
        <div className="farm-card p-8 text-center text-sm text-[#355365] dark:text-[#B9E4E8]">
          Menghubungkan &amp; memuat data pembukuan BHAYANGKARA FARM dari Supabase...
        </div>
      );
    }

    if (farmData.error) {
      const isPermissionIssue =
        farmData.errorCode === '42501' ||
        farmData.error.toLowerCase().includes('permission denied') ||
        farmData.error.toLowerCase().includes('hak akses');

      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-rose-400" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold">Gagal Menghubungkan Database</span>
                {farmData.errorCode && (
                  <span className="rounded bg-red-200/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-red-900 dark:bg-red-900/60 dark:text-red-200">
                    Kode: {farmData.errorCode}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed">{farmData.error}</p>

              {isPermissionIssue && (
                <div className="mt-3 rounded-xl border border-red-200 bg-white/80 p-3 text-xs dark:border-red-500/30 dark:bg-[#071B2B]">
                  <div className="font-semibold text-[#071B2B] dark:text-[#B9E4E8]">
                    Solusi Cepat (Supabase SQL Editor → New Query):
                  </div>
                  <p className="mt-1 text-[11px] text-[#355365] dark:text-[#8BC2CB]">
                    Tabel sudah ada, namun role <code className="font-mono">anon</code> &amp;{' '}
                    <code className="font-mono">authenticated</code> belum memiliki izin akses{' '}
                    <code className="font-mono">GRANT</code>. Salin dan jalankan perintah SQL berikut
                    di Supabase SQL Editor lalu klik <strong>Coba Hubungkan Ulang</strong>:
                  </p>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-[#071B2B] p-2.5 font-mono text-[11px] text-[#B9E4E8]">
                    {quickGrantSql}
                  </pre>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void farmData.refreshData()}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Coba Hubungkan Ulang
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopyGrantSql()}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-50 dark:border-red-500/40 dark:bg-[#071B2B] dark:text-red-200"
                >
                  {copiedGrantSql ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedGrantSql ? 'SQL Hak Akses Tersalin' : 'Salin SQL Perbaikan Hak Akses'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSetupGuide(true)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-800 hover:bg-red-50 dark:border-red-500/40 dark:bg-[#071B2B] dark:text-red-200"
                >
                  Buka Skrip SQL Migration Lengkap
                </button>
                <button
                  type="button"
                  onClick={() => setAutoDesignMode(true)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-[#071B2B] hover:bg-[#EEEEEE] dark:border-[#B9E4E8]/30 dark:bg-[#071B2B] dark:text-[#B9E4E8]"
                >
                  Lanjut ke Mode Pratinjau Lokal
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const refresh = () => farmData.refreshData();

    switch (activeMenu) {
      case 'dashboard':
        return <DashboardPage data={farmData} onNavigate={(menu) => setActiveMenu(menu)} />;
      case 'pemasukan':
        return (
          <IncomePage data={farmData} currentOperator={currentOperator} onRefresh={refresh} />
        );
      case 'pengeluaran':
        return (
          <ExpensePage
            data={farmData}
            currentOperator={currentOperator}
            onRefresh={refresh}
            onNavigate={(menu) => setActiveMenu(menu)}
          />
        );
      case 'stok_ayam':
        return (
          <ChickenStockPage
            data={farmData}
            currentOperator={currentOperator}
            onRefresh={refresh}
          />
        );
      case 'stok_pakan':
        return (
          <FeedStockPage
            data={farmData}
            currentOperator={currentOperator}
            onRefresh={refresh}
            onNavigate={(menu) => setActiveMenu(menu)}
          />
        );
      case 'pertumbuhan':
        return (
          <GrowthPage data={farmData} currentOperator={currentOperator} onRefresh={refresh} />
        );
      case 'kesehatan':
        return (
          <HealthPage data={farmData} currentOperator={currentOperator} onRefresh={refresh} />
        );
      case 'kalender':
        return <CalendarPage data={farmData} />;
      case 'laporan':
        return <ReportsPage data={farmData} />;
      case 'histori':
        return (
          <HistoryPage data={farmData} currentOperator={currentOperator} onRefresh={refresh} />
        );
      case 'pembeli':
        return <CustomersPage data={farmData} onRefresh={refresh} />;
      case 'pemasok':
        return <SuppliersPage data={farmData} onRefresh={refresh} />;
      case 'karyawan':
        return <EmployeesPage data={farmData} onRefresh={refresh} />;
      case 'gaji':
        return (
          <SalaryPage data={farmData} currentOperator={currentOperator} onRefresh={refresh} />
        );
      case 'utang_piutang':
        return (
          <DebtsReceivablesPage
            data={farmData}
            currentOperator={currentOperator}
            onRefresh={refresh}
          />
        );
      case 'aktivitas':
        return (
          <ActivitiesPage
            data={farmData}
            currentOperator={currentOperator}
            onRefresh={refresh}
          />
        );
      case 'pengaturan':
        return (
          <SettingsPage
            data={farmData}
            currentOperator={currentOperator}
            onRefresh={refresh}
            onOpenSetupGuide={() => setShowSetupGuide(true)}
          />
        );
      default:
        return <DashboardPage data={farmData} onNavigate={(menu) => setActiveMenu(menu)} />;
    }
  };

  return (
    <Layout
      activeMenu={activeMenu}
      onSelectMenu={setActiveMenu}
      branches={farmData.branches}
      selectedBranchId={farmData.selectedBranchId}
      selectedBranch={farmData.selectedBranch}
      onSelectBranch={farmData.selectBranch}
      operators={farmData.operators}
      currentOperator={currentOperator}
      onChangeOperator={setCurrentOperator}
      periods={farmData.periods}
      selectedPeriodId={farmData.selectedPeriodId}
      onSelectPeriod={farmData.selectPeriod}
      isLiveSupabase={farmData.isLiveSupabase}
      pendingPreviewCount={pendingPreviewCount}
      syncingPreview={syncingPreview}
      onSyncPreviewToSupabase={() => void handleSyncPreviewToSupabase()}
      onDiscardPreview={handleDiscardPreview}
      onOpenSetupGuide={() => setShowSetupGuide(true)}
      onRetrySupabase={() => {
        setShowSetupGuide(false);
        setAutoDesignMode(false);
      }}
    >
      {syncNotice && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-[#167D8D]/40 bg-[#B9E4E8]/50 px-4 py-2.5 text-xs font-medium text-[#071B2B] dark:border-[#B9E4E8]/30 dark:bg-[#167D8D]/30 dark:text-[#B9E4E8]">
          <span>{syncNotice}</span>
          <button
            type="button"
            onClick={() => setSyncNotice(null)}
            className="text-xs font-bold underline"
          >
            Tutup
          </button>
        </div>
      )}
      {renderPage()}
    </Layout>
  );
}
