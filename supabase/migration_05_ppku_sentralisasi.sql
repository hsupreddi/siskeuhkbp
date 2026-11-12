-- ==============================================================================
-- MIGRATION 05: PPKU SENTRALISASI KEUANGAN HKBP (55% BPSK PUSAT : 45% HURIA)
-- ==============================================================================
-- Menambahkan kolom-kolom kalkulator dan pelaporan resmi sentralisasi PPKU HKBP
-- serta mendaftarkan seluruh pos penerimaan objek sentralisasi dan pos pengecualian.

-- 1. Tambah kolom pada tabel categories
alter table if exists public.categories
  add column if not exists is_sentralisasi boolean not null default true,
  add column if not exists sentralisasi_group text,
  add column if not exists sentralisasi_exclusion_type text;

-- 2. Tambah kolom pada tabel transactions
alter table if exists public.transactions
  add column if not exists is_sentralisasi boolean default true,
  add column if not exists bpsk_rate numeric(5,2) default 0.55,
  add column if not exists huria_rate numeric(5,2) default 0.45,
  add column if not exists bpsk_amount numeric(15,2) default 0,
  add column if not exists huria_amount numeric(15,2) default 0,
  add column if not exists sentralisasi_remitted boolean default false,
  add column if not exists sentralisasi_remitted_at timestamptz,
  add column if not exists sentralisasi_remitted_ref text,
  add column if not exists sentralisasi_exclusion_type text;

