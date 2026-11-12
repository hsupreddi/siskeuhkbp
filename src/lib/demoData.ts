/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AppSettings,
  AuditLog,
  Budget,
  BudgetItem,
  BudgetReallocation,
  Category,
  Kas,
  OpeningBalance,
  OpeningSetup,
  OpeningBalanceEntry,
  OpeningBalanceAdjustment,
  OpeningOtherPosition,
  PriorYearSummary,
  PeriodClosing,
  Profile,
  StorageAccount,
  Transaction,
  UserKasAccess,
  FixedAsset,
  Advance,
  AdvanceSettlement,
  ReceivablePayable,
  LpjNotes,
  LpjSettings,
  AuditBodyMember,
  AuditEngagement,
  AuditReview,
  AuditFinding,
  AuditFinalOpinion,
  CashCount,
  SemesterReport,
  LpjReport,
  LpjException,
  AuditPeriodVerification,
  FiscalYear,
} from '../types/database';

export const DEMO_SETTINGS: AppSettings = {
  id: 'main',
  church_name: 'HKBP Ressort Hutaraja',
  church_subtext: 'Ressort Khusus - Distrik V Sumatera Timur',
  church_address: 'Jl. Gereja No. 1, Hutaraja, Sumatera Utara',
  church_phone: '0812-3456-7890',
  church_email: 'ressort.hutaraja@hkbp.or.id',
  pendeta_name: 'Pdt. R. Simanjuntak, S.Th',
  sekretaris_name: 'St. M. Siregar',
  bendahara_umum_name: 'St. B. Hutapea',
  receipt_required_threshold: 500000,
  block_negative_balance: true,
  active_year: 2026,
  budget_reallocation_max_pct: 15, // Max 15% pergeseran anggaran antar baris
};

