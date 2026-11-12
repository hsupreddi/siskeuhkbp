/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Shield, Lock, Phone, Mail, CheckCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export const ProfilePage: React.FC = () => {
  const { currentUser, userKasAccess } = useAuth();
  const { kasList } = useData();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setPasswordMsg('Kata sandi berhasil diperbarui.');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setTimeout(() => setPasswordMsg(''), 4000);
  };

  return (
    <div className="space-y-6 w-full max-w-3xl mx-auto min-w-0 overflow-hidden">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          Profil Pengguna
        </h2>
        <p className="text-xs md:text-sm text-slate-500">
          Informasi akun dan hak akses penugasan kas Anda di HKBP Hutaraja
        </p>
      </div>

      {/* Profile Details Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold text-xl">
            {currentUser?.full_name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900">{currentUser?.full_name}</h3>
            <span className="text-xs text-primary font-semibold uppercase tracking-wider block mt-0.5">
              {currentUser?.role.replace('_', ' ')}
            </span>
            <span className="text-xs text-slate-400">{currentUser?.email}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="w-4 h-4 text-slate-400" />
            <span>Email: <strong>{currentUser?.email}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>Telepon: <strong>{currentUser?.phone || '-'}</strong></span>
          </div>
        </div>
      </div>

      {/* Assigned Kas Access */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
          <Shield className="w-4 h-4" />
          <span>Penugasan Kas Seksi / Sektor Anda</span>
        </div>

        {userKasAccess.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">
            Anda belum ditugaskan pada kas seksi spesifik (menggunakan hak akses global peran).
          </p>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {userKasAccess.map((uka) => {
              const kas = kasList.find((k) => k.id === uka.kas_id);
              return (
                <div key={uka.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: kas?.warna || '#7C9CF5' }}
                    />
                    <span className="font-semibold text-slate-800">{kas?.nama}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({kas?.kode})</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      uka.access_level === 'ketua'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    Wewenang: {uka.access_level}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Change Password Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <KeyRound className="w-4 h-4 text-primary" />
          <span>Ganti Kata Sandi (Password)</span>
        </div>

        {passwordMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passwordMsg}</span>
          </div>
        )}

        {errorMsg && (
          <p className="text-xs text-rose-500">{errorMsg}</p>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 text-xs max-w-md">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full p-2.5 rounded-xl border border-slate-200"
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi kata sandi baru"
              className="w-full p-2.5 rounded-xl border border-slate-200"
              required
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors shadow-xs"
          >
            Simpan Kata Sandi
          </button>
        </form>
      </div>
    </div>
  );
};
