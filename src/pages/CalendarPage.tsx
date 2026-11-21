import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { FarmDataState } from '../hooks/useFarmData';
import {
  BULAN_INDONESIA,
  formatDateID,
  formatNumber,
  formatRupiah,
  todayJakarta,
} from '../utils/format';

interface CalendarPageProps {
  data: FarmDataState;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ data }) => {
  const today = todayJakarta();
  const [selectedYear, setSelectedYear] = useState(Number(today.slice(0, 4)));
  const [selectedMonth, setSelectedMonth] = useState(Number(today.slice(5, 7)) - 1);
  const [selectedDate, setSelectedDate] = useState(today);

  const daysInMonth = useMemo(() => {
    return new Date(Date.UTC(selectedYear, selectedMonth + 1, 0)).getUTCDate();
  }, [selectedYear, selectedMonth]);

  const firstWeekday = useMemo(() => {
    const jsDay = new Date(Date.UTC(selectedYear, selectedMonth, 1)).getUTCDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }, [selectedYear, selectedMonth]);

  const activeDatesSet = useMemo(() => {
    const prefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
    const set = new Set<string>();
    for (const t of data.transactions) {
      if (!t.is_deleted && t.tx_date.startsWith(prefix)) set.add(t.tx_date);
    }
    for (const m of data.stockMovements) {
      if (!m.is_reversed && m.movement_date.startsWith(prefix)) set.add(m.movement_date);
    }
    for (const fm of data.feedMovements) {
      if (!fm.is_reversed && fm.movement_date.startsWith(prefix)) set.add(fm.movement_date);
    }
    for (const act of data.farmActivities) {
      if (act.activity_date.startsWith(prefix)) set.add(act.activity_date);
    }
    return set;
  }, [data, selectedYear, selectedMonth]);

  const dayDetail = useMemo(() => {
    const dayTx = data.transactions.filter((t) => !t.is_deleted && t.tx_date === selectedDate);
    const income = dayTx
      .filter((t) => t.tx_type === 'income')
      .reduce((s, t) => s + Number(t.amount), 0);
    const expense = dayTx
      .filter((t) => t.tx_type === 'expense')
      .reduce((s, t) => s + Number(t.amount), 0);

    const dayMoves = data.stockMovements.filter(
      (m) => !m.is_reversed && m.movement_date === selectedDate
    );
    const chicksIn = dayMoves
      .filter((m) => m.movement_type === 'masuk')
      .reduce((s, m) => s + m.quantity, 0);
    const chicksSold = dayMoves
      .filter((m) => m.movement_type === 'terjual')
      .reduce((s, m) => s + m.quantity, 0);
    const chicksDead = dayMoves
      .filter((m) => m.movement_type === 'mati')
      .reduce((s, m) => s + m.quantity, 0);

    const feedUsedKg = data.feedMovements
      .filter((f) => !f.is_reversed && f.movement_type === 'pakai' && f.movement_date === selectedDate)
      .reduce((s, f) => s + Number(f.weight_kg), 0);

    const activities = data.farmActivities.filter((a) => a.activity_date === selectedDate);

    const operatorSet = new Set<string>();
    dayTx.forEach((t) => operatorSet.add(t.operator_name));
    dayMoves.forEach((m) => operatorSet.add(m.operator_name));
    activities.forEach((a) => operatorSet.add(a.operator_name));

    return {
      dayTx,
      income,
      expense,
      profit: income - expense,
      chicksIn,
      chicksSold,
      chicksDead,
      feedUsedKg,
      activities,
      operators: Array.from(operatorSet),
    };
  }, [data, selectedDate]);

  return (
    <div className="space-y-6">
      {/* Kontrol Tahun & Bulan Januari - Desember */}
      <div className="farm-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y - 1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#167D8D]/20 bg-[#EEEEEE] text-[#071B2B] hover:border-[#167D8D] dark:border-[#B9E4E8]/20 dark:bg-[#113047] dark:text-[#B9E4E8] dark:hover:border-[#B9E4E8]/60"
              aria-label="Tahun sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-mono text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              {selectedYear}
            </span>
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#167D8D]/20 bg-[#EEEEEE] text-[#071B2B] hover:border-[#167D8D] dark:border-[#B9E4E8]/20 dark:bg-[#113047] dark:text-[#B9E4E8] dark:hover:border-[#B9E4E8]/60"
              aria-label="Tahun berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedYear(Number(today.slice(0, 4)));
              setSelectedMonth(Number(today.slice(5, 7)) - 1);
              setSelectedDate(today);
            }}
            className="min-h-[38px] rounded-xl border border-[#167D8D]/35 bg-[#B9E4E8]/55 px-3.5 text-xs font-semibold text-[#071B2B] hover:bg-[#B9E4E8] dark:border-[#B9E4E8]/25 dark:bg-[#167D8D]/30 dark:text-[#B9E4E8] dark:hover:bg-[#167D8D]/45"
          >
            Hari Ini ({formatDateID(today)})
          </button>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-12">
          {BULAN_INDONESIA.map((bulan, idx) => (
            <button
              key={bulan}
              type="button"
              onClick={() => setSelectedMonth(idx)}
              className={`min-h-[36px] rounded-lg px-2 text-xs font-semibold transition-all ${
                selectedMonth === idx
                  ? 'bg-[#167D8D] text-white shadow-xs dark:bg-[#B9E4E8] dark:text-[#071B2B]'
                  : 'bg-[#EEEEEE] text-[#355365] hover:text-[#071B2B] dark:bg-[#113047] dark:text-[#8BC2CB] dark:hover:text-[#EEEEEE]'
              }`}
            >
              {bulan.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Kalender & Panel Detail Tanggal */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="farm-card p-5 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              {BULAN_INDONESIA[selectedMonth]} {selectedYear}
            </h2>
            <span className="text-xs text-[#355365] dark:text-[#8BC2CB]">
              Klik tanggal untuk lihat rincian
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-[#355365] dark:text-[#8BC2CB]">
            <div>Sen</div>
            <div>Sel</div>
            <div>Rab</div>
            <div>Kam</div>
            <div>Jum</div>
            <div>Sab</div>
            <div>Min</div>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className="h-12" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(
                dayNum
              ).padStart(2, '0')}`;
              const hasActivity = activeDatesSet.has(dateStr);
              const isSelected = selectedDate === dateStr;
              const isToday = today === dateStr;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative flex h-12 flex-col items-center justify-center rounded-xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? 'border-[#167D8D] bg-[#167D8D] text-white shadow-sm dark:border-[#B9E4E8] dark:bg-[#B9E4E8] dark:text-[#071B2B]'
                      : isToday
                      ? 'border-[#D4A359] bg-[#D4A359]/15 text-[#071B2B] dark:text-[#B9E4E8]'
                      : 'border-[#167D8D]/20 bg-white text-[#071B2B] hover:border-[#167D8D]/60 hover:bg-[#EEEEEE] dark:border-[#B9E4E8]/15 dark:bg-[#091D2E] dark:text-[#EEEEEE] dark:hover:bg-[#113047]'
                  }`}
                >
                  <span className="font-mono">{dayNum}</span>
                  {hasActivity && (
                    <span
                      className={`mt-0.5 text-[9px] font-semibold ${
                        isSelected ? 'text-[#B9E4E8] dark:text-[#071B2B]' : 'text-[#167D8D] dark:text-[#B9E4E8]'
                      }`}
                    >
                      Aktif
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail Tanggal Terpilih */}
        <div className="farm-card p-5 lg:col-span-5">
          <div className="border-b border-[#167D8D]/20 pb-3 dark:border-[#B9E4E8]/15">
            <div className="text-xs text-[#355365] dark:text-[#8BC2CB]">Ringkasan Harian</div>
            <h3 className="font-display text-lg font-bold text-[#071B2B] dark:text-[#EEEEEE]">
              Tanggal {formatDateID(selectedDate)}
            </h3>
          </div>

          <div className="mt-4 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#355365] dark:text-[#8BC2CB]">Pemasukan</span>
              <span className="font-mono font-bold text-[#167D8D] tabular-nums dark:text-[#B9E4E8]">
                {formatRupiah(dayDetail.income)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#355365] dark:text-[#8BC2CB]">Pengeluaran</span>
              <span className="font-mono font-bold text-red-600 tabular-nums dark:text-rose-400">
                {formatRupiah(dayDetail.expense)}
              </span>
            </div>
            <div className="flex justify-between border-b border-[#167D8D]/20 pb-2.5 dark:border-[#B9E4E8]/15">
              <span className="font-semibold text-[#071B2B] dark:text-[#EEEEEE]">
                Keuntungan Bersih
              </span>
              <span
                className={`font-mono font-bold tabular-nums ${
                  dayDetail.profit >= 0
                    ? 'text-[#167D8D] dark:text-[#B9E4E8]'
                    : 'text-red-600 dark:text-rose-400'
                }`}
              >
                {formatRupiah(dayDetail.profit)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="farm-subcard p-2.5">
                <div className="text-[11px] text-[#355365] dark:text-[#8BC2CB]">Ayam Masuk</div>
                <div className="font-mono font-bold text-[#167D8D] dark:text-[#B9E4E8]">
                  {dayDetail.chicksIn} ekor
                </div>
              </div>
              <div className="farm-subcard p-2.5">
                <div className="text-[11px] text-[#355365] dark:text-[#8BC2CB]">Ayam Terjual</div>
                <div className="font-mono font-bold text-[#D4A359]">{dayDetail.chicksSold} ekor</div>
              </div>
              <div className="farm-subcard p-2.5">
                <div className="text-[11px] text-[#355365] dark:text-[#8BC2CB]">Ayam Mati</div>
                <div className="font-mono font-bold text-red-600 dark:text-rose-400">
                  {dayDetail.chicksDead} ekor
                </div>
              </div>
              <div className="farm-subcard p-2.5">
                <div className="text-[11px] text-[#355365] dark:text-[#8BC2CB]">Pemakaian Pakan</div>
                <div className="font-mono font-bold text-[#071B2B] dark:text-[#EEEEEE]">
                  {formatNumber(dayDetail.feedUsedKg, 1)} kg
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-[11px] font-semibold text-[#355365] dark:text-[#8BC2CB]">
                Operator Terlibat:
              </div>
              <div className="mt-1 text-xs font-medium text-[#071B2B] dark:text-[#EEEEEE]">
                {dayDetail.operators.length > 0 ? dayDetail.operators.join(' · ') : 'Tidak ada catatan'}
              </div>
            </div>

            <div className="pt-2">
              <div className="text-[11px] font-semibold text-[#355365] dark:text-[#8BC2CB]">
                Transaksi &amp; Aktivitas ({dayDetail.dayTx.length + dayDetail.activities.length})
              </div>
              <div className="mt-2 max-h-52 space-y-1.5 overflow-y-auto">
                {dayDetail.dayTx.map((t) => (
                  <div
                    key={t.id}
                    className="farm-subcard flex items-center justify-between px-2.5 py-2"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate font-medium text-[#071B2B] dark:text-[#EEEEEE]">
                        {t.title}
                      </div>
                      <div className="text-[10px] text-[#355365] dark:text-[#8BC2CB]">
                        {t.operator_name}
                      </div>
                    </div>
                    <span
                      className={`font-mono font-semibold tabular-nums whitespace-nowrap ${
                        t.tx_type === 'income'
                          ? 'text-[#167D8D] dark:text-[#B9E4E8]'
                          : 'text-red-600 dark:text-rose-400'
                      }`}
                    >
                      {t.tx_type === 'income' ? '+' : '-'}
                      {formatRupiah(t.amount)}
                    </span>
                  </div>
                ))}
                {dayDetail.activities.map((a) => (
                  <div key={a.id} className="farm-subcard px-2.5 py-2">
                    <div className="font-medium text-[#071B2B] dark:text-[#EEEEEE]">{a.title}</div>
                    <div className="text-[10px] text-[#355365] dark:text-[#8BC2CB]">
                      {a.description || '-'} · {a.operator_name}
                    </div>
                  </div>
                ))}
                {dayDetail.dayTx.length === 0 && dayDetail.activities.length === 0 && (
                  <div className="py-4 text-center text-[#355365] dark:text-[#8BC2CB]">
                    Tidak ada aktivitas tercatat pada tanggal ini.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
