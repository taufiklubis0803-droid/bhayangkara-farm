import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, MapPin, Plus, Save, UserCheck } from 'lucide-react';
import type { FarmDataState } from '../hooks/useFarmData';
import { addBranchEmployee, updateEmployeeProfile } from '../services/farmService';
import type { Employee } from '../types/database';
import { formatDateID, formatRupiah } from '../utils/format';

interface EmployeesPageProps {
  data: FarmDataState;
  onRefresh: () => Promise<void>;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({ data, onRefresh }) => {
  const [editing, setEditing] = useState<Record<string, Partial<Employee>>>({});
  const [filterOperator, setFilterOperator] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!data.selectedBranchId) {
      setFeedback({
        type: 'err',
        msg: 'Cabang aktif belum termuat. Muat ulang halaman atau periksa koneksi Supabase.',
      });
      return;
    }
    setAddingEmployee(true);
    try {
      await addBranchEmployee(data.isLiveSupabase, {
        branchId: data.selectedBranchId,
        name: newName,
        position: newPosition,
        monthlySalary: Number(newSalary || 0),
        phone: newPhone.trim() || null,
      });
      setNewName('');
      setNewPosition('');
      setNewSalary('');
      setNewPhone('');
      setShowAddForm(false);
      setFeedback({
        type: 'ok',
        msg: `Karyawan baru berhasil ditambahkan untuk ${data.selectedBranch?.name ?? 'cabang ini'}.`,
      });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Gagal menambah karyawan.' });
    } finally {
      setAddingEmployee(false);
    }
  };

  const handleField = (id: string, key: keyof Employee, value: string | number) => {
    setEditing((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), [key]: value },
    }));
  };

  const handleSaveEmployee = async (emp: Employee) => {
    setFeedback(null);
    setSavingId(emp.id);
    const patch = editing[emp.id] ?? {};
    const newName = (patch.name ?? emp.name).trim();
    const newPos = (patch.position ?? emp.position).trim();
    const newSalary = Number(patch.monthly_salary ?? emp.monthly_salary);
    const newPhone = (patch.phone ?? emp.phone ?? '').trim() || null;

    try {
      await updateEmployeeProfile(data.isLiveSupabase, emp, {
        name: newName,
        position: newPos,
        monthly_salary: newSalary,
        phone: newPhone,
      });

      setFeedback({ type: 'ok', msg: `Profil ${newName} berhasil diperbarui.` });
      await onRefresh();
    } catch (err) {
      setFeedback({ type: 'err', msg: err instanceof Error ? err.message : 'Gagal menyimpan.' });
    } finally {
      setSavingId(null);
    }
  };

  // Gabungan laporan aktivitas operator (transaksi + aktivitas kandang + pergerakan stok)
  const operatorActivitySummary = useMemo(() => {
    const counts = new Map<
      string,
      { operator: string; txCount: number; activityCount: number; stockCount: number }
    >();

    const ensure = (name: string) => {
      if (!counts.has(name)) {
        counts.set(name, { operator: name, txCount: 0, activityCount: 0, stockCount: 0 });
      }
      return counts.get(name)!;
    };

    for (const t of data.transactions) {
      if (t.is_deleted) continue;
      if (filterDate && t.tx_date !== filterDate) continue;
      if (filterOperator !== 'all' && t.operator_name !== filterOperator) continue;
      ensure(t.operator_name).txCount += 1;
    }

    for (const a of data.farmActivities) {
      if (filterDate && a.activity_date !== filterDate) continue;
      if (filterOperator !== 'all' && a.operator_name !== filterOperator) continue;
      ensure(a.operator_name).activityCount += 1;
    }

    for (const m of data.stockMovements) {
      if (m.is_reversed) continue;
      if (filterDate && m.movement_date !== filterDate) continue;
      if (filterOperator !== 'all' && m.operator_name !== filterOperator) continue;
      ensure(m.operator_name).stockCount += 1;
    }

    return Array.from(counts.values());
  }, [data, filterDate, filterOperator]);

  const filteredActivities = useMemo(() => {
    return data.farmActivities.filter((a) => {
      if (filterDate && a.activity_date !== filterDate) return false;
      if (filterOperator !== 'all' && a.operator_name !== filterOperator) return false;
      return true;
    });
  }, [data.farmActivities, filterDate, filterOperator]);

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

      {/* Header Cabang & Tambah Karyawan */}
      <div className="farm-card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <MapPin className="h-5 w-5 text-[#167D8D] dark:text-[#B9E4E8]" />
          <div>
            <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              Daftar Karyawan — {data.selectedBranch?.name ?? 'Cabang Aktif'}
            </h2>
            <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
              Setiap cabang memiliki tim karyawan &amp; daftar operator pencatat masing-masing ({data.employees.length} orang terdaftar).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((prev) => !prev)}
          className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#167D8D] px-3.5 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
        >
          <Plus className="h-4 w-4" />
          <span>{showAddForm ? 'Tutup Form' : 'Tambah Karyawan Cabang Ini'}</span>
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddEmployee} className="farm-card p-5">
          <h3 className="mb-3 font-display text-sm font-bold text-[#071B2B] dark:text-[#EEEEEE]">
            Tambah Karyawan Baru ({data.selectedBranch?.name})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold">Nama Karyawan *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nama lengkap / panggilan"
                className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Jabatan / Tugas</label>
              <input
                type="text"
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                placeholder="Perawatan & Pakan"
                className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Gaji Bulanan (Rp)</label>
              <input
                type="number"
                min={0}
                value={newSalary}
                onChange={(e) => setNewSalary(e.target.value)}
                placeholder="0"
                className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">Nomor Handphone</label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="min-h-[40px] rounded-xl border border-[#167D8D]/25 px-4 text-xs font-semibold text-[#355365] hover:bg-[#EEEEEE] dark:border-[#B9E4E8]/25 dark:text-[#8BC2CB] dark:hover:bg-[#113047]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={addingEmployee}
              className="min-h-[40px] rounded-xl bg-[#167D8D] px-4 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
            >
              {addingEmployee ? 'Menyimpan...' : 'Simpan Karyawan'}
            </button>
          </div>
        </form>
      )}

      {/* Daftar Profil Karyawan Cabang */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.employees.map((emp) => {
          const patch = editing[emp.id] ?? {};
          return (
            <div key={emp.id} className="farm-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-[#167D8D] dark:text-[#B9E4E8]" />
                  <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
                    Karyawan {emp.slot_number} — {data.selectedBranch?.city ?? 'Cabang'}
                  </h2>
                </div>
                <span className="font-mono text-xs text-[#355365] dark:text-[#8BC2CB]">
                  Gaji: {formatRupiah(patch.monthly_salary ?? emp.monthly_salary)}/bln
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Nama Karyawan</label>
                  <input
                    type="text"
                    value={String(patch.name ?? emp.name)}
                    onChange={(e) => handleField(emp.id, 'name', e.target.value)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Jabatan / Tugas</label>
                  <input
                    type="text"
                    value={String(patch.position ?? emp.position)}
                    onChange={(e) => handleField(emp.id, 'position', e.target.value)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Gaji Bulanan (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={Number(patch.monthly_salary ?? emp.monthly_salary)}
                    onChange={(e) => handleField(emp.id, 'monthly_salary', Number(e.target.value))}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Nomor Telepon</label>
                  <input
                    type="text"
                    value={String(patch.phone ?? emp.phone ?? '')}
                    onChange={(e) => handleField(emp.id, 'phone', e.target.value)}
                    className="min-h-[42px] w-full rounded-xl border border-slate-300 px-3 text-sm"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={savingId === emp.id}
                  onClick={() => handleSaveEmployee(emp)}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#167D8D] px-4 text-xs font-semibold text-white hover:bg-[#071B2B] dark:bg-[#B9E4E8] dark:text-[#071B2B] dark:hover:bg-[#EEEEEE]"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingId === emp.id ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Laporan Aktivitas Berdasarkan Operator */}
      <div className="farm-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-sm font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              Laporan Aktivitas Berdasarkan Operator
            </h3>
            <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
              Rekap pencatatan transaksi, perawatan kandang, dan pergerakan stok per operator
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterOperator}
              onChange={(e) => setFilterOperator(e.target.value)}
              className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3 text-xs dark:bg-[#091D2E]"
            >
              <option value="all">Semua Operator</option>
              {data.operators.map((op) => (
                <option key={op.id} value={op.display_name}>
                  {op.display_name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="min-h-[38px] rounded-lg border border-slate-300 px-3 text-xs"
            />
            {filterDate && (
              <button
                type="button"
                onClick={() => setFilterDate('')}
                className="rounded-lg bg-[#EEEEEE] px-2.5 text-xs font-medium text-[#071B2B] dark:bg-[#113047] dark:text-[#B9E4E8]"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {operatorActivitySummary.map((row) => (
            <div key={row.operator} className="farm-subcard p-3.5 text-xs">
              <div className="font-bold text-[#071B2B] dark:text-[#EEEEEE]">{row.operator}</div>
              <div className="mt-2 flex justify-between text-[#355365] dark:text-[#8BC2CB]">
                <span>Transaksi Keuangan</span>
                <span className="font-mono font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  {row.txCount}
                </span>
              </div>
              <div className="flex justify-between text-[#355365] dark:text-[#8BC2CB]">
                <span>Aktivitas Kandang</span>
                <span className="font-mono font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  {row.activityCount}
                </span>
              </div>
              <div className="flex justify-between text-[#355365] dark:text-[#8BC2CB]">
                <span>Pergerakan Stok</span>
                <span className="font-mono font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                  {row.stockCount}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#167D8D]/20 text-[#355365] dark:border-[#B9E4E8]/15 dark:text-[#8BC2CB]">
                <th className="py-2 pr-3 font-semibold">Tanggal</th>
                <th className="py-2 pr-3 font-semibold">Operator</th>
                <th className="py-2 pr-3 font-semibold">Jenis Pekerjaan</th>
                <th className="py-2 font-semibold">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#167D8D]/10 dark:divide-[#B9E4E8]/10">
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#355365] dark:text-[#8BC2CB]">
                    Tidak ada aktivitas kandang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-[#EEEEEE]/70 dark:hover:bg-[#113047]/65">
                    <td className="py-2.5 pr-3 font-mono">{formatDateID(act.activity_date)}</td>
                    <td className="py-2.5 pr-3 font-semibold text-[#071B2B] dark:text-[#B9E4E8]">
                      {act.operator_name}
                    </td>
                    <td className="py-2.5 pr-3">{act.title}</td>
                    <td className="py-2.5 text-[#355365] dark:text-[#8BC2CB]">
                      {act.description || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
