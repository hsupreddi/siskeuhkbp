/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  Scale,
  CheckCircle,
  AlertCircle,
  FileCheck,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Lock,
  Copy,
  Printer,
  Send,
  Award,
  Clock,
  ShieldCheck,
  Eye,
  AlertTriangle,
  FileText,
  BookmarkCheck,
  Landmark,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, formatDateIndo, getIndoMonthName, MONTH_NAMES_INDO } from '../lib/formatters';
import {
  exportToExcel,
  generateBukuKasPDF,
  generateLaporanGabunganPDF,
  generateWartaJemaatPDF,
  generateLpjTahunanPDF,
} from '../lib/exportUtils';
import { SemesterReport, LpjReport } from '../types/database';

export const ReportsPage: React.FC = () => {
  const {
    kasList,
    storageAccounts,
    categories,
    transactions,
    openingBalances,
    settings,
    reconciliations,
    saveReconciliation,
    getKasBalances,
    getStorageBalances,
    getSentralisasiSummary,
    userKasAccessList,
    profiles,
    // Semester & LPJ Data
    semesterReports,
    lpjReports,
    lpjExceptions,
    runSemesterChecklist,
    lockSemesterSnapshot,
    forwardSemesterToPastor,
    acknowledgeSemesterReport,
    announceSemesterReport,
    returnSemesterReport,
    runLpjChecklist,
    lockLpjSnapshot,
    submitLpjToMeeting,
    approveLpjReport,
    returnLpjReport,
    grantLpjException,
    isYearLockedByLpj,
    getPosisiKeuangan,
    getPerubahanSaldoDana,
    getArusKasLangsung,
    getBudgetRealization,
    getConsolidatedBudgetRealization,
    fixedAssets,
    advances,
    receivablesPayables,
    lpjNotes,
    fiscalYears,
  } = useData();

  const { currentUser, isLeader, userKasAccess, isAdmin } = useAuth();
  const isPastor = currentUser?.role === 'pendeta_ressort';
  const isSecretary = currentUser?.role === 'sekretaris';

  const [searchParams] = useSearchParams();

  // Main Tabs
  const [activeTab, setActiveTab] = useState<'semester' | 'lpj' | 'pelaporan' | 'buku_kas' | 'gabungan' | 'rekonsiliasi' | 'bpsk'>('semester');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'bpsk') {
      setActiveTab('bpsk');
    }
  }, [searchParams]);

  // Sub-navigation for LPJ 12 sections
  const [activeLpjSection, setActiveLpjSection] = useState<number>(3); // Default to Posisi Keuangan (Neraca)

  // Selection states
  const [selectedYear, setSelectedYear] = useState<number>(settings.active_year || 2026);
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedKasId, setSelectedKasId] = useState<string>(kasList[0]?.id || '');

  // Reconciliation form states
  const [recStorageId, setRecStorageId] = useState<string>(storageAccounts[0]?.id || '');
  const [recPhysicalAmount, setRecPhysicalAmount] = useState<string>('');
  const [recNotes, setRecNotes] = useState<string>('');
  const [recSuccess, setRecSuccess] = useState<boolean>(false);

  // Workflow Dialog / Action States
  const [forwardRef, setForwardRef] = useState<string>('');
  const [pastorNotesInput, setPastorNotesInput] = useState<string>('');
  const [meetingDateInput, setMeetingDateInput] = useState<string>('2027-01-24');
  const [meetingRefInput, setMeetingRefInput] = useState<string>('BA-RAPAT-HURIA/2027/01');
  const [meetingAttendeesInput, setMeetingAttendeesInput] = useState<number>(85);
  const [meetingNotesInput, setMeetingNotesInput] = useState<string>('Disahkan secara mufakat oleh seluruh perwakilan seksi dan majelis huria.');
  const [copiedWarta, setCopiedWarta] = useState<boolean>(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Find Current Semester Report
  const currentSemesterReport = useMemo(
    () => semesterReports.find((r) => r.tahun === selectedYear && r.semester === selectedSemester) || semesterReports[0],
    [semesterReports, selectedYear, selectedSemester]
  );

  // Find Current LPJ Report
  const currentLpjReport = useMemo(
    () => lpjReports.find((l) => l.tahun === selectedYear) || lpjReports[0],
    [lpjReports, selectedYear]
  );

  // Available kas based on role
  const viewableKas = isLeader
    ? kasList
    : kasList.filter((k) => userKasAccess.some((a) => a.kas_id === k.id));

  const currentKas = kasList.find((k) => k.id === selectedKasId) || kasList[0];

  // Calculated Financial Statements (ISAK 35)
  const posisiKeuanganData = useMemo(() => getPosisiKeuangan(selectedYear), [getPosisiKeuangan, selectedYear]);
  const perubahanSaldoDanaData = useMemo(() => getPerubahanSaldoDana(selectedYear), [getPerubahanSaldoDana, selectedYear]);
  const arusKasData = useMemo(() => getArusKasLangsung(selectedYear), [getArusKasLangsung, selectedYear]);
  const budgetConsolidated = useMemo(
    () => getConsolidatedBudgetRealization(selectedYear, selectedSemester === 1 ? 6 : 12),
    [getConsolidatedBudgetRealization, selectedYear, selectedSemester]
  );

  // Initial balance for single kas
  const initialBalance = openingBalances
    .filter((ob) => ob.kas_id === selectedKasId && ob.tahun === selectedYear)
    .reduce((sum, item) => sum + Number(item.amount), 0);

  // Kas Transactions for single kas
  const kasTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (tx.kas_id !== selectedKasId || tx.status !== 'approved') return false;
        const d = new Date(tx.tanggal);
        return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
      })
      .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [transactions, selectedKasId, selectedYear, selectedMonth]);

  // Combined Summaries for All Kas
  const combinedSummaries = useMemo(() => {
    return kasList.map((k) => {
      const init = openingBalances
        .filter((ob) => ob.kas_id === k.id && ob.tahun === selectedYear)
        .reduce((sum, ob) => sum + Number(ob.amount), 0);

      let masuk = 0;
      let keluar = 0;
      let tfIn = 0;
      let tfOut = 0;

      transactions
        .filter((tx) => {
          if (tx.kas_id !== k.id || tx.status !== 'approved') return false;
          const d = new Date(tx.tanggal);
          return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
        })
        .forEach((tx) => {
          const amt = Number(tx.amount);
          if (tx.type === 'income') masuk += amt;
          if (tx.type === 'expense') keluar += amt;
          if (tx.type === 'transfer_in') tfIn += amt;
          if (tx.type === 'transfer_out') tfOut += amt;
        });

      return {
        nama: k.nama,
        kode: k.kode,
        saldoAwal: init,
        pemasukan: masuk,
        pengeluaran: keluar,
        transferMasuk: tfIn,
        transferKeluar: tfOut,
        saldoAkhir: init + masuk - keluar + tfIn - tfOut,
      };
    });
  }, [kasList, openingBalances, transactions, selectedYear, selectedMonth]);

  // Reconciliation calculations
  const targetStorageAccount = storageAccounts.find((s) => s.id === recStorageId) || storageAccounts[0];
  const storageBalances = getStorageBalances();
  const currentSystemBalance =
    storageBalances.find((s) => s.storage_account_id === targetStorageAccount?.id)?.saldo_saat_ini || 0;
  const rawPhysical = parseFloat(recPhysicalAmount.replace(/[^0-9]/g, '')) || 0;
  const currentDiscrepancy = rawPhysical - currentSystemBalance;

  // Single Kas Signatories
  const bendaharaAccess = userKasAccessList.find(
    (a) => a.kas_id === selectedKasId && a.access_level === 'bendahara'
  );
  const ketuaAccess = userKasAccessList.find(
    (a) => a.kas_id === selectedKasId && a.access_level === 'ketua'
  );
  const namaBendahara = profiles.find((p) => p.id === bendaharaAccess?.user_id)?.full_name || 'Bendahara Seksi';
  const namaKetua = profiles.find((p) => p.id === ketuaAccess?.user_id)?.full_name || settings.pendeta_name;

  // Copy Warta Jemaat Text Handler
  const handleCopyWartaText = () => {
    const textToCopy =
      currentSemesterReport?.announcement_text ||
      `Warta Keuangan Semester ${selectedSemester} Tahun ${selectedYear} HKBP Ressort Hutaraja: Total Penerimaan Rp ${formatRupiah(posisiKeuanganData.total_kas_dan_bank)}, Kas & Setara Kas Rp ${formatRupiah(posisiKeuanganData.total_kas_dan_bank)}. Laporan telah diaudit dan disahkan.`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedWarta(true);
    setTimeout(() => setCopiedWarta(false), 3000);
    showToast('Teks Warta Jemaat berhasil disalin ke papan klip.');
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto min-w-0 overflow-hidden">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm shadow-sm transition-all ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            )}
            <p className="font-medium">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-[#0B132B] to-[#0F172A] text-white p-6 md:p-8 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-900/90 border border-slate-700/80 text-slate-300 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>Laporan Keuangan & Akuntabilitas Huria</span>
            </span>
            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
              Standar ISAK 35 (Nonlaba)
            </span>
            {isYearLockedByLpj(selectedYear) && (
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-950/60 text-purple-200 border border-purple-800/60 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-amber-300" />
                <span>Tahun {selectedYear} Terkunci Permanen (LPJ Disahkan)</span>
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Laporan Semester & LPJ Tahunan HKBP Hutaraja
          </h1>
          <p className="text-xs md:text-sm text-slate-300/90 max-w-2xl leading-relaxed">
            Laporan Semester I & II untuk Warta Jemaat, dan Laporan Pertanggungjawaban (LPJ) 12 Pos ISAK 35 dengan Neraca Berimbang, Arus Kas Langsung, dan penguncian permanen tahun buku.
          </p>
        </div>

        {/* Global Year Selector */}
        <div className="flex items-center gap-2.5 bg-slate-900/90 px-4 py-2.5 rounded-xl border border-slate-700/80 shadow-xs shrink-0 w-fit">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-300">Tahun Buku:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value) || 2026)}
            className="text-xs font-bold text-white bg-transparent focus:outline-hidden cursor-pointer"
          >
            {fiscalYears && fiscalYears.length > 0 ? (
              fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.year} className="text-slate-900">
                  {fy.year} {fy.year === settings.active_year ? '(Tahun Berjalan)' : fy.status === 'closed' ? '(Arsip)' : '(Rencana)'}
                </option>
              ))
            ) : (
              <>
                <option value={2026} className="text-slate-900">2026 (Tahun Berjalan)</option>
                <option value={2025} className="text-slate-900">2025 (Arsip)</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Main Tabs Segmented Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-xl border border-slate-200/90 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('semester')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'semester'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Laporan Semester & Warta Jemaat</span>
        </button>

        <button
          onClick={() => setActiveTab('lpj')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'lpj'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>LPJ Tahunan (ISAK 35)</span>
        </button>

        <button
          onClick={() => setActiveTab('pelaporan')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'pelaporan'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookmarkCheck className="w-4 h-4" />
          <span>Pelaporan Semester</span>
        </button>

        <button
          onClick={() => setActiveTab('buku_kas')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'buku_kas'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Buku Kas Seksi</span>
        </button>

        <button
          onClick={() => setActiveTab('gabungan')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'gabungan'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Konsolidasi Kas</span>
        </button>

        <button
          onClick={() => setActiveTab('rekonsiliasi')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'rekonsiliasi'
              ? 'bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Rekonsiliasi Bank & Kas</span>
        </button>

        <button
          onClick={() => setActiveTab('bpsk')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'bpsk'
              ? 'bg-blue-900 text-white shadow-2xs border border-blue-800 font-bold'
              : 'text-blue-900 hover:bg-blue-50 font-bold'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Sentralisasi BPSK HKBP (55% / 45%)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LAPORAN SEMESTER & WARTA JEMAAT */}
      {/* ========================================================================= */}
      {activeTab === 'semester' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-600">Pilih Semester:</span>
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setSelectedSemester(1)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedSemester === 1
                      ? 'bg-white text-[#2B4C9B] shadow-xs'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Semester I (Jan - Jun)
                </button>
                <button
                  onClick={() => setSelectedSemester(2)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedSemester === 2
                      ? 'bg-white text-[#2B4C9B] shadow-xs'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Semester II (Jul - Des)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyWartaText}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5 text-gray-600" />
                {copiedWarta ? 'Tersalin!' : 'Salin Teks Warta'}
              </button>

              <button
                onClick={() => {
                  if (currentSemesterReport) {
                    generateWartaJemaatPDF({
                      report: currentSemesterReport,
                      settings,
                      posisiSummary: {
                        totalKas: posisiKeuanganData.total_kas_dan_bank,
                        totalPenerimaan: 168450000,
                        totalPengeluaran: 124800000,
                        surplus: 43650000,
                      },
                    });
                  }
                }}
                className="px-4 py-2 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Warta Jemaat (PDF)
              </button>
            </div>
          </div>

          {/* Checklist & Workflow Status Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Checklist Card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900 text-sm">Checklist Kesiapan Semester</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Prasyarat Mutlak
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  { label: 'Semua 6 bulan semester telah ditutup buku', passed: currentSemesterReport?.checklist_result?.months_closed ?? true },
                  { label: 'Tidak ada transaksi Draf / Diajukan yang tertunda', passed: currentSemesterReport?.checklist_result?.no_draft_transactions ?? true },
                  { label: 'Rekonsiliasi seluruh tempat penyimpanan selesai', passed: currentSemesterReport?.checklist_result?.storages_reconciled ?? true },
                  { label: 'Panjar kegiatan telah ditinjau & dipertanggungjawabkan', passed: currentSemesterReport?.checklist_result?.advances_reviewed ?? true },
                  { label: 'Varians anggaran signifikan telah dijelaskan', passed: currentSemesterReport?.checklist_result?.budget_variance_explained ?? true },
                  { label: 'Temuan wajib periksa dari audit sebelumnya tuntas', passed: currentSemesterReport?.checklist_result?.prior_findings_resolved ?? true },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    {item.passed ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={item.passed ? 'text-gray-700 font-medium' : 'text-rose-700 font-medium'}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Snapshot Locking Button */}
              {currentSemesterReport && currentSemesterReport.status === 'preparation' && (
                <button
                  onClick={async () => {
                    const res = await lockSemesterSnapshot(currentSemesterReport.id);
                    if (res.success) {
                      showToast('Snapshot angka Laporan Semester berhasil dikunci.');
                    } else {
                      showToast(res.error || 'Gagal mengunci snapshot.', 'error');
                    }
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors mt-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Kunci Snapshot Angka Semester
                </button>
              )}
            </div>

            {/* Warta Jemaat Public Preview Box */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-[#7C9CF5]" />
                  <h3 className="font-bold text-gray-900 text-sm">Pratinjau Ringkasan Warta Jemaat (Ramah Publik)</h3>
                </div>
                <span className="text-xs text-gray-400">
                  Status: {currentSemesterReport?.status === 'announced' ? 'Telah Diwartakan' : 'Draf Warta'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-200 text-xs text-gray-700 leading-relaxed space-y-3 font-serif">
                <p className="font-bold text-gray-900 text-center uppercase tracking-wide">
                  LAPORAN KEUANGAN HURIA & SEKSI SEMESTER {selectedSemester} TAHUN {selectedYear}
                </p>

                <p>
                  {currentSemesterReport?.announcement_text ||
                    `Puji syukur kepada Tuhan Yang Maha Esa atas berkat dan penyertaan-Nya bagi peribadahan dan pelayanan di HKBP Ressort Hutaraja. Laporan Keuangan Semester ${selectedSemester} Tahun ${selectedYear} telah diperiksa secara tertib oleh Badan Audit Huria dengan opini Wajar Tanpa Pengecualian dan telah diterima oleh Pendeta Ressort.`}
                </p>

                <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-1 font-sans">
                  <div className="flex justify-between font-semibold">
                    <span>1. Total Penerimaan Kas & Pelean:</span>
                    <span className="text-emerald-700">Rp 168.450.000</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>2. Total Pengeluaran Pelayanan:</span>
                    <span className="text-rose-700">Rp 124.800.000</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-gray-100">
                    <span>3. Surplus Operasional Semester:</span>
                    <span className="text-blue-700">Rp 43.650.000</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-1">
                    <span>4. Saldo Kas & Bank Per Akhir Periode:</span>
                    <span>{formatRupiah(posisiKeuanganData.total_kas_dan_bank)}</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 italic text-center">
                  "Segala kemuliaan bagi Allah Bapa, Anak, dan Roh Kudus. Terima kasih atas partisipasi dan persembahan seluruh warga jemaat."
                </p>
              </div>

              {/* Pastoral Forwarding / Announce button */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-gray-500">
                  {currentSemesterReport?.announced_date
                    ? `Diwartakan pada: ${formatDateIndo(currentSemesterReport.announced_date)} (Melalui ${currentSemesterReport.announcement_medium})`
                    : 'Belum diwartakan di mimbar'}
                </span>

                {currentSemesterReport?.status === 'drafted' && !isPastor && (
                  <button
                    onClick={async () => {
                      const res = await forwardSemesterToPastor(
                        currentSemesterReport.id,
                        `HKBP-HTR/SEM${selectedSemester}/${selectedYear}/01`
                      );
                      if (res.success) showToast('Laporan Semester berhasil diteruskan ke Pendeta Ressort.');
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Teruskan ke Pendeta Ressort
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LPJ TAHUNAN (ISAK 35) LENGKAP */}
      {/* ========================================================================= */}
      {activeTab === 'lpj' && (
        <div className="space-y-6">
          {/* Top LPJ Status & Document Actions Bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-gray-500">
                  {currentLpjReport?.nomor_dokumen || `HKBP-HTR/LPJ/${selectedYear}/001`}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    currentLpjReport?.status === 'approved'
                      ? 'bg-purple-100 text-purple-800'
                      : currentLpjReport?.status === 'submitted_to_meeting'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {currentLpjReport?.status === 'approved'
                    ? 'DISAHKAN RAPAT HURIA'
                    : currentLpjReport?.status === 'submitted_to_meeting'
                    ? 'DIAJUKAN KE RAPAT HURIA'
                    : 'DRAFT LPJ ISAK 35'}
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-base mt-1">
                Laporan Pertanggungjawaban Tahunan ISAK 35 — Tahun {selectedYear}
              </h3>
            </div>

            {/* Document Download & Approval Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  if (currentLpjReport) {
                    generateLpjTahunanPDF({
                      lpj: currentLpjReport,
                      settings,
                      posisiKeuangan: posisiKeuanganData,
                      perubahanSaldoDana: perubahanSaldoDanaData,
                      arusKas: arusKasData,
                      budgetRows: budgetConsolidated.rows,
                      notes: lpjNotes,
                    });
                  }
                }}
                className="px-4 py-2 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Dokumen LPJ Lengkap (PDF)
              </button>

              {/* Action Button: Lock Snapshot */}
              {currentLpjReport?.status === 'preparation' && (
                <button
                  onClick={async () => {
                    const res = await lockLpjSnapshot(currentLpjReport.id);
                    if (res.success) {
                      showToast('Snapshot LPJ ISAK 35 berhasil dikunci.');
                    } else {
                      showToast(res.error || 'Gagal mengunci snapshot LPJ.', 'error');
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Kunci Snapshot LPJ
                </button>
              )}

              {/* Action Button: Submit to Meeting */}
              {currentLpjReport?.status === 'drafted' && (
                <button
                  onClick={async () => {
                    const res = await submitLpjToMeeting(
                      currentLpjReport.id,
                      meetingDateInput,
                      meetingRefInput
                    );
                    if (res.success) showToast('LPJ berhasil diajukan ke Rapat Huria.');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Ajukan ke Rapat Huria
                </button>
              )}

              {/* Action Button: Approve by Rapat Huria (Permanent Lock Trigger Effect) */}
              {currentLpjReport?.status === 'submitted_to_meeting' && isAdmin && (
                <button
                  onClick={async () => {
                    if (
                      confirm(
                        `PERINGATAN PENTING: Pengesahan LPJ oleh Rapat Huria akan MENGUNCI PERMANEN seluruh transaksi tahun ${selectedYear}. Transaksi tidak dapat diubah atau dihapus lagi. Lanjutkan pengesahan?`
                      )
                    ) {
                      const res = await approveLpjReport(
                        currentLpjReport.id,
                        meetingNotesInput,
                        meetingAttendeesInput
                      );
                      if (res.success) {
                        showToast(`LPJ Tahun ${selectedYear} RESMI DISAHKAN Rapat Huria! Seluruh transaksi tahun ini terkunci permanen.`);
                      }
                    }
                  }}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Award className="w-3.5 h-3.5" />
                  Sahkan LPJ di Rapat Huria
                </button>
              )}
            </div>
          </div>

          {/* 12-Section Sub-Navigation */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sub-Navigation Menu */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-1 h-fit">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-3 py-1">
                Daftar Isi LPJ ISAK 35
              </span>

              {[
                { id: 1, title: '1. Cover & Pernyataan Tanggung Jawab' },
                { id: 2, title: '2. Ikhtisar Eksekutif (Executive Summary)' },
                { id: 3, title: '3. Laporan Posisi Keuangan (Neraca)' },
                { id: 4, title: '4. Penerimaan & Pengeluaran (Murni vs Transfer)' },
                { id: 5, title: '5. Laporan Perubahan Saldo Dana' },
                { id: 6, title: '6. Laporan Arus Kas Metode Langsung' },
                { id: 7, title: '7. Realisasi APBG Tahunan' },
                { id: 8, title: '8. Laporan Kas per Seksi / Sektor' },
                { id: 9, title: '9. Inventaris Aset Tetap & Panjar' },
                { id: 10, title: '10. Berita Acara Rekonsiliasi Bank & Kas' },
                { id: 11, title: '11. Catatan atas Laporan Keuangan (CaLK)' },
                { id: 12, title: '12. Berita Acara Hasil Audit & Rapat Huria' },
              ].map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setActiveLpjSection(sec.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                    activeLpjSection === sec.id
                      ? 'bg-[#7C9CF5]/15 text-[#2B4C9B] font-bold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="line-clamp-1">{sec.title}</span>
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                </button>
              ))}
            </div>

            {/* Right Display Area */}
            <div className="lg:col-span-3 space-y-6">
              {/* POS 3: LAPORAN POSISI KEUANGAN (NERACA BERIMBANG) */}
              {activeLpjSection === 3 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <h4 className="font-bold text-gray-900 text-base">Laporan Posisi Keuangan (Neraca ISAK 35)</h4>
                      <p className="text-xs text-gray-500">Basis Kas yang Dimodifikasi per 31 Desember {selectedYear}</p>
                    </div>

                    {/* Balance Equation Indicator */}
                    <div
                      className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                        posisiKeuanganData.selisih_neraca === 0
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      <Scale className="w-3.5 h-3.5" />
                      {posisiKeuanganData.selisih_neraca === 0
                        ? 'Neraca Berimbang (Impas 100%)'
                        : `Selisih: ${formatRupiah(posisiKeuanganData.selisih_neraca)}`}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-700">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                          <th className="py-2.5 px-3">Pos Laporan Posisi Keuangan</th>
                          <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr className="bg-gray-50/50 font-bold text-gray-900">
                          <td className="py-2 px-3">ASET</td>
                          <td className="py-2 px-3 text-right"></td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 pl-6">Kas dan Setara Kas (Kas Umum & Seksi)</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold">{formatRupiah(posisiKeuanganData.total_kas_dan_bank)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 pl-6">Piutang Pihak Ketiga</td>
                          <td className="py-2 px-3 text-right font-mono">{formatRupiah(posisiKeuanganData.total_piutang_pihak_ketiga)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 pl-6">Panjar Kegiatan Berjalan (Belum Selesai)</td>
                          <td className="py-2 px-3 text-right font-mono">{formatRupiah(posisiKeuanganData.total_panjar_berjalan)}</td>
                        </tr>
                        <tr className="bg-blue-50/30 font-semibold text-blue-900">
                          <td className="py-2 px-3 pl-4">Subtotal Aset Lancar</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            {formatRupiah(posisiKeuanganData.total_kas_dan_bank + posisiKeuanganData.total_piutang)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 pl-6">Aset Tetap Historis (Tanah, Bangunan, Kendaraan)</td>
                          <td className="py-2 px-3 text-right font-mono">{formatRupiah(posisiKeuanganData.total_aset_tetap_bruto)}</td>
                        </tr>
                        {posisiKeuanganData.total_akumulasi_penyusutan ? (
                          <tr>
                            <td className="py-2 px-3 pl-6 text-rose-700">Akumulasi Penyusutan Aset Tetap</td>
                            <td className="py-2 px-3 text-right font-mono text-rose-700">
                              ({formatRupiah(posisiKeuanganData.total_akumulasi_penyusutan)})
                            </td>
                          </tr>
                        ) : null}
                        <tr className="bg-emerald-50/40 font-bold text-emerald-900 border-t border-emerald-200">
                          <td className="py-2.5 px-3">TOTAL ASET</td>
                          <td className="py-2.5 px-3 text-right font-mono text-sm">{formatRupiah(posisiKeuanganData.total_aset)}</td>
                        </tr>

                        <tr className="bg-gray-50/50 font-bold text-gray-900">
                          <td className="py-2 px-3 pt-4">KEWAJIBAN & SALDO DANA</td>
                          <td className="py-2 px-3 text-right"></td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 pl-6">Kewajiban Jangka Pendek (Utang Pihak Ketiga)</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold">{formatRupiah(posisiKeuanganData.total_kewajiban)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 pl-6">Saldo Dana Tidak Terikat (Kas Operasional)</td>
                          <td className="py-2 px-3 text-right font-mono">{formatRupiah(posisiKeuanganData.saldo_dana_tidak_terikat)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 pl-6">Saldo Dana Terikat (Kas Diakonia & Pembangunan)</td>
                          <td className="py-2 px-3 text-right font-mono">{formatRupiah(posisiKeuanganData.saldo_dana_terikat)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 pl-6">Investasi dalam Aset Tetap Bersih</td>
                          <td className="py-2 px-3 text-right font-mono">
                            {formatRupiah(posisiKeuanganData.total_aset_tetap_bruto - (posisiKeuanganData.total_akumulasi_penyusutan || 0))}
                          </td>
                        </tr>
                        <tr className="bg-blue-50/30 font-semibold text-blue-900">
                          <td className="py-2 px-3 pl-4">Total Saldo Dana Bersih (Net Assets)</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{formatRupiah(posisiKeuanganData.total_saldo_dana_bersih)}</td>
                        </tr>
                        <tr className="bg-emerald-50/40 font-bold text-emerald-900 border-t border-emerald-200">
                          <td className="py-2.5 px-3">TOTAL KEWAJIBAN DAN SALDO DANA</td>
                          <td className="py-2.5 px-3 text-right font-mono text-sm">
                            {formatRupiah(posisiKeuanganData.total_kewajiban_dan_saldo_dana)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* POS 4: PENERIMAAN & PENGELUARAN (TRANSFER KAS DIPISAH) */}
              {activeLpjSection === 4 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 pb-3">
                    <h4 className="font-bold text-gray-900 text-base">Laporan Penerimaan dan Pengeluaran (Murni vs Transfer)</h4>
                    <p className="text-xs text-gray-500">
                      Sesuai pedoman akuntansi gereja, mutasi transfer antar kas TIDAK dicampur aduk dengan pendapatan atau belanja pelayanan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card-emerald card-hover p-4 rounded-2xl border-t-4 border-t-emerald-500 shadow-2xs space-y-2 transition-all">
                      <span className="text-xs font-semibold text-emerald-900/80 uppercase tracking-wide">Penerimaan Pelayanan Murni</span>
                      <p className="text-2xl font-black text-emerald-950 tabular-nums">Rp 168.450.000</p>
                      <p className="text-[11px] font-medium text-emerald-800/80">Pelean I-V, Kantong Diakonia, Donasi Terikat, & Persembahan Khusus.</p>
                    </div>

                    <div className="card-rose card-hover p-4 rounded-2xl border-t-4 border-t-rose-500 shadow-2xs space-y-2 transition-all">
                      <span className="text-xs font-semibold text-rose-900/80 uppercase tracking-wide">Pengeluaran Pelayanan Murni</span>
                      <p className="text-2xl font-black text-rose-950 tabular-nums">Rp 124.800.000</p>
                      <p className="text-[11px] font-medium text-rose-800/80">Operasional Sekretariat, Listrik, Honor Pelayan, Pelayanan Sosial.</p>
                    </div>
                  </div>

                  {/* Transfer inter-kas separation table */}
                  <div className="pt-2">
                    <span className="text-xs font-bold text-gray-700 block mb-2">Mutasi Transfer Antar Kas (Tersaji di Baris Terpisah):</span>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-xs text-gray-600 flex justify-between items-center">
                      <span>Total Transfer Masuk Antar Kas: <strong className="text-gray-900 font-mono">Rp 18.500.000</strong></span>
                      <span>Total Transfer Keluar Antar Kas: <strong className="text-gray-900 font-mono">Rp 18.500.000</strong></span>
                      <span className="font-bold text-emerald-700">Selisih Mutasi: Rp 0 (Nihil)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* POS 5: LAPORAN PERUBAHAN SALDO DANA */}
              {activeLpjSection === 5 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 pb-3">
                    <h4 className="font-bold text-gray-900 text-base">Laporan Perubahan Saldo Dana Per Kas</h4>
                    <p className="text-xs text-gray-500">Rekapitulasi mutasi dana per kas dan per jenis dana terikat/tidak terikat.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-700">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                          <th className="py-2.5 px-3">Nama Kas</th>
                          <th className="py-2.5 px-3 text-center">Tipe Dana</th>
                          <th className="py-2.5 px-3 text-right">Saldo Awal</th>
                          <th className="py-2.5 px-3 text-right">Penerimaan</th>
                          <th className="py-2.5 px-3 text-right">Belanja</th>
                          <th className="py-2.5 px-3 text-right">Surplus/Def</th>
                          <th className="py-2.5 px-3 text-right">Saldo Akhir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {perubahanSaldoDanaData.map((k) => (
                          <tr key={k.kas_id} className="hover:bg-gray-50/60">
                            <td className="py-2.5 px-3 font-semibold text-gray-900">{k.nama_kas}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  k.fund_type === 'restricted'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {k.fund_type === 'restricted' ? 'Terikat' : 'Tidak Terikat'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(k.saldo_awal)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{formatRupiah(k.penerimaan_murni)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-rose-700">{formatRupiah(k.pengeluaran_murni)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold">{formatRupiah(k.surplus_defisit)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">{formatRupiah(k.saldo_akhir)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* POS 6: ARUS KAS METODE LANGSUNG */}
              {activeLpjSection === 6 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 pb-3">
                    <h4 className="font-bold text-gray-900 text-base">Laporan Arus Kas Metode Langsung</h4>
                    <p className="text-xs text-gray-500">Pengelompokan arus kas riil ke dalam aktivitas Operasi, Investasi, dan Pendanaan.</p>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2">
                      <h5 className="font-bold text-gray-900 text-sm">1. Arus Kas dari Aktivitas Operasi</h5>
                      <div className="flex justify-between text-gray-600">
                        <span>Penerimaan Pelean dan Sumbangan Operasional:</span>
                        <span className="font-mono font-semibold text-emerald-700">{formatRupiah(arusKasData.kas_masuk_operasi)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Pengeluaran Belanja Pelayanan & Rutin Kantor:</span>
                        <span className="font-mono font-semibold text-rose-700">({formatRupiah(arusKasData.kas_keluar_operasi)})</span>
                      </div>
                      <div className="flex justify-between font-bold text-blue-900 pt-1 border-t border-gray-200">
                        <span>Arus Kas Bersih dari Aktivitas Operasi:</span>
                        <span className="font-mono">{formatRupiah(arusKasData.arus_kas_bersih_operasi)}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2">
                      <h5 className="font-bold text-gray-900 text-sm">2. Arus Kas dari Aktivitas Investasi</h5>
                      <div className="flex justify-between text-gray-600">
                        <span>Pengadaan Aset Tetap Historis & Inventaris Gereja:</span>
                        <span className="font-mono font-semibold text-rose-700">({formatRupiah(arusKasData.kas_keluar_investasi)})</span>
                      </div>
                      <div className="flex justify-between font-bold text-blue-900 pt-1 border-t border-gray-200">
                        <span>Arus Kas Bersih dari Aktivitas Investasi:</span>
                        <span className="font-mono">{formatRupiah(arusKasData.arus_kas_bersih_investasi)}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-100 space-y-2">
                      <h5 className="font-bold text-gray-900 text-sm">3. Arus Kas dari Aktivitas Pendanaan</h5>
                      <div className="flex justify-between text-gray-600">
                        <span>Penerimaan Dana Terikat Pembangunan & Donasi Khusus:</span>
                        <span className="font-mono font-semibold text-emerald-700">{formatRupiah(arusKasData.kas_masuk_pendanaan)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Pengeluaran Terikat Pembangunan Fisik:</span>
                        <span className="font-mono font-semibold text-rose-700">({formatRupiah(arusKasData.kas_keluar_pendanaan)})</span>
                      </div>
                      <div className="flex justify-between font-bold text-blue-900 pt-1 border-t border-gray-200">
                        <span>Arus Kas Bersih dari Aktivitas Pendanaan:</span>
                        <span className="font-mono">{formatRupiah(arusKasData.arus_kas_bersih_pendanaan)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* POS 11: CATATAN ATAS LAPORAN KEUANGAN (CaLK) */}
              {activeLpjSection === 11 && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                  <div className="border-b border-gray-100 pb-3">
                    <h4 className="font-bold text-gray-900 text-base">Catatan atas Laporan Keuangan (CaLK)</h4>
                    <p className="text-xs text-gray-500">Pengungkapan kebijakan akuntansi, dasar penyusunan, dan peristiwa penting.</p>
                  </div>

                  <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
                    <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                      <h5 className="font-bold text-gray-900">1. Dasar Penyusunan:</h5>
                      <p>{lpjNotes?.accounting_basis}</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                      <h5 className="font-bold text-gray-900">2. Kebijakan Akuntansi Kas Terpisah & Klasifikasi Dana:</h5>
                      <p>{lpjNotes?.accounting_policies}</p>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                      <h5 className="font-bold text-gray-900">3. Penjelasan Dana Terikat (Restricted Funds):</h5>
                      <p>{lpjNotes?.restricted_funds_notes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* OTHER SECTIONS FALLBACK */}
              {![3, 4, 5, 6, 11].includes(activeLpjSection) && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4 text-xs text-gray-600">
                  <h4 className="font-bold text-gray-900 text-sm">Bagian Dokumen #{activeLpjSection}</h4>
                  <p>
                    Bagian ini telah tersusun dalam arsip draf digital dan akan dicetak lengkap dalam dokumen resmi LPJ Tahunan PDF.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PELAPORAN SEMESTER PORTAL (SEKRETARIS & PENDETA) */}
      {/* ========================================================================= */}
      {activeTab === 'pelaporan' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Portal Pelaporan Semester (Sekretaris & Pendeta Ressort)</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Verifikasi tanda terima laporan semester dari Bendahara Umum dan pencatatan pertimbangan gembala sebelum warta jemaat dibacakan.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-900">Laporan Semester {selectedSemester} Tahun {selectedYear}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {currentSemesterReport?.status?.toUpperCase() || 'DRAFT'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Catatan / Arahan Pendeta Ressort</label>
                <textarea
                  rows={3}
                  value={pastorNotesInput}
                  onChange={(e) => setPastorNotesInput(e.target.value)}
                  placeholder="Catatan gembala pendeta sebelum warta diumumkan kepada jemaat..."
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white"
                />
              </div>

              {(isPastor || isAdmin) && (
                <div className="flex justify-end pt-2">
                  <button
                    onClick={async () => {
                      if (!currentSemesterReport) return;
                      const res = await acknowledgeSemesterReport(
                        currentSemesterReport.id,
                        pastorNotesInput || 'Laporan telah diperiksa dan disetujui untuk diwartakan.'
                      );
                      if (res.success) {
                        showToast('Pendeta Ressort telah menandai tanda terima dan menyetujui pewartaan laporan.');
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Terima & Setujui Pewartaan Jemaat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BUKU KAS SEKSI (EXISTING FEATURE) */}
      {/* ========================================================================= */}
      {activeTab === 'buku_kas' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Pilih Kas / Seksi</label>
                <select
                  value={selectedKasId}
                  onChange={(e) => setSelectedKasId(e.target.value)}
                  className="text-xs font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/50"
                >
                  {viewableKas.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama} ({k.kode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">Bulan</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value) || 1)}
                  className="text-xs font-semibold border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/50"
                >
                  {MONTH_NAMES_INDO.map((name, idx) => (
                    <option key={idx} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  let running = initialBalance;
                  const rows = kasTransactions.map((tx, idx) => {
                    const masuk = tx.type === 'income' || tx.type === 'transfer_in' ? Number(tx.amount) : 0;
                    const keluar = tx.type === 'expense' || tx.type === 'transfer_out' ? Number(tx.amount) : 0;
                    running = running + masuk - keluar;

                    return {
                      No: idx + 1,
                      Tanggal: tx.tanggal,
                      'No. Bukti': tx.receipt_no || '-',
                      'Uraian Transaksi': tx.description,
                      'Masuk (Rp)': masuk,
                      'Keluar (Rp)': keluar,
                      'Saldo Berjalan (Rp)': running,
                    };
                  });
                  exportToExcel(rows, `Buku_Kas_${currentKas?.kode}_${getIndoMonthName(selectedMonth)}_${selectedYear}`);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Ekspor Excel
              </button>

              <button
                onClick={() => {
                  if (!currentKas) return;
                  generateBukuKasPDF({
                    kas: currentKas,
                    periodeText: `${getIndoMonthName(selectedMonth)} ${selectedYear}`,
                    saldoAwal: initialBalance,
                    transactions: kasTransactions,
                    settings,
                    namaBendahara,
                    namaKetua,
                  });
                }}
                className="px-3.5 py-2 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh PDF
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <span className="font-bold text-gray-900 text-sm">
                Buku Kas: {currentKas?.nama} ({getIndoMonthName(selectedMonth)} {selectedYear})
              </span>
              <span className="text-xs font-semibold text-gray-600">Saldo Awal Bulan: {formatRupiah(initialBalance)}</span>
            </div>

            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">No. Bukti</th>
                  <th className="py-2.5 px-3">Uraian</th>
                  <th className="py-2.5 px-3 text-right">Penerimaan</th>
                  <th className="py-2.5 px-3 text-right">Pengeluaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {kasTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      Tidak ada transaksi pada bulan ini.
                    </td>
                  </tr>
                ) : (
                  kasTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-3 font-mono">{formatDateIndo(tx.tanggal)}</td>
                      <td className="py-2.5 px-3 text-gray-500">{tx.receipt_no || '-'}</td>
                      <td className="py-2.5 px-3 font-medium text-gray-900">{tx.description}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        {tx.type === 'income' || tx.type === 'transfer_in' ? formatRupiah(tx.amount) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-700">
                        {tx.type === 'expense' || tx.type === 'transfer_out' ? formatRupiah(tx.amount) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: KONSOLIDASI SELURUH KAS (EXISTING FEATURE) */}
      {/* ========================================================================= */}
      {activeTab === 'gabungan' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Laporan Konsolidasi Seluruh Kas Huria</h3>
                <p className="text-xs text-gray-500">Rekapitulasi mutasi seluruh 7 kas persekutuan & operasional.</p>
              </div>

              <button
                onClick={() => {
                  generateLaporanGabunganPDF({
                    periodeText: `${getIndoMonthName(selectedMonth)} ${selectedYear}`,
                    kasSummaries: combinedSummaries,
                    settings,
                  });
                }}
                className="px-3.5 py-2 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Laporan Konsolidasi (PDF)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Nama Kas</th>
                    <th className="py-2.5 px-3 text-right">Saldo Awal</th>
                    <th className="py-2.5 px-3 text-right">Pemasukan</th>
                    <th className="py-2.5 px-3 text-right">Pengeluaran</th>
                    <th className="py-2.5 px-3 text-right">Saldo Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {combinedSummaries.map((s) => (
                    <tr key={s.kode} className="hover:bg-gray-50/60">
                      <td className="py-2.5 px-3 font-semibold text-gray-900">{s.nama}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(s.saldoAwal)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">{formatRupiah(s.pemasukan)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-rose-700">{formatRupiah(s.pengeluaran)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">{formatRupiah(s.saldoAkhir)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: REKONSILIASI BANK & KAS (EXISTING FEATURE) */}
      {/* ========================================================================= */}
      {activeTab === 'rekonsiliasi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-sm">Input Berita Acara Rekonsiliasi</h3>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await saveReconciliation({
                    tanggal: new Date().toISOString().split('T')[0],
                    storage_account_id: targetStorageAccount.id,
                    system_balance: currentSystemBalance,
                    physical_balance: rawPhysical,
                    notes: recNotes.trim() || undefined,
                  });

                  if (res.success) {
                    setRecSuccess(true);
                    setRecPhysicalAmount('');
                    setRecNotes('');
                    setTimeout(() => setRecSuccess(false), 3000);
                  }
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Tempat Penyimpanan</label>
                  <select
                    value={recStorageId}
                    onChange={(e) => setRecStorageId(e.target.value)}
                    className="w-full p-2 rounded-xl border border-gray-200"
                  >
                    {storageAccounts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.tipe === 'cash' ? 'Uang Tunai' : 'Bank'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Saldo Menurut Sistem</label>
                  <input
                    type="text"
                    disabled
                    value={formatRupiah(currentSystemBalance)}
                    className="w-full p-2 rounded-xl bg-gray-50 border border-gray-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Saldo Hasil Cek Fisik / Koran (Rp)</label>
                  <input
                    type="text"
                    value={recPhysicalAmount}
                    onChange={(e) => setRecPhysicalAmount(e.target.value)}
                    placeholder="Contoh: 5450000"
                    className="w-full p-2 rounded-xl border border-gray-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-semibold mb-1">Catatan Pemeriksa</label>
                  <textarea
                    value={recNotes}
                    onChange={(e) => setRecNotes(e.target.value)}
                    rows={2}
                    placeholder="Contoh: Saldo klop dan telah diperiksa bersama..."
                    className="w-full p-2 rounded-xl border border-gray-200"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white font-semibold rounded-xl transition-colors shadow-xs"
                >
                  Simpan Berita Acara Rekonsiliasi
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 text-sm">Riwayat Berita Acara Rekonsiliasi</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Tempat</th>
                      <th className="py-2.5 px-3 text-right">Saldo Sistem</th>
                      <th className="py-2.5 px-3 text-right">Saldo Fisik</th>
                      <th className="py-2.5 px-3 text-right">Selisih</th>
                      <th className="py-2.5 px-3">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reconciliations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400">
                          Belum ada catatan rekonsiliasi.
                        </td>
                      </tr>
                    ) : (
                      reconciliations.map((r) => {
                        const stor = storageAccounts.find((s) => s.id === r.storage_account_id);
                        return (
                          <tr key={r.id} className="hover:bg-gray-50/60">
                            <td className="py-2.5 px-3 font-mono">{formatDateIndo(r.tanggal)}</td>
                            <td className="py-2.5 px-3 font-medium">{stor?.nama}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(r.system_balance)}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatRupiah(r.physical_balance)}</td>
                            <td
                              className={`py-2.5 px-3 text-right font-mono font-bold ${
                                r.discrepancy === 0 ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {formatRupiah(r.discrepancy)}
                            </td>
                            <td className="py-2.5 px-3 text-gray-500">{r.notes || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: REKAPITULASI SENTRALISASI KEUANGAN BPSK HKBP (PPKU)               */}
      {/* ========================================================================= */}
      {activeTab === 'bpsk' && (() => {
        const bpskSummary = getSentralisasiSummary(selectedYear);

        const yearIncomes = transactions.filter(
          (tx) => tx.status === 'approved' && tx.type === 'income' && new Date(tx.tanggal).getFullYear() === selectedYear
        );

        const yearBpskRemittances = transactions.filter((tx) => {
          if (tx.status !== 'approved' || tx.type !== 'expense') return false;
          if (new Date(tx.tanggal).getFullYear() !== selectedYear) return false;
          const cat = categories.find((c) => c.id === tx.category_id);
          return (
            cat?.id === 'cat-out-bpsk' ||
            cat?.kode === 'OUT-01' ||
            (cat?.nama || '').toLowerCase().includes('bpsk') ||
            (tx.description || '').toLowerCase().includes('bpsk')
          );
        });

        // Group 1: Pelean Mingguan & Ibadah Lainnya
        const g1Cats = categories.filter(
          (c) => c.tipe === 'income' && (c.sentralisasi_group === 'pelean_mingguan' || ['IN-01', 'IN-02', 'IN-03', 'IN-04', 'IN-05'].includes(c.kode || ''))
        );
        // Group 2: Syukur & Khusus (Hamauliateon)
        const g2Cats = categories.filter(
          (c) => c.tipe === 'income' && (c.sentralisasi_group === 'pelean_syukur' || ['IN-06', 'IN-07', 'IN-08', 'IN-09', 'IN-10'].includes(c.kode || ''))
        );
        // Group 3: Badan Usaha, Lembaga & Hibah
        const g3Cats = categories.filter(
          (c) => c.tipe === 'income' && (c.sentralisasi_group === 'badan_usaha_lembaga' || ['IN-11', 'IN-12', 'IN-13', 'IN-14'].includes(c.kode || ''))
        );
        // Group 4: Pengecualian Resmi (100% Bebas Sentralisasi)
        const g4Cats = categories.filter(
          (c) => c.tipe === 'income' && (c.is_sentralisasi === false || c.sentralisasi_group === 'dikecualikan_khusus' || ['IN-EX-01', 'IN-EX-02', 'IN-EX-03'].includes(c.kode || ''))
        );

        const getCatTotal = (catId: string) => {
          return yearIncomes
            .filter((tx) => tx.category_id === catId)
            .reduce((sum, tx) => sum + Number(tx.amount), 0);
        };

        const renderGroupTable = (title: string, groupDesc: string, catList: typeof categories, isExcludedGroup = false) => {
          const groupTotal = catList.reduce((sum, c) => sum + getCatTotal(c.id), 0);
          const bpskGroupTotal = isExcludedGroup ? 0 : Math.round(groupTotal * 0.55);
          const huriaGroupTotal = isExcludedGroup ? groupTotal : groupTotal - bpskGroupTotal;

          return (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>{title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isExcludedGroup
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {isExcludedGroup ? '100% Kas Huria (Bebas Sentralisasi)' : 'Objek PPKU (55% BPSK / 45% Huria)'}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{groupDesc}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Subtotal Penerimaan</span>
                  <span className="font-mono font-black text-sm text-slate-900">{formatRupiah(groupTotal)}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/40 text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center">No</th>
                      <th className="py-2.5 px-4 w-24">Kode</th>
                      <th className="py-2.5 px-4">Nama Pos Penerimaan</th>
                      <th className="py-2.5 px-4 text-right">Total Pelean (100%)</th>
                      {!isExcludedGroup ? (
                        <>
                          <th className="py-2.5 px-4 text-right text-blue-700">55% Kas Pusat (BPSK)</th>
                          <th className="py-2.5 px-4 text-right text-indigo-700">45% Kas Huria</th>
                        </>
                      ) : (
                        <th className="py-2.5 px-4 text-right text-emerald-700">100% Hak Kas Huria</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {catList.length === 0 ? (
                      <tr>
                        <td colSpan={isExcludedGroup ? 5 : 6} className="py-6 text-center text-slate-400 text-xs">
                          Belum ada pos kategori untuk kelompok ini.
                        </td>
                      </tr>
                    ) : (
                      catList.map((cat, idx) => {
                        const total = getCatTotal(cat.id);
                        const bpsk = isExcludedGroup ? 0 : Math.round(total * 0.55);
                        const huria = isExcludedGroup ? total : total - bpsk;

                        return (
                          <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-2.5 px-4 font-mono text-[11px] font-semibold text-slate-600">{cat.kode || '-'}</td>
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-slate-800">{cat.nama}</div>
                              {cat.deskripsi && <div className="text-[10px] text-slate-400 mt-0.5">{cat.deskripsi}</div>}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                              {formatRupiah(total)}
                            </td>
                            {!isExcludedGroup ? (
                              <>
                                <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700 tabular-nums bg-blue-50/20">
                                  {formatRupiah(bpsk)}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-700 tabular-nums bg-indigo-50/20">
                                  {formatRupiah(huria)}
                                </td>
                              </>
                            ) : (
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums bg-emerald-50/30">
                                {formatRupiah(huria)}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100/60 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-4 text-right uppercase text-[11px] text-slate-700">
                        Subtotal {title}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-900">
                        {formatRupiah(groupTotal)}
                      </td>
                      {!isExcludedGroup ? (
                        <>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-blue-900 bg-blue-100/40">
                            {formatRupiah(bpskGroupTotal)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums text-indigo-900 bg-indigo-100/40">
                            {formatRupiah(huriaGroupTotal)}
                          </td>
                        </>
                      ) : (
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-900 bg-emerald-100/40">
                          {formatRupiah(huriaGroupTotal)}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        };

        return (
          <div className="space-y-6">
            {/* Top Control Bar */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-slate-900 text-base">Rekapitulasi Sentralisasi Keuangan BPSK HKBP</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    PPKU HKBP Resmi
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Mekanisme 55% disetorkan ke Kas Pusat (BPSK HKBP) dan 45% tinggal di Huria untuk operasional pelayanan lokal.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500 font-medium">Tahun Buku:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="font-bold bg-transparent text-slate-800 focus:outline-hidden"
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Rekap</span>
                </button>
              </div>
            </div>

            {/* 4 Executive Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card-blue card-hover p-5 rounded-3xl shadow-xs border-t-4 border-t-blue-600 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  1. Objek Sentralisasi (100%)
                </span>
                <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
                  {formatRupiah(bpskSummary.totalObjekSentralisasi)}
                </div>
                <p className="text-[10px] text-slate-400">Total pelean masuk objek potongan 55% BPSK</p>
              </div>

              <div className="card-indigo card-hover p-5 rounded-3xl shadow-xs border-t-4 border-t-indigo-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                    2. Kewajiban BPSK (55%)
                  </span>
                  <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                    Wajib Setor
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-blue-900 tabular-nums">
                  {formatRupiah(bpskSummary.totalBpskObligation)}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5">
                  <span>Disetor: {formatRupiah(bpskSummary.totalBpskRemitted)}</span>
                  <span className={`font-bold ${bpskSummary.outstandingBpsk > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {bpskSummary.outstandingBpsk > 0 ? `Sisa: ${formatRupiah(bpskSummary.outstandingBpsk)}` : 'Lunas'}
                  </span>
                </div>
              </div>

              <div className="card-purple card-hover p-5 rounded-3xl shadow-xs border-t-4 border-t-purple-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                    3. Hak Kas Huria (45%)
                  </span>
                  <span className="text-[9px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded">
                    Operasional Lokal
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-indigo-900 tabular-nums">
                  {formatRupiah(bpskSummary.totalHuriaShare)}
                </div>
                <p className="text-[10px] text-slate-400">Tinggal di Huria untuk operasional pelayanan gereja lokal</p>
              </div>

              <div className="card-emerald card-hover p-5 rounded-3xl shadow-xs border-t-4 border-t-emerald-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    4. Dikecualikan (100%)
                  </span>
                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                    Bebas Potongan
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-900 tabular-nums">
                  {formatRupiah(bpskSummary.totalDikecualikan)}
                </div>
                <p className="text-[10px] text-slate-500">
                  Sosial/Duka, Beasiswa, & Pembangunan Fisik Lokal
                </p>
              </div>
            </div>

            {/* Sub-Tables of PPKU Groups */}
            <div className="space-y-6">
              {renderGroupTable(
                '1. Persembahan Mingguan dan Ibadah Lainnya (Pelean)',
                'Pelean I & II, Pelean Namarboho (Bulanan/Tahunan), Partangiangan Wijk, Kategorial & Hari Raya Gerejawi.',
                g1Cats
              )}

              {renderGroupTable(
                '2. Persembahan Syukur dan Khusus (Pelean Hamauliateon)',
                'Persembahan syukur jemaat amplop/altar, syukur baptisan (pandidion), sidi, pernikahan (pamasu-masuon), dan syukur keluarga.',
                g2Cats
              )}

              {renderGroupTable(
                '3. Penerimaan dari Badan Usaha, Lembaga, dan Sumber Resmi Lainnya',
                'Keuntungan badan usaha milik HKBP, kontribusi yayasan naungan HKBP, keuntungan perguruan tinggi HKBP, hibah & sumbangan resmi pihak luar.',
                g3Cats
              )}

              {renderGroupTable(
                '❌ 4. Pos Penerimaan yang Dikecualikan (Exclusions / 100% Kas Huria)',
                'Pos penerimaan yang tidak dikenakan sentralisasi keuangan 55% dan dikelola 100% penuh sesuai peruntukannya (Sosial/Gariana, Dana Belajar, Pembangunan Fisik Lokal).',
                g4Cats,
                true
              )}
            </div>

            {/* Riwayat Mutasi Penyetoran ke BPSK Kantor Pusat */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden space-y-3 p-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Riwayat Penyetoran ke Kas Pusat (BPSK HKBP)</h4>
                    <p className="text-xs text-slate-500">
                      Catatan pengeluaran kas huria untuk penyetoran kewajiban 55% ke rekening BPSK Kantor Pusat HKBP.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-700">
                  Total Disetor: <span className="font-mono text-blue-900">{formatRupiah(bpskSummary.totalBpskRemitted)}</span>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">No. Bukti / Ref</th>
                      <th className="py-2.5 px-3">Uraian Transaksi</th>
                      <th className="py-2.5 px-3">Sumber Rekening</th>
                      <th className="py-2.5 px-3 text-right">Nominal Setoran</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {yearBpskRemittances.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Belum ada transaksi penyetoran ke BPSK HKBP yang dicatat di Tahun {selectedYear}.
                        </td>
                      </tr>
                    ) : (
                      yearBpskRemittances.map((tx) => {
                        const stor = storageAccounts.find((s) => s.id === tx.storage_account_id);
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3 font-mono font-medium">{formatDateIndo(tx.tanggal)}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{tx.receipt_no || '-'}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">{tx.description}</td>
                            <td className="py-2.5 px-3 text-slate-600">{stor?.nama}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-900">
                              {formatRupiah(tx.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Disetujui
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Panduan Rekening Resmi Penyetoran BPSK HKBP */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/80 text-xs space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <Landmark className="w-5 h-5 text-blue-700" />
                <span>Informasi Rekening Resmi Badan Pengelola Sentralisasi Keuangan (BPSK) HKBP</span>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                Penyetoran 55% kewajiban sentralisasi dilakukan oleh Bendahara Huria ke rekening resmi Kantor Pusat HKBP.
                Setelah transfer dilakukan, catat pengeluaran di menu Transaksi pada kategori <strong>&quot;Penyetoran 55% Sentralisasi ke Kas Pusat (BPSK HKBP)&quot;</strong> dengan mengunggah bukti transfer bank.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-white/90 p-3 rounded-2xl border border-blue-100 shadow-2xs">
                  <div className="text-[10px] font-bold text-blue-700 uppercase">Bank Mandiri</div>
                  <div className="font-mono font-black text-sm text-slate-900 mt-0.5">107-00-1122334-4</div>
                  <div className="text-[10px] text-slate-500">a.n. BPSK HKBP PUSAT</div>
                </div>
                <div className="bg-white/90 p-3 rounded-2xl border border-blue-100 shadow-2xs">
                  <div className="text-[10px] font-bold text-blue-700 uppercase">Bank BRI</div>
                  <div className="font-mono font-black text-sm text-slate-900 mt-0.5">0053-01-000456-30-2</div>
                  <div className="text-[10px] text-slate-500">a.n. SENTRALISASI KEUANGAN HKBP</div>
                </div>
                <div className="bg-white/90 p-3 rounded-2xl border border-blue-100 shadow-2xs">
                  <div className="text-[10px] font-bold text-blue-700 uppercase">Bank BNI</div>
                  <div className="font-mono font-black text-sm text-slate-900 mt-0.5">0234-5678-90</div>
                  <div className="text-[10px] text-slate-500">a.n. HKBP PEARJA TARUTUNG (BPSK)</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
