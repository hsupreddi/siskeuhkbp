/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Shield,
  Clock,
  Eye,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  User,
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatDateTimeIndo } from '../lib/formatters';
import { exportToExcel } from '../lib/exportUtils';

export const AuditLogsPage: React.FC = () => {
  const { auditLogs, profiles } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = auditLogs.filter((log) => {
    if (selectedAction !== 'all' && log.action !== selectedAction) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTable = log.table_name.toLowerCase().includes(q);
      const matchAction = log.action.toLowerCase().includes(q);
      const matchNotes = log.notes?.toLowerCase().includes(q);
      const matchRecord = log.record_id.toLowerCase().includes(q);
      if (!matchTable && !matchAction && !matchNotes && !matchRecord) return false;
    }
    return true;
  });

  const handleExportExcel = () => {
    const rows = filteredLogs.map((log, idx) => {
      const user = profiles.find((p) => p.id === log.changed_by);
      return {
        No: idx + 1,
        'Waktu (WIB)': formatDateTimeIndo(log.changed_at),
        Pelaksana: user?.full_name || log.changed_by || 'Sistem',
        Aksi: log.action,
        Tabel: log.table_name,
        'ID Rekord': log.record_id,
        Catatan: log.notes || '-',
      };
    });

    exportToExcel(rows, `Audit_Trail_HKBP_Hutaraja_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto min-w-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <History className="w-4 h-4 text-primary" />
            <span>Transparansi & Jejak Rekam Sistem</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Audit Trail Keuangan HKBP Hutaraja
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Catatan permanen (immutable) seluruh pembuatan, persetujuan, penolakan, dan penutupan buku
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Ekspor Log ke Excel</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pelaksana, tabel, atau catatan audit..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200"
          />
        </div>

        <div>
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="all">Semua Jenis Aksi</option>
            <option value="INSERT">INSERT (Data Baru)</option>
            <option value="UPDATE">UPDATE (Perubahan Data)</option>
            <option value="STATUS_CHANGE">STATUS_CHANGE (Persetujuan / Penolakan)</option>
            <option value="TRANSFER_CREATED">TRANSFER_CREATED (Pengajuan Transfer)</option>
            <option value="TRANSFER_CONFIRMED">TRANSFER_CONFIRMED (Konfirmasi Transfer)</option>
            <option value="PERIOD_CLOSED">PERIOD_CLOSED (Tutup Buku)</option>
            <option value="PERIOD_REOPENED">PERIOD_REOPENED (Buka Buku)</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Waktu (WIB)</th>
                <th className="py-3 px-4">Pelaksana (Actor)</th>
                <th className="py-3 px-4">Aksi</th>
                <th className="py-3 px-4">Tabel / Modul</th>
                <th className="py-3 px-4">Catatan Perubahan</th>
                <th className="py-3 px-4 text-center">Rincian Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Tidak ada catatan audit yang cocok.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const user = profiles.find((p) => p.id === log.changed_by);
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {formatDateTimeIndo(log.changed_at)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-900 block">
                            {user?.full_name || log.changed_by || 'Sistem'}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {user?.role.replace('_', ' ') || 'Autentikasi'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider ${
                              log.action.includes('CLOSED')
                                ? 'bg-slate-800 text-white'
                                : log.action.includes('REOPEN')
                                ? 'bg-amber-100 text-amber-800'
                                : log.action.includes('TRANSFER')
                                ? 'bg-indigo-100 text-indigo-800'
                                : log.action === 'STATUS_CHANGE'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {log.table_name}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-700">
                          {log.notes || '-'}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-1 text-slate-400 hover:text-slate-800 rounded-md transition-colors"
                            title="Tampilkan JSON payload"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded JSON diff payload */}
                      {isExpanded && (
                        <tr className="bg-slate-900 text-slate-200">
                          <td colSpan={6} className="p-4 text-xs font-mono">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <span className="text-slate-400 font-bold block mb-1">Old Data:</span>
                                <pre className="bg-slate-950 p-3 rounded-lg overflow-x-auto text-[11px] text-slate-300">
                                  {JSON.stringify(log.old_data || {}, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <span className="text-emerald-400 font-bold block mb-1">New Data:</span>
                                <pre className="bg-slate-950 p-3 rounded-lg overflow-x-auto text-[11px] text-emerald-300">
                                  {JSON.stringify(log.new_data || {}, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