export const DEMO_PROFILES: Profile[] = [
  {
    id: 'user-admin',
    email: 'admin@hkbp-hutaraja.org',
    full_name: 'St. P. Sitompul (Admin)',
    role: 'admin',
    ecclesiastical_role: 'admin_sistem',
    tohonan: 'sintua',
    tingkat: 'huria',
    wijk: 'Wijk II',
    phone: '0812-1111-2222',
    is_active: true,
  },
  {
    id: 'user-bendum',
    email: 'bendum@hkbp-hutaraja.org',
    full_name: 'St. B. Hutapea (Bendahara Huria)',
    role: 'bendahara_umum',
    ecclesiastical_role: 'bendahara_huria',
    tohonan: 'sintua',
    tingkat: 'huria',
    wijk: 'Wijk I',
    phone: '0813-2222-3333',
    is_active: true,
  },
  {
    id: 'user-pendeta',
    email: 'pendeta@hkbp-hutaraja.org',
    full_name: 'Pdt. R. Simanjuntak, S.Th (Pendeta Ressort)',
    role: 'pendeta_ressort',
    ecclesiastical_role: 'pendeta_ressort',
    tohonan: 'pendeta',
    tingkat: 'ressort',
    phone: '0811-3333-4444',
    is_active: true,
  },
  {
    id: 'user-sekretaris',
    email: 'sekretaris@hkbp-hutaraja.org',
    full_name: 'St. M. Siregar (Sekretaris Huria)',
    role: 'sekretaris',
    ecclesiastical_role: 'sekretaris_huria',
    tohonan: 'sintua',
    tingkat: 'huria',
    wijk: 'Wijk IV',
    phone: '0812-4444-5555',
    is_active: true,
  },
  {
    id: 'user-pdt-fungsional',
    email: 'pdt.fungsional@hkbp-hutaraja.org',
    full_name: 'Pdt. D. boru Panjaitan, M.Th (Pendeta Fungsional)',
    role: 'majelis',
    ecclesiastical_role: 'pendeta_fungsional',
    tohonan: 'pendeta',
    tingkat: 'huria',
    phone: '0812-3333-7777',
    is_active: true,
  },
  {
    id: 'user-guru-huria',
    email: 'guru.huria@hkbp-hutaraja.org',
    full_name: 'Gr. J. Tambunan (Guru Huria)',
    role: 'majelis',
    ecclesiastical_role: 'guru_huria',
    tohonan: 'guru_huria',
    tingkat: 'huria',
    phone: '0812-7777-6666',
    is_active: true,
  },
  {
    id: 'user-bibelvrouw',
    email: 'bvr.marpaung@hkbp-hutaraja.org',
    full_name: 'Bvr. S. boru Marpaung (Bibelvrouw)',
    role: 'majelis',
    ecclesiastical_role: 'bibelvrouw',
    tohonan: 'bibelvrouw',
    tingkat: 'huria',
    phone: '0813-8888-2222',
    is_active: true,
  },
  {
    id: 'user-diakones',
    email: 'diak.hasibuan@hkbp-hutaraja.org',
    full_name: 'Diak. R. boru Hasibuan (Diakones)',
    role: 'majelis',
    ecclesiastical_role: 'diakones',
    tohonan: 'diakones',
    tingkat: 'huria',
    phone: '0812-5555-9999',
    is_active: true,
  },
  {
    id: 'user-dewan-koinonia',
    email: 'koinonia@hkbp-hutaraja.org',
    full_name: 'St. Dr. H. Sinaga (Ketua Dewan Koinonia)',
    role: 'pengurus_kas',
    ecclesiastical_role: 'ketua_dewan_koinonia',
    tohonan: 'sintua',
    tingkat: 'huria',
    wijk: 'Wijk III',
    phone: '0812-3434-5656',
    is_active: true,
  },
  {
    id: 'user-dewan-diakonia',
    email: 'dewan.diakonia@hkbp-hutaraja.org',
    full_name: 'St. K. Pasaribu (Ketua Dewan Diakonia)',
    role: 'pengurus_kas',
    ecclesiastical_role: 'ketua_dewan_diakonia',
    tohonan: 'sintua',
    tingkat: 'huria',
    wijk: 'Wijk V',
    phone: '0812-6666-7777',
    is_active: true,
  },
  {
    id: 'user-bend-diakonia',
    email: 'diakonia.bendahara@hkbp-hutaraja.org',
    full_name: 'Ny. S. Nababan (Bendahara Seksi Diakoni Sosial)',
    role: 'pengurus_kas',
    ecclesiastical_role: 'pengurus_seksi_diakoni_sosial',
    tohonan: 'non_tahbisan',
    tingkat: 'huria',
    seksi_name: 'Seksi Diakoni Sosial',
    phone: '0813-5555-6666',
    is_active: true,
  },
  {
    id: 'user-bend-sm',
    email: 'sm.bendahara@hkbp-hutaraja.org',
    full_name: 'Sdri. L. Panjaitan (Bendahara Sekolah Minggu)',
    role: 'pengurus_kas',
    ecclesiastical_role: 'pengurus_seksi_sekolah_minggu',
    tohonan: 'non_tahbisan',
    tingkat: 'huria',
    seksi_name: 'Seksi Sekolah Minggu',
    phone: '0813-7777-8888',
    is_active: true,
  },
  {
    id: 'user-ketua-sm',
    email: 'sm.ketua@hkbp-hutaraja.org',
    full_name: 'St. E. Manurung (Ketua Seksi Sekolah Minggu)',
    role: 'pengurus_kas',
    ecclesiastical_role: 'pengurus_seksi_sekolah_minggu',
    tohonan: 'sintua',
    tingkat: 'huria',
    seksi_name: 'Seksi Sekolah Minggu',
    wijk: 'Wijk II',
    phone: '0811-8888-9999',
    is_active: true,
  },
  {
    id: 'user-bend-ina',
    email: 'ina.bendahara@hkbp-hutaraja.org',
    full_name: 'Ny. M. Boru Tampubolon (Bendahara Kaum Ibu)',
    role: 'pengurus_kas',
    ecclesiastical_role: 'pengurus_seksi_parompuan',
    tohonan: 'non_tahbisan',
    tingkat: 'huria',
    seksi_name: 'Seksi Parompuan',
    phone: '0812-9999-0000',
    is_active: true,
  },
  {
    id: 'user-parartaon',
    email: 'parartaon@hkbp-hutaraja.org',
    full_name: 'St. F. Sitorus (Majelis Perbendaharaan / Parartaon)',
    role: 'majelis',
    ecclesiastical_role: 'majelis_perbendaharaan',
    tohonan: 'sintua',
    tingkat: 'huria',
    wijk: 'Wijk VI',
    phone: '0812-4321-8765',
    is_active: true,
  },
  {
    id: 'user-majelis',
    email: 'majelis@hkbp-hutaraja.org',
    full_name: 'St. J. Nainggolan (Sintua Wijk VII)',
    role: 'majelis',
    ecclesiastical_role: 'sintua',
    tohonan: 'sintua',
    tingkat: 'huria',
    wijk: 'Wijk VII',
    phone: '0813-1010-2020',
    is_active: true,
  },
  {
    id: 'user-audit-ketua',
    email: 'audit.ketua@hkbp-hutaraja.org',
    full_name: 'St. T. Simatupang, SE, Ak (Ketua Badan Audit)',
    role: 'auditor',
    ecclesiastical_role: 'ketua_badan_audit',
    tohonan: 'sintua',
    tingkat: 'huria',
    wijk: 'Wijk I',
    phone: '0812-7070-8080',
    is_active: true,
  },
  {
    id: 'user-audit-1',
    email: 'audit.anggota1@hkbp-hutaraja.org',
    full_name: 'St. Ir. H. Purba (Anggota Badan Audit)',
    role: 'auditor',
    ecclesiastical_role: 'anggota_badan_audit',
    tohonan: 'sintua',
    tingkat: 'huria',
    wijk: 'Wijk IV',
    phone: '0813-8080-9090',
    is_active: true,
  },
  {
    id: 'user-audit-2',
    email: 'audit.anggota2@hkbp-hutaraja.org',
    full_name: 'Dra. R. boru Lumbantobing (Anggota Badan Audit)',
    role: 'auditor',
    ecclesiastical_role: 'anggota_badan_audit',
    tohonan: 'non_tahbisan',
    tingkat: 'huria',
    phone: '0812-9090-0101',
    is_active: true,
  },
];

