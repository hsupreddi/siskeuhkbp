# Panduan Modul Saldo Awal dan Pembukaan Buku
## SIKU HKBP Ressort Hutaraja (Sistem Informasi Keuangan HKBP Ressort Hutaraja)

---

### 1. Latar Belakang & Filosofi Pembukuan
Sebelum implementasi sistem SIKU, pencatatan keuangan HKBP Ressort Hutaraja dilakukan secara manual di buku kas fisik oleh masing-masing bendahara seksi/kategorial dan bendahara umum. 

**Prinsip Dasar Pembukaan Buku:**
1. **Tidak Mengimpor Transaksi Lama**: Transaksi historis tahun-tahun sebelumnya tidak dipindahkan satu per satu ke dalam sistem database.
2. **Saldo Pindahan per 31 Desember**: Hanya saldo akhir per 31 Desember tahun lalu yang dimasukkan sebagai Saldo Awal pada Tanggal Mulai Pemakaian.
3. **Tanggal Mulai Pemakaian**: Ditetapkan selalu tanggal **1 Januari** pada Tahun Anggaran aktif (misalnya `2026-01-01`). Sistem memblokir pencatatan transaksi sebelum tanggal ini.
4. **Validasi Fisik & Kunci Kas Mandiri**: Setiap Kas (Umum, Diakonia, Sekolah Minggu, Kaum Ibu, Kaum Bapak, Naposobulung, Pembangunan) memiliki siklus pembukaan buku sendiri. Kas yang telah diverifikasi dan **Dikunci** dapat langsung mencatat transaksi tanpa menunggu kas seksi lain selesai.

---

### 2. Urutan Eksekusi Migrasi SQL di Supabase
Jalankan file migrasi di Supabase SQL Editor dengan urutan berikut:

1. `supabase/migration_01_schema.sql`: Skema inti (Profil, Kas, Tempat Penyimpanan, Kategori, Transaksi, Opening Balances Phase 1, RLS & Views).
2. `supabase/migration_02_seed.sql`: Data awal (Akun gereja HKBP Hutaraja, 7 kas seksi, tempat penyimpanan tunai & BRI/Mandiri, user simulasi).
3. `supabase/migration_03_anggaran.sql`: Modul APBG (Anggaran Pendapatan dan Belanja Gereja, alur Rapat Huria, sebaran bulanan).
4. `supabase/migration_04_saldo_awal.sql`: Modul Pembukaan Buku & Saldo Awal:
   - Tabel `opening_setup`, `opening_balance_entries`, `opening_balance_adjustments`, `opening_other_positions`, `prior_year_summaries`.
   - Triggers: `trg_check_tx_golive` (tolak tanggal tx < go-live), `trg_check_kas_locked` (tolak tx jika kas belum dikunci), `trg_protect_locked_opening` (proteksi edit langsung).
   - Storage bucket `opening-docs` (private) untuk foto buku kas, bukti hitung fisik, rekening koran.
   - RPC: `kunci_pembukaan_buku` yang secara otomatis menyinkronkan saldo awal ke tabel `public.opening_balances` untuk menjamin kompatibilitas mutlak dengan view neraca dan laporan laba/rugi yang ada.

---

### 3. Alur Status Pembukaan Buku per Kas
Setiap Kas Seksi melewati tahapan status berikut:
```
[Belum Dimulai (not_started)]
         │
         ▼ (Bendahara mulai input draf)
   [Penginputan (drafting)]
         │
         ▼ (Bendahara seksi klik 'Ajukan ke Ketua')
[Diajukan ke Ketua (submitted)]
         │
         ├──────────────────────────────┐
         ▼ (Ketua setuju)               ▼ (Ketua tolak / kembalikan draf)
  [Disetujui (approved)]        [Penginputan (drafting) + Catatan]
         │
         ▼ (Bendahara Umum / Admin kunci saldo)
    [Dikunci (locked)] ──► Kas aktif dapat mencatat transaksi
```

**Aturan Pemisahan Wewenang (Segregation of Duties):**
- **Penyusun Draf**: Hanya bendahara kas yang ditugaskan (atau Bendahara Umum untuk Kas Umum).
- **Peninjau**: Ketua Seksi (atau Pendeta Ressort untuk Kas Umum).
- **Anti Self-Approval**: Penginput draf saldo awal **dilarang menyetujui atau mengunci** pengajuannya sendiri.
- **Pengunci Akhir**: Bendahara Umum atau Admin mengunci saldo setelah rekonsiliasi total gereja cocok.

---

### 4. Langkah-Langkah Wizard Saldo Awal (4 Langkah)

#### Langkah 1: Matriks Kas x Tempat Penyimpanan
- Menampilkan kombinasi Kas yang dikelola dengan seluruh Tempat Penyimpanan (Uang Tunai Brankas, Rekening Bank BRI, Rekening Bank Mandiri).
- Masukkan nominal saldo per tanggal 31 Desember. Nominal tidak boleh negatif (`>= 0`).
- Mendukung pemisahan: dana milik kas apa, dan disimpan di rekening/brankas mana.

