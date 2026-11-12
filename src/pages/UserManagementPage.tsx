/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Search,
  Mail,
  Phone,
  Building,
  Check,
  X,
  Plus,
  Wallet,
  Sparkles,
  UserCheck,
  UserX,
  Key,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Profile,
  TohonanType,
  EcclesiasticalRole,
  HuriaLevel,
  UserRole,
  KasAccessLevel,
} from '../types/database';
import { HKBP_ROLES, HKBP_ROLE_CATEGORIES, TOHONAN_LIST } from '../lib/hkbpRoles';

export const UserManagementPage: React.FC = () => {
  const {
    profiles,
    kasList,
    userKasAccessList,
    saveProfile,
    deleteProfile,
    toggleProfileActive,
    saveUserKasAccess,
    removeUserKasAccess,
  } = useData();

  const { currentUser, isAdmin } = useAuth();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [tohonanFilter, setTohonanFilter] = useState<string>('all');

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<Profile> | null>(null);

  const [isKasAccessModalOpen, setIsKasAccessModalOpen] = useState(false);
  const [selectedUserForKas, setSelectedUserForKas] = useState<Profile | null>(null);
  const [newKasId, setNewKasId] = useState('');
  const [newKasLevel, setNewKasLevel] = useState<KasAccessLevel>('bendahara');

  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return profiles.filter((u) => {
      // Search query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = u.full_name.toLowerCase().includes(query);
        const matchEmail = u.email.toLowerCase().includes(query);
        const matchPhone = u.phone?.toLowerCase().includes(query);
        const matchWijk = u.wijk?.toLowerCase().includes(query);
        const matchSeksi = u.seksi_name?.toLowerCase().includes(query);
        if (!matchName && !matchEmail && !matchPhone && !matchWijk && !matchSeksi) return false;
      }

      // Role filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'admin' && u.role !== 'admin') return false;
        if (roleFilter === 'bendahara_umum' && u.role !== 'bendahara_umum') return false;
        if (roleFilter === 'pendeta_ressort' && u.role !== 'pendeta_ressort') return false;
        if (roleFilter === 'sekretaris' && u.role !== 'sekretaris') return false;
        if (roleFilter === 'pengurus_kas' && u.role !== 'pengurus_kas') return false;
        if (roleFilter === 'auditor' && u.role !== 'auditor') return false;
        if (roleFilter === 'majelis' && u.role !== 'majelis') return false;
      }

      // Status filter
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;

      // Tohonan filter
      if (tohonanFilter !== 'all' && u.tohonan !== tohonanFilter) return false;

      return true;
    });
  }, [profiles, searchTerm, roleFilter, statusFilter, tohonanFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = profiles.length;
    const active = profiles.filter((p) => p.is_active).length;
    const adminCount = profiles.filter((p) => p.role === 'admin').length;
    const tahbisanCount = profiles.filter((p) => p.tohonan && p.tohonan !== 'non_tahbisan').length;
    return { total, active, adminCount, tahbisanCount };
  }, [profiles]);

  // Handlers
  const handleOpenAddModal = () => {
    setEditingProfile({
      full_name: '',
      email: '',
      phone: '',
      role: 'pengurus_kas',
      tohonan: 'sintua',
      ecclesiastical_role: 'sintua',
      tingkat: 'huria',
      wijk: 'Wijk I',
      is_active: true,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (profile: Profile) => {
    setEditingProfile({ ...profile });
    setIsEditModalOpen(true);
  };

  const handleSaveProfileForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    if (!editingProfile.full_name?.trim() || !editingProfile.email?.trim()) {
      showAlert('Nama lengkap dan alamat email wajib diisi.', 'error');
      return;
    }

    const res = await saveProfile(editingProfile);
    if (res.success) {
      showAlert(
        editingProfile.id ? 'Data pengguna berhasil diperbarui!' : 'Pengguna baru berhasil ditambahkan!'
      );
      setIsEditModalOpen(false);
      setEditingProfile(null);
    } else {
      showAlert(res.error || 'Gagal menyimpan data pengguna.', 'error');
    }
  };

  const handleToggleStatus = async (user: Profile) => {
    if (user.id === currentUser?.id) {
      showAlert('Anda tidak dapat menonaktifkan akun yang sedang aktif digunakan saat ini.', 'error');
      return;
    }
    const res = await toggleProfileActive(user.id);
    if (res.success) {
      showAlert(`Status pengguna ${user.full_name} berhasil diubah.`);
    } else {
      showAlert(res.error || 'Gagal memperbarui status pengguna.', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    if (deletingUser.id === currentUser?.id) {
      showAlert('Anda tidak dapat menghapus akun Anda sendiri.', 'error');
      setDeletingUser(null);
      return;
    }

    const res = await deleteProfile(deletingUser.id);
    if (res.success) {
      showAlert(`Pengguna ${deletingUser.full_name} berhasil dihapus.`);
      setDeletingUser(null);
    } else {
      showAlert(res.error || 'Gagal menghapus pengguna.', 'error');
    }
  };

  const handleOpenKasAccessModal = (user: Profile) => {
    setSelectedUserForKas(user);
    const availableKas = kasList[0]?.id || '';
    setNewKasId(availableKas);
    setNewKasLevel('bendahara');
    setIsKasAccessModalOpen(true);
  };

  const handleAddKasAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForKas || !newKasId) return;

    try {
      await saveUserKasAccess({
        user_id: selectedUserForKas.id,
        kas_id: newKasId,
        access_level: newKasLevel,
      });
      showAlert(`Hak akses kas berhasil ditambahkan untuk ${selectedUserForKas.full_name}.`);
    } catch (err: any) {
      showAlert(err?.message || 'Gagal menambahkan hak akses kas.', 'error');
    }
  };

  const handleRemoveKasAccess = async (accessId: string) => {
    try {
      await removeUserKasAccess(accessId);
      showAlert('Hak akses kas berhasil dihapus.');
    } catch (err: any) {
      showAlert(err?.message || 'Gagal menghapus akses kas.', 'error');
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
            <Shield className="w-3 h-3 text-rose-600" />
            <span>Administrator</span>
          </span>
        );
      case 'bendahara_umum':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Bendahara Umum</span>
          </span>
        );
      case 'pendeta_ressort':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1">
            <Building className="w-3 h-3 text-purple-600" />
            <span>Pendeta Ressort</span>
          </span>
        );
      case 'sekretaris':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">
            <span>Sekretaris Huria</span>
          </span>
        );
      case 'auditor':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Badan Audit</span>
          </span>
        );
      case 'majelis':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <span>Majelis Huria</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300 flex items-center gap-1">
            <Wallet className="w-3 h-3 text-teal-600" />
            <span>Pengurus Kas</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto min-w-0 overflow-hidden pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <span>Panel Manajemen Akun & Hak Akses SIKU HKBP</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Manajemen Pengguna & Pelayan Gereja
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Kelola data pelayan, penugasan bendahara dan ketua seksi, wewenang persetujuan, serta akun administrator sistem
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-all active:scale-98 self-start sm:self-auto shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Pengguna Baru</span>
          </button>
        )}
      </div>

      {alertMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
            alertMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {alertMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{alertMsg.text}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Total Pengguna</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Terdaftar di sistem SIKU</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Pengguna Aktif</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-2">{stats.active}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Dapat login & beraktivitas</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Pelayan Tahbisan</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-purple-700 mt-2">{stats.tahbisanCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Pendeta, Sintua, Diakones, dll.</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Administrator</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-700 mt-2">{stats.adminCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Hak penuh konfigurasi sistem</div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama, email, no HP, wijk..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20 text-xs"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white"
            >
              <option value="all">Semua Peran Sistem</option>
              <option value="admin">Administrator Sistem</option>
              <option value="bendahara_umum">Bendahara Umum Huria</option>
              <option value="pendeta_ressort">Pendeta Ressort</option>
              <option value="sekretaris">Sekretaris Huria</option>
              <option value="pengurus_kas">Pengurus Kas (Bendahara/Ketua Seksi)</option>
              <option value="auditor">Badan Audit Huria</option>
              <option value="majelis">Majelis Huria / Parartaon</option>
            </select>
          </div>

          {/* Tohonan Filter */}
          <div>
            <select
              value={tohonanFilter}
              onChange={(e) => setTohonanFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white"
            >
              <option value="all">Semua Tohonan HKBP</option>
              {TOHONAN_LIST.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white"
            >
              <option value="all">Semua Status Akun</option>
              <option value="active">🟢 Hanya Aktif</option>
              <option value="inactive">⚪ Hanya Non-aktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((u) => {
          const userAccesses = userKasAccessList.filter((a) => a.user_id === u.id);
          const tohonanObj = TOHONAN_LIST.find((t) => t.id === u.tohonan);
          const isMe = u.id === currentUser?.id;

          return (
            <div
              key={u.id}
              className={`bg-white rounded-2xl border p-5 shadow-2xs flex flex-col justify-between space-y-4 transition-all hover:shadow-md ${
                u.is_active ? 'border-slate-200/90' : 'border-slate-200/60 bg-slate-50/50 opacity-75'
              }`}
            >
              <div className="space-y-3">
                {/* Top header: Avatar, Name & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                        u.role === 'admin'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : u.role === 'bendahara_umum'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : u.role === 'pendeta_ressort'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {u.full_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900 truncate">{u.full_name}</h4>
                        {isMe && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                            Saya
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                    </div>
                  </div>

                  <div>{getRoleBadge(u.role)}</div>
                </div>

                {/* Details Pills */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1">
                  <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium">
                    {tohonanObj?.label || 'Non-Tahbisan'}
                  </span>
                  {u.wijk && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-medium">
                      {u.wijk}
                    </span>
                  )}
                  {u.phone && (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-medium flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                      <span>{u.phone}</span>
                    </span>
                  )}
                </div>

                {/* Kas Access Summary */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-primary" />
                      <span>Hak Akses Kas Huria:</span>
                    </span>
                    <span className="text-slate-400">{userAccesses.length} Kas</span>
                  </div>

                  {userAccesses.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {userAccesses.map((acc) => {
                        const targetKas = kasList.find((k) => k.id === acc.kas_id);
                        return (
                          <span
                            key={acc.id}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                              acc.access_level === 'ketua'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {targetKas?.nama || acc.kas_id} ({acc.access_level === 'ketua' ? 'Ketua' : 'Bendahara'})
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic block">
                      {u.role === 'admin'
                        ? 'Akses penuh ke semua kas (Admin)'
                        : 'Belum ada kas spesifik yang ditugaskan'}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              {isAdmin && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(u)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 flex items-center gap-1 transition-colors"
                      title="Ubah data pengguna"
                    >
                      <Edit2 className="w-3 h-3 text-slate-500" />
                      <span>Ubah</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenKasAccessModal(u)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200 flex items-center gap-1 transition-colors"
                      title="Atur penugasan kas"
                    >
                      <Wallet className="w-3 h-3 text-blue-600" />
                      <span>Akses Kas</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      className={`p-1.5 rounded-lg border text-xs transition-colors ${
                        u.is_active
                          ? 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                          : 'text-slate-400 hover:bg-slate-100 border-slate-200'
                      }`}
                      title={u.is_active ? 'Klik untuk non-aktifkan' : 'Klik untuk aktifkan'}
                    >
                      {u.is_active ? <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> : <UserX className="w-3.5 h-3.5" />}
                    </button>

                    {u.id !== 'user-admin' && u.id !== 'user-superadmin' && (
                      <button
                        type="button"
                        onClick={() => setDeletingUser(u)}
                        disabled={isMe}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs transition-colors disabled:opacity-40"
                        title="Hapus pengguna"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-slate-800 text-sm">Tidak ada data pengguna yang cocok</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau sesuaikan filter peran dan tohonan di atas.
          </p>
        </div>
      )}

      {/* ---------------- MODAL TAMBAH / UBAH PENGGUNA ---------------- */}
      {isEditModalOpen && editingProfile && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 text-xs">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <UserCheck className="w-4 h-4" />
                <span>{editingProfile.id ? 'Ubah Data Pengguna / Pelayan' : 'Tambah Pengguna Baru'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfileForm} className="p-5 space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap (beserta Gelar / Tohonan) *
                </label>
                <input
                  type="text"
                  value={editingProfile.full_name || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, full_name: e.target.value })}
                  placeholder="Contoh: St. B. Hutapea, SE"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary/20 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alamat Email (Akun Login) *</label>
                  <input
                    type="email"
                    value={editingProfile.email || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, email: e.target.value })}
                    placeholder="nama@hkbp-hutaraja.org"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
                  <input
                    type="tel"
                    value={editingProfile.phone || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, phone: e.target.value })}
                    placeholder="0812-3456-7890"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Peran Akses Sistem *</label>
                  <select
                    value={editingProfile.role || 'pengurus_kas'}
                    onChange={(e) => setEditingProfile({ ...editingProfile, role: e.target.value as UserRole })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary/20 font-semibold"
                  >
                    <option value="pengurus_kas">Pengurus Kas (Bendahara/Ketua)</option>
                    <option value="bendahara_umum">Bendahara Umum Huria</option>
                    <option value="pendeta_ressort">Pendeta Ressort</option>
                    <option value="sekretaris">Sekretaris Huria</option>
                    <option value="auditor">Badan Audit Huria</option>
                    <option value="admin">Administrator Sistem</option>
                    <option value="majelis">Majelis Huria (Read Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tohonan HKBP</label>
                  <select
                    value={editingProfile.tohonan || 'sintua'}
                    onChange={(e) => setEditingProfile({ ...editingProfile, tohonan: e.target.value as TohonanType })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary/20"
                  >
                    {TOHONAN_LIST.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tingkat Pelayanan</label>
                  <select
                    value={editingProfile.tingkat || 'huria'}
                    onChange={(e) => setEditingProfile({ ...editingProfile, tingkat: e.target.value as HuriaLevel })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="huria">Huria (Jemaat Lokal)</option>
                    <option value="ressort">Ressort</option>
                    <option value="pos_pelayanan">Pos Pelayanan / Parmingguon</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wijk / Sektor Lingkungan</label>
                  <input
                    type="text"
                    value={editingProfile.wijk || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, wijk: e.target.value })}
                    placeholder="Contoh: Wijk I, Wijk II"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jabatan Spesifik / Seksi Kategorial</label>
                <input
                  type="text"
                  value={editingProfile.seksi_name || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, seksi_name: e.target.value })}
                  placeholder="Contoh: Dewan Diakonia, Sekolah Minggu, Panitia Pembangunan"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={editingProfile.is_active !== false}
                  onChange={(e) => setEditingProfile({ ...editingProfile, is_active: e.target.checked })}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
                <label htmlFor="userActiveCheck" className="text-xs font-semibold text-slate-700">
                  Akun Aktif (Dapat masuk ke aplikasi dan mengakses sistem)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Pengguna</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL KELOLA AKSES KAS ---------------- */}
      {isKasAccessModalOpen && selectedUserForKas && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 text-xs">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Wallet className="w-4 h-4" />
                <span>Atur Hak Akses Kas: {selectedUserForKas.full_name}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsKasAccessModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Form Tambah Akses */}
              <form onSubmit={handleAddKasAccess} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5 text-primary" />
                  <span>Tugaskan Kas Baru:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pilih Kas Huria</label>
                    <select
                      value={newKasId}
                      onChange={(e) => setNewKasId(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                      required
                    >
                      {kasList.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.nama} ({k.kode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tingkat Wewenang</label>
                    <select
                      value={newKasLevel}
                      onChange={(e) => setNewKasLevel(e.target.value as KasAccessLevel)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    >
                      <option value="bendahara">Bendahara (Catat Transaksi)</option>
                      <option value="ketua">Ketua (Penyetuju / Approval)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambahkan Akses</span>
                  </button>
                </div>
              </form>

              {/* Daftar Akses Saat Ini */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700">Daftar Kas yang Ditugaskan:</div>
                {userKasAccessList.filter((a) => a.user_id === selectedUserForKas.id).length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                    Pengguna ini belum memiliki penugasan kas khusus.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userKasAccessList
                      .filter((a) => a.user_id === selectedUserForKas.id)
                      .map((acc) => {
                        const targetKas = kasList.find((k) => k.id === acc.kas_id);
                        return (
                          <div
                            key={acc.id}
                            className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: targetKas?.warna || '#3B82F6' }}
                              />
                              <div>
                                <span className="font-bold text-slate-800 text-xs block">
                                  {targetKas?.nama || acc.kas_id}
                                </span>
                                <span className="text-[11px] text-slate-500 capitalize">
                                  Wewenang: <strong>{acc.access_level === 'ketua' ? 'Ketua Pengesah' : 'Bendahara Kas'}</strong>
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveKasAccess(acc.id)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                              title="Cabut akses"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsKasAccessModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL KONFIRMASI HAPUS ---------------- */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Konfirmasi Hapus Pengguna</h3>
                <p className="text-slate-500 text-[11px]">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-slate-700 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun pengguna{' '}
              <strong className="text-slate-900">{deletingUser.full_name}</strong> ({deletingUser.email})?
              Hak akses ke kas dan wewenang persetujuan yang dimiliki pengguna ini akan dicabut.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-xs"
              >
                Ya, Hapus Pengguna
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
