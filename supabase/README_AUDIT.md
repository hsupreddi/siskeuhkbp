# Panduan Modul Badan Audit Huria
## SIKU HKBP Ressort Hutaraja (Pemeriksaan Internal & Opname Kas)

---

### 1. Struktur Organisasi & Prinsip Independensi
Sesuai Tata Dasar dan Tata Tertib HKBP serta kaidah tata kelola keuangan gereja yang akuntabel, Badan Audit Huria HKBP Ressort Hutaraja beranggotakan tepat **3 (tiga) orang**:
1. **1 orang Ketua Badan Audit** (merangkap anggota penilai)
2. **2 orang Anggota Badan Audit**

#### Batasan Independensi Ketat (Anti-Conflict of Interest):
Anggota Badan Audit **DILARANG MERANGKAP JABATAN** sebagai:
- Bendahara Umum Huria
- Pendeta Ressort
- Sekretaris Huria
- Bendahara pada kas/seksi mana pun
- Ketua pada kas/seksi mana pun

Aturan independensi ini dijaga ganda:
1. **Tingkat Basis Data**: Trigger `trg_audit_member_independence` pada tabel `audit_body_members` yang memverifikasi data di tabel `profiles` dan `user_kas_access`.
2. **Tingkat Logika Aplikasi**: Fungsi `saveAuditBodyMember` pada `DataContext.tsx` yang memvalidasi integritas sebelum data disimpan.

---

### 2. File Migrasi Database (`supabase/migration_03b_audit.sql`)
File migrasi ini menambahkan struktur tabel dan aturan RLS berikut:

1. **Tabel `public.audit_body_members`**:
   - Kolom: `user_id`, `jabatan` (`ketua` | `anggota`), `periode_mulai`, `periode_selesai`, `is_active`.
   - Menegakkan tepat 3 anggota aktif (1 ketua, 2 anggota) melalui fungsi validasi trigger.

2. **Tabel `public.audit_engagements`**:
   - Penugasan audit resmi untuk 4 jenis periode per tahun:
     - `'opening'` (Pemeriksaan Saldo Awal saat pembukaan buku)
     - `'semester_1'` (Pemeriksaan Semester I: Jan - Jun)
     - `'semester_2'` (Pemeriksaan Semester II: Jul - Des)
     - `'tahunan'` (Pemeriksaan LPJ Tahunan ISAK 35)
   - Status perikatan: `draft` ──► `in_progress` ──► `review_completed` ──► `finalized`.

3. **Tabel `public.audit_reviews` (Penilaian Mandiri Tiap Anggota)**:
   - Setiap auditor dari 3 anggota menginput lembar kerja dan penilaian independen tanpa intervensi.
   - Kolom: `engagement_id`, `auditor_id`, `opini` (`sesuai`, `sesuai_dengan_catatan`, `perlu_perbaikan`), `catatan_umum`, `rekomendasi`.

4. **Tabel `public.audit_findings` (Daftar Temuan Pemeriksaan)**:
   - Kolom: `engagement_id`, `kas_id`, `judul`, `deskripsi`, `tingkat` (`informasi` | `wajib_diperbaiki`), `status` (`terbuka`, `ditanggapi`, `selesai`, `diterima`), `tanggapan_pengurus`, `rekomendasi_perbaikan`.
   - Temuan `wajib_diperbaiki` memblokir pengesahan laporan semester dan LPJ jika belum ditindaklanjuti atau belum mendapat dispensasi beralasan dari Majelis Huria.

5. **Tabel `public.audit_final_opinions` (Opini Kolektif & Berita Acara)**:
   - Disahkan setelah ketiga auditor memasukkan lembar kerjanya.
   - Menerapkan **Majority Rule (minimal 2 dari 3 suara setuju)**.
   - Jika terdapat perbedaan pendapat (dissenting opinion 2-1), pendapat berbeda **wajib dicantumkan secara transparan** di Berita Acara Hasil Pemeriksaan.
   - Menyimpan nomor surat berita acara, tanggal pengesahan, dan rincian suara ketiga anggota.

6. **Tabel `public.cash_counts` (Fasilitas Opname Kas Fisik & Brankas)**:
   - Menghitung lembar uang tunai secara fisik (Rp 100.000, 50.000, 20.000, 10.000, 5.000, 2.000, 1.000, dan koin).
   - Membandingkan total fisik dengan saldo buku kas pada tanggal pelaksanaan.
   - **Auto-Finding Trigger**: Jika terjadi selisih fisik vs buku (`selisih != 0`), database dan sistem secara otomatis membuat draf temuan audit berkategori `wajib_diperbaiki`.

---

### 3. Alur Kerja Pemeriksaan Badan Audit
```
[Buka Perikatan Audit] 
       │
       ▼
[Opname Fisik Kas & Penelusuran Sampel Dokumen Kuitansi/Rekening]
       │
       ▼ (Catat temuan jika ada ketidaksesuaian)
[Input Temuan: Informasi vs Wajib Diperbaiki] ──► Tanggapan Bendahara/Ketua Kas
       │
       ▼
[Input Penilaian Mandiri 3 Auditor] (Opini masing-masing anggota)
       │
       ▼ (Syarat: Minimal 3 review lengkap)
[Sidang Pleno Audit & Penentuan Opini Akhir]
       ├── Majority Vote (>= 2 dari 3 suara)
       └── Pencatatan Dissenting Opinion (jika suara 2-1)
       │
       ▼
[Penerbitan Berita Acara Audit Resmi (PDF Lengkap Kop Huria & 3 Tanda Tangan)]
```

---

### 4. Ekspor Berita Acara Pemeriksaan (PDF)
Aplikasi menyediakan fungsi `generateBeritaAcaraAuditPDF` yang mencetak dokumen resmi:
- Kop surat HKBP Ressort Hutaraja.
- Pernyataan ruang lingkup dan metodologi audit.
- Opini akhir kolektif dan tabulasi perolehan suara.
- Catatan dissenting opinion (jika ada).
- Tabel rekapitulasi temuan audit dan status tindak lanjut.
- Blok tanda tangan resmi ketiga anggota Badan Audit Huria lengkap dengan gelar dan jabatan.
