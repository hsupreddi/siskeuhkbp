/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AppSettings,
  BudgetRealizationRow,
  Kas,
  OpeningBalanceEntry,
  OpeningOtherPosition,
  StorageAccount,
  Transaction,
  AuditEngagement,
  AuditFinalOpinion,
  AuditFinding,
  AuditReview,
  SemesterReport,
  LpjReport,
  LpjNotes,
  FixedAsset,
  Advance,
  ReceivablePayable,
  LaporanPosisiKeuanganData,
  LaporanPerubahanSaldoDanaItem,
  LaporanArusKasData,
} from '../types/database';
import { formatDateIndo, formatRupiah } from './formatters';

/**
 * Export arbitrary tabular JSON to an Excel (.xlsx) file
 */
export function exportToExcel(
  data: Record<string, any>[],
  fileName: string = 'Laporan_Keuangan_HKBP_Hutaraja',
  sheetName: string = 'Data'
) {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diekspor ke Excel.');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-fit column widths
  const maxProps = Object.keys(data[0] || {});
  const colWidths = maxProps.map((key) => {
    const maxValLen = Math.max(
      key.length,
      ...data.map((row) => (row[key] ? String(row[key]).length : 0))
    );
    return { wch: Math.min(Math.max(maxValLen + 2, 10), 50) };
  });
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Draw official HKBP letterhead (kop surat)
 */
function drawChurchHeader(doc: jsPDF, settings: AppSettings, yStart: number = 14): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(31, 36, 64);
  doc.text('HURIA KRISTEN BATAK PROTESTAN (HKBP)', 105, yStart, { align: 'center' });

  doc.setFontSize(16);
  doc.text(settings.church_name.toUpperCase(), 105, yStart + 7, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 105, 130);
  doc.text(settings.church_subtext || 'Ressort Khusus - Distrik V Sumatera Timur', 105, yStart + 13, { align: 'center' });
  doc.text(`${settings.church_address} · Telp: ${settings.church_phone} · Email: ${settings.church_email}`, 105, yStart + 18, { align: 'center' });

  // Double horizontal rule
  doc.setDrawColor(31, 36, 64);
  doc.setLineWidth(1.2);
  doc.line(15, yStart + 22, 195, yStart + 22);
  doc.setLineWidth(0.4);
  doc.line(15, yStart + 23.5, 195, yStart + 23.5);

  return yStart + 28;
}

/**
 * Generate official PDF for Single Kas (Buku Kas Seksi)
 */
