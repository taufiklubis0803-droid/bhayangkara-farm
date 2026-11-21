import React, { useState } from 'react';
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Bird,
  Calendar as CalendarIcon,
  ClipboardList,
  CreditCard,
  HeartPulse,
  History,
  LayoutDashboard,
  MapPin,
  Menu,
  Moon,
  Package,
  Scale,
  Settings,
  Sun,
  Truck,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { isSupabaseConfigured } from '../lib/supabase';
import type { FarmBranch, FarmPeriod, NavMenuKey, OperatorProfile } from '../types/database';

export interface NavItemConfig {
  key: NavMenuKey;
  label: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const NAV_ITEMS: NavItemConfig[] = [
  { key: 'dashboard', label: 'Dashboard', group: 'Ringkasan', icon: LayoutDashboard },
  { key: 'pemasukan', label: 'Pemasukan', group: 'Keuangan & Transaksi', icon: ArrowUpCircle },
  { key: 'pengeluaran', label: 'Pengeluaran', group: 'Keuangan & Transaksi', icon: ArrowDownCircle },
  { key: 'stok_ayam', label: 'Stok Ayam', group: 'Operasional Ternak', icon: Bird },
  { key: 'stok_pakan', label: 'Stok Pakan', group: 'Operasional Ternak', icon: Package },
  { key: 'pertumbuhan', label: 'Pertumbuhan Ayam', group: 'Operasional Ternak', icon: Scale },
  { key: 'kesehatan', label: 'Kesehatan Ayam', group: 'Operasional Ternak', icon: HeartPulse },
  { key: 'aktivitas', label: 'Aktivitas Peternakan', group: 'Operasional Ternak', icon: ClipboardList },
  { key: 'kalender', label: 'Kalender', group: 'Laporan & Audit', icon: CalendarIcon },
  { key: 'laporan', label: 'Laporan Keuangan', group: 'Laporan & Audit', icon: BarChart3 },
  { key: 'histori', label: 'Histori Transaksi', group: 'Laporan & Audit', icon: History },
  { key: 'pembeli', label: 'Pembeli', group: 'Mitra & SDM', icon: Users },
  { key: 'pemasok', label: 'Pemasok', group: 'Mitra & SDM', icon: Truck },
  { key: 'karyawan', label: 'Karyawan', group: 'Mitra & SDM', icon: UserCheck },
  { key: 'gaji', label: 'Gaji', group: 'Mitra & SDM', icon: Wallet },
  { key: 'utang_piutang', label: 'Utang Piutang', group: 'Mitra & SDM', icon: CreditCard },
  { key: 'pengaturan', label: 'Pengaturan', group: 'Sistem', icon: Settings },
];

interface LayoutProps {
  activeMenu: NavMenuKey;
  onSelectMenu: (menu: NavMenuKey) => void;
  branches: FarmBranch[];
  selectedBranchId: string | null;
  selectedBranch: FarmBranch | null;
  onSelectBranch: (branchId: string) => void;
  operators: OperatorProfile[];
  currentOperator: string;
  onChangeOperator: (name: string) => void;
  periods: FarmPeriod[];
  selectedPeriodId: string | null;
  onSelectPeriod: (periodId: string) => void;
  isLiveSupabase: boolean;
  pendingPreviewCount?: number;
  syncingPreview?: boolean;
  onSyncPreviewToSupabase?: () => void;
  onDiscardPreview?: () => void;
  onOpenSetupGuide: () => void;
  onRetrySupabase?: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  activeMenu,
  onSelectMenu,
  branches,
  selectedBranchId,
  selectedBranch,
  onSelectBranch,
  operators,
  currentOperator,
  onChangeOperator,
  periods,
  selectedPeriodId,
  onSelectPeriod,
  isLiveSupabase,
  pendingPreviewCount = 0,
  syncingPreview = false,
  onSyncPreviewToSupabase,
  onDiscardPreview,
  onOpenSetupGuide,
  onRetrySupabase,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const activeItem = NAV_ITEMS.find((i) => i.key === activeMenu) ?? NAV_ITEMS[0];
  const groups = [
    'Ringkasan',
    'Keuangan & Transaksi',
    'Operasional Ternak',
    'Laporan & Audit',
    'Mitra & SDM',
    'Sistem',
  ];

