/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  Unlock,
  Send,
  RotateCcw,
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Trash2,
  FileText,
  ShieldCheck,
  Building2,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  FileUp,
  HelpCircle,
  Layers,
  ChevronRight,
  Check,
  Calendar,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Kas,
  StorageAccount,
  OpeningBalanceEntry,
  OpeningBalanceAdjustment,
  OpeningOtherPosition,
  OpeningBookKasStatus,
  PriorYearSummary,
} from '../types/database';
import { formatRupiah, formatDateIndo } from '../lib/formatters';
import { generateBeritaAcaraPembukaanPDF } from '../lib/exportUtils';

export default function OpeningBalancePage() {
  const { currentUser, canInputKas, canApproveKas, isAdmin, isBendaharaUmum, isLeader } = useAuth();
  const {
    kasList,
    storageAccounts,
    categories,
    settings,
    openingSetup,
    openingEntries,
    openingAdjustments,
    openingOtherPositions,
    priorYearSummaries,
    isKasOpeningLocked,
    getOpeningStatusForKas,
    saveOpeningEntry,
    submitOpeningBook,
    approveOpeningBook,
    lockOpeningBook,
    saveOpeningAdjustment,
    approveOpeningAdjustment,
    saveOpeningOtherPosition,
    deleteOpeningOtherPosition,
    savePriorYearSummary,
  } = useData();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'status' | 'excel' | 'adjustments' | 'prior_year'>('status');

  // Wizard Modal State
  const [wizardKasId, setWizardKasId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<number>(1);

  // Wizard Temporary State
  const [wizardAmounts, setWizardAmounts] = useState<{ [storageId: string]: number }>({});
  const [wizardPhysical, setWizardPhysical] = useState<{
    [storageId: string]: { book: number; physical: number; explanation: string; docName: string };
  }>({});

  // Other Positions Modal & Form State
  const [showOtherPosModal, setShowOtherPosModal] = useState(false);
  const [otherPosType, setOtherPosType] = useState<OpeningOtherPosition['type']>('asset');
  const [otherPosName, setOtherPosName] = useState('');
  const [otherPosKasId, setOtherPosKasId] = useState('');
  const [otherPosCategory, setOtherPosCategory] = useState('');
  const [otherPosYear, setOtherPosYear] = useState<number>(2024);
  const [otherPosAmount, setOtherPosAmount] = useState<number>(0);
  const [otherPosCondition, setOtherPosCondition] = useState<'baik' | 'rusak_ringan' | 'rusak_berat'>('baik');
  const [otherPosLocation, setOtherPosLocation] = useState('');
  const [otherPosManager, setOtherPosManager] = useState('');
  const [otherPosNotes, setOtherPosNotes] = useState('');

  // Adjustment Modal State
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [adjKasId, setAdjKasId] = useState('');
  const [adjStorageId, setAdjStorageId] = useState('');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjReason, setAdjReason] = useState('');
  const [adjDocName, setAdjDocName] = useState('');

  // Return / Reject Modal State
  const [returnModalKasId, setReturnModalKasId] = useState<string | null>(null);
  const [returnNoteInput, setReturnNoteInput] = useState('');

  // Excel Import Preview State
  const [excelPreviewData, setExcelPreviewData] = useState<{
    validRows: { kas: Kas; storage: StorageAccount; amount: number; explanation?: string }[];
    errorRows: { rawRow: any; error: string }[];
  } | null>(null);

  // Prior Year Input State
  const [priorYearKasId, setPriorYearKasId] = useState(kasList[0]?.id || '');

  // Progress Calculations
  const totalKasCount = kasList.length;
  const lockedKasCount = useMemo(() => {
    return kasList.filter((k) => isKasOpeningLocked(k.id)).length;
  }, [kasList, isKasOpeningLocked]);
  const progressPct = totalKasCount > 0 ? Math.round((lockedKasCount / totalKasCount) * 100) : 0;

  // Selected Wizard Kas
  const selectedWizardKas = useMemo(() => {
    return kasList.find((k) => k.id === wizardKasId) || null;
  }, [kasList, wizardKasId]);

  // Open Wizard for a specific Kas
  const handleOpenWizard = (kas: Kas) => {
    setWizardKasId(kas.id);
    setWizardStep(1);

    // Initialize with existing entries or 0
    const initialAmounts: { [storageId: string]: number } = {};
    const initialPhysical: {
      [storageId: string]: { book: number; physical: number; explanation: string; docName: string };
    } = {};

    storageAccounts.forEach((sa) => {
      const match = openingEntries.find((e) => e.kas_id === kas.id && e.storage_account_id === sa.id);
      const amt = match ? match.amount : 0;
      initialAmounts[sa.id] = amt;
      initialPhysical[sa.id] = {
        book: match ? match.book_balance : amt,
        physical: match ? match.physical_balance : amt,
        explanation: match?.explanation || '',
        docName: match?.document_url || '',
      };
    });

    setWizardAmounts(initialAmounts);
    setWizardPhysical(initialPhysical);
  };

  // Save Step 1 & Move to Step 2
  const handleWizardSaveStep1 = async () => {
    if (!wizardKasId) return;
    for (const sa of storageAccounts) {
      const amt = wizardAmounts[sa.id] || 0;
      await saveOpeningEntry({
        kas_id: wizardKasId,
        storage_account_id: sa.id,
        amount: amt,
        book_balance: amt,
        physical_balance: wizardPhysical[sa.id]?.physical ?? amt,
        explanation: wizardPhysical[sa.id]?.explanation || null,
        document_url: wizardPhysical[sa.id]?.docName || null,
      });
    }
    setWizardStep(2);
  };

  // Save Step 2 & Move to Step 3
  const handleWizardSaveStep2 = async () => {
    if (!wizardKasId) return;
    // Validate that any discrepancy has explanation
    for (const sa of storageAccounts) {
      const phys = wizardPhysical[sa.id];
      if (phys) {
        const diff = phys.physical - phys.book;
        if (diff !== 0 && (!phys.explanation || phys.explanation.trim() === '')) {
          alert(
            `Terdapat selisih pada ${sa.nama} (${formatRupiah(diff)}). Penjelasan alasan selisih wajib diisi.`
          );
          return;
        }
        await saveOpeningEntry({
          kas_id: wizardKasId,
          storage_account_id: sa.id,
          amount: phys.book,
          book_balance: phys.book,
          physical_balance: phys.physical,
          explanation: phys.explanation || null,
          document_url: phys.docName || null,
        });
      }
    }
    setWizardStep(3);
  };

  // Finish Wizard & Submit
  const handleWizardSubmitToKetua = async () => {
    if (!wizardKasId) return;
    try {
      const res = await submitOpeningBook(wizardKasId);
      if (!res.success) {
        alert(res.error || 'Gagal mengajukan pembukaan buku.');
        return;
      }
      alert(`Saldo awal ${selectedWizardKas?.nama} berhasil diajukan ke Ketua Kas untuk diverifikasi.`);
      setWizardKasId(null);
    } catch (err: any) {
      alert(err.message || 'Gagal mengajukan pembukaan buku.');
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: OpeningBookKasStatus) => {
    switch (status) {
      case 'not_started':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            Belum Dimulai
          </span>
        );
      case 'drafting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Penginputan Draf
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Send className="w-3.5 h-3.5 text-blue-500" />
            Diajukan ke Ketua
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
            Disetujui Ketua
          </span>
        );
      case 'locked':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            Dikunci (Resmi)
          </span>
        );
    }
  };

  // Download Excel Template
  const handleDownloadExcelTemplate = () => {
    const templateData = kasList.flatMap((k) =>
      storageAccounts.map((s) => ({
        'Kode Kas': k.kode,
        'Nama Kas': k.nama,
        'Nama Tempat Penyimpanan': s.nama,
        'Nomor Rekening / Tipe': s.nomor_rekening || 'Tunai / Kas Fisik',
        'Saldo Buku Manual (Rp)': 0,
        'Saldo Fisik Uang / Rek Koran (Rp)': 0,
        'Keterangan / Penjelasan Selisih': '',
      }))
    );

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Saldo Awal');
    XLSX.writeFile(workbook, `Template_Saldo_Awal_HKBP_Hutaraja_${openingSetup.first_year}.xlsx`);
  };

  // Handle Excel Upload
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const valid: { kas: Kas; storage: StorageAccount; amount: number; explanation?: string }[] = [];
        const errorRows: { rawRow: any; error: string }[] = [];

        data.forEach((row: any) => {
          const kasKode = String(row['Kode Kas'] || row['Kode'] || '').trim();
          const kasNama = String(row['Nama Kas'] || '').trim();
          const storNama = String(row['Nama Tempat Penyimpanan'] || row['Tempat Penyimpanan'] || '').trim();
          const amt = Number(row['Saldo Buku Manual (Rp)'] || row['Saldo'] || row['Amount'] || 0);
          const explanation = String(row['Keterangan / Penjelasan Selisih'] || '').trim();

          const kas = kasList.find((k) => k.kode.toLowerCase() === kasKode.toLowerCase() || k.nama.toLowerCase() === kasNama.toLowerCase());
          const storage = storageAccounts.find((s) => s.nama.toLowerCase().includes(storNama.toLowerCase()) || storNama.toLowerCase().includes(s.nama.toLowerCase()));

          if (!kas) {
            errorRows.push({ rawRow: row, error: `Kas '${kasKode || kasNama}' tidak dikenal dalam sistem.` });
            return;
          }
          if (!storage) {
            errorRows.push({ rawRow: row, error: `Tempat penyimpanan '${storNama}' tidak ditemukan.` });
            return;
          }
          if (isNaN(amt) || amt < 0) {
            errorRows.push({ rawRow: row, error: `Nominal tidak valid (${amt}). Tidak boleh negatif.` });
            return;
          }
          // Permission check: only import for kas user can input
          if (!canInputKas(kas.id) && !isAdmin) {
            errorRows.push({ rawRow: row, error: `Anda tidak memiliki hak akses bendahara pada kas '${kas.nama}'.` });
            return;
          }

          valid.push({ kas, storage, amount: amt, explanation });
        });

        setExcelPreviewData({ validRows: valid, errorRows });
      } catch (err: any) {
        alert('Gagal membaca file Excel. Pastikan format file sesuai template.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Commit Excel Import
  const handleCommitExcelImport = async () => {
    if (!excelPreviewData || excelPreviewData.validRows.length === 0) return;
    for (const item of excelPreviewData.validRows) {
      await saveOpeningEntry({
        kas_id: item.kas.id,
        storage_account_id: item.storage.id,
        amount: item.amount,
        book_balance: item.amount,
        physical_balance: item.amount,
        explanation: item.explanation || 'Diimpor dari file Excel saldo awal',
      });
    }
    alert(`Berhasil menyimpan ${excelPreviewData.validRows.length} entri saldo awal dari Excel.`);
    setExcelPreviewData(null);
  };

  // Export Berita Acara PDF
  const handleExportPDF = () => {
    generateBeritaAcaraPembukaanPDF({
      kasList,
      storageAccounts,
      openingEntries,
      openingOtherPositions,
      settings,
      tahun: openingSetup.first_year,
      goLiveDate: openingSetup.go_live_date,
      namaBendahara: currentUser?.full_name,
      namaKetua: settings.pendeta_name,
    });
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto min-w-0 overflow-hidden">
      {/* Page Header & Go-Live Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
              <BookOpen className="w-7 h-7 text-[#7C9CF5]" />
              Pembukaan Buku & Saldo Awal
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#7C9CF5]/15 text-[#7C9CF5] border border-[#7C9CF5]/30">
              Go-Live: {formatDateIndo(openingSetup.go_live_date)}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Penetapan saldo pindahan buku manual per 31 Desember {openingSetup.first_year - 1} untuk menjadi
            dasar pembukuan resmi komputerisasi tahun {openingSetup.first_year}.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-gray-500" />
            Cetak Berita Acara (PDF)
          </button>

          {(isAdmin || isBendaharaUmum) && (
            <button
              onClick={async () => {
                if (
                  window.confirm(
                    'Kunci Pembukaan Buku untuk semua kas yang telah disetujui? Setelah dikunci, saldo awal menjadi resmi dan kas langsung dapat menerima transaksi.'
                  )
                ) {
                  const res = await lockOpeningBook();
                  alert(`Berhasil mengunci ${res.count || 0} entri saldo awal.`);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
            >
              <Lock className="w-4 h-4" />
              Kunci Semua Kas
            </button>
          )}
        </div>
      </div>

      {/* Progress & Status Card */}
      <div className="card-indigo card-hover p-5 rounded-2xl border-t-4 border-t-indigo-500 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-lg border border-indigo-200">
            {progressPct}%
          </div>
          <div>
            <h3 className="text-sm font-bold text-indigo-950">
              Progres Pembukaan Buku: {lockedKasCount} dari {totalKasCount} Kas Dikunci
            </h3>
            <p className="text-xs text-indigo-800/80 mt-0.5 font-medium">
              Kas yang belum dikunci belum dapat mencatat transaksi keuangan demi integritas saldo awal.
            </p>
          </div>
        </div>

        <div className="w-full md:w-64">
          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center p-1 bg-gray-100/80 rounded-xl border border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('status')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'status' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Layers className="w-4 h-4 text-[#7C9CF5]" />
          Status Pembukaan per Kas
        </button>
        <button
          onClick={() => setActiveTab('excel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'excel' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Impor dari Excel
        </button>
        <button
          onClick={() => setActiveTab('adjustments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'adjustments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-[#FFB4A2]" />
          Penyesuaian Saldo Awal ({openingAdjustments.length})
        </button>
        <button
          onClick={() => setActiveTab('prior_year')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            activeTab === 'prior_year' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#CDB4FF]" />
          Ringkasan Tahun Lalu (Manual)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STATUS PEMBUKAAN PER KAS & WIZARD LAUNCHER                         */}
      {/* ========================================================================= */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Daftar Kas & Status Pembukaan</h3>
                <p className="text-xs text-gray-500">
                  Setiap bendahara seksi memasukkan saldo pindahan kas masing-masing lalu mengajukan ke Ketua
                  Kas.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/75 text-gray-600 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">Kas / Seksi</th>
                    <th className="py-3 px-4">Status Pembukaan</th>
                    <th className="py-3 px-4 text-right">Saldo Pindahan</th>
                    <th className="py-3 px-4 text-center">Fisik vs Buku</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {kasList.map((k) => {
                    const status = getOpeningStatusForKas(k.id);
                    const isLocked = status === 'locked';
                    const entries = openingEntries.filter((e) => e.kas_id === k.id);
                    const totalSaldo = entries.reduce((sum, e) => sum + e.amount, 0);
                    const hasDiscrepancy = entries.some((e) => e.difference !== 0);

                    const canInput = canInputKas(k.id) || isAdmin;
                    const canApprove = canApproveKas(k.id) || isLeader || isAdmin;

                    return (
                      <tr key={k.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: k.warna }} />
                            <div>
                              <strong className="block text-gray-900">{k.nama}</strong>
                              <span className="text-xs text-gray-400">{k.kode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">{renderStatusBadge(status)}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-gray-900 tabular-nums">
                          {formatRupiah(totalSaldo)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {hasDiscrepancy ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Ada Selisih Fisik
                            </span>
                          ) : entries.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Fisik Cocok
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            {/* Wizard button for bendahara */}
                            {!isLocked && canInput && (
                              <button
                                onClick={() => handleOpenWizard(k)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#7C9CF5] text-white hover:bg-indigo-600 transition-colors shadow-xs"
                              >
                                {status === 'not_started' ? 'Mulai Wizard' : 'Lanjutkan Wizard'}
                              </button>
                            )}

                            {/* Ketua approval button */}
                            {status === 'submitted' && canApprove && (
                              <>
                                <button
                                  onClick={async () => {
                                    if (confirm(`Setujui saldo awal ${k.nama}?`)) {
                                      const res = await approveOpeningBook(k.id, true);
                                      if (!res.success) alert(res.error);
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                >
                                  Setujui
                                </button>
                                <button
                                  onClick={() => setReturnModalKasId(k.id)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                >
                                  Kembalikan
                                </button>
                              </>
                            )}

                            {/* Bendum lock button */}
                            {status === 'approved' && (isAdmin || isBendaharaUmum) && (
                              <button
                                onClick={async () => {
                                  if (confirm(`Kunci resmi saldo awal ${k.nama}? Kas ini akan langsung aktif menerima transaksi.`)) {
                                    const res = await lockOpeningBook(k.id);
                                    if (!res.success) alert(res.error);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                              >
                                Kunci Kas
                              </button>
                            )}

                            {isLocked && (
                              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                <Lock className="w-3.5 h-3.5" />
                                Siap Transaksi
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: IMPOR EXCEL SALDO AWAL                                             */}
      {/* ========================================================================= */}
      {activeTab === 'excel' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Impor Saldo Awal dari Spreadsheet Excel</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Gunakan template resmi untuk mengimpor saldo kas dan tempat penyimpanan sekaligus.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleDownloadExcelTemplate}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#7C9CF5] text-white hover:bg-indigo-600 shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Unduh Template Excel (.xlsx)
              </button>

              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-gray-500" />
                <span>Pilih File Excel untuk Diimpor</span>
                <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Excel Preview Table */}
          {excelPreviewData && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Hasil Pemeriksaan File Excel</h4>
                  <p className="text-xs text-gray-500">
                    {excelPreviewData.validRows.length} baris valid siap disimpan,{' '}
                    {excelPreviewData.errorRows.length} baris bermasalah.
                  </p>
                </div>
                {excelPreviewData.validRows.length > 0 && (
                  <button
                    onClick={handleCommitExcelImport}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                  >
                    Simpan Baris Valid ke Saldo Awal
                  </button>
                )}
              </div>

              {/* Error Rows Banner if any */}
              {excelPreviewData.errorRows.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-2">
                  <strong className="block font-bold">Baris yang Ditolak / Tidak Valid:</strong>
                  <ul className="list-disc pl-5 space-y-1">
                    {excelPreviewData.errorRows.map((err, idx) => (
                      <li key={idx}>
                        Baris {idx + 1}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Valid Rows Table */}
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Kas</th>
                      <th className="py-2.5 px-3">Tempat Penyimpanan</th>
                      <th className="py-2.5 px-3 text-right">Saldo Nominal</th>
                      <th className="py-2.5 px-3">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {excelPreviewData.validRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3 font-semibold text-gray-900">{row.kas.nama}</td>
                        <td className="py-2 px-3 text-gray-600">{row.storage.nama}</td>
                        <td className="py-2 px-3 text-right font-bold text-gray-900 tabular-nums">
                          {formatRupiah(row.amount)}
                        </td>
                        <td className="py-2 px-3 text-gray-500">{row.explanation || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PENYESUAIAN SALDO AWAL (SETELAH DIKUNCI)                           */}
      {/* ========================================================================= */}
      {activeTab === 'adjustments' && (
        <div className="space-y-6">
          <div className="bg-[#FFB4A2]/15 border border-[#FFB4A2]/40 rounded-2xl p-5 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-gray-900">Aturan Penyesuaian Saldo Awal Terkunci</h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Saldo awal yang telah dikunci tidak dapat diedit secara langsung. Jika terdapat koreksi sah
                (misal jasa giro tertinggal atau selisih nota fisik), ajukan lewat form penyesuaian ini.
                Penyesuaian hanya dapat diajukan <strong>sebelum bulan pertama (Januari) ditutup bukunya</strong>.
                Persetujuan berjenjang: disetujui Ketua Kas lalu Bendahara Umum Huria.
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Riwayat Pengajuan Penyesuaian Saldo Awal</h4>
              <p className="text-xs text-gray-500">Koreksi audit saldo awal tahun {openingSetup.first_year}</p>
            </div>

            <button
              onClick={() => {
                setAdjKasId(kasList[0]?.id || '');
                setAdjStorageId(storageAccounts[0]?.id || '');
                setAdjAmount(0);
                setAdjReason('');
                setAdjDocName('');
                setShowAdjModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#7C9CF5] text-white hover:bg-indigo-600 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajukan Penyesuaian
            </button>
          </div>

          {/* Adjustments Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/75 text-gray-600 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">Kas</th>
                    <th className="py-3 px-4">Tempat Penyimpanan</th>
                    <th className="py-3 px-4 text-right">Nominal (+/-)</th>
                    <th className="py-3 px-4">Alasan & Bukti</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {openingAdjustments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-gray-400">
                        Belum ada pengajuan penyesuaian saldo awal.
                      </td>
                    </tr>
                  ) : (
                    openingAdjustments.map((adj) => {
                      const kas = kasList.find((k) => k.id === adj.kas_id);
                      const stor = storageAccounts.find((s) => s.id === adj.storage_account_id);

                      return (
                        <tr key={adj.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-gray-900">{kas?.nama || '-'}</td>
                          <td className="py-3 px-4 text-xs text-gray-600">{stor?.nama || '-'}</td>
                          <td
                            className={`py-3 px-4 text-right font-bold tabular-nums ${
                              adj.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {adj.amount >= 0 ? `+${formatRupiah(adj.amount)}` : formatRupiah(adj.amount)}
                          </td>
                          <td className="py-3 px-4 text-xs max-w-xs text-gray-700">
                            <div>{adj.reason}</div>
                            {adj.document_url && (
                              <span className="text-[10px] text-gray-400 mt-0.5 block">
                                Lampiran: {adj.document_url}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {adj.status === 'submitted' && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Menunggu Ketua Kas
                              </span>
                            )}
                            {adj.status === 'approved_ketua' && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                Menunggu Bendahara Umum
                              </span>
                            )}
                            {adj.status === 'approved_bendum' && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Tuntas (Diterapkan)
                              </span>
                            )}
                            {adj.status === 'rejected' && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                Ditolak
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {adj.status === 'submitted' && (canApproveKas(adj.kas_id) || isAdmin) && (
                              <button
                                onClick={() => approveOpeningAdjustment(adj.id, true)}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100"
                              >
                                Setujui Ketua
                              </button>
                            )}
                            {adj.status === 'approved_ketua' && (isAdmin || isBendaharaUmum) && (
                              <button
                                onClick={() => approveOpeningAdjustment(adj.id, true)}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                Sahkan & Terapkan
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RINGKASAN TAHUN LALU (MANUAL)                                      */}
      {/* ========================================================================= */}
      {activeTab === 'prior_year' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Angka Realisasi Tahun Sebelumnya ({openingSetup.first_year - 1})
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Diinput secara ringkas per kategori dari buku kas manual sebagai bahan pembanding pada
                  laporan keuangan tahun berjalan.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Pilih Kas</label>
                <select
                  value={priorYearKasId}
                  onChange={(e) => setPriorYearKasId(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-800"
                >
                  {kasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Categories Input Table */}
            <div className="overflow-x-auto border border-gray-100 rounded-xl mt-4">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Kategori Pos</th>
                    <th className="py-2.5 px-4">Jenis</th>
                    <th className="py-2.5 px-4 text-right">Realisasi Tahun {openingSetup.first_year - 1}</th>
                    <th className="py-2.5 px-4 text-center">Sumber Data</th>
                    <th className="py-2.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {categories.map((cat) => {
                    const match = priorYearSummaries.find(
                      (p) => p.kas_id === priorYearKasId && p.category_id === cat.id
                    );
                    const val = match ? match.jumlah : 0;

                    return (
                      <tr key={cat.id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-4 font-semibold text-gray-900">
                          {cat.nama} {cat.kode ? `(${cat.kode})` : ''}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              cat.tipe === 'income'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {cat.tipe === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold tabular-nums">
                          {formatRupiah(val)}
                        </td>
                        <td className="py-2.5 px-4 text-center text-xs text-gray-400">Pencatatan Manual</td>
                        <td className="py-2.5 px-4 text-center">
                          {(isAdmin || isBendaharaUmum) && (
                            <button
                              onClick={() => {
                                const input = prompt(`Masukkan total realisasi tahun lalu untuk ${cat.nama}:`, String(val));
                                if (input !== null) {
                                  const num = parseFloat(input);
                                  if (!isNaN(num) && num >= 0) {
                                    savePriorYearSummary({
                                      kas_id: priorYearKasId,
                                      category_id: cat.id,
                                      tahun: openingSetup.first_year - 1,
                                      jumlah: num,
                                    });
                                  }
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-[#7C9CF5] hover:bg-indigo-50 rounded"
                            >
                              Ubah Angka
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* WIZARD MODAL (4 LANGKAH LENGKAP)                                          */}
      {/* ========================================================================= */}
      {wizardKasId && selectedWizardKas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Wizard Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-[#7C9CF5] uppercase tracking-wider">
                  Wizard Pembukaan Buku
                </span>
                <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                  Saldo Awal: {selectedWizardKas.nama}
                </h3>
              </div>
              <button
                onClick={() => setWizardKasId(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div
                className={`p-2 rounded-xl border ${
                  wizardStep === 1
                    ? 'border-[#7C9CF5] bg-[#7C9CF5]/10 font-bold text-[#7C9CF5]'
                    : wizardStep > 1
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                1. Saldo Kas & Bank
              </div>
              <div
                className={`p-2 rounded-xl border ${
                  wizardStep === 2
                    ? 'border-[#7C9CF5] bg-[#7C9CF5]/10 font-bold text-[#7C9CF5]'
                    : wizardStep > 2
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                2. Pencocokan Fisik
              </div>
              <div
                className={`p-2 rounded-xl border ${
                  wizardStep === 3
                    ? 'border-[#7C9CF5] bg-[#7C9CF5]/10 font-bold text-[#7C9CF5]'
                    : wizardStep > 3
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                3. Posisi Lain
              </div>
              <div
                className={`p-2 rounded-xl border ${
                  wizardStep === 4
                    ? 'border-[#7C9CF5] bg-[#7C9CF5]/10 font-bold text-[#7C9CF5]'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                4. Ringkasan
              </div>
            </div>

            {/* STEP 1: Saldo Kas & Bank */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Masukkan nominal saldo pindahan per 31 Desember untuk setiap tempat penyimpanan kas seksi
                  ini.
                </p>

                <div className="space-y-3">
                  {storageAccounts.map((sa) => (
                    <div key={sa.id} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <strong className="text-xs text-gray-800">{sa.nama}</strong>
                        <span className="text-[11px] text-gray-400">
                          {sa.tipe === 'cash' ? 'Uang Tunai Fisik' : `Rekening: ${sa.nomor_rekening}`}
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">Rp</span>
                        <input
                          type="number"
                          min="0"
                          step="10000"
                          value={wizardAmounts[sa.id] ?? ''}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setWizardAmounts((prev) => ({ ...prev, [sa.id]: val }));
                            setWizardPhysical((prev) => ({
                              ...prev,
                              [sa.id]: {
                                book: val,
                                physical: prev[sa.id]?.physical ?? val,
                                explanation: prev[sa.id]?.explanation || '',
                                docName: prev[sa.id]?.docName || '',
                              },
                            }));
                          }}
                          placeholder="0"
                          className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#7C9CF5]"
                        />
                      </div>
                      {wizardAmounts[sa.id] > 0 && (
                        <p className="text-[11px] text-gray-400 mt-1">
                          Terbilang: {formatRupiah(wizardAmounts[sa.id])}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-900">
                  <span>Total Saldo Pindahan:</span>
                  <span className="text-sm tabular-nums">
                    {formatRupiah(Object.values(wizardAmounts).reduce((a, b) => a + b, 0))}
                  </span>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleWizardSaveStep1}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#7C9CF5] text-white hover:bg-indigo-600 shadow-sm"
                  >
                    <span>Lanjut ke Pencocokan Fisik</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Pencocokan dengan Fisik & Rekening Koran */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Bandingkan saldo menurut buku manual dengan uang tunai hasil hitung fisik atau saldo mutasi
                  rekening koran. Jika terdapat selisih, penjelasan tertulis wajib diisi.
                </p>

                <div className="space-y-4">
                  {storageAccounts.map((sa) => {
                    const phys = wizardPhysical[sa.id] || { book: 0, physical: 0, explanation: '', docName: '' };
                    const diff = phys.physical - phys.book;

                    return (
                      <div key={sa.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <strong className="text-xs text-gray-800">{sa.nama}</strong>
                          <span
                            className={`text-xs font-bold tabular-nums ${
                              diff === 0 ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            Selisih: {formatRupiah(diff)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-gray-500 mb-1">Saldo Buku Manual</label>
                            <input
                              type="number"
                              disabled
                              value={phys.book}
                              className="w-full px-3 py-1.5 rounded-lg bg-gray-200/60 font-bold tabular-nums text-gray-700"
                            />
                          </div>

                          <div>
                            <label className="block text-gray-500 mb-1">Hitung Fisik / Rek. Koran *</label>
                            <input
                              type="number"
                              min="0"
                              value={phys.physical}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setWizardPhysical((prev) => ({
                                  ...prev,
                                  [sa.id]: { ...prev[sa.id], physical: val },
                                }));
                              }}
                              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#7C9CF5]"
                            />
                          </div>
                        </div>

                        {diff !== 0 && (
                          <div>
                            <label className="block text-xs font-semibold text-rose-700 mb-1">
                              Penjelasan Alasan Selisih * (Wajib)
                            </label>
                            <input
                              type="text"
                              placeholder="Misal: Uang kembalian belanja belum disetor bendahara / selisih kuitansi"
                              value={phys.explanation}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWizardPhysical((prev) => ({
                                  ...prev,
                                  [sa.id]: { ...prev[sa.id], explanation: val },
                                }));
                              }}
                              className="w-full px-3 py-1.5 rounded-lg border border-rose-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500">
                          <span>Unggah foto hitung fisik / lembar manual:</span>
                          <input
                            type="text"
                            placeholder="Nama dokumen foto/lampiran"
                            value={phys.docName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setWizardPhysical((prev) => ({
                                ...prev,
                                [sa.id]: { ...prev[sa.id], docName: val },
                              }));
                            }}
                            className="px-2 py-1 rounded border border-gray-200 text-xs w-48"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                  </button>
                  <button
                    onClick={handleWizardSaveStep2}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#7C9CF5] text-white hover:bg-indigo-600 shadow-sm"
                  >
                    <span>Lanjut ke Posisi Lain</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Posisi Lain (Inventaris, Panjar, Utang) */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Posisi aset tetap awal, panjar belum selesai, piutang, dan utang per 1 Januari (opsional,
                    bisa dilewati).
                  </p>
                  <button
                    onClick={() => {
                      setOtherPosKasId(wizardKasId);
                      setShowOtherPosModal(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Posisi Lain
                  </button>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100 text-xs">
                  {openingOtherPositions.filter((p) => p.kas_id === wizardKasId).length === 0 ? (
                    <div className="p-6 text-center text-gray-400">
                      Belum ada posisi aset atau panjar lain yang dicatat. Anda dapat menambahkannya atau
                      langsung melanjutkan.
                    </div>
                  ) : (
                    openingOtherPositions
                      .filter((p) => p.kas_id === wizardKasId)
                      .map((pos) => (
                        <div key={pos.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                          <div>
                            <strong className="block text-gray-900">{pos.name}</strong>
                            <span className="text-[11px] text-gray-500">
                              {pos.type} · Nilai: {formatRupiah(pos.amount)} · Pengelola: {pos.section_manager}
                            </span>
                          </div>
                          <button
                            onClick={() => deleteOpeningOtherPosition(pos.id)}
                            className="p-1 rounded text-gray-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                  )}
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                  </button>
                  <button
                    onClick={() => setWizardStep(4)}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#7C9CF5] text-white hover:bg-indigo-600 shadow-sm"
                  >
                    <span>Lanjut ke Ringkasan & Ajukan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Ringkasan & Pengajuan */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Periksa kembali seluruh saldo pindahan sebelum diajukan kepada Ketua Kas untuk diverifikasi.
                </p>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                  <h4 className="font-bold text-gray-900 mb-2">Rincian Saldo Kas {selectedWizardKas.nama}:</h4>
                  {storageAccounts.map((sa) => (
                    <div key={sa.id} className="flex items-center justify-between py-1 border-b border-gray-200/60">
                      <span className="text-gray-600">{sa.nama}:</span>
                      <strong className="text-gray-900 tabular-nums">
                        {formatRupiah(wizardAmounts[sa.id] || 0)}
                      </strong>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 text-sm font-bold text-emerald-800">
                    <span>Total Saldo Awal:</span>
                    <span className="tabular-nums">
                      {formatRupiah(Object.values(wizardAmounts).reduce((a, b) => a + b, 0))}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Setelah diajukan, Ketua Kas akan memeriksa fisik dan dokumen. Jika disetujui, Bendahara
                    Umum akan mengunci saldo awal sehingga kas dapat langsung aktif menerima transaksi.
                  </span>
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setWizardStep(3)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                  </button>
                  <button
                    onClick={handleWizardSubmitToKetua}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    Ajukan ke Ketua Kas
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH POSISI LAIN (ASET / PANJAR / UTANG)                          */}
      {/* ========================================================================= */}
      {showOtherPosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Tambah Posisi Lain</h3>
              <button
                onClick={() => setShowOtherPosModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Jenis Posisi</label>
                <select
                  value={otherPosType}
                  onChange={(e) => setOtherPosType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                >
                  <option value="asset">Inventaris / Aset Tetap Awal</option>
                  <option value="advance">Panjar Belum Selesai</option>
                  <option value="receivable">Piutang</option>
                  <option value="payable">Utang / Kewajiban Awal</option>
                  <option value="restricted_fund">Dana Titipan / Terikat</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Nama Posisi / Aset *</label>
                <input
                  type="text"
                  placeholder="Contoh: Sound System Yamaha Pastori, Panjar Semen"
                  value={otherPosName}
                  onChange={(e) => setOtherPosName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Nilai Perolehan / Taksiran (Rp) *</label>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={otherPosAmount || ''}
                  onChange={(e) => setOtherPosAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold tabular-nums"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Seksi / Pelayan Pengelola</label>
                <input
                  type="text"
                  placeholder="Contoh: Seksi Musik, Seksi Pembangunan"
                  value={otherPosManager}
                  onChange={(e) => setOtherPosManager(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Keterangan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Spesifikasi atau catatan kondisi"
                  value={otherPosNotes}
                  onChange={(e) => setOtherPosNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowOtherPosModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (!otherPosName.trim()) {
                    alert('Nama posisi wajib diisi.');
                    return;
                  }
                  await saveOpeningOtherPosition({
                    kas_id: otherPosKasId,
                    type: otherPosType,
                    name: otherPosName,
                    amount: otherPosAmount,
                    section_manager: otherPosManager,
                    notes: otherPosNotes,
                  });
                  setShowOtherPosModal(false);
                  setOtherPosName('');
                  setOtherPosAmount(0);
                  setOtherPosNotes('');
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#7C9CF5] text-white hover:bg-indigo-600"
              >
                Simpan Posisi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: AJUKAN PENYESUAIAN SALDO AWAL (SETELAH DIKUNCI)                    */}
      {/* ========================================================================= */}
      {showAdjModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Ajukan Penyesuaian Saldo Awal</h3>
              <button
                onClick={() => setShowAdjModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-600 mb-1">Kas Terpilih *</label>
                <select
                  value={adjKasId}
                  onChange={(e) => setAdjKasId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                >
                  {kasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Tempat Penyimpanan *</label>
                <select
                  value={adjStorageId}
                  onChange={(e) => setAdjStorageId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                >
                  {storageAccounts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">
                  Nominal Penyesuaian (Gunakan tanda minus (-) jika mengurangi) *
                </label>
                <input
                  type="number"
                  step="10000"
                  value={adjAmount || ''}
                  onChange={(e) => setAdjAmount(Number(e.target.value))}
                  placeholder="Misal: 250000 atau -100000"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-bold tabular-nums"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Alasan Penyesuaian * (Wajib)</label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Koreksi jasa giro bank bulan Desember yang belum tercatat di buku kas manual"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-600 mb-1">Nama Dokumen / Bukti</label>
                <input
                  type="text"
                  placeholder="Contoh: Rekening_Koran_Desember.pdf"
                  value={adjDocName}
                  onChange={(e) => setAdjDocName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowAdjModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const res = await saveOpeningAdjustment({
                    kas_id: adjKasId,
                    storage_account_id: adjStorageId,
                    amount: adjAmount,
                    reason: adjReason,
                    document_url: adjDocName,
                  });
                  if (!res.success) {
                    alert(res.error);
                    return;
                  }
                  alert('Pengajuan penyesuaian saldo awal berhasil diajukan.');
                  setShowAdjModal(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#7C9CF5] text-white hover:bg-indigo-600"
              >
                Kirim Pengajuan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KEMBALIKAN SALDO AWAL (CATATAN REJECT KETUA)                       */}
      {/* ========================================================================= */}
      {returnModalKasId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Kembalikan Saldo Awal ke Bendahara</h3>
            <p className="text-xs text-gray-500">
              Tuliskan alasan pengembalian dan bagian saldo atau bukti fisik yang perlu diperbaiki.
            </p>

            <textarea
              rows={4}
              placeholder="Contoh: Nominal kas fisik tunai belum cocok dengan lembar hitung fisik, silakan hitung ulang."
              value={returnNoteInput}
              onChange={(e) => setReturnNoteInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setReturnModalKasId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (!returnNoteInput.trim()) {
                    alert('Catatan pengembalian wajib diisi.');
                    return;
                  }
                  const res = await approveOpeningBook(returnModalKasId, false, returnNoteInput);
                  if (!res.success) {
                    alert(res.error);
                    return;
                  }
                  setReturnModalKasId(null);
                  setReturnNoteInput('');
                  alert('Pengajuan telah dikembalikan ke bendahara.');
                }}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
              >
                Kembalikan Draf
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