export const DEMO_KAS: Kas[] = [
  {
    id: 'kas-1',
    kode: 'KAS-UMUM',
    nama: 'Kas Umum',
    deskripsi: 'Pusat kas operasional huria dan ressort HKBP Hutaraja',
    warna: '#7C9CF5',
    fund_type: 'unrestricted',
    is_active: true,
  },
  {
    id: 'kas-2',
    kode: 'KAS-DIAKONIA',
    nama: 'Kas Diakonia',
    deskripsi: 'Dana sosial, bantuan kedukaan, sakit, dan kemanusiaan jemaat',
    warna: '#A8E6CF',
    fund_type: 'restricted',
    restricted_purpose: 'Pelayanan kasih, bantuan orang sakit, janda/yatim, dan santunan kedukaan',
    is_active: true,
  },
  {
    id: 'kas-3',
    kode: 'KAS-SM',
    nama: 'Kas Sekolah Minggu',
    deskripsi: 'Dana pembinaan anak dan guru Sekolah Minggu',
    warna: '#FFE8A3',
    fund_type: 'unrestricted',
    is_active: true,
  },
  {
    id: 'kas-4',
    kode: 'KAS-INA',
    nama: 'Kas Kaum Ibu (Ina)',
    deskripsi: 'Dana persekutuan dan kegiatan Seksi Parompuan',
    warna: '#FFB4A2',
    fund_type: 'unrestricted',
    is_active: true,
  },
  {
    id: 'kas-5',
    kode: 'KAS-AMA',
    nama: 'Kas Kaum Bapak (Ama)',
    deskripsi: 'Dana persekutuan dan kegiatan Seksi Ama',
    warna: '#B8C0FF',
    fund_type: 'unrestricted',
    is_active: true,
  },
  {
    id: 'kas-6',
    kode: 'KAS-RNHKBP',
    nama: 'Kas Naposobulung (Pemuda)',
    deskripsi: 'Dana kegiatan Remaja dan Naposobulung HKBP Hutaraja',
    warna: '#CDB4FF',
    fund_type: 'unrestricted',
    is_active: true,
  },
  {
    id: 'kas-7',
    kode: 'KAS-BANGUN',
    nama: 'Kas Pembangunan',
    deskripsi: 'Dana renovasi fisik gereja, pastori, dan sarana ibadah',
    warna: '#FFD166',
    fund_type: 'restricted',
    restricted_purpose: 'Pembangunan fisik menara lonceng gereja, renovasi pastori ressort, dan sarana ibadah',
    is_active: true,
  },
];

export const DEMO_STORAGE_ACCOUNTS: StorageAccount[] = [
  {
    id: 'stor-1',
    nama: 'Brankas Tunai Huria',
    tipe: 'cash',
    nomor_rekening: null,
    atas_nama: 'Bendahara HKBP Hutaraja',
    is_active: true,
  },
  {
    id: 'stor-2',
    nama: 'Bank BRI Ressort Hutaraja',
    tipe: 'bank',
    nomor_rekening: '3210-01-002345-53-1',
    atas_nama: 'HKBP Ressort Hutaraja',
    is_active: true,
  },
  {
    id: 'stor-3',
    nama: 'Bank Mandiri Ressort Hutaraja',
    tipe: 'bank',
    nomor_rekening: '107-00-1289456-7',
    atas_nama: 'HKBP Ressort Hutaraja',
    is_active: true,
  },
];

export const DEMO_USER_KAS_ACCESS: UserKasAccess[] = [
  // Kas Umum: Bendahara Umum input, Pendeta Ressort ketua (approver), Sekretaris backup ketua
  { id: 'uka-1', user_id: 'user-bendum', kas_id: 'kas-1', access_level: 'bendahara' },
  { id: 'uka-2', user_id: 'user-pendeta', kas_id: 'kas-1', access_level: 'ketua' },
  { id: 'uka-3', user_id: 'user-sekretaris', kas_id: 'kas-1', access_level: 'ketua' },

  // Kas Diakonia: Ny. S. Nababan bendahara, St. K. Pasaribu ketua
  { id: 'uka-4', user_id: 'user-bend-diakonia', kas_id: 'kas-2', access_level: 'bendahara' },
  { id: 'uka-5', user_id: 'user-ketua-diakonia', kas_id: 'kas-2', access_level: 'ketua' },

  // Kas Sekolah Minggu: Sdri. L. Panjaitan bendahara, St. E. Manurung ketua
  { id: 'uka-6', user_id: 'user-bend-sm', kas_id: 'kas-3', access_level: 'bendahara' },
  { id: 'uka-7', user_id: 'user-ketua-sm', kas_id: 'kas-3', access_level: 'ketua' },

  // Kas Kaum Ibu
  { id: 'uka-8', user_id: 'user-bend-ina', kas_id: 'kas-4', access_level: 'bendahara' },
];

