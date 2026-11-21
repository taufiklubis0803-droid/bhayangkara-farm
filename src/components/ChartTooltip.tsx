import React from 'react';
import { formatNumber, formatRupiah } from '../utils/format';

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
}

interface CustomChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  valueType?: 'rupiah' | 'ekor' | 'kg';
}

export const CustomChartTooltip: React.FC<CustomChartTooltipProps> = ({
  active,
  payload,
  label,
  valueType = 'rupiah',
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const formatVal = (val: number | string | undefined) => {
    const num = Number(val ?? 0);
    if (valueType === 'ekor') return `${formatNumber(num)} ekor`;
    if (valueType === 'kg') return `${formatNumber(num, 3)} kg`;
    return formatRupiah(num);
  };

  return (
    <div className="min-w-[170px] rounded-xl border border-[#167D8D]/35 bg-white/95 px-3.5 py-2.5 text-xs shadow-lg backdrop-blur-md dark:border-[#B9E4E8]/35 dark:bg-[#071B2B]/95">
      {label && (
        <div className="mb-1.5 border-b border-[#167D8D]/20 pb-1 font-display font-bold text-[#071B2B] dark:border-[#B9E4E8]/20 dark:text-[#B9E4E8]">
          {label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={`${entry.name ?? idx}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#355365] dark:text-[#B9E4E8]/85">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color || '#167D8D' }}
              />
              {entry.name}
            </span>
            <span className="font-mono font-bold text-[#071B2B] tabular-nums dark:text-[#EEEEEE]">
              {formatVal(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
