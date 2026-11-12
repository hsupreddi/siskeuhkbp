/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole =
  | 'admin'
  | 'bendahara_umum'
  | 'pengurus_kas'
  | 'pendeta_ressort'
  | 'sekretaris'
  | 'majelis'
  | 'auditor';

export type HuriaLevel = 'huria' | 'ressort';

export type TohonanType =
  | 'pendeta'
  | 'guru_huria'
  | 'bibelvrouw'
  | 'diakones'
  | 'evangelis'
  | 'sintua'
  | 'non_tahbisan';

/**
 * Peran Struktural dan Pelayanan Tingkat Huria & Ressort
 * Berdasarkan Aturan dan Peraturan HKBP 2002 Setelah Amandemen Keempat
 * (Pasal 1, 4, 5, 6, 7, 42, 43, 44 - Mengabaikan Distrik & Hatopan/Pusat)
 */
export type EcclesiasticalRole =
  // Pelayan Tahbisan (Tohonan Habalelaon)
  | 'pendeta_ressort'
  | 'pendeta_fungsional'
  | 'guru_huria'
  | 'bibelvrouw'
  | 'diakones'
  | 'evangelis'
  | 'sintua'
  // Pimpinan Administrasi & Perbendaharaan Huria/Ressort
  | 'sekretaris_huria'
  | 'bendahara_huria'
  | 'sekretaris_bendahara_resort'
  | 'majelis_perbendaharaan' // Parartaon Huria
  // Pimpinan Dewan-Dewan Huria (Pasal 5)
  | 'ketua_dewan_koinonia'
  | 'ketua_dewan_marturia'
  | 'ketua_dewan_diakonia'
  // Pengurus Seksi Kategorial Huria (Pasal 5)
  | 'pengurus_seksi_sekolah_minggu'
  | 'pengurus_seksi_remaja'
  | 'pengurus_seksi_naposobulung'
  | 'pengurus_seksi_parompuan'
  | 'pengurus_seksi_ama'
  | 'pengurus_seksi_lansia'
  | 'pengurus_seksi_zending'
  | 'pengurus_seksi_musik'
  | 'pengurus_seksi_diakoni_sosial'
  | 'pengurus_seksi_pendidikan'
  | 'pengurus_seksi_kesehatan'
  | 'pengurus_seksi_kemasyarakatan'
  | 'panitia_pembangunan'
  | 'anggota_majelis_resort'
  // Badan Pengawas & Pemeriksa Keuangan Huria (Pasal 7 & 44)
  | 'ketua_badan_audit'
  | 'anggota_badan_audit'
  // Administrator Sistem SIKU
  | 'admin_sistem';

export type KasAccessLevel = 'bendahara' | 'ketua';

export type StorageType = 'cash' | 'bank';

export type CategoryType = 'income' | 'expense';

export type TransactionType = 'income' | 'expense' | 'transfer_out' | 'transfer_in';

export type TransactionStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export type TransactionAuditStatus = 'unverified' | 'verified' | 'flagged';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  ecclesiastical_role?: EcclesiasticalRole;
  tohonan?: TohonanType;
  tingkat?: HuriaLevel;
  seksi_name?: string | null;
  wijk?: string | null; // Nomor Wijk / Lingkungan Sintua
  phone?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type FundType = 'unrestricted' | 'restricted';