export const DEMO_CATEGORIES: Category[] = [
  // ==========================================
  // POS PENERIMAAN / PEMASUKAN (INCOME)
  // ==========================================
  
  // 1. Persembahan Mingguan dan Ibadah Lainnya (Pelean) - Objek Sentralisasi (55% BPSK / 45% Huria)
  {
    id: 'cat-in-pelean-1-2',
    nama: 'Pelean I & II (Kebaktian Minggu)',
    tipe: 'income',
    kode: 'IN-01',
    deskripsi: 'Persembahan kebaktian hari Minggu (Objek Sentralisasi: 55% BPSK HKBP / 45% Kas Huria)',
    is_active: true,
    is_sentralisasi: true,
    sentralisasi_group: 'pelean_mingguan',
    sentralisasi_exclusion_type: null,
  },
  {
    id: 'cat-in-namarboho',
    nama: 'Pelean Namarboho (Bulanan / Tahunan Jemaat)',
    tipe: 'income',
    kode: 'IN-02',
    deskripsi: 'Persembahan bulanan / tahunan wajib jemaat / Namarboho (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)',
    is_active: true,
    is_sentralisasi: true,
    sentralisasi_group: 'pelean_mingguan',
    sentralisasi_exclusion_type: null,
  },
  {
    id: 'cat-in-partangiangan',
    nama: 'Pelean Kebaktian Lingkungan / Sektor (Partangiangan)',
    tipe: 'income',
    kode: 'IN-03',
    deskripsi: 'Persembahan partangiangan wijk/sektor (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)',
    is_active: true,
    is_sentralisasi: true,
    sentralisasi_group: 'pelean_mingguan',
    sentralisasi_exclusion_type: null,
  },
  {
    id: 'cat-in-kategorial',
    nama: 'Pelean Kebaktian Kategori / Seksi (Sekolah Minggu, Remaja, Naposo, Ina, Ama, Lansia)',
    tipe: 'income',
    kode: 'IN-04',
    deskripsi: 'Persembahan ibadah seksi kategorial gereja (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)',
    is_active: true,
    is_sentralisasi: true,
    sentralisasi_group: 'pelean_mingguan',
    sentralisasi_exclusion_type: null,
  },
  {
    id: 'cat-in-hari-raya',
    nama: 'Pelean Hari Raya Gerejawi (Natal, Tahun Baru, Paskah, Kenaikan)',
    tipe: 'income',
    kode: 'IN-05',
    deskripsi: 'Persembahan kebaktian pesta hari besar gerejawi (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)',
    is_active: true,
    is_sentralisasi: true,
    sentralisasi_group: 'pelean_mingguan',
    sentralisasi_exclusion_type: null,
  },

  // 2. Persembahan Syukur dan Khusus (Pelean Hamauliateon) - Objek Sentralisasi (55% BPSK / 45% Huria)
  {
    id: 'cat-in-syukur-altar',
    nama: 'Pelean Hamauliateon (Syukur Altar / Panggung / Amplop)',
    tipe: 'income',
    kode: 'IN-06',
    deskripsi: 'Persembahan syukur jemaat amplop/kotak altar (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)',
    is_active: true,
    is_sentralisasi: true,
    sentralisasi_group: 'pelean_syukur',
    sentralisasi_exclusion_type: null,
  },
  {
    id: 'cat-in-syukur-baptisan',
    nama: 'Pelean Syukur Baptisan Kudus (Pandidion)',
    tipe: 'income',
    kode: 'IN-07',
    deskripsi: 'Ucapan syukur atas sakramen baptisan kudus (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)',
    is_active: true,
    is_sentralisasi: true,
    sentralisasi_group: 'pelean_syukur',
    sentralisasi_exclusion_type: null,
  },
  {
    id: 'cat-in-syukur-sidi',
    nama: 'Pelean Syukur Peneguhan Sidi (Malua)',
    tipe: 'income',
    kode: 'IN-08',
    deskripsi: 'Ucapan syukur atas peneguhan sidi jemaat (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)',
    is_active: true,
    is_sentralisasi: true,
    sentralisasi_group: 'pelean_syukur',
    sentralisasi_exclusion_type: null,
  },
  {
    id: 'cat-in-syukur-nikah',
    nama: 'Pelean Syukur Pernikahan Kudus (Pamasu-masuon)',
    tipe: 'income',
    kode: 'IN-09',
    deskripsi: 'Ucapan syukur pemberkatan pernikahan jemaat (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)',
    is_active: true,
    is_sentralisasi: true,
    sentralisasi_group: 'pelean_syukur',
    sentralisasi_exclusion_type: null,
  },
  {
    id: 'cat-in-syukur-keluarga',
    nama: 'Pelean Syukur Keluarga & Syukur Khusus Lainnya',
    tipe: 'income',
    kode: 'IN-10',
    deskripsi: 'Ucapan syukur keluarga, ulang tahun, dll (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)',
    is_active: true,
    is_sentralisasi: true,
    sentralisasi_group: 'pelean_syukur',
    sentralisasi_exclusion_type: null,
  },

  // 3. Penerimaan Badan Usaha, Lembaga, dan Sumber Resmi Lainnya - Objek Sentralisasi (55% BPSK / 45% Huria)
  {
    id: 'cat-in-badan-usaha',
    nama: 'Keuntungan Badan Usaha Milik HKBP',
    tipe: 'income',
    kode: 'IN-11',
    deskripsi: 'Penerimaan bagi hasil / keuntungan badan usaha HKBP (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)',
    is_active: true,
    is_sentralisasi: true,
    sentralisasi_group: 'badan_usaha_lembaga',
    sentralisasi_exclusion_type: null,
  },
  {
    id: 'cat-in-yayasan',
    nama: 'Kontribusi / Sumbangan Yayasan di Bawah HKBP',
    tipe: 'income',
    kode: 'IN-12',
    deskripsi: 'Kontribusi resmi yayasan naungan HKBP (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)',
    is_active: true,
    is_sentralisasi: true,
    sentralisasi_group: 'badan_usaha_lembaga',
    sentralisasi_exclusion_type: null,
  },
  {
    id: 'cat-in-pendidikan-tinggi',
    nama: 'Keuntungan Lembaga Pendidikan Tinggi HKBP',
    tipe: 'income',
    kode: 'IN-13',
    deskripsi: 'Penerimaan resmi dari perguruan tinggi / lembaga pendidikan HKBP (Objek Sentralisasi: 55% BPSK / 45% Huria)',
    is_active: true,
    is_sentralisasi: true,
    sentralisasi_group: 'badan_usaha_lembaga',
    sentralisasi_exclusion_type: null,
  },
  {
    id: 'cat-in-hibah-eksternal',
    nama: 'Bantuan, Hibah, & Sumbangan Resmi Pihak Luar',
    tipe: 'income',
    kode: 'IN-14',
    deskripsi: 'Bantuan/dana hibah pihak luar sah seizin Pimpinan HKBP (Objek Sentralisasi: 55% BPSK HKBP / 45% Huria)',
    is_active: true,
    is_sentralisasi: true,
    sentralisasi_group: 'badan_usaha_lembaga',
    sentralisasi_exclusion_type: null,
  },

  // ❌ 4. POS PENERIMAAN YANG DIKECUALIKAN (EXCLUSIONS - 100% BEBAS SENTRALISASI)
  {
    id: 'cat-in-ex-sosial-duka',
    nama: 'Pelean Sosial / Duka (Pelean Sosial / Gariana)',
    tipe: 'income',
    kode: 'IN-EX-01',
    deskripsi: '❌ Dikecualikan dari Sentralisasi: 100% dikelola untuk jemaat yang berduka / kemalangan (Kas Diakonia Sosial)',
    is_active: true,
    is_sentralisasi: false,
    sentralisasi_group: 'dikecualikan_khusus',
    sentralisasi_exclusion_type: 'sosial_duka',
  },
  {
    id: 'cat-in-ex-beasiswa',
    nama: 'Pelean Beasiswa (Pelean Dana Belajar)',
    tipe: 'income',
    kode: 'IN-EX-02',
    deskripsi: '❌ Dikecualikan dari Sentralisasi: 100% dikelola khusus untuk bantuan pendidikan / beasiswa jemaat',
    is_active: true,
    is_sentralisasi: false,
    sentralisasi_group: 'dikecualikan_khusus',
    sentralisasi_exclusion_type: 'beasiswa',
  },
  {
    id: 'cat-in-ex-pembangunan',
    nama: 'Dana Pembangunan Fisik Lokal',
    tipe: 'income',
    kode: 'IN-EX-03',
    deskripsi: '❌ Dikecualikan dari Sentralisasi: 100% dikelola kepanitiaan pembangunan untuk renovasi / pembangunan fisik gereja lokal',
    is_active: true,
    is_sentralisasi: false,
    sentralisasi_group: 'dikecualikan_khusus',
    sentralisasi_exclusion_type: 'pembangunan_lokal',
  },

  // ==========================================
  // POS PENGELUARAN / BEBAN (EXPENSE)
  // ==========================================
  { id: 'cat-out-bpsk', nama: 'Penyetoran 55% Sentralisasi ke Kas Pusat (BPSK HKBP)', tipe: 'expense', kode: 'OUT-01', deskripsi: 'Penyetoran kewajiban sentralisasi 55% ke rekening BPSK HKBP Kantor Pusat', is_active: true },
  { id: 'cat-out-operasional-huria', nama: 'Operasional & Administrasi Pelayanan Huria (45%)', tipe: 'expense', kode: 'OUT-02', deskripsi: 'Beban operasional rutin pelayanan lokal huria dari porsi 45%', is_active: true },
  { id: 'cat-out-ibadah', nama: 'Pelayanan Ibadah & Hari Besar Gerejawi', tipe: 'expense', kode: 'OUT-03', deskripsi: 'Perlengkapan perjamuan, lilin, cetak warta, konsumsi majelis, dekorasi ibadah', is_active: true },
  { id: 'cat-out-kategorial', nama: 'Kegiatan Seksi Kategorial (Koinonia, Marturia, Diakonia)', tipe: 'expense', kode: 'OUT-04', deskripsi: 'Program kerja seksi Sekolah Minggu, Remaja, Pemuda, Ina, Ama, Lansia', is_active: true },
  { id: 'cat-out-sosial-duka', nama: 'Penyaluran Santunan Sosial / Duka (Dana Gariana)', tipe: 'expense', kode: 'OUT-05', deskripsi: 'Penyaluran dana duka/kemalangan bagi keluarga jemaat yang berduka', is_active: true },
  { id: 'cat-out-beasiswa', nama: 'Penyaluran Bantuan Beasiswa (Dana Belajar)', tipe: 'expense', kode: 'OUT-06', deskripsi: 'Bantuan biaya pendidikan siswa dan mahasiswa berprestasi / kurang mampu', is_active: true },
  { id: 'cat-out-pembangunan', nama: 'Pengeluaran Pembangunan & Renovasi Fisik Gereja', tipe: 'expense', kode: 'OUT-07', deskripsi: 'Pembelian material dan upah tukang proyek pembangunan fisik gereja lokal', is_active: true },
  { id: 'cat-out-gedung', nama: 'Pemeliharaan Gedung, Gereja & Inventaris', tipe: 'expense', kode: 'OUT-08', deskripsi: 'Perbaikan sarana ibadah, sound system, AC, pengecatan gedung gereja', is_active: true },
  { id: 'cat-out-utilitas', nama: 'Listrik, Air, Telepon & Internet Gereja', tipe: 'expense', kode: 'OUT-09', deskripsi: 'Beban langganan utilitas operasional kantor dan gedung gereja', is_active: true },
  { id: 'cat-out-lainnya', nama: 'Pengeluaran Lain-lain yang Sah', tipe: 'expense', kode: 'OUT-99', deskripsi: 'Pengeluaran sah lainnya yang disetujui pimpinan jemaat', is_active: true },
];

