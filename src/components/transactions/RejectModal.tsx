/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  transactionDescription?: string;
  transactionAmount?: number;
}

export const RejectModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  transactionDescription,
  transactionAmount,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Catatan penolakan wajib diisi agar penginput memahami alasan penolakan.');
      return;
    }
    onConfirm(reason);
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/50">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="font-semibold text-sm md:text-base">Tolak Pengajuan Transaksi</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="font-semibold block text-slate-800 mb-1">{transactionDescription}</span>
            {transactionAmount !== undefined && (
              <span className="text-rose-600 font-semibold block">
                Nominal: Rp {transactionAmount.toLocaleString('id-ID')}
              </span>
            )}
            <p className="mt-1 text-slate-500">
              Transaksi yang ditolak akan dikembalikan ke status Ditolak dan dapat diperbaiki atau dihapus oleh penginput.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Catatan / Alasan Penolakan <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              rows={3}
              placeholder="Contoh: Lampiran kuitansi belum distempel toko, atau pos anggaran tidak sesuai..."
              className="w-full text-xs md:text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
              required
            />
            {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs"
            >
              Tolak Transaksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
