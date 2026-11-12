/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FolderArchive,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  DollarSign,
  User,
  Phone,
  FileText,
  Upload,
  Camera,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  CreditCard,
  Edit2,
  Trash2,
  Info,
  HelpCircle,
  TrendingDown,
  RotateCcw,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  FixedAsset,
  FixedAssetCategory,
  FixedAssetCondition,
  FixedAssetStatus,
  Advance,
  AdvanceStatus,
  AdvanceSettlement,
  ReceivablePayable,
  ReceivablePayableType,
  ReceivablePayableStatus,
  FundType,
} from '../types/database';
import { formatRupiah, formatDateIndo } from '../lib/formatters';
import { exportToExcel } from '../lib/exportUtils';

export default function LpjDataPage() {
  const { currentUser, isAdmin, isBendaharaUmum, isLeader, canInputKas, canApproveKas } = useAuth();
  const {
    kasList,
    storageAccounts,
    transactions,
    fixedAssets,
    advances,
    advanceSettlements,
    receivablesPayables,
    lpjNotes,
    lpjSettings,
    saveFixedAsset,
    deleteFixedAsset,
    proposeAssetDisposal,
    approveAssetDisposal,
    calculateDepreciation,
    saveAdvance,
    deleteAdvance,
    saveAdvanceSettlement,
    submitAdvanceSettlement,
    approveAdvanceSettlement,
    saveReceivablePayable,
    deleteReceivablePayable,
    recordReceivablePayablePayment,
    saveLpjNotes,
    updateLpjSettings,
    updateKasFundType,
    openingOtherPositions,
    migrateOpeningPositionsToLpj,
  } = useData();

  const [activeTab, setActiveTab] = useState<'assets' | 'advances' | 'receivables' | 'calk' | 'settings'>('assets');
  const [selectedKasFilter, setSelectedKasFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ---------------- Asset Modals ----------------
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Partial<FixedAsset> | null>(null);
  const [disposalModalAsset, setDisposalModalAsset] = useState<FixedAsset | null>(null);
  const [disposalActionType, setDisposalActionType] = useState<'diajukan_penghapusan' | 'diajukan_hibah'>('diajukan_penghapusan');
  const [disposalReasonInput, setDisposalReasonInput] = useState('');

  // ---------------- Advance Modals ----------------
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<Partial<Advance> | null>(null);
  const [settlementModalAdvance, setSettlementModalAdvance] = useState<Advance | null>(null);
  const [settlementSpentInput, setSettlementSpentInput] = useState<string>('');
  const [settlementNotesInput, setSettlementNotesInput] = useState<string>('');
  const [settlementReceiptUrl, setSettlementReceiptUrl] = useState<string>('');

  // ---------------- Receivables/Payables Modals ----------------
  const [isRpModalOpen, setIsRpModalOpen] = useState(false);
  const [editingRp, setEditingRp] = useState<Partial<ReceivablePayable> | null>(null);
  const [paymentModalRp, setPaymentModalRp] = useState<ReceivablePayable | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [paymentDateInput, setPaymentDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentStorageId, setPaymentStorageId] = useState<string>('');
  const [paymentNotesInput, setPaymentNotesInput] = useState<string>('');

  // ---------------- CaLK Form State ----------------
  const [calkForm, setCalkForm] = useState(lpjNotes);
  const [calkSavedToast, setCalkSavedToast] = useState(false);

  // ---------------- Check Overdue Advances ----------------
  const todayStr = new Date().toISOString().split('T')[0];
  const overdueAdvances = advances.filter(
    (a) => a.status === 'active' && a.due_date < todayStr
  );

  // ---------------- Filtered Data ----------------
  const filteredAssets = useMemo(() => {
    return fixedAssets.filter((a) => {
      const matchKas = selectedKasFilter === 'all' || a.kas_id === selectedKasFilter;
      const matchSearch =
        a.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.kode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.lokasi.toLowerCase().includes(searchQuery.toLowerCase());
      return matchKas && matchSearch;
    });
  }, [fixedAssets, selectedKasFilter, searchQuery]);

  const filteredAdvances = useMemo(() => {
    return advances.filter((a) => {
      const matchKas = selectedKasFilter === 'all' || a.kas_id === selectedKasFilter;
      const matchSearch =
        a.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.kode.toLowerCase().includes(searchQuery.toLowerCase());
      return matchKas && matchSearch;
    });
  }, [advances, selectedKasFilter, searchQuery]);

  const filteredRp = useMemo(() => {
    return receivablesPayables.filter((rp) => {
      const matchKas = selectedKasFilter === 'all' || rp.kas_id === selectedKasFilter;
      const matchSearch =
        rp.counterparty_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rp.kode.toLowerCase().includes(searchQuery.toLowerCase());
      return matchKas && matchSearch;
    });
  }, [receivablesPayables, selectedKasFilter, searchQuery]);

  // ---------------- Metrics ----------------
  const totalNilaiPerolehanAset = fixedAssets
    .filter((a) => a.status === 'aktif')
    .reduce((sum, a) => sum + Number(a.nilai_perolehan), 0);

  const totalNilaiBukuAset = fixedAssets
    .filter((a) => a.status === 'aktif')
    .reduce((sum, a) => sum + calculateDepreciation(a, 2026).bookValue, 0);

  const totalPanjarAktif = advances
    .filter((a) => a.status !== 'settled')
    .reduce((sum, a) => sum + Number(a.amount), 0);

  const totalPiutangAktif = receivablesPayables
    .filter((rp) => rp.type === 'receivable' && rp.status !== 'paid')
    .reduce((sum, rp) => sum + Number(rp.remaining_amount), 0);

  const totalUtangAktif = receivablesPayables
    .filter((rp) => rp.type === 'payable' && rp.status !== 'paid')
    .reduce((sum, rp) => sum + Number(rp.remaining_amount), 0);

  // Unmigrated items from opening_other_positions
  const unmigratedCount = openingOtherPositions.filter((pos) => {
    if (pos.type === 'asset') return !fixedAssets.some((a) => a.nama.toLowerCase() === pos.name.toLowerCase());
    if (pos.type === 'advance') return !advances.some((a) => a.purpose.toLowerCase() === pos.name.toLowerCase());
    if (pos.type === 'receivable' || pos.type === 'payable')
      return !receivablesPayables.some((r) => r.description.toLowerCase() === pos.name.toLowerCase());
    return false;
  }).length;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto min-w-0 overflow-hidden">
      {/* ---------------- Header Banner ---------------- */}
      <div className="bg-gradient-to-r from-white via-indigo-50/40 to-purple-50/30 p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
            <FolderArchive className="w-4 h-4" />
            <span>Basis Kas yang Dimodifikasi (Modified Cash Basis) · Standar ISAK 35</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Data Pendukung Laporan Pertanggungjawaban (LPJ)
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Kelola inventaris aset tetap, panjar kegiatan berjalan, piutang, utang, klasifikasi dana terikat, dan CaLK HKBP Ressort Hutaraja.
          </p>
        </div>

        {unmigratedCount > 0 && (
          <button
            onClick={async () => {
              const res = await migrateOpeningPositionsToLpj();
              if (res.success && res.count) {
                alert(
                  `Berhasil memigrasikan ${res.count.assets} aset, ${res.count.advances} panjar, dan ${res.count.rp} piutang/utang dari modul Saldo Awal.`
                );
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-primary text-white text-xs font-semibold rounded-xl shadow-xs hover:opacity-95 transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Sinkronkan {unmigratedCount} Data dari Saldo Awal</span>
          </button>
        )}
      </div>

      {/* ---------------- Overdue Advances Banner Alert ---------------- */}
      {overdueAdvances.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-300 p-4 rounded-2xl flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900">
                Perhatian: Terdapat {overdueAdvances.length} Panjar Kegiatan Melewati Batas Waktu SPJ
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Panjar yang jatuh tempo wajib segera dipertanggungjawabkan dengan rincian realisasi belanja atau pengembalian sisa dana ke kas. Panjar belum selesai dilaporkan sebagai piutang sementara pada LPJ.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('advances')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shrink-0"
          >
            Periksa Panjar
          </button>
        </div>
      )}

      {/* ---------------- Top Metrics Summary ---------------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-purple card-hover p-4 rounded-2xl border-t-4 border-t-purple-500 shadow-2xs transition-all">
          <div className="text-xs font-semibold text-purple-900/80 flex items-center justify-between">
            <span>Aset Tetap (Historis)</span>
            <Package className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg md:text-xl font-black text-purple-950 mt-1 tabular-nums tracking-tight">
            {formatRupiah(totalNilaiPerolehanAset)}
          </div>
          <div className="text-[11px] font-medium text-purple-800/70 mt-0.5">
            {fixedAssets.filter((a) => a.status === 'aktif').length} unit aktif
            {lpjSettings.enable_depreciation && ` · Buku: ${formatRupiah(totalNilaiBukuAset)}`}
          </div>
        </div>

        <div className="card-amber card-hover p-4 rounded-2xl border-t-4 border-t-amber-500 shadow-2xs transition-all">
          <div className="text-xs font-semibold text-amber-900/80 flex items-center justify-between">
            <span>Panjar Berjalan</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg md:text-xl font-black text-amber-950 mt-1 tabular-nums tracking-tight">
            {formatRupiah(totalPanjarAktif)}
          </div>
          <div className="text-[11px] font-medium text-amber-800/70 mt-0.5">
            {advances.filter((a) => a.status === 'active').length} panjar belum SPJ
            {overdueAdvances.length > 0 && <span className="text-rose-600 font-bold ml-1">({overdueAdvances.length} overdue)</span>}
          </div>
        </div>

        <div className="card-emerald card-hover p-4 rounded-2xl border-t-4 border-t-emerald-500 shadow-2xs transition-all">
          <div className="text-xs font-semibold text-emerald-900/80 flex items-center justify-between">
            <span>Piutang Jemaat / Pihak Ke-3</span>
            <TrendingDown className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg md:text-xl font-black text-emerald-950 mt-1 tabular-nums tracking-tight">
            {formatRupiah(totalPiutangAktif)}
          </div>
          <div className="text-[11px] font-medium text-emerald-800/70 mt-0.5">
            {receivablesPayables.filter((r) => r.type === 'receivable' && r.status !== 'paid').length} tagihan belum lunas
          </div>
        </div>

        <div className="card-rose card-hover p-4 rounded-2xl border-t-4 border-t-rose-500 shadow-2xs transition-all">
          <div className="text-xs font-semibold text-rose-900/80 flex items-center justify-between">
            <span>Kewajiban / Utang Kas</span>
            <CreditCard className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-lg md:text-xl font-black text-rose-950 mt-1 tabular-nums tracking-tight">
            {formatRupiah(totalUtangAktif)}
          </div>
          <div className="text-[11px] font-medium text-rose-800/70 mt-0.5">
            {receivablesPayables.filter((r) => r.type === 'payable' && r.status !== 'paid').length} kewajiban berjalan
          </div>
        </div>
      </div>

      {/* ---------------- Navigation Tabs ---------------- */}
      <div className="flex border-b border-slate-200 space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('assets')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'assets'
              ? 'bg-white border-t-2 border-primary text-primary shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Inventaris & Aset Tetap</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
            {fixedAssets.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('advances')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'advances'
              ? 'bg-white border-t-2 border-primary text-primary shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Panjar / Uang Muka Kegiatan</span>
          {overdueAdvances.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          )}
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
            {advances.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('receivables')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'receivables'
              ? 'bg-white border-t-2 border-primary text-primary shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Piutang & Utang</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
            {receivablesPayables.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('calk')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'calk'
              ? 'bg-white border-t-2 border-primary text-primary shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Catatan Laporan Keuangan (CaLK)</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-white border-t-2 border-primary text-primary shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Pengaturan LPJ & Klasifikasi Dana</span>
        </button>
      </div>

      {/* ---------------- Filter & Search Toolbar (Tabs 1-3) ---------------- */}
      {['assets', 'advances', 'receivables'].includes(activeTab) && (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode, nama, pihak..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-primary"
              />
            </div>

            <select
              value={selectedKasFilter}
              onChange={(e) => setSelectedKasFilter(e.target.value)}
              className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            >
              <option value="all">Semua Kas Seksi</option>
              {kasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama} ({k.kode})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            {activeTab === 'assets' && (
              <>
                <button
                  onClick={() => {
                    const exportData = filteredAssets.map((a) => {
                      const kas = kasList.find((k) => k.id === a.kas_id);
                      const dep = calculateDepreciation(a, 2026);
                      return {
                        Kode: a.kode,
                        Nama: a.nama,
                        Kategori: a.kategori,
                        Kas: kas?.nama || a.kas_id,
                        'Tanggal Perolehan': a.tanggal_perolehan,
                        'Nilai Perolehan (Rp)': a.nilai_perolehan,
                        Kondisi: a.kondisi,
                        Lokasi: a.lokasi,
                        'Masa Manfaat (Thn)': a.useful_life_years,
                        'Penyusutan Tahunan (Rp)': dep.annualDepreciation,
                        'Akumulasi Penyusutan (Rp)': dep.accumulatedDepreciation,
                        'Nilai Buku (Rp)': dep.bookValue,
                        Status: a.status,
                        Catatan: a.notes || '',
                      };
                    });
                    exportToExcel(exportData, 'Daftar_Aset_Tetap_HKBP_Hutaraja', 'Aset Tetap');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Excel</span>
                </button>
                <button
                  onClick={() => {
                    setEditingAsset({
                      kategori: 'elektronik',
                      kondisi: 'baik',
                      status: 'aktif',
                      tanggal_perolehan: new Date().toISOString().split('T')[0],
                      useful_life_years: 5,
                      salvage_value: 0,
                      kas_id: kasList[0]?.id,
                    });
                    setIsAssetModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Aset</span>
                </button>
              </>
            )}

            {activeTab === 'advances' && (
              <>
                <button
                  onClick={() => {
                    const exportData = filteredAdvances.map((adv) => {
                      const kas = kasList.find((k) => k.id === adv.kas_id);
                      return {
                        Kode: adv.kode,
                        Kas: kas?.nama || adv.kas_id,
                        Penerima: adv.recipient_name,
                        Telepon: adv.recipient_phone || '-',
                        'Nominal (Rp)': adv.amount,
                        'Tanggal Panjar': adv.advance_date,
                        'Jatuh Tempo SPJ': adv.due_date,
                        Tujuan: adv.purpose,
                        Status: adv.status,
                      };
                    });
                    exportToExcel(exportData, 'Daftar_Panjar_Kegiatan_HKBP_Hutaraja', 'Panjar Kegiatan');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Excel</span>
                </button>
                <button
                  onClick={() => {
                    const due = new Date();
                    due.setDate(due.getDate() + (lpjSettings.default_advance_days || 14));
                    setEditingAdvance({
                      advance_date: new Date().toISOString().split('T')[0],
                      due_date: due.toISOString().split('T')[0],
                      kas_id: kasList[0]?.id,
                    });
                    setIsAdvanceModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Catat Panjar</span>
                </button>
              </>
            )}

            {activeTab === 'receivables' && (
              <>
                <button
                  onClick={() => {
                    const exportData = filteredRp.map((rp) => {
                      const kas = kasList.find((k) => k.id === rp.kas_id);
                      return {
                        Tipe: rp.type === 'receivable' ? 'Piutang' : 'Utang',
                        Kode: rp.kode,
                        Kas: kas?.nama || rp.kas_id,
                        'Pihak Terkait': rp.counterparty_name,
                        Kontak: rp.counterparty_contact || '-',
                        'Nominal Pokok (Rp)': rp.amount,
                        'Sisa Saldo (Rp)': rp.remaining_amount,
                        'Tanggal Timbul': rp.issue_date,
                        'Jatuh Tempo': rp.due_date || '-',
                        Status: rp.status,
                        Uraian: rp.description,
                      };
                    });
                    exportToExcel(exportData, 'Daftar_Piutang_Utang_HKBP_Hutaraja', 'Piutang & Utang');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Excel</span>
                </button>
                <button
                  onClick={() => {
                    setEditingRp({
                      type: 'receivable',
                      issue_date: new Date().toISOString().split('T')[0],
                      kas_id: kasList[0]?.id,
                    });
                    setIsRpModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Catat Piutang/Utang</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---------------- TAB 1: INVENTARIS & ASET TETAP ---------------- */}
      {activeTab === 'assets' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Kode & Nama Aset</th>
                  <th className="py-3 px-4">Kategori & Lokasi</th>
                  <th className="py-3 px-4">Kas Pengelola</th>
                  <th className="py-3 px-4 text-right">Nilai Perolehan</th>
                  {lpjSettings.enable_depreciation && (
                    <th className="py-3 px-4 text-right">Nilai Buku (2026)</th>
                  )}
                  <th className="py-3 px-4 text-center">Kondisi</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Tidak ada data aset tetap yang sesuai dengan pencarian atau filter.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const kas = kasList.find((k) => k.id === asset.kas_id);
                    const dep = calculateDepreciation(asset, 2026);
                    const isPendingApproval =
                      asset.status === 'diajukan_penghapusan' || asset.status === 'diajukan_hibah';
                    const canUserApprove = canApproveKas(asset.kas_id) || isLeader || isAdmin;

                    return (
                      <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{asset.nama}</div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {asset.kode} · Thn {asset.tanggal_perolehan.substring(0, 4)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize font-medium text-slate-700 block">
                            {asset.kategori.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-slate-400">{asset.lokasi}</span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                            style={{
                              backgroundColor: `${kas?.warna || '#7C9CF5'}25`,
                              color: '#1F2440',
                            }}
                          >
                            {kas?.nama || 'Kas Huria'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 tabular-nums">
                          {formatRupiah(asset.nilai_perolehan)}
                        </td>
                        {lpjSettings.enable_depreciation && (
                          <td className="py-3 px-4 text-right font-mono font-bold text-indigo-700 tabular-nums">
                            {formatRupiah(dep.bookValue)}
                          </td>
                        )}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              asset.kondisi === 'baik'
                                ? 'bg-emerald-100 text-emerald-800'
                                : asset.kondisi === 'rusak_ringan'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {asset.kondisi.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              asset.status === 'aktif'
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPendingApproval
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {asset.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap space-x-1">
                          {isPendingApproval ? (
                            canUserApprove ? (
                              <button
                                onClick={() => {
                                  const ans = window.confirm(
                                    `Setujui pengusulan ${asset.status.replace('_', ' ')} untuk aset "${asset.nama}"?`
                                  );
                                  if (ans) {
                                    approveAssetDisposal(asset.id, true, 'Disetujui Ketua Kas');
                                  } else {
                                    const rejectAns = window.confirm('Tolak pengusulan dan kembalikan ke status aktif?');
                                    if (rejectAns) approveAssetDisposal(asset.id, false, 'Ditolak');
                                  }
                                }}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg"
                              >
                                Review Ketua
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400">Menunggu Ketua</span>
                            )
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingAsset(asset);
                                  setIsAssetModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit Aset"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {asset.status === 'aktif' && (
                                <button
                                  onClick={() => {
                                    setDisposalModalAsset(asset);
                                    setDisposalReasonInput('');
                                  }}
                                  className="px-2 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Ajukan Penghapusan / Hibah"
                                >
                                  Hapus/Hibah
                                </button>
                              )}
                            </>
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
      )}

      {/* ---------------- TAB 2: PANJAR / UANG MUKA KEGIATAN ---------------- */}
      {activeTab === 'advances' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Kode & Kegiatan</th>
                  <th className="py-3 px-4">Kas Pengelola</th>
                  <th className="py-3 px-4">Penerima Panjar</th>
                  <th className="py-3 px-4 text-right">Nominal Panjar</th>
                  <th className="py-3 px-4">Tgl Pencairan</th>
                  <th className="py-3 px-4">Batas Waktu (Due)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi / Pertanggungjawaban</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdvances.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Belum ada catatan panjar kegiatan.
                    </td>
                  </tr>
                ) : (
                  filteredAdvances.map((adv) => {
                    const kas = kasList.find((k) => k.id === adv.kas_id);
                    const isOverdue = adv.status === 'active' && adv.due_date < todayStr;
                    const st = advanceSettlements.find((s) => s.advance_id === adv.id);
                    const canUserApprove = canApproveKas(adv.kas_id) || isLeader || isAdmin;

                    return (
                      <tr key={adv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{adv.purpose}</div>
                          <div className="text-[11px] font-mono text-slate-400">{adv.kode}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                            style={{
                              backgroundColor: `${kas?.warna || '#7C9CF5'}25`,
                              color: '#1F2440',
                            }}
                          >
                            {kas?.nama}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{adv.recipient_name}</div>
                          {adv.recipient_phone && (
                            <span className="text-[10px] text-slate-400">{adv.recipient_phone}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatRupiah(adv.amount)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {formatDateIndo(adv.advance_date)}
                        </td>
                        <td className="py-3 px-4 font-mono whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                              isOverdue
                                ? 'bg-rose-100 text-rose-800 font-bold'
                                : 'text-slate-600'
                            }`}
                          >
                            {formatDateIndo(adv.due_date)}
                            {isOverdue && ' (Lewat)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              adv.status === 'settled'
                                ? 'bg-emerald-100 text-emerald-800'
                                : isOverdue
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {adv.status === 'settled' ? 'Selesai' : isOverdue ? 'Jatuh Tempo' : 'Berjalan'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap space-x-1">
                          {adv.status === 'settled' ? (
                            <span className="text-[11px] text-emerald-700 font-medium flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> SPJ Tuntas
                            </span>
                          ) : st && st.status === 'submitted' ? (
                            canUserApprove ? (
                              <button
                                onClick={async () => {
                                  const ans = window.confirm(
                                    `Setujui SPJ Panjar "${adv.purpose}" (Belanja: ${formatRupiah(st.spent_amount)})?`
                                  );
                                  if (ans) {
                                    const res = await approveAdvanceSettlement(st.id, true);
                                    if (!res.success) alert(res.error);
                                  } else {
                                    const rejectNote = window.prompt('Masukkan catatan penolakan kuitansi:');
                                    if (rejectNote) {
                                      await approveAdvanceSettlement(st.id, false, rejectNote);
                                    }
                                  }
                                }}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-lg"
                              >
                                Verifikasi SPJ Ketua
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">Menunggu Ketua</span>
                            )
                          ) : (
                            <button
                              onClick={() => {
                                setSettlementModalAdvance(adv);
                                setSettlementSpentInput(st ? String(st.spent_amount) : String(adv.amount));
                                setSettlementNotesInput(st ? st.notes : '');
                                setSettlementReceiptUrl(st?.receipt_url || '');
                              }}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors"
                            >
                              Buat SPJ Realisasi
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
      )}

      {/* ---------------- TAB 3: PIUTANG & UTANG ---------------- */}
      {activeTab === 'receivables' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Tipe & Kode</th>
                  <th className="py-3 px-4">Pihak Terkait</th>
                  <th className="py-3 px-4">Kas Pengelola</th>
                  <th className="py-3 px-4">Uraian Transaksi</th>
                  <th className="py-3 px-4 text-right">Nominal Pokok</th>
                  <th className="py-3 px-4 text-right">Sisa Saldo</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi / Pelunasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRp.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Belum ada catatan piutang maupun utang.
                    </td>
                  </tr>
                ) : (
                  filteredRp.map((rp) => {
                    const kas = kasList.find((k) => k.id === rp.kas_id);
                    const isRec = rp.type === 'receivable';

                    return (
                      <tr key={rp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              isRec ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isRec ? 'Piutang' : 'Utang'}
                          </span>
                          <span className="block font-mono text-[11px] text-slate-400 mt-0.5">
                            {rp.kode}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{rp.counterparty_name}</div>
                          {rp.counterparty_contact && (
                            <span className="text-[10px] text-slate-400">{rp.counterparty_contact}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                            style={{
                              backgroundColor: `${kas?.warna || '#7C9CF5'}25`,
                              color: '#1F2440',
                            }}
                          >
                            {kas?.nama}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-700">{rp.description}</div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Tgl: {formatDateIndo(rp.issue_date)}
                            {rp.due_date && ` · Jatuh Tempo: ${formatDateIndo(rp.due_date)}`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-600 tabular-nums">
                          {formatRupiah(rp.amount)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${
                            rp.remaining_amount === 0
                              ? 'text-slate-400'
                              : isRec
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {formatRupiah(rp.remaining_amount)}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              rp.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rp.status === 'partially_paid'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rp.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap space-x-1">
                          {rp.status !== 'paid' ? (
                            <button
                              onClick={() => {
                                setPaymentModalRp(rp);
                                setPaymentAmountInput(String(rp.remaining_amount));
                                setPaymentDateInput(new Date().toISOString().split('T')[0]);
                                setPaymentStorageId(storageAccounts[0]?.id || '');
                                setPaymentNotesInput('');
                              }}
                              className="px-2.5 py-1 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                            >
                              Catat Pelunasan
                            </button>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-medium">Lunas</span>
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
      )}

      {/* ---------------- TAB 4: CATATAN ATAS LAPORAN KEUANGAN (CaLK) ---------------- */}
      {activeTab === 'calk' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Catatan atas Laporan Keuangan (CaLK) Tahun Anggaran {lpjNotes.year}
              </h3>
              <p className="text-xs text-slate-500">
                Pengungkapan naratif wajib mengacu pada standar ISAK 35 untuk Entitas Nirlaba. Diisi resmi oleh Bendahara Umum.
              </p>
            </div>
            {calkSavedToast && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg flex items-center gap-1">
                <Check className="w-4 h-4" /> Tersimpan!
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                1. Dasar Penyajian Laporan Keuangan
              </label>
              <textarea
                rows={3}
                value={calkForm.accounting_basis}
                onChange={(e) => setCalkForm({ ...calkForm, accounting_basis: e.target.value })}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                2. Kebijakan Akuntansi Penting
              </label>
              <textarea
                rows={3}
                value={calkForm.accounting_policies}
                onChange={(e) => setCalkForm({ ...calkForm, accounting_policies: e.target.value })}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                3. Penjelasan Pos-pos Penting (Pelean, Sumbangan, dan Operasional)
              </label>
              <textarea
                rows={3}
                value={calkForm.significant_items_notes || ''}
                onChange={(e) => setCalkForm({ ...calkForm, significant_items_notes: e.target.value })}
                placeholder="Rincian pos persembahan perpuluhan, pelean perjamuan, rekening penyimpanan kas..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                4. Penjelasan Selisih / Varians Anggaran Signifikan (&gt;{lpjSettings.budget_variance_threshold_percent}%)
              </label>
              <textarea
                rows={3}
                value={calkForm.budget_variance_notes || ''}
                onChange={(e) => setCalkForm({ ...calkForm, budget_variance_notes: e.target.value })}
                placeholder="Penjelasan pos penerimaan atau pos belanja yang realisasinya melenceng jauh dari APBG..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                5. Peristiwa Penting Tahun Berjalan
              </label>
              <textarea
                rows={2}
                value={calkForm.significant_events || ''}
                onChange={(e) => setCalkForm({ ...calkForm, significant_events: e.target.value })}
                placeholder="Peristiwa jubileum, renovasi besar, pergantian pengurus ressort..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                6. Pengungkapan Dana Terikat (Restricted Funds)
              </label>
              <textarea
                rows={2}
                value={calkForm.restricted_funds_notes || ''}
                onChange={(e) => setCalkForm({ ...calkForm, restricted_funds_notes: e.target.value })}
                placeholder="Penjelasan amanah peruntukan dana Diakonia, Kas Pembangunan, atau titipan beasiswa..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                7. Kejadian Setelah Tanggal Laporan (Subsequent Events)
              </label>
              <textarea
                rows={2}
                value={calkForm.post_reporting_events || ''}
                onChange={(e) => setCalkForm({ ...calkForm, post_reporting_events: e.target.value })}
                placeholder="Kejadian material setelah tanggal penutupan pembukuan yang perlu diketahui jemaat..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={async () => {
                await saveLpjNotes(calkForm);
                setCalkSavedToast(true);
                setTimeout(() => setCalkSavedToast(false), 3000);
              }}
              className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Simpan Perubahan CaLK
            </button>
          </div>
        </div>
      )}

      {/* ---------------- TAB 5: PENGATURAN LPJ & KLASIFIKASI DANA ---------------- */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Klasifikasi Dana per Kas */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Klasifikasi Dana per Kas (ISAK 35)
                </h3>
                <p className="text-xs text-slate-500">
                  Tentukan apakah masing-masing kas bersifat Bebas (Unrestricted) atau Terikat (Restricted) dengan amanah peruntukan tertentu.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Kode & Nama Kas</th>
                    <th className="py-2.5 px-3">Jenis Dana (Fund Type)</th>
                    <th className="py-2.5 px-3">Amanah / Peruntukan Khusus Terikat</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kasList.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {k.nama} <span className="font-mono text-slate-400 font-normal">({k.kode})</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <select
                          value={k.fund_type || 'unrestricted'}
                          onChange={(e) => updateKasFundType(k.id, e.target.value as FundType, k.restricted_purpose)}
                          className="text-xs py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                        >
                          <option value="unrestricted">Tidak Terikat (Unrestricted)</option>
                          <option value="restricted">Terikat (Restricted)</option>
                        </select>
                      </td>
                      <td className="py-2.5 px-3">
                        {k.fund_type === 'restricted' ? (
                          <input
                            type="text"
                            defaultValue={k.restricted_purpose || ''}
                            onBlur={(e) => updateKasFundType(k.id, 'restricted', e.target.value)}
                            placeholder="Contoh: Bantuan sosial kedukaan dan orang sakit..."
                            className="w-full py-1 px-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                          />
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Bebas untuk operasional huria</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            k.fund_type === 'restricted'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {k.fund_type === 'restricted' ? 'Terikat' : 'Tidak Terikat'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kebijakan Penyusutan & Parameter LPJ */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800">
              Kebijakan Penyusutan & Parameter Laporan
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">Penyusutan Aset Tetap</span>
                    <span className="text-[11px] text-slate-500">Hitung nilai buku dengan metode Garis Lurus</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={lpjSettings.enable_depreciation}
                    onChange={(e) => updateLpjSettings({ enable_depreciation: e.target.checked })}
                    className="w-4 h-4 text-primary rounded-sm"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Toleransi Selisih Anggaran CaLK (%)</label>
                  <input
                    type="number"
                    value={lpjSettings.budget_variance_threshold_percent}
                    onChange={(e) =>
                      updateLpjSettings({ budget_variance_threshold_percent: Number(e.target.value) })
                    }
                    className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Batas Waktu Standar Panjar (Hari)</label>
                  <input
                    type="number"
                    value={lpjSettings.default_advance_days}
                    onChange={(e) => updateLpjSettings({ default_advance_days: Number(e.target.value) })}
                    className="w-full py-1.5 px-3 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                <span className="font-bold text-slate-800 block">Masa Manfaat Default per Kategori (Tahun)</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {Object.entries(lpjSettings.useful_life_defaults).map(([cat, years]) => (
                    <div key={cat} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                      <span className="capitalize">{cat.replace('_', ' ')}:</span>
                      <span className="font-mono font-bold text-slate-800">{years} thn</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL TAMBAH/EDIT ASET ---------------- */}
      {isAssetModalOpen && editingAsset && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingAsset.id ? 'Perbarui Aset Inventaris' : 'Tambah Aset Inventaris Baru'}
              </h3>
              <button onClick={() => setIsAssetModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nama Barang / Aset *</label>
                <input
                  type="text"
                  value={editingAsset.nama || ''}
                  onChange={(e) => setEditingAsset({ ...editingAsset, nama: e.target.value })}
                  placeholder="Contoh: Sound System Yamaha 16 Ch, Mobil Dinas..."
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Kategori *</label>
                  <select
                    value={editingAsset.kategori || 'elektronik'}
                    onChange={(e) =>
                      setEditingAsset({
                        ...editingAsset,
                        kategori: e.target.value as FixedAssetCategory,
                        useful_life_years: lpjSettings.useful_life_defaults[e.target.value as FixedAssetCategory] ?? 5,
                      })
                    }
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="tanah">Tanah</option>
                    <option value="bangunan">Bangunan / Gedung</option>
                    <option value="kendaraan">Kendaraan Dinas</option>
                    <option value="alat_musik">Alat Musik</option>
                    <option value="elektronik">Elektronik & Sound</option>
                    <option value="perabot">Perabot & Kursi</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Kas Seksi Pengelola *</label>
                  <select
                    value={editingAsset.kas_id || kasList[0]?.id}
                    onChange={(e) => setEditingAsset({ ...editingAsset, kas_id: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    {kasList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tanggal Perolehan *</label>
                  <input
                    type="date"
                    value={editingAsset.tanggal_perolehan || ''}
                    onChange={(e) => setEditingAsset({ ...editingAsset, tanggal_perolehan: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nilai Perolehan (Rp) *</label>
                  <input
                    type="number"
                    value={editingAsset.nilai_perolehan ?? ''}
                    onChange={(e) => setEditingAsset({ ...editingAsset, nilai_perolehan: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Kondisi Fisik</label>
                  <select
                    value={editingAsset.kondisi || 'baik'}
                    onChange={(e) => setEditingAsset({ ...editingAsset, kondisi: e.target.value as FixedAssetCondition })}
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden"
                  >
                    <option value="baik">Baik</option>
                    <option value="rusak_ringan">Rusak Ringan</option>
                    <option value="rusak_berat">Rusak Berat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Lokasi Fisik Barang</label>
                  <input
                    type="text"
                    value={editingAsset.lokasi || ''}
                    onChange={(e) => setEditingAsset({ ...editingAsset, lokasi: e.target.value })}
                    placeholder="Gedung Utama, Ruang Serbaguna, dll."
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Masa Manfaat (Tahun)</label>
                  <input
                    type="number"
                    value={editingAsset.useful_life_years ?? 5}
                    onChange={(e) => setEditingAsset({ ...editingAsset, useful_life_years: Number(e.target.value) })}
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nilai Residu / Sisa (Rp)</label>
                  <input
                    type="number"
                    value={editingAsset.salvage_value ?? 0}
                    onChange={(e) => setEditingAsset({ ...editingAsset, salvage_value: Number(e.target.value) })}
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Catatan Tambahan / Spesifikasi</label>
                <textarea
                  rows={2}
                  value={editingAsset.notes || ''}
                  onChange={(e) => setEditingAsset({ ...editingAsset, notes: e.target.value })}
                  placeholder="Nomor seri, plat nomor kendaraan, atau rincian komponen..."
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsAssetModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const res = await saveFixedAsset(editingAsset);
                  if (!res.success) {
                    alert(res.error);
                    return;
                  }
                  setIsAssetModalOpen(false);
                }}
                className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                Simpan Aset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL AJUKAN PENGHAPUSAN / HIBAH ASET ---------------- */}
      {disposalModalAsset && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">
              Ajukan Penghapusan / Hibah Aset
            </h3>
            <p className="text-xs text-slate-600">
              Aset: <strong>{disposalModalAsset.nama}</strong> ({disposalModalAsset.kode}). Usulan ini membutuhkan verifikasi dan persetujuan dari Ketua Kas.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tindakan</label>
                <select
                  value={disposalActionType}
                  onChange={(e) => setDisposalActionType(e.target.value as any)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl"
                >
                  <option value="diajukan_penghapusan">Penghapusan (Rusak total / Afkir)</option>
                  <option value="diajukan_hibah">Hibah (Diserahkan ke pos pelayanan lain)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Alasan Terperinci *</label>
                <textarea
                  rows={3}
                  value={disposalReasonInput}
                  onChange={(e) => setDisposalReasonInput(e.target.value)}
                  placeholder="Kondisi barang rusak berat dan tidak ekonomis diperbaiki..."
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setDisposalModalAsset(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const res = await proposeAssetDisposal(disposalModalAsset.id, disposalActionType, disposalReasonInput);
                  if (!res.success) {
                    alert(res.error);
                    return;
                  }
                  setDisposalModalAsset(null);
                  alert('Usulan telah diajukan ke Ketua Kas untuk ditinjau.');
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
              >
                Kirim Usulan ke Ketua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL CATAT PANJAR ---------------- */}
      {isAdvanceModalOpen && editingAdvance && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingAdvance.id ? 'Perbarui Data Panjar' : 'Catat Panjar Kegiatan Baru'}
              </h3>
              <button onClick={() => setIsAdvanceModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Uraian / Kegiatan Panjar *</label>
                <input
                  type="text"
                  value={editingAdvance.purpose || ''}
                  onChange={(e) => setEditingAdvance({ ...editingAdvance, purpose: e.target.value })}
                  placeholder="Contoh: Pembelian lilin & konsumsi Natal Sekolah Minggu"
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Kas Seksi Sumber Dana *</label>
                <select
                  value={editingAdvance.kas_id || kasList[0]?.id}
                  onChange={(e) => setEditingAdvance({ ...editingAdvance, kas_id: e.target.value })}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl"
                >
                  {kasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nama Penerima Panjar *</label>
                  <input
                    type="text"
                    value={editingAdvance.recipient_name || ''}
                    onChange={(e) => setEditingAdvance({ ...editingAdvance, recipient_name: e.target.value })}
                    placeholder="Nama panitia..."
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">No. Kontak / HP</label>
                  <input
                    type="text"
                    value={editingAdvance.recipient_phone || ''}
                    onChange={(e) => setEditingAdvance({ ...editingAdvance, recipient_phone: e.target.value })}
                    placeholder="0812-..."
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nominal Panjar (Rp) *</label>
                  <input
                    type="number"
                    value={editingAdvance.amount ?? ''}
                    onChange={(e) => setEditingAdvance({ ...editingAdvance, amount: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Jatuh Tempo SPJ *</label>
                  <input
                    type="date"
                    value={editingAdvance.due_date || ''}
                    onChange={(e) => setEditingAdvance({ ...editingAdvance, due_date: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsAdvanceModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const res = await saveAdvance(editingAdvance);
                  if (!res.success) {
                    alert(res.error);
                    return;
                  }
                  setIsAdvanceModalOpen(false);
                }}
                className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                Simpan Panjar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL SPJ REALISASI PANJAR ---------------- */}
      {settlementModalAdvance && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">
              Pertanggungjawaban (SPJ) Realisasi Panjar
            </h3>
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Kegiatan:</span>
                <span className="font-semibold text-slate-800">{settlementModalAdvance.purpose}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal Panjar Awal:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatRupiah(settlementModalAdvance.amount)}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Total Belanja Riil (Rp) *</label>
                <input
                  type="number"
                  value={settlementSpentInput}
                  onChange={(e) => setSettlementSpentInput(e.target.value)}
                  placeholder="0"
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              {Number(settlementSpentInput) > 0 && (
                <div className="p-3 rounded-xl border text-xs">
                  {Number(settlementSpentInput) < settlementModalAdvance.amount ? (
                    <div className="text-emerald-700">
                      <span className="font-bold">Sisa Dana: </span>
                      {formatRupiah(settlementModalAdvance.amount - Number(settlementSpentInput))} (Wajib disetor kembali ke kas)
                    </div>
                  ) : Number(settlementSpentInput) > settlementModalAdvance.amount ? (
                    <div className="text-rose-700">
                      <span className="font-bold">Kekurangan Dana: </span>
                      {formatRupiah(Number(settlementSpentInput) - settlementModalAdvance.amount)} (Diganti oleh kas seksi)
                    </div>
                  ) : (
                    <div className="text-slate-700 font-medium">Realisasi belanja tepat sama dengan nominal panjar.</div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Rincian Realisasi Belanja *</label>
                <textarea
                  rows={3}
                  value={settlementNotesInput}
                  onChange={(e) => setSettlementNotesInput(e.target.value)}
                  placeholder="Rincian pos belanja: konsumsi, fotokopi, alat tulis, dll."
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setSettlementModalAdvance(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const saveRes = await saveAdvanceSettlement({
                    advance_id: settlementModalAdvance.id,
                    spent_amount: Number(settlementSpentInput),
                    notes: settlementNotesInput,
                    receipt_url: settlementReceiptUrl || null,
                  });
                  if (!saveRes.success || !saveRes.id) {
                    alert(saveRes.error || 'Gagal menyimpan SPJ');
                    return;
                  }
                  await submitAdvanceSettlement(saveRes.id);
                  setSettlementModalAdvance(null);
                  alert('Laporan SPJ berhasil diajukan ke Ketua Kas untuk disahkan.');
                }}
                className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                Ajukan SPJ ke Ketua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL CATAT PIUTANG / UTANG ---------------- */}
      {isRpModalOpen && editingRp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Catat {editingRp.type === 'receivable' ? 'Piutang' : 'Utang'} Baru
              </h3>
              <button onClick={() => setIsRpModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRp({ ...editingRp, type: 'receivable' })}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs ${
                    editingRp.type === 'receivable'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Piutang (Hak Gereja)
                </button>
                <button
                  type="button"
                  onClick={() => setEditingRp({ ...editingRp, type: 'payable' })}
                  className={`flex-1 py-2 rounded-xl font-bold text-xs ${
                    editingRp.type === 'payable'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Utang (Kewajiban Gereja)
                </button>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Pihak Terkait (Debitur/Kreditur) *</label>
                <input
                  type="text"
                  value={editingRp.counterparty_name || ''}
                  onChange={(e) => setEditingRp({ ...editingRp, counterparty_name: e.target.value })}
                  placeholder="Nama orang / instansi / percetakan..."
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Kas Seksi Terkait *</label>
                <select
                  value={editingRp.kas_id || kasList[0]?.id}
                  onChange={(e) => setEditingRp({ ...editingRp, kas_id: e.target.value })}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl"
                >
                  {kasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nominal Pokok (Rp) *</label>
                  <input
                    type="number"
                    value={editingRp.amount ?? ''}
                    onChange={(e) => setEditingRp({ ...editingRp, amount: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Jatuh Tempo</label>
                  <input
                    type="date"
                    value={editingRp.due_date || ''}
                    onChange={(e) => setEditingRp({ ...editingRp, due_date: e.target.value })}
                    className="w-full py-2 px-3 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Uraian / Keterangan Transaksi *</label>
                <textarea
                  rows={2}
                  value={editingRp.description || ''}
                  onChange={(e) => setEditingRp({ ...editingRp, description: e.target.value })}
                  placeholder="Contoh: Sewa gedung resepsi, cetak buku ende..."
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsRpModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const res = await saveReceivablePayable(editingRp);
                  if (!res.success) {
                    alert(res.error);
                    return;
                  }
                  setIsRpModalOpen(false);
                }}
                className="px-5 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL CATAT PELUNASAN PIUTANG / UTANG ---------------- */}
      {paymentModalRp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">
              Catat Pelunasan {paymentModalRp.type === 'receivable' ? 'Piutang' : 'Utang'}
            </h3>
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Pihak Terkait:</span>
                <span className="font-semibold text-slate-800">{paymentModalRp.counterparty_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sisa Saldo Berjalan:</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatRupiah(paymentModalRp.remaining_amount)}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nominal Pembayaran (Rp) *</label>
                <input
                  type="number"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  placeholder="0"
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Tempat Penyimpanan (Rekening/Kas)</label>
                <select
                  value={paymentStorageId}
                  onChange={(e) => setPaymentStorageId(e.target.value)}
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl"
                >
                  {storageAccounts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama} ({s.tipe === 'cash' ? 'Tunai' : s.nomor_rekening || 'Bank'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Catatan Pelunasan</label>
                <input
                  type="text"
                  value={paymentNotesInput}
                  onChange={(e) => setPaymentNotesInput(e.target.value)}
                  placeholder="Termin ke-..., transfer bank, atau tunai..."
                  className="w-full py-2 px-3 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setPaymentModalRp(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const res = await recordReceivablePayablePayment(
                    paymentModalRp.id,
                    Number(paymentAmountInput),
                    paymentDateInput,
                    paymentStorageId,
                    paymentNotesInput
                  );
                  if (!res.success) {
                    alert(res.error);
                    return;
                  }
                  setPaymentModalRp(null);
                  alert('Pelunasan berhasil dicatat.');
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                Simpan Pelunasan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