export const DEMO_OPENING_BALANCES: OpeningBalance[] = [
  { id: 'ob-1', tahun: 2026, kas_id: 'kas-1', storage_account_id: 'stor-1', amount: 0, notes: 'Brankas Tunai Kas Umum' },
  { id: 'ob-2', tahun: 2026, kas_id: 'kas-1', storage_account_id: 'stor-2', amount: 0, notes: 'Bank BRI Kas Umum' },
  { id: 'ob-3', tahun: 2026, kas_id: 'kas-2', storage_account_id: 'stor-1', amount: 0, notes: 'Brankas Kas Diakonia' },
  { id: 'ob-4', tahun: 2026, kas_id: 'kas-3', storage_account_id: 'stor-1', amount: 0, notes: 'Brankas Kas Sekolah Minggu' },
  { id: 'ob-5', tahun: 2026, kas_id: 'kas-4', storage_account_id: 'stor-1', amount: 0, notes: 'Brankas Kas Kaum Ibu' },
  { id: 'ob-6', tahun: 2026, kas_id: 'kas-5', storage_account_id: 'stor-1', amount: 0, notes: 'Brankas Kas Kaum Bapak' },
  { id: 'ob-7', tahun: 2026, kas_id: 'kas-6', storage_account_id: 'stor-1', amount: 0, notes: 'Brankas Kas Pemuda' },
  { id: 'ob-8', tahun: 2026, kas_id: 'kas-7', storage_account_id: 'stor-3', amount: 0, notes: 'Bank Mandiri Kas Pembangunan' },
];

