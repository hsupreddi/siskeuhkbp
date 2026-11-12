/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Camera, Upload, X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { uploadReceiptFile } from '../../lib/supabase';
import { formatRupiah } from '../../lib/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultKasId?: string;
}

export const TransactionModal: React.FC<Props> = ({ isOpen, onClose, defaultKasId }) => {
  const { kasList, storageAccounts, categories, settings, addTransaction, isPeriodClosed } = useData();
  const { currentUser, canInputKas } = useAuth();

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [kasId, setKasId] = useState<string>('');
  const [storageAccountId, setStorageAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [amountInput, setAmountInput] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [receiptNo, setReceiptNo] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Available kas where current user has permission to input
  const selectableKas = kasList.filter((k) => k.is_active && canInputKas(k.id));

  useEffect(() => {
    if (isOpen) {
      setError('');
      setAmountInput('');
      setDescription('');
      setReceiptNo('');
      setAttachmentUrl(null);
      setTanggal(new Date().toISOString().split('T')[0]);

      // Pick default kas
      if (defaultKasId && canInputKas(defaultKasId)) {
        setKasId(defaultKasId);
      } else if (selectableKas.length > 0) {
        setKasId(selectableKas[0].id);
      }

      if (storageAccounts.length > 0) {
        setStorageAccountId(storageAccounts[0].id);
      }
    }
  }, [isOpen, defaultKasId]);

  // Set default category when type or kas changes
  useEffect(() => {
    const validCategories = categories.filter((c) => c.tipe === type && c.is_active);
    if (validCategories.length > 0) {
      setCategoryId(validCategories[0].id);
    } else {
      setCategoryId('');
    }
  }, [type, categories]);

  if (!isOpen) return null;

  const rawAmount = parseFloat(amountInput.replace(/[^0-9]/g, '')) || 0;
  const isReceiptMandatory = type === 'expense' && rawAmount >= settings.receipt_required_threshold;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    const res = await uploadReceiptFile(file);
    if (res.error) {
      setError(`Gagal mengunggah foto nota: ${res.error.message}`);
    } else if (res.url) {
      setAttachmentUrl(res.url);
    }
    setUploading(false);
  };

  const handleSave = async (submitDirectly: boolean) => {
    setError('');

    if (rawAmount <= 0) {
      setError('Nominal harus lebih besar dari Rp 0.');
      return;
    }

    if (!description.trim()) {
      setError('Uraian transaksi wajib diisi secara jelas.');
      return;
    }

    if (!kasId) {
      setError('Pilih Kas yang dituju.');
      return;
    }

    if (!storageAccountId) {
      setError('Pilih Tempat Penyimpanan (Tunai/Bank).');
      return;
    }

    if (isReceiptMandatory && !attachmentUrl) {
      setError(`Pengeluaran sebesar ${formatRupiah(rawAmount)} melebihi batas ${formatRupiah(settings.receipt_required_threshold)}, wajib menyertakan foto nota bukti.`);
      return;
    }

    const d = new Date(tanggal);
    if (isPeriodClosed(d.getFullYear(), d.getMonth() + 1, kasId)) {
      setError(`Bulan ${d.getMonth() + 1} tahun ${d.getFullYear()} untuk kas ini sudah ditutup bukunya.`);
      return;
    }

    setIsSubmitting(true);

    const selectedCat = categories.find((c) => c.id === categoryId);
    const isExcluded = type === 'income' && selectedCat ? selectedCat.is_sentralisasi === false : false;
    const bpskAmt = type === 'income' ? (isExcluded ? 0 : Math.round(rawAmount * 0.55)) : 0;
    const huriaAmt = type === 'income' ? (isExcluded ? rawAmount : rawAmount - bpskAmt) : 0;

    const result = await addTransaction({
      tanggal,
      kas_id: kasId,
      storage_account_id: storageAccountId,
      category_id: categoryId || null,
      type,
      amount: rawAmount,
      description: description.trim(),
      receipt_no: receiptNo.trim() || undefined,
      attachment_url: attachmentUrl,
      status: submitDirectly ? 'submitted' : 'draft',
      is_sentralisasi: type === 'income' ? !isExcluded : false,
      bpsk_rate: type === 'income' ? (isExcluded ? 0 : 0.55) : undefined,
      huria_rate: type === 'income' ? (isExcluded ? 1.0 : 0.45) : undefined,
      bpsk_amount: type === 'income' ? bpskAmt : undefined,
      huria_amount: type === 'income' ? huriaAmt : undefined,
      sentralisasi_exclusion_type: isExcluded ? (selectedCat?.sentralisasi_exclusion_type || null) : null,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Terjadi kesalahan saat menyimpan transaksi.');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="font-semibold text-base text-slate-800">Catat Transaksi Keuangan</h3>
            <span className="text-xs text-slate-500">Pencatatan kas masuk dan kas keluar HKBP Hutaraja</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Toggle: Pemasukan / Pengeluaran */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              + Pemasukan (Kas Masuk)
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              - Pengeluaran (Kas Keluar)
            </button>
          </div>

          {/* Nominal Input (Large, Touch friendly) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nominal Transaksi (Rp) <span className="text-rose-500">*</span>
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
                className="w-full pl-11 pr-4 py-3 text-lg font-bold text-slate-800 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary font-mono tabular-nums"
                autoFocus
              />
            </div>
            {rawAmount > 0 && (
              <span className="text-xs text-slate-500 mt-1 block">
                Terbilang: <span className="font-medium text-slate-700">{formatRupiah(rawAmount)}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Tanggal */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Transaksi <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
                required
              />
            </div>

            {/* Nomor Bukti */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Bukti / Kuitansi (Opsional)
              </label>
              <input
                type="text"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                placeholder="Contoh: BKM-01 / KW-10"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
          </div>

          {/* Kas Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kas (Dana Seksi/Sektor) <span className="text-rose-500">*</span>
            </label>
            <select
              value={kasId}
              onChange={(e) => setKasId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white"
              required
            >
              {selectableKas.length === 0 ? (
                <option value="">Anda belum ditugaskan pada kas mana pun</option>
              ) : (
                selectableKas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama} ({k.kode})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Tempat Penyimpanan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tempat Penyimpanan (Rekening) <span className="text-rose-500">*</span>
              </label>
              <select
                value={storageAccountId}
                onChange={(e) => setStorageAccountId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white"
                required
              >
                {storageAccounts
                  .filter((s) => s.is_active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.tipe === 'cash' ? 'Tunai' : 'Bank'})
                    </option>
                  ))}
              </select>
            </div>

            {/* Kategori */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white"
                required
              >
                {type === 'income' ? (
                  <>
                    <optgroup label="Objek Sentralisasi (55% Kas Pusat BPSK / 45% Huria)">
                      {categories
                        .filter((c) => c.tipe === 'income' && c.is_active && c.is_sentralisasi !== false)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nama} [55% BPSK : 45% Huria]
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="❌ Dikecualikan dari Sentralisasi (100% Kas Huria / Khusus)">
                      {categories
                        .filter((c) => c.tipe === 'income' && c.is_active && c.is_sentralisasi === false)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nama} [100% Bebas Sentralisasi]
                          </option>
                        ))}
                    </optgroup>
                  </>
                ) : (
                  categories
                    .filter((c) => c.tipe === 'expense' && c.is_active)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama}
                      </option>
                    ))
                )}
              </select>
            </div>
          </div>

          {/* Live PPKU Sentralisasi HKBP Calculation Preview Card */}
          {type === 'income' && (
            (() => {
              const currentCat = categories.find((c) => c.id === categoryId);
              const isObjek = currentCat ? currentCat.is_sentralisasi !== false : true;
              const bpskAmount = isObjek ? Math.round(rawAmount * 0.55) : 0;
              const huriaAmount = isObjek ? rawAmount - bpskAmount : rawAmount;

              return (
                <div
                  className={`p-3.5 rounded-2xl border text-xs transition-all ${
                    isObjek
                      ? 'bg-gradient-to-br from-indigo-50/90 via-blue-50/50 to-white border-blue-200/90 shadow-2xs'
                      : 'bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white border-emerald-200/90 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isObjek
                            ? 'bg-blue-700 text-white shadow-xs'
                            : 'bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        {isObjek ? 'PPKU Sentralisasi: 55% / 45%' : '❌ Bebas Sentralisasi: 100% Huria'}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700">
                        {isObjek ? 'Objek Sentralisasi Keuangan HKBP' : 'Pos Pengecualian PPKU HKBP'}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 hidden sm:inline">
                      PPKU Sentralisasi HKBP
                    </span>
                  </div>

                  {isObjek ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-600">
                        Sesuai PPKU HKBP, penerimaan ini otomatis dibagi <strong>55% ke Kas Pusat (BPSK)</strong> dan <strong>45% ke Kas Huria</strong>:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/95 p-2.5 rounded-xl border border-blue-200 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-blue-700 uppercase">55% Kas Pusat BPSK</span>
                            <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-semibold">Wajib Setor</span>
                          </div>
                          <div className="text-base font-extrabold text-blue-900 mt-1">
                            {formatRupiah(bpskAmount)}
                          </div>
                          <div className="text-[9px] text-slate-500 mt-0.5">Badan Pengelola Sentralisasi Keuangan</div>
                        </div>
                        <div className="bg-white/95 p-2.5 rounded-xl border border-indigo-200 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-indigo-700 uppercase">45% Kas Huria</span>
                            <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-semibold">Tinggal di Huria</span>
                          </div>
                          <div className="text-base font-extrabold text-indigo-900 mt-1">
                            {formatRupiah(huriaAmount)}
                          </div>
                          <div className="text-[9px] text-slate-500 mt-0.5">Operasional & Pelayanan Huria Lokal</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/95 p-3 rounded-xl border border-emerald-200 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1.5">
                            <span>100% Dikelola Penuh di Kas Huria</span>
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">Bebas Potongan 55%</span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            {currentCat?.sentralisasi_exclusion_type === 'sosial_duka' && (
                              <span>Pelean Sosial/Duka (Gariana) &mdash; 100% untuk santunan jemaat yang berduka / kemalangan.</span>
                            )}
                            {currentCat?.sentralisasi_exclusion_type === 'beasiswa' && (
                              <span>Pelean Beasiswa (Dana Belajar) &mdash; 100% dialokasikan khusus bantuan pendidikan siswa/mahasiswa jemaat.</span>
                            )}
                            {currentCat?.sentralisasi_exclusion_type === 'pembangunan_lokal' && (
                              <span>Dana Pembangunan Fisik Lokal &mdash; 100% dialokasikan untuk kepanitiaan pembangunan/renovasi fisik gereja.</span>
                            )}
                            {!currentCat?.sentralisasi_exclusion_type && (
                              <span>Dana khusus yang dikelola penuh 100% untuk pelayanan lokal sesuai peruntukannya.</span>
                            )}
                          </p>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <span className="text-[10px] text-slate-400 block">Nominal Huria</span>
                          <span className="text-base font-extrabold text-emerald-900">
                            {formatRupiah(rawAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}

          {/* Uraian */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Uraian Keterangan Transaksi <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Contoh: Persembahan Minggu Ibadah Pagi atau Pembayaran token listrik gedung gereja..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
              required
            />
          </div>

          {/* Upload Nota / Camera */}
          <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-slate-500" />
                Foto Nota / Kuitansi Fisik
                {isReceiptMandatory && (
                  <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md font-semibold">
                    Wajib (≥ {formatRupiah(settings.receipt_required_threshold)})
                  </span>
                )}
              </span>
              {attachmentUrl && (
                <button
                  type="button"
                  onClick={() => setAttachmentUrl(null)}
                  className="text-xs text-rose-500 hover:text-rose-700"
                >
                  Hapus Foto
                </button>
              )}
            </div>

            {attachmentUrl ? (
              <div className="flex items-center gap-3">
                <img
                  src={attachmentUrl}
                  alt="Nota Preview"
                  className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-2xs"
                />
                <div className="text-xs text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Foto nota berhasil dilampirkan</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-50 shadow-2xs transition-colors">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pilih Berkas Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                <span className="text-[11px] text-slate-400">Format JPG, PNG atau foto kamera langsung</span>
                {uploading && <span className="text-xs text-primary animate-pulse">Mengunggah...</span>}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors"
          >
            Batal
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(false)}
              className="px-4 py-2 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors"
            >
              Simpan Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(true)}
              className="px-5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors shadow-xs"
            >
              Ajukan (Submit)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