export interface Kas {
  id: string;
  kode: string;
  nama: string;
  deskripsi?: string | null;
  warna: string; // Pastel hex
  fund_type?: FundType;
  restricted_purpose?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserKasAccess {
  id: string;
  user_id: string;
  kas_id: string;
  access_level: KasAccessLevel;
  created_at?: string;
  // Joined fields
  user?: Profile;
  kas?: Kas;
}

export interface StorageAccount {
  id: string;
  nama: string;
  tipe: StorageType;
  nomor_rekening?: string | null;
  atas_nama?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OpeningBalance {
  id: string;
  tahun: number;
  kas_id: string;
  storage_account_id: string;
  amount: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined fields
  kas?: Kas;
  storage_account?: StorageAccount;
}

export type OpeningBookKasStatus = 'not_started' | 'drafting' | 'submitted' | 'approved' | 'locked';
export type OpeningAdjustmentStatus = 'submitted' | 'approved_ketua' | 'approved_bendum' | 'rejected';

export interface OpeningSetup {
  id: string;
  first_year: number;
  go_live_date: string;
  status: 'setup' | 'in_progress' | 'completed';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OpeningBalanceEntry {
  id: string;
  tahun: number;
  kas_id: string;
  storage_account_id: string;
  amount: number;
  book_balance: number;
  physical_balance: number;
  difference: number;
  explanation?: string | null;
  document_url?: string | null;
  status: OpeningBookKasStatus;
  created_by?: string | null;
  submitted_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  locked_by?: string | null;
  locked_at?: string | null;
  return_note?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined
  kas?: Kas;
  storage_account?: StorageAccount;
  creator?: Profile;
  approver?: Profile;
  locker?: Profile;
}

export interface OpeningBalanceAdjustment {
  id: string;
  tahun: number;
  kas_id: string;
  storage_account_id: string;
  amount: number;
  reason: string;
  document_url?: string | null;
  status: OpeningAdjustmentStatus;
  proposed_by?: string | null;
  approved_ketua_by?: string | null;
  approved_ketua_at?: string | null;
  approved_bendum_by?: string | null;
  approved_bendum_at?: string | null;
  reject_note?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined
  kas?: Kas;
  storage_account?: StorageAccount;
  proposer?: Profile;
}

export interface OpeningOtherPosition {
  id: string;
  tahun: number;
  kas_id: string;
  type: 'asset' | 'advance' | 'receivable' | 'payable' | 'restricted_fund';
  name: string;
  category?: string | null;
  acquisition_year?: number | null;
  amount: number;
  condition?: 'baik' | 'rusak_ringan' | 'rusak_berat' | null;
  location?: string | null;
  section_manager?: string | null;
  notes?: string | null;
  created_at?: string;
  kas?: Kas;
}

export interface PriorYearSummary {
  id: string;
  tahun: number;
  kas_id: string;
  category_id: string;
  jumlah: number;
  sumber: 'manual';
  created_by?: string | null;
  approved_by?: string | null;
  locked: boolean;
  created_at?: string;
  kas?: Kas;
  category?: Category;
}

export type SentralisasiGroup =
  | 'pelean_mingguan'
  | 'pelean_syukur'
  | 'badan_usaha_lembaga'
  | 'dikecualikan_khusus';

export type SentralisasiExclusionType =
  | 'sosial_duka'
  | 'beasiswa'
  | 'pembangunan_lokal';

export interface Category {
  id: string;
  nama: string;
  tipe: CategoryType;
  kode?: string | null;
  deskripsi?: string | null;
  is_active: boolean;
  // PPKU Sentralisasi Keuangan HKBP
  is_sentralisasi?: boolean; // true: Objek Sentralisasi (55% BPSK / 45% Huria), false: Dikecualikan (100% Huria)
  sentralisasi_group?: SentralisasiGroup | null;
  sentralisasi_exclusion_type?: SentralisasiExclusionType | null;
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  tanggal: string; // YYYY-MM-DD
  kas_id: string;
  storage_account_id: string;
  category_id?: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  receipt_no?: string | null;
  attachment_url?: string | null;
  status: TransactionStatus;
  
