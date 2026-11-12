/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Paperclip,
  CheckCheck,
  ShieldCheck,
  ArrowRightLeft,
  Calendar,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Transaction } from '../types/database';
import { formatRupiah, formatDateIndo } from '../lib/formatters';
import { AttachmentPreviewModal } from '../components/transactions/AttachmentPreviewModal';
import { RejectModal } from '../components/transactions/RejectModal';

export const ApprovalQueuePage: React.FC = () => {
  const { kasList, storageAccounts, transactions, changeStatus, bulkApprove, confirmTransferReceipt } = useData();
  const { currentUser, canApproveKas, isLeader, userKasAccess } = useAuth();

  // Modals state
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);
  const [rejectingTx, setRejectingTx] = useState<Transaction | null>(null);

  // Bulk selection
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  // 1. Transactions submitted waiting for approval on kas user leads
  const pendingApprovals = transactions.filter((tx) => {
    if (tx.status !== 'submitted') return false;
    // User must have ketua approval rights on that kas
    return canApproveKas(tx.kas_id);
  });

  // 2. Transfers waiting for receipt confirmation (Transfer Antar Kas Berbeda)
  const pendingTransferConfirmations = transactions.filter((tx) => {
    if (tx.type !== 'transfer_in' || tx.status !== 'submitted' || !tx.transfer_id) return false;
    // Caller must be ketua of the receiving kas
    return canApproveKas(tx.kas_id);
  });

  const toggleSelectTx = (id: string) => {
    setSelectedTxIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const approvableIds = pendingApprovals
      .filter((tx) => tx.created_by !== currentUser?.id)
      .map((tx) => tx.id);

    if (selectedTxIds.length === approvableIds.length) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(approvableIds);
    }
  };

  const handleApprove = async (tx: Transaction) => {
    const res = await changeStatus(tx.id, 'approved');
    if (res.success) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      setActionSuccessMsg(`Transaksi "${tx.description}" berhasil disetujui.`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } else {
      alert(res.error || 'Gagal menyetujui transaksi.');
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingTx) return;
    const res = await changeStatus(rejectingTx.id, 'rejected', reason);
    if (res.success) {
      setActionSuccessMsg(`Transaksi telah ditolak dan dikembalikan ke penginput.`);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } else {
      alert(res.error || 'Gagal menolak transaksi.');
    }
    setRejectingTx(null);
  };

  const handleBulkApprove = async () => {
    if (selectedTxIds.length === 0) return;
    const res = await bulkApprove(selectedTxIds);
    if (res.success) {
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.7 } });
      setActionSuccessMsg(`${res.count} transaksi berhasil disetujui sekaligus.`);
      setSelectedTxIds([]);
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  };

  const handleConfirmTransfer = async (transferId: string) => {
    const res = await confirmTransferReceipt(transferId);
    if (res.success) {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.8 } });
      setActionSuccessMsg('Penerimaan transfer dana berhasil dikonfirmasi dan saldo telah dimutasi.');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } else {
      alert(res.error || 'Gagal mengonfirmasi transfer.');
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto min-w-0 overflow-hidden">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 mb-1">
            <Clock className="w-4 h-4" />
            <span>Verifikasi & Akuntabilitas Kas</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Antrean Persetujuan Ketua Kas
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Periksa dan setujui transaksi yang diajukan oleh bendahara seksi
          </p>
        </div>

        {pendingApprovals.length > 0 && selectedTxIds.length > 0 && (
          <button
            onClick={handleBulkApprove}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Setujui {selectedTxIds.length} Transaksi Terpilih</span>
          </button>
        )}
      </div>

      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* ---------------- Section 1: Transfer Receipt Confirmations ---------------- */}
      {pendingTransferConfirmations.length > 0 && (
        <div className="bg-indigo-50/60 border border-indigo-200 p-5 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
            <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
            <span>Konfirmasi Penerimaan Transfer Masuk Antar Kas ({pendingTransferConfirmations.length})</span>
          </div>
          <p className="text-xs text-indigo-800">
            Transfer dana antar seksi membutuhkan konfirmasi penerimaan oleh Anda selaku Ketua Kas Penerima
            sebelum saldo resmi berpindah.
          </p>

          <div className="space-y-3">
            {pendingTransferConfirmations.map((tx) => {
              const kas = kasList.find((k) => k.id === tx.kas_id);
              const storage = storageAccounts.find((s) => s.id === tx.storage_account_id);

              return (
                <div
                  key={tx.id}
                  className="bg-white p-4 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{tx.description}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-semibold">
                        Ke: {kas?.nama}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>Tanggal: {formatDateIndo(tx.tanggal)}</span>
                      <span>·</span>
                      <span>Rekening Tujuan: {storage?.nama}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="text-base font-extrabold text-indigo-700 font-mono tabular-nums">
                      {formatRupiah(tx.amount)}
                    </span>
                    <button
                      onClick={() => handleConfirmTransfer(tx.transfer_id!)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Konfirmasi Terima</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- Section 2: General Transactions Queue ---------------- */}
      {pendingApprovals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">Antrean Persetujuan Bersih!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Tidak ada transaksi kas yang sedang menunggu persetujuan pada kas yang Anda pimpin saat ini.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Queue toolbar */}
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200/80 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={
                  selectedTxIds.length > 0 &&
                  selectedTxIds.length === pendingApprovals.filter((t) => t.created_by !== currentUser?.id).length
                }
                onChange={toggleSelectAll}
                className="w-4 h-4 text-primary rounded-md focus:ring-primary/40"
              />
              <span>Pilih Semua yang Dapat Disetujui ({pendingApprovals.length} Transaksi)</span>
            </label>

            <span className="text-slate-400">
              {selectedTxIds.length} dipilih
            </span>
          </div>

          {/* Cards for each pending transaction (Mobile-first large touch targets) */}
          <div className="grid grid-cols-1 gap-4">
            {pendingApprovals.map((tx) => {
              const kas = kasList.find((k) => k.id === tx.kas_id);
              const storage = storageAccounts.find((s) => s.id === tx.storage_account_id);
              const isCreator = tx.created_by === currentUser?.id;
              const isInc = tx.type === 'income' || tx.type === 'transfer_in';

              return (
                <div
                  key={tx.id}
                  className={`card-hover bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all border-l-4 ${
                    isInc ? 'border-l-emerald-500' : 'border-l-rose-500'
                  }`}
                >
                  {/* Left: Checkbox & Info */}
                  <div className="flex items-start gap-3">
                    {!isCreator && (
                      <input
                        type="checkbox"
                        checked={selectedTxIds.includes(tx.id)}
                        onChange={() => toggleSelectTx(tx.id)}
                        className="w-4 h-4 text-primary rounded-md focus:ring-primary/40 mt-1"
                      />
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold"
                          style={{
                            backgroundColor: `${kas?.warna || '#7C9CF5'}25`,
                            color: '#1F2440',
                          }}
                        >
                          {kas?.nama}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {formatDateIndo(tx.tanggal)}
                        </span>
                        {tx.receipt_no && (
                          <span className="text-[11px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                            Bukti: {tx.receipt_no}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">· {storage?.nama}</span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm md:text-base leading-snug">
                        {tx.description}
                      </h4>

                      <div className="flex items-center gap-3 pt-0.5">
                        {tx.attachment_url && (
                          <button
                            type="button"
                            onClick={() => setPreviewAttachmentUrl(tx.attachment_url!)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark bg-primary/10 px-2 py-1 rounded-lg transition-colors"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>Lihat Foto Nota</span>
                          </button>
                        )}

                        {isCreator && (
                          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                            Anda adalah penginput transaksi ini (harus disetujui ketua lain)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Nominal & Action Buttons */}
                  <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-end md:items-center justify-between sm:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-right">
                      <span
                        className={`text-xl font-extrabold font-mono tabular-nums ${
                          isInc ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isInc ? '+' : '-'}
                        {formatRupiah(tx.amount)}
                      </span>
                      <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                        {tx.type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRejectingTx(tx)}
                        className="px-4 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1.5 active:scale-95"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Tolak</span>
                      </button>

                      <button
                        disabled={isCreator}
                        onClick={() => handleApprove(tx)}
                        className={`px-5 py-2.5 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 active:scale-95 ${
                          isCreator
                            ? 'bg-slate-300 cursor-not-allowed opacity-60'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Setuju</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <AttachmentPreviewModal
        isOpen={Boolean(previewAttachmentUrl)}
        imageUrl={previewAttachmentUrl}
        onClose={() => setPreviewAttachmentUrl(null)}
      />

      <RejectModal
        isOpen={Boolean(rejectingTx)}
        onClose={() => setRejectingTx(null)}
        onConfirm={handleRejectConfirm}
        transactionDescription={rejectingTx?.description}
        transactionAmount={rejectingTx?.amount}
      />
    </div>
  );
};
