# Panduan Modul Laporan Keuangan Semester & LPJ Tahunan ISAK 35
## SIKU HKBP Ressort Hutaraja

---

### 1. Prinsip Penyajian & Kerangka ISAK 35
Penyajian laporan keuangan HKBP Ressort Hutaraja mengacu pada **Interpretasi Standar Akuntansi Keuangan (ISAK) 35** (Penyajian Laporan Keuangan Entitas Nonlaba) dengan pendekatan **Basis Kas yang Dimodifikasi (Modified Cash Basis)**:

1. **Pemisahan Aliran Kas Murni vs Aliran Kas Internal**:
   - Pemasukan dan Pengeluaran kas murni dipisahkan secara tegas dari perpindahan saldo antar kas internal (*transfer antar kas*). Transfer antar kas tidak dicatat sebagai pendapatan maupun beban organisasi agar tidak terjadi penggelembungan (*double counting*).
2. **Keseimbangan Neraca Posisi Keuangan**:
   - Laporan Posisi Keuangan menjamin persamaan akuntansi nonlaba berimbang secara matematis:
     $$\text{Total Aset} = \text{Total Liabilitas} + \text{Total Saldo Dana Bersih}$$
     dengan selisih absolut $\Delta = 0$.
3. **Pembedaan Dana Terikat & Tidak Terikat**:
   - Saldo dana dipisahkan antara **Dana Tanpa Pembatasan (Unrestricted)** seperti Kas Umum, dan **Dana Dengan Pembatasan (Restricted)** seperti Kas Diakonia (sosial jemaat) dan Kas Pembangunan (fisik gereja).
4. **Metode Arus Kas Langsung (Direct Method)**:
   - Mengelompokkan arus kas riil ke dalam 3 aktivitas utama:
     - **Aktivitas Operasi** (Pelean ibadah, sumbangan, operasional pelayanan).
     - **Aktivitas Investasi** (Pengadaan aset tetap, renovasi fisik sarana gereja).
     - **Aktivitas Pendanaan** (Penerimaan/pembayaran utang jangka panjang atau dana amanah khusus).

---

### 2. File Migrasi Database (`supabase/migration_03c_laporan.sql`)
File migrasi ini melengkapi skema pelaporan dengan komponen database berikut:

1. **Tabel `public.semester_reports`**:
   - Menyimpan laporan Semester I (Jan–Jun) dan Semester II (Jul–Des).
   - Kolom: `tahun`, `semester`, `status`, `snapshot_data`, `checklist_state`, `submitted_by`, `approved_by`, `catatan_gembala`, `warta_ringkasan`.
   - Menggunakan mekanisme kunci snapshot (*immutable jsonb snapshot*).

2. **Tabel `public.lpj_reports`**:
   - Menyimpan Laporan Pertanggungjawaban (LPJ) Tahunan lengkap 12 bab.
   - Kolom: `tahun`, `status`, `nomor_dokumen`, `snapshot_data`, `checklist_state`, `audit_engagement_id`, `approved_at`, `berita_acara_rapat`.

3. **Tabel `public.lpj_exceptions` (Dispensasi Pengecualian Syarat)**:
   - Mencatat pengecualian resmi yang disetujui Majelis/Pendeta jika terdapat syarat checklist yang belum 100% terpenuhi tetapi memiliki alasan historis yang sah (tercatat di audit trail).

4. **Foreign Key `audit_engagements`**:
   - Menautkan tabel pemeriksaan audit dengan `semester_report_id` dan `lpj_id`.

5. **Database Views Teroptimasi**:
   - `view_laporan_penerimaan_pengeluaran`: Rekap mutasi murni non-transfer.
   - `view_laporan_perubahan_saldo_dana`: Mutasi saldo dana terikat & tidak terikat.
   - `view_laporan_posisi_keuangan`: Neraca berimbang ISAK 35.
   - `view_laporan_arus_kas`: Arus kas metode langsung.
   - `view_laporan_semester_ringkasan`: Ringkasan performa APBG semesteran.

