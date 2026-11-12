/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Settings,
  Save,
  CheckCircle,
  Church,
  ShieldCheck,
  AlertCircle,
  RotateCcw,
  Database,
  Key,
  Server,
  Copy,
  Download,
  ExternalLink,
  RefreshCw,
  Unlink,
  FileCode,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { formatRupiah } from '../lib/formatters';
import {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured,
  setSupabaseCredentials,
  clearSupabaseCredentials,
  testSupabaseConnection,
} from '../lib/supabase';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetAllTransactionsAndBalancesToZero } = useData();
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({ ...settings });
  const [successMsg, setSuccessMsg] = useState(false);

  // Supabase Connection State
  const [sbUrl, setSbUrl] = useState(supabaseUrl || '');
  const [sbKey, setSbKey] = useState(supabaseAnonKey || '');
  const [testingSb, setTestingSb] = useState(false);
  const [sbStatusMsg, setSbStatusMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(formData);
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 3000);
  };

  const handleTestAndSaveSupabase = async () => {
    if (!sbUrl.trim() || !sbKey.trim()) {
      setSbStatusMsg({
        success: false,
        text: 'Harap isi Project URL dan Anon Key Supabase terlebih dahulu.',
      });
      return;
    }

    setTestingSb(true);
    setSbStatusMsg(null);

    // Save temporarily in localStorage to test live connection
    if (typeof window !== 'undefined') {
      localStorage.setItem('siku_supabase_url', sbUrl.trim());
      localStorage.setItem('siku_supabase_anon_key', sbKey.trim());
    }

    const test = await testSupabaseConnection();
    setTestingSb(false);

    if (test.success) {
      setSbStatusMsg({ success: true, text: test.message });
      setTimeout(() => {
        setSupabaseCredentials(sbUrl, sbKey);
      }, 1200);
    } else {
      setSbStatusMsg({
        success: false,
        text: test.message,
      });
    }
  };

  const handleDisconnectSupabase = () => {
    if (window.confirm('Apakah Anda yakin ingin memutuskan koneksi Supabase dan kembali ke Mode Demo?')) {
      clearSupabaseCredentials();
    }
  };

  const handleCopySqlScript = async () => {
    try {
      const response = await fetch('/supabase/schema_full.sql');
      if (!response.ok) throw new Error('Gagal memuat file schema_full.sql');
      const sqlText = await response.text();
      await navigator.clipboard.writeText(sqlText);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 3500);
    } catch (err: any) {
      alert('Gagal menyalin SQL: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto min-w-0 overflow-hidden">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
          <Settings className="w-4 h-4 text-primary" />
          <span>Konfigurasi Organisasi, Kop Resmi & Basis Data Cloud</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          Pengaturan Sistem & Database Supabase
        </h2>
        <p className="text-xs md:text-sm text-slate-500">
          Kelola koneksi cloud database PostgreSQL Supabase, teks kop surat PDF, penandatangan sah, serta aturan kas
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">Pengaturan gereja berhasil diperbarui dan disimpan!</span>
        </div>
      )}

      {/* SECTION SUPABASE INTEGRATION */}
      <div className="bg-gradient-to-br from-white to-slate-50/70 p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 flex items-center justify-center text-emerald-700 shadow-2xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Database Cloud Supabase (PostgreSQL)</span>
                {isSupabaseConfigured ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Terhubung Langsung
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                    Mode Demo / Lokal
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isSupabaseConfigured
                  ? 'Penyimpanan lokal dinonaktifkan. Seluruh data transaksi tersimpan langsung di server database Supabase Anda.'
                  : 'Hubungkan project Supabase agar data yang diinput langsung tersimpan permanen di cloud database.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopySqlScript}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-indigo-200 transition-all shadow-2xs"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Tersalin ke Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Skrip SQL</span>
                </>
              )}
            </button>

            <a
              href="/supabase/schema_full.sql"
              download="schema_full.sql"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh .SQL</span>
            </a>
          </div>
        </div>

        {/* Notice on Local Storage Disabled */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 flex items-start gap-2.5">
          <Server className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Ketentuan Penyimpanan: </span>
            Saat Supabase terhubung, sistem SIKU HKBP secara ketat <strong>menonaktifkan penyimpanan lokal browser (localStorage)</strong>.
            Semua penambahan kas, verifikasi audit, anggaran APBG, dan mutasi kas disinkronkan secara real-time langsung ke tabel PostgreSQL di Supabase.
          </div>
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>Project URL Supabase</span>
            </label>
            <input
              type="text"
              value={sbUrl}
              onChange={(e) => setSbUrl(e.target.value)}
              placeholder="https://your-project-ref.supabase.co"
              className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Ditemukan di: Supabase Dashboard &gt; Project Settings &gt; API &gt; Project URL
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>Anon Public API Key</span>
            </label>
            <input
              type="password"
              value={sbKey}
              onChange={(e) => setSbKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-[11px] focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Ditemukan di: Supabase Dashboard &gt; Project Settings &gt; API &gt; Project API keys (anon public)
            </span>
          </div>
        </div>

        {/* Action Button & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestAndSaveSupabase}
              disabled={testingSb}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              {testingSb ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menguji Koneksi Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Uji Koneksi & Simpan Kredensial</span>
                </>
              )}
            </button>

            {isSupabaseConfigured && (
              <button
                type="button"
                onClick={handleDisconnectSupabase}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 border border-rose-200 transition-colors"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Putuskan Koneksi</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowSqlGuide(!showSqlGuide)}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{showSqlGuide ? 'Sembunyikan Panduan Eksekusi SQL' : 'Lihat Panduan Eksekusi SQL'}</span>
            {showSqlGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {sbStatusMsg && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in ${
              sbStatusMsg.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {sbStatusMsg.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="font-medium leading-relaxed">{sbStatusMsg.text}</div>
          </div>
        )}

        {/* SQL Execution Guide Accordion */}
        {showSqlGuide && (
          <div className="p-4 bg-slate-900 text-slate-200 rounded-xl space-y-3 text-xs font-sans animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <FileCode className="w-4 h-4" />
                Langkah Eksekusi SQL di Supabase:
              </span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1 text-[11px]"
              >
                <span>Buka Supabase Dashboard</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
              <li>
                Buka proyek Supabase Anda, lalu klik menu <strong>SQL Editor</strong> pada bilah sisi kiri.
              </li>
              <li>
                Klik tombol <strong>New Query</strong> (+), lalu beri nama query (misal: <code>SIKU_HKBP_SCHEMA</code>).
              </li>
              <li>
                Klik tombol <strong>&quot;Salin Skrip SQL&quot;</strong> di atas, lalu tempelkan (Paste) seluruh isinya ke dalam editor query Supabase.
              </li>
              <li>
                Klik tombol <strong>Run</strong> (atau tekan <code>Ctrl + Enter</code>) untuk mengeksekusi skrip hingga muncul status <em>Success. No rows returned</em>.
              </li>
              <li>
                Buka menu <strong>Project Settings &gt; API</strong>, lalu salin <strong>Project URL</strong> dan <strong>anon public API key</strong> ke dalam formulir di atas.
              </li>
              <li>
                Klik tombol <strong>&quot;Uji Koneksi &amp; Simpan Kredensial&quot;</strong>. Dashboard akan langsung terhubung ke database cloud Anda!
              </li>
            </ol>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Section 1: Kop Surat Resmi Gereja */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold text-sm">
            <Church className="w-4 h-4" />
            <span>Kop Surat & Identitas Huria / Ressort</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Organisasi / Gereja</label>
              <input
                type="text"
                value={formData.church_name}
                onChange={(e) => setFormData({ ...formData, church_name: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subjudul Lembaga</label>
              <input
                type="text"
                value={formData.church_subtext}
                onChange={(e) => setFormData({ ...formData, church_subtext: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap Gereja</label>
              <input
                type="text"
                value={formData.church_address}
                onChange={(e) => setFormData({ ...formData, church_address: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / Kontak</label>
              <input
                type="text"
                value={formData.church_phone}
                onChange={(e) => setFormData({ ...formData, church_phone: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Resmi</label>
              <input
                type="email"
                value={formData.church_email}
                onChange={(e) => setFormData({ ...formData, church_email: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 2: Penandatangan Sah Laporan Gabungan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>Pejabat Penandatangan Laporan Keuangan Resmi</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pendeta Ressort</label>
              <input
                type="text"
                value={formData.pendeta_name}
                onChange={(e) => setFormData({ ...formData, pendeta_name: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Ketua Kas Umum & Pengesah</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sekretaris Huria</label>
              <input
                type="text"
                value={formData.sekretaris_name}
                onChange={(e) => setFormData({ ...formData, sekretaris_name: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Verifikator Laporan</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bendahara Umum</label>
              <input
                type="text"
                value={formData.bendahara_umum_name}
                onChange={(e) => setFormData({ ...formData, bendahara_umum_name: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Penyusun Laporan Konsolidasi</span>
            </div>
          </div>
        </div>


        {/* Save Button */}
        {isAdmin && (
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan Pengaturan</span>
            </button>
          </div>
        )}
      </form>

      {/* Danger Zone: Reset Transaksi, Anggaran & Saldo Awal */}
      {isAdmin && (
        <div className="card-rose p-6 rounded-2xl border-t-4 border-t-rose-500 shadow-2xs space-y-4 transition-all">
          <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Zona Pengaturan Ulang Data (Reset ke Nol)</span>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed font-medium">
            Gunakan fitur ini jika Anda ingin mengosongkan seluruh data uji coba atau memulai ulang penggunaan aplikasi
            dengan pembukuan riil yang baru. Tindakan ini akan menghapus semua transaksi kas, mengosongkan seluruh draf anggaran (APBG),
            mengembalikan saldo awal ke Rp 0, dan menyegarkan checklist kesiapan baik di database Supabase (jika terhubung) maupun lokal.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={async () => {
                const confirmed = window.confirm(
                  'KONFIRMASI RESET:\n\nApakah Anda yakin ingin mereset SEMUA transaksi keuangan, anggaran (APBG), dan saldo awal ke nol?\n\nSemua transaksi kas, rencana anggaran APBG, panjar, dan rekonsiliasi akan dikosongkan untuk memulai penggunaan aplikasi baru dari nol.'
                );
                if (confirmed) {
                  const res = await resetAllTransactionsAndBalancesToZero();
                  alert(res.message);
                }
              }}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-xs transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Semua Transaksi & Anggaran (APBG) ke Nol</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
