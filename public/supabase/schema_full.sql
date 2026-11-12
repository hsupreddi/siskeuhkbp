-- =============================================================================
-- SIKU HKBP HUTARAJA - COMPLETE FULL DATABASE SCHEMA FOR SUPABASE
-- =============================================================================
-- Skrip SQL ini mencakup seluruh tabel, tipe data, enum HKBP, relasi foreign key,
-- RLS (Row Level Security), storage bucket bukti nota, dan data awal master.
-- Jalankan skrip ini sekali di Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run).
-- =============================================================================

-- 0. BERSIHKAN TABEL LAMA JIKA ADA KONFLIK TIPE DATA (CASCADE)
drop table if exists public.opening_balance_entries cascade;
drop table if exists public.opening_balance_adjustments cascade;
drop table if exists public.opening_balances cascade;
drop table if exists public.opening_setup cascade;
drop table if exists public.opening_other_positions cascade;
drop table if exists public.prior_year_summaries cascade;
drop table if exists public.budget_reallocations cascade;
drop table if exists public.budget_items cascade;
drop table if exists public.budgets cascade;
drop table if exists public.audit_reviews cascade;
drop table if exists public.audit_findings cascade;
drop table if exists public.audit_final_opinions cascade;
drop table if exists public.cash_counts cascade;
drop table if exists public.audit_period_verifications cascade;
drop table if exists public.audit_engagements cascade;
drop table if exists public.audit_body_members cascade;
drop table if exists public.semester_reports cascade;
drop table if exists public.lpj_reports cascade;
drop table if exists public.lpj_exceptions cascade;
drop table if exists public.fixed_assets cascade;
drop table if exists public.asset_depreciations cascade;
drop table if exists public.advances cascade;
drop table if exists public.advance_settlements cascade;
drop table if exists public.receivables_payables cascade;
drop table if exists public.receivable_payable_payments cascade;
drop table if exists public.lpj_notes cascade;
drop table if exists public.lpj_settings cascade;
drop table if exists public.transactions cascade;
drop table if exists public.period_closings cascade;
drop table if exists public.reconciliations cascade;
drop table if exists public.audit_logs cascade;
drop table if exists public.user_kas_access cascade;
drop table if exists public.categories cascade;
drop table if exists public.storage_accounts cascade;
drop table if exists public.kas cascade;
drop table if exists public.app_settings cascade;
drop table if exists public.profiles cascade;

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. ENUMS & CUSTOM TYPES
do 313 begin
  create type public.user_role as enum (
    'admin', 'bendahara_umum', 'pengurus_kas', 'pendeta_ressort', 'sekretaris', 'majelis', 'auditor'
  );
exception when duplicate_object then null; end 313;

do 313 begin
  create type public.kas_access_level as enum ('bendahara', 'ketua');
exception when duplicate_object then null; end 313;

do 313 begin
  create type public.storage_type as enum ('cash', 'bank');
exception when duplicate_object then null; end 313;

do 313 begin
  create type public.category_type as enum ('income', 'expense');
exception when duplicate_object then null; end 313;

do 313 begin
  create type public.transaction_type as enum ('income', 'expense', 'transfer_out', 'transfer_in');
exception when duplicate_object then null; end 313;

do 313 begin
  create type public.transaction_status as enum ('draft', 'submitted', 'approved', 'rejected');
exception when duplicate_object then null; end 313;

do 313 begin
  create type public.fund_type as enum ('unrestricted', 'restricted');
exception when duplicate_object then null; end 313;

do 313 begin
  create type public.opening_book_status as enum ('not_started', 'drafting', 'submitted', 'approved', 'locked');
exception when duplicate_object then null; end 313;

do 313 begin
  create type public.opening_adjustment_status as enum ('submitted', 'approved_ketua', 'approved_bendum', 'rejected');
exception when duplicate_object then null; end 313;

do 313 begin
  create type public.budget_status as enum ('draft', 'submitted', 'returned', 'approved');
exception when duplicate_object then null; end 313;

-- 3. CORE TABLES

