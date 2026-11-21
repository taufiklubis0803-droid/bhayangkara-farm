import React, { useState } from 'react';
import { Lock, X, AlertCircle } from 'lucide-react';

interface PinConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  requireReason?: boolean;
  reasonLabel?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (pin: string, reason: string) => Promise<void>;
}

export const PinConfirmModal: React.FC<PinConfirmModalProps> = ({
  open,
  title,
  description,
  requireReason = true,
  reasonLabel = 'Alasan Perubahan / Penghapusan',
  confirmLabel = 'Verifikasi & Lanjutkan',
  onClose,
  onConfirm,
}) => {
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pin.trim()) {
      setError('PIN Pemilik wajib diisi.');
      return;
    }
    if (requireReason && !reason.trim()) {
      setError('Alasan wajib diisi untuk pencatatan audit log.');
      return;
    }
    setLoading(true);
    try {
      await onConfirm(pin.trim(), reason.trim());
      setPin('');
      setReason('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verifikasi PIN gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071B2B]/75 p-4 backdrop-blur-xs">
      <div className="farm-card w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-[#071B2B] dark:text-[#B9E4E8]">
                {title}
              </h3>
              <p className="text-xs text-[#355365] dark:text-[#8BC2CB]">
                Perlindungan Keamanan Pemilik
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#355365] hover:bg-[#EEEEEE] hover:text-[#071B2B] dark:text-[#B9E4E8] dark:hover:bg-[#113047]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#355365] dark:text-[#B9E4E8]/85">
          {description}
        </p>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {requireReason && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#B9E4E8]">
                {reasonLabel} <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Contoh: Salah input jumlah ekor saat penimbangan"
                className="min-h-[44px] w-full rounded-xl border border-[#167D8D]/25 px-3.5 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-[#071B2B] dark:text-[#B9E4E8]">
              PIN Pemilik <span className="text-red-600">*</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Masukkan PIN Pemilik"
              className="min-h-[44px] w-full rounded-xl border border-[#167D8D]/25 px-3.5 py-2 font-mono text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] rounded-xl border border-[#167D8D]/25 px-4 py-2 text-xs font-semibold text-[#071B2B] hover:bg-[#EEEEEE] dark:border-[#B9E4E8]/30 dark:text-[#B9E4E8] dark:hover:bg-[#113047]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[42px] rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? 'Memproses...' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
