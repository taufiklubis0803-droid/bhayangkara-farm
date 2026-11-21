import React, { useState } from 'react';
import { Check, Copy, Database, Download, KeyRound, Moon, ShieldCheck, Sun } from 'lucide-react';
import migrationSql from '../../supabase/migrations/001_rizka_farm_schema.sql?raw';
import { useTheme } from '../hooks/useTheme';
import { isSupabaseConfigured, supabaseBaseUrl } from '../lib/supabase';
import { Logo } from './Logo';

interface SupabaseSetupGuideProps {
  onBackToApp?: () => void;
}

export const SupabaseSetupGuide: React.FC<SupabaseSetupGuideProps> = ({
  onBackToApp,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedGrant, setCopiedGrant] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  const quickGrantSql = `GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;`;

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(migrationSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore clipboard error
    }
  };

  const handleCopyGrant = async () => {
    try {
      await navigator.clipboard.writeText(quickGrantSql);
      setCopiedGrant(true);
      setTimeout(() => setCopiedGrant(false), 2500);
    } catch {
      // ignore clipboard error
    }
  };

  const handleDownloadSql = () => {
    const blob = new Blob([migrationSql], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '001_rizka_farm_schema.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#EEEEEE] px-4 py-8 transition-colors dark:bg-[#071B2B] md:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Logo size="lg" />
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-[#355365] dark:text-[#8BC2CB]">
              Konfigurasi Backend Supabase
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-[#167D8D]/25 bg-white px-3 text-xs font-semibold text-[#071B2B] dark:border-[#B9E4E8]/25 dark:bg-[#0C2538] dark:text-[#B9E4E8]"
            >
              {isDark ? <Sun className="h-3.5 w-3.5 text-[#B9E4E8]" /> : <Moon className="h-3.5 w-3.5 text-[#167D8D]" />}
              <span>{isDark ? 'Light' : 'Dark'}</span>
            </button>
            {onBackToApp && (
              <button
                type="button"
                onClick={onBackToApp}
                className="min-h-[38px] rounded-xl bg-[#167D8D] px-4 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B]"
              >
                Kembali ke Dashboard
              </button>
            )}
          </div>
        </div>

        <div className="farm-card p-6 md:p-8">
          <div className="flex items-start gap-4 border-b border-[#167D8D]/15 pb-6 dark:border-[#B9E4E8]/15">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#B9E4E8]/70 text-[#167D8D] dark:bg-[#167D8D]/35 dark:text-[#B9E4E8]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-[#071B2B] dark:text-[#B9E4E8] md:text-2xl">
                {isSupabaseConfigured
                  ? 'Database Supabase Terhubung — Langkah Aktivasi Skema'
                  : 'Hubungkan Database Supabase Permanen'}
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-[#355365] dark:text-[#B9E4E8]/85">
                {isSupabaseConfigured ? (
                  <>
                    Kredensial proyek Supabase{' '}
                    <code className="rounded bg-[#EEEEEE] px-1.5 py-0.5 text-xs dark:bg-[#113047]">
                      {supabaseBaseUrl}
                    </code>{' '}
                    sudah terpasang di aplikasi. Jalankan <strong>SQL Migration</strong> terbaru
                    di bawah ini melalui Supabase SQL Editor, lalu klik{' '}
                    <strong>Kembali ke Dashboard</strong> agar seluruh data langsung tersimpan ke
                    Supabase tanpa perlu menu login.
                  </>
                ) : (
                  <>
                    Aplikasi BHAYANGKARA FARM tidak menggunakan data dummy atau penyimpanan lokal
                    sementara. Silakan hubungkan proyek Supabase Anda melalui environment variables
                    agar seluruh pembukuan, stok ayam (808 ekor awal), stok pakan, dan laporan
                    tersimpan permanen serta tersinkronisasi antarperangkat.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="farm-subcard p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#071B2B] dark:text-[#B9E4E8]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#167D8D] text-xs font-bold text-white dark:bg-[#B9E4E8] dark:text-[#071B2B]">
                    1
                  </span>
                  Jalankan SQL Migration di Supabase
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#355365] dark:text-[#B9E4E8]/85">
                  Buka <strong>Supabase Dashboard &rarr; SQL Editor &rarr; New Query</strong>, lalu
                  tempel dan jalankan skrip migration lengkap untuk membuat 24 tabel, RLS, hak akses{' '}
                  <code className="font-mono">GRANT</code>, Storage bucket{' '}
                  <code className="rounded bg-[#EEEEEE] px-1 py-0.5 dark:bg-[#0C2538]">receipts</code>,
                  Realtime, dan fungsi RPC atomik.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#167D8D] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B]"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Skrip SQL Tersalin' : 'Salin Skrip SQL'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSql}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#167D8D]/25 bg-white px-3.5 py-2 text-xs font-medium text-[#071B2B] transition-colors hover:bg-[#EEEEEE] dark:border-[#B9E4E8]/25 dark:bg-[#071B2B] dark:text-[#B9E4E8]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download .sql
                  </button>
                </div>
              </div>

              <div className="farm-subcard p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#071B2B] dark:text-[#B9E4E8]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#167D8D] text-xs font-bold text-white dark:bg-[#B9E4E8] dark:text-[#071B2B]">
                    2
                  </span>
                  Akses Langsung Tanpa Menu Login
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#355365] dark:text-[#B9E4E8]/85">
                  Aplikasi langsung terbuka ke Dashboard tanpa form login email/password di awal.
                  Aksi sensitif seperti hapus transaksi, koreksi stok, dan tutup periode tetap
                  dilindungi oleh <strong>PIN Pemilik</strong> (bawaan <code className="font-mono">1234</code>).
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-medium text-[#167D8D] dark:text-[#B9E4E8]">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#167D8D] dark:text-[#B9E4E8]" />
                  <span>Ganti PIN Pemilik kapan saja di menu Pengaturan.</span>
                </div>
              </div>
            </div>

            <div className="farm-subcard border border-amber-300/60 bg-amber-50/50 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold text-[#071B2B] dark:text-[#B9E4E8]">
                  Sudah Pernah Menjalankan SQL Tapi Muncul Error Hak Akses (42501 / Permission Denied)?
                </div>
                <button
                  type="button"
                  onClick={handleCopyGrant}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-[#167D8D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B]"
                >
                  {copiedGrant ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedGrant ? 'SQL GRANT Tersalin' : 'Salin SQL GRANT'}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-[#355365] dark:text-[#B9E4E8]/85">
                Jalankan perintah singkat ini di <strong>SQL Editor</strong> apabila tabel sudah
                dibuat sebelumnya namun role <code className="font-mono">anon</code> &amp;{' '}
                <code className="font-mono">authenticated</code> belum diberi izin akses:
              </p>
              <pre className="mt-2.5 overflow-x-auto rounded-lg border border-[#167D8D]/30 bg-[#071B2B] p-3 font-mono text-xs text-[#B9E4E8]">
                {quickGrantSql}
              </pre>
            </div>

            <div className="farm-subcard p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#071B2B] dark:text-[#B9E4E8]">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#167D8D] text-xs font-bold text-white dark:bg-[#B9E4E8] dark:text-[#071B2B]">
                  3
                </span>
                Atur Environment Variables
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#355365] dark:text-[#B9E4E8]/85">
                Tambahkan dua variabel berikut pada file <code className="rounded bg-[#EEEEEE] px-1 py-0.5 dark:bg-[#0C2538]">.env</code> atau panel{' '}
                <strong>Secrets / Environment Variables</strong> lalu muat ulang aplikasi (jangan pernah
                memasukkan <code className="rounded bg-[#EEEEEE] px-1 py-0.5 dark:bg-[#0C2538]">service_role</code> key):
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg border border-[#167D8D]/30 bg-[#071B2B] p-3.5 font-mono text-xs text-[#B9E4E8]">
{`VITE_SUPABASE_URL="https://PROJECT_ID_ANDA.supabase.co"
VITE_SUPABASE_ANON_KEY="SUPABASE_ANON_ATAU_PUBLISHABLE_KEY_ANDA"`}
              </pre>
              <div className="mt-3 flex items-center gap-2 text-xs text-[#355365] dark:text-[#8BC2CB]">
                <KeyRound className="h-3.5 w-3.5 shrink-0 text-[#167D8D] dark:text-[#B9E4E8]" />
                <span>
                  PIN Pemilik bawaan setelah migrasi pertama adalah <strong className="font-mono text-[#071B2B] dark:text-[#B9E4E8]">1234</strong> — segera ubah melalui menu Pengaturan setelah login pertama.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
