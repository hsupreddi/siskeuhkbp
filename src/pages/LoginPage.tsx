/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Church, Lock, Mail, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_PROFILES } from '../lib/demoData';

export const LoginPage: React.FC = () => {
  const { loginWithEmail, switchDemoUser } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await loginWithEmail(email, password);
    setLoading(false);

    if (res.error) {
      setError(res.error.message || 'Gagal masuk. Periksa kembali email dan kata sandi Anda.');
    } else {
      navigate('/');
    }
  };

  const handleQuickDemoLogin = (userId: string) => {
    switchDemoUser(userId);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Church className="w-9 h-9" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          SIKU HKBP Hutaraja
        </h2>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Sistem Informasi Keuangan HKBP Ressort Hutaraja
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-xl rounded-2xl border border-slate-200/80 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alamat Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hsupreddi@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kata Sandi (Password)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 active:scale-98"
            >
              <span>{loading ? 'Memverifikasi...' : 'Masuk ke Sistem'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick 1-Click Role Login Selector for Immediate Preview & Testing */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Masuk Cepat Mode Uji Coba:</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {DEMO_PROFILES.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleQuickDemoLogin(p.id)}
                  className="w-full text-left p-2 rounded-xl border border-slate-100 hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-between text-xs"
                >
                  <div className="overflow-hidden">
                    <span className="font-semibold text-slate-800 block truncate">{p.full_name}</span>
                    <span className="text-[10px] text-slate-400 capitalize">{p.role.replace('_', ' ')}</span>
                  </div>
                  <span className="text-[10px] font-bold text-primary shrink-0">Pilih →</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Akun dibuat dan diundang secara resmi oleh Admin HKBP Hutaraja.
        </p>
      </div>
    </div>
  );
};