export const DEMO_TRANSACTIONS: Transaction[] = [];

export const DEMO_PERIOD_CLOSINGS: PeriodClosing[] = [];

export const DEMO_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-reset',
    table_name: 'system',
    record_id: 'initial',
    action: 'SYSTEM_RESET',
    new_data: { note: 'Saldo awal diset ke nol dan seluruh transaksi dihapus untuk memulai pembukuan riil gereja.' },
    old_data: null,
    changed_by: 'user-admin',
    notes: 'Sistem bersih dan siap digunakan untuk pencatatan perdana.',
    changed_at: '2026-01-01T00:00:00Z',
  },
];

// Helper to split equally across 12 months
export function generateMonthlyDistribution(total: number): number[] {
  const base = Math.floor(total / 12);
  const remainder = total - base * 12;
  const dist = new Array(12).fill(base);
  dist[11] += remainder; // Add remainder to December
  return dist;
}

export const DEMO_BUDGETS: Budget[] = [];

export const DEMO_BUDGET_ITEMS: BudgetItem[] = [];

export const DEMO_BUDGET_REALLOCATIONS: BudgetReallocation[] = [];

export const DEMO_OPENING_SETUP: OpeningSetup = {
  id: 'main',
  first_year: 2026,
  go_live_date: '2026-01-01',
  status: 'in_progress',
  notes: 'Pembukaan Buku Keuangan HKBP Ressort Hutaraja Tahun 2026',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const DEMO_OPENING_ENTRIES: OpeningBalanceEntry[] = [
  {
    id: 'obe-1',
    tahun: 2026,
    kas_id: 'kas-1',
    storage_account_id: 'stor-1',
    amount: 0,
    book_balance: 0,
    physical_balance: 0,
    difference: 0,
    explanation: 'Saldo awal tunai brankas direset ke nol',
    status: 'drafting',
    created_by: 'user-bendum',
  },
  {
    id: 'obe-2',
    tahun: 2026,
    kas_id: 'kas-1',
    storage_account_id: 'stor-2',
    amount: 0,
    book_balance: 0,
    physical_balance: 0,
    difference: 0,
    explanation: 'Saldo awal rekening BRI direset ke nol',
    status: 'drafting',
    created_by: 'user-bendum',
  },
  {
    id: 'obe-3',
    tahun: 2026,
    kas_id: 'kas-2',
    storage_account_id: 'stor-1',
    amount: 0,
    book_balance: 0,
    physical_balance: 0,
    difference: 0,
    explanation: 'Saldo awal Kas Diakonia direset ke nol',
    status: 'drafting',
    created_by: 'user-bend-diakonia',
  },
  {
    id: 'obe-4',
    tahun: 2026,
    kas_id: 'kas-7',
    storage_account_id: 'stor-3',
    amount: 0,
    book_balance: 0,
    physical_balance: 0,
    difference: 0,
    explanation: 'Saldo awal Kas Pembangunan direset ke nol',
    status: 'drafting',
    created_by: 'user-bendum',
  },
  {
    id: 'obe-5',
    tahun: 2026,
    kas_id: 'kas-3',
    storage_account_id: 'stor-1',
    amount: 0,
    book_balance: 0,
    physical_balance: 0,
    difference: 0,
    explanation: 'Saldo awal Kas Sekolah Minggu direset ke nol',
    status: 'drafting',
    created_by: 'user-bend-sm',
  },
  {
    id: 'obe-6',
    tahun: 2026,
    kas_id: 'kas-4',
    storage_account_id: 'stor-1',
    amount: 0,
    book_balance: 0,
    physical_balance: 0,
    difference: 0,
    explanation: 'Saldo awal Kas Kaum Ibu direset ke nol',
    status: 'drafting',
    created_by: 'user-bend-ina',
  },
  {
    id: 'obe-7',
    tahun: 2026,
    kas_id: 'kas-5',
    storage_account_id: 'stor-1',
    amount: 0,
    book_balance: 0,
    physical_balance: 0,
    difference: 0,
    explanation: 'Saldo awal Kas Kaum Bapak direset ke nol',
    status: 'drafting',
    created_by: 'user-bendum',
  },
  {
    id: 'obe-8',
    tahun: 2026,
    kas_id: 'kas-6',
    storage_account_id: 'stor-1',
    amount: 0,
    book_balance: 0,
    physical_balance: 0,
    difference: 0,
    explanation: 'Saldo awal Kas Pemuda direset ke nol',
    status: 'drafting',
    created_by: 'user-bendum',
  },
];

export const DEMO_OPENING_ADJUSTMENTS: OpeningBalanceAdjustment[] = [];

export const DEMO_OPENING_OTHER_POSITIONS: OpeningOtherPosition[] = [];

export const DEMO_PRIOR_YEAR_SUMMARIES: PriorYearSummary[] = [];

export const DEMO_FIXED_ASSETS: FixedAsset[] = [];

export const DEMO_ADVANCES: Advance[] = [];

export const DEMO_ADVANCE_SETTLEMENTS: AdvanceSettlement[] = [];

export const DEMO_RECEIVABLES_PAYABLES: ReceivablePayable[] = [];

export const DEMO_LPJ_NOTES: LpjNotes = {
  id: 'lpj-note-2026',
  year: 2026,
  accounting_basis:
    'Laporan Keuangan HKBP Ressort Hutaraja Tahun 2026 disusun dengan Basis Kas yang Dimodifikasi (Modified Cash Basis) berdasarkan pedoman ISAK 35 untuk Entitas Berorientasi Nonlaba. Transaksi operasional disajikan berdasarkan arus kas riil masuk dan keluar, dilengkapi pengungkapan aset tetap historis, panjar kegiatan, serta saldo piutang dan utang.',
  accounting_policies:
    '1. Kebijakan Kas: Keuangan memakai KAS TERPISAH per seksi/sektor dan Kas Umum. 2. Klasifikasi Dana: Dana dikelompokkan menjadi Dana Tidak Terikat dan Dana Terikat. 3. Aset Tetap: Dicatat sebesar nilai perolehan historis. 4. Panjar: Diakui sebagai piutang berjalan sampai pertanggungjawaban disahkan oleh Ketua Kas.',
  significant_items_notes:
    'Penerimaan Pelean I-V Minggu dan Perjamuan Kudus disetorkan ke rekening BRI Huria. Seluruh pengeluaran di atas Rp 500.000 wajib disertai bukti kwitansi/faktur sah.',
  budget_variance_notes:
    'Varians anggaran di atas 10% dievaluasi berkala. Pos pemeliharaan sarana ibadah mengalami penyesuaian karena perbaikan mendesak kebocoran plafon pastori pada awal tahun.',
  significant_events:
    'Tahun Anggaran 2026 merupakan tonggak dimulainya sistem informasi keuangan digital SIKU HKBP Hutaraja guna meningkatkan transparansi dan akuntabilitas jemaat.',
  restricted_funds_notes:
    'Dana Terikat meliputi Kas Diakonia (khusus pelayanan kasih kedukaan dan orang sakit) serta Kas Pembangunan (khusus fisik sarana ibadah). Dana ini tidak dapat dialihkan tanpa persetujuan Rapat Huria.',
  post_reporting_events:
    'Hingga tanggal penyusunan laporan pertanggungjawaban ini, tidak terdapat kejadian penting setelah tanggal pelaporan yang berdampak material terhadap saldo keuangan.',
  updated_at: '2026-01-25T10:00:00Z',
};

export const DEMO_LPJ_SETTINGS: LpjSettings = {
  id: 'main',
  enable_depreciation: false,
  depreciation_method: 'straight_line',
  budget_variance_threshold_percent: 10.0,
  default_advance_days: 14,
  document_number_format: 'HKBP-HTR/LPJ/{TAHUN}/{NOMOR}',
  signatories: [
    { role: 'Bendahara Seksi', title: 'Bendahara Seksi Pengelola', name: 'Bendahara Seksi Terkait' },
    { role: 'Ketua Seksi', title: 'Ketua Seksi Pengelola', name: 'Ketua Seksi Terkait' },
    { role: 'Bendahara Umum', title: 'Bendahara Huria / Ressort', name: 'St. B. Hutapea' },
    { role: 'Pendeta Ressort', title: 'Pendeta HKBP Ressort Hutaraja', name: 'Pdt. R. Simanjuntak, S.Th' },
  ],
  useful_life_defaults: {
    tanah: 0,
    bangunan: 20,
    kendaraan: 5,
    alat_musik: 5,
    elektronik: 4,
    perabot: 5,
    lainnya: 4,
  },
  updated_at: '2026-01-25T10:00:00Z',
};

// =============================================================================
// DEMO DATA BADAN AUDIT HURIA
// =============================================================================

export const DEMO_AUDIT_BODY_MEMBERS: AuditBodyMember[] = [
  {
    id: 'abm-1',
    user_id: 'user-audit-ketua',
    jabatan: 'ketua',
    periode_mulai: '2025-01-01',
    periode_selesai: '2027-01-01',
    aktif: true,
  },
  {
    id: 'abm-2',
    user_id: 'user-audit-1',
    jabatan: 'anggota',
    periode_mulai: '2025-01-01',
    periode_selesai: '2027-01-01',
    aktif: true,
  },
  {
    id: 'abm-3',
    user_id: 'user-audit-2',
    jabatan: 'anggota',
    periode_mulai: '2025-01-01',
    periode_selesai: '2027-01-01',
    aktif: true,
  },
];

export const DEMO_AUDIT_ENGAGEMENTS: AuditEngagement[] = [
  {
    id: 'eng-opening',
    tahun: 2026,
    jenis: 'opening',
    judul: 'Pemeriksaan Saldo Awal & Pembukaan Buku SIKU 2026',
    deskripsi: 'Audit independen atas migrasi saldo pindahan buku manual ke sistem digital per 1 Januari 2026',
    status: 'completed',
    dibuka_pada: '2026-01-02',
    batas_waktu: '2026-01-10',
    combined_with_lpj: false,
    created_by: 'user-audit-ketua',
    created_at: '2026-01-02T08:00:00Z',
  },
  {
    id: 'eng-sem1',
    tahun: 2026,
    jenis: 'semester_1',
    judul: 'Pemeriksaan Keuangan Semester I Tahun 2026',
    deskripsi: 'Audit berkala realisasi pendapatan, belanja, kas fisik, dan panjar periode Januari - Juni 2026',
    semester_report_id: 'sem-rep-1',
    status: 'completed',
    dibuka_pada: '2026-07-01',
    batas_waktu: '2026-07-15',
    combined_with_lpj: false,
    created_by: 'user-audit-ketua',
    created_at: '2026-07-01T08:00:00Z',
  },
  {
    id: 'eng-tahunan',
    tahun: 2026,
    jenis: 'tahunan',
    judul: 'Pemeriksaan Laporan Pertanggungjawaban (LPJ) Tahunan ISAK 35 Tahun 2026',
    deskripsi: 'Audit menyeluruh laporan keuangan tahunan huria dan ressort sebelum diajukan ke Rapat Huria',
    lpj_id: 'lpj-rep-2026',
    status: 'in_progress',
    dibuka_pada: '2026-12-15',
    batas_waktu: '2027-01-15',
    combined_with_lpj: true,
    created_by: 'user-audit-ketua',
    created_at: '2026-12-15T09:00:00Z',
  },
];

export const DEMO_AUDIT_REVIEWS: AuditReview[] = [];

export const DEMO_AUDIT_FINDINGS: AuditFinding[] = [];

export const DEMO_AUDIT_FINAL_OPINIONS: AuditFinalOpinion[] = [];

export const DEMO_CASH_COUNTS: CashCount[] = [];

// =============================================================================
// DEMO DATA LAPORAN SEMESTER & LPJ TAHUNAN
// =============================================================================

export const DEMO_SEMESTER_REPORTS: SemesterReport[] = [
  {
    id: 'sem-rep-1',
    tahun: 2026,
    semester: 1,
    status: 'preparation',
    version: 1,
    checklist_result: {
      months_closed: false,
      no_draft_transactions: true,
      storages_reconciled: false,
      advances_reviewed: true,
      budget_variance_explained: false,
      prior_findings_resolved: true,
      details: {},
    },
    created_by: 'user-bendum',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'sem-rep-2',
    tahun: 2026,
    semester: 2,
    status: 'preparation',
    version: 1,
    checklist_result: {
      months_closed: false,
      no_draft_transactions: true,
      storages_reconciled: false,
      advances_reviewed: true,
      budget_variance_explained: false,
      prior_findings_resolved: true,
      details: {},
    },
    created_by: 'user-bendum',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

export const DEMO_LPJ_REPORTS: LpjReport[] = [
  {
    id: 'lpj-rep-2026',
    tahun: 2026,
    nomor_dokumen: 'HKBP-HTR/LPJ/2026/001',
    status: 'preparation',
    version: 1,
    checklist_result: {
      all_months_closed: false,
      no_pending_transactions: true,
      all_reconciliations_completed: false,
      overdue_advances_cleared_or_reserved: true,
      budget_deviations_clarified: false,
      audit_findings_settled: true,
      inventory_physical_checked: false,
      details: {},
    },
    created_by: 'user-bendum',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

export const DEMO_LPJ_EXCEPTIONS: LpjException[] = [
  {
    id: 'exc-1',
    target_type: 'semester',
    target_id: 'sem-rep-1',
    rule_code: 'advances_reviewed',
    reason: 'Panjar PJR-2026-001 diberikan dispensasi keterlambatan 3 hari karena menunggu nota fisik dari percetakan spanduk luar kota, dan bukti sah telah disusulkan.',
    granted_by: 'user-bendum',
    granted_at: '2026-07-05T09:00:00Z',
  },
];

export const DEMO_AUDIT_PERIOD_VERIFICATIONS: AuditPeriodVerification[] = [];

export const DEMO_FISCAL_YEARS: FiscalYear[] = [
  {
    id: 'fy-2024',
    year: 2024,
    theme: 'Tahun Oikumene Inklusif HKBP',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    status: 'closed',
    is_budget_locked: true,
    notes: 'Buku kas tahun 2024 telah ditutup dan disahkan dalam Rapat Huria 2024.',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'fy-2025',
    year: 2025,
    theme: 'Tahun Pemberdayaan Kemitraan HKBP',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    status: 'closed',
    is_budget_locked: true,
    notes: 'Laporan Pertanggungjawaban (LPJ) Keuangan 2025 telah diaudit dan disahkan.',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'fy-2026',
    year: 2026,
    theme: 'Tahun Transformasi & Oikoumene Inklusif HKBP',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    status: 'active',
    is_budget_locked: true,
    notes: 'Tahun anggaran operasional berjalan resmi Huria.',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'fy-2027',
    year: 2027,
    theme: 'Tahun Kesehatian Pelayanan & Misi HKBP',
    start_date: '2027-01-01',
    end_date: '2027-12-31',
    status: 'planning',
    is_budget_locked: false,
    notes: 'Periode penyusunan RAPB Parartaon tahun anggaran mendatang.',
    created_at: '2026-01-01T00:00:00Z',
  },
];


