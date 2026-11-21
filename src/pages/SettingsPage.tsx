import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  KeyRound,
  Moon,
  Palette,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Sun,
  Upload,
} from 'lucide-react';
import { PinConfirmModal } from '../components/PinConfirmModal';
import type { FarmDataState } from '../hooks/useFarmData';
import { useTheme } from '../hooks/useTheme';
import {
  closePeriodAndStartNew,
  saveFarmSettingsAndOperators,
  setOwnerPin,
  verifyAndRestoreBackup,
} from '../services/farmService';
import { todayJakarta } from '../utils/format';

interface SettingsPageProps {
  data: FarmDataState;
  currentOperator: string;
  onRefresh: () => Promise<void>;
  onOpenSetupGuide?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  data,
  currentOperator,
  onRefresh,
  onOpenSetupGuide,
}) => {
  const { theme, setTheme } = useTheme();
  const [minChickenAlert, setMinChickenAlert] = useState(
    String(data.settings?.min_chicken_stock_alert ?? 100)
  );
  const [minFeedAlert, setMinFeedAlert] = useState(
    String(data.settings?.min_feed_stock_kg_alert ?? 100)
  );

  // Operator Names
  const [opNames, setOpNames] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    data.operators.forEach((o) => {
      map[o.id] = o.display_name;
    });
    return map;
  });

  // PIN Change
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');

  // Periode Baru
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState(todayJakarta());
  const [newPeriodStock, setNewPeriodStock] = useState(
    String(data.chickenStock?.current_stock ?? 808)
  );
  const [newPeriodNotes, setNewPeriodNotes] = useState('');
  const [closePeriodPinOpen, setClosePeriodPinOpen] = useState(false);

  // Backup & Restore
  const [restoreJson, setRestoreJson] = useState<string | null>(null);
  const [restoreFileName, setRestoreFileName] = useState('');
  const [restorePinOpen, setRestorePinOpen] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    const map: Record<string, string> = {};
    data.operators.forEach((o) => {
      map[o.id] = o.display_name;
    });
    setOpNames(map);
  }, [data.operators]);

  useEffect(() => {
    setNewPeriodStock(String(data.chickenStock?.current_stock ?? 0));
  }, [data.selectedBranchId, data.chickenStock?.current_stock]);

  useEffect(() => {
    if (data.settings) {
      setMinChickenAlert(String(data.settings.min_chicken_stock_alert));
      setMinFeedAlert(String(data.settings.min_feed_stock_kg_alert));
    }
  }, [data.settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!data.settings) {
      setFeedback({
        type: 'err',
        msg: 'Pengaturan usaha belum termuat. Muat ulang halaman atau periksa koneksi Supabase.',
      });
      return;
    }
    try {
      await saveFarmSettingsAndOperators(data.isLiveSupabase, {
        settingsId: data.settings.id,
        minChickenAlert: Number(minChickenAlert),
        minFeedAlert: Number(minFeedAlert),
        operatorUpdates: data.operators.map((op) => ({
          id: op.id,
          display_name: (opNames[op.id] ?? op.display_name).trim() || op.display_name,
          employee_id: op.employee_id,
        })),
      });

      setFeedback({ type: 'ok', msg: 'Pengaturan usaha & nama operator berhasil diperbarui.' });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan.' });
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await setOwnerPin(data.isLiveSupabase, oldPin.trim(), newPin.trim());
      setOldPin('');
      setNewPin('');
      setFeedback({ type: 'ok', msg: 'PIN Keamanan Pemilik berhasil diperbarui.' });
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Gagal mengubah PIN.' });
    }
  };

  const handleExportBackup = () => {
    const backup = {
      app: 'RIZKA FARM',
      version: 1,
      exported_at: new Date().toISOString(),
      period_id: data.selectedPeriodId,
      data: {
        customers: data.customers,
        suppliers: data.suppliers,
        employees: data.employees,
        operators: data.operators,
        periods: data.periods,
        transactions: data.transactions,
        income_transactions: data.incomeTransactions,
        expense_transactions: data.expenseTransactions,
        chicken_stock: data.chickenStock,
        stock_movements: data.stockMovements,
        feed_inventory: data.feedInventory,
        feed_movements: data.feedMovements,
        salaries: data.salaries,
        debts: data.debts,
        receivables: data.receivables,
        weight_records: data.weightRecords,
        health_records: data.healthRecords,
        vaccination_records: data.vaccinationRecords,
        farm_activities: data.farmActivities,
      },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_RIZKA_FARM_${todayJakarta()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback({ type: 'ok', msg: 'File backup JSON berhasil diunduh.' });
  };

  const handleSelectRestoreFile = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as { app?: string; data?: Record<string, unknown> };
      if (parsed.app !== 'RIZKA FARM' || !parsed.data) {
        setFeedback({ type: 'err', msg: 'File backup tidak valid atau bukan format RIZKA FARM.' });
        return;
      }
      setRestoreJson(text);
      setRestoreFileName(file.name);
      setRestorePinOpen(true);
    } catch {
      setFeedback({ type: 'err', msg: 'File JSON rusak dan tidak dapat dibaca.' });
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-medium ${
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

      {/* Tampilan & Tema */}
      <div className="farm-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Palette className="h-5 w-5 text-[#167D8D] dark:text-[#B9E4E8]" />
            <div>
              <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
                Tampilan &amp; Mode Warna
              </h2>
              <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
                Pilih tema terang atau gelap sesuai kenyamanan pencahayaan kandang &amp; kantor.
              </p>
            </div>
          </div>

          <div className="inline-flex rounded-xl border border-[#167D8D]/20 bg-[#EEEEEE] p-1 dark:border-[#B9E4E8]/15 dark:bg-[#071B2B]">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex min-h-[38px] items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-all ${
                theme === 'light'
                  ? 'bg-[#167D8D] text-white shadow-xs'
                  : 'text-[#355365] dark:text-[#8BC2CB]'
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              Mode Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex min-h-[38px] items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-all ${
                theme === 'dark'
                  ? 'bg-[#B9E4E8] text-[#071B2B] shadow-xs'
                  : 'text-[#355365] dark:text-[#8BC2CB]'
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              Mode Dark
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pengaturan Operator & Batas Minimum */}
        <form onSubmit={handleSaveSettings} className="farm-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-[#167D8D] dark:text-[#B9E4E8]" />
            <div>
              <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
                Nama Operator ({data.selectedBranch?.name ?? 'Cabang'}) &amp; Batas Stok
              </h2>
              <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
                Menampilkan operator karyawan cabang aktif &amp; Pemilik lintas cabang
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {data.operators.map((op) => (
              <div key={op.id}>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  {op.role_label} ({op.slot_key})
                </label>
                <input
                  type="text"
                  required
                  value={opNames[op.id] ?? op.display_name}
                  onChange={(e) => setOpNames((prev) => ({ ...prev, [op.id]: e.target.value }))}
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                />
              </div>
            ))}

            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Batas Minimum Stok Ayam (ekor)
                </label>
                <input
                  type="number"
                  min={0}
                  value={minChickenAlert}
                  onChange={(e) => setMinChickenAlert(e.target.value)}
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  Batas Minimum Stok Pakan (kg)
                </label>
                <input
                  type="number"
                  min={0}
                  value={minFeedAlert}
                  onChange={(e) => setMinFeedAlert(e.target.value)}
                  className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#167D8D] px-4 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
              >
                <Save className="h-4 w-4" />
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </form>

        {/* PIN Pemilik */}
        <form onSubmit={handleChangePin} className="farm-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#D4A359]" />
            <div>
              <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
                PIN Keamanan Pemilik
              </h2>
              <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
                Digunakan untuk penghapusan transaksi, koreksi stok, dan penutupan periode. PIN
                bawaan awal adalah <strong className="font-mono">1234</strong> (disimpan terenkripsi
                bcrypt).
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold">PIN Lama</label>
              <input
                type="password"
                inputMode="numeric"
                required
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">PIN Baru (minimal 4 karakter)</label>
              <input
                type="password"
                inputMode="numeric"
                minLength={4}
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="min-h-[42px] rounded-xl bg-[#071B2B] px-4 text-xs font-semibold text-[#EEEEEE] hover:bg-[#167D8D] dark:bg-[#167D8D] dark:text-white dark:hover:bg-[#B9E4E8] dark:hover:text-[#071B2B]"
              >
                Perbarui PIN Pemilik
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Manajemen Periode Ternak */}
      <div className="farm-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-[#167D8D] dark:text-[#B9E4E8]" />
          <div>
            <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              Tutup Periode &amp; Buka Periode Ternak Baru ({data.selectedBranch?.name ?? 'Cabang'})
            </h2>
            <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
              Periode yang ditutup tetap tersimpan permanen per cabang dan dapat dibuka kembali melalui pemilih periode di header.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            value={newPeriodName}
            onChange={(e) => setNewPeriodName(e.target.value)}
            placeholder="Nama Periode Baru (misal: Periode 2)"
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm"
          />
          <input
            type="date"
            value={newPeriodStart}
            onChange={(e) => setNewPeriodStart(e.target.value)}
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 text-sm"
          />
          <input
            type="number"
            min={0}
            value={newPeriodStock}
            onChange={(e) => setNewPeriodStock(e.target.value)}
            placeholder="Stok Awal Baru (ekor)"
            className="min-h-[42px] rounded-xl border border-slate-300 px-3 font-mono text-sm"
          />
          <button
            type="button"
            disabled={!newPeriodName.trim() || !data.activePeriod}
            onClick={() => setClosePeriodPinOpen(true)}
            className="min-h-[42px] rounded-xl bg-[#D4A359] px-4 text-xs font-semibold text-[#071B2B] hover:bg-[#c59347] disabled:opacity-50"
          >
            Tutup Periode Aktif &amp; Mulai Baru
          </button>
        </div>
      </div>

      {/* Backup & Restore Data */}
      <div className="farm-card p-5">
        <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
          Backup &amp; Restore Data Usaha
        </h2>
        <p className="mt-1 text-xs text-[#355365] dark:text-[#8BC2CB]">
          Unduh salinan cadangan data periode saat ini dalam format JSON terstruktur atau pulihkan data pembeli/pemasok dengan verifikasi PIN Pemilik.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#167D8D] px-4 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
          >
            <Download className="h-4 w-4" />
            Download Backup JSON
          </button>

          <label className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border border-[#167D8D]/25 bg-white px-4 text-xs font-semibold text-[#071B2B] hover:bg-[#EEEEEE] dark:border-[#B9E4E8]/20 dark:bg-[#113047] dark:text-[#B9E4E8] dark:hover:bg-[#167D8D]/30">
            <Upload className="h-4 w-4" />
            <span>{restoreFileName ? `Restore: ${restoreFileName}` : 'Verifikasi & Restore Backup'}</span>
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => void handleSelectRestoreFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        {onOpenSetupGuide && !data.isLiveSupabase && (
          <div className="mt-4 border-t border-[#167D8D]/20 pt-4 dark:border-[#B9E4E8]/15">
            <button
              type="button"
              onClick={onOpenSetupGuide}
              className="min-h-[40px] rounded-xl border border-[#167D8D]/35 bg-[#B9E4E8]/50 px-4 text-xs font-semibold text-[#071B2B] hover:bg-[#B9E4E8] dark:border-[#B9E4E8]/25 dark:bg-[#167D8D]/25 dark:text-[#B9E4E8] dark:hover:bg-[#167D8D]/40"
            >
              Lihat Panduan Integrasi Database Supabase &amp; SQL Migration
            </button>
          </div>
        )}
      </div>

      <PinConfirmModal
        open={closePeriodPinOpen}
        title="Konfirmasi Tutup Periode & Mulai Baru"
        description={`Periode "${data.activePeriod?.name}" akan ditutup dan periode baru "${newPeriodName}" akan dimulai dengan stok awal ${newPeriodStock} ekor.`}
        requireReason={false}
        confirmLabel="Tutup & Mulai Baru"
        onClose={() => setClosePeriodPinOpen(false)}
        onConfirm={async (pin) => {
          if (!data.activePeriod) {
            throw new Error('Periode aktif tidak ditemukan.');
          }
          await closePeriodAndStartNew(data.isLiveSupabase, {
            currentPeriodId: data.activePeriod.id,
            newPeriodName: newPeriodName.trim(),
            newStartDate: newPeriodStart,
            newInitialStock: Number(newPeriodStock || 0),
            notes: newPeriodNotes.trim() || null,
            operatorName: currentOperator,
            pin,
          });
          setNewPeriodName('');
          setNewPeriodNotes('');
          setFeedback({ type: 'ok', msg: 'Periode baru berhasil dibuka dan histori periode lama tersimpan.' });
          await onRefresh();
        }}
      />

      <PinConfirmModal
        open={restorePinOpen}
        title="Verifikasi Restore Backup Data"
        description={`File "${restoreFileName}" telah lolos validasi struktur RIZKA FARM. Masukkan PIN Pemilik untuk memulihkan data master (pembeli & pemasok) dan mencatat audit log.`}
        requireReason={false}
        confirmLabel="Verifikasi & Restore"
        onClose={() => setRestorePinOpen(false)}
        onConfirm={async (pin) => {
          if (!restoreJson || !data.selectedPeriodId) {
            throw new Error('File backup atau periode aktif belum siap.');
          }
          await verifyAndRestoreBackup(data.isLiveSupabase, {
            periodId: data.selectedPeriodId,
            fileName: restoreFileName,
            jsonText: restoreJson,
            operatorName: currentOperator,
            pin,
          });
          setFeedback({ type: 'ok', msg: 'Data master backup berhasil dipulihkan dan dicatat pada audit log.' });
          await onRefresh();
        }}
      />
    </div>
  );
};
