/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  ArrowRightLeft,
  FileSpreadsheet,
  Download,
  Eye,
  Trash2,
  Send,
  RotateCcw,
  CheckCircle,
  Clock,
  XCircle,
  FileEdit,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Transaction, TransactionStatus, TransactionType } from '../types/database';
import { formatDateIndo, formatRupiah } from '../lib/formatters';
import { exportToExcel } from '../lib/exportUtils';
import { TransactionModal } from '../components/transactions/TransactionModal';
import { TransferModal } from '../components/transactions/TransferModal';
import { AttachmentPreviewModal } from '../components/transactions/AttachmentPreviewModal';
import { ReversalModal } from '../components/transactions/ReversalModal';

const ITEMS_PER_PAGE = 12;

export const TransactionsPage: React.FC = () => {
  const { kasList, storageAccounts, categories, transactions, changeStatus, deleteTransaction, createReversalTransaction } = useData();
  const {
    currentUser,
    isLeader,
    isAdmin,
    isBendaharaUmum,
    isAuditor,
    isPendeta,
    isSekretaris,
    isMajelis,
    userKasAccess,
    canInputKas,
    canRecordTransactions,
    canTransfer,
  } = useAuth();

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);
  const [reversalTargetTx, setReversalTargetTx] = useState<Transaction | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKas, setSelectedKas] = useState('all');
  const [selectedStorage, setSelectedStorage] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPpku, setSelectedPpku] = useState<'all' | 'sentralisasi' | 'dikecualikan'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Role filtering: Section treasurers/heads can only view transactions on their assigned kas (unless leader)
      if (!isLeader) {
        const myKasIds = userKasAccess.map((a) => a.kas_id);
        if (!myKasIds.includes(tx.kas_id)) return false;
      }

      // Filter Kas
      if (selectedKas !== 'all' && tx.kas_id !== selectedKas) return false;

      // Filter Storage
      if (selectedStorage !== 'all' && tx.storage_account_id !== selectedStorage) return false;

      // Filter Category
      if (selectedCategory !== 'all' && tx.category_id !== selectedCategory) return false;

      // Filter Type
      if (selectedType !== 'all' && tx.type !== selectedType) return false;

      // Filter Status
      if (selectedStatus !== 'all' && tx.status !== selectedStatus) return false;

      // Filter PPKU Sentralisasi
      if (selectedPpku === 'sentralisasi') {
        if (tx.type !== 'income' || tx.is_sentralisasi === false) return false;
      }
      if (selectedPpku === 'dikecualikan') {
        if (tx.type !== 'income' || tx.is_sentralisasi !== false) return false;
      }

      // Date Range
      if (startDate && tx.tanggal < startDate) return false;
      if (endDate && tx.tanggal > endDate) return false;

      // Search (description or receipt_no)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = tx.description.toLowerCase().includes(q);
        const matchReceipt = tx.receipt_no?.toLowerCase().includes(q);
        if (!matchDesc && !matchReceipt) return false;
      }

      return true;
    });
  }, [
    transactions,
    isLeader,
    userKasAccess,
    selectedKas,
    selectedStorage,
    selectedCategory,
    selectedType,
    selectedStatus,
    selectedPpku,
    startDate,
    endDate,
    searchQuery,
  ]);

  // Pagination slice
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleExportExcel = () => {
    const rows = filteredTransactions.map((tx, idx) => {
      const kas = kasList.find((k) => k.id === tx.kas_id);
      const storage = storageAccounts.find((s) => s.id === tx.storage_account_id);
      const cat = categories.find((c) => c.id === tx.category_id);

      return {
        No: idx + 1,
        Tanggal: tx.tanggal,
        'No. Bukti': tx.receipt_no || '-',
        'Nama Kas': kas?.nama || '-',
        'Tempat Penyimpanan': storage?.nama || '-',
        Kategori: cat?.nama || (tx.type.includes('transfer') ? 'Transfer' : '-'),
        Jenis: tx.type,
        Uraian: tx.description,
        'Nominal (Rp)': Number(tx.amount),
        Status: tx.status,
      };
    });

    exportToExcel(rows, `Data_Transaksi_HKBP_Hutaraja_${new Date().toISOString().split('T')[0]}`);
  };

  const handleRecallToDraft = async (txId: string) => {
    if (confirm('Tarik kembali pengajuan transaksi ini menjadi Draft?')) {
      await changeStatus(txId, 'draft');
    }
  };

  const handleSubmitDraft = async (txId: string) => {
    await changeStatus(txId, 'submitted');
  };

  const handleDelete = async (txId: string) => {
    if (confirm('Yakin ingin menghapus draf transaksi ini?')) {
      await deleteTransaction(txId);
    }
  };

  const handleConfirmReversal = async (txId: string, reason: string) => {
    await createReversalTransaction(txId, reason);
    setReversalTargetTx(null);
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto min-w-0 overflow-hidden">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Pencatatan Transaksi Kas
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Kelola pemasukan, pengeluaran, dan transfer dana kas HKBP Hutaraja
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Ekspor Excel</span>
          </button>

          {canTransfer && (
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Transfer Antar Kas</span>
            </button>
          )}

          {canRecordTransactions && (
            <button
              onClick={() => setIsTxModalOpen(true)}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Transaksi</span>
            </button>
          )}

          {isAuditor && (
            <NavLink
              to="/audit"
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Modul Badan Audit</span>
            </NavLink>
          )}
        </div>
      </div>

      {/* Role Authority & Inspection Notice */}
      {isAuditor ? (
        <div className="card-purple p-4 rounded-3xl border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 text-xs">
              <span className="font-bold text-purple-950 block">Mode Pemeriksaan Badan Audit (Read-Only)</span>
              <p className="text-purple-900/90 leading-relaxed">
                Sesuai <strong>Pasal 7 & 44 Aturan & Peraturan HKBP</strong>, Badan Audit bertugas memeriksa keabsahan bukti nota, kuitansi, dan mutasi kas huria. Badan Audit dilarang mencatat mutasi kas operasional. Bila terdapat bukti transaksi tidak sesuai, catat temuan pada modul audit.
              </p>
            </div>
          </div>
          <NavLink
            to="/audit"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shrink-0 self-start sm:self-center transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Tulis Temuan Audit</span>
          </NavLink>
        </div>
      ) : isMajelis ? (
        <div className="card-hover p-4 rounded-3xl bg-slate-100 border border-slate-200 text-xs text-slate-700 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-slate-500" />
            <span>
              <strong>Mode Penelaahan Majelis Huria (Read-Only):</strong> Anda memiliki hak pengawasan umum untuk memantau aliran kas dan transparansi perbendaharaan.
            </span>
          </div>
        </div>
      ) : null}

      {/* Summary KPI Strip based on filtered transactions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-hover p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Pemasukan (Filter)
            </span>
            <div className="text-xl md:text-2xl font-bold font-mono text-emerald-800 tabular-nums">
              +{formatRupiah(
                filteredTransactions
                  .filter((t) => t.type === 'income' && t.status === 'approved')
                  .reduce((sum, t) => sum + Number(t.amount), 0)
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="card-hover p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Pengeluaran (Filter)
            </span>
            <div className="text-xl md:text-2xl font-bold font-mono text-rose-800 tabular-nums">
              -{formatRupiah(
                filteredTransactions
                  .filter((t) => t.type === 'expense' && t.status === 'approved')
                  .reduce((sum, t) => sum + Number(t.amount), 0)
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100/80 text-rose-700 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>

        <div className="card-hover p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Transaksi Terpilih
            </span>
            <div className="text-xl md:text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {filteredTransactions.length} <span className="text-xs font-normal text-slate-500">Catatan</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100/80 text-blue-800 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari uraian transaksi atau nomor kuitansi..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>

          {/* Filter Kas */}
          <div>
            <select
              value={selectedKas}
              onChange={(e) => {
                setSelectedKas(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-primary/40 bg-white"
            >
              <option value="all">Semua Kas (Dana)</option>
              {kasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs p-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-primary/40 bg-white"
            >
              <option value="all">Semua Status</option>
              <option value="draft">Draft (Draf Belum Diajukan)</option>
              <option value="submitted">Diajukan (Menunggu Persetujuan)</option>
              <option value="approved">Disetujui (Approved)</option>
              <option value="rejected">Ditolak (Rejected)</option>
            </select>
          </div>
        </div>

        {/* Extended Secondary Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Storage */}
          <div>
            <select
              value={selectedStorage}
              onChange={(e) => {
                setSelectedStorage(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="all">Semua Rekening</option>
              {storageAccounts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="all">Semua Jenis</option>
              <option value="income">Pemasukan (+)</option>
              <option value="expense">Pengeluaran (-)</option>
              <option value="transfer_in">Transfer Masuk</option>
              <option value="transfer_out">Transfer Keluar</option>
            </select>
          </div>

          {/* PPKU Filter */}
          <div>
            <select
              value={selectedPpku}
              onChange={(e) => {
                setSelectedPpku(e.target.value as 'all' | 'sentralisasi' | 'dikecualikan');
                setCurrentPage(1);
              }}
              className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="all">Semua Status PPKU</option>
              <option value="sentralisasi">Objek Sentralisasi (55% BPSK / 45% Huria)</option>
              <option value="dikecualikan">Bebas Sentralisasi (100% Huria)</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs p-1.5 rounded-lg border border-slate-200"
              placeholder="Dari tanggal"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs p-1.5 rounded-lg border border-slate-200"
              placeholder="Sampai tanggal"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Tanggal & Bukti</th>
                <th className="py-3.5 px-4">Kas (Dana)</th>
                <th className="py-3.5 px-4">Tempat Simpan</th>
                <th className="py-3.5 px-4">Uraian Transaksi</th>
                <th className="py-3.5 px-4 text-right">Nominal</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ada transaksi yang cocok dengan kriteria pencarian/filter.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const kas = kasList.find((k) => k.id === tx.kas_id);
                  const storage = storageAccounts.find((s) => s.id === tx.storage_account_id);
                  const isInc = tx.type === 'income' || tx.type === 'transfer_in';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-slate-800 font-medium">
                          {formatDateIndo(tx.tanggal)}
                        </div>
                        {tx.receipt_no ? (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {tx.receipt_no}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
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

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {storage?.nama}
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-slate-800 line-clamp-2">
                          {tx.description}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {tx.attachment_url && (
                            <button
                              type="button"
                              onClick={() => setPreviewAttachmentUrl(tx.attachment_url!)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary-dark bg-primary/10 px-1.5 py-0.5 rounded-md transition-colors"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>Lihat Bukti</span>
                            </button>
                          )}
                          {tx.is_reversal && (
                            <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md font-semibold">
                              Transaksi Koreksi
                            </span>
                          )}
                          {tx.reject_note && (
                            <span className="text-[10px] text-rose-600 font-medium truncate max-w-[200px]" title={tx.reject_note}>
                              Alasan: {tx.reject_note}
                            </span>
                          )}
                        </div>
                      </td>

                      <td
                        className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap tabular-nums ${
                          isInc ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        <div>
                          {isInc ? '+' : '-'}
                          {formatRupiah(tx.amount)}
                        </div>
                        {tx.type === 'income' && (
                          tx.is_sentralisasi === false ? (
                            <div className="text-[9.5px] font-sans font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5 inline-block border border-emerald-100">
                              100% Kas Huria
                            </div>
                          ) : (
                            <div className="text-[9px] font-sans font-medium text-slate-500 mt-0.5 text-right space-y-0.2">
                              <span className="text-blue-700 font-semibold block">
                                BPSK (55%): {formatRupiah(tx.bpsk_amount ?? Math.round(tx.amount * 0.55))}
                              </span>
                              <span className="text-indigo-700 block">
                                Huria (45%): {formatRupiah(tx.huria_amount ?? (tx.amount - (tx.bpsk_amount ?? Math.round(tx.amount * 0.55))))}
                              </span>
                            </div>
                          )
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            tx.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-900'
                              : tx.status === 'submitted'
                              ? 'bg-blue-100 text-blue-800'
                              : tx.status === 'draft'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Draft Actions - only for recording users */}
                          {tx.status === 'draft' && canRecordTransactions && (isAdmin || tx.created_by === currentUser?.id) && (
                            <>
                              <button
                                onClick={() => handleSubmitDraft(tx.id)}
                                title="Ajukan untuk Persetujuan"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(tx.id)}
                                title="Hapus Draf"
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Submitted Action (Author can recall before approval) */}
                          {tx.status === 'submitted' && tx.created_by === currentUser?.id && canRecordTransactions && (
                            <button
                              onClick={() => handleRecallToDraft(tx.id)}
                              title="Tarik Kembali ke Draf"
                              className="px-2 py-1 text-[10px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors"
                            >
                              Tarik Draf
                            </button>
                          )}

                          {/* Approved Actions (Reversal button - only for authorized recording officers) */}
                          {tx.status === 'approved' && !tx.is_reversal && canRecordTransactions && (
                            <button
                              onClick={() => setReversalTargetTx(tx)}
                              title="Buat Transaksi Koreksi/Pembalik"
                              className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Auditor Badge */}
                          {isAuditor && (
                            <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                              Uji Petik
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards View */}
        <div className="md:hidden divide-y divide-slate-100 p-4 space-y-3">
          {paginatedTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Tidak ada transaksi yang cocok.
            </div>
          ) : (
            paginatedTransactions.map((tx) => {
              const kas = kasList.find((k) => k.id === tx.kas_id);
              const storage = storageAccounts.find((s) => s.id === tx.storage_account_id);
              const isInc = tx.type === 'income' || tx.type === 'transfer_in';

              return (
                <div key={tx.id} className="pt-3.5 first:pt-0 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-500 font-semibold">{formatDateIndo(tx.tanggal)}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        tx.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-900'
                          : tx.status === 'submitted'
                          ? 'bg-blue-100 text-blue-900'
                          : tx.status === 'draft'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>

                  <div className="font-bold text-slate-900 text-sm leading-snug">
                    {tx.description}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                        style={{
                          backgroundColor: `${kas?.warna || '#6366F1'}20`,
                          color: kas?.warna || '#4338CA',
                        }}
                      >
                        {kas?.nama}
                      </span>
                      <span className="text-[10px] text-slate-500">· {storage?.nama}</span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-mono font-black tabular-nums text-sm block ${
                          isInc ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isInc ? '+' : '-'}
                        {formatRupiah(tx.amount)}
                      </span>
                      {tx.type === 'income' && (
                        tx.is_sentralisasi === false ? (
                          <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100 block mt-0.5">
                            100% Kas Huria
                          </span>
                        ) : (
                          <span className="text-[8.5px] font-medium text-blue-700 block mt-0.5">
                            BPSK: {formatRupiah(tx.bpsk_amount ?? Math.round(tx.amount * 0.55))}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <div>
                      {tx.attachment_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewAttachmentUrl(tx.attachment_url!)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Bukti</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {tx.status === 'draft' && canRecordTransactions && (isAdmin || tx.created_by === currentUser?.id) && (
                        <>
                          <button
                            onClick={() => handleSubmitDraft(tx.id)}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 rounded-lg flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Ajukan</span>
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1 text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {tx.status === 'approved' && !tx.is_reversal && canRecordTransactions && (
                        <button
                          onClick={() => setReversalTargetTx(tx)}
                          className="px-2 py-1 text-[11px] font-bold text-amber-800 bg-amber-100 rounded-lg flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Koreksi</span>
                        </button>
                      )}

                      {isAuditor && (
                        <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                          Uji Petik
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Menampilkan {filteredTransactions.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} -{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} dari {filteredTransactions.length} transaksi
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Global Modals */}
      <TransactionModal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} />
      <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} />
      <AttachmentPreviewModal
        isOpen={Boolean(previewAttachmentUrl)}
        imageUrl={previewAttachmentUrl}
        onClose={() => setPreviewAttachmentUrl(null)}
      />
      <ReversalModal
        isOpen={Boolean(reversalTargetTx)}
        transaction={reversalTargetTx}
        onClose={() => setReversalTargetTx(null)}
        onConfirm={handleConfirmReversal}
      />
    </div>
  );
};