-- 3. Daftarkan / Perbarui Master Pos Kategori PPKU Sentralisasi Keuangan HKBP
insert into public.categories (id, nama, tipe, kode, deskripsi, is_active, is_sentralisasi, sentralisasi_group, sentralisasi_exclusion_type) values
  -- Kelompok 1: Pelean Mingguan & Ibadah Lainnya (55% / 45%)
  ('cat-in-pelean-1-2', 'Pelean I & II (Kebaktian Minggu)', 'income', 'IN-01', 'Persembahan kebaktian hari Minggu (Objek Sentralisasi: 55% BPSK HKBP / 45% Kas Huria)', true, true, 'pelean_mingguan', null),
  ('cat-in-namarboho', 'Pelean Namarboho (Bulanan / Tahunan Jemaat)', 'income', 'IN-02', 'Persembahan bulanan / tahunan wajib jemaat (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)', true, true, 'pelean_mingguan', null),
  ('cat-in-partangiangan', 'Pelean Kebaktian Lingkungan / Sektor (Partangiangan)', 'income', 'IN-03', 'Persembahan partangiangan wijk/sektor (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)', true, true, 'pelean_mingguan', null),
  ('cat-in-kategorial', 'Pelean Kebaktian Kategori / Seksi (Sekolah Minggu, Remaja, Naposo, Ina, Ama, Lansia)', 'income', 'IN-04', 'Persembahan ibadah seksi kategorial gereja (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)', true, true, 'pelean_mingguan', null),
  ('cat-in-hari-raya', 'Pelean Hari Raya Gerejawi (Natal, Tahun Baru, Paskah, Kenaikan)', 'income', 'IN-05', 'Persembahan kebaktian pesta hari besar gerejawi (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)', true, true, 'pelean_mingguan', null),

  -- Kelompok 2: Persembahan Syukur dan Khusus (Pelean Hamauliateon) (55% / 45%)
  ('cat-in-syukur-altar', 'Pelean Hamauliateon (Syukur Altar / Panggung / Amplop)', 'income', 'IN-06', 'Persembahan syukur jemaat amplop/kotak altar (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)', true, true, 'pelean_syukur', null),
  ('cat-in-syukur-baptisan', 'Pelean Syukur Baptisan Kudus (Pandidion)', 'income', 'IN-07', 'Ucapan syukur atas sakramen baptisan kudus (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)', true, true, 'pelean_syukur', null),
  ('cat-in-syukur-sidi', 'Pelean Syukur Peneguhan Sidi (Malua)', 'income', 'IN-08', 'Ucapan syukur atas peneguhan sidi jemaat (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)', true, true, 'pelean_syukur', null),
  ('cat-in-syukur-nikah', 'Pelean Syukur Pernikahan Kudus (Pamasu-masuon)', 'income', 'IN-09', 'Ucapan syukur pemberkatan pernikahan jemaat (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)', true, true, 'pelean_syukur', null),
  ('cat-in-syukur-keluarga', 'Pelean Syukur Keluarga & Syukur Khusus Lainnya', 'income', 'IN-10', 'Ucapan syukur keluarga, ulang tahun, dll (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)', true, true, 'pelean_syukur', null),

  -- Kelompok 3: Penerimaan Badan Usaha, Lembaga & Sumber Resmi (55% / 45%)
  ('cat-in-badan-usaha', 'Keuntungan Badan Usaha Milik HKBP', 'income', 'IN-11', 'Penerimaan dividen/keuntungan badan usaha HKBP (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)', true, true, 'badan_usaha_lembaga', null),
  ('cat-in-yayasan', 'Kontribusi / Sumbangan Yayasan di Bawah HKBP', 'income', 'IN-12', 'Kontribusi resmi yayasan naungan HKBP (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)', true, true, 'badan_usaha_lembaga', null),
  ('cat-in-pendidikan-tinggi', 'Keuntungan Lembaga Pendidikan Tinggi HKBP', 'income', 'IN-13', 'Penerimaan resmi dari perguruan tinggi HKBP (Objek Sentralisasi: 55% BPSK / 45% Huria)', true, true, 'badan_usaha_lembaga', null),
  ('cat-in-hibah-eksternal', 'Bantuan, Hibah, & Sumbangan Resmi Pihak Luar', 'income', 'IN-14', 'Bantuan/hibah sah pihak luar seizin Pimpinan HKBP (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)', true, true, 'badan_usaha_lembaga', null),

  -- ❌ Kelompok 4: POS PENERIMAAN YANG DIKECUALIKAN (100% KAS HURIA / PERUNTUKAN KHUSUS)
  ('cat-in-ex-sosial-duka', 'Pelean Sosial / Duka (Pelean Sosial / Gariana)', 'income', 'IN-EX-01', '❌ Dikecualikan dari Sentralisasi: 100% dikelola untuk jemaat berduka / kemalangan (Kas Diakonia Sosial)', true, false, 'dikecualikan_khusus', 'sosial_duka'),
  ('cat-in-ex-beasiswa', 'Pelean Beasiswa (Pelean Dana Belajar)', 'income', 'IN-EX-02', '❌ Dikecualikan dari Sentralisasi: 100% dikelola khusus untuk bantuan pendidikan / beasiswa jemaat', true, false, 'dikecualikan_khusus', 'beasiswa'),
  ('cat-in-ex-pembangunan', 'Dana Pembangunan Fisik Lokal', 'income', 'IN-EX-03', '❌ Dikecualikan dari Sentralisasi: 100% dikelola kepanitiaan pembangunan untuk renovasi / pembangunan fisik gereja lokal', true, false, 'dikecualikan_khusus', 'pembangunan_lokal'),

  -- Pos Pengeluaran Setoran BPSK & Operasional
  ('cat-out-bpsk', 'Penyetoran 55% Sentralisasi ke Kas Pusat (BPSK HKBP)', 'expense', 'OUT-01', 'Penyetoran kewajiban sentralisasi 55% ke rekening BPSK HKBP Kantor Pusat', true, false, null, null),
  ('cat-out-operasional-huria', 'Operasional & Administrasi Pelayanan Huria (45%)', 'expense', 'OUT-02', 'Beban operasional rutin pelayanan lokal huria dari porsi 45%', true, false, null, null)
on conflict (id) do update set
  nama = excluded.nama,
  kode = excluded.kode,
  deskripsi = excluded.deskripsi,
  is_sentralisasi = excluded.is_sentralisasi,
  sentralisasi_group = excluded.sentralisasi_group,
  sentralisasi_exclusion_type = excluded.sentralisasi_exclusion_type;
