# Panduan Modul Data Pendukung Laporan Pertanggungjawaban (LPJ)
## SIKU HKBP Ressort Hutaraja (Basis Kas yang Dimodifikasi / ISAK 35)

---

### 1. Tujuan & Filosofi Akuntansi ISAK 35
Modul ini bertugas menyiapkan data pendukung yang dibutuhkan untuk penyusunan Laporan Pertanggungjawaban (LPJ) tahunan HKBP Ressort Hutaraja yang berorientasi nonlaba sesuai pedoman **ISAK 35**.

Pencatatan menggunakan **Basis Kas yang Dimodifikasi (Modified Cash Basis)**:
1. **Pondasi Utama Arus Kas Riil**: Transaksi penerimaan dan pengeluaran tetap dicatat saat kas/bank riil diterima atau dikeluarkan.
2. **Pengungkapan Pos Non-Kas Tambahan**: Dilengkapi data inventaris aset tetap historis, panjar kegiatan yang belum selesai, serta saldo berjalan piutang dan utang gereja.
3. **Pemisahan Dana Terikat (Restricted) dan Tidak Terikat (Unrestricted)**: Mengakomodasi amanah donasi jemaat untuk peruntukan khusus seperti Kas Diakonia (santunan janda/yatim, sakit, duka) dan Kas Pembangunan (menara lonceng & fisik sarana ibadah).

---

### 2. File Migrasi Database (`supabase/migration_03a_data_lpj.sql`)
File migrasi ini aman dijalankan di atas schema dasar dan `migration_04_saldo_awal.sql` tanpa merusak tabel, view, atau RLS sebelumnya:

1. **Kolom Baru pada Tabel `public.kas`**:
   - `fund_type text not null default 'unrestricted' check (fund_type in ('unrestricted', 'restricted'))`
   - `restricted_purpose text` (penjelasan amanah peruntukan jika kas terikat)
2. **Tabel `public.fixed_assets`**:
   - Menyimpan seluruh inventaris barang gereja: tanah, bangunan, kendaraan dinas, alat musik, sound system/elektronik, dan perabot.
   - Kolom: kode, nama, kategori, tanggal perolehan, nilai perolehan, kondisi (baik, rusak ringan, rusak berat), lokasi, kas pengelola, masa manfaat (useful life), nilai residu, status (aktif, diajukan penghapusan, diajukan hibah, dihapus, dihibahkan).
   - Tautan opsional ke transaksi pengeluaran (`transaction_id`) saat pembelian inventaris baru.
3. **Tabel `public.asset_depreciations`**:
   - Perhitungan penyusutan opsional menggunakan metode Garis Lurus (Straight Line Method).
4. **Tabel `public.advances` & `public.advance_settlements`**:
   - Pencatatan panjar/uang muka kegiatan yang ditarik oleh panitia/pengurus.
   - Kolom: penerima, nominal, tanggal pencairan, batas waktu (due date), kegiatan/peruntukan, dan status (`active`, `settled`, `overdue`).
   - Pertanggungjawaban (SPJ) merinci belanja riil, sisa dana dikembalikan ke kas, atau kekurangan belanja yang diganti kas.
5. **Tabel `public.receivables_payables` & `public.receivable_payable_payments`**:
   - Pencatatan piutang jemaat/pihak ketiga (misal: sewa aula) dan utang gereja (misal: percetakan buku nyanyian).
   - Mendukung pencatatan pelunasan bertahap (sebagian) atau lunas penuh.
6. **Tabel `public.lpj_notes` (Catatan atas Laporan Keuangan - CaLK)**:
   - 7 pos teks terstruktur ISAK 35 per tahun anggaran: dasar penyajian, kebijakan akuntansi, pos penting, varians anggaran, peristiwa penting, dana terikat, dan subsequent events.
7. **Tabel `public.lpj_settings`**:
   - Ambang batas toleransi selisih anggaran (default 10%), masa manfaat default per kategori aset, batas waktu standar panjar (14 hari), format nomor dokumen LPJ, dan daftar nama/gelar penandatangan resmi.
8. **Storage Bucket `asset-docs`**:
   - Private storage bucket untuk menyimpan foto inventaris barang, kartu garansi, faktur, dan bukti fisik kuitansi SPJ panjar.

---

### 3. Alur Status & Hak Akses (Segregation of Duties)

#### A. Alur Usulan Penghapusan / Hibah Aset
```
[Aktif] ──► Bendahara mengajukan usulan ──► [Diajukan Penghapusan / Hibah]
                                                      │
         ┌────────────────────────────────────────────┴────────────────────────────────────────────┐
         ▼ (Disetujui Ketua Kas)                                                                   ▼ (Ditolak)
[Dihapus / Dihibahkan (Arsip)]                                                             [Aktif Kembali]
```
- **Aturan Tegas**: Pengusul (`disposal_proposed_by`) **dilarang menyetujui pengajuannya sendiri** (`disposal_approved_by != disposal_proposed_by`), diproteksi di tingkat trigger database dan fungsi aplikasi.

#### B. Alur Panjar & SPJ Realisasi
```
[Panjar Aktif] ──► Tanggal melewati Due Date ──► [Tanda Merah: Overdue / Jatuh Tempo]
       │
       ▼ (Pengurus/Bendahara buat SPJ realisasi belanja)
[Draf SPJ] ──► Klik 'Ajukan SPJ ke Ketua' ──► [Menunggu Persetujuan Ketua]
                                                        │
         ┌──────────────────────────────────────────────┴──────────────────────────────────────────────┐
         ▼ (Ketua Kas Setujui)                                                                         ▼ (Ketua Kas Tolak/Kembalikan)
[SPJ Approved] & Panjar Otomatis Menjadi [Settled (Tuntas)]                                    [Draf SPJ + Catatan Kuitansi Kurang]
```
- **Aturan Tegas**: Penyusun laporan SPJ (`submitted_by`) **dilarang menyetujui laporannya sendiri** (`approved_by != submitted_by`).

---

### 4. Migrasi Data Sementara dari Modul Saldo Awal
Jika pada modul Saldo Awal (`opening_other_positions`) bendahara telah menginput data inventaris awal, panjar belum selesai, piutang, utang, atau dana titipan terikat:
1. Klik tombol **"Sinkronkan Data dari Saldo Awal"** pada bilah atas halaman `/lpj-data`.
2. Sistem otomatis memindahkan data tersebut ke tabel `fixed_assets`, `advances`, `receivables_payables`, dan menyetel `fund_type = 'restricted'` pada kas terkait.
3. Tabel asli `opening_other_positions` dan saldo awal yang terkunci **tetap utuh dan tidak terhapus**.

---

### 5. Ekspor Excel
Setiap sub-modul (Inventaris Aset Tetap, Panjar Kegiatan, dan Piutang/Utang) menyediakan tombol **Ekspor Excel (.xlsx)** instan dengan format kolom yang rapi untuk arsip fisik tata usaha gereja.
