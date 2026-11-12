/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ReceiptText,
  CheckSquare,
  FileSpreadsheet,
  Lock,
  Database,
  History,
  Settings,
  User,
  LogOut,
  Plus,
  ArrowRightLeft,
  ChevronDown,
  Menu,
  X,
  Church,
  Shield,
  Sparkles,
  Calculator,
  BookOpen,
  FolderArchive,
  HelpCircle,
  ShieldCheck,
  Search,
  Landmark,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { TransactionModal } from '../transactions/TransactionModal';
import { TransferModal } from '../transactions/TransferModal';

export const AppLayout: React.FC = () => {
  const {
    currentUser,
    switchDemoUser,
    availableDemoUsers,
    logout,
    isLeader,
    isAdmin,
    isBendaharaUmum,
    isAuditor,
    isPendeta,
    isSekretaris,
    isMajelis,
    isPengurusKas,
    canRecordTransactions,
    canTransfer,
    canApprove,
    canAudit,
    canClosePeriod,
    canManageSettings,
    canManageMasterData,
  } = useAuth();
  const { getPendingTransactionsCount, settings, auditFindings } = useData();
  const navigate = useNavigate();
  const location = useLocation();

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRolePickerOpen, setIsRolePickerOpen] = useState(false);
  const [isDesktopRolePickerOpen, setIsDesktopRolePickerOpen] = useState(false);

  const pendingCount = getPendingTransactionsCount();
  const openFindingsCount = auditFindings.filter(
    (f) => f.status === 'terbuka' || f.status === 'ditanggapi'
  ).length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      exact: true,
      allowed: true,
    },
    {
      to: '/transactions',
      label: 'Transaksi Kas',
      icon: ReceiptText,
      allowed: true,
    },
    {
      to: '/budget',
      label: 'Anggaran (APBG)',
      icon: Calculator,
      allowed: true,
    },
    {
      to: '/opening-balance',
      label: 'Pembukaan Buku',
      icon: BookOpen,
      allowed: !isAuditor && !isMajelis,
    },
    {
      to: '/approvals',
      label: 'Persetujuan Ketua',
      icon: CheckSquare,
      badge: pendingCount > 0 ? pendingCount : null,
      allowed: canApprove || isAdmin,
    },
    {
      to: '/reports',
      label: 'Laporan & LPJ ISAK 35',
      icon: FileSpreadsheet,
      allowed: true,
    },
    {
      to: '/reports?tab=bpsk',
      label: 'Sentralisasi BPSK (55/45)',
      icon: Landmark,
      allowed: true,
    },
    {
      to: '/lpj-data',
      label: 'Data Pendukung LPJ',
      icon: FolderArchive,
      allowed: true,
    },
    {
      to: '/audit',
      label: 'Badan Audit Huria',
      icon: Shield,
      badge: openFindingsCount > 0 ? openFindingsCount : null,
      allowed: isAuditor || isAdmin || isLeader,
    },
    {
      to: '/closing',
      label: 'Tutup Buku',
      icon: Lock,
      allowed: canClosePeriod || isAdmin,
    },
    {
      to: '/master',
      label: 'Data Master',
      icon: Database,
      allowed: canManageMasterData || isAdmin,
    },
    {
      to: '/audit-logs',
      label: 'Audit Trail',
      icon: History,
      allowed: isAdmin || isBendaharaUmum || isPendeta || isSekretaris || isAuditor,
    },
    {
      to: '/settings',
      label: 'Pengaturan Kop & DB',
      icon: Settings,
      allowed: canManageSettings,
    },
    {
      to: '/guide',
      label: 'Buku Panduan',
      icon: HelpCircle,
      allowed: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col w-full overflow-x-hidden">
      {/* ---------------- Desktop Sidebar (Modern Executive Prussian Navy) ---------------- */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0B132B] border-r border-slate-800/90 fixed inset-y-0 left-0 z-30 shadow-md">
        {/* Church Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800/80 text-amber-400 shadow-inner flex items-center justify-center shrink-0">
            <Church className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-white text-sm leading-tight truncate">
              {settings.church_name}
            </h1>
            <p className="text-[11px] font-medium text-slate-400 truncate">SIKU HKBP Hutaraja · PPKU</p>
          </div>
        </div>

        {/* Action Buttons tailored by Role & Authority */}
        <div className="p-3.5 space-y-2">
          {canRecordTransactions ? (
            <>
              <button
                onClick={() => setIsTxModalOpen(true)}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Transaksi</span>
              </button>
              {canTransfer && (
                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="w-full py-2 px-4 bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-slate-800 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                  <span>Transfer Antar Kas</span>
                </button>
              )}
            </>
          ) : isAuditor ? (
            <>
              <NavLink
                to="/audit"
                className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 text-center"
              >
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span>Modul Pemeriksaan Audit</span>
              </NavLink>
              <NavLink
                to="/transactions"
                className="w-full py-2 px-4 bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-slate-800 transition-colors text-center"
              >
                <Search className="w-3.5 h-3.5 text-purple-400" />
                <span>Uji Bukti Transaksi</span>
              </NavLink>
            </>
          ) : isPendeta ? (
            <>
              <NavLink
                to="/approvals"
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 text-center"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Otorisasi & Persetujuan {pendingCount > 0 ? `(${pendingCount})` : ''}</span>
              </NavLink>
              <NavLink
                to="/reports"
                className="w-full py-2 px-4 bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-slate-800 transition-colors text-center"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                <span>Tinjau LPJ Konsolidasi</span>
              </NavLink>
            </>
          ) : isSekretaris ? (
            <>
              <NavLink
                to="/reports"
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 text-center"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Materi Warta & LPJ</span>
              </NavLink>
              <NavLink
                to="/budget"
                className="w-full py-2 px-4 bg-slate-900/90 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-slate-800 transition-colors text-center"
              >
                <Calculator className="w-3.5 h-3.5 text-blue-400" />
                <span>Dokumen APBG Tahunan</span>
              </NavLink>
            </>
          ) : (
            <NavLink
              to="/reports"
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 text-center"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span>Pantau Laporan Keuangan</span>
            </NavLink>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems
            .filter((item) => item.allowed)
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) => {
                    const isCustomActive = item.to.includes('tab=bpsk')
                      ? location.pathname === '/reports' && location.search.includes('tab=bpsk')
                      : item.to === '/reports'
                      ? location.pathname === '/reports' && !location.search.includes('tab=bpsk')
                      : isActive;
                    return `flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                      isCustomActive
                        ? 'bg-slate-800/90 text-white font-semibold border-l-2 border-blue-500 shadow-xs'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/70'
                    }`;
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge !== null && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500 text-white shadow-2xs">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
        </nav>

        {/* User Card & Demo Switcher in Desktop Sidebar */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80">
          <div className="relative">
            <button
              onClick={() => setIsRolePickerOpen(!isRolePickerOpen)}
              className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-colors shadow-2xs text-left"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800 text-blue-200 font-bold text-xs flex items-center justify-center shrink-0">
                  {currentUser?.full_name.substring(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {currentUser?.full_name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium capitalize truncate flex items-center gap-1">
                    <Shield className="w-3 h-3 text-blue-400" />
                    <span>{currentUser?.role.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {/* Quick Demo Switcher Popup */}
            {isRolePickerOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full bg-slate-900 rounded-xl shadow-2xl border border-slate-800 p-2 z-40 max-h-72 overflow-y-auto space-y-1">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Ganti Peran Uji Coba:
                </div>
                {availableDemoUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      switchDemoUser(u.id);
                      setIsRolePickerOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex flex-col ${
                      currentUser?.id === u.id ? 'bg-blue-950 text-blue-200 font-bold border border-blue-800' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="truncate">{u.full_name}</span>
                    <span className="text-[10px] text-slate-400 capitalize">{u.role.replace('_', ' ')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between pt-1">
            <NavLink
              to="/profile"
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>Profil</span>
            </NavLink>
            <NavLink
              to="/guide"
              className="text-[11px] text-slate-300 hover:text-white font-medium flex items-center gap-1 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Panduan</span>
            </NavLink>
            <button
              onClick={handleLogout}
              className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ---------------- Main Content Column with Desktop Sidebar Offset ---------------- */}
      <div className="md:pl-64 flex flex-col min-h-screen w-full min-w-0">
        {/* ---------------- Desktop Sleek Top Header Bar ---------------- */}
        <header className="hidden md:flex items-center justify-between gap-6 px-8 py-3.5 bg-white/90 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">SIKU HKBP Hutaraja</span>
              <span className="text-slate-300">/</span>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                {(
                  navItems.find((item) => {
                    if (location.search.includes('tab=bpsk')) {
                      return item.to.includes('tab=bpsk');
                    }
                    if (item.to.includes('?')) return false;
                    return item.exact
                      ? location.pathname === item.to
                      : item.to !== '/' && location.pathname.startsWith(item.to);
                  }) || navItems[0]
                ).label}
              </h2>
            </div>
            <span className="text-slate-300">·</span>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>T.A. {settings.active_year} · Basis Kas Dimodifikasi (ISAK 35)</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 relative">
            <NavLink
              to="/guide"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Panduan</span>
            </NavLink>

            {canTransfer && (
              <button
                onClick={() => setIsTransferModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300/80 transition-all flex items-center gap-1.5 shadow-2xs active:scale-98"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                <span>Transfer Kas</span>
              </button>
            )}

            {canRecordTransactions && (
              <button
                onClick={() => setIsTxModalOpen(true)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all flex items-center gap-1.5 active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Catat Transaksi</span>
              </button>
            )}

            {isAuditor && (
              <NavLink
                to="/audit"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 shadow-xs transition-all flex items-center gap-1.5 active:scale-98"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>Modul Audit</span>
              </NavLink>
            )}

            {isPendeta && (
              <NavLink
                to="/approvals"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs transition-all flex items-center gap-1.5 active:scale-98"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Persetujuan {pendingCount > 0 ? `(${pendingCount})` : ''}</span>
              </NavLink>
            )}

            {isSekretaris && (
              <NavLink
                to="/reports"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-xs transition-all flex items-center gap-1.5 active:scale-98"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Materi Warta</span>
              </NavLink>
            )}

            <div className="h-4 w-px bg-slate-200 mx-1" />

            {/* Quick Role Switcher Button & Dropdown on Desktop Top Bar */}
            <div className="relative">
              <button
                onClick={() => setIsDesktopRolePickerOpen(!isDesktopRolePickerOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
                title="Ganti Peran Uji Coba"
              >
                <div className="w-5 h-5 rounded-md bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {currentUser?.full_name.substring(0, 1)}
                </div>
                <span className="max-w-[130px] truncate">{currentUser?.full_name}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isDesktopRolePickerOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 max-h-80 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Pilih Akun Simulasi Peran:
                  </div>
                  {availableDemoUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchDemoUser(u.id);
                        setIsDesktopRolePickerOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex justify-between items-center ${
                        currentUser?.id === u.id ? 'bg-slate-100 text-slate-900 font-bold border border-slate-300' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <span className="block font-medium truncate">{u.full_name}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{u.role.replace('_', ' ')}</span>
                      </div>
                      {currentUser?.id === u.id && <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ---------------- Mobile Top Header ---------------- */}
        <header className="md:hidden bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 py-3 flex items-center justify-between w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Church className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-xs text-slate-900 leading-tight">HKBP Hutaraja</h1>
            <p className="text-[10px] text-slate-500">SIKU Keuangan</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick role badge button on mobile */}
          <button
            onClick={() => setIsRolePickerOpen(!isRolePickerOpen)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1"
          >
            <span>{currentUser?.role.replace('_', ' ')}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Role Picker Dropdown */}
        {isRolePickerOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 p-3 shadow-lg z-40 max-h-80 overflow-y-auto space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Pilih Akun Simulasi Peran:
            </div>
            {availableDemoUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  switchDemoUser(u.id);
                  setIsRolePickerOpen(false);
                }}
                className={`w-full text-left p-2.5 rounded-lg text-xs flex justify-between items-center ${
                  currentUser?.id === u.id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-slate-50'
                }`}
              >
                <div>
                  <span className="block">{u.full_name}</span>
                  <span className="text-[10px] text-slate-400 capitalize">{u.role.replace('_', ' ')}</span>
                </div>
                {currentUser?.id === u.id && <Sparkles className="w-3.5 h-3.5 text-primary" />}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 bottom-16 bg-white z-40 p-4 overflow-y-auto space-y-2 border-b border-slate-200">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {canRecordTransactions ? (
              <>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsTxModalOpen(true);
                  }}
                  className="p-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>Catat Transaksi</span>
                </button>
                {canTransfer && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsTransferModalOpen(true);
                    }}
                    className="p-3 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-indigo-200"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Transfer Kas</span>
                  </button>
                )}
              </>
            ) : isAuditor ? (
              <>
                <NavLink
                  to="/audit"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-3 bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm text-center"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Modul Audit</span>
                </NavLink>
                <NavLink
                  to="/transactions"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-3 bg-purple-50 text-purple-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-purple-200 text-center"
                >
                  <Search className="w-4 h-4" />
                  <span>Uji Bukti</span>
                </NavLink>
              </>
            ) : isPendeta ? (
              <>
                <NavLink
                  to="/approvals"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-3 bg-amber-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm text-center"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Persetujuan {pendingCount > 0 ? `(${pendingCount})` : ''}</span>
                </NavLink>
                <NavLink
                  to="/reports"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-3 bg-amber-50 text-amber-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-amber-200 text-center"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>LPJ Huria</span>
                </NavLink>
              </>
            ) : (
              <>
                <NavLink
                  to="/reports"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-3 bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm text-center"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Laporan Huria</span>
                </NavLink>
                <NavLink
                  to="/budget"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-3 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-indigo-200 text-center"
                >
                  <Calculator className="w-4 h-4" />
                  <span>APBG Tahunan</span>
                </NavLink>
              </>
            )}
          </div>

          <div className="space-y-1">
            {navItems
              .filter((item) => item.allowed)
              .map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => {
                      const isCustomActive = item.to.includes('tab=bpsk')
                        ? location.pathname === '/reports' && location.search.includes('tab=bpsk')
                        : item.to === '/reports'
                        ? location.pathname === '/reports' && !location.search.includes('tab=bpsk')
                        : isActive;
                      return `flex items-center justify-between p-3 rounded-xl text-xs ${
                        isCustomActive ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`;
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <NavLink
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-xs text-slate-600 flex items-center gap-1.5"
            >
              <User className="w-4 h-4" />
              <span>Profil Pengguna</span>
            </NavLink>
            <button
              onClick={handleLogout}
              className="text-xs text-rose-600 flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------- Main Content Viewport ---------------- */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-10 w-full max-w-7xl mx-auto min-w-0">
        <Outlet />
      </main>
    </div>

      {/* ---------------- Mobile Bottom Navigation Bar ---------------- */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 px-3 py-2 flex items-center justify-around shadow-lg">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] min-w-[50px] ${
              isActive ? 'text-primary font-semibold' : 'text-slate-500'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Beranda</span>
        </NavLink>

        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] min-w-[50px] ${
              isActive ? 'text-primary font-semibold' : 'text-slate-500'
            }`
          }
        >
          <ReceiptText className="w-5 h-5" />
          <span>Transaksi</span>
        </NavLink>

        {/* Center Action Button on Mobile */}
        {canRecordTransactions ? (
          <button
            onClick={() => setIsTxModalOpen(true)}
            className="w-12 h-12 -mt-5 rounded-full bg-primary hover:bg-primary-dark text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            title="Catat Transaksi"
          >
            <Plus className="w-6 h-6" />
          </button>
        ) : isAuditor ? (
          <NavLink
            to="/audit"
            className="w-12 h-12 -mt-5 rounded-full bg-purple-700 hover:bg-purple-800 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            title="Modul Audit Huria"
          >
            <ShieldCheck className="w-6 h-6" />
          </NavLink>
        ) : isPendeta ? (
          <NavLink
            to="/approvals"
            className="w-12 h-12 -mt-5 rounded-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            title="Persetujuan Transaksi"
          >
            <CheckSquare className="w-6 h-6" />
          </NavLink>
        ) : (
          <NavLink
            to="/reports"
            className="w-12 h-12 -mt-5 rounded-full bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            title="Laporan Keuangan"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </NavLink>
        )}

        {/* Tab 4: Role-based navigation */}
        {isAuditor ? (
          <NavLink
            to="/audit"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] min-w-[50px] relative ${
                isActive ? 'text-purple-700 font-bold' : 'text-slate-500'
              }`
            }
          >
            <div className="relative">
              <Shield className="w-5 h-5" />
              {openFindingsCount > 0 && (
                <span className="absolute -top-1 -right-2 w-4 h-4 bg-purple-600 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                  {openFindingsCount}
                </span>
              )}
            </div>
            <span>Audit</span>
          </NavLink>
        ) : canApprove || isAdmin ? (
          <NavLink
            to="/approvals"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] min-w-[50px] relative ${
                isActive ? 'text-primary font-semibold' : 'text-slate-500'
              }`
            }
          >
            <div className="relative">
              <CheckSquare className="w-5 h-5" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-2 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </div>
            <span>Antrean</span>
          </NavLink>
        ) : (
          <NavLink
            to="/budget"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-[10px] min-w-[50px] ${
                isActive ? 'text-primary font-semibold' : 'text-slate-500'
              }`
            }
          >
            <Calculator className="w-5 h-5" />
            <span>APBG</span>
          </NavLink>
        )}

        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] min-w-[50px] ${
              isActive ? 'text-primary font-semibold' : 'text-slate-500'
            }`
          }
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span>Laporan</span>
        </NavLink>
      </nav>

      {/* Global Modals */}
      <TransactionModal isOpen={isTxModalOpen} onClose={() => setIsTxModalOpen(false)} />
      <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} />
    </div>
  );
};
