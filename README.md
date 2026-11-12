# SIKU HKBP Hutaraja (Sistem Informasi Keuangan HKBP Ressort Hutaraja)

Aplikasi web modern, bersih, ramah, dan mobile-first untuk pencatatan keuangan multi-bendahara seksi, alur persetujuan ketua seksi, penutupan buku bulanan, rekonsiliasi kas, serta pencetakan laporan keuangan resmi dan Laporan Pertanggungjawaban (LPJ) dengan kop surat gereja HKBP Ressort Hutaraja.

---

## 🏛️ Konteks Organisasi & Arsitektur Kas

- **Satu Entitas Organisasi**: HKBP Ressort Hutaraja adalah ressort khusus yang tidak membawahi huria lain (gereja ini sekaligus huria dan ressort). Tidak ada konsep multi-huria atau konsolidasi antar huria.
- **Kas Terpisah per Seksi**: Keuangan memakai kas terpisah per seksi/sektor (contoh: Kas Umum, Kas Diakonia, Kas Sekolah Minggu, Kas Kaum Ibu, Kas Kaum Bapak, Kas Naposobulung, Kas Pembangunan).
- **Pemisahan Kas vs Tempat Penyimpanan**:
  - **Kas (Dana)**: "uang milik siapa/untuk apa" (contoh: Kas Diakonia).
  - **Tempat Penyimpanan (Rekening)**: "uangnya disimpan di mana" (contoh: Brankas Tunai Huria, Bank BRI, Bank Mandiri).
- **Alur Persetujuan & Integritas**:
  - Draft → Diajukan (Submitted) → Disetujui (Approved) / Ditolak (Rejected dengan catatan wajib).
  - Penginput tidak dapat menyetujui transaksinya sendiri.
  - Transaksi Disetujui terkunci secara permanen; koreksi dilakukan melalui transaksi pembalik/koreksi (`reverses_id`).
  - Transfer antar rekening/kas dicatat atomik berpasangan (`transfer_id`) dan berstatus net-nol terhadap laporan laba rugi.

---

## 🚀 Panduan Setup & Instalasi

### 1. Membuat Project Supabase
1. Buka [supabase.com](https://supabase.com) dan login/daftar akun.
2. Klik **New Project**, pilih nama organisasi dan beri nama project: `siku-hkbp-hutaraja`.
3. Buat password database yang kuat, pilih wilayah hosting terdekat (misal: **Singapore**).
4. Tunggu proses provisioning selesai (~1-2 menit).

### 2. Menjalankan Database Schema di Supabase
1. Di Dashboard Supabase, buka menu **SQL Editor** pada navigasi sebelah kiri.
2. Buka berkas `supabase/schema.sql` dari repositori ini, salin seluruh isinya.
3. Tempelkan ke dalam SQL Editor Supabase, lalu klik tombol **Run** (Ctrl+Enter / Cmd+Enter).
4. Skrip ini akan secara otomatis:
   - Membuat enum tipe data, tabel-tabel utama (`profiles`, `kas`, `user_kas_access`, `storage_accounts`, `opening_balances`, `categories`, `transactions`, `period_closings`, `reconciliations`, `audit_logs`, `app_settings`).
   - Membuat view kalkulasi saldo resmi dan proyeksi (`view_kas_balances`, `view_storage_balances`, `view_monthly_summary_per_kas`).
   - Menerapkan Row Level Security (RLS) ketat.
   - Mengaktifkan fungsi transfer atomik dan trigger validasi integritas.
   - Menyiapkan bucket Storage privat bernama `receipts`.
   - Mengisi seed data awal kas, rekening bank, kategori, saldo awal 2026, dan pengaturan kop surat.

### 3. Mengatur Environment Variables (.env)
1. Di dashboard Supabase, buka menu **Project Settings** → **API**.
2. Salin **Project URL** dan **anon public key**.
3. Buat file `.env` di direktori utama proyek (salin dari `.env.example`):
   ```bash
   cp .env.example .env
   ```
4. Isi kredensial Anda:
   ```env
   VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
   VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   ```

### 4. Menjalankan Aplikasi Secara Lokal
1. Pastikan Node.js (v18+) terpasang.
2. Pasang dependensi dan jalankan server pengembangan:
   ```bash
   npm install
   npm run dev
   ```
3. Buka browser pada alamat `http://localhost:3000`.

### 5. Push ke GitHub
```bash
git init
git add .
git commit -m "feat: inisialisasi SIKU HKBP Hutaraja Fase 1"
git branch -M main
git remote add origin https://github.com/username/siku-hkbp-hutaraja.git
git push -u origin main
```

### 6. Deploy ke Vercel
1. Buka [vercel.com](https://vercel.com) dan login dengan akun GitHub Anda.
2. Klik **Add New...** → **Project**, lalu impor repositori `siku-hkbp-hutaraja`.
3. Pada bagian **Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL`: URL project Supabase Anda.
   - `VITE_SUPABASE_ANON_KEY`: Anon key Supabase Anda.
4. Klik **Deploy**. Berkas `vercel.json` yang disertakan akan secara otomatis mengarahkan seluruh rute SPA ke `index.html`.

---

## 👥 Manajemen Pengguna & Penugasan Kas

### 7. Cara Membuat Akun Admin Pertama
1. Di Dashboard Supabase, buka menu **Authentication** → **Users**.
2. Klik **Add user** → **Create user**.
3. Masukkan email Admin (contoh: `admin@hkbp-hutaraja.org`) dan password sementara.
4. Buka menu **SQL Editor** di Supabase, lalu jalankan query ini untuk memberikan peran `admin` pada profilnya:
   ```sql
   insert into public.profiles (id, email, full_name, role, is_active)
   values (
     'PASTE-USER-UUID-DARI-AUTH-USERS-DISINI',
     'admin@hkbp-hutaraja.org',
     'St. P. Sitompul (Admin)',
     'admin',
     true
   )
   on conflict (id) do update set role = 'admin';
   ```

### 8. Cara Menambah Bendahara dan Ketua Seksi Serta Menugaskan Kasnya
1. **Buat Akun Pengguna**:
   - Admin membuat user baru di Supabase Auth (atau kirim email undangan via **Invite user**).
   - Catat ID user dan masukkan ke tabel `profiles` dengan role `pengurus_kas`.
2. **Tugaskan ke Kas di Aplikasi**:
   - Login ke aplikasi SIKU HKBP Hutaraja sebagai **Admin**.
   - Masuk ke menu **Data Master** → Tab **Penugasan Pengurus Kas**.
   - Pada formulir "Beri Penugasan Kas Baru":
     1. Pilih **Nama Pengguna**.
     2. Pilih **Kas yang Ditugaskan** (contoh: `Kas Diakonia`).
     3. Pilih **Tingkat Akses**:
        - `bendahara`: berwenang menginput transaksi kas tersebut, membuat draf, dan mengajukan persetujuan.
        - `ketua`: berwenang memverifikasi, menyetujui, atau menolak pengajuan transaksi pada kas tersebut.
     4. Klik **Tugaskan Pengurus**.
3. **Catatan Keamanan**:
   - Bendahara Umum bertindak sebagai penginput pada Kas Umum.
   - Pendeta Ressort bertindak sebagai Ketua pada Kas Umum yang menyetujui transaksi Kas Umum.
   - Sistem secara ketat melarang Bendahara Umum ditugaskan sebagai Ketua pada Kas Umum demi menjaga pemisahan kewenangan (*separation of duties*).