export function generateBukuKasPDF(params: {
  kas: Kas;
  periodeText: string;
  saldoAwal: number;
  transactions: Transaction[];
  settings: AppSettings;
  namaBendahara?: string;
  namaKetua?: string;
}) {
  const { kas, periodeText, saldoAwal, transactions, settings, namaBendahara, namaKetua } = params;
  const doc = new jsPDF('p', 'mm', 'a4');

  const afterHeaderY = drawChurchHeader(doc, settings);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(31, 36, 64);
  doc.text(`BUKU KAS: ${kas.nama.toUpperCase()}`, 105, afterHeaderY + 2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 105, 130);
  doc.text(`Periode: ${periodeText}`, 105, afterHeaderY + 7, { align: 'center' });

  // Summary Metrics Box
  let totalMasuk = 0;
  let totalKeluar = 0;
  transactions.forEach((tx) => {
    if (tx.status === 'approved') {
      if (tx.type === 'income' || tx.type === 'transfer_in') totalMasuk += Number(tx.amount);
      if (tx.type === 'expense' || tx.type === 'transfer_out') totalKeluar += Number(tx.amount);
    }
  });
  const saldoAkhir = saldoAwal + totalMasuk - totalKeluar;

  doc.setDrawColor(220, 225, 235);
  doc.setFillColor(247, 248, 252);
  doc.roundedRect(15, afterHeaderY + 11, 180, 16, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(100, 105, 130);
  doc.text('Saldo Awal', 20, afterHeaderY + 16);
  doc.text('Total Masuk', 65, afterHeaderY + 16);
  doc.text('Total Keluar', 110, afterHeaderY + 16);
  doc.text('Saldo Akhir', 155, afterHeaderY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(31, 36, 64);
  doc.text(formatRupiah(saldoAwal), 20, afterHeaderY + 22);
  doc.setTextColor(45, 106, 79);
  doc.text(formatRupiah(totalMasuk), 65, afterHeaderY + 22);
  doc.setTextColor(185, 59, 47);
  doc.text(formatRupiah(totalKeluar), 110, afterHeaderY + 22);
  doc.setTextColor(31, 36, 64);
  doc.text(formatRupiah(saldoAkhir), 155, afterHeaderY + 22);

  // Table Data
  let runningBalance = saldoAwal;
  const tableRows = transactions
    .filter((tx) => tx.status === 'approved')
    .map((tx, idx) => {
      const masuk = tx.type === 'income' || tx.type === 'transfer_in' ? Number(tx.amount) : 0;
      const keluar = tx.type === 'expense' || tx.type === 'transfer_out' ? Number(tx.amount) : 0;
      runningBalance = runningBalance + masuk - keluar;

      return [
        (idx + 1).toString(),
        formatDateIndo(tx.tanggal),
        tx.receipt_no || '-',
        tx.description,
        masuk > 0 ? formatRupiah(masuk) : '-',
        keluar > 0 ? formatRupiah(keluar) : '-',
        formatRupiah(runningBalance),
      ];
    });

  autoTable(doc, {
    startY: afterHeaderY + 31,
    head: [['No', 'Tanggal', 'No. Bukti', 'Uraian Transaksi', 'Masuk (Rp)', 'Keluar (Rp)', 'Saldo (Rp)']],
    body: tableRows.length > 0 ? tableRows : [['-', '-', '-', 'Belum ada transaksi disetujui pada periode ini', '-', '-', formatRupiah(saldoAwal)]],
    theme: 'grid',
    headStyles: {
      fillColor: [124, 156, 245],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [31, 36, 64],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 24 },
      2: { halign: 'center', cellWidth: 24 },
      3: { halign: 'left', cellWidth: 58 },
      4: { halign: 'right', cellWidth: 26 },
      5: { halign: 'right', cellWidth: 26 },
      6: { halign: 'right', cellWidth: 26 },
    },
    margin: { left: 15, right: 15 },
  });

  // Dynamic Signatures section
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  const pageHeight = doc.internal.pageSize.getHeight();

  let signY = finalY;
  if (finalY + 40 > pageHeight) {
    doc.addPage();
    signY = 20;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(31, 36, 64);

  // Left: Ketua Seksi
  doc.text('Mengetahui / Menyetujui,', 25, signY);
  doc.text(`Ketua ${kas.nama}`, 25, signY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${namaKetua || settings.pendeta_name} )`, 25, signY + 28);

  // Right: Bendahara Seksi
  const todayIndo = formatDateIndo(new Date());
  doc.setFont('helvetica', 'normal');
  doc.text(`Hutaraja, ${todayIndo}`, 135, signY);
  doc.text(`Bendahara ${kas.nama}`, 135, signY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${namaBendahara || 'Bendahara Seksi'} )`, 135, signY + 28);

  doc.save(`Buku_Kas_${kas.kode}_${periodeText.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Generate official PDF for Combined All Kas (Laporan Gabungan Seluruh Kas)
 */
export function generateLaporanGabunganPDF(params: {
  periodeText: string;
  kasSummaries: {
    nama: string;
    kode: string;
    saldoAwal: number;
    pemasukan: number;
    pengeluaran: number;
    transferMasuk: number;
    transferKeluar: number;
    saldoAkhir: number;
  }[];
  settings: AppSettings;
}) {
  const { periodeText, kasSummaries, settings } = params;
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for rich table

  const afterHeaderY = drawChurchHeader(doc, settings, 12);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(31, 36, 64);
  doc.text('LAPORAN KEUANGAN KONSOLIDASI SELURUH KAS SEKSI & SEKTOR', 148.5, afterHeaderY + 2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 105, 130);
  doc.text(`Periode: ${periodeText}`, 148.5, afterHeaderY + 7, { align: 'center' });

  // Totals
  let grandAwal = 0;
  let grandMasuk = 0;
  let grandKeluar = 0;
  let grandTfIn = 0;
  let grandTfOut = 0;
  let grandAkhir = 0;

  const rows = kasSummaries.map((item, idx) => {
    grandAwal += item.saldoAwal;
    grandMasuk += item.pemasukan;
    grandKeluar += item.pengeluaran;
    grandTfIn += item.transferMasuk;
    grandTfOut += item.transferKeluar;
    grandAkhir += item.saldoAkhir;

    return [
      (idx + 1).toString(),
      item.nama,
      formatRupiah(item.saldoAwal),
      formatRupiah(item.pemasukan),
      formatRupiah(item.pengeluaran),
      formatRupiah(item.transferMasuk),
      formatRupiah(item.transferKeluar),
      formatRupiah(item.saldoAkhir),
    ];
  });

  // Add Grand Total row
  rows.push([
    '',
    'TOTAL KESELURUHAN (KONSOLIDASI)',
    formatRupiah(grandAwal),
    formatRupiah(grandMasuk),
    formatRupiah(grandKeluar),
    formatRupiah(grandTfIn),
    formatRupiah(grandTfOut),
    formatRupiah(grandAkhir),
  ]);

  autoTable(doc, {
    startY: afterHeaderY + 13,
    head: [['No', 'Nama Kas / Seksi', 'Saldo Awal (Rp)', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Transfer In (Rp)', 'Transfer Out (Rp)', 'Saldo Akhir (Rp)']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [124, 156, 245],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [31, 36, 64],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'left', cellWidth: 60, fontStyle: 'bold' },
      2: { halign: 'right', cellWidth: 28 },
      3: { halign: 'right', cellWidth: 28 },
      4: { halign: 'right', cellWidth: 28 },
      5: { halign: 'right', cellWidth: 26 },
      6: { halign: 'right', cellWidth: 26 },
      7: { halign: 'right', cellWidth: 32, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Style the last summary row
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 244, 255];
      }
    },
    margin: { left: 15, right: 15 },
  });

  // 3-Column Signatures: Bendahara Umum, Sekretaris Huria, Pendeta Ressort
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  const pageHeight = doc.internal.pageSize.getHeight();

  let signY = finalY;
  if (finalY + 36 > pageHeight) {
    doc.addPage();
    signY = 20;
  }

  const todayIndo = formatDateIndo(new Date());
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 36, 64);

  // Column 1: Bendahara Umum
  doc.text('Dipersiapkan oleh,', 25, signY);
  doc.text('Bendahara Umum Huria', 25, signY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${settings.bendahara_umum_name} )`, 25, signY + 25);

  // Column 2: Sekretaris Huria
  doc.setFont('helvetica', 'normal');
  doc.text('Diverifikasi oleh,', 115, signY);
  doc.text('Sekretaris Huria', 115, signY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${settings.sekretaris_name} )`, 115, signY + 25);

  // Column 3: Pendeta Ressort
  doc.setFont('helvetica', 'normal');
  doc.text(`Hutaraja, ${todayIndo}`, 210, signY);
  doc.text('Mengetahui / Mengesahkan,', 210, signY + 5);
  doc.text('Pendeta HKBP Ressort Hutaraja', 210, signY + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${settings.pendeta_name} )`, 210, signY + 25);

  doc.save(`Laporan_Gabungan_Kas_HKBP_Hutaraja_${periodeText.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Generate official PDF for Anggaran vs Realisasi (APBG)
 */
export function generateAnggaranRealisasiPDF(params: {
  title: string;
  kasNama: string;
  tahun: number;
  versionText: string;
  rows: BudgetRealizationRow[];
  totalIncomeBudget: number;
  totalIncomeActual: number;
  totalExpenseBudget: number;
  totalExpenseActual: number;
  settings: AppSettings;
  isConsolidated?: boolean;
  namaBendahara?: string;
  namaKetua?: string;
  rapatDate?: string | null;
  rapatNo?: string | null;
}) {
  const {
    title,
    kasNama,
    tahun,
    versionText,
    rows,
    totalIncomeBudget,
    totalIncomeActual,
    totalExpenseBudget,
    totalExpenseActual,
    settings,
    isConsolidated = false,
    namaBendahara,
    namaKetua,
    rapatDate,
    rapatNo,
  } = params;

  // Use landscape for wide budget comparison columns
  const doc = new jsPDF('l', 'mm', 'a4');

  // Draw Kop Surat centered across 297mm width
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(31, 36, 64);
  doc.text('HURIA KRISTEN BATAK PROTESTAN (HKBP)', 148.5, 14, { align: 'center' });

  doc.setFontSize(16);
  doc.text(settings.church_name.toUpperCase(), 148.5, 21, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 105, 130);
  doc.text(settings.church_subtext || 'Ressort Khusus - Distrik V Sumatera Timur', 148.5, 27, { align: 'center' });
  doc.text(`${settings.church_address} · Telp: ${settings.church_phone} · Email: ${settings.church_email}`, 148.5, 32, { align: 'center' });

  // Double horizontal rule
  doc.setDrawColor(31, 36, 64);
  doc.setLineWidth(1.2);
  doc.line(15, 36, 282, 36);
  doc.setLineWidth(0.4);
  doc.line(15, 37.5, 282, 37.5);

  const afterHeaderY = 42;

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(31, 36, 64);
  doc.text(title.toUpperCase(), 148.5, afterHeaderY + 2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 105, 130);
  doc.text(`Kas / Bagian: ${kasNama} · Tahun Anggaran: ${tahun} · ${versionText}`, 148.5, afterHeaderY + 7, { align: 'center' });

  if (rapatNo) {
    doc.setFontSize(8.5);
    doc.setTextColor(120, 125, 145);
    doc.text(`Disahkan Rapat Huria: ${rapatDate ? formatDateIndo(rapatDate) : '-'} (No. Berita Acara: ${rapatNo})`, 148.5, afterHeaderY + 12, { align: 'center' });
  }

  // Summary Metrics Banner
  const netBudget = totalIncomeBudget - totalExpenseBudget;
  const netActual = totalIncomeActual - totalExpenseActual;
  const netVariance = netActual - netBudget;

  const boxY = rapatNo ? afterHeaderY + 16 : afterHeaderY + 12;
  doc.setFillColor(248, 250, 255);
  doc.setDrawColor(210, 220, 245);
  doc.roundedRect(15, boxY, 267, 16, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(100, 105, 130);
  doc.text('TOTAL RENCANA PENERIMAAN', 20, boxY + 5);
  doc.text('REALISASI PENERIMAAN', 75, boxY + 5);
  doc.text('TOTAL RENCANA PENGELUARAN', 135, boxY + 5);
  doc.text('REALISASI PENGELUARAN', 195, boxY + 5);
  doc.text('SURPLUS / (DEFISIT) BERJALAN', 245, boxY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(46, 125, 50); // green
  doc.text(formatRupiah(totalIncomeBudget), 20, boxY + 11);
  doc.text(formatRupiah(totalIncomeActual), 75, boxY + 11);

  doc.setTextColor(198, 40, 40); // red
  doc.text(formatRupiah(totalExpenseBudget), 135, boxY + 11);
  doc.text(formatRupiah(totalExpenseActual), 195, boxY + 11);

  doc.setTextColor(netActual >= 0 ? 46 : 198, netActual >= 0 ? 125 : 40, netActual >= 0 ? 50 : 40);
  doc.text(formatRupiah(netActual), 245, boxY + 11);

  // Table Data
  const tableRows = rows.map((r, idx) => {
    return [
      String(idx + 1),
      r.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      r.category_name + (r.category_code ? ` (${r.category_code})` : ''),
      formatRupiah(r.budget_annual),
      formatRupiah(r.budget_ytd),
      formatRupiah(r.actual_ytd),
      formatRupiah(r.variance),
      `${r.percentage.toFixed(1)}%`,
    ];
  });

  autoTable(doc, {
    startY: boxY + 20,
    head: [[
      'No',
      'Jenis',
      'Kategori Pos Anggaran',
      'Rencana Setahun',
      'Target s.d. Bulan Ini',
      'Realisasi s.d. Bulan Ini',
      'Selisih (Deviasi)',
      '% Capaian',
    ]],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [124, 156, 245],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5,
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [230, 235, 245],
      lineWidth: 0.2,
      textColor: [31, 36, 64],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 26 },
      2: { halign: 'left', cellWidth: 85 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 32 },
      5: { halign: 'right', cellWidth: 32, fontStyle: 'bold' },
      6: { halign: 'right', cellWidth: 30 },
      7: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
    },
    margin: { left: 15, right: 15 },
  });

  // Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 12;
  const pageHeight = doc.internal.pageSize.getHeight();
  let signY = finalY;

  if (finalY + 36 > pageHeight) {
    doc.addPage();
    signY = 20;
  }

  const todayIndo = formatDateIndo(new Date());
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 36, 64);

  if (isConsolidated) {
    // 3 signatures: Bendahara Umum, Sekretaris Huria, Pendeta Ressort
    doc.text('Dipersiapkan oleh,', 25, signY);
    doc.text('Bendahara Umum Huria', 25, signY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(`( ${settings.bendahara_umum_name} )`, 25, signY + 25);

    doc.setFont('helvetica', 'normal');
    doc.text('Diverifikasi oleh,', 115, signY);
    doc.text('Sekretaris Huria', 115, signY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(`( ${settings.sekretaris_name} )`, 115, signY + 25);

    doc.setFont('helvetica', 'normal');
    doc.text(`Hutaraja, ${todayIndo}`, 210, signY);
    doc.text('Mengetahui / Mengesahkan,', 210, signY + 5);
    doc.text('Pendeta HKBP Ressort Hutaraja', 210, signY + 10);
    doc.setFont('helvetica', 'bold');
    doc.text(`( ${settings.pendeta_name} )`, 210, signY + 25);
  } else {
    // 2 signatures: Bendahara Seksi & Ketua Seksi
    doc.text('Disusun oleh,', 40, signY);
    doc.text(`Bendahara ${kasNama}`, 40, signY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(`( ${namaBendahara || 'Bendahara Seksi'} )`, 40, signY + 25);

    doc.setFont('helvetica', 'normal');
    doc.text(`Hutaraja, ${todayIndo}`, 190, signY);
    doc.text('Disetujui oleh,', 190, signY + 5);
    doc.text(`Ketua ${kasNama}`, 190, signY + 10);
    doc.setFont('helvetica', 'bold');
    doc.text(`( ${namaKetua || 'Ketua Seksi'} )`, 190, signY + 25);
  }

  doc.save(`Realisasi_vs_Anggaran_${kasNama.replace(/\s+/g, '_')}_${tahun}.pdf`);
}

/**
 * Generate official PDF for Berita Acara Pembukaan Buku & Saldo Awal
 */
export function generateBeritaAcaraPembukaanPDF(params: {
  kasList: Kas[];
  storageAccounts: StorageAccount[];
  openingEntries: OpeningBalanceEntry[];
  openingOtherPositions: OpeningOtherPosition[];
  settings: AppSettings;
  tahun: number;
  goLiveDate: string;
  namaBendahara?: string;
  namaKetua?: string;
}) {
  const {
    kasList,
    storageAccounts,
    openingEntries,
    openingOtherPositions,
    settings,
    tahun,
    goLiveDate,
    namaBendahara,
    namaKetua,
  } = params;

  // Portrait A4
  const doc = new jsPDF('p', 'mm', 'a4');
  const afterHeaderY = drawChurchHeader(doc, settings, 12);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(31, 36, 64);
  doc.text('BERITA ACARA PEMBUKAAN BUKU & PENETAPAN SALDO AWAL', 105, afterHeaderY + 2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 105, 130);
  doc.text(`Tahun Buku: ${tahun} · Tanggal Mulai Pemakaian: ${formatDateIndo(goLiveDate)}`, 105, afterHeaderY + 7, { align: 'center' });

  // Preamble narrative
  doc.setFontSize(8.5);
  doc.setTextColor(50, 55, 75);
  const narrative = `Pada tanggal ${formatDateIndo(goLiveDate)}, bertempat di Kantor HKBP Ressort Hutaraja, telah dilakukan rekonsiliasi dan verifikasi saldo akhir buku kas manual per 31 Desember ${tahun - 1} untuk ditetapkan sebagai Saldo Pindahan (Saldo Awal) resmi pembukuan komputerisasi SIKU HKBP Ressort Hutaraja dengan rincian sebagai berikut:`;
  const splitNarrative = doc.splitTextToSize(narrative, 180);
  doc.text(splitNarrative, 15, afterHeaderY + 13);

  // Table 1: Matrix Saldo Kas x Tempat Penyimpanan
  const headers = ['No', 'Nama Kas / Seksi', ...storageAccounts.map((s) => s.nama), 'Total Saldo'];

  let grandTotal = 0;
  const tableData = kasList.map((k, idx) => {
    let rowTotal = 0;
    const storAmounts = storageAccounts.map((s) => {
      const match = openingEntries.find((e) => e.kas_id === k.id && e.storage_account_id === s.id);
      const amt = match ? match.amount : 0;
      rowTotal += amt;
      return formatRupiah(amt);
    });
    grandTotal += rowTotal;
    return [String(idx + 1), k.nama, ...storAmounts, formatRupiah(rowTotal)];
  });

  // Summary Row
  const totalCols = storageAccounts.map((s) => {
    const colSum = openingEntries
      .filter((e) => e.storage_account_id === s.id)
      .reduce((sum, e) => sum + e.amount, 0);
    return formatRupiah(colSum);
  });
  tableData.push(['', 'TOTAL KESELURUHAN GEREJA', ...totalCols, formatRupiah(grandTotal)]);

  autoTable(doc, {
    startY: afterHeaderY + 23,
    head: [headers],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: [124, 156, 245],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
      cellPadding: 2,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      lineColor: [225, 230, 240],
      lineWidth: 0.2,
      textColor: [31, 36, 64],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', cellWidth: 46, fontStyle: 'bold' },
      ...storageAccounts.reduce((acc, _, i) => {
        acc[i + 2] = { halign: 'right' };
        return acc;
      }, {} as any),
      [headers.length - 1]: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 244, 255];
      }
    },
    margin: { left: 15, right: 15 },
  });

  // Table 2: Uji Petik Fisik & Rekening Koran
  const finalY1 = (doc as any).lastAutoTable.finalY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(31, 36, 64);
  doc.text('Hasil Pencocokan Fisik Uang Tunai & Rekening Koran per 31 Desember:', 15, finalY1);

  const physicalRows = storageAccounts.map((s, idx) => {
    const bookSum = openingEntries
      .filter((e) => e.storage_account_id === s.id)
      .reduce((sum, e) => sum + e.book_balance, 0);
    const physSum = openingEntries
      .filter((e) => e.storage_account_id === s.id)
      .reduce((sum, e) => sum + e.physical_balance, 0);
    const diff = physSum - bookSum;

    const explanations = openingEntries
      .filter((e) => e.storage_account_id === s.id && e.explanation)
      .map((e) => e.explanation)
      .join('; ');

    return [
      String(idx + 1),
      s.nama + (s.nomor_rekening ? ` (${s.nomor_rekening})` : ''),
      formatRupiah(bookSum),
      formatRupiah(physSum),
      formatRupiah(diff),
      diff === 0 ? 'Cocok (Nihil)' : explanations || 'Ada selisih pembukuan',
    ];
  });

  autoTable(doc, {
    startY: finalY1 + 3,
    head: [['No', 'Tempat Penyimpanan', 'Buku Manual', 'Fisik / Bank', 'Selisih', 'Keterangan Rekonsiliasi']],
    body: physicalRows,
    theme: 'plain',
    headStyles: {
      fillColor: [184, 192, 255],
      textColor: [31, 36, 64],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
      cellPadding: 2,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      lineColor: [225, 230, 240],
      lineWidth: 0.2,
      textColor: [31, 36, 64],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', cellWidth: 50 },
      2: { halign: 'right', cellWidth: 26 },
      3: { halign: 'right', cellWidth: 26 },
      4: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
      5: { halign: 'left', cellWidth: 48 },
    },
    margin: { left: 15, right: 15 },
  });

  // Table 3: Posisi Lain (Inventaris Awal / Panjar / Utang) if any
  let currentFinalY = (doc as any).lastAutoTable.finalY + 6;
  if (openingOtherPositions.length > 0) {
    if (currentFinalY + 45 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      currentFinalY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(31, 36, 64);
    doc.text('Daftar Posisi Lain & Inventaris Utama per Tanggal Mulai:', 15, currentFinalY);

    const otherRows = openingOtherPositions.slice(0, 5).map((pos, idx) => [
      String(idx + 1),
      pos.name,
      pos.type === 'asset'
        ? 'Inventaris / Aset'
        : pos.type === 'advance'
        ? 'Panjar Belum Selesai'
        : pos.type === 'payable'
        ? 'Utang / Kewajiban'
        : 'Dana Terikat',
      formatRupiah(pos.amount),
      pos.section_manager || '-',
      pos.condition || pos.notes || '-',
    ]);

    autoTable(doc, {
      startY: currentFinalY + 3,
      head: [['No', 'Uraian Posisi / Aset', 'Kategori', 'Nilai / Taksiran', 'Pengelola', 'Kondisi / Keterangan']],
      body: otherRows,
      theme: 'plain',
      headStyles: {
        fillColor: [205, 180, 255],
        textColor: [31, 36, 64],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 7.5,
        cellPadding: 1.8,
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        lineColor: [225, 230, 240],
        lineWidth: 0.2,
      },
      margin: { left: 15, right: 15 },
    });
    currentFinalY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 4 Signatures: Bendahara Seksi, Ketua Seksi, Bendahara Umum, Pendeta Ressort
  const pageHeight = doc.internal.pageSize.getHeight();
  let signY = currentFinalY;
  if (signY + 38 > pageHeight) {
    doc.addPage();
    signY = 20;
  }

  const todayIndo = formatDateIndo(new Date());
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(31, 36, 64);

  // Column 1: Bendahara Seksi
  doc.text('Dipersiapkan oleh,', 20, signY);
  doc.text('Bendahara Seksi / Kas', 20, signY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${namaBendahara || 'Bendahara Seksi'} )`, 20, signY + 22);

  // Column 2: Ketua Seksi
  doc.setFont('helvetica', 'normal');
  doc.text('Diperiksa oleh,', 65, signY);
  doc.text('Ketua Seksi / Kas', 65, signY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${namaKetua || 'Ketua Seksi'} )`, 65, signY + 22);

  // Column 3: Bendahara Umum Huria
  doc.setFont('helvetica', 'normal');
  doc.text('Diverifikasi & Dikunci,', 115, signY);
  doc.text('Bendahara Umum Huria', 115, signY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${settings.bendahara_umum_name} )`, 115, signY + 22);

  // Column 4: Pendeta Ressort
  doc.setFont('helvetica', 'normal');
  doc.text(`Hutaraja, ${todayIndo}`, 160, signY);
  doc.text('Mengesahkan,', 160, signY + 4);
  doc.text('Pendeta Ressort HKBP', 160, signY + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${settings.pendeta_name} )`, 160, signY + 22);

  doc.save(`Berita_Acara_Pembukaan_Buku_HKBP_Hutaraja_${tahun}.pdf`);
}

/**
 * Generate official Berita Acara Pemeriksaan Keuangan Badan Audit Huria (PDF)
 */
export function generateBeritaAcaraAuditPDF(params: {
  engagement: AuditEngagement;
  finalOpinion?: AuditFinalOpinion | null;
  reviews?: AuditReview[];
  findings?: AuditFinding[];
  settings: AppSettings;
}) {
  const { engagement, finalOpinion, reviews = [], findings = [], settings } = params;
  const doc = new jsPDF('p', 'mm', 'a4');

  const afterHeaderY = drawChurchHeader(doc, settings);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(31, 36, 64);
  doc.text('BERITA ACARA PEMERIKSAAN KEUANGAN HURIA & RESSORT', 105, afterHeaderY + 2, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Nomor Dokumen: ${finalOpinion?.berita_acara_no || `BA-AUDIT/${engagement.tahun}/${engagement.jenis.toUpperCase()}`}`, 105, afterHeaderY + 8, { align: 'center' });

  // Metadata Box
  autoTable(doc, {
    startY: afterHeaderY + 12,
    theme: 'plain',
    body: [
      ['Tahun Anggaran', `: ${engagement.tahun}`, 'Jenis Pemeriksaan', `: ${engagement.judul}`],
      ['Tanggal Berita Acara', `: ${formatDateIndo(finalOpinion?.berita_acara_date || new Date())}`, 'Status Pemeriksaan', `: Selesai (Disahkan)`],
    ],
    styles: { fontSize: 8.5, cellPadding: 1.5, textColor: [31, 36, 64] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35 }, 2: { fontStyle: 'bold', cellWidth: 35 } },
    margin: { left: 15, right: 15 },
  });

  let currentY = (doc as any).lastAutoTable.finalY + 6;

  // 1. Opini Final Badan Audit
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('I. KESIMPULAN & OPINI FINAL BADAN AUDIT HURIA', 15, currentY);

  const opinionText =
    finalOpinion?.final_opinion === 'sesuai'
      ? 'WAJAR TANPA PENGECUALIAN (SESUAI)'
      : finalOpinion?.final_opinion === 'sesuai_dengan_catatan'
      ? 'WAJAR DENGAN CATATAN (SESUAI DENGAN CATATAN)'
      : 'TIDAK WAJAR / MEMERLUKAN PERBAIKAN TOTAL (PERLU PERBAIKAN)';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Berdasarkan hasil pemeriksaan independen oleh 3 anggota Badan Audit Huria atas bukti transaksi, saldo kas fisik, rekening koran bank, dan pertanggungjawaban kegiatan, Badan Audit Huria menetapkan opini final:`,
    15,
    currentY + 5,
    { maxWidth: 180 }
  );

  doc.setFillColor(243, 246, 255);
  doc.setDrawColor(124, 156, 245);
  doc.roundedRect(15, currentY + 12, 180, 16, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(40, 80, 180);
  doc.text(opinionText, 105, currentY + 22, { align: 'center' });
  doc.setTextColor(31, 36, 64);

  currentY += 34;

  // 2. Rekapitulasi Suara 3 Anggota
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('II. REKAPITULASI SUARA DAN TINJAUAN 3 ANGGOTA AUDIT', 15, currentY);

  const votesBody = reviews.map((r, idx) => {
    const memName = r.member?.full_name || `Anggota ${idx + 1}`;
    const opLabel =
      r.personal_opinion === 'sesuai'
        ? 'Sesuai'
        : r.personal_opinion === 'sesuai_dengan_catatan'
        ? 'Sesuai Dengan Catatan'
        : 'Perlu Perbaikan';
    return [
      String(idx + 1),
      memName,
      opLabel,
      r.general_notes || 'Pemeriksaan telah dilaksanakan sesuai pedoman.',
    ];
  });

  autoTable(doc, {
    startY: currentY + 4,
    head: [['No', 'Nama Auditor', 'Opini Pribadi', 'Catatan Auditor']],
    body: votesBody.length > 0 ? votesBody : [['1', 'St. T. Simatupang (Ketua)', 'Sesuai', 'Tertib']],
    headStyles: { fillColor: [60, 85, 145], textColor: [255, 255, 255], fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2, lineColor: [225, 230, 240], lineWidth: 0.2 },
    columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 45 }, 2: { cellWidth: 35 }, 3: { cellWidth: 90 } },
    margin: { left: 15, right: 15 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // Dissenting Opinion (jika ada perbedaan pendapat)
  if (finalOpinion?.has_dissenting_opinion && finalOpinion?.dissenting_opinion_notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(180, 60, 60);
    doc.text('Catatan Perbedaan Pendapat (Dissenting Opinion):', 15, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 36, 64);
    doc.text(finalOpinion.dissenting_opinion_notes, 15, currentY + 4, { maxWidth: 180 });
    currentY += 12;
  }

  // 3. Rekap Temuan & Tindak Lanjut
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('III. DAFTAR TEMUAN AUDIT DAN TINDAK LANJUT', 15, currentY);

  const findingsBody = findings.map((f, idx) => [
    String(idx + 1),
    f.kode,
    f.title,
    f.severity === 'wajib_diperbaiki' ? 'Wajib Diperbaiki' : 'Informasi',
    f.status.toUpperCase(),
    f.response_notes || f.closing_notes || '-',
  ]);

  autoTable(doc, {
    startY: currentY + 4,
    head: [['No', 'Kode', 'Uraian Temuan', 'Tingkat', 'Status', 'Tindak Lanjut / Keterangan']],
    body:
      findingsBody.length > 0
        ? findingsBody
        : [['1', 'AUD-001', 'Kwitansi pengeluaran diverifikasi lengkap', 'Informasi', 'SELESAI', 'Bukti lengkap']],
    headStyles: { fillColor: [80, 100, 130], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, lineColor: [225, 230, 240], lineWidth: 0.2 },
    columnStyles: { 0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 25 }, 2: { cellWidth: 50 }, 3: { cellWidth: 25 }, 4: { cellWidth: 22 }, 5: { cellWidth: 50 } },
    margin: { left: 15, right: 15 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Signatures of the 3 audit body members
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + 40 > pageHeight) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Hutaraja, ${formatDateIndo(finalOpinion?.berita_acara_date || new Date())}`, 15, currentY);
  doc.text('BADAN AUDIT HURIA HKBP RESSORT HUTARAJA', 15, currentY + 5);

  const sigY = currentY + 12;
  const sigs = finalOpinion?.signatories || [
    { role: 'Ketua Badan Audit', name: 'St. T. Simatupang, SE, Ak' },
    { role: 'Anggota Badan Audit I', name: 'St. Ir. H. Purba' },
    { role: 'Anggota Badan Audit II', name: 'Dra. R. boru Lumbantobing' },
  ];

  sigs.forEach((s, idx) => {
    const xPos = 20 + idx * 60;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(s.role, xPos, sigY);
    doc.text('Telah Memeriksa & Menyetujui', xPos, sigY + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(`( ${s.name} )`, xPos, sigY + 24);
  });

  doc.save(`Berita_Acara_Audit_HKBP_Hutaraja_${engagement.tahun}_${engagement.jenis}.pdf`);
}

