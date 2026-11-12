/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldCheck,
  Calendar,
  X,
  FileText,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { getIndoMonthName, MONTH_NAMES_INDO, formatDateIndo } from '../lib/formatters';
import { PeriodClosing } from '../types/database';

export const PeriodClosingPage: React.FC = () => {
  const { kasList, transactions, periodClosings, closePeriod, reopenPeriod, settings, fiscalYears } = useData();
  const { currentUser, isBendaharaUmum, isAdmin } = useAuth();

  const [selectedYear, setSelectedYear] = useState<number>(settings.active_year || 2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [targetKasId, setTargetKasId] = useState<string>('all'); // 'all' or specific kasId

  const [isClosingSubmitting, setIsClosingSubmitting] = useState<boolean>(false);
  const [closingError, setClosingError] = useState<string>('');
  const [closingSuccess, setClosingSuccess] = useState<string>('');

  // Reopen modal state
  const [reopenTargetClosing, setReopenTargetClosing] = useState<PeriodClosing | null>(null);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [reopenError, setReopenError] = useState<string>('');

  // 1. Completeness inspection: check for each Kas whether it has Drafts or Submitted transactions in this period
  const completenessInspection = kasList.map((k) => {
    const periodTx = transactions.filter((tx) => {
      const d = new Date(tx.tanggal);
      return (
        tx.kas_id === k.id &&
        d.getFullYear() === selectedYear &&
        d.getMonth() + 1 === selectedMonth
      );
    });

    const drafts = periodTx.filter((tx) => tx.status === 'draft').length;
    const submitted = periodTx.filter((tx) => tx.status === 'submitted').length;
    const approved = periodTx.filter((tx) => tx.status === 'approved').length;
    const rejected = periodTx.filter((tx) => tx.status === 'rejected').length;

    const isComplete = drafts === 0 && submitted === 0;

    return {
      kas: k,
      drafts,
      submitted,
      approved,
      rejected,
      isComplete,
      total: periodTx.length,
    };
  });

  const totalIncompleteKas = completenessInspection.filter((c) => !c.isComplete).length;
  const isPeriodAlreadyClosed = periodClosings.some(
    (pc) =>
      pc.is_closed &&
      pc.tahun === selectedYear &&
      pc.bulan === selectedMonth &&
      (targetKasId === 'all' ? pc.kas_id === null : pc.kas_id === targetKasId)
  );

  const handleClosePeriod = async () => {
    setClosingError('');
    setClosingSuccess('');
    setIsClosingSubmitting(true);

    const kasArg = targetKasId === 'all' ? null : targetKasId;
    const res = await closePeriod(selectedYear, selectedMonth, kasArg);

    setIsClosingSubmitting(false);

    if (!res.success) {
      setClosingError(res.error || 'Gagal menutup buku periode.');
    } else {
      setClosingSuccess(
        `Buku kas periode ${getIndoMonthName(selectedMonth)} ${selectedYear} berhasil ditutup dan seluruh transaksi terkunci.`
      );
      setTimeout(() => setClosingSuccess(''), 5000);
    }
  };

  const handleReopenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenTargetClosing) return;

    if (!reopenReason.trim()) {
      setReopenError('Alasan pembukaan kembali buku kas wajib diisi untuk catatan audit.');
      return;
    }

    const res = await reopenPeriod(reopenTargetClosing.id, reopenReason);
    if (!res.success) {
      setReopenError(res.error || 'Gagal membuka kembali buku kas.');
    } else {
      setClosingSuccess(
        `Buku kas periode ${getIndoMonthName(reopenTargetClosing.bulan)} ${reopenTargetClosing.tahun} berhasil dibuka kembali.`
      );
      setReopenTargetClosing(null);
      setReopenReason('');
      setReopenError('');
      setTimeout(() => setClosingSuccess(''), 5000);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto min-w-0 overflow-hidden">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
          <Lock className="w-4 h-4 text-primary" />
          <span>Integritas & Kunci Buku Periode</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          Penutupan Buku Bulanan (Period Closing)
        </h2>
        <p className="text-xs md:text-sm text-slate-500">
          Kunci transaksi bulanan setelah seluruh catatan kas seksi diverifikasi dan disetujui
        </p>
      </div>

      {closingSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{closingSuccess}</span>
        </div>
      )}

      {closingError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="font-medium">{closingError}</span>
        </div>
      )}

      {/* Control & Inspection Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Selectors */}
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Bulan Buku
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
              >
                {MONTH_NAMES_INDO.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Tahun
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
              >
                {fiscalYears && fiscalYears.length > 0 ? (
                  fiscalYears.map((fy) => (
                    <option key={fy.id} value={fy.year}>
                      {fy.year} {fy.year === settings.active_year ? '(Aktif)' : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Target Kas
              </label>
              <select
                value={targetKasId}
                onChange={(e) => setTargetKasId(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
              >
                <option value="all">Semua Kas Seksi (Global)</option>
                {kasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama} ({k.kode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action button to lock */}
          <div>
            {!isAdmin && !isBendaharaUmum ? (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Wewenang Khusus Bendahara Umum & Admin</span>
              </div>
            ) : isPeriodAlreadyClosed ? (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200">
                <Lock className="w-4 h-4 text-slate-500" />
                <span>Periode Ini Sudah Ditutup</span>
              </div>
            ) : (
              <button
                disabled={isClosingSubmitting || totalIncompleteKas > 0}
                onClick={handleClosePeriod}
                className={`px-5 py-2.5 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 ${
                  totalIncompleteKas > 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary-dark text-white'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Tutup Buku Periode Ini</span>
              </button>
            )}
          </div>
        </div>

        {/* Pre-closing Completeness Inspection Panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pemeriksaan Kelengkapan Catatan Kas per Seksi ({getIndoMonthName(selectedMonth)} {selectedYear})
            </h3>
            {totalIncompleteKas > 0 ? (
              <span className="text-xs text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{totalIncompleteKas} Seksi Belum Selesai</span>
              </span>
            ) : (
              <span className="text-xs text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Semua Kas Lengkap & Siap Ditutup</span>
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Nama Kas</th>
                  <th className="py-2.5 px-3 text-center">Draft (Draf)</th>
                  <th className="py-2.5 px-3 text-center">Diajukan</th>
                  <th className="py-2.5 px-3 text-center">Disetujui</th>
                  <th className="py-2.5 px-3 text-center">Ditolak</th>
                  <th className="py-2.5 px-3 text-center">Status Kelayakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completenessInspection.map((item) => (
                  <tr key={item.kas.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-800">{item.kas.nama}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{item.kas.kode}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {item.drafts > 0 ? (
                        <span className="text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-md">
                          {item.drafts} draf
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {item.submitted > 0 ? (
                        <span className="text-blue-800 font-bold bg-blue-100 px-2 py-0.5 rounded-md">
                          {item.submitted} menunggu
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-emerald-700 font-semibold">
                      {item.approved}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-rose-600">
                      {item.rejected}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {item.isComplete ? (
                        <span className="text-emerald-700 font-semibold inline-flex items-center gap-1 text-[11px]">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Lengkap</span>
                        </span>
                      ) : (
                        <span className="text-amber-800 font-semibold inline-flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Ada Draf / Menunggu</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Historical Closings Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Riwayat Penutupan Buku Kas (Audit Log)</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-3">Periode</th>
                <th className="py-3 px-3">Cakupan Kas</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Ditutup Pada</th>
                <th className="py-3 px-3">Catatan / Alasan Buka</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periodClosings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Belum ada catatan penutupan buku.
                  </td>
                </tr>
              ) : (
                periodClosings.map((pc) => {
                  const kas = kasList.find((k) => k.id === pc.kas_id);

                  return (
                    <tr key={pc.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        {getIndoMonthName(pc.bulan)} {pc.tahun}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {kas ? kas.nama : 'Seluruh Kas (Konsolidasi)'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {pc.is_closed ? (
                          <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-slate-800 text-white inline-flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Terkunci</span>
                          </span>
                        ) : (
                          <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                            <Unlock className="w-3 h-3" />
                            <span>Dibuka Kembali</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {formatDateIndo(pc.closed_at)}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {pc.reopen_reason ? (
                          <span className="text-amber-800 font-medium">Buka: {pc.reopen_reason}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {pc.is_closed && (isBendaharaUmum || isAdmin) && (
                          <button
                            onClick={() => {
                              setReopenTargetClosing(pc);
                              setReopenReason('');
                              setReopenError('');
                            }}
                            className="px-3 py-1.5 text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Buka Kembali</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reopen Period */}
      {reopenTargetClosing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50/50">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Unlock className="w-5 h-5 text-amber-700" />
                <span>Buka Kembali Buku Kas Terkunci</span>
              </div>
              <button
                onClick={() => setReopenTargetClosing(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReopenSubmit} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Membuka kembali buku periode <strong>{getIndoMonthName(reopenTargetClosing.bulan)} {reopenTargetClosing.tahun}</strong>{' '}
                akan mengizinkan penginputan koreksi baru. Tindakan ini wajib menyertakan alasan yang sah dan akan dicatat dalam audit trail.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alasan Pembukaan Kembali <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Koreksi selisih persembahan pesta pembangunan atas persetujuan Pendeta Ressort..."
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                  required
                />
                {reopenError && <p className="text-rose-500 mt-1">{reopenError}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReopenTargetClosing(null)}
                  className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  Buka Kunci Buku
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