  // PPKU Sentralisasi Keuangan HKBP (55% Kas Pusat BPSK / 45% Huria Lokal)
  is_sentralisasi?: boolean;
  bpsk_rate?: number; // 0.55 if sentralisasi else 0
  huria_rate?: number; // 0.45 if sentralisasi else 1.00
  bpsk_amount?: number; // Bagian 55% untuk Kas Pusat (BPSK HKBP)
  huria_amount?: number; // Bagian 45% (atau 100% jika dikecualikan) untuk Kas Huria
  sentralisasi_remitted?: boolean; // Status penyetoran ke BPSK HKBP
  sentralisasi_remitted_at?: string | null;
  sentralisasi_remitted_ref?: string | null;
  sentralisasi_exclusion_type?: SentralisasiExclusionType | null;

  transfer_id?: string | null;
  transfer_target_kas_id?: string | null;
  transfer_target_storage_id?: string | null;
  transfer_confirmed_by?: string | null;
  transfer_confirmed_at?: string | null;

  reverses_id?: string | null;
  is_reversal: boolean;

  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  reject_note?: string | null;
  created_at?: string;
  updated_at?: string;

  // Verifikasi Audit Transaksi oleh Badan Audit Huria
  audit_status?: TransactionAuditStatus;
  audited_by?: string | null;
  audited_at?: string | null;
  audit_note?: string | null;