6. **Trigger Penguncian Transaksi Permanen (`fn_protect_transactions_approved_lpj`)**:
   - Begitu LPJ Tahunan disahkan oleh Rapat Huria (`status = 'approved'`), seluruh transaksi kas pada tahun anggaran tersebut **DIKUNCI PERMANEN**. Tidak ada transaksi yang dapat ditambah, diubah, atau dihapus kembali.

---

### 3. Alur Status Pelaporan

#### A. Laporan Semester
```
[1. Persiapan Checklist (6 Indikator)] ──► [2. Kunci Snapshot (Disusun)]
                                                    │
                                                    ▼
                                          [3. Pemeriksaan Badan Audit]
                                                    │
                                                    ▼
                                          [4. Dilaporkan ke Pendeta Ressort]
                                                    │
                                                    ▼ (Pendeta Catat Tanda Terima & Evaluasi)
                                          [5. Diwartakan ke Jemaat (Warta Jemaat)]
```

#### Checklist Kesiapan Semester (6 Indikator Wajib):
1. Seluruh bulan pada semester terkait telah ditutup buku (`monthly_closings`).
2. Tidak ada transaksi yang berstatus Draft atau Menunggu Persetujuan.
3. Seluruh rekening bank dan brankas tunai telah direkonsiliasi.
4. Tidak ada panjar kegiatan yang berstatus kadaluarsa (*overdue*).
5. Selisih realisasi anggaran di atas batas toleransi telah diberi penjelasan tertulis.
6. Seluruh temuan audit berstatus "Wajib Diperbaiki" telah ditindaklanjuti.

#### B. LPJ Tahunan ISAK 35
```
[Draf Persiapan] ──► [Kunci Snapshot LPJ] ──► [Diperiksa Badan Audit]
                                                       │
                                                       ▼
[Pengesahan Rapat Huria] ◄── [Diajukan ke Rapat Huria oleh Bendum & Pendeta]
          │
          ▼
[PENGUNCIAN PERMANEN SELURUH TRANSAKSI TAHUN TERSEBUT]
```

---

### 4. Format Warta Jemaat (Ringkasan Publik)
Untuk transparansi kepada seluruh warga jemaat pada Warta Gereja hari Minggu:
- Disajikan ringkas dalam 1 halaman.
- Hanya menampilkan angka agregat total penerimaan dan pengeluaran per kas.
- **Perlindungan Privasi**: Tidak memuat nama pribadi penyumbang diakonia atau rincian sensitif panjar/utang.
- Disertai teks pengantar resmi yang dapat disalin instan ke buletin tata ibadah minggu.

---

### 5. Ekspor Dokumen Resmi
1. **Warta Jemaat (PDF)**: 1 halaman ringkasan siap cetak dengan kop surat resmi gereja.
2. **Buku Kas Seksi & Konsolidasi (Excel/PDF)**: Format buku kas standar akuntansi.
3. **Buku LPJ Tahunan ISAK 35 (PDF)**: Dokumen multi-halaman lengkap yang memuat:
   - Watermark dinamis: **"DRAFT LPJ BELUM DISAHKAN"** vs **"DISAHKAN RAPAT HURIA"**.
   - Halaman Judul & Kata Pengantar / Pernyataan Tanggung Jawab Majelis.
   - Ringkasan Eksekutif & Realisasi Anggaran Pendapatan & Belanja Gereja (APBG).
   - Laporan Posisi Keuangan (Neraca Berimbang).
   - Laporan Penerimaan & Pengeluaran Kas (Murni).
   - Laporan Perubahan Saldo Dana (Terikat & Tidak Terikat).
   - Laporan Arus Kas Langsung (Operasi, Investasi, Pendanaan).
   - Catatan atas Laporan Keuangan (CaLK) 7 Bagian.
   - Kolom tanda tangan resmi Pendeta Ressort, Sekretaris Huria, Bendahara Umum, dan Ketua Badan Audit Huria.
