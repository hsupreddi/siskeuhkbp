/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, X, AlertCircle, Info, Upload, CheckCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { uploadReceiptFile } from '../../lib/supabase';
import { formatRupiah } from '../../lib/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultSourceKasId?: string;
}

export const TransferModal: React.FC<Props> = ({ isOpen, onClose, defaultSourceKasId }) => {
  const { kasList, storageAccounts, createTransfer, isPeriodClosed } = useData();
  const { canInputKas } = useAuth();

  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [sourceKasId, setSourceKasId] = useState<string>('');
  const [sourceStorageId, setSourceStorageId] = useState<string>('');
  const [targetKasId, setTargetKasId] = useState<string>('');
  const [targetStorageId, setTargetStorageId] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const availableSourceKas = kasList.filter((k) => k.is_active && canInputKas(k.id));

  useEffect(() => {
    if (isOpen) {
      setError('');
      setAmountInput('');
      setDescription('');
      setReceiptNo('');
      setAttachmentUrl(null);
      setTanggal(new Date().toISOString().split('T')[0]);

      if (defaultSourceKasId && canInputKas(defaultSourceKasId)) {
        setSourceKasId(defaultSourceKasId);
        setTargetKasId(defaultSourceKasId);
      } else if (availableSourceKas.length > 0) {
        setSourceKasId(availableSourceKas[0].id);
        setTargetKasId(availableSourceKas[0].id);
      }

      if (storageAccounts.length >= 2) {
        setSourceStorageId(storageAccounts[0].id);
        setTargetStorageId(storageAccounts[1].id);
      } else if (storageAccounts.length === 1) {
        setSourceStorageId(storageAccounts[0].id);
        setTargetStorageId(storageAccounts[0].id);
      }
    }
  }, [isOpen, defaultSourceKasId]);

  if (!isOpen) return null;

  const rawAmount = parseFloat(amountInput.replace(/[^0-9]/g, '')) || 0;
  const isSameKas = sourceKasId === targetKasId;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const res = await uploadReceiptFile(file);
    if (res.error) {
      setError(`Gagal mengunggah foto bukti: ${res.error.message}`);
    } else if (res.url) {
      setAttachmentUrl(res.url);
    }
    setUploading(false);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rawAmount <= 0) {
      setError('Nominal transfer harus lebih besar dari Rp 0.');
      return;
    }

    if (!description.trim()) {
      setError('Uraian transfer wajib diisi.');
      return;
    }

    if (isSameKas && sourceStorageId === targetStorageId) {
      setError('Tempat penyimpanan asal dan tujuan tidak boleh sama jika kasnya sama.');
      return;
    }

    const d = new Date(tanggal);
    if (isPeriodClosed(d.getFullYear(), d.getMonth() + 1, sourceKasId)) {
      setError('Periode pada kas pengirim sudah ditutup.');
      return;
    }

    setIsSubmitting(true);

    const result = await createTransfer({
      tanggal,
      sourceKasId,
      sourceStorageId,
      targetKasId,
      targetStorageId,
      amount: rawAmount,
      description: description.trim(),
      receiptNo: receiptNo.trim() || undefined,
      attachmentUrl: attachmentUrl || undefined,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Gagal mengajukan transfer.');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-100 my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-indigo-100 bg-indigo-50/40">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-semibold text-base text-slate-800">Transfer Dana Antar Kas / Rekening</h3>
              <span className="text-xs text-slate-500">Mutasi atomik saldo (tidak mempengaruhi laporan pendapatan/beban)</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleTransfer} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Workflow Info Box */}
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              {isSameKas ? (
                <p>
                  <strong>Transfer Internal Kas:</strong> Memindahkan dana antar rekening dalam kas yang sama (contoh: setor tunai ke bank).
                  Cukup disetujui oleh Ketua Kas ini.
                </p>
              ) : (
                <p>
                  <strong>Transfer Antar Kas Berbeda:</strong> Memerlukan persetujuan 2 pihak:
                  disetujui oleh Ketua Kas Pengirim, lalu dikonfirmasi penerimaannya oleh Ketua Kas Penerima.
                </p>
              )}
            </div>
          </div>

          {/* Nominal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nominal Transfer (Rp) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={amountInput ? Number(amountInput.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0"
                className="w-full pl-11 pr-4 py-3 text-lg font-bold text-slate-800 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-300 font-mono tabular-nums"
                required
              />
            </div>
            {rawAmount > 0 && (
              <span className="text-xs text-slate-500 mt-1 block">
                Terbilang: <span className="font-medium text-slate-700">{formatRupiah(rawAmount)}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Transfer</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-300"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Referensi / Slip</label>
              <input
                type="text"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                placeholder="Contoh: SLIP-BRI-001"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>

          {/* Source Box */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-xs font-bold text-slate-700 block">SUMBER DANA (PENGIRIM)</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Kas Pengirim</label>
                <select
                  value={sourceKasId}
                  onChange={(e) => setSourceKasId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                  required
                >
                  {availableSourceKas.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Tempat Penyimpanan Asal</label>
                <select
                  value={sourceStorageId}
                  onChange={(e) => setSourceStorageId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                  required
                >
                  {storageAccounts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Destination Box */}
          <div className="p-3 rounded-xl bg-indigo-50/30 border border-indigo-200/60 space-y-2">
            <span className="text-xs font-bold text-indigo-900 block">TUJUAN DANA (PENERIMA)</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Kas Penerima</label>
                <select
                  value={targetKasId}
                  onChange={(e) => setTargetKasId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                  required
                >
                  {kasList
                    .filter((k) => k.is_active)
                    .map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">Tempat Penyimpanan Tujuan</label>
                <select
                  value={targetStorageId}
                  onChange={(e) => setTargetStorageId(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                  required
                >
                  {storageAccounts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Uraian */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Uraian / Tujuan Transfer <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Contoh: Setoran tunai pelean minggu ke rekening Bank BRI, atau Bantuan subsidi dari Kas Umum ke Kas Diakonia..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-300"
              required
            />
          </div>

          {/* Optional Slip Photo */}
          <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700">Foto Slip Setoran / Bukti Transfer</span>
              {attachmentUrl && (
                <button
                  type="button"
                  onClick={() => setAttachmentUrl(null)}
                  className="text-xs text-rose-500 hover:text-rose-700"
                >
                  Hapus
                </button>
              )}
            </div>
            {attachmentUrl ? (
              <div className="flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle className="w-4 h-4" />
                <span>Foto slip transfer tersimpan</span>
              </div>
            ) : (
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-50 shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Unggah Slip</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            )}
          </div>

          {/* Submit buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
            >
              Ajukan Transfer Dana
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