  // Joined fields for display
  kas?: Kas;
  storage_account?: StorageAccount;
  category?: Category;
  creator?: Profile;
  approver?: Profile;
  auditor?: Profile;
  transfer_target_kas?: Kas;
  transfer_target_storage?: StorageAccount;
}

export interface PeriodClosing {
  id: string;
  tahun: number;
  bulan: number;
  kas_id?: string | null; // null for all kas
  is_closed: boolean;
  closed_by?: string | null;
  closed_at?: string;
  reopened_by?: string | null;
  reopened_at?: string | null;
  reopen_reason?: string | null;
  created_at?: string;
  // Joined
  kas?: Kas;
  closed_user?: Profile;
}

export interface Reconciliation {
  id: string;
  tanggal: string;
  storage_account_id: string;
  system_balance: number;
  physical_balance: number;
  discrepancy: number;
  notes?: string | null;
  checked_by?: string | null;
  created_at?: string;
  storage_account?: StorageAccount;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  changed_by?: string | null;
  notes?: string | null;
  changed_at: string;
  user?: Profile;
}

export interface AppSettings {
  id: string;
  church_name: string;
  church_subtext: string;
  church_address: string;
  church_phone: string;
  church_email: string;
  pendeta_name: string;
  sekretaris_name: string;
  bendahara_umum_name: string;
  receipt_required_threshold: number;
  block_negative_balance: boolean;
  active_year: number;
  budget_reallocation_max_pct: number; // e.g. 15% (0 means unlimited)
  updated_at?: string;
}

export type FiscalYearStatus = 'active' | 'closed' | 'planning';

export interface FiscalYear {
  id: string;
  year: number;
  theme: string; // Orientasi / Tema Pelayanan HKBP
  start_date: string;
  end_date: string;
  status: FiscalYearStatus;
  is_budget_locked: boolean; // RAPB disahkan Rapat Huria & terkunci
  notes?: string | null;
  created_at?: string;
}

export type BudgetStatus =
  | 'draft'
  | 'reviewed'
  | 'submitted_rapat'
  | 'approved'
  | 'returned';

export interface Budget {
  id: string;
  kas_id: string;
  tahun: number;
  version: number;
  title: string;
  status: BudgetStatus;
  estimated_opening_balance: number;
  is_opening_balance_locked: boolean;
  is_current_active: boolean;
  notes?: string | null;
  created_by?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  submitted_rapat_by?: string | null;
  submitted_rapat_at?: string | null;
  ratified_by?: string | null;
  ratified_at?: string | null;
  rapat_date?: string | null;
  rapat_berita_acara_no?: string | null;
  rapat_document_url?: string | null;
  return_note?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined
  kas?: Kas;
  creator?: Profile;
  reviewer?: Profile;
  ratifier?: Profile;
}

export interface BudgetItem {
  id: string;
  budget_id: string;
  category_id: string;
  type: CategoryType;
  description?: string | null;
  annual_amount: number;
  monthly_distribution: number[]; // 12 elements (index 0 to 11 = Jan to Dec)
  created_at?: string;
  updated_at?: string;
  category?: Category;
}

export interface BudgetReallocation {
  id: string;
  budget_id: string;
  kas_id: string;
  tahun: number;
  from_item_id: string;
  to_item_id: string;
  amount: number;
  reason: string;
  status: 'approved' | 'rejected';
  proposed_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  reject_note?: string | null;
  created_at?: string;
  from_item?: BudgetItem;
  to_item?: BudgetItem;
  proposer?: Profile;
  approver?: Profile;
}

export interface BudgetRealizationRow {
  category_id: string;
  category_name: string;
  category_code?: string | null;
  type: CategoryType;
  budget_annual: number;
  budget_ytd: number;
  actual_ytd: number;
  variance: number;
  percentage: number;
}

export interface KasBalanceSummary {
  kas_id: string;
  kode: string;
  nama: string;
  warna: string;
  saldo_awal: number;
  total_pemasukan: number;
  total_pengeluaran: number;
  total_transfer_masuk: number;
  total_transfer_keluar: number;
  saldo_resmi: number;
  saldo_proyeksi: number;
}

export interface StorageBalanceSummary {
  storage_account_id: string;
  nama: string;
  tipe: StorageType;
  nomor_rekening?: string | null;
  atas_nama?: string | null;
  saldo_awal: number;
  saldo_saat_ini: number;
}

// -----------------------------------------------------------------------------
// MODUL DATA PENDUKUNG LPJ (ISAK 35 - MODIFIED CASH BASIS)
// -----------------------------------------------------------------------------

export type FixedAssetCategory =
  | 'tanah'
  | 'bangunan'
  | 'kendaraan'
  | 'alat_musik'
  | 'elektronik'
  | 'perabot'
  | 'lainnya';

export type FixedAssetStatus =
  | 'aktif'
  | 'diajukan_penghapusan'
  | 'diajukan_hibah'
  | 'dihapus'
  | 'dihibahkan';

export type FixedAssetCondition = 'baik' | 'rusak_ringan' | 'rusak_berat';

export interface FixedAsset {
  id: string;
  kode: string;
  nama: string;
  kategori: FixedAssetCategory;
  tanggal_perolehan: string;
  nilai_perolehan: number;
  kondisi: FixedAssetCondition;
  lokasi: string;
  kas_id: string;
  status: FixedAssetStatus;
  foto_url?: string | null;
  dokumen_url?: string | null;
  notes?: string | null;
  transaction_id?: string | null;
  useful_life_years: number;
  salvage_value: number;
  disposal_reason?: string | null;
  disposal_date?: string | null;
  disposal_proposed_by?: string | null;
  disposal_approved_by?: string | null;
  disposal_approved_at?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined
  kas?: Kas;
  transaction?: Transaction;
  proposer?: Profile;
  approver?: Profile;
}

export interface AssetDepreciation {
  id: string;
  asset_id: string;
  tahun: number;
  depreciation_amount: number;
  accumulated_depreciation: number;
  book_value: number;
  method: string;
  calculated_at?: string;
}

export type AdvanceStatus = 'active' | 'settled' | 'overdue';

export type AdvanceSettlementStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface Advance {
  id: string;
  kode: string;
  kas_id: string;
  storage_account_id?: string | null;
  recipient_name: string;
  recipient_phone?: string | null;
  amount: number;
  advance_date: string;
  due_date: string;
  purpose: string;
  status: AdvanceStatus;
  transaction_id?: string | null;
  settled_at?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined
  kas?: Kas;
  storage_account?: StorageAccount;
  settlements?: AdvanceSettlement[];
}

export interface AdvanceSettlement {
  id: string;
  advance_id: string;
  settlement_date: string;
  spent_amount: number;
  remaining_returned: number;
  deficit_reimbursed: number;
  notes: string;
  receipt_url?: string | null;
  status: AdvanceSettlementStatus;
  submitted_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  reject_note?: string | null;
  return_transaction_id?: string | null;
  reimburse_transaction_id?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined
  advance?: Advance;
  submitter?: Profile;
  approver?: Profile;
}

export type ReceivablePayableType = 'receivable' | 'payable';

export type ReceivablePayableStatus = 'active' | 'partially_paid' | 'paid' | 'written_off';

export interface ReceivablePayable {
  id: string;
  type: ReceivablePayableType;
  kode: string;
  kas_id: string;
  counterparty_name: string;
  counterparty_contact?: string | null;
  amount: number;
  remaining_amount: number;
  issue_date: string;
  due_date?: string | null;
  status: ReceivablePayableStatus;
  description: string;
  document_url?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined
  kas?: Kas;
  payments?: ReceivablePayablePayment[];
}

export interface ReceivablePayablePayment {
  id: string;
  parent_id: string;
  payment_date: string;
  payment_amount: number;
  storage_account_id?: string | null;
  transaction_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  // Joined
  storage_account?: StorageAccount;
}

export interface LpjNotes {
  id: string;
  year: number;
  accounting_basis: string;
  accounting_policies: string;
  significant_items_notes?: string | null;
  budget_variance_notes?: string | null;
  significant_events?: string | null;
  restricted_funds_notes?: string | null;
  post_reporting_events?: string | null;
  updated_by?: string | null;
  updated_at?: string;
}

export interface LpjSignatory {
  role: string;
  title: string;
  name: string;
}

export interface LpjSettings {
  id: string;
  enable_depreciation: boolean;
  depreciation_method: 'straight_line' | 'none';
  budget_variance_threshold_percent: number;
  default_advance_days: number;
  document_number_format: string;
  signatories: LpjSignatory[];
  useful_life_defaults: Record<FixedAssetCategory, number>;
  updated_by?: string | null;
  updated_at?: string;
}

// =============================================================================
// MODUL BADAN AUDIT HURIA (INTERNAL AUDIT)
// =============================================================================

export type AuditJabatan = 'ketua' | 'anggota';

export interface AuditBodyMember {
  id: string;
  user_id: string;
  jabatan: AuditJabatan;
  periode_mulai: string;
  periode_selesai: string;
  aktif: boolean;
  created_at?: string;
  updated_at?: string;
  // Joined
  user?: Profile;
}

export type AuditEngagementType = 'opening' | 'semester_1' | 'semester_2' | 'tahunan';

export type AuditEngagementStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';

export type AuditPersonalOpinion = 'sesuai' | 'sesuai_dengan_catatan' | 'perlu_perbaikan';

export interface AuditReview {
  id: string;
  engagement_id: string;
  member_id: string;
  notes_per_section: Record<string, string>;
  general_notes?: string | null;
  personal_opinion: AuditPersonalOpinion;
  submitted_at: string;
  created_at?: string;
  updated_at?: string;
  // Joined
  member?: Profile;
}

export type AuditFindingSeverity = 'informasi' | 'wajib_diperbaiki';

export type AuditFindingStatus = 'terbuka' | 'ditanggapi' | 'selesai' | 'diterima';

export interface AuditFinding {
  id: string;
  engagement_id: string;
  kas_id?: string | null;
  kode: string;
  title: string;
  description: string;
  severity: AuditFindingSeverity;
  status: AuditFindingStatus;
  carried_from_finding_id?: string | null;
  due_date?: string | null;
  response_notes?: string | null;
  response_by?: string | null;
  responded_at?: string | null;
  closed_by?: string | null;
  closed_at?: string | null;
  closing_notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined
  kas?: Kas;
  creator?: Profile;
  responder?: Profile;
  closer?: Profile;
}

export interface AuditFinalOpinion {
  id: string;
  engagement_id: string;
  final_opinion: AuditPersonalOpinion;
  vote_breakdown: {
    sesuai: number;
    sesuai_dengan_catatan: number;
    perlu_perbaikan: number;
    votes: { member_id: string; member_name: string; opinion: AuditPersonalOpinion }[];
  };
  has_dissenting_opinion: boolean;
  dissenting_opinion_notes?: string | null;
  berita_acara_no: string;
  berita_acara_date: string;
  berita_acara_url?: string | null;
  signatories: { role: string; name: string; signed_at?: string }[];
  finalized_by?: string | null;
  finalized_at: string;
}

export interface AuditEngagement {
  id: string;
  tahun: number;
  jenis: AuditEngagementType;
  judul: string;
  deskripsi?: string | null;
  semester_report_id?: string | null;
  lpj_id?: string | null;
  status: AuditEngagementStatus;
  dibuka_pada: string;
  batas_waktu: string;
  berita_acara_url?: string | null;
  combined_with_lpj: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined
  creator?: Profile;
  reviews?: AuditReview[];
  findings?: AuditFinding[];
  final_opinion?: AuditFinalOpinion | null;
}

export interface CashCount {
  id: string;
  tanggal: string;
  kas_id: string;
  storage_account_id: string;
  book_balance: number;
  physical_balance: number;
  difference: number;
  cash_breakdown: Record<string, number>;
  explanation?: string | null;
  photo_url?: string | null;
  auditor_id: string;
  witness_name?: string | null;
  created_at?: string;
  // Joined
  kas?: Kas;
  storage_account?: StorageAccount;
  auditor?: Profile;
}

// -----------------------------------------------------------------------------
// VERIFIKASI BERKALA BADAN AUDIT (TRIWULAN, SEMESTER, TAHUNAN)
// Sesuai Pasal 7 & 44 AP HKBP 2002 Amandemen Keempat
// -----------------------------------------------------------------------------

export type AuditPeriodType = 'triwulan' | 'semester' | 'tahunan';

export type AuditPeriodCode = 'tw_1' | 'tw_2' | 'tw_3' | 'tw_4' | 'sem_1' | 'sem_2' | 'tahunan';

export type AuditPeriodVerificationStatus =
  | 'belum_diperiksa'
  | 'sedang_diverifikasi'
  | 'diverifikasi'
  | 'catatan_perbaikan';

export interface AuditChecklistItems {
  cash_physical_match: boolean;      // 1. Kesesuaian fisik kas/bank dengan catatan buku
  evidence_valid: boolean;           // 2. Keabsahan & kelengkapan kuitansi/nota transaksi
  budget_adherence: boolean;         // 3. Kepatuhan realisasi terhadap pagu anggaran APBG
  advance_settled: boolean;          // 4. Pertanggungjawaban panjar tepat waktu & tidak menggantung
  remittance_compliant: boolean;     // 5. Kepatuhan penyetoran dana titipan/amanah huria
  prior_findings_cleared: boolean;   // 6. Tindak lanjut temuan audit periode sebelumnya tuntas
}

export interface AuditPeriodVerification {
  id: string;
  tahun: number;
  period_type: AuditPeriodType;
  period_code: AuditPeriodCode;
  period_title: string;
  date_range: string;
  status: AuditPeriodVerificationStatus;
  verified_by: string[]; // User IDs of auditors who verified
  verified_signatures?: { member_id: string; member_name: string; jabatan: string; signed_at: string }[];
  verified_at?: string | null;
  general_notes?: string | null;
  checklist: AuditChecklistItems;
  berita_acara_no?: string | null;
  total_transactions_count?: number;
  verified_transactions_count?: number;
  flagged_transactions_count?: number;
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// MODUL LAPORAN SEMESTER & LPJ TAHUNAN (ISAK 35)
// =============================================================================

export type SemesterReportStatus = 
  | 'preparation' 
  | 'drafted' 
  | 'audit_in_progress' 
  | 'sent_to_pastor' 
  | 'announced' 
  | 'returned';

export interface SemesterReport {
  id: string;
  tahun: number;
  semester: 1 | 2;
  status: SemesterReportStatus;
  version: number;
  snapshot_data?: any;
  checklist_result: {
    months_closed: boolean;
    no_draft_transactions: boolean;
    storages_reconciled: boolean;
    advances_reviewed: boolean;
    budget_variance_explained: boolean;
    prior_findings_resolved: boolean;
    details?: Record<string, any>;
  };
  sent_to_pastor_date?: string | null;
  sent_ref?: string | null;
  pastor_ack_by?: string | null;
  pastor_ack_at?: string | null;
  pastor_note?: string | null;
  announced_date?: string | null;
  announcement_medium?: 'warta_jemaat' | 'mimbar' | 'papan_pengumuman' | 'lainnya' | null;
  announcement_text?: string | null;
  announcement_document_url?: string | null;
  return_notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined
  creator?: Profile;
  pastor?: Profile;
}

export type LpjReportStatus = 
  | 'preparation' 
  | 'drafted' 
  | 'audit_in_progress' 
  | 'submitted_to_meeting' 
  | 'approved' 
  | 'returned';

export interface LpjReport {
  id: string;
  tahun: number;
  nomor_dokumen: string;
  status: LpjReportStatus;
  version: number;
  snapshot_data?: any;
  checklist_result: {
    all_months_closed: boolean;
    no_pending_transactions: boolean;
    all_reconciliations_completed: boolean;
    overdue_advances_cleared_or_reserved: boolean;
    budget_deviations_clarified: boolean;
    audit_findings_settled: boolean;
    inventory_physical_checked: boolean;
    details?: Record<string, any>;
  };
  meeting_date?: string | null;
  meeting_ref?: string | null;
  meeting_document_url?: string | null;
  meeting_notes?: string | null;
  meeting_attendees_count?: number;
  approved_by?: string | null;
  approved_at?: string | null;
  return_notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined
  creator?: Profile;
  approver?: Profile;
}

export interface LpjException {
  id: string;
  target_type: 'semester' | 'lpj';
  target_id: string;
  rule_code: string;
  reason: string;
  granted_by: string;
  granted_at: string;
  granter?: Profile;
}

export interface LaporanPosisiKeuanganData {
  total_kas_dan_bank: number;
  total_piutang: number;
  total_piutang_pihak_ketiga: number;
  total_panjar_berjalan: number;
  total_aset_tetap_bruto: number;
  total_akumulasi_penyusutan?: number;
  total_aset: number;
  total_kewajiban: number;
  saldo_dana_tidak_terikat: number;
  saldo_dana_terikat: number;
  total_saldo_dana_bersih: number;
  total_kewajiban_dan_saldo_dana: number;
  selisih_neraca: number;
}

export interface LaporanPerubahanSaldoDanaItem {
  kas_id: string;
  nama_kas: string;
  kode_kas: string;
  fund_type: FundType;
  saldo_awal: number;
  penerimaan_murni: number;
  pengeluaran_murni: number;
  surplus_defisit: number;
  transfer_antar_dana_masuk: number;
  transfer_antar_dana_keluar: number;
  saldo_akhir: number;
}

export interface LaporanArusKasData {
  tahun: number;
  kas_masuk_operasi: number;
  kas_keluar_operasi: number;
  arus_kas_bersih_operasi: number;
  kas_keluar_investasi: number;
  arus_kas_bersih_investasi: number;
  kas_masuk_pendanaan: number;
  kas_keluar_pendanaan: number;
  arus_kas_bersih_pendanaan: number;
  kenaikan_penurunan_kas_bersih: number;
  saldo_kas_awal: number;
  saldo_kas_akhir: number;
}


