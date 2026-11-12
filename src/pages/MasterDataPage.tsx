/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  ShieldAlert,
  Wallet,
  Landmark,
  Tags,
  Users,
  Coins,
  X,
  UserCheck,
  UserPlus,
  Shield,
  ShieldCheck,
  Mail,
  Phone,
  Building,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  AlertCircle,
  Search,
  Lock,
  Unlock,
  ChevronRight,
  Sparkles,
  Sliders,
  Save,
  Calendar,
  CalendarCheck,
  CalendarRange,
  RotateCw,
  ArrowRight,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Kas,
  StorageAccount,
  Category,
  OpeningBalance,
  UserKasAccess,
  KasAccessLevel,
  Profile,
  TohonanType,
  EcclesiasticalRole,
  HuriaLevel,
  UserRole,
  FiscalYear,
} from '../types/database';
import { formatRupiah } from '../lib/formatters';
import { HKBP_ROLES, HKBP_ROLE_CATEGORIES, TOHONAN_LIST } from '../lib/hkbpRoles';

const PASTEL_PALETTE = ['#7C9CF5', '#A8E6CF', '#FFB4A2', '#FFE8A3', '#CDB4FF', '#B8C0FF', '#FFD166'];

export const MasterDataPage: React.FC = () => {
  const {
    kasList,
    storageAccounts,
    categories,
    openingBalances,
    userKasAccessList,
    profiles,
    saveKas,
    deleteKas,
    saveStorageAccount,
    saveCategory,
    saveOpeningBalance,
    saveUserKasAccess,
    removeUserKasAccess,
    saveProfile,
    deleteProfile,
    toggleProfileActive,
    transactions,
    fixedAssets,
    advances,
    settings,
    updateSettings,
    fiscalYears,
    saveFiscalYear,
    deleteFiscalYear,
    setActiveFiscalYear,
    toggleFiscalYearBudgetLock,
    rollForwardBalancesToYear,
  } = useData();

  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'kas' | 'years' | 'storage' | 'categories' | 'balances' | 'access' | 'users' | 'policy'>('kas');

  // Fiscal Year Modal States
  const [editingFiscalYear, setEditingFiscalYear] = useState<Partial<FiscalYear> | null>(null);
  const [deletingFiscalYear, setDeletingFiscalYear] = useState<FiscalYear | null>(null);
  const [showRollForwardModal, setShowRollForwardModal] = useState<boolean>(false);
  const [rollForwardFromYear, setRollForwardFromYear] = useState<number>((settings?.active_year || 2026) - 1);
  const [rollForwardToYear, setRollForwardToYear] = useState<number>(settings?.active_year || 2026);
  const [isRollingForward, setIsRollingForward] = useState<boolean>(false);

  // Policy Form state
  const [policyForm, setPolicyForm] = useState({
    receipt_required_threshold: settings?.receipt_required_threshold ?? 500000,
    active_year: settings?.active_year ?? new Date().getFullYear(),
    block_negative_balance: settings?.block_negative_balance !== false,
  });

  useEffect(() => {
    if (settings) {
      setPolicyForm({
        receipt_required_threshold: settings.receipt_required_threshold ?? 500000,
        active_year: settings.active_year ?? new Date().getFullYear(),
        block_negative_balance: settings.block_negative_balance !== false,
      });
      setRollForwardFromYear((settings.active_year || 2026) - 1);
      setRollForwardToYear(settings.active_year || 2026);
    }
  }, [settings]);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(policyForm);
    showToast('Kebijakan nota & batasan saldo berhasil disimpan!');
  };

  // Fiscal Year Handlers
  const handleSaveFiscalYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFiscalYear?.year) return;
    const res = await saveFiscalYear(editingFiscalYear);
    if (res.success) {
      showToast(`Tahun Anggaran ${editingFiscalYear.year} berhasil disimpan!`);
      setEditingFiscalYear(null);
    } else {
      showToast(res.error || 'Gagal menyimpan Tahun Anggaran', 'error');
    }
  };

  const handleExecuteDeleteFiscalYear = async () => {
    if (!deletingFiscalYear) return;
    const res = await deleteFiscalYear(deletingFiscalYear.id);
    if (res.success) {
      showToast(`Tahun Anggaran ${deletingFiscalYear.year} berhasil dihapus.`);
      setDeletingFiscalYear(null);
    } else {
      showToast(res.error || 'Gagal menghapus Tahun Anggaran', 'error');
    }
  };

  const handleSwitchActiveYear = async (year: number) => {
    const res = await setActiveFiscalYear(year);
    if (res.success) {
      showToast(`Tahun Anggaran Aktif sistem dialihkan ke ${year}!`);
    } else {
      showToast(res.error || 'Gagal mengalihkan Tahun Anggaran', 'error');
    }
  };

  const handleToggleLock = async (year: number) => {
    const res = await toggleFiscalYearBudgetLock(year);
    if (res.success) {
      showToast(`Status kunci RAPB Tahun ${year} berhasil diperbarui.`);
    }
  };

  const handleExecuteRollForward = async () => {
    setIsRollingForward(true);
    const res = await rollForwardBalancesToYear(rollForwardFromYear, rollForwardToYear);
    setIsRollingForward(false);
    if (res.success) {
      showToast(`Roll-forward berhasil! ${res.count} saldo awal kas tahun ${rollForwardToYear} diperbarui.`);
      setShowRollForwardModal(false);
    } else {
      showToast(res.error || 'Gagal melakukan roll-forward saldo', 'error');
    }
  };

  // Modal states for Kas
  const [editingKas, setEditingKas] = useState<Partial<Kas> | null>(null);
  const [deletingKas, setDeletingKas] = useState<Kas | null>(null);

  // Modal states for Storage & Category & Balances
  const [editingStorage, setEditingStorage] = useState<Partial<StorageAccount> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [editingBalance, setEditingBalance] = useState<Partial<OpeningBalance> | null>(null);
  const [newAccessUserId, setNewAccessUserId] = useState<string>('');
  const [newAccessKasId, setNewAccessKasId] = useState<string>('');
  const [newAccessLevel, setNewAccessLevel] = useState<KasAccessLevel>('bendahara');

  // User Management state
  const [editingProfile, setEditingProfile] = useState<Partial<Profile> | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [userCategoryFilter, setUserCategoryFilter] = useState<string>('all');
  const [userSearch, setUserSearch] = useState<string>('');

  // Toast feedback
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Handlers for Kas
  const handleSaveKas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKas?.nama || !editingKas.kode) return;
    await saveKas(editingKas);
    showToast(editingKas.id ? `Kas ${editingKas.nama} berhasil diperbarui` : `Kas ${editingKas.nama} berhasil ditambahkan`);
    setEditingKas(null);
  };

  const handleExecuteDeleteKas = async () => {
    if (!deletingKas) return;
    const res = await deleteKas(deletingKas.id);
    if (res.success) {
      showToast(`Kas "${deletingKas.nama}" berhasil dihapus secara permanen`);
      setDeletingKas(null);
    } else {
      showToast(res.error || 'Gagal menghapus kas', 'error');
    }
  };

  const handleDeactivateKas = async () => {
    if (!deletingKas) return;
    await saveKas({ ...deletingKas, is_active: false });
    showToast(`Kas "${deletingKas.nama}" telah dinonaktifkan`);
    setDeletingKas(null);
  };

  // Handlers for Storage
  const handleSaveStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStorage?.nama) return;
    await saveStorageAccount(editingStorage);
    showToast('Tempat penyimpanan berhasil disimpan');
    setEditingStorage(null);
  };

  // Handlers for Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.nama || !editingCategory.tipe) return;
    await saveCategory(editingCategory);
    showToast('Kategori berhasil disimpan');
    setEditingCategory(null);
  };

  // Handlers for Opening Balance
  const handleSaveOpeningBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBalance?.kas_id || !editingBalance.storage_account_id) return;
    await saveOpeningBalance(editingBalance);
    showToast('Saldo awal berhasil disimpan');
    setEditingBalance(null);
  };

  // Handlers for User Kas Access
  const handleAddAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccessUserId || !newAccessKasId) return;
    await saveUserKasAccess({
      user_id: newAccessUserId,
      kas_id: newAccessKasId,
      access_level: newAccessLevel,
    });
    showToast('Penugasan kas berhasil ditambahkan');
    setNewAccessUserId('');
    setNewAccessKasId('');
  };

  // Handlers for Profile (User Management)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile?.full_name || !editingProfile?.email) {
      showToast('Nama dan email wajib diisi', 'error');
      return;
    }

    // Determine system role automatically from ecclesiastical role if set
    let sysRole: UserRole = editingProfile.role || 'pengurus_kas';
    if (editingProfile.ecclesiastical_role) {
      const match = HKBP_ROLES.find((r) => r.key === editingProfile.ecclesiastical_role);
      if (match) sysRole = match.systemRole;
    }

    const payload: Partial<Profile> = {
      ...editingProfile,
      role: sysRole,
    };

    const res = await saveProfile(payload);
    if (res.success) {
      showToast(editingProfile.id ? 'Profil pengguna berhasil diperbarui' : 'Pengguna baru berhasil ditambahkan');
      setEditingProfile(null);
    } else {
      showToast(res.error || 'Gagal menyimpan data pengguna', 'error');
    }
  };

  const handleExecuteDeleteProfile = async () => {
    if (!deletingProfile) return;
    const res = await deleteProfile(deletingProfile.id);
    if (res.success) {
      showToast(`Pengguna ${deletingProfile.full_name} berhasil dihapus`);
      setDeletingProfile(null);
    } else {
      showToast(res.error || 'Gagal menghapus pengguna', 'error');
    }
  };

  const handleToggleUserStatus = async (user: Profile) => {
    const res = await toggleProfileActive(user.id);
    if (res.success) {
      showToast(`Status pengguna ${user.full_name} diubah menjadi ${!user.is_active ? 'Aktif' : 'Non-Aktif'}`);
    }
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return profiles.filter((u) => {
      // Category filter
      if (userCategoryFilter !== 'all') {
        const roleDef = HKBP_ROLES.find((r) => r.key === u.ecclesiastical_role);
        if (userCategoryFilter === 'pelayan_tahbisan') {
          if (u.tohonan === 'non_tahbisan' || (!u.tohonan && !['pendeta_ressort', 'majelis'].includes(u.role))) return false;
        } else if (roleDef && roleDef.category !== userCategoryFilter) {
          return false;
        }
      }

      // Search query
      if (userSearch.trim()) {
        const q = userSearch.toLowerCase();
        const nameMatch = u.full_name.toLowerCase().includes(q);
        const emailMatch = u.email.toLowerCase().includes(q);
        const phoneMatch = u.phone?.toLowerCase().includes(q) || false;
        const wijkMatch = u.wijk?.toLowerCase().includes(q) || false;
        const seksiMatch = u.seksi_name?.toLowerCase().includes(q) || false;
        return nameMatch || emailMatch || phoneMatch || wijkMatch || seksiMatch;
      }
      return true;
    });
  }, [profiles, userCategoryFilter, userSearch]);

  // Kas delete integrity metrics
  const deletingKasMetrics = useMemo(() => {
    if (!deletingKas) return { txCount: 0, obCount: 0, assetCount: 0, advCount: 0, canDelete: true };
    const txCount = transactions.filter((t) => t.kas_id === deletingKas.id).length;
    const obCount = openingBalances.filter((b) => b.kas_id === deletingKas.id).length;
    const assetCount = fixedAssets.filter((a) => a.kas_id === deletingKas.id).length;
    const advCount = advances.filter((ad) => ad.kas_id === deletingKas.id).length;
    const canDelete = txCount === 0 && obCount === 0 && assetCount === 0 && advCount === 0;
    return { txCount, obCount, assetCount, advCount, canDelete };
  }, [deletingKas, transactions, openingBalances, fixedAssets, advances]);

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto min-w-0 overflow-hidden">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-xs font-semibold text-white animate-in slide-in-from-bottom duration-200 ${
            toastMsg.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
          }`}
        >
          {toastMsg.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Database className="w-4 h-4 text-primary" />
            <span>Pengaturan Organisasi & Hak Akses SIKU HKBP</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Kelola Data Master HKBP Hutaraja
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Atur daftar Kas (dana), Pengguna & Pelayan gereja, Rekening simpanan, Kategori, dan Saldo awal
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs font-semibold scrollbar-none">
        <button
          onClick={() => setActiveTab('kas')}
          className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'kas' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Daftar Kas ({kasList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('years')}
          className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'years' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Tahun Anggaran ({fiscalYears.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Pengguna & Pelayan Huria ({profiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'storage' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Landmark className="w-4 h-4" />
          <span>Rekening & Brankas ({storageAccounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tags className="w-4 h-4" />
          <span>Kategori Anggaran ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('balances')}
          className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'balances' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Saldo Awal Tahun ({settings.active_year})</span>
        </button>

        <button
          onClick={() => setActiveTab('access')}
          className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'access' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Penugasan Pengurus Kas</span>
        </button>

        <button
          onClick={() => setActiveTab('policy')}
          className={`pb-3 px-3 transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'policy' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Kebijakan Nota & Saldo</span>
        </button>
      </div>

      {/* ---------------- TAB 1: KAS ---------------- */}
      {activeTab === 'kas' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daftar Kas dan Entitas Dana Gereja</h3>
              <p className="text-xs text-slate-500">
                Setiap kas mewakili pos dana otonom huria/seksi dengan klasifikasi dana tidak terikat atau terikat (ISAK 35)
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() =>
                  setEditingKas({
                    nama: '',
                    kode: 'KAS-',
                    warna: '#7C9CF5',
                    fund_type: 'unrestricted',
                    is_active: true,
                  })
                }
                className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Kas Baru</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {kasList.map((k) => (
              <div
                key={k.id}
                className="card-hover bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 transition-all hover:shadow-md"
                style={{ borderTopColor: k.warna, borderTopWidth: '5px' }}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{k.nama}</h4>
                      <span className="font-mono text-[10px] text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded-md">
                        {k.kode}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        k.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {k.is_active ? 'Aktif' : 'Non-Aktif'}
                    </span>
                  </div>

                  {/* Fund Classification Badge */}
                  <div className="mb-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md ${
                        k.fund_type === 'restricted'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                      }`}
                    >
                      <span>{k.fund_type === 'restricted' ? 'Dana Terikat' : 'Dana Tidak Terikat'}</span>
                    </span>
                    {k.restricted_purpose && (
                      <p className="text-[11px] text-amber-700 italic mt-1 line-clamp-1">
                        Tujuan: {k.restricted_purpose}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {k.deskripsi || 'Tidak ada uraian deskripsi kas'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="w-3.5 h-3.5 rounded-full shadow-xs" style={{ backgroundColor: k.warna }} />
                    <span className="text-slate-400 font-mono text-[11px]">{k.warna}</span>
                  </div>

                  {/* Action Buttons: Edit and Delete for Admin */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingKas(k)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                        title="Edit data kas"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeletingKas(k)}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1 transition-colors"
                        title="Hapus kas"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- TAB: TAHUN ANGGARAN (FISCAL YEARS) ---------------- */}
      {activeTab === 'years' && (
        <div className="space-y-5">
          {/* Top Actions & Subheader */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Pengaturan Tahun Anggaran & Periode Buku (Fiscal Years)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Kelola tahun anggaran operasional, orientasi pelayanan HKBP, kunci RAPB, dan roll-forward saldo awal
              </p>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRollForwardModal(true)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200"
                  title="Salin saldo akhir tahun sebelumnya menjadi saldo awal tahun baru"
                >
                  <RotateCw className="w-3.5 h-3.5 text-primary" />
                  <span>Roll-Forward Saldo</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditingFiscalYear({
                      year: (settings?.active_year || 2026) + 1,
                      theme: '',
                      start_date: `${(settings?.active_year || 2026) + 1}-01-01`,
                      end_date: `${(settings?.active_year || 2026) + 1}-12-31`,
                      status: 'planning',
                      is_budget_locked: false,
                      notes: '',
                    })
                  }
                  className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah Tahun Anggaran</span>
                </button>
              </div>
            )}
          </div>

          {/* Current Active Year Executive Spotlight Card */}
          {(() => {
            const currentActiveFY = fiscalYears.find((fy) => fy.year === settings.active_year) || {
              year: settings.active_year,
              theme: 'Tahun Transformasi & Oikoumene Inklusif HKBP',
              status: 'active' as const,
              is_budget_locked: true,
              start_date: `${settings.active_year}-01-01`,
              end_date: `${settings.active_year}-12-31`,
            };
            return (
              <div className="bg-gradient-to-br from-[#0B132B] to-[#1C2541] rounded-2xl p-6 text-white shadow-md border border-slate-700/60 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Tahun Anggaran Berjalan (Aktif)
                      </span>
                      <span className="text-xs text-slate-400">
                        Periode: 01 Jan {currentActiveFY.year} — 31 Des {currentActiveFY.year}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-3">
                      <h2 className="text-3xl font-extrabold font-mono tracking-tight text-white">
                        T.A. {currentActiveFY.year}
                      </h2>
                      <span className="text-sm font-medium text-amber-300/90 italic">
                        "{currentActiveFY.theme || 'Orientasi Pelayanan Huria'}"
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                      Seluruh pencatatan transaksi kas, realisasi anggaran belanja (APBG), persembahan sentralisasi 55/45, dan laporan keuangan resmi beroperasi pada periode tahun anggaran ini.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs space-y-1">
                      <div className="text-slate-400 text-[10px] uppercase font-semibold">Status Pengesahan RAPB</div>
                      <div className="flex items-center gap-2">
                        {currentActiveFY.is_budget_locked ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" /> Terkunci (Rapat Huria)
                          </span>
                        ) : (
                          <span className="text-amber-300 font-bold flex items-center gap-1">
                            <Unlock className="w-3.5 h-3.5" /> Terbuka (Draf/Revisi)
                          </span>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleToggleLock(currentActiveFY.year)}
                            className="text-[10px] text-blue-300 hover:text-white underline ml-1 cursor-pointer"
                          >
                            Ubah
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('balances')}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border border-white/10 cursor-pointer"
                    >
                      <Coins className="w-4 h-4 text-amber-300" />
                      <span>Saldo Awal T.A. {currentActiveFY.year}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Fiscal Years List Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Daftar Periode Tahun Anggaran Huria</h4>
                <p className="text-xs text-slate-500">
                  Arsip dan rencana tahun anggaran yang terdaftar pada sistem SIKU HKBP
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200/60">
                Total: {fiscalYears.length} Tahun
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3.5">Tahun</th>
                    <th className="p-3.5">Tema Orientasi Pelayanan HKBP</th>
                    <th className="p-3.5">Periode Kalender</th>
                    <th className="p-3.5">Status Buku</th>
                    <th className="p-3.5">Status RAPB</th>
                    <th className="p-3.5">Catatan</th>
                    {isAdmin && <th className="p-3.5 text-center">Tindakan</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fiscalYears.map((fy) => {
                    const isActive = fy.year === settings.active_year || fy.status === 'active';
                    return (
                      <tr
                        key={fy.id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          isActive ? 'bg-primary/5 font-medium' : ''
                        }`}
                      >
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-slate-900">
                              {fy.year}
                            </span>
                            {isActive && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Aktif
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-800 font-medium max-w-xs truncate" title={fy.theme}>
                          {fy.theme || '-'}
                        </td>
                        <td className="p-3.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {fy.start_date} s/d {fy.end_date}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                              fy.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : fy.status === 'closed'
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            }`}
                          >
                            {fy.status === 'active'
                              ? 'Aktif (Berjalan)'
                              : fy.status === 'closed'
                              ? 'Ditutup (Arsip)'
                              : 'Perencanaan RAPB'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <button
                            type="button"
                            disabled={!isAdmin}
                            onClick={() => handleToggleLock(fy.year)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 transition-colors ${
                              fy.is_budget_locked
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            }`}
                            title={isAdmin ? 'Klik untuk mengubah kunci RAPB' : undefined}
                          >
                            {fy.is_budget_locked ? (
                              <>
                                <Lock className="w-3 h-3 text-slate-500" />
                                <span>Terkunci</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3 text-blue-500" />
                                <span>Terbuka</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="p-3.5 text-slate-500 text-[11px] max-w-xs truncate" title={fy.notes || ''}>
                          {fy.notes || '-'}
                        </td>
                        {isAdmin && (
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {!isActive && (
                                <button
                                  type="button"
                                  onClick={() => handleSwitchActiveYear(fy.year)}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors border border-emerald-200/60 cursor-pointer"
                                  title="Jadikan tahun anggaran aktif sistem"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Jadikan Aktif</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setEditingFiscalYear(fy)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="Ubah Data Tahun Anggaran"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {!isActive && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingFiscalYear(fy)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Hapus Tahun Anggaran"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* HKBP Governance Callout Box */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-xs space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Pedoman Tata Kelola Tahun Anggaran Huria (PPKU HKBP)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-600 text-[11px] leading-relaxed pt-1">
              <div className="space-y-1">
                <strong className="text-slate-800 block">1. Periode Kalender 1 Jan — 31 Des</strong>
                <p>Tahun anggaran huria mengikuti kalender Masehi. Seluruh transaksi wajib dibukukan sesuai tanggal transaksi fisik dalam periode tahun berjalan.</p>
              </div>
              <div className="space-y-1">
                <strong className="text-slate-800 block">2. Pengesahan RAPB Parrapotan Huria</strong>
                <p>Rancangan Anggaran Pendapatan dan Belanja (RAPB) yang disahkan Rapat Huria harus dikunci agar tidak dapat diubah tanpa mekanisme APBG-Perubahan.</p>
              </div>
              <div className="space-y-1">
                <strong className="text-slate-800 block">3. Roll-Forward Saldo Awal Otomatis</strong>
                <p>Saldo akhir per 31 Desember otomatis menjadi saldo awal per 1 Januari tahun berikutnya melalui fitur Roll-Forward Saldo tanpa selisih pembukuan.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 2: PENGGUNA & PELAYAN HURIA (USER MANAGEMENT) ---------------- */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Top Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span>Manajemen Pengguna & Pelayan Gereja HKBP Hutaraja</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Pembagian peran pelayan gerejawi tingkat Ressort / Huria / Jemaat sesuai Aturan & Peraturan HKBP 2002 Amandemen Keempat
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={() =>
                    setEditingProfile({
                      full_name: '',
                      email: '',
                      phone: '',
                      tohonan: 'sintua',
                      ecclesiastical_role: 'sintua',
                      tingkat: 'huria',
                      is_active: true,
                    })
                  }
                  className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Tambah Pengguna Baru</span>
                </button>
              )}
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
                <button
                  onClick={() => setUserCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                    userCategoryFilter === 'all'
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua Peran ({profiles.length})
                </button>
                {HKBP_ROLE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setUserCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                      userCategoryFilter === cat.id
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Cari nama, email, wijk..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* User Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u) => {
              const roleMeta = HKBP_ROLES.find((r) => r.key === u.ecclesiastical_role);
              const tohonanObj = TOHONAN_LIST.find((t) => t.id === u.tohonan);

              return (
                <div
                  key={u.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
                >
                  <div>
                    {/* Top Row: Avatar & Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm shadow-xs">
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 leading-snug">{u.full_name}</h4>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {u.is_active ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </div>

                    {/* Role Badges */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {tohonanObj && tohonanObj.id !== 'non_tahbisan' && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold text-[10px] border border-purple-100">
                            {tohonanObj.label}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[10px] border border-blue-100">
                          {roleMeta?.label || u.role}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] uppercase font-mono">
                          {u.tingkat === 'ressort' ? 'Tingkat Ressort' : 'Tingkat Huria'}
                        </span>
                      </div>

                      {/* Additional Details: Wijk or Seksi */}
                      {(u.wijk || u.seksi_name) && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          {u.wijk && (
                            <span className="flex items-center gap-1">
                              <Building className="w-3 h-3 text-slate-400" />
                              <span>{u.wijk}</span>
                            </span>
                          )}
                          {u.seksi_name && (
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-500" />
                              <span>{u.seksi_name}</span>
                            </span>
                          )}
                        </div>
                      )}

                      {u.phone && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{u.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions for Admin */}
                  {isAdmin && (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors ${
                          u.is_active
                            ? 'text-amber-700 hover:bg-amber-50'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {u.is_active ? (
                          <>
                            <ToggleRight className="w-4 h-4 text-emerald-600" />
                            <span>Nonaktifkan</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4 text-slate-400" />
                            <span>Aktifkan</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingProfile(u)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Edit</span>
                        </button>
                        {u.id !== 'user-admin' && (
                          <button
                            onClick={() => setDeletingProfile(u)}
                            className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- TAB 3: TEMPAT PENYIMPANAN ---------------- */}
      {activeTab === 'storage' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Rekening Bank & Brankas Tunai</h3>
              <p className="text-xs text-slate-500">
                Tempat fisik penyimpanan dana operasional, kas sentral, dan tabungan pembangunan gereja
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setEditingStorage({ nama: '', tipe: 'bank', nomor_rekening: '', atas_nama: '' })}
                className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Rekening</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {storageAccounts.map((s) => (
              <div key={s.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{s.nama}</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                    {s.tipe === 'cash' ? 'Tunai / Brankas' : 'Rekening Bank'}
                  </span>
                </div>
                {s.nomor_rekening && (
                  <p className="text-xs font-mono text-slate-600">No. Rek: {s.nomor_rekening}</p>
                )}
                {s.atas_nama && (
                  <p className="text-xs text-slate-500">a.n: {s.atas_nama}</p>
                )}
                {isAdmin && (
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => setEditingStorage(s)}
                      className="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Ubah</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- TAB 4: KATEGORI ---------------- */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Kategori Anggaran dan Transaksi</h3>
              <p className="text-xs text-slate-500">
                Struktur mata anggaran penerimaan dan pengeluaran sesuai APBG huria
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setEditingCategory({ nama: '', tipe: 'income', kode: '' })}
                className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kategori</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Income Categories */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="font-bold text-xs text-emerald-700 flex items-center gap-1.5 border-b pb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Kategori Pemasukan</span>
              </h4>
              <div className="space-y-2">
                {categories
                  .filter((c) => c.tipe === 'income')
                  .map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-slate-50/70 rounded-xl flex items-center justify-between text-xs gap-2"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-800">{c.nama}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {c.kode && <span className="text-[10px] font-mono text-slate-400">{c.kode}</span>}
                          {c.is_sentralisasi !== false ? (
                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                              55% BPSK : 45% Huria
                            </span>
                          ) : (
                            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                              ❌ 100% Bebas Sentralisasi
                            </span>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => setEditingCategory(c)}
                          className="p-1 text-slate-400 hover:text-slate-700 shrink-0"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Expense Categories */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="font-bold text-xs text-rose-700 flex items-center gap-1.5 border-b pb-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Kategori Pengeluaran</span>
              </h4>
              <div className="space-y-2">
                {categories
                  .filter((c) => c.tipe === 'expense')
                  .map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-slate-50/70 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{c.nama}</div>
                        {c.kode && <div className="text-[10px] font-mono text-slate-400">{c.kode}</div>}
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => setEditingCategory(c)}
                          className="p-1 text-slate-400 hover:text-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 5: SALDO AWAL ---------------- */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Saldo Awal Tahun Anggaran {settings.active_year}
              </h3>
              <p className="text-xs text-slate-500">
                Saldo awal per kas dan tempat simpan yang menjadi dasar buku kas umum
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() =>
                  setEditingBalance({
                    tahun: settings.active_year,
                    amount: 0,
                    kas_id: kasList[0]?.id,
                    storage_account_id: storageAccounts[0]?.id,
                  })
                }
                className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Atur Saldo Awal</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3.5">Kas (Seksi/Entitas)</th>
                    <th className="p-3.5">Tempat Simpan</th>
                    <th className="p-3.5 text-right">Nominal Saldo Awal</th>
                    <th className="p-3.5">Catatan</th>
                    {isAdmin && <th className="p-3.5 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {openingBalances.map((ob) => {
                    const kas = kasList.find((k) => k.id === ob.kas_id);
                    const stor = storageAccounts.find((s) => s.id === ob.storage_account_id);
                    return (
                      <tr key={ob.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: kas?.warna }} />
                            <span>{kas?.nama || ob.kas_id}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600">{stor?.nama || ob.storage_account_id}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(ob.amount)}
                        </td>
                        <td className="p-3.5 text-slate-500">{ob.notes || '-'}</td>
                        {isAdmin && (
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => setEditingBalance(ob)}
                              className="p-1 text-slate-400 hover:text-slate-700"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 6: PENUGASAN PENGURUS KAS ---------------- */}
      {activeTab === 'access' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Penugasan Pengurus Kas Seksi</h3>
            <p className="text-xs text-slate-500">
              Bendahara Seksi berwenang mengajukan transaksi; Ketua Seksi berwenang menyetujui transaksi seksi sebelum dibukukan
            </p>

            {isAdmin && (
              <form onSubmit={handleAddAccess} className="flex flex-wrap items-center gap-3 pt-2 border-t text-xs">
                <select
                  value={newAccessUserId}
                  onChange={(e) => setNewAccessUserId(e.target.value)}
                  className="p-2 rounded-xl border border-slate-200 bg-white"
                  required
                >
                  <option value="">Pilih Pengguna...</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.role})
                    </option>
                  ))}
                </select>

                <select
                  value={newAccessKasId}
                  onChange={(e) => setNewAccessKasId(e.target.value)}
                  className="p-2 rounded-xl border border-slate-200 bg-white"
                  required
                >
                  <option value="">Pilih Kas...</option>
                  {kasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>

                <select
                  value={newAccessLevel}
                  onChange={(e) => setNewAccessLevel(e.target.value as KasAccessLevel)}
                  className="p-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="bendahara">Tingkat Akses: Bendahara (Pengaju)</option>
                  <option value="ketua">Tingkat Akses: Ketua (Penyetuju)</option>
                </select>

                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white font-semibold rounded-xl flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan Akses</span>
                </button>
              </form>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3.5">Nama Pengurus</th>
                    <th className="p-3.5">Kas Yang Ditugaskan</th>
                    <th className="p-3.5">Peran / Otoritas</th>
                    {isAdmin && <th className="p-3.5 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userKasAccessList.map((a) => {
                    const u = profiles.find((p) => p.id === a.user_id);
                    const k = kasList.find((kas) => kas.id === a.kas_id);
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/50">
                        <td className="p-3.5 font-bold text-slate-900">{u?.full_name || a.user_id}</td>
                        <td className="p-3.5 text-slate-600">{k?.nama || a.kas_id}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              a.access_level === 'ketua'
                                ? 'bg-purple-50 text-purple-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {a.access_level === 'ketua' ? 'Ketua (Penyetuju)' : 'Bendahara (Pengaju)'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => removeUserKasAccess(a.id)}
                              className="p-1 text-rose-500 hover:text-rose-700"
                              title="Hapus Penugasan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 7: KEBIJAKAN NOTA & BATASAN SALDO ---------------- */}
      {activeTab === 'policy' && (
        <div className="space-y-4 max-w-4xl">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm border-b border-slate-100 pb-3">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>Kebijakan Nota & Batasan Saldo</span>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">
                    Batas Nominal Pengeluaran Wajib Lampiran Nota (Rp)
                  </label>
                  <input
                    type="number"
                    value={policyForm.receipt_required_threshold}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, receipt_required_threshold: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    required
                    min={0}
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Saat ini: {formatRupiah(policyForm.receipt_required_threshold)}
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">
                    Tahun Anggaran Aktif
                  </label>
                  <input
                    type="number"
                    value={policyForm.active_year}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, active_year: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    required
                    min={2000}
                    max={2100}
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>Tahun operasional: {policyForm.active_year}</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('years')}
                      className="text-primary hover:underline font-semibold cursor-pointer"
                    >
                      Buka Kelola Tahun Anggaran &rarr;
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2">
                  <label className="flex items-start sm:items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={policyForm.block_negative_balance}
                      onChange={(e) =>
                        setPolicyForm({ ...policyForm, block_negative_balance: e.target.checked })
                      }
                      className="w-4 h-4 text-primary rounded-md focus:ring-primary/40 mt-0.5 sm:mt-0"
                    />
                    <div>
                      <span className="font-semibold text-slate-800 block text-xs sm:text-sm">
                        Blokir Transaksi yang Menyebabkan Saldo Kas Negatif
                      </span>
                      <span className="text-slate-500 text-[11px] block">
                        Mencegah pencatatan pengeluaran jika saldo resmi kas tidak mencukupi
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>Kepatuhan PPKU Sentralisasi & Tertib Keuangan</span>
                </div>
                <p>
                  Parameter ini mengendalikan verifikasi nota pada seluruh transaksi pengeluaran kas huria dan seksi, serta mencegah defisit kas tidak sah pada pembukuan.
                </p>
              </div>

              {isAdmin && (
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 text-xs"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Kebijakan Nota & Saldo</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODALS ---------------- */}

      {/* Modal Edit/Add Fiscal Year */}
      {editingFiscalYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{editingFiscalYear.id ? 'Ubah Tahun Anggaran' : 'Tambah Periode Tahun Anggaran Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingFiscalYear(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFiscalYear} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun Anggaran</label>
                  <input
                    type="number"
                    value={editingFiscalYear.year || ''}
                    onChange={(e) =>
                      setEditingFiscalYear({ ...editingFiscalYear, year: Number(e.target.value) })
                    }
                    placeholder="Contoh: 2027"
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold text-sm"
                    required
                    min={2000}
                    max={2100}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status Periode Buku</label>
                  <select
                    value={editingFiscalYear.status || 'planning'}
                    onChange={(e) =>
                      setEditingFiscalYear({ ...editingFiscalYear, status: e.target.value as any })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="active">Aktif (Tahun Berjalan)</option>
                    <option value="planning">Perencanaan RAPB (Mendatang)</option>
                    <option value="closed">Ditutup / Final (Arsip)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tema Orientasi Pelayanan HKBP
                </label>
                <input
                  type="text"
                  value={editingFiscalYear.theme || ''}
                  onChange={(e) =>
                    setEditingFiscalYear({ ...editingFiscalYear, theme: e.target.value })
                  }
                  placeholder="Contoh: Tahun Kesehatian Pelayanan & Misi HKBP"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Mulai Periode</label>
                  <input
                    type="date"
                    value={editingFiscalYear.start_date || `${editingFiscalYear.year || 2026}-01-01`}
                    onChange={(e) =>
                      setEditingFiscalYear({ ...editingFiscalYear, start_date: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Akhir Periode</label>
                  <input
                    type="date"
                    value={editingFiscalYear.end_date || `${editingFiscalYear.year || 2026}-12-31`}
                    onChange={(e) =>
                      setEditingFiscalYear({ ...editingFiscalYear, end_date: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2.5 cursor-pointer p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={editingFiscalYear.is_budget_locked || false}
                    onChange={(e) =>
                      setEditingFiscalYear({ ...editingFiscalYear, is_budget_locked: e.target.checked })
                    }
                    className="w-4 h-4 text-primary rounded-md focus:ring-primary/40"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 block">Kunci Anggaran (RAPB Terkunci)</span>
                    <span className="text-slate-500 text-[11px]">Tandai jika anggaran telah disahkan Parrapotan Huria dan tidak boleh diubah langsung</span>
                  </div>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  value={editingFiscalYear.notes || ''}
                  onChange={(e) =>
                    setEditingFiscalYear({ ...editingFiscalYear, notes: e.target.value })
                  }
                  rows={2}
                  placeholder="Catatan sidang Huria, nomor SK, atau disposisi pimpinan..."
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingFiscalYear(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-xs"
                >
                  Simpan Tahun Anggaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete Fiscal Year */}
      {deletingFiscalYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Hapus Tahun Anggaran</h3>
                <p className="text-xs text-slate-500">T.A. {deletingFiscalYear.year}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data Tahun Anggaran <strong>{deletingFiscalYear.year}</strong> ({deletingFiscalYear.theme})?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingFiscalYear(null)}
                className="px-4 py-2 text-slate-600 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteFiscalYear}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Roll-Forward Saldo Awal */}
      {showRollForwardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
                  <RotateCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Roll-Forward Saldo Kas Akhir Tahun</h3>
                  <p className="text-[11px] text-slate-500">Pindahan buku saldo kas akhir tahun ke tahun anggaran baru</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRollForwardModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Fitur ini secara otomatis menghitung <strong>saldo akhir bersih</strong> seluruh kas dan tempat penyimpanan per 31 Desember tahun sumber, dan menyalinnya sebagai <strong>saldo awal resmi</strong> pada tahun anggaran tujuan.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dari Tahun Buku</label>
                  <select
                    value={rollForwardFromYear}
                    onChange={(e) => setRollForwardFromYear(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono font-bold"
                  >
                    {fiscalYears.map((fy) => (
                      <option key={fy.id} value={fy.year}>
                        T.A. {fy.year} ({fy.status === 'closed' ? 'Arsip' : fy.year})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ke Tahun Tujuan</label>
                  <select
                    value={rollForwardToYear}
                    onChange={(e) => setRollForwardToYear(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono font-bold"
                  >
                    {fiscalYears.map((fy) => (
                      <option key={fy.id} value={fy.year}>
                        T.A. {fy.year} {fy.year === settings.active_year ? '(Aktif)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-900 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Catatan Prosedural Bendahara</span>
                </div>
                <p>
                  Saldo awal lama untuk tahun {rollForwardToYear} akan disesuaikan dengan nilai saldo kas penutupan tahun {rollForwardFromYear}.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowRollForwardModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isRollingForward || rollForwardFromYear === rollForwardToYear}
                  onClick={handleExecuteRollForward}
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRollingForward ? 'animate-spin' : ''}`} />
                  <span>{isRollingForward ? 'Memproses...' : 'Jalankan Roll-Forward'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit/Add Kas */}
      {editingKas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {editingKas.id ? 'Ubah Data Kas' : 'Tambah Kas Baru'}
              </h3>
              <button onClick={() => setEditingKas(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveKas} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kas</label>
                <input
                  type="text"
                  value={editingKas.nama || ''}
                  onChange={(e) => setEditingKas({ ...editingKas, nama: e.target.value })}
                  placeholder="Contoh: Kas Kaum Lansia"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Unik</label>
                <input
                  type="text"
                  value={editingKas.kode || ''}
                  onChange={(e) => setEditingKas({ ...editingKas, kode: e.target.value.toUpperCase() })}
                  placeholder="Contoh: KAS-LANSIA"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                  required
                />
              </div>

              {/* Fund Classification (ISAK 35) */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Klasifikasi Dana (ISAK 35)</label>
                <select
                  value={editingKas.fund_type || 'unrestricted'}
                  onChange={(e) =>
                    setEditingKas({
                      ...editingKas,
                      fund_type: e.target.value as 'unrestricted' | 'restricted',
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="unrestricted">Dana Tidak Terikat (Operasional Bebas Huria)</option>
                  <option value="restricted">Dana Terikat (Diakonia, Pembangunan, Amanah Donatur)</option>
                </select>
              </div>

              {editingKas.fund_type === 'restricted' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tujuan Pembatasan Dana</label>
                  <input
                    type="text"
                    value={editingKas.restricted_purpose || ''}
                    onChange={(e) => setEditingKas({ ...editingKas, restricted_purpose: e.target.value })}
                    placeholder="Contoh: Renovasi Pastori dan Bantuan Duka"
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Warna Pengenal Pastel</label>
                <div className="flex items-center gap-2">
                  {PASTEL_PALETTE.map((hex) => (
                    <button
                      type="button"
                      key={hex}
                      onClick={() => setEditingKas({ ...editingKas, warna: hex })}
                      className={`w-6 h-6 rounded-full border-2 ${
                        editingKas.warna === hex ? 'border-slate-800 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  value={editingKas.deskripsi || ''}
                  onChange={(e) => setEditingKas({ ...editingKas, deskripsi: e.target.value })}
                  rows={2}
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="kas_active"
                  checked={editingKas.is_active !== false}
                  onChange={(e) => setEditingKas({ ...editingKas, is_active: e.target.checked })}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
                <label htmlFor="kas_active" className="text-xs text-slate-700 font-medium">
                  Kas Aktif (dapat digunakan untuk transaksi baru)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingKas(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-xs"
                >
                  Simpan Data Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus Kas (With Data Integrity Check) */}
      {deletingKas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 border-b pb-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">Konfirmasi Hapus Data Kas</h3>
                <p className="text-xs text-slate-500">{deletingKas.nama} ({deletingKas.kode})</p>
              </div>
            </div>

            {deletingKasMetrics.canDelete ? (
              <div className="space-y-3 text-xs">
                <p className="text-slate-600">
                  Kas ini tidak memiliki catatan transaksi, saldo awal, maupun aset terkait. Apakah Anda yakin ingin menghapus data kas ini secara permanen?
                </p>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px]">
                  Pemeriksaan integritas lolos: aman dihapus permanen.
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Tidak Dapat Dihapus Permanen</span>
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Kas ini telah memiliki rekam data keuangan aktif dalam sistem:
                  </p>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5">
                    {deletingKasMetrics.txCount > 0 && <li>{deletingKasMetrics.txCount} Catatan Transaksi</li>}
                    {deletingKasMetrics.obCount > 0 && <li>{deletingKasMetrics.obCount} Saldo Awal Tahun</li>}
                    {deletingKasMetrics.assetCount > 0 && <li>{deletingKasMetrics.assetCount} Aset Inventaris Huria</li>}
                    {deletingKasMetrics.advCount > 0 && <li>{deletingKasMetrics.advCount} Panjar Kegiatan</li>}
                  </ul>
                  <p className="text-[11px] pt-1 text-slate-700">
                    Menghapus kas ini akan merusak integritas pembukuan dan laporan pertanggungjawaban huria. Sebagai gantinya, Anda dapat <strong>Menonaktifkan Kas</strong> ini agar tidak dapat digunakan untuk transaksi baru.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setDeletingKas(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold text-xs rounded-xl"
              >
                Batal
              </button>

              {deletingKasMetrics.canDelete ? (
                <button
                  type="button"
                  onClick={handleExecuteDeleteKas}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs"
                >
                  Hapus Permanen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDeactivateKas}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1"
                >
                  <ToggleLeft className="w-4 h-4" />
                  <span>Nonaktifkan Kas</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Pengguna (User Management) */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  <span>{editingProfile.id ? 'Ubah Data Pengguna / Pelayan' : 'Tambah Pengguna Baru HKBP'}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tingkat Ressort / Huria / Jemaat sesuai Aturan & Peraturan HKBP 2002 Amandemen IV
                </p>
              </div>
              <button onClick={() => setEditingProfile(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar Gerejawi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingProfile.full_name || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, full_name: e.target.value })}
                  placeholder="Contoh: St. B. Hutapea / Ny. M. Boru Tampubolon"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Alamat Email (Login) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={editingProfile.email || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, email: e.target.value })}
                    placeholder="nama@hkbp-hutaraja.org"
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
                  <input
                    type="tel"
                    value={editingProfile.phone || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, phone: e.target.value })}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Tohonan & Tingkat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tohonan Tahbisan HKBP</label>
                  <select
                    value={editingProfile.tohonan || 'sintua'}
                    onChange={(e) => setEditingProfile({ ...editingProfile, tohonan: e.target.value as TohonanType })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    {TOHONAN_LIST.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} {t.prefix ? `(${t.prefix})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tingkat Wilayah Pelayanan</label>
                  <select
                    value={editingProfile.tingkat || 'huria'}
                    onChange={(e) => setEditingProfile({ ...editingProfile, tingkat: e.target.value as HuriaLevel })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="huria">Tingkat Huria (Jemaat Lokal)</option>
                    <option value="ressort">Tingkat Ressort</option>
                  </select>
                </div>
              </div>

              {/* Peran Struktural HKBP */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Peran Struktural HKBP (Pasal 1, 4, 5, 6, 7 & 44)
                </label>
                <select
                  value={editingProfile.ecclesiastical_role || 'sintua'}
                  onChange={(e) => {
                    const chosen = e.target.value as EcclesiasticalRole;
                    const match = HKBP_ROLES.find((r) => r.key === chosen);
                    setEditingProfile({
                      ...editingProfile,
                      ecclesiastical_role: chosen,
                      tohonan: match?.defaultTohonan || editingProfile.tohonan,
                      tingkat: match?.tingkat || editingProfile.tingkat,
                      role: match?.systemRole || 'pengurus_kas',
                    });
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                >
                  {HKBP_ROLE_CATEGORIES.map((cat) => (
                    <optgroup key={cat.id} label={cat.name}>
                      {HKBP_ROLES.filter((r) => r.category === cat.id).map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Optional Section name or Wijk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Seksi / Panitia (Opsional)</label>
                  <input
                    type="text"
                    value={editingProfile.seksi_name || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, seksi_name: e.target.value })}
                    placeholder="Contoh: Seksi Sekolah Minggu"
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wijk / Sektor Lingkungan (Opsional)</label>
                  <input
                    type="text"
                    value={editingProfile.wijk || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, wijk: e.target.value })}
                    placeholder="Contoh: Wijk II / Sektor 3"
                    className="w-full p-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Advisory note for Badan Audit */}
              {['ketua_badan_audit', 'anggota_badan_audit'].includes(editingProfile.ecclesiastical_role || '') && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Prinsip Independensi Badan Audit Huria (Pasal 7 & 44)</span>
                  </div>
                  <p>
                    Anggota Badan Audit tidak boleh merangkap jabatan Bendahara Huria, Pendeta Ressort, Sekretaris Huria, atau pengurus pada kas mana pun.
                  </p>
                </div>
              )}

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="user_active"
                  checked={editingProfile.is_active !== false}
                  onChange={(e) => setEditingProfile({ ...editingProfile, is_active: e.target.checked })}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
                <label htmlFor="user_active" className="text-xs text-slate-700 font-medium">
                  Pengguna Aktif (dapat masuk dan menjalankan wewenang sistem)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 rounded-xl font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-xs"
                >
                  Simpan Data Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Pengguna */}
      {deletingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 border-b pb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900">Hapus Pengguna</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus pengguna <strong>{deletingProfile.full_name}</strong> ({deletingProfile.email})?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProfile(null)}
                className="px-4 py-2 text-slate-600 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteProfile}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
              >
                Hapus Pengguna
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit/Add Storage Account */}
      {editingStorage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {editingStorage.id ? 'Ubah Tempat Simpan' : 'Tambah Rekening / Brankas'}
              </h3>
              <button onClick={() => setEditingStorage(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveStorage} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Tempat Simpan</label>
                <input
                  type="text"
                  value={editingStorage.nama || ''}
                  onChange={(e) => setEditingStorage({ ...editingStorage, nama: e.target.value })}
                  placeholder="Contoh: Bank BNI HKBP Hutaraja"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipe</label>
                <select
                  value={editingStorage.tipe || 'bank'}
                  onChange={(e) =>
                    setEditingStorage({
                      ...editingStorage,
                      tipe: e.target.value as 'cash' | 'bank',
                    })
                  }
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="bank">Rekening Bank</option>
                  <option value="cash">Tunai / Brankas</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  value={editingStorage.nomor_rekening || ''}
                  onChange={(e) => setEditingStorage({ ...editingStorage, nomor_rekening: e.target.value })}
                  placeholder="Contoh: 109-00-1234567-8"
                  className="w-full p-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Atas Nama</label>
                <input
                  type="text"
                  value={editingStorage.atas_nama || ''}
                  onChange={(e) => setEditingStorage({ ...editingStorage, atas_nama: e.target.value })}
                  placeholder="Contoh: BPH HKBP Hutaraja"
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStorage(null)}
                  className="px-4 py-2 text-slate-600 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white font-semibold rounded-xl"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit/Add Category */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {editingCategory.id ? 'Ubah Kategori' : 'Tambah Kategori Anggaran'}
              </h3>
              <button onClick={() => setEditingCategory(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Kategori</label>
                <input
                  type="text"
                  value={editingCategory.nama || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, nama: e.target.value })}
                  placeholder="Contoh: Pelean Partangiangan Wijk"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipe Anggaran</label>
                <select
                  value={editingCategory.tipe || 'income'}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      tipe: e.target.value as 'income' | 'expense',
                    })
                  }
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="income">Pemasukan (Pelean / Persembahan)</option>
                  <option value="expense">Pengeluaran (Operasional / Pelayanan)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kode Akun</label>
                <input
                  type="text"
                  value={editingCategory.kode || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, kode: e.target.value.toUpperCase() })}
                  placeholder="Contoh: IN-01"
                  className="w-full p-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              {/* PPKU Sentralisasi Options for Income */}
              {editingCategory.tipe === 'income' && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingCategory.is_sentralisasi !== false}
                      onChange={(e) =>
                        setEditingCategory({
                          ...editingCategory,
                          is_sentralisasi: e.target.checked,
                          sentralisasi_exclusion_type: e.target.checked ? null : (editingCategory.sentralisasi_exclusion_type || 'sosial_duka'),
                        })
                      }
                      className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">
                        Objek Sentralisasi Keuangan PPKU HKBP (55% / 45%)
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        55% disetor ke Kas Pusat (BPSK) & 45% operasional lokal Huria.
                      </span>
                    </div>
                  </label>

                  {editingCategory.is_sentralisasi === false && (
                    <div className="pt-2 border-t border-blue-200/60">
                      <label className="block font-semibold text-slate-700 mb-1 text-[11px]">
                        Jenis Pengecualian PPKU (100% Bebas Sentralisasi)
                      </label>
                      <select
                        value={editingCategory.sentralisasi_exclusion_type || 'sosial_duka'}
                        onChange={(e) =>
                          setEditingCategory({
                            ...editingCategory,
                            sentralisasi_exclusion_type: e.target.value as any,
                          })
                        }
                        className="w-full p-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                      >
                        <option value="sosial_duka">Pelean Sosial / Duka (Gariana)</option>
                        <option value="beasiswa">Pelean Beasiswa (Dana Belajar)</option>
                        <option value="pembangunan_lokal">Dana Pembangunan Fisik Gereja Lokal</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-slate-600 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white font-semibold rounded-xl"
                >
                  Simpan Kategori
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit/Add Opening Balance */}
      {editingBalance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Atur Saldo Awal Tahun</h3>
              <button onClick={() => setEditingBalance(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveOpeningBalance} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Kas</label>
                <select
                  value={editingBalance.kas_id || ''}
                  onChange={(e) => setEditingBalance({ ...editingBalance, kas_id: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  required
                >
                  <option value="">Pilih Kas...</option>
                  {kasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pilih Tempat Simpan</label>
                <select
                  value={editingBalance.storage_account_id || ''}
                  onChange={(e) => setEditingBalance({ ...editingBalance, storage_account_id: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 bg-white"
                  required
                >
                  <option value="">Pilih Rekening/Brankas...</option>
                  {storageAccounts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nominal Saldo Awal (Rp)</label>
                <input
                  type="number"
                  value={editingBalance.amount || 0}
                  onChange={(e) => setEditingBalance({ ...editingBalance, amount: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={editingBalance.notes || ''}
                  onChange={(e) => setEditingBalance({ ...editingBalance, notes: e.target.value })}
                  placeholder="Contoh: Pindahan buku manual per 31 Des"
                  className="w-full p-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBalance(null)}
                  className="px-4 py-2 text-slate-600 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-white font-semibold rounded-xl"
                >
                  Simpan Saldo Awal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