-- User Profiles
create table if not exists public.profiles (
  id text primary key default gen_random_uuid()::text,
  email text not null,
  full_name text not null,
  role text not null default 'pengurus_kas',
  ecclesiastical_role text,
  tohonan text,
  tingkat text default 'huria',
  seksi_name text,
  wijk text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Master Kas
create table if not exists public.kas (
  id text primary key default gen_random_uuid()::text,
  kode text unique not null,
  nama text not null,
  deskripsi text,
  warna text not null default '#7C9CF5',
  is_active boolean not null default true,
  fund_type text not null default 'unrestricted',
  restricted_purpose text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tempat Penyimpanan (Brankas Tunai / Rekening Bank)
create table if not exists public.storage_accounts (
  id text primary key default gen_random_uuid()::text,
  nama text not null,
  tipe text not null default 'cash',
  nomor_rekening text,
  atas_nama text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Penugasan Pengguna ke Kas
create table if not exists public.user_kas_access (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.profiles(id) on delete cascade,
  kas_id text not null references public.kas(id) on delete cascade,
  access_level text not null default 'bendahara',
  created_at timestamptz not null default now(),
  unique(user_id, kas_id, access_level)
);

-- Kategori Transaksi
create table if not exists public.categories (
  id text primary key default gen_random_uuid()::text,
  nama text not null,
  tipe text not null,
  kode text,
  deskripsi text,
  is_active boolean not null default true,
  is_sentralisasi boolean not null default true,
  sentralisasi_group text,
  sentralisasi_exclusion_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pengaturan Organisasi
create table if not exists public.app_settings (
  id text primary key default 'main',
  church_name text not null default 'HKBP Ressort Hutaraja',
  church_subtext text not null default 'Ressort Khusus - Distrik V Sumatera Timur',
  church_address text not null default 'Jl. Gereja No. 1, Hutaraja, Sumatera Utara',
  church_phone text not null default '0812-3456-7890',
  church_email text not null default 'ressort.hutaraja@hkbp.or.id',
  pendeta_name text not null default 'Pdt. R. Simanjuntak, S.Th',
  sekretaris_name text not null default 'St. M. Siregar',
  bendahara_umum_name text not null default 'St. B. Hutapea',
  receipt_required_threshold numeric(15,2) not null default 500000,
  block_negative_balance boolean not null default true,
  active_year integer not null default 2026,
  budget_reallocation_max_pct numeric(5,2) not null default 15.00,
  updated_at timestamptz not null default now()
);

-- Transaksi Keuangan
create table if not exists public.transactions (
  id text primary key default gen_random_uuid()::text,
  tanggal date not null default current_date,
  kas_id text not null references public.kas(id) on delete restrict,
  storage_account_id text not null references public.storage_accounts(id) on delete restrict,
  category_id text references public.categories(id) on delete restrict,
  type text not null,
  amount numeric(15,2) not null check (amount > 0),
  description text not null,
  receipt_no text,
  attachment_url text,
  status text not null default 'draft',
  transfer_id text,
  transfer_target_kas_id text references public.kas(id),
  transfer_target_storage_id text references public.storage_accounts(id),
  transfer_confirmed_by text references public.profiles(id),
  transfer_confirmed_at timestamptz,
  reverses_id text references public.transactions(id),
  is_reversal boolean not null default false,
  created_by text references public.profiles(id),
  approved_by text references public.profiles(id),
  approved_at timestamptz,
  reject_note text,
  audit_status text default 'unverified',
  audited_by text references public.profiles(id),
  audited_at timestamptz,
  audit_note text,
  is_sentralisasi boolean default true,
  bpsk_rate numeric(5,2) default 0.55,
  huria_rate numeric(5,2) default 0.45,
  bpsk_amount numeric(15,2) default 0,
  huria_amount numeric(15,2) default 0,
  sentralisasi_remitted boolean default false,
  sentralisasi_remitted_at timestamptz,
  sentralisasi_remitted_ref text,
  sentralisasi_exclusion_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Penutupan Buku Bulanan
create table if not exists public.period_closings (
  id text primary key default gen_random_uuid()::text,
  tahun integer not null check (tahun >= 2000 and tahun <= 2100),
  bulan integer not null check (bulan >= 1 and bulan <= 12),
  kas_id text references public.kas(id) on delete cascade,
  is_closed boolean not null default true,
  closed_by text references public.profiles(id),
  closed_at timestamptz not null default now(),
  reopened_by text references public.profiles(id),
  reopened_at timestamptz,
  reopen_reason text,
  created_at timestamptz not null default now()
);

-- Rekonsiliasi Kas & Bank
create table if not exists public.reconciliations (
  id text primary key default gen_random_uuid()::text,
  tanggal date not null default current_date,
  storage_account_id text not null references public.storage_accounts(id) on delete cascade,
  system_balance numeric(15,2) not null,
  physical_balance numeric(15,2) not null,
  discrepancy numeric(15,2) not null default 0,
  notes text,
  checked_by text references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Audit Logs
create table if not exists public.audit_logs (
  id text primary key default gen_random_uuid()::text,
  table_name text not null,
  record_id text not null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by text references public.profiles(id),
  notes text,
  changed_at timestamptz not null default now()
);

-- 4. MODUL SALDO AWAL & PEMBUKAAN BUKU
create table if not exists public.opening_setup (
  id text primary key default 'main',
  first_year integer not null default 2026,
  go_live_date date not null default '2026-01-01',
  status text not null default 'in_progress',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opening_balances (
  id text primary key default gen_random_uuid()::text,
  tahun integer not null default 2026,
  kas_id text not null references public.kas(id) on delete cascade,
  storage_account_id text not null references public.storage_accounts(id) on delete cascade,
  amount numeric(15,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tahun, kas_id, storage_account_id)
);

create table if not exists public.opening_balance_entries (
  id text primary key default gen_random_uuid()::text,
  tahun integer not null default 2026,
  kas_id text not null references public.kas(id) on delete cascade,
  storage_account_id text not null references public.storage_accounts(id) on delete cascade,
  amount numeric(15,2) not null default 0,
  book_balance numeric(15,2) not null default 0,
  physical_balance numeric(15,2) not null default 0,
  difference numeric(15,2) default 0,
  explanation text,
  document_url text,
  status text not null default 'drafting',
  created_by text references public.profiles(id),
  approved_by text references public.profiles(id),
  approved_at timestamptz,
  locked_by text references public.profiles(id),
  locked_at timestamptz,
  submitted_at timestamptz,
  return_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tahun, kas_id, storage_account_id)
);

create table if not exists public.opening_balance_adjustments (
  id text primary key default gen_random_uuid()::text,
  tahun integer not null default 2026,
  kas_id text not null references public.kas(id) on delete cascade,
  storage_account_id text not null references public.storage_accounts(id) on delete cascade,
  amount numeric(15,2) not null,
  reason text not null,
  document_url text,
  status text not null default 'submitted',
  proposed_by text references public.profiles(id),
  approved_ketua_by text references public.profiles(id),
  approved_ketua_at timestamptz,
  approved_bendum_by text references public.profiles(id),
  approved_bendum_at timestamptz,
  rejected_by text references public.profiles(id),
  rejected_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.opening_other_positions (
  id text primary key default gen_random_uuid()::text,
  tahun integer not null default 2026,
  kas_id text not null references public.kas(id) on delete cascade,
  type text not null,
  name text not null,
  category text not null,
  acquisition_year integer,
  amount numeric(15,2) not null default 0,
  section_manager text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.prior_year_summaries (
  id text primary key default gen_random_uuid()::text,
  tahun integer not null,
  kas_id text not null references public.kas(id) on delete cascade,
  category_id text references public.categories(id) on delete restrict,
  jumlah numeric(15,2) not null default 0,
  sumber text default 'manual',
  locked boolean default true,
  created_at timestamptz not null default now()
);

-- 5. MODUL ANGGARAN (APBG)
create table if not exists public.budgets (
  id text primary key default gen_random_uuid()::text,
  kas_id text not null references public.kas(id) on delete cascade,
  tahun integer not null default 2026,
  version integer not null default 1,
  title text not null,
  status text not null default 'draft',
  estimated_opening_balance numeric(15,2) not null default 0,
  is_opening_balance_locked boolean not null default false,
  return_note text,
  rapat_date date,
  rapat_berita_acara_no text,
  rapat_document_url text,
  created_by text references public.profiles(id),
  approved_by text references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kas_id, tahun, version)
);

create table if not exists public.budget_items (
  id text primary key default gen_random_uuid()::text,
  budget_id text not null references public.budgets(id) on delete cascade,
  category_id text not null references public.categories(id) on delete restrict,
  type text not null,
  description text not null,
  annual_amount numeric(15,2) not null default 0,
  monthly_distribution jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_reallocations (
  id text primary key default gen_random_uuid()::text,
  budget_id text not null references public.budgets(id) on delete cascade,
  kas_id text not null references public.kas(id) on delete cascade,
  tahun integer not null default 2026,
  from_item_id text not null references public.budget_items(id),
  to_item_id text not null references public.budget_items(id),
  amount numeric(15,2) not null,
  reason text not null,
  status text not null default 'approved',
  proposed_by text references public.profiles(id),
  approved_by text references public.profiles(id),
  approved_at timestamptz,
  rejected_by text references public.profiles(id),
  rejected_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now()
);

-- 6. DATA PENDUKUNG LPJ (ISAK 35)
create table if not exists public.fixed_assets (
  id text primary key default gen_random_uuid()::text,
  kode text unique not null,
  nama text not null,
  kategori text not null default 'perabot',
  tanggal_perolehan date not null default current_date,
  nilai_perolehan numeric(15,2) not null default 0,
  kondisi text not null default 'baik',
  lokasi text not null default 'Gereja',
  kas_id text references public.kas(id) on delete set null,
  status text not null default 'aktif',
  useful_life_years integer default 0,
  salvage_value numeric(15,2) default 0,
  notes text,
  disposed_at date,
  disposal_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.asset_depreciations (
  id text primary key default gen_random_uuid()::text,
  asset_id text not null references public.fixed_assets(id) on delete cascade,
  year integer not null,
  depreciation_amount numeric(15,2) not null default 0,
  accumulated_depreciation numeric(15,2) not null default 0,
  book_value numeric(15,2) not null default 0,
  calculated_at timestamptz not null default now(),
  unique (asset_id, year)
);

create table if not exists public.advances (
  id text primary key default gen_random_uuid()::text,
  kode text unique not null,
  kas_id text not null references public.kas(id) on delete restrict,
  recipient_name text not null,
  recipient_phone text,
  amount numeric(15,2) not null default 0,
  advance_date date not null default current_date,
  due_date date not null,
  purpose text not null,
  status text not null default 'active',
  settled_at date,
  created_by text references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.advance_settlements (
  id text primary key default gen_random_uuid()::text,
  advance_id text not null references public.advances(id) on delete cascade,
  settlement_date date not null default current_date,
  total_spent numeric(15,2) not null default 0,
  remaining_amount numeric(15,2) not null default 0,
  notes text,
  receipt_urls jsonb default '[]'::jsonb,
  status text not null default 'approved',
  created_by text references public.profiles(id),
  approved_by text references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.receivables_payables (
  id text primary key default gen_random_uuid()::text,
  type text not null default 'receivable',
  kode text unique not null,
  kas_id text not null references public.kas(id) on delete restrict,
  counterparty_name text not null,
  counterparty_contact text,
  amount numeric(15,2) not null default 0,
  remaining_amount numeric(15,2) not null default 0,
  issue_date date not null default current_date,
  due_date date not null,
  status text not null default 'active',
  description text not null,
  created_by text references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.receivable_payable_payments (
  id text primary key default gen_random_uuid()::text,
  parent_id text not null references public.receivables_payables(id) on delete cascade,
  payment_date date not null default current_date,
  payment_amount numeric(15,2) not null default 0,
  storage_account_id text references public.storage_accounts(id),
  notes text,
  receipt_url text,
  created_by text references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.lpj_notes (
  id text primary key default 'lpj-note-2026',
  year integer not null default 2026,
  accounting_basis text,
  accounting_policies text,
  significant_items_notes text,
  budget_variance_notes text,
  significant_events text,
  restricted_funds_notes text,
  post_reporting_events text,
  updated_at timestamptz not null default now()
);

create table if not exists public.lpj_settings (
  id text primary key default 'main',
  enable_depreciation boolean default false,
  depreciation_method text default 'straight_line',
  budget_variance_threshold_percent numeric(5,2) default 10.0,
  default_advance_days integer default 14,
  document_number_format text default 'HKBP-HTR/LPJ/{TAHUN}/{NOMOR}',
  signatories jsonb default '[]'::jsonb,
  useful_life_defaults jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 7. MODUL BADAN AUDIT HURIA
create table if not exists public.audit_body_members (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.profiles(id) on delete cascade,
  jabatan text not null default 'anggota',
  periode_mulai date not null default current_date,
  periode_selesai date not null default (current_date + interval '2 years'),
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, periode_mulai)
);

create table if not exists public.audit_engagements (
  id text primary key default gen_random_uuid()::text,
  tahun integer not null default 2026,
  jenis text not null default 'semester_1',
  judul text not null,
  deskripsi text,
  semester_report_id text,
  lpj_id text,
  status text not null default 'draft',
  dibuka_pada date not null default current_date,
  batas_waktu date not null default current_date + interval '14 days',
  berita_acara_url text,
  combined_with_lpj boolean not null default false,
  created_by text references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tahun, jenis)
);

create table if not exists public.audit_reviews (
  id text primary key default gen_random_uuid()::text,
  engagement_id text not null references public.audit_engagements(id) on delete cascade,
  member_id text not null references public.profiles(id) on delete restrict,
  notes_per_section jsonb not null default '{}'::jsonb,
  general_notes text,
  personal_opinion text not null default 'sesuai',
  submitted_at timestamptz not null default now(),
  unique(engagement_id, member_id)
);

create table if not exists public.audit_findings (
  id text primary key default gen_random_uuid()::text,
  engagement_id text not null references public.audit_engagements(id) on delete cascade,
  kas_id text references public.kas(id) on delete set null,
  kode text not null,
  title text not null,
  description text not null,
  severity text not null default 'wajib_diperbaiki',
  status text not null default 'terbuka',
  due_date date,
  response_notes text,
  response_by text references public.profiles(id),
  responded_at timestamptz,
  closed_by text references public.profiles(id),
  closed_at timestamptz,
  closing_notes text,
  created_by text references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_final_opinions (
  id text primary key default gen_random_uuid()::text,
  engagement_id text not null references public.audit_engagements(id) on delete cascade unique,
  final_opinion text not null,
  vote_breakdown jsonb not null default '{}'::jsonb,
  has_dissenting_opinion boolean not null default false,
  dissenting_opinion_notes text,
  berita_acara_no text not null,
  berita_acara_date date not null default current_date,
  signatories jsonb not null default '[]'::jsonb,
  finalized_by text references public.profiles(id),
  finalized_at timestamptz not null default now()
);

create table if not exists public.cash_counts (
  id text primary key default gen_random_uuid()::text,
  tanggal date not null default current_date,
  kas_id text not null references public.kas(id) on delete cascade,
  storage_account_id text not null references public.storage_accounts(id) on delete cascade,
  book_balance numeric(15,2) not null default 0,
  physical_balance numeric(15,2) not null default 0,
  difference numeric(15,2) default 0,
  cash_breakdown jsonb not null default '{}'::jsonb,
  explanation text,
  auditor_id text references public.profiles(id),
  witness_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_period_verifications (
  id text primary key default gen_random_uuid()::text,
  tahun integer not null default 2026,
  period_type text not null default 'semester',
  period_code text not null default 'sem_1',
  period_title text not null,
  date_range text not null,
  status text not null default 'belum_diperiksa',
  verified_by jsonb default '[]'::jsonb,
  verified_signatures jsonb default '[]'::jsonb,
  verified_at timestamptz,
  general_notes text,
  checklist jsonb default '{}'::jsonb,
  berita_acara_no text,
  total_transactions_count integer default 0,
  verified_transactions_count integer default 0,
  flagged_transactions_count integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. MODUL LAPORAN SEMESTER & LPJ TAHUNAN
create table if not exists public.semester_reports (
  id text primary key default gen_random_uuid()::text,
  tahun integer not null default 2026,
  semester integer not null default 1,
  status text not null default 'preparation',
  version integer not null default 1,
  snapshot_data jsonb,
  checklist_result jsonb not null default '{}'::jsonb,
  sent_to_pastor_date date,
  sent_ref text,
  pastor_ack_by text references public.profiles(id),
  pastor_ack_at timestamptz,
  pastor_note text,
  announced_date date,
  announcement_medium text default 'warta_jemaat',
  announcement_text text,
  announcement_document_url text,
  return_notes text,
  created_by text references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tahun, semester, version)
);

create table if not exists public.lpj_reports (
  id text primary key default gen_random_uuid()::text,
  tahun integer not null default 2026,
  nomor_dokumen text not null,
  status text not null default 'preparation',
  version integer not null default 1,
  snapshot_data jsonb,
  checklist_result jsonb not null default '{}'::jsonb,
  meeting_date date,
  meeting_ref text,
  meeting_document_url text,
  meeting_notes text,
  meeting_attendees_count integer default 0,
  approved_by text references public.profiles(id),
  approved_at timestamptz,
  return_notes text,
  created_by text references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tahun, version)
);

create table if not exists public.lpj_exceptions (
  id text primary key default gen_random_uuid()::text,
  target_type text not null,
  target_id text not null,
  rule_code text not null,
  reason text not null,
  granted_by text not null references public.profiles(id),
  granted_at timestamptz not null default now()
);

-- 9. ROW LEVEL SECURITY (RLS) & POLICIES
-- Buka akses penuh untuk tabel publik (Dashboard menggunakan Supabase client)
do 313
declare
  tbl text;
  tables text[] := array[
    'profiles', 'kas', 'storage_accounts', 'user_kas_access', 'categories',
    'app_settings', 'transactions', 'period_closings', 'reconciliations',
    'audit_logs', 'opening_setup', 'opening_balances', 'opening_balance_entries',
    'opening_balance_adjustments', 'opening_other_positions', 'prior_year_summaries',
    'budgets', 'budget_items', 'budget_reallocations', 'fixed_assets',
    'asset_depreciations', 'advances', 'advance_settlements', 'receivables_payables',
    'receivable_payable_payments', 'lpj_notes', 'lpj_settings', 'audit_body_members',
    'audit_engagements', 'audit_reviews', 'audit_findings', 'audit_final_opinions',
    'cash_counts', 'audit_period_verifications', 'semester_reports', 'lpj_reports', 'lpj_exceptions'
  ];
begin
  foreach tbl in array tables loop
    execute format('alter table public.%I enable row level security;', tbl);
    execute format('drop policy if exists "Allow full access for all" on public.%I;', tbl);
    execute format('create policy "Allow full access for all" on public.%I for all using (true) with check (true);', tbl);
  end loop;
end 313;

-- 10. REALTIME CONFIGURATION
-- Aktifkan streaming perubahan data ke frontend dashboard
do 313
declare
  tbl text;
  tables text[] := array[
    'transactions', 'kas', 'storage_accounts', 'opening_balances',
    'opening_balance_entries', 'budgets', 'budget_items', 'fixed_assets',
    'advances', 'receivables_payables', 'audit_engagements', 'semester_reports', 'lpj_reports'
  ];
begin
  for tbl in select unnest(tables) loop
    begin
      execute format('alter publication supabase_realtime add table public.%I;', tbl);
    exception when others then null;
    end;
  end loop;
end 313;

-- 11. STORAGE BUCKET FOR RECEIPTS
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

drop policy if exists "Public Access Receipts" on storage.objects;
create policy "Public Access Receipts" on storage.objects for all using (bucket_id = 'receipts') with check (bucket_id = 'receipts');

-- 12. INITIAL SEED DATA (DATA AWAL HKBP HUTARAJA)

-- Settings
insert into public.app_settings (id, church_name, church_subtext, church_address, church_phone, church_email, pendeta_name, sekretaris_name, bendahara_umum_name, receipt_required_threshold, block_negative_balance, active_year)
values ('main', 'HKBP Ressort Hutaraja', 'Ressort Khusus - Distrik V Sumatera Timur', 'Jl. Gereja No. 1, Hutaraja, Sumatera Utara', '0812-3456-7890', 'ressort.hutaraja@hkbp.or.id', 'Pdt. R. Simanjuntak, S.Th', 'St. M. Siregar', 'St. B. Hutapea', 500000, true, 2026)
on conflict (id) do nothing;

-- Opening Setup
insert into public.opening_setup (id, first_year, go_live_date, status, notes)
values ('main', 2026, '2026-01-01', 'in_progress', 'Pembukaan Buku Keuangan HKBP Ressort Hutaraja Tahun 2026')
on conflict (id) do nothing;

-- LPJ Settings & Notes
insert into public.lpj_settings (id, enable_depreciation, budget_variance_threshold_percent, default_advance_days)
values ('main', false, 10.0, 14)
on conflict (id) do nothing;

insert into public.lpj_notes (id, year, accounting_basis, accounting_policies)
values ('lpj-note-2026', 2026, 'Laporan Keuangan HKBP Ressort Hutaraja Tahun 2026 disusun dengan Basis Kas yang Dimodifikasi (ISAK 35 nonlaba).', 'Pencatatan kas terpisah per seksi, dana terikat dan tidak terikat, aset tetap historis.')
on conflict (id) do nothing;

-- Master Kas
insert into public.kas (id, kode, nama, deskripsi, warna, fund_type, is_active) values
('kas-1', 'KAS-UMUM', 'Kas Umum Huria', 'Kas operasional induk huria dan ressort', '#7C9CF5', 'unrestricted', true),
('kas-2', 'KAS-DIAK', 'Kas Seksi Diakonia', 'Pelayanan kasih, diakonia kedukaan dan orang sakit', '#FFB4A2', 'restricted', true),
('kas-3', 'KAS-SM', 'Kas Seksi Sekolah Minggu', 'Ibadah dan pembinaan anak sekolah minggu', '#CDB4FF', 'unrestricted', true),
('kas-4', 'KAS-INA', 'Kas Seksi Parompuan (Ina)', 'Pelayanan kategorial kaum ibu / Parompuan HKBP', '#FBCFE8', 'unrestricted', true),
('kas-5', 'KAS-AMA', 'Kas Seksi Ama (Kaum Bapak)', 'Pelayanan kategorial kaum bapak / Ama HKBP', '#FED7AA', 'unrestricted', true),
('kas-6', 'KAS-RNHKBP', 'Kas Seksi Naposobulung / Pemuda', 'Persekutuan dan kegiatan pemuda pemudi gereja', '#A7F3D0', 'unrestricted', true),
('kas-7', 'KAS-BANG', 'Kas Panitia Pembangunan', 'Renovasi fisik gedung gereja, pastori, dan sarana ibadah', '#BAE6FD', 'restricted', true)
on conflict (id) do nothing;

-- Storage Accounts
insert into public.storage_accounts (id, nama, tipe, nomor_rekening, atas_nama, is_active) values
('stor-1', 'Brankas Tunai Huria', 'cash', null, 'Bendahara HKBP Hutaraja', true),
('stor-2', 'Bank BRI Ressort Hutaraja', 'bank', '3210-01-002345-53-1', 'HKBP Ressort Hutaraja', true),
('stor-3', 'Bank Mandiri Ressort Hutaraja', 'bank', '107-00-1289456-7', 'HKBP Ressort Hutaraja', true)
on conflict (id) do nothing;

-- Master Kategori
insert into public.categories (id, nama, tipe, kode, is_active) values
('cat-in-1', 'Persembahan Minggu (Pelean IA & IB)', 'income', 'IN-01', true),
('cat-in-2', 'Pelean Ucapan Syukur (Taon Parasi Rohaon)', 'income', 'IN-02', true),
('cat-in-3', 'Sulang-sulang Pahoppu / Partumpolon', 'income', 'IN-03', true),
('cat-in-4', 'Dana Pembangunan', 'income', 'IN-04', true),
('cat-in-5', 'Diakonia Sosial', 'income', 'IN-05', true),
('cat-in-6', 'Sumbangan / Donasi Donatur', 'income', 'IN-06', true),
('cat-in-7', 'Pemasukan Lain-lain', 'income', 'IN-99', true),
('cat-out-1', 'Gaji / Honor Pelayan & Pegawai', 'expense', 'OUT-01', true),
('cat-out-2', 'Operasional Kantor & Ibadah', 'expense', 'OUT-02', true),
('cat-out-3', 'Listrik, Air & Internet', 'expense', 'OUT-03', true),
('cat-out-4', 'Pemeliharaan Gedung & Inventaris', 'expense', 'OUT-04', true),
('cat-out-5', 'Kegiatan Ibadah & Hari Besar Gerejawi', 'expense', 'OUT-05', true),
('cat-out-6', 'Diakonia / Bantuan Sosial Jemaat', 'expense', 'OUT-06', true),
('cat-out-7', 'Setoran ke Distrik & Pusat HKBP', 'expense', 'OUT-07', true),
('cat-out-8', 'Pengeluaran Lain-lain', 'expense', 'OUT-99', true)
on conflict (id) do nothing;

-- Initial Saldo Awal (Diset 0 Sesuai Permintaan)
insert into public.opening_balances (id, tahun, kas_id, storage_account_id, amount, notes) values
('ob-1', 2026, 'kas-1', 'stor-1', 0, 'Brankas Tunai Kas Umum'),
('ob-2', 2026, 'kas-1', 'stor-2', 0, 'Bank BRI Kas Umum'),
('ob-3', 2026, 'kas-2', 'stor-1', 0, 'Brankas Kas Diakonia'),
('ob-4', 2026, 'kas-3', 'stor-1', 0, 'Brankas Kas Sekolah Minggu'),
('ob-5', 2026, 'kas-4', 'stor-1', 0, 'Brankas Kas Kaum Ibu'),
('ob-6', 2026, 'kas-5', 'stor-1', 0, 'Brankas Kas Kaum Bapak'),
('ob-7', 2026, 'kas-6', 'stor-1', 0, 'Brankas Kas Pemuda'),
('ob-8', 2026, 'kas-7', 'stor-3', 0, 'Bank Mandiri Kas Pembangunan')
on conflict (id) do nothing;

-- Initial Profiles (Struktural HKBP Hutaraja)
insert into public.profiles (id, email, full_name, role, ecclesiastical_role, tohonan, tingkat, wijk, phone, is_active) values
('user-superadmin', 'hsupreddi@gmail.com', 'Administrator Utama (hsupreddi@gmail.com)', 'admin', 'admin_sistem', 'sintua', 'huria', 'Pusat / Huria', '0812-9999-8888', true),
('user-admin', 'admin@hkbp-hutaraja.org', 'St. P. Sitompul (Admin)', 'admin', 'admin_sistem', 'sintua', 'huria', 'Wijk II', '0812-1111-2222', true),
('user-bendum', 'bendum@hkbp-hutaraja.org', 'St. B. Hutapea (Bendahara Huria)', 'bendahara_umum', 'bendahara_huria', 'sintua', 'huria', 'Wijk I', '0813-2222-3333', true),
('user-pendeta', 'pendeta@hkbp-hutaraja.org', 'Pdt. R. Simanjuntak, S.Th (Pendeta Ressort)', 'pendeta_ressort', 'pendeta_ressort', 'pendeta', 'ressort', null, '0811-3333-4444', true),
('user-sekretaris', 'sekretaris@hkbp-hutaraja.org', 'St. M. Siregar (Sekretaris Huria)', 'sekretaris', 'sekretaris_huria', 'sintua', 'huria', 'Wijk III', '0812-5555-6666', true),
('user-audit-ketua', 'audit.ketua@hkbp-hutaraja.org', 'St. T. Simatupang, SE, Ak (Ketua Badan Audit)', 'auditor', 'ketua_badan_audit', 'sintua', 'huria', 'Wijk I', '0812-8888-9999', true),
('user-audit-1', 'audit.purba@hkbp-hutaraja.org', 'St. Ir. H. Purba (Anggota Badan Audit)', 'auditor', 'anggota_badan_audit', 'sintua', 'huria', 'Wijk II', '0813-9999-0000', true),
('user-audit-2', 'audit.tobing@hkbp-hutaraja.org', 'Dra. R. boru Lumbantobing (Anggota Badan Audit)', 'auditor', 'anggota_badan_audit', 'non_tahbisan', 'huria', 'Wijk IV', '0811-0000-1111', true),
('user-bend-diakonia', 'diakonia@hkbp-hutaraja.org', 'Ny. S. Nababan (Bendahara Diakonia)', 'pengurus_kas', 'pengurus_seksi_diakoni_sosial', 'non_tahbisan', 'huria', 'Wijk II', '0813-1234-5678', true),
('user-ketua-diakonia', 'ketua.diakonia@hkbp-hutaraja.org', 'St. K. Pasaribu (Ketua Diakonia)', 'pengurus_kas', 'ketua_dewan_diakonia', 'sintua', 'huria', 'Wijk I', '0812-2345-6789', true),
('user-bend-sm', 'sm@hkbp-hutaraja.org', 'Sdri. L. Panjaitan (Bendahara Sekolah Minggu)', 'pengurus_kas', 'pengurus_seksi_sekolah_minggu', 'non_tahbisan', 'huria', 'Wijk IV', '0813-3456-7890', true),
('user-ketua-sm', 'ketua.sm@hkbp-hutaraja.org', 'St. E. Manurung (Ketua Sekolah Minggu)', 'pengurus_kas', 'pengurus_seksi_sekolah_minggu', 'sintua', 'huria', 'Wijk III', '0812-4567-8901', true),
('user-bend-ina', 'ina@hkbp-hutaraja.org', 'Ny. St. H. Marpaung (Bendahara Kaum Ibu)', 'pengurus_kas', 'pengurus_seksi_parompuan', 'non_tahbisan', 'huria', 'Wijk II', '0812-5678-9012', true)
on conflict (id) do nothing;

-- User Kas Access
insert into public.user_kas_access (id, user_id, kas_id, access_level) values
('uka-1', 'user-bendum', 'kas-1', 'bendahara'),
('uka-2', 'user-pendeta', 'kas-1', 'ketua'),
('uka-3', 'user-sekretaris', 'kas-1', 'ketua'),
('uka-4', 'user-bend-diakonia', 'kas-2', 'bendahara'),
('uka-5', 'user-ketua-diakonia', 'kas-2', 'ketua'),
('uka-6', 'user-bend-sm', 'kas-3', 'bendahara'),
('uka-7', 'user-ketua-sm', 'kas-3', 'ketua'),
('uka-8', 'user-bend-ina', 'kas-4', 'bendahara')
on conflict (id) do nothing;

-- Badan Audit Members
insert into public.audit_body_members (id, user_id, jabatan, periode_mulai, periode_selesai, aktif) values
('abm-1', 'user-audit-ketua', 'ketua', '2025-01-01', '2027-01-01', true),
('abm-2', 'user-audit-1', 'anggota', '2025-01-01', '2027-01-01', true),
('abm-3', 'user-audit-2', 'anggota', '2025-01-01', '2027-01-01', true)
on conflict (id) do nothing;

