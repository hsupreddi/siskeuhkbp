/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Wallet,
  Receipt,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Lock,
  FolderArchive,
  Package,
  CreditCard,
  Building2,
  Shield,
  Layers,
  ArrowUpRight,
  Landmark,
  Check,
  Coins,
  Users,
  UserPlus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatRupiah, formatDateIndo } from '../lib/formatters';

const CHART_COLORS = ['#1E3A8A', '#0D9488', '#B45309', '#BE123C', '#4F46E5', '#475569', '#0891B2'];

export const DashboardPage: React.FC = () => {
  const {
    currentUser,
    isLeader,
    isAdmin,
    isBendaharaUmum,
    isAuditor,
    isPendeta,
    isSekretaris,
    isMajelis,
    isPengurusKas,
    userKasAccess,
    canApproveKas,
    canRecordTransactions,
  } = useAuth();
  const {
    kasList,
    storageAccounts,
    categories,
    transactions,
    getKasBalances,
    getStorageBalances,
    getSentralisasiSummary,
    settings,
    openingSetup,
    isKasOpeningLocked,
    getOpeningStatusForKas,
    advances,
    fixedAssets,
    receivablesPayables,
    auditFindings,
    auditEngagements,
    auditFinalOpinions,
    semesterReports,
    lpjReports,
    isYearLockedByLpj,
  } = useData();

  const todayStr = new Date().toISOString().split('T')[0];
  const activeAdvances = advances.filter((a) => a.status === 'active');
  const overdueAdvances = activeAdvances.filter((a) => a.due_date < todayStr);
  const latestFinalOpinion = auditFinalOpinions[0];
  const pendingAuditFindings = auditFindings.filter((f) => f.severity === 'wajib_diperbaiki' && f.status !== 'selesai' && f.status !== 'diterima');
  const currentSemesterRep = semesterReports.find((r) => r.tahun === (settings.active_year || 2026)) || semesterReports[0];
  const currentYearLocked = isYearLockedByLpj(settings.active_year || 2026);
  const totalOverdueAdvanceAmount = overdueAdvances.reduce((sum, a) => sum + Number(a.amount), 0);
  const totalActiveAdvanceAmount = activeAdvances.reduce((sum, a) => sum + Number(a.amount), 0);
  const totalFixedAssetsAmount = fixedAssets.filter((a) => a.status === 'aktif').reduce((sum, a) => sum + Number(a.nilai_perolehan), 0);
  const totalActiveReceivablesAmount = receivablesPayables.filter((r) => r.type === 'receivable' && r.status !== 'paid').reduce((sum, r) => sum + Number(r.remaining_amount), 0);
  const totalActivePayablesAmount = receivablesPayables.filter((r) => r.type === 'payable' && r.status !== 'paid').reduce((sum, r) => sum + Number(r.remaining_amount), 0);

  const totalKasCount = kasList.length;
  const lockedKasCount = kasList.filter((k) => isKasOpeningLocked(k.id)).length;
  const lockedPercentage = totalKasCount > 0 ? Math.round((lockedKasCount / totalKasCount) * 100) : 0;
  const isOpeningIncomplete = lockedKasCount < totalKasCount;

  const [selectedKasFilter, setSelectedKasFilter] = useState<string>('all');
  const [chartView, setChartView] = useState<'trend' | 'donut'>('trend');

  const kasBalances = getKasBalances();
  const storageBalances = getStorageBalances();

  // Find kas assigned to current user
  const myAssignedKasIds = userKasAccess.map((a) => a.kas_id);
  const isSeksiUser = !isLeader && currentUser?.role === 'pengurus_kas';

  // Total balance of all kas
  const totalSaldoResmi = kasBalances.reduce((sum, k) => sum + k.saldo_resmi, 0);
  const totalSaldoProyeksi = kasBalances.reduce((sum, k) => sum + k.saldo_proyeksi, 0);

  // Month-to-date income & expense
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const sentralisasiSummary = getSentralisasiSummary(currentYear);

  const currentMonthTx = transactions.filter((tx) => {
    const d = new Date(tx.tanggal);
    return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth && tx.status === 'approved';
  });

  const totalBulanIniMasuk = currentMonthTx
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const totalBulanIniKeluar = currentMonthTx
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  // Pending approval items
  const pendingApprovals = transactions.filter((tx) => tx.status === 'submitted');
  const myPendingApprovals = pendingApprovals.filter((tx) => canApproveKas(tx.kas_id));

  // Drafts or rejected items created by current user needing action
  const myActionNeeded = transactions.filter(
    (tx) => tx.created_by === currentUser?.id && (tx.status === 'draft' || tx.status === 'rejected')
  );

  // 12-month Trend Data computed dynamically from actual approved transactions
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const trendData = monthNamesShort.map((bulan, idx) => {
    const m = idx + 1;
    const mTx = transactions.filter((tx) => {
      const d = new Date(tx.tanggal);
      return d.getFullYear() === currentYear && d.getMonth() + 1 === m && tx.status === 'approved';
    });
    const masuk = mTx.filter((t) => t.type === 'income' || t.type === 'transfer_in').reduce((sum, t) => sum + Number(t.amount), 0);
    const keluar = mTx.filter((t) => t.type === 'expense' || t.type === 'transfer_out').reduce((sum, t) => sum + Number(t.amount), 0);
    return { bulan, masuk, keluar };
  });

  // Income distribution computed dynamically from actual approved income transactions
  const approvedIncomeTx = transactions.filter((tx) => (tx.type === 'income' || tx.type === 'transfer_in') && tx.status === 'approved');
  const donutData = categories
    .filter((c) => c.tipe === 'income')
    .map((c) => {
      const val = approvedIncomeTx
        .filter((tx) => tx.category_id === c.id)
        .reduce((sum, tx) => sum + Number(tx.amount), 0);
      return { name: c.nama, value: val };
    })
    .filter((item) => item.value > 0);

  // Recent 8 transactions
  const recentTransactions = transactions.slice(0, 8);

  // Kas card style mapper: clean executive white surface with subtle distinction
  const getKasThemeClass = (_index: number) => {
    return 'card-executive';
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto min-w-0 overflow-hidden">
      {/* ---------------- Authoritative Executive Hero Card ---------------- */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-[#0B132B] to-[#0F172A] text-white p-6 md:p-8 shadow-md border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Tahun Anggaran {settings.active_year} · HKBP Ressort Hutaraja (Ressort Khusus)</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Horas, {currentUser?.full_name}
            </h1>

            <p className="text-xs md:text-sm text-slate-300/90 max-w-2xl leading-relaxed">
              Sistem Informasi Keuangan Huria (SIKU HKBP) mengimplementasikan Panduan Pengelolaan Keuangan Umum (PPKU Sentralisasi 55/45) dan Basis Kas Dimodifikasi (ISAK 35).
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 text-slate-200 border border-slate-700/80 font-semibold capitalize flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>Peran: {currentUser?.role.replace('_', ' ')}</span>
              </span>
              {userKasAccess.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400">
                  {userKasAccess.length} Kas Seksi Ditugaskan
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Button & Alerts tailored by Role */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
            {isAuditor ? (
              <>
                {pendingAuditFindings.length > 0 && (
                  <NavLink
                    to="/audit"
                    className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white text-xs font-bold rounded-2xl shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                    <span>{pendingAuditFindings.length} Temuan Wajib Ditelusuri</span>
                    <ChevronRight className="w-4 h-4" />
                  </NavLink>
                )}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <NavLink
                    to="/audit"
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-2xl shadow-md shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Modul Badan Audit</span>
                  </NavLink>
                  <NavLink
                    to="/transactions"
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/15 backdrop-blur-md text-white text-xs font-semibold rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Receipt className="w-4 h-4 text-indigo-300" />
                    <span>Uji Bukti Transaksi</span>
                  </NavLink>
                </div>
              </>
            ) : isPendeta ? (
              <>
                {myPendingApprovals.length > 0 && (
                  <NavLink
                    to="/approvals"
                    className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-98"
                  >
                    <Clock className="w-4 h-4 animate-spin-slow" />
                    <span>{myPendingApprovals.length} Transaksi Menunggu Persetujuan</span>
                    <ChevronRight className="w-4 h-4" />
                  </NavLink>
                )}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <NavLink
                    to="/approvals"
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-2xl shadow-md shadow-amber-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Otorisasi Kas</span>
                  </NavLink>
                  <NavLink
                    to="/reports"
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/15 backdrop-blur-md text-white text-xs font-semibold rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-indigo-300" />
                    <span>Tinjau LPJ ISAK 35</span>
                  </NavLink>
                </div>
              </>
            ) : isSekretaris ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <NavLink
                  to="/reports"
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-2xl shadow-md shadow-sky-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Materi Warta & LPJ</span>
                </NavLink>
                <NavLink
                  to="/budget"
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/15 backdrop-blur-md text-white text-xs font-semibold rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-indigo-300" />
                  <span>Dokumen APBG</span>
                </NavLink>
              </div>
            ) : canRecordTransactions ? (
              <>
                {myPendingApprovals.length > 0 && (
                  <NavLink
                    to="/approvals"
                    className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-98"
                  >
                    <Clock className="w-4 h-4 animate-spin-slow" />
                    <span>{myPendingApprovals.length} Transaksi Menunggu Persetujuan</span>
                    <ChevronRight className="w-4 h-4" />
                  </NavLink>
                )}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <NavLink
                    to="/transactions"
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-2xl shadow-md shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Kelola Transaksi</span>
                  </NavLink>
                  <NavLink
                    to="/reports"
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/15 backdrop-blur-md text-white text-xs font-semibold rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-indigo-300" />
                    <span>Buka LPJ ISAK 35</span>
                  </NavLink>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <NavLink
                  to="/reports"
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Laporan Keuangan</span>
                </NavLink>
                <NavLink
                  to="/budget"
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/15 backdrop-blur-md text-white text-xs font-semibold rounded-2xl border border-white/20 transition-all flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-indigo-300" />
                  <span>Realisasi APBG</span>
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- Ecclesiastical Role & Authority Card ---------------- */}
      <div className="card-hover p-4 md:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              isAuditor
                ? 'bg-purple-900 text-white'
                : isPendeta
                ? 'bg-amber-800 text-white'
                : isSekretaris
                ? 'bg-blue-900 text-white'
                : isBendaharaUmum || isPengurusKas
                ? 'bg-slate-900 text-white'
                : 'bg-slate-800 text-white'
            }`}
          >
            <Shield className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Wewenang & Batasan Peran (Tata Gereja HKBP):
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold capitalize bg-slate-100 text-slate-800 border border-slate-200">
                {currentUser?.full_name} ({currentUser?.role.replace('_', ' ')})
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {isAuditor && (
                <span>
                  <strong>Badan Audit Independen (Pasal 7 & 44 AP HKBP):</strong> Berwenang memeriksa bukti fisik kuitansi, opname brankas/bank, menerbitkan temuan audit, dan memberikan opini berkala. <em>Dilarang keras mencatat mutasi kas harian, mentransfer dana, atau menyetujui transaksi operasional.</em>
                </span>
              )}
              {isPendeta && (
                <span>
                  <strong>Pendeta Ressort (Uluan Huria):</strong> Otorisator tertinggi keuangan huria. Berwenang menyetujui/menolak transaksi Kas Umum & Seksi, menandatangani draf APBG dan LPJ tahunan. Transaksi harian dicatat oleh bendahara.
                </span>
              )}
              {isSekretaris && (
                <span>
                  <strong>Sekretaris Huria:</strong> Bertanggung jawab atas administrasi, penyiaran warta jemaat mimbar, dan pendaftaran berita acara pengesahan sidang Rapat Huria. Monitoring seluruh buku kas secara transparan.
                </span>
              )}
              {isBendaharaUmum && (
                <span>
                  <strong>Bendahara Umum Huria:</strong> Pengelola perbendaharaan utama huria. Berwenang mencatat transaksi Kas Umum, transfer antar kas/bank, pembukaan saldo awal, dan tutup buku bulanan. Menjalankan prinsip <em>four-eyes</em> bersama Uluan Huria.
                </span>
              )}
              {isPengurusKas && (
                <span>
                  <strong>Pengurus Kas Seksi:</strong> Berwenang mencatat transaksi penerimaan & pengeluaran dan usulan draf APBG khusus pada kas seksi yang ditugaskan.
                </span>
              )}
              {isMajelis && (
                <span>
                  <strong>Majelis Huria / Parartaon / Sintua:</strong> Pengawasan dan penelaahan umum (<em>read-only oversight</em>). Berwenang memantau perkembangan kas, realisasi anggaran program, dan materi LPJ jemaat.
                </span>
              )}
              {isAdmin && (
                <span>
                  <strong>Administrator Sistem:</strong> Akses penuh konfigurasi sistem, data master, hak akses pengguna, pemulihan data, dan pengaturan kop surat resmi HKBP.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 flex-wrap">
          {(isAdmin || isPendeta || isBendaharaUmum || isSekretaris) && (
            <NavLink
              to="/users"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-primary hover:text-white hover:bg-primary bg-primary/10 border border-primary/20 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kelola Pengguna</span>
            </NavLink>
          )}

          <NavLink
            to="/guide"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Lihat Buku Panduan</span>
          </NavLink>
        </div>
      </div>

      {/* ---------------- Opening Book Status Card ---------------- */}
      {isOpeningIncomplete ? (
        <div className="card-hover p-5 rounded-2xl bg-amber-50/60 border border-amber-200/90 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-amber-950">
                    Pembukaan Buku Saldo Awal Belum Selesai ({lockedKasCount} dari {totalKasCount} Kas Dikunci — {lockedPercentage}%)
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-950 text-[10px] font-bold uppercase tracking-wider">
                    {isAuditor || isMajelis ? 'Informasi Status' : 'Perlu Tindakan'}
                  </span>
                </div>
                <p className="text-xs text-amber-900/90 max-w-3xl leading-relaxed">
                  {isAuditor ? (
                    <span>
                      Buku saldo awal sedang diproses oleh Bendahara. Transaksi baru hanya dapat diinput pada kas yang saldo awalnya telah diverifikasi fisik dan <strong>Dikunci</strong>. Badan Audit akan melakukan opname fisik setelah seluruh kas dikunci.
                    </span>
                  ) : (
                    <span>
                      Buku kas manual ditutup per 31 Desember. Transaksi baru hanya dapat diinput pada kas yang saldo awalnya telah diverifikasi fisik dan <strong>Dikunci</strong>. Tanggal mulai pemakaian resmi: <strong>{formatDateIndo(openingSetup.go_live_date)}</strong>.
                    </span>
                  )}
                </p>
              </div>
            </div>

            {!isAuditor && !isMajelis && (
              <NavLink
                to="/opening-balance"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all shrink-0 active:scale-98"
              >
                <BookOpen className="w-4 h-4" />
                <span>Selesaikan Saldo Awal</span>
                <ChevronRight className="w-4 h-4" />
              </NavLink>
            )}
          </div>

          {/* Progress Bar & Status Tags */}
          <div className="pt-3 border-t border-amber-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-950">
              <span>Progres Penguncian Kas:</span>
              <span className="font-mono">{lockedKasCount} / {totalKasCount} Kas ({lockedPercentage}%)</span>
            </div>
            <div className="w-full bg-amber-200/70 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${lockedPercentage}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {kasList.map((k) => {
                const status = getOpeningStatusForKas(k.id);
                const isLocked = status === 'locked';
                return (
                  <span
                    key={k.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                      isLocked
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                        : status === 'approved'
                        ? 'bg-blue-50 text-blue-900 border-blue-300'
                        : status === 'submitted'
                        ? 'bg-purple-50 text-purple-900 border-purple-300'
                        : 'bg-white text-amber-900 border-amber-300'
                    }`}
                  >
                    {isLocked ? <Check className="w-3 h-3 text-emerald-600 stroke-[3]" /> : <Clock className="w-3 h-3 text-amber-600" />}
                    <span>{k.nama}: {isLocked ? 'Dikunci' : status === 'submitted' ? 'Diajukan' : status === 'approved' ? 'Disetujui' : 'Belum'}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 shadow-2xs flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-emerald-950">Pembukaan Buku Tuntas:</span> Seluruh {totalKasCount} kas telah dikunci per {formatDateIndo(openingSetup.go_live_date)}. Saldo awal aktif menjadi dasar pembukuan resmi.
            </div>
          </div>
          {!isAuditor && !isMajelis && (
            <NavLink
              to="/opening-balance"
              className="text-emerald-800 hover:text-emerald-950 font-bold underline shrink-0 ml-3"
            >
              Lihat Berita Acara
            </NavLink>
          )}
        </div>
      )}

      {/* ---------------- 4 EXECUTIVE METRIC KPI CARDS ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Saldo Konsolidasi */}
        <div className="card-hover p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Kas & Bank</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/80 text-blue-800 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl md:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
              {formatRupiah(totalSaldoResmi)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between pt-1 border-t border-slate-100">
              <span>Saldo Proyeksi:</span>
              <span className="font-bold font-mono text-slate-800">{formatRupiah(totalSaldoProyeksi)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Pemasukan Bulan Ini */}
        <div className="card-hover p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pemasukan Bulan Ini</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl md:text-3xl font-extrabold text-emerald-700 font-mono tabular-nums tracking-tight">
              +{formatRupiah(totalBulanIniMasuk)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between pt-1 border-t border-slate-100">
              <span>Sumber:</span>
              <span className="font-semibold text-slate-800">Pelean, Syukur & Donasi</span>
            </div>
          </div>
        </div>

        {/* Card 3: Pengeluaran Bulan Ini */}
        <div className="card-hover p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pengeluaran Bulan Ini</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100/80 text-rose-700 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl md:text-3xl font-extrabold text-rose-700 font-mono tabular-nums tracking-tight">
              -{formatRupiah(totalBulanIniKeluar)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between pt-1 border-t border-slate-100">
              <span>Alokasi:</span>
              <span className="font-semibold text-slate-800">Pelayanan, Diakonia & Rutin</span>
            </div>
          </div>
        </div>

        {/* Card 4: Role-tailored KPI Card */}
        {isAuditor ? (
          <div className="card-hover p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pemeriksaan Audit</span>
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100/80 text-purple-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl md:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
                {pendingAuditFindings.length} <span className="text-sm font-semibold text-slate-500">Temuan</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Status Pemeriksaan:</span>
                <NavLink to="/audit" className="font-bold underline text-purple-800 hover:text-purple-950">
                  Buka Modul Audit
                </NavLink>
              </div>
            </div>
          </div>
        ) : isSekretaris ? (
          <div className="card-hover p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status Warta Jemaat</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl md:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
                Semester I <span className="text-sm font-semibold text-slate-500">Siap</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Transparansi Mimbar:</span>
                <NavLink to="/reports" className="font-bold underline text-blue-800 hover:text-blue-950">
                  Lihat Warta Huria
                </NavLink>
              </div>
            </div>
          </div>
        ) : isMajelis ? (
          <div className="card-hover p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pengawasan Anggaran</span>
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100/80 text-teal-700 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl md:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
                {kasList.length} <span className="text-sm font-semibold text-slate-500">Kas Terpantau</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Monitoring Realisasi:</span>
                <NavLink to="/budget" className="font-bold underline text-teal-800 hover:text-teal-950">
                  Lihat APBG
                </NavLink>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-hover p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Persetujuan Transaksi</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl md:text-3xl font-extrabold text-slate-900 font-mono tabular-nums tracking-tight">
                {pendingApprovals.length} <span className="text-sm font-semibold text-slate-500">Menunggu</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Perlu Verifikasi Ketua:</span>
                <NavLink to="/approvals" className="font-bold underline text-amber-800 hover:text-amber-950">
                  Lihat Antrean
                </NavLink>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---------------- DATA PENDUKUNG LPJ & PANJAR STRIP ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Panjar Overdue / Warning Card */}
        <div className="card-hover p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                  overdueAdvances.length > 0 ? 'bg-rose-700' : 'bg-amber-600'
                }`}
              >
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Panjar Jatuh Tempo</span>
                <span className="text-[10px] text-slate-500">Batas SPJ kegiatan terlampaui</span>
              </div>
            </div>
            {overdueAdvances.length > 0 && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 uppercase">
                Perlu SPJ
              </span>
            )}
          </div>

          <div className="mt-2 space-y-2">
            <div className="text-xl md:text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {overdueAdvances.length} Panjar
              <span className="text-xs font-semibold text-slate-500 ml-1.5">
                ({formatRupiah(totalOverdueAdvanceAmount)})
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                Total aktif: <strong>{activeAdvances.length}</strong> ({formatRupiah(totalActiveAdvanceAmount)})
              </span>
              <NavLink
                to="/lpj-data"
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
              >
                <span>Rincian</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>
          </div>
        </div>

        {/* Aset Tetap Gereja Card */}
        <div className="card-hover p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-900 text-white flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Inventaris & Aset Tetap</span>
                <span className="text-[10px] text-slate-500">Tanah, gedung, alat musik & sound</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
              {fixedAssets.filter((a) => a.status === 'aktif').length} Unit
            </span>
          </div>

          <div className="mt-2 space-y-2">
            <div className="text-xl md:text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {formatRupiah(totalFixedAssetsAmount)}
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Nilai perolehan historis</span>
              <NavLink
                to="/lpj-data"
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
              >
                <span>Daftar Aset</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>
          </div>
        </div>

        {/* Piutang & Kewajiban Berjalan Card */}
        <div className="card-hover p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">Posisi Piutang & Utang</span>
                <span className="text-[10px] text-slate-500">Akuntabilitas ISAK 35 (Non-Kas)</span>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
              ISAK 35
            </span>
          </div>

          <div className="mt-2 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Piutang Berjalan:</span>
              <span className="font-mono font-bold text-emerald-800 tabular-nums">
                {formatRupiah(totalActiveReceivablesAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Utang Pihak Ketiga:</span>
              <span className="font-mono font-bold text-rose-800 tabular-nums">
                {formatRupiah(totalActivePayablesAmount)}
              </span>
            </div>
            <div className="pt-1.5 border-t border-slate-100 flex justify-end">
              <NavLink
                to="/lpj-data"
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
              >
                <span>Kelola Utang/Piutang</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- SENTRALISASI KEUANGAN PPKU HKBP WIDGET ---------------- */}
      <div className="card-hover p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0B132B] text-amber-400 border border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-slate-900 text-base">Sentralisasi Keuangan PPKU HKBP</h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200/70">
                  55% BPSK Pusat : 45% Huria
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Alokasi resmi persembahan berdasarkan Pedoman Pengelolaan Keuangan Umum HKBP (Tahun {currentYear})
              </p>
            </div>
          </div>
          <NavLink
            to="/reports?tab=bpsk"
            className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <span>Rekapitulasi Setoran BPSK</span>
            <ChevronRight className="w-4 h-4" />
          </NavLink>
        </div>

        {/* 4 Clean Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* 1. Objek Sentralisasi */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Penerimaan Objek Sentralisasi
            </span>
            <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
              {formatRupiah(sentralisasiSummary.totalObjekSentralisasi)}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Pelean I-II, Namarboho, Partangiangan, Kategorial, Syukur, Badan Usaha
            </p>
          </div>

          {/* 2. 55% Kas Pusat BPSK */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">
                55% Kas Pusat (BPSK)
              </span>
              <span className="text-[9px] font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                Wajib Setor
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-blue-900 tabular-nums">
              {formatRupiah(sentralisasiSummary.totalBpskObligation)}
            </div>
            <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5">
              <span>Disetor: {formatRupiah(sentralisasiSummary.totalBpskRemitted)}</span>
              <span className={`font-semibold ${sentralisasiSummary.outstandingBpsk > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {sentralisasiSummary.outstandingBpsk > 0 ? `Kurang: ${formatRupiah(sentralisasiSummary.outstandingBpsk)}` : 'Lunas'}
              </span>
            </div>
          </div>

          {/* 3. 45% Kas Huria */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                45% Kas Huria (Lokal)
              </span>
              <span className="text-[9px] font-semibold bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded">
                Operasional
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
              {formatRupiah(sentralisasiSummary.totalHuriaShare)}
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Operasional rutin gereja, pelayanan ibadah, seksi & dewan lokal
            </p>
          </div>

          {/* 4. Pos Dikecualikan (100% Huria) */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Bebas Sentralisasi (100%)
              </span>
              <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                Khusus Lokal
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-800 tabular-nums">
              {formatRupiah(sentralisasiSummary.totalDikecualikan)}
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Sosial/Duka ({formatRupiah(sentralisasiSummary.totalSosialDuka)}), Beasiswa ({formatRupiah(sentralisasiSummary.totalBeasiswa)}), Pembangunan ({formatRupiah(sentralisasiSummary.totalPembangunanLokal)})
            </p>
          </div>
        </div>
      </div>

      {/* ---------------- DUAL MASTER WIDGETS: LPJ & AUDIT HURIA ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Widget 1: Kesiapan Laporan Keuangan */}
        <div className="card-hover p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Kesiapan Laporan & LPJ ISAK 35</h4>
                <p className="text-[11px] text-slate-500">Tata kelola semesteran & penutupan tahunan</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
              {currentSemesterRep?.status === 'announced' ? 'Warta Disiarkan' : 'Penyusunan'}
            </span>
          </div>

          <div className="space-y-2 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status Semester I ({settings.active_year || 2026}):</span>
              <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Diwartakan di Warta Jemaat
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Kunci Permanen LPJ Tahun Ini:</span>
              <span className={`font-semibold flex items-center gap-1.5 ${currentYearLocked ? 'text-purple-800' : 'text-slate-600'}`}>
                {currentYearLocked ? <Lock className="w-3.5 h-3.5 text-purple-600" /> : <Clock className="w-3.5 h-3.5 text-slate-400" />}
                {currentYearLocked ? 'Terkunci Permanen (Disahkan)' : 'Terbuka (Draf Persiapan)'}
              </span>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Format Neraca & Arus Kas Langsung</span>
            <NavLink
              to="/reports"
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <span>Buka Modul Laporan</span>
              <ChevronRight className="w-4 h-4" />
            </NavLink>
          </div>
        </div>

        {/* Widget 2: Badan Audit Huria */}
        <div className="card-hover p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-900 text-white flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Badan Audit Huria (Independen)</h4>
                <p className="text-[11px] text-slate-500">Hasil pemeriksaan 3 auditor kolegial</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200">
              3 Auditor Aktif
            </span>
          </div>

          <div className="space-y-2 text-xs bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Opini Terakhir Badan Audit:</span>
              <span className="font-bold text-emerald-800 font-mono text-xs">
                {latestFinalOpinion?.final_opinion === 'sesuai' ? 'Wajar Tanpa Pengecualian' : 'Wajar Dengan Catatan'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Temuan Wajib Perbaiki Tertunda:</span>
              <span className={`font-semibold ${pendingAuditFindings.length > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                {pendingAuditFindings.length > 0 ? `${pendingAuditFindings.length} Temuan Tertunda` : 'Nihil (Semua Dituntaskan)'}
              </span>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Sistem Voting Mayoritas 2/3</span>
            <NavLink
              to="/audit"
              className="px-3.5 py-1.5 bg-purple-900 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <span>Buka Modul Audit</span>
              <ChevronRight className="w-4 h-4" />
            </NavLink>
          </div>
        </div>
      </div>

      {/* ---------------- SALDO PER KAS SEKSI (EXECUTIVE CLEAN CARDS) ---------------- */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Buku Kas Seksi Kategorial & Umum
            </h3>
            <p className="text-xs text-slate-500">
              Buku kas per seksi dengan saldo awal, mutasi riil, dan saldo akhir terpisah.
            </p>
          </div>
          <NavLink
            to="/reports"
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Lihat Buku Kas Konsolidasi</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>

        {/* Responsive Executive Kas Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {kasBalances.map((kb) => {
            const kas = kasList.find((k) => k.id === kb.kas_id);
            const isRestricted = kas?.fund_type === 'restricted';

            return (
              <div
                key={kb.kas_id}
                className="card-hover p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-3.5"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 overflow-hidden">
                    <span className="text-xs font-bold text-slate-900 block truncate">
                      {kb.nama}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      {kb.kode}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 border ${
                      isRestricted
                        ? 'bg-purple-50 text-purple-900 border-purple-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {isRestricted ? 'Dana Terikat' : 'Tidak Terikat'}
                  </span>
                </div>

                {/* Saldo Resmi */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Saldo Kas Resmi
                  </span>
                  <div className="text-xl md:text-2xl font-bold text-slate-900 font-mono tabular-nums">
                    {formatRupiah(kb.saldo_resmi)}
                  </div>
                </div>

                {/* Mutasi Strip */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Pemasukan</span>
                    <span className="font-bold text-emerald-800 font-mono tabular-nums text-xs">
                      +{formatRupiah(kb.total_pemasukan)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Pengeluaran</span>
                    <span className="font-bold text-rose-800 font-mono tabular-nums text-xs">
                      -{formatRupiah(kb.total_pengeluaran)}
                    </span>
                  </div>
                </div>

                {/* Footer with Projection */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Proyeksi:</span>
                  <span className="font-bold font-mono text-slate-800 tabular-nums">
                    {formatRupiah(kb.saldo_proyeksi)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- DIGITAL BANKING & STORAGE ACCOUNTS CARDS ---------------- */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Tempat Penyimpanan Dana (Brankas Fisik & Rekening Bank)
          </h3>
          <p className="text-xs text-slate-500">
            Diverifikasi melalui Berita Acara Rekonsiliasi fisik & rekening koran bank.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {storageBalances.map((sb, idx) => {
            const isCash = sb.tipe === 'cash';

            return (
              <div
                key={sb.storage_account_id}
                className={`card-hover p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4 ${
                  isCash
                    ? 'bg-slate-950 text-white border border-slate-800'
                    : idx === 1
                    ? 'bg-[#0B132B] text-white border border-slate-800'
                    : 'bg-[#0F172A] text-white border border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300">
                      {isCash ? <Coins className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">{sb.nama}</span>
                      <span className="text-[10px] text-slate-300">
                        {isCash ? 'Uang Tunai Brankas Huria' : `A/N: ${sb.atas_nama || 'HKBP Ressort Hutaraja'}`}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                    {isCash ? 'Fisik' : 'Bank'}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {isCash ? 'LOKASI: KANTOR RESORT' : `NO REK: ${sb.nomor_rekening || '0123-01-000456-50-8'}`}
                  </span>
                  <div className="text-2xl font-bold font-mono text-white tabular-nums tracking-tight">
                    {formatRupiah(sb.saldo_saat_ini)}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
                  <span>Status: Terverifikasi</span>
                  <span className="font-semibold text-emerald-400">Aktif & Sinkron</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------------- CHARTS SECTION: TREND & COMPOSITION ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
        {/* Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 min-w-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tren Pemasukan & Pengeluaran 12 Bulan</h3>
              <p className="text-xs text-slate-500">Aliran kas operasional murni (transfer internal dipisahkan)</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#1E3A8A]"></span> Pemasukan
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#BE123C]"></span> Pengeluaran
              </span>
            </div>
          </div>

          <div className="h-64 w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}Jt`}
                />
                <Tooltip
                  formatter={(val: any) => formatRupiah(Number(val))}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #E2E8F0' }}
                />
                <Bar dataKey="masuk" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="keluar" fill="#BE123C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Income Composition Donut */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4 flex flex-col justify-between min-w-0 overflow-hidden">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Komposisi Sumber Penerimaan</h3>
            <p className="text-xs text-slate-500">Distribusi persembahan & pendapatan huria</p>
          </div>

          {donutData.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-xs text-slate-400 space-y-1">
              <span className="font-semibold text-slate-500">Belum Ada Penerimaan Kas</span>
              <span className="text-[11px] text-slate-400">Pemasukan kas yang dicatat & disetujui akan tampil di sini.</span>
            </div>
          ) : (
            <>
              <div className="h-44 w-full min-w-0 flex items-center justify-center overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {donutData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => formatRupiah(Number(val))}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #E2E8F0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                {donutData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-600 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span className="font-bold text-slate-900 font-mono tabular-nums shrink-0">
                      {formatRupiah(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---------------- 8 RECENT TRANSACTIONS (EXECUTIVE TABLE + MOBILE CARDS) ---------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-900">Transaksi Kas Terakhir</h3>
            <p className="text-xs text-slate-500">Mutasi kas huria dan seksi kategorial yang telah dicatat</p>
          </div>
          <NavLink
            to="/transactions"
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
          >
            <span>Semua Transaksi</span>
            <ChevronRight className="w-4 h-4" />
          </NavLink>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-5">Tanggal & Bukti</th>
                <th className="py-3 px-5">Kas (Dana)</th>
                <th className="py-3 px-5">Uraian Transaksi</th>
                <th className="py-3 px-5">Rekening / Brankas</th>
                <th className="py-3 px-5 text-right">Nominal</th>
                <th className="py-3 px-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.map((tx) => {
                const kas = kasList.find((k) => k.id === tx.kas_id);
                const storage = storageAccounts.find((s) => s.id === tx.storage_account_id);
                const isInc = tx.type === 'income' || tx.type === 'transfer_in';

                return (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-slate-600 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 block">{formatDateIndo(tx.tanggal)}</span>
                      {tx.receipt_no && <span className="text-[10px] text-slate-400 font-mono">No: {tx.receipt_no}</span>}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {kas?.nama}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-medium text-slate-900 line-clamp-1">{tx.description}</div>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 whitespace-nowrap">{storage?.nama}</td>
                    <td
                      className={`py-3.5 px-5 text-right font-mono font-bold whitespace-nowrap tabular-nums text-sm ${
                        isInc ? 'text-emerald-800' : 'text-rose-800'
                      }`}
                    >
                      {isInc ? '+' : '-'}
                      {formatRupiah(tx.amount)}
                    </td>
                    <td className="py-3.5 px-5 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${
                          tx.status === 'approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : tx.status === 'submitted'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : tx.status === 'draft'
                            ? 'bg-slate-100 text-slate-700 border-slate-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards View */}
        <div className="md:hidden divide-y divide-slate-100 p-4 space-y-3">
          {recentTransactions.map((tx) => {
            const kas = kasList.find((k) => k.id === tx.kas_id);
            const storage = storageAccounts.find((s) => s.id === tx.storage_account_id);
            const isInc = tx.type === 'income' || tx.type === 'transfer_in';

            return (
              <div key={tx.id} className="pt-3 first:pt-0 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-500">{formatDateIndo(tx.tanggal)}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase border ${
                      tx.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : tx.status === 'submitted'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>

                <div className="font-semibold text-slate-900 text-sm leading-snug">
                  {tx.description}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                      {kas?.nama}
                    </span>
                    <span className="text-[10px] text-slate-400">· {storage?.nama}</span>
                  </div>

                  <span
                    className={`font-mono font-bold tabular-nums text-sm ${
                      isInc ? 'text-emerald-800' : 'text-rose-800'
                    }`}
                  >
                    {isInc ? '+' : '-'}
                    {formatRupiah(tx.amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