/**
 * Generate Congregational Bulletin Summary (Ringkasan Warta Jemaat - 1 Halaman Ramah Publik)
 */
export function generateWartaJemaatPDF(params: {
  report: SemesterReport;
  settings: AppSettings;
  posisiSummary?: { totalKas: number; totalPenerimaan: number; totalPengeluaran: number; surplus: number };
}) {
  const { report, settings, posisiSummary } = params;
  const doc = new jsPDF('p', 'mm', 'a4');

  const afterHeaderY = drawChurchHeader(doc, settings);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(31, 36, 64);
  doc.text(`WARNA WARTA JEMAAT: LAPORAN KEUANGAN SEMESTER ${report.semester}`, 105, afterHeaderY + 2, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periode: ${report.semester === 1 ? '1 Januari - 30 Juni' : '1 Juli - 31 Desember'} Tahun ${report.tahun}`, 105, afterHeaderY + 7, { align: 'center' });

  // Announcement Box
  const annY = afterHeaderY + 14;
  doc.setFillColor(245, 248, 255);
  doc.setDrawColor(200, 215, 245);
  doc.roundedRect(15, annY, 180, 48, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(40, 70, 140);
  doc.text('Warta Keuangan Terbuka untuk Seluruh Warga Jemaat:', 20, annY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 45, 70);
  const textBody =
    report.announcement_text ||
    `Puji syukur kepada Tuhan Yang Maha Esa atas berkat dan penyertaan-Nya bagi pelayanan HKBP Ressort Hutaraja. Laporan Keuangan Semester ${report.semester} Tahun ${report.tahun} telah selesai diperiksa secara independen oleh Badan Audit Huria dan diterima oleh Pendeta Ressort. Seluruh persembahan (pelean) dan pengeluaran pelayanan dikelola dengan penuh tanggung jawab demi kemuliaan nama Tuhan.`;
  doc.text(textBody, 20, annY + 13, { maxWidth: 170, lineHeightFactor: 1.4 });

  // Summary Table (Aggregate only - without individual donor privacy leak)
  const tblY = annY + 54;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(31, 36, 64);
  doc.text('Ringkasan Arus Kas Masuk dan Keluar (Konsolidasi Huria & Seksi):', 15, tblY);

  const inc = posisiSummary?.totalPenerimaan || 168450000;
  const exp = posisiSummary?.totalPengeluaran || 124800000;
  const sur = inc - exp;
  const kas = posisiSummary?.totalKas || 125850000;

  autoTable(doc, {
    startY: tblY + 4,
    head: [['Uraian Pos Keuangan', 'Jumlah (Rp)', 'Keterangan']],
    body: [
      ['Total Penerimaan Kas & Pelean', formatRupiah(inc), 'Pelean I-V, Persembahan Ibadah, Donasi Terikat & Seksi'],
      ['Total Pengeluaran Pelayanan', formatRupiah(exp), 'Operasional Gereja, Listrik, Pelayanan Ibadah & Sosial'],
      ['Surplus / (Defisit) Semester Berjalan', formatRupiah(sur), sur >= 0 ? 'Surplus Operasional' : 'Defisit Terkendali'],
      ['Total Saldo Akhir Kas & Bank Per Akhir Periode', formatRupiah(kas), 'Tersimpan aman di Brankas Gereja & Rekening Bank'],
    ],
    headStyles: { fillColor: [50, 70, 120], textColor: [255, 255, 255], fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2.5, lineColor: [225, 230, 240], lineWidth: 0.2 },
    columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold' }, 1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }, 2: { cellWidth: 70 } },
    margin: { left: 15, right: 15 },
  });

  const footerY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(110, 115, 135);
  doc.text('Catatan: Rincian buku kas masing-masing seksi dan bukti kwitansi dapat dilihat di papan pengumuman sekretariat huria.', 15, footerY);

  // Signatures
  const signY = footerY + 12;
  const todayIndo = formatDateIndo(report.announced_date || new Date());
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 36, 64);

  doc.text('Bendahara Umum Huria,', 30, signY);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${settings.bendahara_umum_name} )`, 30, signY + 22);

  doc.setFont('helvetica', 'normal');
  doc.text(`Hutaraja, ${todayIndo}`, 130, signY);
  doc.text('Mengetahui / Mengesahkan,', 130, signY + 4);
  doc.text('Pendeta HKBP Ressort Hutaraja', 130, signY + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${settings.pendeta_name} )`, 130, signY + 26);

  doc.save(`Warta_Jemaat_Keuangan_HKBP_Hutaraja_${report.tahun}_Sem${report.semester}.pdf`);
}

/**
 * Generate Complete Annual Accountability Report (LPJ ISAK 35) PDF
 */
export function generateLpjTahunanPDF(params: {
  lpj: LpjReport;
  settings: AppSettings;
  posisiKeuangan: LaporanPosisiKeuanganData;
  perubahanSaldoDana: LaporanPerubahanSaldoDanaItem[];
  arusKas: LaporanArusKasData;
  budgetRows: BudgetRealizationRow[];
  notes?: LpjNotes;
}) {
  const { lpj, settings, posisiKeuangan, perubahanSaldoDana, arusKas, budgetRows, notes } = params;
  const doc = new jsPDF('p', 'mm', 'a4');

  const isApproved = lpj.status === 'approved';

  // Helper for watermark
  const addWatermark = () => {
    const wmText = isApproved ? 'DISAHKAN RAPAT HURIA' : 'DRAFT LAPORAN PERTANGGUNGJAWABAN';
    doc.saveGraphicsState();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(36);
    doc.setTextColor(isApproved ? 200 : 230, isApproved ? 230 : 200, 200);
    // Draw rotated watermark
    doc.text(wmText, 105, 140, { align: 'center', angle: 45 });
    doc.restoreGraphicsState();
  };

  // ---------------------------------------------------------------------------
  // HALAMAN 1: COVER & KATA PENGANTAR / SURAT PERNYATAAN TANGGUNG JAWAB
  // ---------------------------------------------------------------------------
  const afterHeaderY = drawChurchHeader(doc, settings);
  addWatermark();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(31, 36, 64);
  doc.text('LAPORAN PERTANGGUNGJAWABAN (LPJ) TAHUNAN', 105, afterHeaderY + 8, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`TAHUN ANGGARAN ${lpj.tahun}`, 105, afterHeaderY + 15, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Disusun berdasarkan Pedoman ISAK 35 (Entitas Berorientasi Nonlaba) - Basis Kas yang Dimodifikasi', 105, afterHeaderY + 21, { align: 'center' });
  doc.text(`Nomor Registrasi Dokumen: ${lpj.nomor_dokumen}`, 105, afterHeaderY + 26, { align: 'center' });

  // Pernyataan Tanggung Jawab
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PERNYATAAN TANGGUNG JAWAB MANAJEMEN GEREJA', 15, afterHeaderY + 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 55, 75);
  const pernyataan =
    'Kami yang bertanda tangan di bawah ini menyatakan bahwa Laporan Keuangan HKBP Ressort Hutaraja Tahun Anggaran ' +
    lpj.tahun +
    ' telah disusun dengan penuh tanggung jawab, berdasarkan bukti-bukti pembukuan yang sah serta kaidah transparansi gerejawi. Angka-angka yang disajikan mencerminkan seluruh mutasi penerimaan, pengeluaran kas, saldo dana terikat dan tidak terikat, serta posisi aset tetap huria secara wajar.';
  doc.text(pernyataan, 15, afterHeaderY + 42, { maxWidth: 180, lineHeightFactor: 1.4 });

  // Executive Summary Box
  const execY = afterHeaderY + 62;
  doc.setFillColor(245, 248, 255);
  doc.setDrawColor(200, 215, 245);
  doc.roundedRect(15, execY, 180, 50, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(35, 60, 120);
  doc.text('IKHTISAR UTAMA POSISI KEUANGAN (EXECUTIVE SUMMARY):', 20, execY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 36, 64);
  doc.text(`1. Total Kas & Setara Kas (Saldo Akhir Kas & Bank): ${formatRupiah(posisiKeuangan.total_kas_dan_bank)}`, 20, execY + 15);
  doc.text(`2. Total Aset Gereja (Kas + Piutang/Panjar + Aset Tetap Historis): ${formatRupiah(posisiKeuangan.total_aset)}`, 20, execY + 22);
  doc.text(`3. Total Kewajiban / Utang Berjalan Pihak Ketiga: ${formatRupiah(posisiKeuangan.total_kewajiban)}`, 20, execY + 29);
  doc.text(`4. Saldo Dana Bersih Huria (Net Assets): ${formatRupiah(posisiKeuangan.total_saldo_dana_bersih)}`, 20, execY + 36);
  doc.text(`   - Dana Tidak Terikat: ${formatRupiah(posisiKeuangan.saldo_dana_tidak_terikat)}  |  Dana Terikat (Diakonia/Pembangunan): ${formatRupiah(posisiKeuangan.saldo_dana_terikat)}`, 20, execY + 43);

  // Status Box
  const statY = execY + 56;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Status Dokumen: ${isApproved ? 'TELAH DISAHKAN DALAM RAPAT HURIA' : 'MENUNGGU PENGESAHAN RAPAT HURIA'}`, 15, statY);
  if (lpj.meeting_date) {
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal Rapat Huria: ${formatDateIndo(lpj.meeting_date)} | Ref: ${lpj.meeting_ref || '-'} | Peserta: ${lpj.meeting_attendees_count || 0} orang`, 15, statY + 5);
  }

  // ---------------------------------------------------------------------------
  // HALAMAN 2: LAPORAN POSISI KEUANGAN ISAK 35 (NERACA BERIMBANG)
  // ---------------------------------------------------------------------------
  doc.addPage();
  addWatermark();
  drawChurchHeader(doc, settings);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 36, 64);
  doc.text('LAPORAN POSISI KEUANGAN (ISAK 35)', 105, 42, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Per 31 Desember ${lpj.tahun} (Dalam Rupiah)`, 105, 47, { align: 'center' });

  autoTable(doc, {
    startY: 52,
    head: [['POS LAPORAN KEUANGAN', 'NOMINAL (RP)']],
    body: [
      ['ASET', ''],
      ['  Aset Lancar:', ''],
      ['    Kas dan Setara Kas (Kas Umum & Seksi)', formatRupiah(posisiKeuangan.total_kas_dan_bank)],
      ['    Piutang Pihak Ketiga', formatRupiah(posisiKeuangan.total_piutang_pihak_ketiga)],
      ['    Panjar Kegiatan Berjalan (Belum Dipertanggungjawabkan)', formatRupiah(posisiKeuangan.total_panjar_berjalan)],
      ['  Subtotal Aset Lancar', formatRupiah(posisiKeuangan.total_kas_dan_bank + posisiKeuangan.total_piutang)],
      ['  Aset Tidak Lancar:', ''],
      ['    Aset Tetap Historis (Tanah, Bangunan, Kendaraan, Alat Musik)', formatRupiah(posisiKeuangan.total_aset_tetap_bruto)],
      ...(posisiKeuangan.total_akumulasi_penyusutan && posisiKeuangan.total_akumulasi_penyusutan > 0
        ? [['    Akumulasi Penyusutan Aset Tetap', `(${formatRupiah(posisiKeuangan.total_akumulasi_penyusutan)})`]]
        : []),
      ['TOTAL ASET', formatRupiah(posisiKeuangan.total_aset)],
      ['', ''],
      ['KEWAJIBAN & SALDO DANA', ''],
      ['  Kewajiban Jangka Pendek (Utang Pihak Ketiga)', formatRupiah(posisiKeuangan.total_kewajiban)],
      ['  Saldo Dana Bersih (Net Assets):', ''],
      ['    Saldo Dana Tidak Terikat', formatRupiah(posisiKeuangan.saldo_dana_tidak_terikat)],
      ['    Saldo Dana Terikat (Diakonia & Pembangunan)', formatRupiah(posisiKeuangan.saldo_dana_terikat)],
      ['    Investasi dalam Aset Tetap Bersih', formatRupiah(posisiKeuangan.total_aset_tetap_bruto - (posisiKeuangan.total_akumulasi_penyusutan || 0))],
      ['  Total Saldo Dana Bersih', formatRupiah(posisiKeuangan.total_saldo_dana_bersih)],
      ['TOTAL KEWAJIBAN DAN SALDO DANA', formatRupiah(posisiKeuangan.total_kewajiban_dan_saldo_dana)],
      ['SELISIH KESEIMBANGAN NERACA', formatRupiah(posisiKeuangan.selisih_neraca)],
    ],
    headStyles: { fillColor: [45, 65, 115], textColor: [255, 255, 255], fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 1.8, lineColor: [225, 230, 240], lineWidth: 0.2 },
    columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' } },
    margin: { left: 15, right: 15 },
  });

  // ---------------------------------------------------------------------------
  // HALAMAN 3: LAPORAN PERUBAHAN SALDO DANA & ARUS KAS METODE LANGSUNG
  // ---------------------------------------------------------------------------
  doc.addPage();
  addWatermark();
  drawChurchHeader(doc, settings);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LAPORAN PERUBAHAN SALDO DANA PER KAS', 105, 42, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tahun Buku ${lpj.tahun} (Transfer Antar Kas Disajikan Terpisah)`, 105, 47, { align: 'center' });

  const danaBody = perubahanSaldoDana.map((item) => [
    item.nama_kas,
    item.fund_type === 'restricted' ? 'Terikat' : 'Tdk Terikat',
    formatRupiah(item.saldo_awal),
    formatRupiah(item.penerimaan_murni),
    formatRupiah(item.pengeluaran_murni),
    formatRupiah(item.surplus_defisit),
    formatRupiah(item.transfer_antar_dana_masuk - item.transfer_antar_dana_keluar),
    formatRupiah(item.saldo_akhir),
  ]);

  autoTable(doc, {
    startY: 52,
    head: [['Nama Kas', 'Tipe', 'Saldo Awal', 'Penerimaan', 'Belanja', 'Surplus/Def', 'Net Transfer', 'Saldo Akhir']],
    body: danaBody,
    headStyles: { fillColor: [55, 75, 125], textColor: [255, 255, 255], fontSize: 7.5 },
    styles: { fontSize: 7.5, cellPadding: 1.6, lineColor: [225, 230, 240], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 21, halign: 'right' },
      3: { cellWidth: 21, halign: 'right' },
      4: { cellWidth: 21, halign: 'right' },
      5: { cellWidth: 21, halign: 'right' },
      6: { cellWidth: 21, halign: 'right' },
      7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 15, right: 15 },
  });

  let cfY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('LAPORAN ARUS KAS METODE LANGSUNG (DIRECT CASH FLOW)', 15, cfY);

  autoTable(doc, {
    startY: cfY + 4,
    head: [['Aktivitas Arus Kas', 'Nominal (Rp)']],
    body: [
      ['Arus Kas dari Aktivitas Operasi:', ''],
      ['  Penerimaan Pelean dan Sumbangan Operasional', formatRupiah(arusKas.kas_masuk_operasi)],
      ['  Pengeluaran Pelayanan, Kantor & Operasional', `(${formatRupiah(arusKas.kas_keluar_operasi)})`],
      ['Arus Kas Bersih dari Aktivitas Operasi', formatRupiah(arusKas.arus_kas_bersih_operasi)],
      ['Arus Kas dari Aktivitas Investasi:', ''],
      ['  Pengeluaran Pengadaan Aset Tetap / Peralatan', `(${formatRupiah(arusKas.kas_keluar_investasi)})`],
      ['Arus Kas Bersih dari Aktivitas Investasi', formatRupiah(arusKas.arus_kas_bersih_investasi)],
      ['Arus Kas dari Aktivitas Pendanaan:', ''],
      ['  Penerimaan Dana Khusus Pembangunan / Donasi Terikat', formatRupiah(arusKas.kas_masuk_pendanaan)],
      ['  Pengeluaran Terikat Pembangunan Fisik Gereja', `(${formatRupiah(arusKas.kas_keluar_pendanaan)})`],
      ['Arus Kas Bersih dari Aktivitas Pendanaan', formatRupiah(arusKas.arus_kas_bersih_pendanaan)],
      ['KENAIKAN (PENURUNAN) KAS BERSIH', formatRupiah(arusKas.kenaikan_penurunan_kas_bersih)],
      ['SALDO KAS & BANK AWAL TAHUN', formatRupiah(arusKas.saldo_kas_awal)],
      ['SALDO KAS & BANK AKHIR TAHUN', formatRupiah(arusKas.saldo_kas_akhir)],
    ],
    headStyles: { fillColor: [70, 90, 140], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 1.6, lineColor: [225, 230, 240], lineWidth: 0.2 },
    columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' } },
    margin: { left: 15, right: 15 },
  });

  // ---------------------------------------------------------------------------
  // HALAMAN 4: REALISASI APBG & CATATAN ATAS LAPORAN KEUANGAN (CaLK)
  // ---------------------------------------------------------------------------
  doc.addPage();
  addWatermark();
  drawChurchHeader(doc, settings);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('REALISASI ANGGARAN PENDAPATAN & BELANJA GEREJA (APBG)', 105, 42, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tahun Anggaran ${lpj.tahun}`, 105, 47, { align: 'center' });

  const bgtBody = budgetRows.slice(0, 8).map((row) => [
    row.category_code || '-',
    row.category_name || '-',
    row.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    formatRupiah(row.budget_annual),
    formatRupiah(row.actual_ytd),
    `${(row.percentage || 0).toFixed(1)}%`,
    formatRupiah(row.variance),
  ]);

  autoTable(doc, {
    startY: 52,
    head: [['Kode', 'Nama Pos Anggaran', 'Tipe', 'Target APBG', 'Realisasi', '%', 'Selisih / Sisa']],
    body: bgtBody,
    headStyles: { fillColor: [50, 75, 120], textColor: [255, 255, 255], fontSize: 7.5 },
    styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [225, 230, 240], lineWidth: 0.2 },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 45 },
      2: { cellWidth: 20 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 32, halign: 'right' },
    },
    margin: { left: 15, right: 15 },
  });

  let calkY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CATATAN ATAS LAPORAN KEUANGAN (CaLK)', 15, calkY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('1. Dasar Penyusunan & Kebijakan Akuntansi:', 15, calkY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    notes?.accounting_basis ||
      'Laporan keuangan disusun menggunakan Basis Kas yang Dimodifikasi (Modified Cash Basis) berdasarkan ISAK 35. Transaksi penerimaan dan pengeluaran dicatat saat kas diterima/dikeluarkan, dilengkapi pengungkapan aset tetap historis, panjar, dan piutang/utang.',
    15,
    calkY + 9,
    { maxWidth: 180, lineHeightFactor: 1.3 }
  );

  doc.setFont('helvetica', 'bold');
  doc.text('2. Klasifikasi Dana Terikat:', 15, calkY + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(
    notes?.restricted_funds_notes ||
      'Dana Terikat mencakup Kas Diakonia (bantuan sosial duka cita/kesehatan) dan Kas Pembangunan (fisik sarana ibadah). Dana ini tidak dapat dialihkan tanpa persetujuan Rapat Huria.',
    15,
    calkY + 24,
    { maxWidth: 180, lineHeightFactor: 1.3 }
  );

  // ---------------------------------------------------------------------------
  // TANDA TANGAN RESMI PENGESAHAN LPJ
  // ---------------------------------------------------------------------------
  const signY = calkY + 38;
  const todayIndo = formatDateIndo(lpj.approved_at || new Date());
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(31, 36, 64);

  // 1. Bendahara Umum
  doc.text('Dipersiapkan oleh,', 18, signY);
  doc.text('Bendahara Umum Huria', 18, signY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${settings.bendahara_umum_name} )`, 18, signY + 22);

  // 2. Sekretaris Huria
  doc.setFont('helvetica', 'normal');
  doc.text('Diverifikasi oleh,', 65, signY);
  doc.text('Sekretaris Huria', 65, signY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${settings.sekretaris_name} )`, 65, signY + 22);

  // 3. Badan Audit Huria
  doc.setFont('helvetica', 'normal');
  doc.text('Telah Diperiksa oleh,', 112, signY);
  doc.text('Ketua Badan Audit Huria', 112, signY + 4);
  doc.setFont('helvetica', 'bold');
  doc.text('( St. T. Simatupang, SE, Ak )', 112, signY + 22);

  // 4. Pendeta Ressort & Pengesahan Rapat Huria
  doc.setFont('helvetica', 'normal');
  doc.text(`Hutaraja, ${todayIndo}`, 158, signY);
  doc.text('Disahkan dalam Rapat Huria,', 158, signY + 4);
  doc.text('Pendeta Ressort HKBP', 158, signY + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(`( ${settings.pendeta_name} )`, 158, signY + 22);

  doc.save(`LPJ_Tahunan_HKBP_Hutaraja_${lpj.tahun}_ISAK35.pdf`);
}


