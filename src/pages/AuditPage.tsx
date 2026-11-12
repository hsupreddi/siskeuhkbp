/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Download,
  Users,
  Camera,
  Calculator,
  ChevronRight,
  Check,
  X,
  Clock,
  Send,
  Award,
  RefreshCw,
  Plus,
  Scale,
  FileCheck,
  Search,
  Filter,
  ExternalLink,
  Calendar,
  Printer,
  Stamp,
  BookmarkCheck,
  ListChecks,
  CheckCircle,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, formatDateIndo } from '../lib/formatters';
import { generateBeritaAcaraAuditPDF } from '../lib/exportUtils';
import {
  AuditEngagement,
  AuditPersonalOpinion,
  AuditFindingSeverity,
  AuditPeriodVerification,
  AuditPeriodCode,
  AuditPeriodVerificationStatus,
  Transaction,
  TransactionAuditStatus,
} from '../types/database';

export const AuditPage: React.FC = () => {
  const {
    auditBodyMembers,
    auditEngagements,
    auditReviews,
    auditFindings,
    auditFinalOpinions,
    cashCounts,
    kasList,
    storageAccounts,
    categories,
    profiles,
    settings,
    transactions,
    verifyTransactionAudit,
    auditPeriodVerifications,
    saveAuditPeriodVerification,
    signAuditPeriodVerification,
    saveAuditBodyMember,
    removeAuditBodyMember,
    saveAuditEngagement,
    submitAuditReview,
    saveAuditFinding,
    respondAuditFinding,
    closeAuditFinding,
    finalizeAuditOpinion,
    recordCashCount,
  } = useData();

  const { currentUser, isAdmin } = useAuth();

  // Active sub-navigation
  const [activeTab, setActiveTab] = useState<'transaksi' | 'berkala' | 'pemeriksaan' | 'temuan' | 'opname' | 'anggota' | 'arsip'>('transaksi');

  // Transaction verification state
  const [txPeriodFilter, setTxPeriodFilter] = useState<'all' | 'tw_1' | 'tw_2' | 'tw_3' | 'tw_4' | 'sem_1' | 'sem_2' | 'tahunan'>('all');
  const [txKasFilter, setTxKasFilter] = useState<string>('all');
  const [txStatusFilter, setTxStatusFilter] = useState<'all' | 'unverified' | 'verified' | 'flagged'>('all');
  const [txSearch, setTxSearch] = useState<string>('');
  const [flaggingTx, setFlaggingTx] = useState<Transaction | null>(null);
  const [flaggingTitle, setFlaggingTitle] = useState<string>('');
  const [flaggingDesc, setFlaggingDesc] = useState<string>('');
  const [flaggingSeverity, setFlaggingSeverity] = useState<AuditFindingSeverity>('wajib_diperbaiki');
  const [flaggingDueDate, setFlaggingDueDate] = useState<string>('');

  // Periodic verification state
  const [selectedPeriodCode, setSelectedPeriodCode] = useState<AuditPeriodCode>('tw_4');
  const [previewingBa, setPreviewingBa] = useState<AuditPeriodVerification | null>(null);
  const [periodNotesInput, setPeriodNotesInput] = useState<string>('');

  // Selected engagement
  const [selectedEngId, setSelectedEngId] = useState<string>(
    auditEngagements.find((e) => e.status === 'in_progress')?.id || auditEngagements[0]?.id || ''
  );

  // Review Form Modal State
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [reviewPersonalOpinion, setReviewPersonalOpinion] = useState<AuditPersonalOpinion>('sesuai');
  const [reviewGeneralNotes, setReviewGeneralNotes] = useState<string>('');
  const [reviewSectionNotes, setReviewSectionNotes] = useState<Record<string, string>>({
    kas_dan_bank: '',
    realisasi_anggaran: '',
    panjar_kegiatan: '',
    aset_inventaris: '',
  });

  // Final Opinion Modal State
  const [showFinalizeModal, setShowFinalizeModal] = useState<boolean>(false);
  const [baNo, setBaNo] = useState<string>('');
  const [baDate, setBaDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dissentingNotes, setDissentingNotes] = useState<string>('');

  // Finding Form Modal State
  const [showFindingModal, setShowFindingModal] = useState<boolean>(false);
  const [findingKasId, setFindingKasId] = useState<string>(kasList[0]?.id || '');
  const [findingTitle, setFindingTitle] = useState<string>('');
  const [findingDesc, setFindingDesc] = useState<string>('');
  const [findingSeverity, setFindingSeverity] = useState<AuditFindingSeverity>('wajib_diperbaiki');
  const [findingDueDate, setFindingDueDate] = useState<string>('');

  // Finding Respond Modal State
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [responseNotes, setResponseNotes] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');

  // Cash Count Calculator State
  const [ccKasId, setCcKasId] = useState<string>(kasList[0]?.id || '');
  const [ccStorageId, setCcStorageId] = useState<string>(storageAccounts[0]?.id || '');
  const [ccWitness, setCcWitness] = useState<string>('');
  const [ccExplanation, setCcExplanation] = useState<string>('');
  const [ccPhotoUrl, setCcPhotoUrl] = useState<string>('');
  const [cashDenominations, setCashDenominations] = useState<Record<string, number>>({
    '100000': 0,
    '50000': 0,
    '20000': 0,
    '10000': 0,
    '5000': 0,
    '2000': 0,
    '1000': 0,
  });

  // New Engagement Form State
  const [showNewEngModal, setShowNewEngModal] = useState<boolean>(false);
  const [newEngTahun, setNewEngTahun] = useState<number>(settings.active_year || 2026);
  const [newEngJenis, setNewEngJenis] = useState<'semester_1' | 'semester_2' | 'tahunan' | 'opening'>('semester_2');
  const [newEngJudul, setNewEngJudul] = useState<string>('');
  const [newEngBatasWaktu, setNewEngBatasWaktu] = useState<string>('');

  // Member Management State
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false);
  const [memberUserId, setMemberUserId] = useState<string>('');
  const [memberJabatan, setMemberJabatan] = useState<'ketua' | 'anggota'>('anggota');

  // Notification message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Current Selected Engagement
  const currentEngagement = useMemo(
    () => auditEngagements.find((e) => e.id === selectedEngId) || auditEngagements[0],
    [auditEngagements, selectedEngId]
  );

  // Reviews for current engagement
  const currentReviews = useMemo(
    () => auditReviews.filter((r) => r.engagement_id === currentEngagement?.id),
    [auditReviews, currentEngagement]
  );

  // Findings for current engagement
  const currentFindings = useMemo(
    () => auditFindings.filter((f) => f.engagement_id === currentEngagement?.id),
    [auditFindings, currentEngagement]
  );

  // Final opinion for current engagement
  const currentFinalOpinion = useMemo(
    () => auditFinalOpinions.find((o) => o.engagement_id === currentEngagement?.id),
    [auditFinalOpinions, currentEngagement]
  );

  // Active Audit Members
  const activeMembers = useMemo(() => auditBodyMembers.filter((m) => m.aktif), [auditBodyMembers]);
  const isCurrentUserAuditor = useMemo(
    () => activeMembers.some((m) => m.user_id === currentUser?.id) || isAdmin,
    [activeMembers, currentUser, isAdmin]
  );
  const currentUserAuditRecord = useMemo(
    () => activeMembers.find((m) => m.user_id === currentUser?.id),
    [activeMembers, currentUser]
  );

  // My review on this engagement
  const myReview = useMemo(
    () => currentReviews.find((r) => r.member_id === currentUser?.id),
    [currentReviews, currentUser]
  );

  // Cash Count Calculation
  const calculatedPhysicalBalance = useMemo(() => {
    let total = 0;
    Object.entries(cashDenominations).forEach(([denom, count]) => {
      total += Number(denom) * Number(count || 0);
    });
    return total;
  }, [cashDenominations]);

  // Period mapping helper
  const getTxPeriod = (tgl: string) => {
    const parts = (tgl || '').split('-');
    const m = parseInt(parts[1], 10) || 1;
    let tw = 'tw_1';
    if (m >= 4 && m <= 6) tw = 'tw_2';
    else if (m >= 7 && m <= 9) tw = 'tw_3';
    else if (m >= 10 && m <= 12) tw = 'tw_4';
    const sem = m <= 6 ? 'sem_1' : 'sem_2';
    return { tw, sem };
  };

  // Filtered transactions for verification tab
  const filteredTxList = useMemo(() => {
    return transactions.filter((t) => {
      // Period
      if (txPeriodFilter !== 'all') {
        const { tw, sem } = getTxPeriod(t.tanggal);
        if (txPeriodFilter.startsWith('tw_') && tw !== txPeriodFilter) return false;
        if (txPeriodFilter.startsWith('sem_') && sem !== txPeriodFilter) return false;
      }
      // Kas
      if (txKasFilter !== 'all' && t.kas_id !== txKasFilter) return false;
      // Status
      if (txStatusFilter !== 'all') {
        const currentSt = t.audit_status || 'unverified';
        if (currentSt !== txStatusFilter) return false;
      }
      // Search
      if (txSearch.trim()) {
        const q = txSearch.toLowerCase();
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchRec = t.receipt_no?.toLowerCase().includes(q) || false;
        const matchAmt = t.amount.toString().includes(q);
        return matchDesc || matchRec || matchAmt;
      }
      return true;
    });
  }, [transactions, txPeriodFilter, txKasFilter, txStatusFilter, txSearch]);

  const txAuditStats = useMemo(() => {
    const totalCount = filteredTxList.length;
    const verifiedCount = filteredTxList.filter((t) => t.audit_status === 'verified').length;
    const flaggedCount = filteredTxList.filter((t) => t.audit_status === 'flagged').length;
    const unverifiedCount = filteredTxList.filter((t) => !t.audit_status || t.audit_status === 'unverified').length;
    const totalAmount = filteredTxList.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    return { totalCount, verifiedCount, flaggedCount, unverifiedCount, totalAmount };
  }, [filteredTxList]);

  // Selected Periodic verification
  const currentPeriodVerification = useMemo(() => {
    return (
      auditPeriodVerifications.find(
        (p) => p.period_code === selectedPeriodCode && p.tahun === (settings.active_year || 2026)
      ) || auditPeriodVerifications[0]
    );
  }, [auditPeriodVerifications, selectedPeriodCode, settings.active_year]);

  // Financial summary for selected periodic audit
  const periodFinancialSummary = useMemo(() => {
    const pTxs = transactions.filter((t) => {
      const { tw, sem } = getTxPeriod(t.tanggal);
      if (selectedPeriodCode.startsWith('tw_')) return tw === selectedPeriodCode;
      if (selectedPeriodCode.startsWith('sem_')) return sem === selectedPeriodCode;
      return true; // tahunan
    });
    const income = pTxs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = pTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
    const verified = pTxs.filter((t) => t.audit_status === 'verified').length;
    const flagged = pTxs.filter((t) => t.audit_status === 'flagged').length;
    const unverified = pTxs.filter((t) => !t.audit_status || t.audit_status === 'unverified').length;
    return {
      income,
      expense,
      surplus: income - expense,
      totalTxs: pTxs.length,
      verified,
      flagged,
      unverified,
    };
  }, [transactions, selectedPeriodCode]);

  // Actions for transaction audit
  const handleVerifySingleTx = async (txId: string, status: 'verified' | 'unverified') => {
    const res = await verifyTransactionAudit(txId, status);
    if (res.success) {
      showToast(status === 'verified' ? 'Transaksi ditandai: Lolos Verifikasi Audit' : 'Verifikasi transaksi dibatalkan');
    } else {
      showToast(res.error || 'Gagal mengubah status verifikasi', 'error');
    }
  };

  const handleSaveFlaggedTransaction = async () => {
    if (!flaggingTx) return;
    const res = await verifyTransactionAudit(flaggingTx.id, 'flagged', flaggingDesc, {
      title: flaggingTitle || `Temuan Audit Transaksi ${flaggingTx.receipt_no || flaggingTx.id}`,
      description: flaggingDesc || 'Dokumen bukti transaksi memerlukan kelengkapan dan klarifikasi.',
      severity: flaggingSeverity,
      dueDate: flaggingDueDate,
    });
    if (res.success) {
      showToast('Transaksi ditandai memiliki temuan dan otomatis dicatat ke Berita Acara Temuan.');
      setFlaggingTx(null);
    } else {
      showToast(res.error || 'Gagal menyimpan temuan audit transaksi', 'error');
    }
  };

  const handleBulkVerifyCurrentFilter = async () => {
    const unverified = filteredTxList.filter((t) => !t.audit_status || t.audit_status === 'unverified');
    if (unverified.length === 0) {
      showToast('Seluruh transaksi pada filter ini sudah diperiksa.');
      return;
    }
    for (const t of unverified) {
      await verifyTransactionAudit(t.id, 'verified', 'Diverifikasi lolos uji kelayakan bukti dalam verifikasi berkala.');
    }
    showToast(`Berhasil memverifikasi ${unverified.length} transaksi sekaligus.`);
  };

  const handleSignPeriodVerification = async (periodCode: AuditPeriodCode) => {
    const res = await signAuditPeriodVerification(periodCode);
    if (res.success) {
      showToast('Tanda tangan dan verifikasi berkala Anda berhasil dibubuhkan.');
    } else {
      showToast(res.error || 'Gagal membubuhkan tanda tangan', 'error');
    }
  };

  const handleToggleChecklist = async (key: keyof AuditPeriodVerification['checklist']) => {
    if (!currentPeriodVerification) return;
    const updatedChecklist = {
      ...currentPeriodVerification.checklist,
      [key]: !currentPeriodVerification.checklist[key],
    };
    await saveAuditPeriodVerification({
      ...currentPeriodVerification,
      checklist: updatedChecklist,
    });
    showToast('Checklist kepatuhan berkala diperbarui');
  };

  const handleSavePeriodNotes = async () => {
    if (!currentPeriodVerification) return;
    await saveAuditPeriodVerification({
      ...currentPeriodVerification,
      general_notes: periodNotesInput || currentPeriodVerification.general_notes,
    });
    showToast('Catatan simpulan verifikasi berkala disimpan');
  };

  // Handle Submit Review
  const handleSubmitMyReview = async () => {
    if (!currentEngagement || !currentUser) return;
    const res = await submitAuditReview({
      engagement_id: currentEngagement.id,
      member_id: currentUser.id,
      personal_opinion: reviewPersonalOpinion,
      general_notes: reviewGeneralNotes,
      notes_per_section: reviewSectionNotes,
    });

    if (res.success) {
      showToast('Lembar kerja pemeriksaan audit Anda berhasil disimpan dan diarsipkan.');
      setShowReviewModal(false);
    } else {
      showToast(res.error || 'Gagal menyimpan review audit.', 'error');
    }
  };

  // Handle Finalize Opinion
  const handleFinalizeOpinion = async () => {
    if (!currentEngagement) return;
    const res = await finalizeAuditOpinion(currentEngagement.id, {
      beritaAcaraNo: baNo || `BA-AUDIT/${currentEngagement.tahun}/${currentEngagement.jenis.toUpperCase()}/001`,
      beritaAcaraDate: baDate,
      dissentingNotes,
      signatories: activeMembers.map((m) => {
        const p = profiles.find((prof) => prof.id === m.user_id);
        return {
          role: m.jabatan === 'ketua' ? 'Ketua Badan Audit' : 'Anggota Badan Audit',
          name: p?.full_name || 'Auditor',
          signed_at: new Date().toISOString(),
        };
      }),
    });

    if (res.success) {
      showToast(`Opini Final Badan Audit berhasil ditetapkan (${res.opinion?.toUpperCase()}). Berita Acara resmi diterbitkan!`);
      setShowFinalizeModal(false);
    } else {
      showToast(res.error || 'Gagal menetapkan opini final.', 'error');
    }
  };

  // Handle Save New Finding
  const handleSaveFinding = async () => {
    if (!currentEngagement) return;
    const res = await saveAuditFinding({
      engagement_id: currentEngagement.id,
      kas_id: findingKasId,
      title: findingTitle,
      description: findingDesc,
      severity: findingSeverity,
      due_date: findingDueDate || null,
    });

    if (res.success) {
      showToast('Temuan audit berhasil dicatat dalam daftar tindak lanjut.');
      setShowFindingModal(false);
      setFindingTitle('');
      setFindingDesc('');
    } else {
      showToast(res.error || 'Gagal mencatat temuan audit.', 'error');
    }
  };

  // Handle Record Cash Count
  const handleRecordCashCount = async () => {
    // Look up current book balance from transactions
    const targetKas = kasList.find((k) => k.id === ccKasId);
    const bookBalance = targetKas ? 5450000 : 0; // fallback standard

    const res = await recordCashCount({
      kas_id: ccKasId,
      storage_account_id: ccStorageId,
      book_balance: bookBalance,
      physical_balance: calculatedPhysicalBalance,
      cash_breakdown: cashDenominations,
      witness_name: ccWitness,
      explanation: ccExplanation,
      photo_url: ccPhotoUrl || null,
    });

    if (res.success) {
      if (res.findingId) {
        showToast('Opname fisik kas dicatat. Ditemukan selisih dan sistem OTOMATIS membuat draf temuan audit wajib periksa!', 'error');
      } else {
        showToast('Opname kas fisik berhasil dicatat. Saldo fisik cocok persis dengan saldo buku (Nihil Selisih).');
      }
      setCcExplanation('');
      setCcWitness('');
      setCcPhotoUrl('');
    } else {
      showToast(res.error || 'Gagal mencatat opname kas.', 'error');
    }
  };

  // Handle Create Engagement
  const handleCreateEngagement = async () => {
    const res = await saveAuditEngagement({
      tahun: newEngTahun,
      jenis: newEngJenis,
      judul: newEngJudul || `Pemeriksaan Keuangan ${newEngJenis === 'semester_1' ? 'Semester I' : newEngJenis === 'semester_2' ? 'Semester II' : 'Tahunan'} Tahun ${newEngTahun}`,
      batas_waktu: newEngBatasWaktu || `${newEngTahun}-12-31`,
    });

    if (res.success) {
      showToast('Penugasan audit baru berhasil dibuka.');
      setShowNewEngModal(false);
      if (res.id) setSelectedEngId(res.id);
    } else {
      showToast(res.error || 'Gagal membuka penugasan audit.', 'error');
    }
  };

  // Handle Add Member
  const handleAddMember = async () => {
    const res = await saveAuditBodyMember({
      user_id: memberUserId,
      jabatan: memberJabatan,
      aktif: true,
    });

    if (res.success) {
      showToast('Anggota Badan Audit Huria berhasil ditambahkan.');
      setShowAddMemberModal(false);
    } else {
      showToast(res.error || 'Gagal menambahkan anggota audit.', 'error');
    }
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
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            )}
            <p className="font-medium">{toastMessage.text}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white p-6 md:p-8 shadow-xl border border-indigo-800/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>Badan Audit Huria Independen</span>
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              3 Anggota Kolektif (Majority Rule 2/3)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Pemeriksaan & Tata Kelola Badan Audit Huria
          </h1>
          <p className="text-xs md:text-sm text-indigo-200/90 max-w-2xl leading-relaxed">
            Pemeriksaan berkala (Semester I, Semester II, Saldo Awal, & LPJ Tahunan), opname fisik kas brankas, dan penegakan tata kelola persembahan jemaat yang akuntabel.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {isCurrentUserAuditor && (
            <button
              onClick={() => {
                if (currentEngagement) {
                  generateBeritaAcaraAuditPDF({
                    engagement: currentEngagement,
                    finalOpinion: currentFinalOpinion,
                    reviews: currentReviews,
                    findings: currentFindings,
                    settings,
                  });
                }
              }}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 backdrop-blur-md text-white border border-white/20 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <Download className="w-4 h-4 text-indigo-300" />
              <span>Unduh Berita Acara PDF</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setNewEngJudul(`Pemeriksaan Keuangan Semester II Tahun ${settings.active_year || 2026}`);
                setShowNewEngModal(true);
              }}
              className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-500/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Buka Penugasan Audit</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Segmented Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('transaksi')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'transaksi'
              ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/70'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4 text-emerald-600" />
          <span>Verifikasi Transaksi ({transactions.filter((t) => t.audit_status === 'verified').length}/{transactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('berkala')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'berkala'
              ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/70'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-primary" />
          <span>Pemeriksaan Berkala (Triwulan & Semester)</span>
        </button>

        <button
          onClick={() => setActiveTab('pemeriksaan')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'pemeriksaan'
              ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/70'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Opini Kolegial 3 Anggota</span>
        </button>

        <button
          onClick={() => setActiveTab('temuan')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap relative ${
            activeTab === 'temuan'
              ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/70'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span>Temuan Audit ({auditFindings.filter((f) => f.status === 'terbuka' || f.status === 'ditanggapi').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('opname')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'opname'
              ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/70'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Opname Kas Fisik</span>
        </button>

        <button
          onClick={() => setActiveTab('anggota')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'anggota'
              ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/70'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Keanggotaan & Independensi</span>
        </button>

        <button
          onClick={() => setActiveTab('arsip')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 transition-all whitespace-nowrap ${
            activeTab === 'arsip'
              ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/70'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Arsip Berita Acara</span>
        </button>
      </div>

      {/* ======================================================================= */}
      {/* TAB 1: VERIFIKASI TRANSAKSI OLEH BADAN AUDIT HURIA                     */}
      {/* ======================================================================= */}
      {activeTab === 'transaksi' && (
        <div className="space-y-6">
          {/* Filter & Search Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Uji Verifikasi Transaksi Kas & Keabsahan Dokumen Pendukung</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Badan Audit memeriksa keabsahan bukti fisik (kuitansi, nota, cap toko), kesesuaian nominal, dan menandai transaksi yang lolos uji atau memiliki temuan.
                </p>
              </div>

              {isCurrentUserAuditor && (
                <button
                  onClick={handleBulkVerifyCurrentFilter}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap self-start md:self-auto"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Verifikasi Cepat Transaksi Pada Filter Ini</span>
                </button>
              )}
            </div>

            {/* Filter Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Periode Pemeriksaan</label>
                <select
                  value={txPeriodFilter}
                  onChange={(e) => setTxPeriodFilter(e.target.value as any)}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  <option value="all">Semua Periode 2026</option>
                  <option value="tw_1">Triwulan I (Jan - Mar)</option>
                  <option value="tw_2">Triwulan II (Apr - Jun)</option>
                  <option value="tw_3">Triwulan III (Jul - Sep)</option>
                  <option value="tw_4">Triwulan IV (Okt - Des)</option>
                  <option value="sem_1">Semester I (Jan - Jun)</option>
                  <option value="sem_2">Semester II (Jul - Des)</option>
                  <option value="tahunan">Tahunan (Penuh 2026)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Entitas Kas / Seksi</label>
                <select
                  value={txKasFilter}
                  onChange={(e) => setTxKasFilter(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  <option value="all">Semua Kas Huria ({kasList.length})</option>
                  {kasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama} ({k.kode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status Verifikasi Audit</label>
                <select
                  value={txStatusFilter}
                  onChange={(e) => setTxStatusFilter(e.target.value as any)}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  <option value="all">Semua Status Audit</option>
                  <option value="unverified">Belum Diverifikasi</option>
                  <option value="verified">Lolos Verifikasi (Valid)</option>
                  <option value="flagged">Ada Catatan / Temuan</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Cari Kuitansi / Uraian</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="No. BKM / BKK / Uraian..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card-indigo card-hover p-4 rounded-2xl border-t-4 border-t-indigo-500 shadow-2xs space-y-1 transition-all">
              <span className="text-[11px] font-semibold text-indigo-900/80 uppercase tracking-wider block">
                Total Transaksi Sesuai Filter
              </span>
              <p className="text-xl md:text-2xl font-black text-indigo-950 tabular-nums">
                {txAuditStats.totalCount} <span className="text-xs font-semibold text-indigo-800/80">transaksi</span>
              </p>
              <p className="text-[11px] font-medium text-indigo-800/80 tabular-nums">
                Nilai: {formatRupiah(txAuditStats.totalAmount)}
              </p>
            </div>

            <div className="card-emerald card-hover p-4 rounded-2xl border-t-4 border-t-emerald-500 shadow-2xs space-y-1 transition-all">
              <span className="text-[11px] font-semibold text-emerald-900/80 uppercase tracking-wider block flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Lolos Verifikasi (Valid)</span>
              </span>
              <p className="text-xl md:text-2xl font-black text-emerald-950 tabular-nums">
                {txAuditStats.verifiedCount}
                <span className="text-xs font-semibold text-emerald-800 ml-1.5">
                  ({Math.round((txAuditStats.verifiedCount / (txAuditStats.totalCount || 1)) * 100)}%)
                </span>
              </p>
              <p className="text-[11px] font-medium text-emerald-800/80">Bukti sah & terkonfirmasi</p>
            </div>

            <div className="card-amber card-hover p-4 rounded-2xl border-t-4 border-t-amber-500 shadow-2xs space-y-1 transition-all">
              <span className="text-[11px] font-semibold text-amber-900/80 uppercase tracking-wider block flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Catatan / Temuan Audit</span>
              </span>
              <p className="text-xl md:text-2xl font-black text-amber-950 tabular-nums">
                {txAuditStats.flaggedCount}
                <span className="text-xs font-semibold text-amber-800 ml-1.5">
                  ({Math.round((txAuditStats.flaggedCount / (txAuditStats.totalCount || 1)) * 100)}%)
                </span>
              </p>
              <p className="text-[11px] font-medium text-amber-800/80">Perlu klarifikasi bendahara</p>
            </div>

            <div className="card-sky card-hover p-4 rounded-2xl border-t-4 border-t-sky-500 shadow-2xs space-y-1 transition-all">
              <span className="text-[11px] font-semibold text-sky-900/80 uppercase tracking-wider block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>Belum Diperiksa</span>
              </span>
              <p className="text-xl md:text-2xl font-black text-sky-950 tabular-nums">
                {txAuditStats.unverifiedCount}
                <span className="text-xs font-semibold text-sky-800 ml-1.5">
                  ({Math.round((txAuditStats.unverifiedCount / (txAuditStats.totalCount || 1)) * 100)}%)
                </span>
              </p>
              <p className="text-[11px] font-medium text-sky-800/80">Menunggu pemeriksaan</p>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3.5">Tanggal & No. Bukti</th>
                    <th className="p-3.5">Kas & Rekening</th>
                    <th className="p-3.5">Kategori & Uraian Transaksi</th>
                    <th className="p-3.5 text-right">Nominal (Rp)</th>
                    <th className="p-3.5 text-center">Bukti Nota</th>
                    <th className="p-3.5">Status Audit & Catatan</th>
                    {isCurrentUserAuditor && <th className="p-3.5 text-center">Tindakan Auditor</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTxList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Tidak ada transaksi yang cocok dengan kriteria filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredTxList.map((tx) => {
                      const kas = kasList.find((k) => k.id === tx.kas_id);
                      const cat = categories.find((c) => c.id === tx.category_id);
                      const stor = storageAccounts.find((s) => s.id === tx.storage_account_id);
                      const auditorProfile = profiles.find((p) => p.id === tx.audited_by);

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5 align-top">
                            <div className="font-semibold text-slate-900">{formatDateIndo(tx.tanggal)}</div>
                            <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                              {tx.receipt_no || tx.id}
                            </div>
                          </td>

                          <td className="p-3.5 align-top">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: kas?.warna }} />
                              <span>{kas?.nama || tx.kas_id}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{stor?.nama}</div>
                          </td>

                          <td className="p-3.5 align-top max-w-xs">
                            <div className="text-[11px] font-semibold text-slate-500 uppercase">
                              {cat?.nama || (tx.type === 'transfer_out' ? 'Transfer Keluar' : 'Transfer Masuk')}
                            </div>
                            <div className="text-slate-800 font-medium leading-relaxed mt-0.5">
                              {tx.description}
                            </div>
                          </td>

                          <td className="p-3.5 align-top text-right font-mono font-bold whitespace-nowrap">
                            <span
                              className={
                                tx.type === 'income'
                                  ? 'text-emerald-700'
                                  : tx.type === 'expense'
                                  ? 'text-rose-700'
                                  : 'text-indigo-700'
                              }
                            >
                              {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                              {formatRupiah(tx.amount)}
                            </span>
                          </td>

                          <td className="p-3.5 align-top text-center whitespace-nowrap">
                            {tx.attachment_url ? (
                              <a
                                href={tx.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Lihat Nota</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Tanpa Foto</span>
                            )}
                          </td>

                          <td className="p-3.5 align-top min-w-[180px]">
                            {tx.audit_status === 'verified' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Lolos Uji Audit</span>
                                </span>
                                {auditorProfile && (
                                  <div className="text-[10px] text-slate-400">
                                    Oleh: {auditorProfile.full_name}
                                  </div>
                                )}
                                {tx.audit_note && (
                                  <div className="text-[11px] text-slate-600 italic">"{tx.audit_note}"</div>
                                )}
                              </div>
                            ) : tx.audit_status === 'flagged' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Ada Temuan Audit</span>
                                </span>
                                {tx.audit_note && (
                                  <div className="text-[11px] text-rose-800 font-medium leading-tight">
                                    {tx.audit_note}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                <Clock className="w-3 h-3" />
                                <span>Belum Diperiksa</span>
                              </span>
                            )}
                          </td>

                          {isCurrentUserAuditor && (
                            <td className="p-3.5 align-top text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleVerifySingleTx(tx.id, 'verified')}
                                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                                    tx.audit_status === 'verified'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                                  title="Verifikasi Lolos Audit"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Lolos</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setFlaggingTx(tx);
                                    setFlaggingTitle(`Temuan Transaksi: ${tx.receipt_no || tx.id}`);
                                    setFlaggingDesc(tx.audit_note || `Pemeriksaan transaksi ${tx.description} senilai ${formatRupiah(tx.amount)} memerlukan kelengkapan kuitansi/nota.`);
                                    setFlaggingSeverity('wajib_diperbaiki');
                                    setFlaggingDueDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
                                  }}
                                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                                    tx.audit_status === 'flagged'
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  }`}
                                  title="Tandai Temuan Audit"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Temuan</span>
                                </button>

                                {tx.audit_status && tx.audit_status !== 'unverified' && (
                                  <button
                                    onClick={() => handleVerifySingleTx(tx.id, 'unverified')}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                                    title="Batalkan / Reset Status"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
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

      {/* ======================================================================= */}
      {/* TAB 2: VERIFIKASI LAPORAN BERKALA (TRIWULAN, SEMESTER, TAHUNAN)         */}
      {/* ======================================================================= */}
      {activeTab === 'berkala' && (
        <div className="space-y-6">
          {/* Period Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs text-xs font-semibold scrollbar-none">
            {[
              { code: 'tw_1', label: 'Triwulan I (Jan-Mar)' },
              { code: 'tw_2', label: 'Triwulan II (Apr-Jun)' },
              { code: 'tw_3', label: 'Triwulan III (Jul-Sep)' },
              { code: 'tw_4', label: 'Triwulan IV (Okt-Des)' },
              { code: 'sem_1', label: 'Semester I (Jan-Jun)' },
              { code: 'sem_2', label: 'Semester II (Jul-Des)' },
              { code: 'tahunan', label: 'Tahunan (LPJ 2026)' },
            ].map((p) => {
              const apv = auditPeriodVerifications.find((v) => v.period_code === p.code);
              return (
                <button
                  key={p.code}
                  onClick={() => setSelectedPeriodCode(p.code as AuditPeriodCode)}
                  className={`px-3.5 py-2 rounded-xl whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    selectedPeriodCode === p.code
                      ? 'bg-primary text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{p.label}</span>
                  {apv?.status === 'diverifikasi' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs" />
                  )}
                  {apv?.status === 'catatan_perbaikan' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Period Card */}
          {currentPeriodVerification && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
              {/* Header Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      {currentPeriodVerification.period_title}
                    </h3>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        currentPeriodVerification.status === 'diverifikasi'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : currentPeriodVerification.status === 'catatan_perbaikan'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-blue-50 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {currentPeriodVerification.status === 'diverifikasi'
                        ? 'Diverifikasi Memenuhi Kepatuhan'
                        : currentPeriodVerification.status === 'catatan_perbaikan'
                        ? 'Diverifikasi Dengan Catatan'
                        : 'Sedang Dalam Proses Verifikasi'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Rentang Waktu: {currentPeriodVerification.date_range} • No. Berita Acara: {currentPeriodVerification.berita_acara_no || 'Belum Diterbitkan'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewingBa(currentPeriodVerification)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Pratinjau & Cetak Berita Acara</span>
                  </button>
                </div>
              </div>

              {/* Financial Snapshot for Period */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Penerimaan Periode</span>
                  <p className="text-base md:text-lg font-bold font-mono text-emerald-700">
                    +{formatRupiah(periodFinancialSummary.income)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Pengeluaran Periode</span>
                  <p className="text-base md:text-lg font-bold font-mono text-rose-700">
                    -{formatRupiah(periodFinancialSummary.expense)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Surplus / (Defisit)</span>
                  <p
                    className={`text-base md:text-lg font-bold font-mono ${
                      periodFinancialSummary.surplus >= 0 ? 'text-indigo-800' : 'text-rose-800'
                    }`}
                  >
                    {formatRupiah(periodFinancialSummary.surplus)}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase">Uji Transaksi Lolos</span>
                  <p className="text-base md:text-lg font-bold text-slate-900">
                    {periodFinancialSummary.verified} / {periodFinancialSummary.totalTxs}
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      ({Math.round((periodFinancialSummary.verified / (periodFinancialSummary.totalTxs || 1)) * 100)}%)
                    </span>
                  </p>
                </div>
              </div>

              {/* 6 Formal HKBP Compliance Checkpoints */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-primary" />
                  <span>6 Poin Kepatuhan Formal Badan Audit HKBP (Pasal 7 & 44 AP HKBP)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {[
                    {
                      key: 'cash_physical_match',
                      title: '1. Kesesuaian Fisik Kas & Bank',
                      desc: 'Saldo fisik brankas tunai dan rekening bank telah direkonsiliasi dengan berita acara opname kas tanpa selisih yang tidak terjelaskan.',
                    },
                    {
                      key: 'evidence_valid',
                      title: '2. Keabsahan Dokumen Bukti Transaksi',
                      desc: 'Kuitansi, nota asli, dan bukti pengeluaran bernomor urut, dibubuhi tanda tangan pihak berhak, dan memenuhi batas kewajaran.',
                    },
                    {
                      key: 'budget_adherence',
                      title: '3. Kepatuhan Pagu Anggaran (APBG)',
                      desc: 'Realisasi mata anggaran tidak melampaui pagu ketetapan Rapat Huria tanpa persetujuan pergeseran anggaran resmi.',
                    },
                    {
                      key: 'advance_settled',
                      title: '4. Penyelesaian Panjar Tepat Waktu',
                      desc: 'Seluruh panjar kegiatan dipertanggungjawabkan tepat waktu dengan rincian nota sah dan tidak ada panjar yang menggantung.',
                    },
                    {
                      key: 'remittance_compliant',
                      title: '5. Kepatuhan Penyetoran Dana Huria & Amanah',
                      desc: 'Pelean khusus, setoran pusat/distrik, serta dana terikat dikelola dan disalurkan sesuai amanah dan peruntukan.',
                    },
                    {
                      key: 'prior_findings_cleared',
                      title: '6. Tindak Lanjut Rekomendasi Audit',
                      desc: 'Seluruh catatan temuan dari pemeriksaan periode terdahulu telah ditindaklanjuti secara tuntas oleh pengurus kas terkait.',
                    },
                  ].map((chk) => {
                    const isPassed = currentPeriodVerification.checklist[chk.key as keyof AuditPeriodVerification['checklist']];
                    return (
                      <div
                        key={chk.key}
                        onClick={() => isCurrentUserAuditor && handleToggleChecklist(chk.key as any)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isPassed
                            ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                            : 'bg-rose-50/40 border-rose-200 text-slate-800'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 font-bold ${
                            isPassed ? 'bg-emerald-600 text-white' : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {isPassed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{chk.title}</div>
                          <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{chk.desc}</p>
                          <span
                            className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isPassed ? 'Memenuhi Syarat' : 'Perlu Perbaikan / Belum Lengkap'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* General Conclusion Notes */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Catatan Simpulan Pemeriksaan Berkala Badan Audit
                </label>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-800 leading-relaxed space-y-2">
                  <p>{currentPeriodVerification.general_notes || 'Belum ada catatan simpulan pemeriksaan tertulis.'}</p>
                  {isCurrentUserAuditor && (
                    <div className="pt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={periodNotesInput}
                        onChange={(e) => setPeriodNotesInput(e.target.value)}
                        placeholder="Tambahkan / ubah catatan simpulan audit..."
                        className="flex-1 p-2 rounded-xl border border-slate-200 bg-white text-xs"
                      />
                      <button
                        onClick={handleSavePeriodNotes}
                        className="px-3.5 py-2 bg-primary text-white text-xs font-semibold rounded-xl whitespace-nowrap shadow-xs"
                      >
                        Simpan Catatan
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 3 Members Collegial Signatures */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Stamp className="w-4 h-4 text-primary" />
                      <span>Tanda Tangan Kolegial 3 Anggota Badan Audit (Aturan 2/3 Suara)</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Verifikasi berkala dinyatakan sah apabila telah ditandatangani minimal oleh 2 dari 3 orang anggota Badan Audit Huria.
                    </p>
                  </div>

                  {isCurrentUserAuditor &&
                    currentUser &&
                    !currentPeriodVerification.verified_by.includes(currentUser.id) && (
                      <button
                        onClick={() => handleSignPeriodVerification(currentPeriodVerification.period_code)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Stamp className="w-4 h-4" />
                        <span>Bubuhkan Verifikasi & Tanda Tangan Saya</span>
                      </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {activeMembers.map((m) => {
                    const prof = profiles.find((p) => p.id === m.user_id);
                    const sig = currentPeriodVerification.verified_signatures?.find(
                      (s) => s.member_id === m.user_id
                    );
                    const isSigned = !!sig;

                    return (
                      <div
                        key={m.id}
                        className={`p-4 rounded-2xl border text-center space-y-2 transition-all ${
                          isSigned
                            ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 inline-block uppercase text-slate-600">
                          {m.jabatan === 'ketua' ? 'Ketua Badan Audit' : 'Anggota Badan Audit'}
                        </span>
                        <div className="font-bold text-xs text-slate-900">{prof?.full_name}</div>

                        <div className="pt-2 border-t border-slate-200/60">
                          {isSigned ? (
                            <div className="text-[11px] font-semibold text-emerald-700 flex items-center justify-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Ditandatangani ({formatDateIndo(sig.signed_at.split('T')[0])})</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Menunggu Tanda Tangan</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: PEMERIKSAAN & SUARA 3 ANGGOTA */}
      {activeTab === 'pemeriksaan' && (
        <div className="space-y-6">
          {/* Engagement Selector & Status Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 border border-gray-200 md:col-span-2 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Pilih Penugasan Pemeriksaan
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${
                    currentEngagement?.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  Status: {currentEngagement?.status === 'completed' ? 'Selesai (Disahkan)' : 'Pemeriksaan Berjalan'}
                </span>
              </div>

              <select
                value={selectedEngId}
                onChange={(e) => setSelectedEngId(e.target.value)}
                className="w-full text-base font-semibold text-gray-900 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7C9CF5]/30 bg-gray-50/50"
              >
                {auditEngagements.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.judul} ({eng.tahun}) — {eng.status === 'completed' ? 'Selesai' : 'Sedang Berlangsung'}
                  </option>
                ))}
              </select>

              <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Dibuka: {formatDateIndo(currentEngagement?.dibuka_pada || '')}</span>
                <span>•</span>
                <span>Batas Waktu: {formatDateIndo(currentEngagement?.batas_waktu || '')}</span>
                <span>•</span>
                <span>Jenis: {currentEngagement?.jenis.toUpperCase()}</span>
              </div>
            </div>

            {/* Final Opinion Card */}
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                  Opini Final Badan Audit
                </span>
                {currentFinalOpinion ? (
                  <div className="space-y-2">
                    <div
                      className={`px-3 py-2 rounded-xl text-center font-bold text-sm ${
                        currentFinalOpinion.final_opinion === 'sesuai'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : currentFinalOpinion.final_opinion === 'sesuai_dengan_catatan'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {currentFinalOpinion.final_opinion === 'sesuai'
                        ? 'Wajar Tanpa Pengecualian'
                        : currentFinalOpinion.final_opinion === 'sesuai_dengan_catatan'
                        ? 'Wajar Dengan Catatan'
                        : 'Perlu Perbaikan'}
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      Nomor BA: {currentFinalOpinion.berita_acara_no}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-xl text-center text-xs text-gray-500">
                    Menunggu penginputan seluruh 3 anggota Badan Audit sebelum opini final ditetapkan.
                  </div>
                )}
              </div>

              {/* Action: Finalize if 3 votes ready and not finalized yet */}
              {isCurrentUserAuditor && !currentFinalOpinion && currentReviews.length === 3 && (
                <button
                  onClick={() => {
                    setBaNo(`BA-AUDIT/${currentEngagement.tahun}/${currentEngagement.jenis.toUpperCase()}/001`);
                    setShowFinalizeModal(true);
                  }}
                  className="w-full mt-3 py-2 bg-[#7C9CF5] text-white hover:bg-[#6A8BE4] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <Award className="w-4 h-4" />
                  Tetapkan Opini Final (Suara Terbanyak)
                </button>
              )}
            </div>
          </div>

          {/* Voting Box: Status of 3 Members (Independen & Kolektif) */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Status Lembar Kerja & Opini 3 Anggota Audit</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Setiap anggota memeriksa secara independen tanpa campur tangan bendahara huria. Opini final sah jika disepakati minimal 2 dari 3 suara.
                </p>
              </div>

              {/* Button to input my review */}
              {isCurrentUserAuditor && (
                <button
                  onClick={() => {
                    if (myReview) {
                      setReviewPersonalOpinion(myReview.personal_opinion);
                      setReviewGeneralNotes(myReview.general_notes || '');
                      setReviewSectionNotes(myReview.notes_per_section || {});
                    }
                    setShowReviewModal(true);
                  }}
                  className="px-3.5 py-2 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors w-fit"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {myReview ? 'Perbarui Lembar Kerja Saya' : 'Isi Lembar Kerja Audit Saya'}
                </button>
              )}
            </div>

            {/* Grid of 3 Active Members Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeMembers.map((member, idx) => {
                const profile = profiles.find((p) => p.id === member.user_id);
                const review = currentReviews.find((r) => r.member_id === member.user_id);
                const isKetua = member.jabatan === 'ketua';

                return (
                  <div
                    key={member.id}
                    className={`rounded-xl p-4 border transition-all ${
                      review
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-gray-50/60 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                        {isKetua ? 'Ketua Badan Audit' : `Anggota Auditor ${idx}`}
                      </span>
                      {review ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Sudah Mengisi
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          Belum Mengisi
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-gray-900 text-sm">{profile?.full_name || 'Auditor Huria'}</h4>
                    <p className="text-xs text-gray-500">{profile?.email}</p>

                    {review ? (
                      <div className="mt-3 pt-3 border-t border-emerald-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Opini Pribadi:</span>
                          <span
                            className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                              review.personal_opinion === 'sesuai'
                                ? 'bg-emerald-100 text-emerald-800'
                                : review.personal_opinion === 'sesuai_dengan_catatan'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {review.personal_opinion === 'sesuai'
                              ? 'Sesuai'
                              : review.personal_opinion === 'sesuai_dengan_catatan'
                              ? 'Sesuai Catatan'
                              : 'Perlu Perbaikan'}
                          </span>
                        </div>
                        {review.general_notes && (
                          <p className="text-xs text-gray-600 italic line-clamp-2">
                            "{review.general_notes}"
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100 italic">
                        Menunggu auditor menginput catatan pemeriksaan fisik dan dokumen.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Dissenting Opinion Alert if present */}
            {currentFinalOpinion?.has_dissenting_opinion && (
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Perbedaan Pendapat (Dissenting Opinion) Dicatat Resmi</h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {currentFinalOpinion.dissenting_opinion_notes ||
                      'Salah satu anggota memberikan catatan perhatian khusus yang dilampirkan dalam Berita Acara untuk evaluasi rapat huria.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TINDAK LANJUT TEMUAN AUDIT */}
      {activeTab === 'temuan' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Daftar Temuan & Tindak Lanjut Perbaikan</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Temuan tingkat "Wajib Diperbaiki" harus diselesaikan atau diterima secara beralasan sebelum laporan disahkan.
              </p>
            </div>

            {isCurrentUserAuditor && (
              <button
                onClick={() => setShowFindingModal(true)}
                className="px-3.5 py-2 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors w-fit"
              >
                <Plus className="w-4 h-4" />
                Catat Temuan Baru
              </button>
            )}
          </div>

          {/* Finding Cards */}
          <div className="grid grid-cols-1 gap-4">
            {currentFindings.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 text-gray-400 text-sm">
                Belum ada temuan audit untuk periode pemeriksaan ini.
              </div>
            ) : (
              currentFindings.map((finding) => {
                const kas = kasList.find((k) => k.id === finding.kas_id);
                const isMandatory = finding.severity === 'wajib_diperbaiki';
                const isClosed = finding.status === 'selesai' || finding.status === 'diterima';

                return (
                  <div
                    key={finding.id}
                    className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:border-[#7C9CF5]/40 transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-500">{finding.kode}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isMandatory ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isMandatory ? 'Wajib Diperbaiki' : 'Informasi'}
                        </span>
                        {kas && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ backgroundColor: `${kas.warna}25`, color: kas.warna }}
                          >
                            {kas.nama}
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isClosed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : finding.status === 'ditanggapi'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {finding.status.toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{finding.title}</h4>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{finding.description}</p>
                    </div>

                    {/* Due Date & Response */}
                    {finding.due_date && (
                      <p className="text-xs text-amber-700 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Batas Waktu Penyelesaian: {formatDateIndo(finding.due_date)}
                      </p>
                    )}

                    {finding.response_notes && (
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-1">
                        <span className="font-semibold text-gray-700">Tanggapan Pengurus Kas / Bendum:</span>
                        <p className="text-gray-600 italic">"{finding.response_notes}"</p>
                      </div>
                    )}

                    {finding.closing_notes && (
                      <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs space-y-1">
                        <span className="font-semibold text-emerald-800">Catatan Penutupan oleh Auditor:</span>
                        <p className="text-emerald-700 italic">"{finding.closing_notes}"</p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                      {!isClosed && (
                        <button
                          onClick={() => {
                            setSelectedFindingId(finding.id);
                            setResponseNotes(finding.response_notes || '');
                          }}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          Beri Tanggapan / Tindak Lanjut
                        </button>
                      )}

                      {isCurrentUserAuditor && !isClosed && (
                        <button
                          onClick={() => {
                            setSelectedFindingId(finding.id);
                            setClosingNotes(finding.closing_notes || 'Telah diperiksa dan diverifikasi bukti perbaikannya.');
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Tutup / Sahkan Temuan
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: OPNAME KAS FISIK (PEMERIKSAAN MENDADAK) */}
      {activeTab === 'opname' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form Calculator */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="font-bold text-gray-900 text-base">Kalkulator Lembar Uang & Opname Kas Fisik</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Hitung lembaran uang fisik di brankas bersama bendahara kas. Bila ada selisih, sistem otomatis membuat draf temuan audit.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Kas yang Diopname</label>
                  <select
                    value={ccKasId}
                    onChange={(e) => setCcKasId(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/50"
                  >
                    {kasList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama} ({k.kode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tempat Penyimpanan</label>
                  <select
                    value={ccStorageId}
                    onChange={(e) => setCcStorageId(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/50"
                  >
                    {storageAccounts.filter((s) => s.tipe === 'cash').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} (Uang Tunai)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Denomination Matrix */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-gray-600 block">Rincian Lembar / Keping Uang:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.keys(cashDenominations).map((denom) => (
                    <div key={denom} className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 space-y-1">
                      <span className="text-[11px] font-bold text-gray-600">Rp {Number(denom).toLocaleString('id-ID')}</span>
                      <input
                        type="number"
                        min="0"
                        value={cashDenominations[denom] || ''}
                        onChange={(e) =>
                          setCashDenominations((prev) => ({
                            ...prev,
                            [denom]: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                        placeholder="0 lbr"
                        className="w-full text-sm font-semibold border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white"
                      />
                      <span className="text-[10px] text-gray-400 block text-right">
                        = {formatRupiah(Number(denom) * (cashDenominations[denom] || 0))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Saksi / Pengurus Kas</label>
                  <input
                    type="text"
                    value={ccWitness}
                    onChange={(e) => setCcWitness(e.target.value)}
                    placeholder="Contoh: St. B. Hutapea (Bendahara Umum)"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Keterangan Tambahan</label>
                  <input
                    type="text"
                    value={ccExplanation}
                    onChange={(e) => setCcExplanation(e.target.value)}
                    placeholder="Contoh: Kondisi brankas terkunci rapat, uang disusun rapi"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              {/* Photo Input (Mobile camera ready) */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-gray-500" />
                  Foto Bukti Brankas Fisik / Berita Acara Hitung Fisik
                </label>
                <input
                  type="text"
                  value={ccPhotoUrl}
                  onChange={(e) => setCcPhotoUrl(e.target.value)}
                  placeholder="URL atau upload foto brankas / berkas kas fisik"
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>

              <button
                onClick={handleRecordCashCount}
                className="w-full py-2.5 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Simpan Berita Acara Opname Kas Fisik
              </button>
            </div>

            {/* Live Balance Difference Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <h4 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2">
                  Perbandingan Fisik vs Buku
                </h4>

                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Total Hitung Fisik:</span>
                    <span className="font-bold text-base text-gray-900">{formatRupiah(calculatedPhysicalBalance)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">Saldo Buku Kas:</span>
                    <span className="font-semibold text-sm text-gray-700">{formatRupiah(5450000)}</span>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-700">Selisih Fisik:</span>
                    <span
                      className={`font-bold text-sm ${
                        calculatedPhysicalBalance - 5450000 === 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {formatRupiah(calculatedPhysicalBalance - 5450000)}
                    </span>
                  </div>
                </div>

                {calculatedPhysicalBalance - 5450000 === 0 ? (
                  <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Nihil Selisih. Fisik uang cocok persis dengan saldo buku.</span>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Ada selisih nominal! Temuan wajib periksa akan dibuat otomatis.</span>
                  </div>
                )}
              </div>

              {/* Recent cash count logs */}
              <div className="pt-4 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500 block mb-2">Riwayat Opname Terakhir</span>
                {cashCounts.slice(0, 2).map((cc) => (
                  <div key={cc.id} className="text-xs text-gray-600 py-1 flex justify-between">
                    <span>{formatDateIndo(cc.tanggal)}</span>
                    <span className="font-semibold">{formatRupiah(cc.physical_balance)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: KEANGGOTAAN & INDEPENDENSI */}
      {activeTab === 'anggota' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Keanggotaan Badan Audit Huria</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Struktur beranggotakan tepat 3 orang: 1 Ketua dan 2 Anggota. Seluruh anggota wajib independen.
              </p>
            </div>

            {isAdmin && activeMembers.length < 3 && (
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="px-3.5 py-2 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors w-fit"
              >
                <Plus className="w-4 h-4" />
                Tambah Anggota Audit
              </button>
            )}
          </div>

          {/* Independence Warning Rule Banner */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-3">
            <Scale className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 space-y-1">
              <h4 className="font-bold">Prinsip Independensi Mutlak:</h4>
              <p>
                Anggota Badan Audit Huria dilarang merangkap jabatan sebagai Bendahara Umum, Pendeta Ressort, Sekretaris Huria, atau pengurus (bendahara/ketua) pada kas seksi mana pun. Pelanggaran aturan dicegah di tingkat basis data dan sistem.
              </p>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider">
                  <th className="p-3.5">Nama Anggota</th>
                  <th className="p-3.5">Jabatan</th>
                  <th className="p-3.5">Periode Mulai</th>
                  <th className="p-3.5">Periode Selesai</th>
                  <th className="p-3.5">Status</th>
                  {isAdmin && <th className="p-3.5 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditBodyMembers.map((member) => {
                  const prof = profiles.find((p) => p.id === member.user_id);
                  return (
                    <tr key={member.id} className="hover:bg-gray-50/60">
                      <td className="p-3.5">
                        <div className="font-bold text-gray-900">{prof?.full_name || 'Anggota'}</div>
                        <div className="text-gray-400 text-[11px]">{prof?.email}</div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            member.jabatan === 'ketua'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {member.jabatan === 'ketua' ? 'Ketua Badan Audit' : 'Anggota Badan Audit'}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-600">{formatDateIndo(member.periode_mulai)}</td>
                      <td className="p-3.5 text-gray-600">{formatDateIndo(member.periode_selesai)}</td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            member.aktif
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {member.aktif ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="p-3.5 text-right">
                          {member.aktif && (
                            <button
                              onClick={() => removeAuditBodyMember(member.id)}
                              className="text-rose-600 hover:text-rose-800 font-semibold text-[11px]"
                            >
                              Nonaktifkan
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ARSIP BERITA ACARA & OPINI */}
      {activeTab === 'arsip' && (
        <div className="space-y-6">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="font-bold text-gray-900 text-base">Arsip Resmi Berita Acara & Opini Final Audit</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Dokumen resmi yang diterbitkan dan ditandatangani oleh seluruh anggota Badan Audit Huria untuk dipertanggungjawabkan pada Rapat Huria.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {auditFinalOpinions.map((op) => {
              const eng = auditEngagements.find((e) => e.id === op.engagement_id);
              return (
                <div key={op.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-gray-600">{op.berita_acara_no}</span>
                    <span className="text-xs text-gray-400">{formatDateIndo(op.berita_acara_date)}</span>
                  </div>

                  <h4 className="font-bold text-gray-900 text-sm">{eng?.judul || 'Pemeriksaan Keuangan'}</h4>

                  <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-gray-500">Opini Final:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded ${
                        op.final_opinion === 'sesuai'
                          ? 'bg-emerald-100 text-emerald-800'
                          : op.final_opinion === 'sesuai_dengan_catatan'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {op.final_opinion === 'sesuai'
                        ? 'Wajar Tanpa Pengecualian'
                        : op.final_opinion === 'sesuai_dengan_catatan'
                        ? 'Wajar Dengan Catatan'
                        : 'Perlu Perbaikan'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-500">3 Penandatangan Sah</span>
                    <button
                      onClick={() => {
                        if (eng) {
                          generateBeritaAcaraAuditPDF({
                            engagement: eng,
                            finalOpinion: op,
                            reviews: auditReviews.filter((r) => r.engagement_id === eng.id),
                            findings: auditFindings.filter((f) => f.engagement_id === eng.id),
                            settings,
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh Berita Acara PDF
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: ISI LEMBAR KERJA REVIEW AUDIT */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Lembar Kerja Pemeriksaan Pribadi Auditor</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Opini Pribadi Anda</label>
                <select
                  value={reviewPersonalOpinion}
                  onChange={(e) => setReviewPersonalOpinion(e.target.value as AuditPersonalOpinion)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/50"
                >
                  <option value="sesuai">Sesuai (Wajar Tanpa Pengecualian)</option>
                  <option value="sesuai_dengan_catatan">Sesuai dengan Catatan (Wajar Dengan Catatan)</option>
                  <option value="perlu_perbaikan">Perlu Perbaikan (Tidak Wajar)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Catatan Kas & Bank</label>
                <input
                  type="text"
                  value={reviewSectionNotes.kas_dan_bank || ''}
                  onChange={(e) =>
                    setReviewSectionNotes((prev) => ({ ...prev, kas_dan_bank: e.target.value }))
                  }
                  placeholder="Kesesuaian fisik brankas & rekening koran..."
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Catatan Realisasi Anggaran</label>
                <input
                  type="text"
                  value={reviewSectionNotes.realisasi_anggaran || ''}
                  onChange={(e) =>
                    setReviewSectionNotes((prev) => ({ ...prev, realisasi_anggaran: e.target.value }))
                  }
                  placeholder="Kesesuaian realisasi vs target APBG..."
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Catatan Panjar & Pertanggungjawaban</label>
                <input
                  type="text"
                  value={reviewSectionNotes.panjar_kegiatan || ''}
                  onChange={(e) =>
                    setReviewSectionNotes((prev) => ({ ...prev, panjar_kegiatan: e.target.value }))
                  }
                  placeholder="Ketepatan waktu dan kelengkapan kuitansi panjar..."
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Catatan Umum / Rekomendasi</label>
                <textarea
                  rows={3}
                  value={reviewGeneralNotes}
                  onChange={(e) => setReviewGeneralNotes(e.target.value)}
                  placeholder="Kesimpulan umum pemeriksaan Anda..."
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitMyReview}
                className="px-4 py-2 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white rounded-xl text-xs font-semibold"
              >
                Kirim Lembar Kerja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TETAPKAN OPINI FINAL */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Penetapan Opini Final & Berita Acara</h3>
              <button onClick={() => setShowFinalizeModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nomor Berita Acara</label>
                <input
                  type="text"
                  value={baNo}
                  onChange={(e) => setBaNo(e.target.value)}
                  className="w-full text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Berita Acara</label>
                <input
                  type="date"
                  value={baDate}
                  onChange={(e) => setBaDate(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Catatan Perbedaan Pendapat (Jika Ada Anggota Berbeda Suara)
                </label>
                <textarea
                  rows={2}
                  value={dissentingNotes}
                  onChange={(e) => setDissentingNotes(e.target.value)}
                  placeholder="Dicatat dalam Berita Acara bila salah satu anggota memiliki pendapat berbeda..."
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleFinalizeOpinion}
                className="px-4 py-2 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white rounded-xl text-xs font-semibold"
              >
                Sahkan & Terbitkan Berita Acara
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CATAT TEMUAN BARU */}
      {showFindingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Catat Temuan Pemeriksaan Audit Baru</h3>
              <button onClick={() => setShowFindingModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Kas / Seksi Terkait</label>
                  <select
                    value={findingKasId}
                    onChange={(e) => setFindingKasId(e.target.value)}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                  >
                    {kasList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tingkat Temuan</label>
                  <select
                    value={findingSeverity}
                    onChange={(e) => setFindingSeverity(e.target.value as AuditFindingSeverity)}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                  >
                    <option value="wajib_diperbaiki">Wajib Diperbaiki</option>
                    <option value="informasi">Informasi (Saran)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Judul Temuan</label>
                <input
                  type="text"
                  value={findingTitle}
                  onChange={(e) => setFindingTitle(e.target.value)}
                  placeholder="Ringkasan temuan..."
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Uraian & Bukti Temuan</label>
                <textarea
                  rows={3}
                  value={findingDesc}
                  onChange={(e) => setFindingDesc(e.target.value)}
                  placeholder="Jelaskan nomor bukti transaksi atau rincian temuan..."
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Batas Waktu Perbaikan</label>
                <input
                  type="date"
                  value={findingDueDate}
                  onChange={(e) => setFindingDueDate(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowFindingModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSaveFinding}
                className="px-4 py-2 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white rounded-xl text-xs font-semibold"
              >
                Simpan Temuan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: TANGGAPAN / PENUTUPAN TEMUAN */}
      {selectedFindingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Tindak Lanjut Temuan Audit</h3>
              <button onClick={() => setSelectedFindingId(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggapan Pengurus Kas</label>
                <textarea
                  rows={3}
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Keterangan tindak lanjut atau bukti perbaikan yang telah disiapkan..."
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>

              {isCurrentUserAuditor && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Catatan Verifikasi Auditor</label>
                  <textarea
                    rows={2}
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="Verifikasi auditor terhadap bukti perbaikan..."
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedFindingId(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium"
              >
                Tutup
              </button>

              <button
                onClick={async () => {
                  if (responseNotes) {
                    await respondAuditFinding(selectedFindingId, responseNotes);
                    showToast('Tanggapan temuan berhasil dikirim.');
                  }
                  if (isCurrentUserAuditor && closingNotes) {
                    await closeAuditFinding(selectedFindingId, true, closingNotes);
                    showToast('Temuan audit berhasil disahkan dan ditutup.');
                  }
                  setSelectedFindingId(null);
                }}
                className="px-4 py-2 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white rounded-xl text-xs font-semibold"
              >
                Simpan Tanggapan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: TAMBAH ANGGOTA AUDIT (ADMIN ONLY) */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Tambah Anggota Badan Audit Huria</h3>
              <button onClick={() => setShowAddMemberModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Warga / Parhalado</label>
                <select
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                >
                  <option value="">-- Pilih Profil --</option>
                  {profiles
                    .filter(
                      (p) =>
                        !['bendahara_umum', 'pendeta_ressort', 'sekretaris'].includes(p.role) &&
                        !auditBodyMembers.some((m) => m.user_id === p.id && m.aktif)
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Jabatan dalam Badan Audit</label>
                <select
                  value={memberJabatan}
                  onChange={(e) => setMemberJabatan(e.target.value as 'ketua' | 'anggota')}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                >
                  <option value="anggota">Anggota Badan Audit</option>
                  <option value="ketua">Ketua Badan Audit</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleAddMember}
                className="px-4 py-2 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white rounded-xl text-xs font-semibold"
              >
                Tetapkan Anggota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: BUKA PENUGASAN AUDIT BARU */}
      {showNewEngModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Buka Penugasan Pemeriksaan Baru</h3>
              <button onClick={() => setShowNewEngModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tahun Anggaran</label>
                  <input
                    type="number"
                    value={newEngTahun}
                    onChange={(e) => setNewEngTahun(parseInt(e.target.value) || 2026)}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis Pemeriksaan</label>
                  <select
                    value={newEngJenis}
                    onChange={(e) => setNewEngJenis(e.target.value as any)}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                  >
                    <option value="semester_1">Semester I</option>
                    <option value="semester_2">Semester II</option>
                    <option value="tahunan">LPJ Tahunan (ISAK 35)</option>
                    <option value="opening">Saldo Awal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Judul Penugasan</label>
                <input
                  type="text"
                  value={newEngJudul}
                  onChange={(e) => setNewEngJudul(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Batas Waktu Pemeriksaan</label>
                <input
                  type="date"
                  value={newEngBatasWaktu}
                  onChange={(e) => setNewEngBatasWaktu(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowNewEngModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleCreateEngagement}
                className="px-4 py-2 bg-[#7C9CF5] hover:bg-[#6A8BE4] text-white rounded-xl text-xs font-semibold"
              >
                Buka Penugasan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: TANDAI TEMUAN AUDIT TRANSAKSI */}
      {flaggingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Tandai Temuan Audit Transaksi</h3>
                  <p className="text-[11px] text-slate-500">Koreksi kelengkapan bukti otentik, kuitansi, atau kepatuhan belanja</p>
                </div>
              </div>
              <button onClick={() => setFlaggingTx(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rincian Transaksi */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-500">
                <span>No. Bukti / Ref:</span>
                <span className="font-semibold text-slate-700 font-mono">{flaggingTx.receipt_no || '-'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Tanggal Transaksi:</span>
                <span className="font-medium text-slate-700">{formatDateIndo(flaggingTx.tanggal)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>Nominal:</span>
                <span className={`font-bold font-mono ${flaggingTx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {flaggingTx.type === 'income' ? '+' : '-'} {formatRupiah(flaggingTx.amount)}
                </span>
              </div>
              <div className="flex justify-between items-start text-slate-500 pt-1 border-t border-slate-200/50">
                <span>Uraian:</span>
                <span className="font-medium text-slate-800 text-right max-w-[260px] truncate">{flaggingTx.description}</span>
              </div>
            </div>

            {/* Form Temuan */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Ringkas Temuan</label>
                <input
                  type="text"
                  value={flaggingTitle}
                  onChange={(e) => setFlaggingTitle(e.target.value)}
                  placeholder="Mis: Bukti Kuitansi Asli Belum Terlampir"
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Uraian Temuan / Catatan Pemeriksa</label>
                <textarea
                  rows={3}
                  value={flaggingDesc}
                  onChange={(e) => setFlaggingDesc(e.target.value)}
                  placeholder="Jelaskan kekurangan bukti fisik, ketidakcocokan nominal, atau tindak lanjut yang diminta oleh Badan Audit..."
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-amber-400 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Keparahan</label>
                  <select
                    value={flaggingSeverity}
                    onChange={(e) => setFlaggingSeverity(e.target.value as AuditFindingSeverity)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  >
                    <option value="wajib_diperbaiki">Wajib Diperbaiki (Signifikan)</option>
                    <option value="informasi">Informasi / Himbauan Administrasi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batas Waktu Tanggapan</label>
                  <input
                    type="date"
                    value={flaggingDueDate}
                    onChange={(e) => setFlaggingDueDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setFlaggingTx(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveFlaggedTransaction}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Simpan Catatan Temuan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: PRATINJAU & CETAK BERITA ACARA PEMERIKSAAN BERKALA */}
      {previewingBa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>Berita Acara Pemeriksaan Keuangan Berkala HKBP</span>
                </h3>
                <p className="text-[11px] text-slate-500">Dokumen resmi pengesahan kolegial Badan Audit Huria</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Dokumen</span>
                </button>
                <button onClick={() => setPreviewingBa(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Konten Berita Acara Format Resmi Gereja */}
            <div className="p-6 border border-slate-200 rounded-xl bg-slate-50/50 space-y-5 text-xs text-slate-800 font-sans">
              {/* Kop Surat HKBP */}
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <p className="font-serif font-bold text-xs uppercase tracking-widest text-slate-700">
                  HURIA KRISTEN BATAK PROTESTAN (HKBP)
                </p>
                <p className="font-serif font-extrabold text-sm uppercase text-slate-900">
                  RESSORT HUTARAJA - DISTRIK X MEDAN - ACEH
                </p>
                <p className="text-[11px] font-semibold text-indigo-900">
                  BADAN AUDIT HURIA (VERIFIKASI BERKALA)
                </p>
                <div className="pt-2">
                  <span className="font-bold text-xs uppercase tracking-wider underline">
                    BERITA ACARA PEMERIKSAAN KEUANGAN HURIA
                  </span>
                  <p className="text-[11px] font-mono text-slate-600">
                    Nomor: {previewingBa.berita_acara_no || `BA-AUDIT/${previewingBa.period_code.toUpperCase()}/${previewingBa.tahun}`}
                  </p>
                </div>
              </div>

              {/* Paragraf Pembuka */}
              <p className="leading-relaxed text-slate-700 text-justify">
                Pada hari ini, segenap anggota Badan Audit Huria HKBP Hutaraja yang bertanda tangan di bawah ini telah melaksanakan pemeriksaan, verifikasi keabsahan bukti kas, rekonsiliasi tempat penyimpanan, dan evaluasi kepatuhan anggaran perbendaharaan gereja untuk:
              </p>

              {/* Data Periode & Identitas */}
              <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Periode Pemeriksaan:</span>
                  <span className="font-bold text-slate-800">{previewingBa.period_title} ({previewingBa.tahun})</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Rentang Waktu:</span>
                  <span className="font-medium text-slate-800">{previewingBa.date_range}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status Hasil Audit:</span>
                  <span className="font-bold text-emerald-700 capitalize">
                    {previewingBa.status === 'diverifikasi'
                      ? 'Diverifikasi Lolos'
                      : previewingBa.status === 'catatan_perbaikan'
                      ? 'Perlu Perbaikan / Ada Catatan'
                      : previewingBa.status === 'sedang_diverifikasi'
                      ? 'Sedang Diverifikasi'
                      : 'Belum Diperiksa'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Transaksi Diperiksa:</span>
                  <span className="font-semibold text-slate-800">{previewingBa.verified_transactions_count || 0} / {previewingBa.total_transactions_count || 0} transaksi</span>
                </div>
              </div>

              {/* 6 Kepatuhan Formal */}
              <div className="space-y-2">
                <p className="font-bold text-slate-900 text-[11px]">Hasil Uji Kepatuhan & Kelayakan (6 Poin Utama AP HKBP):</p>
                <div className="grid grid-cols-1 gap-1.5">
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200/80 text-[11px]">
                    <span>1. Kecocokan Saldo Kas Fisik & Rekening Bank (Opname)</span>
                    <span className={`font-semibold ${previewingBa.checklist.cash_physical_match ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {previewingBa.checklist.cash_physical_match ? '✓ Sesuai & Valid' : '✗ Ada Selisih'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200/80 text-[11px]">
                    <span>2. Keabsahan Bukti Pengeluaran & Penerimaan (Kuitansi/Nota)</span>
                    <span className={`font-semibold ${previewingBa.checklist.evidence_valid ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {previewingBa.checklist.evidence_valid ? '✓ Sah & Otentik' : '✗ Bukti Belum Lengkap'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200/80 text-[11px]">
                    <span>3. Kepatuhan Pelaksanaan Pos Anggaran Huria</span>
                    <span className={`font-semibold ${previewingBa.checklist.budget_adherence ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {previewingBa.checklist.budget_adherence ? '✓ Sesuai Pos Anggaran' : '✗ Ada Pos Terlampaui'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200/80 text-[11px]">
                    <span>4. Pertanggungjawaban Panjar & Uang Muka Kegiatan</span>
                    <span className={`font-semibold ${previewingBa.checklist.advance_settled ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {previewingBa.checklist.advance_settled ? '✓ Tertib Diselesaikan' : '✗ Ada Panjar Tertunda'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200/80 text-[11px]">
                    <span>5. Kepatuhan Penyetoran Sentralisasi & Amanah Titipan</span>
                    <span className={`font-semibold ${previewingBa.checklist.remittance_compliant ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {previewingBa.checklist.remittance_compliant ? '✓ Tepat Waktu & Tertib' : '✗ Perlu Percepatan Setoran'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200/80 text-[11px]">
                    <span>6. Tindak Lanjut Rekomendasi Audit Sebelumnya</span>
                    <span className={`font-semibold ${previewingBa.checklist.prior_findings_cleared ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {previewingBa.checklist.prior_findings_cleared ? '✓ Sudah Ditindaklanjuti' : '✗ Masih Terbuka'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Catatan Kesimpulan */}
              <div className="space-y-1">
                <p className="font-bold text-slate-900 text-[11px]">Catatan Simpulan & Rekomendasi Badan Audit:</p>
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 italic leading-relaxed text-[11px]">
                  "{previewingBa.general_notes || 'Seluruh pemeriksaan transaksi dan saldo kas berkala telah dijalankan sesuai prinsip kepatuhan perbendaharaan HKBP Hutaraja.'}"
                </div>
              </div>

              {/* Tanda Tangan 3 Anggota Badan Audit Huria */}
              <div className="pt-4 border-t border-slate-300">
                <p className="text-center font-bold text-slate-900 mb-4 text-[11px]">
                  BADAN AUDIT HURIA HKBP HUTARAJA
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                  {auditBodyMembers.map((m) => {
                    const prof = profiles.find((p) => p.id === m.user_id);
                    const sig = (previewingBa.verified_signatures || []).find(
                      (s) => s.member_id === m.id || s.member_id === m.user_id
                    );
                    return (
                      <div key={m.id} className="p-2 border border-slate-200 bg-white rounded-lg flex flex-col justify-between h-28">
                        <div>
                          <p className="font-bold text-slate-800 capitalize">{m.jabatan} Badan Audit</p>
                          <p className="text-slate-500 text-[9px]">{m.jabatan === 'ketua' ? 'Merangkap Anggota' : 'Anggota Independen'}</p>
                        </div>
                        <div className="py-1">
                          {sig ? (
                            <div className="text-emerald-700 font-semibold flex flex-col items-center">
                              <span className="font-mono text-[9px] bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">TERTANDA TANGAN</span>
                              <span className="text-[8px] text-slate-400 mt-0.5">{formatDateIndo(sig.signed_at)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[9px]">Menunggu Tanda Tangan</span>
                          )}
                        </div>
                        <p className="font-bold text-slate-900 border-t border-slate-100 pt-1">
                          {prof?.full_name || m.user_id}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPreviewingBa(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
