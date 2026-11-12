/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RotateCcw, X, ShieldAlert } from 'lucide-react';
import { Transaction } from '../../types/database';
import { formatRupiah, formatDateIndo } from '../../lib/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onConfirm: (transactionId: string, reason: string) => void;
}

export const ReversalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  transaction,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !transaction) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Alasan pembuatan transaksi pembalik/koreksi wajib diisi.');
      return;
    }
    onConfirm(transaction.id, reason);
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50/50">
          <div className="flex items-center gap-2 text-amber-800">
            <RotateCcw className="w-5 h-5 shrink-0" />
            <h3 className="font-semibold text-sm md:text-base">Buat Transaksi Pembalik (Koreksi)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs text-amber-900">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
            <div>
              <p className="font-semibold">Prinsip Audit Keuangan Gerejawi</p>
              <p className="mt-0.5 text-amber-800">
                Sesuai standar akuntansi kas, transaksi yang telah disetujui tidak boleh dihapus atau ditimpa langsung.
                Sistem akan membuat transaksi lawan (pembalik) dengan nominal yang sama untuk menetralkan saldo.
              </p>
            </div>
          </div>

          {/* Details of original transaction */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Tanggal:</span>
              <span className="font-medium text-slate-800">{formatDateIndo(transaction.tanggal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nominal:</span>
              <span className="font-semibold text-slate-900">{formatRupiah(transaction.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jenis Asal:</span>
              <span className="capitalize font-medium text-slate-700">{transaction.type.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Uraian Asal:</span>
              <span className="font-medium text-slate-800 block bg-white p-2 rounded-lg border border-slate-200">
                {transaction.description}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Alasan Koreksi / Pembalikan <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              rows={3}
              placeholder="Contoh: Salah memilih tempat penyimpanan atau nominal keliru ketik..."
              className="w-full text-xs md:text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
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
              className="px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Buat Transaksi Pembalik
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