  const handleNavClick = (key: NavMenuKey) => {
    onSelectMenu(key);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#EEEEEE] text-[#071B2B] transition-colors duration-200 dark:bg-[#071B2B] dark:text-[#EEEEEE] lg:flex">
      {/* DESKTOP SIDEBAR */}
      <aside className="no-print hidden lg:flex lg:w-[264px] lg:shrink-0 lg:flex-col lg:border-r lg:border-[#167D8D]/30 lg:bg-gradient-to-b lg:from-[#071B2B] lg:via-[#071B2B] lg:to-[#0B253A] lg:text-[#EEEEEE]">
        <div className="border-b border-[#167D8D]/25 px-4 py-5">
          <div className="flex items-center gap-3 select-none">
            <div className="icon-light h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#B9E4E8]/35 bg-[#071B2B]">
              <img
                src="/assets/aistudio/Logo_Peternakan_Ayam_Bhayangkara_be238611.png"
                alt="Logo BHAYANGKARA FARM"
                className="h-full w-full scale-105 object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="font-display text-[15px] leading-none font-bold tracking-tight text-[#EEEEEE] whitespace-nowrap">
                BHAYANGKARA FARM
              </div>
              <div className="mt-1 text-[10px] font-medium tracking-wide text-[#B9E4E8] uppercase whitespace-nowrap">
                Farm Management &amp; Financial
              </div>
            </div>
          </div>
        </div>

        {/* Pemilih Cabang Peternakan (Desktop Sidebar) */}
        {branches.length > 0 && (
          <div className="border-b border-[#167D8D]/25 px-3.5 py-3">
            <div className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-semibold tracking-wider text-[#B9E4E8] uppercase">
              <MapPin className="h-3 w-3 text-[#B9E4E8]" />
              <span>Cabang Aktif</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {branches.map((br) => {
                const isSelected = br.id === selectedBranchId;
                return (
                  <button
                    key={br.id}
                    type="button"
                    onClick={() => onSelectBranch(br.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-[#167D8D] text-white shadow-[0_0_16px_rgba(22,125,141,0.45)]'
                        : 'bg-[#0C2538]/85 text-[#B9E4E8]/85 hover:bg-[#167D8D]/30 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{br.name}</span>
                    {isSelected && (
                      <span className="ml-1.5 h-2 w-2 shrink-0 rounded-full bg-[#B9E4E8] shadow-[0_0_8px_#B9E4E8]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((grp) => {
            const items = NAV_ITEMS.filter((i) => i.group === grp);
            return (
              <div key={grp} className="mb-5 last:mb-0">
                <div className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-[#B9E4E8]/70 uppercase">
                  {grp}
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.key === activeMenu;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleNavClick(item.key)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all whitespace-nowrap ${
                          isActive
                            ? 'bg-gradient-to-r from-[#167D8D] to-[#167D8D]/80 text-white shadow-[0_0_16px_rgba(22,125,141,0.35),inset_0_1px_0_rgba(185,228,232,0.35)]'
                            : 'text-[#EEEEEE]/80 hover:bg-[#167D8D]/20 hover:text-[#B9E4E8]'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? 'text-[#B9E4E8]' : 'text-[#B9E4E8]/80'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-[#167D8D]/25 px-4 py-3 text-[11px] text-[#B9E4E8]/80">
          <div className="font-semibold text-[#EEEEEE]">
            {selectedBranch?.name ?? 'BHAYANGKARA FARM'}
          </div>
          <div className="mt-0.5 text-[10px] opacity-80">
            Akses langsung aktif &bull; PIN Pemilik 1234
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT SHELL */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* TOP HEADER (DESKTOP + MOBILE NON-OVERLAPPING) */}
        <header className="no-print sticky top-0 z-30 border-b border-[#167D8D]/20 bg-white/95 backdrop-blur-md transition-colors dark:border-[#B9E4E8]/15 dark:bg-[#071B2B]/95">
          {/* Baris Utama: Judul Halaman + Status & Kontrol Desktop */}
          <div className="flex min-h-[52px] items-center justify-between gap-2 px-3.5 py-2 sm:px-4 lg:h-16 lg:gap-3 lg:px-8 lg:py-0">
            <div className="min-w-0 flex-1">
              <h1 className="font-display truncate text-base font-bold tracking-tight text-[#071B2B] dark:text-[#B9E4E8] lg:text-lg">
                {activeItem.label}
              </h1>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/* Status Koneksi Database */}
              {isLiveSupabase ? (
                <span
                  title="Terhubung langsung ke Supabase (data tersimpan permanen)"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-300 sm:px-2.5"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                  <span className="hidden sm:inline">Supabase Live</span>
                  <span className="sm:hidden">Live</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onRetrySupabase ?? onOpenSetupGuide}
                  title="Mode Pratinjau Lokal: data hanya tersimpan sementara di browser"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-500/25 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-200 sm:px-2.5"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span className="hidden sm:inline">Pratinjau Lokal</span>
                  <span className="sm:hidden">Lokal</span>
                </button>
              )}

              {/* Kontrol Selector Khusus Desktop (lg ke atas) */}
              <div className="hidden lg:flex lg:items-center lg:gap-2">
                {branches.length > 0 && (
                  <select
                    aria-label="Pilih Cabang BHAYANGKARA FARM"
                    value={selectedBranchId ?? ''}
                    onChange={(e) => onSelectBranch(e.target.value)}
                    className="h-9 max-w-[185px] rounded-xl border border-[#167D8D]/25 bg-[#B9E4E8]/35 px-2.5 text-xs font-semibold text-[#071B2B] outline-none focus:border-[#167D8D] dark:border-[#B9E4E8]/25 dark:bg-[#167D8D]/30 dark:text-[#EEEEEE]"
                  >
                    {branches.map((br) => (
                      <option key={br.id} value={br.id}>
                        {br.name}
                      </option>
                    ))}
                  </select>
                )}

                {periods.length > 0 && (
                  <select
                    aria-label="Pilih Periode Ternak"
                    value={selectedPeriodId ?? ''}
                    onChange={(e) => onSelectPeriod(e.target.value)}
                    className="h-9 max-w-[190px] rounded-xl border border-[#167D8D]/20 bg-[#EEEEEE] px-2.5 text-xs font-semibold text-[#071B2B] outline-none focus:border-[#167D8D] dark:border-[#B9E4E8]/25 dark:bg-[#0C2538] dark:text-[#B9E4E8]"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.status === 'active' ? 'Aktif' : 'Ditutup'})
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[#355365] dark:text-[#B9E4E8]/80">
                    Pencatat:
                  </span>
                  <select
                    aria-label="Pilih Operator Pencatat"
                    value={currentOperator}
                    onChange={(e) => onChangeOperator(e.target.value)}
                    className="h-9 rounded-xl border border-[#167D8D]/20 bg-[#EEEEEE] px-2.5 text-xs font-semibold text-[#071B2B] outline-none focus:border-[#167D8D] dark:border-[#B9E4E8]/25 dark:bg-[#0C2538] dark:text-[#B9E4E8]"
                  >
                    {operators.length > 0 ? (
                      operators.map((op) => (
                        <option key={op.id} value={op.display_name}>
                          {op.display_name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Leman">Leman</option>
                        <option value="Hana">Hana</option>
                        <option value="Taufik">Taufik</option>
                        <option value="Rizka">Rizka</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Light / Dark Mode Switch */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
                title={isDark ? 'Mode Terang (Light)' : 'Mode Gelap (Dark)'}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-[#167D8D]/25 bg-[#B9E4E8]/45 px-2.5 text-xs font-semibold text-[#071B2B] transition-colors hover:bg-[#B9E4E8]/75 dark:border-[#B9E4E8]/30 dark:bg-[#167D8D]/35 dark:text-[#B9E4E8] dark:hover:bg-[#167D8D]/55"
              >
                {isDark ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-[#B9E4E8]" />
                    <span className="hidden sm:inline">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-[#167D8D]" />
                    <span className="hidden sm:inline">Dark</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Baris Kedua Khusus Mobile & Tablet (< lg): Cabang, Periode & Pencatat Tersusun Rapi */}
          <div className="border-t border-[#167D8D]/15 bg-[#F6F9FA]/95 px-3.5 py-2 dark:border-[#B9E4E8]/10 dark:bg-[#091D2E]/90 sm:px-4 lg:hidden">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {branches.length > 0 && (
                <select
                  aria-label="Pilih Cabang"
                  value={selectedBranchId ?? ''}
                  onChange={(e) => onSelectBranch(e.target.value)}
                  className="h-9 w-full min-w-0 truncate rounded-xl border border-[#167D8D]/25 bg-[#B9E4E8]/35 px-2.5 text-xs font-semibold text-[#071B2B] outline-none focus:border-[#167D8D] dark:border-[#B9E4E8]/25 dark:bg-[#167D8D]/30 dark:text-[#EEEEEE]"
                >
                  {branches.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.name}
                    </option>
                  ))}
                </select>
              )}

              {periods.length > 0 && (
                <select
                  aria-label="Pilih Periode Ternak"
                  value={selectedPeriodId ?? ''}
                  onChange={(e) => onSelectPeriod(e.target.value)}
                  className="hidden h-9 w-full min-w-0 truncate rounded-xl border border-[#167D8D]/20 bg-white px-2.5 text-xs font-semibold text-[#071B2B] outline-none focus:border-[#167D8D] dark:border-[#B9E4E8]/25 dark:bg-[#0C2538] dark:text-[#B9E4E8] sm:block"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status === 'active' ? 'Aktif' : 'Ditutup'})
                    </option>
                  ))}
                </select>
              )}

              <div className={`flex min-w-0 items-center gap-1.5 ${branches.length === 0 ? 'col-span-2 sm:col-span-3' : ''}`}>
                <span className="shrink-0 text-[11px] font-medium text-[#355365] dark:text-[#8BC2CB]">
                  Pencatat:
                </span>
                <select
                  aria-label="Pilih Operator Pencatat"
                  value={currentOperator}
                  onChange={(e) => onChangeOperator(e.target.value)}
                  className="h-9 min-w-0 flex-1 truncate rounded-xl border border-[#167D8D]/20 bg-white px-2 text-xs font-semibold text-[#071B2B] outline-none focus:border-[#167D8D] dark:border-[#B9E4E8]/25 dark:bg-[#0C2538] dark:text-[#B9E4E8]"
                >
                  {operators.length > 0 ? (
                    operators.map((op) => (
                      <option key={op.id} value={op.display_name}>
                        {op.display_name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Leman">Leman</option>
                      <option value="Hana">Hana</option>
                      <option value="Taufik">Taufik</option>
                      <option value="Rizka">Rizka</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* VIEWPORT CONTENT */}
        <main className="min-w-0 flex-1 px-3.5 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:pt-5 lg:px-8 lg:py-6">
          <div className="mx-auto max-w-[1320px]">
            {!isLiveSupabase && (
              <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/50 bg-amber-50 px-4 py-3 text-xs text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-100">
                <div>
                  <strong>
                    {isSupabaseConfigured
                      ? 'Mode Pratinjau Lokal:'
                      : 'Mode Perancangan (Supabase Belum Dikonfigurasi):'}
                  </strong>{' '}
                  Data yang Anda input saat ini <strong>TIDAK masuk ke Supabase</strong> karena
                  hanya tersimpan sementara di browser.
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {isSupabaseConfigured && onRetrySupabase && (
                    <button
                      type="button"
                      onClick={onRetrySupabase}
                      className="rounded-lg bg-[#167D8D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE] whitespace-nowrap"
                    >
                      Hubungkan ke Supabase
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onOpenSetupGuide}
                    className="font-semibold text-[#167D8D] underline hover:text-[#071B2B] dark:text-[#B9E4E8] dark:hover:text-white whitespace-nowrap"
                  >
                    {isSupabaseConfigured ? 'Skrip SQL Migration →' : 'Panduan Hubungkan Supabase →'}
                  </button>
                </div>
              </div>
            )}
            {isLiveSupabase && pendingPreviewCount > 0 && (
              <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#167D8D]/40 bg-[#B9E4E8]/45 px-4 py-3 text-xs text-[#071B2B] dark:border-[#B9E4E8]/30 dark:bg-[#0C2538] dark:text-[#B9E4E8]">
                <div>
                  <strong>Ditemukan {pendingPreviewCount} data pratinjau lokal:</strong> Data yang
                  sebelumnya diinput saat offline/pratinjau lokal dapat langsung dikirim ke database
                  Supabase sekarang.
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {onSyncPreviewToSupabase && (
                    <button
                      type="button"
                      disabled={syncingPreview}
                      onClick={onSyncPreviewToSupabase}
                      className="rounded-lg bg-[#167D8D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#071B2B] disabled:opacity-60 dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE] whitespace-nowrap"
                    >
                      {syncingPreview
                        ? 'Menyinkronkan...'
                        : `Kirim ke Supabase (${pendingPreviewCount})`}
                    </button>
                  )}
                  {onDiscardPreview && (
                    <button
                      type="button"
                      disabled={syncingPreview}
                      onClick={onDiscardPreview}
                      className="rounded-lg border border-[#167D8D]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#355365] hover:bg-[#EEEEEE] dark:border-[#B9E4E8]/25 dark:bg-[#071B2B] dark:text-[#B9E4E8] whitespace-nowrap"
                    >
                      Hapus Data Lokal
                    </button>
                  )}
                </div>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Navigasi Mobile"
        className="no-print fixed right-0 bottom-0 left-0 z-40 border-t border-[#167D8D]/20 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md dark:border-[#B9E4E8]/15 dark:bg-[#071B2B]/95 lg:hidden"
      >
        <div className="grid h-16 grid-cols-5 items-center">
          {[
            { key: 'dashboard' as NavMenuKey, label: 'Beranda', icon: LayoutDashboard },
            { key: 'pemasukan' as NavMenuKey, label: 'Masuk', icon: ArrowUpCircle },
            { key: 'pengeluaran' as NavMenuKey, label: 'Keluar', icon: ArrowDownCircle },
            { key: 'stok_ayam' as NavMenuKey, label: 'Stok', icon: Bird },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMenu === tab.key && !mobileMenuOpen;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleNavClick(tab.key)}
                className={`flex min-h-[48px] min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium ${
                  isActive
                    ? 'text-[#167D8D] dark:text-[#B9E4E8]'
                    : 'text-[#355365] dark:text-[#8BC2CB]'
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive
                      ? 'text-[#167D8D] dark:text-[#B9E4E8]'
                      : 'text-[#355365]/85 dark:text-[#167D8D]'
                  }`}
                />
                <span className="w-full truncate text-center">{tab.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`flex min-h-[48px] min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium ${
              mobileMenuOpen || !['dashboard', 'pemasukan', 'pengeluaran', 'stok_ayam'].includes(activeMenu)
                ? 'text-[#167D8D] dark:text-[#B9E4E8]'
                : 'text-[#355365] dark:text-[#8BC2CB]'
            }`}
          >
            <Menu className="h-5 w-5 shrink-0" />
            <span className="w-full truncate text-center">Menu</span>
          </button>
        </div>
      </nav>

      {/* MOBILE FULL MENU DRAWER */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 flex flex-col bg-[#071B2B]/70 backdrop-blur-xs lg:hidden">
          <div className="mt-auto max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-[#167D8D]/30 bg-white p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] dark:bg-[#071B2B]">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-[#167D8D]/15 pb-3 dark:border-[#B9E4E8]/15">
              <div className="min-w-0">
                <div className="font-display text-base font-bold text-[#071B2B] dark:text-[#B9E4E8]">
                  Semua Menu
                </div>
                <div className="text-xs text-[#355365] dark:text-[#8BC2CB]">
                  Pilih modul pembukuan &amp; peternakan
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEEEEE] text-[#071B2B] dark:bg-[#0C2538] dark:text-[#B9E4E8]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {branches.length > 0 && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#B9E4E8]">
                  Cabang Peternakan
                </label>
                <select
                  value={selectedBranchId ?? ''}
                  onChange={(e) => onSelectBranch(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#167D8D]/25 bg-white px-3 text-sm font-semibold text-[#071B2B] dark:border-[#B9E4E8]/25 dark:bg-[#091D2E] dark:text-[#EEEEEE]"
                >
                  {branches.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {periods.length > 0 && (
              <div className="mb-4">
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#B9E4E8]">
                  Periode Ternak Aktif
                </label>
                <select
                  value={selectedPeriodId ?? ''}
                  onChange={(e) => onSelectPeriod(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#167D8D]/25 bg-white px-3 text-sm font-medium text-[#071B2B] dark:border-[#B9E4E8]/25 dark:bg-[#091D2E] dark:text-[#EEEEEE]"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status === 'active' ? 'Aktif' : 'Ditutup'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.key === activeMenu;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleNavClick(item.key)}
                    className={`flex min-h-[52px] min-w-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                      isActive
                        ? 'border-[#167D8D] bg-[#167D8D] text-white'
                        : 'border-[#167D8D]/20 bg-[#EEEEEE] text-[#071B2B] hover:bg-[#B9E4E8]/45 dark:border-[#B9E4E8]/20 dark:bg-[#0C2538] dark:text-[#EEEEEE] dark:hover:bg-[#167D8D]/35'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-[#B9E4E8]' : 'text-[#167D8D] dark:text-[#B9E4E8]'
                      }`}
                    />
                    <span className="min-w-0 leading-tight break-words">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { Activity };