#### Langkah 2: Pencocokan dengan Fisik & Rekonsiliasi
- Untuk setiap tempat penyimpanan, masukkan:
  - **Saldo Menurut Buku Kas Manual**: Saldo pembukuan manual per 31 Desember.
  - **Fisik Kas / Rekening Koran**: Hasil perhitungan fisik uang tunai lembar per lembar atau saldo akhir rekening koran bank per 31 Desember.
  - **Selisih Otomatis**: Dihitung sistem (`Fisik - Buku Manual`).
- **Wajib Penjelasan Jika Selisih != 0**: Jika ada perbedaan kas bon sementara atau biaya admin bank yang belum tercatat di buku manual, wajib mencantumkan keterangan rinci.
- **Unggah Bukti Pendukung**: Lampirkan foto halaman terakhir buku kas manual bertandatangan, formulir hitung fisik kas tunai, atau scan rekening koran.

#### Langkah 3: Posisi Lain (Opsional)
Pencatatan akun pendukung awal yang dapat dilewati jika belum tersedia:
1. **Inventaris / Aset Tetap Awal**: Nama barang, kode inventaris, kategori (Tanah, Bangunan, Kendaraan, Sound System, dll.), tahun perolehan, estimasi nilai perolehan, kondisi fisik (Baik, Rusak Ringan, Rusak Berat), dan lokasi fisik di gereja.
2. **Panjar / Uang Muka Belum Selesai**: Dana kas bon kegiatan seksi tahun sebelumnya yang belum di-SPJ-kan.
3. **Piutang & Utang Awal**: Kewajiban seksi atau titipan pihak ketiga.
4. **Jenis Dana Terikat vs Bebas**: Catatan dana yang diperuntukkan khusus (misal: beasiswa anak asuh, dana renovasi lonceng gereja).

#### Langkah 4: Ringkasan & Cek Silang
- Sistem melakukan validasi matematis otomatis:
  - Total Saldo menurut Kas harus sama dengan Total Saldo menurut Tempat Penyimpanan (Cek Silang 100% Cocok).
  - Tidak ada nominal negatif.
  - Seluruh selisih fisik wajib memiliki penjelasan tertulis.
- Bendahara meninjau ringkasan akhir dan mengirimkannya secara formal ke Ketua Seksi.

---

### 5. Fitur Impor Excel (.xlsx)
Untuk mempermudah bendahara seksi yang telah merekap saldo awal dan inventaris di spreadsheet:
1. Klik tab **Impor Excel Saldo Awal**.
2. Unduh **Template Resmi Excel (.xlsx)** yang telah memuat daftar ID kas dan kode tempat penyimpanan yang valid.
3. Isi data pada sheet `Saldo Awal` dan sheet `Inventaris Aset`.
4. Unggah berkas Excel: sistem memvalidasi tipe data, format nominal angka, dan mengecek kecocokan nama kas/rekening.
5. Tabel pratinjau menampilkan baris valid (hijau) dan baris bermasalah (merah dengan penjelasan error).
6. Klik **Simpan Hasil Impor** untuk memasukkan langsung ke draf saldo awal kas Anda.

---

### 6. Penyesuaian Saldo Awal Setelah Dikunci
Apabila di kemudian hari ditemukan selisih atau kesalahan pencatatan saldo pindahan yang telah Dikunci:
- **Batas Waktu**: Penyesuaian hanya diizinkan **sebelum Tutup Buku Bulan 1 (Januari)** disahkan. Setelah bulan 1 ditutup, saldo awal terkunci permanen.
- **Formulir Penyesuaian**: Masukkan kas terkait, tempat penyimpanan, perubahan saldo bertanda plus (+) atau minus (-), alasan terperinci, dan nomor surat persetujuan/bukti.
- **Persetujuan Ganda**: Pengajuan penyesuaian wajib diverifikasi oleh Ketua Seksi dan disetujui resmi oleh Bendahara Umum.

---

### 7. Berita Acara Pembukaan Saldo Awal (PDF)
Aplikasi menyediakan generator dokumen resmi **Berita Acara Pembukaan Saldo Awal** dalam format PDF yang siap dicetak di kertas A4/Folio:
- **Kop Surat Resmi**: HKBP Ressort Hutaraja, Distrik, alamat lengkap, dan kontak.
- **Tabel Matriks Saldo Pindahan**: Rincian per kas dan per tempat penyimpanan.
- **Tabel Rekonsiliasi Fisik**: Hasil hitung kas tunai dan saldo bank beserta penjelasan selisih.
- **Lampiran Inventaris & Posisi Lain**: Daftar aset awal gereja.
- **Kolom 4 Tanda Tangan Sah**:
  1. Bendahara Seksi (Penyusun)
  2. Ketua Seksi (Pemeriksa)
  3. Bendahara Umum HKBP Ressort Hutaraja (Verifikator)
  4. Pendeta Ressort HKBP Ressort Hutaraja (Mengetahui & Menyetujui)

Dokumen ini menjadi arsip fisik resmi gereja untuk mendukung audit internal Majelis dan Rapat Huria tahunan.
