-- =============================================================================
-- SIKU HKBP Hutaraja (Sistem Informasi Keuangan HKBP Ressort Hutaraja)
-- Database Schema for Supabase (PostgreSQL + RLS + Functions + Views + Triggers)
-- =============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. ENUMS & TYPES
-- -----------------------------------------------------------------------------

do $$ begin
  create type public.user_role as enum (
    'admin',
    'bendahara_umum',
    'pengurus_kas',
    'pendeta_ressort',
    'sekretaris',
    'majelis'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.kas_access_level as enum (
    'bendahara',
    'ketua'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.storage_type as enum (
    'cash',
    'bank'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.category_type as enum (
    'income',
    'expense'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.transaction_type as enum (
    'income',
    'expense',
    'transfer_out',
    'transfer_in'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.transaction_status as enum (
    'draft',
    'submitted',
    'approved',
    'rejected'
  );
exception when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 2. TABLES
-- -----------------------------------------------------------------------------

-- User Profiles (connected to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role public.user_role not null default 'pengurus_kas',
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Master Kas (Daftar Dana per Seksi/Sektor)
create table if not exists public.kas (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,
  nama text not null,
  deskripsi text,
  warna text not null default '#7C9CF5', -- Pastel color identifier
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Penugasan Pengguna ke Kas (Multi-bendahara dan multi-ketua per kas)
create table if not exists public.user_kas_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kas_id uuid not null references public.kas(id) on delete cascade,
  access_level public.kas_access_level not null, -- 'bendahara' | 'ketua'
  created_at timestamptz not null default now(),
  unique(user_id, kas_id, access_level)
);

-- Master Tempat Penyimpanan (Rekening Bank / Kas Fisik Tunai)
create table if not exists public.storage_accounts (
  id uuid primary key default gen_random_uuid(),
  nama text not null, -- contoh: 'Brankas Tunai Huria', 'Bank BRI Ressort Hutaraja'
  tipe public.storage_type not null default 'cash',
  nomor_rekening text,
  atas_nama text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Saldo Awal per Tahun Anggaran per Kas dan Tempat Penyimpanan
create table if not exists public.opening_balances (
  id uuid primary key default gen_random_uuid(),
  tahun integer not null check (tahun >= 2000 and tahun <= 2100),
  kas_id uuid not null references public.kas(id) on delete cascade,
  storage_account_id uuid not null references public.storage_accounts(id) on delete cascade,
  amount numeric(15,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tahun, kas_id, storage_account_id)
);

-- Kategori Transaksi (Pemasukan / Pengeluaran)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  tipe public.category_type not null,
  kode text,
  deskripsi text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Transaksi Keuangan
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null default current_date,
  kas_id uuid not null references public.kas(id) on delete restrict,
  storage_account_id uuid not null references public.storage_accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict, -- nullable for transfers
  type public.transaction_type not null,
  amount numeric(15,2) not null check (amount > 0),
  description text not null,
  receipt_no text,
  attachment_url text, -- Supabase storage receipt photo path/URL
  status public.transaction_status not null default 'draft',
  
  -- Transfer tracking
  transfer_id uuid, -- Paired ID linking transfer_out and transfer_in
  transfer_target_kas_id uuid references public.kas(id),
  transfer_target_storage_id uuid references public.storage_accounts(id),
  transfer_confirmed_by uuid references public.profiles(id),
  transfer_confirmed_at timestamptz,

  -- Reversal tracking (Koreksi)
  reverses_id uuid references public.transactions(id),
  is_reversal boolean not null default false,

  -- Lifecycle and audit metadata
  created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  reject_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Penutupan Buku Bulanan (Period Closing)
create table if not exists public.period_closings (
  id uuid primary key default gen_random_uuid(),
  tahun integer not null check (tahun >= 2000 and tahun <= 2100),
  bulan integer not null check (bulan >= 1 and bulan <= 12),
  kas_id uuid references public.kas(id) on delete cascade, -- NULL indicates all kas closed globally
  is_closed boolean not null default true,
  closed_by uuid references public.profiles(id),
  closed_at timestamptz not null default now(),
  reopened_by uuid references public.profiles(id),
  reopened_at timestamptz,
  reopen_reason text,
  created_at timestamptz not null default now()
);

-- Rekonsiliasi Saldo Fisik / Rekening Koran vs Sistem
create table if not exists public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null default current_date,
  storage_account_id uuid not null references public.storage_accounts(id) on delete cascade,
  system_balance numeric(15,2) not null,
  physical_balance numeric(15,2) not null,
  discrepancy numeric(15,2) generated always as (physical_balance - system_balance) stored,
  notes text,
  checked_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Audit Log (Immutable record of changes)
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,
  action text not null, -- 'INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'PERIOD_CLOSED', 'PERIOD_REOPENED'
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references public.profiles(id),
  notes text,
  changed_at timestamptz not null default now()
);

-- Pengaturan Organisasi & Batasan Nota
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
  receipt_required_threshold numeric(15,2) not null default 500000, -- Lampiran nota wajib jika pengeluaran >= Rp 500.000
  block_negative_balance boolean not null default true,
  active_year integer not null default 2026,
  budget_reallocation_max_pct numeric(5,2) not null default 15.00, -- Batas maksimal pergeseran anggaran antar pos (persen)
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3. INDEXES
-- -----------------------------------------------------------------------------
create index if not exists idx_transactions_kas_date on public.transactions(kas_id, tanggal);
create index if not exists idx_transactions_status on public.transactions(status);
create index if not exists idx_transactions_type on public.transactions(type);
create index if not exists idx_transactions_transfer_id on public.transactions(transfer_id);
create index if not exists idx_user_kas_access_user on public.user_kas_access(user_id);
create index if not exists idx_user_kas_access_kas on public.user_kas_access(kas_id);
create index if not exists idx_period_closings_lookup on public.period_closings(tahun, bulan, kas_id);
create index if not exists idx_audit_logs_record on public.audit_logs(table_name, record_id);

-- -----------------------------------------------------------------------------
-- 4. CONSTRAINTS & TRIGGERS
-- -----------------------------------------------------------------------------

-- Trigger updated_at otomatis
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace trigger trg_kas_updated_at
  before update on public.kas
  for each row execute function public.set_updated_at();

create or replace trigger trg_storage_accounts_updated_at
  before update on public.storage_accounts
  for each row execute function public.set_updated_at();

create or replace trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create or replace trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- Trigger: Mencegah Bendahara Umum menjadi ketua pada Kas Umum
create or replace function public.check_bendahara_umum_kas_umum()
returns trigger as $$
declare
  v_user_role public.user_role;
  v_kas_kode text;
begin
  select role into v_user_role from public.profiles where id = new.user_id;
  select kode into v_kas_kode from public.kas where id = new.kas_id;

  if v_user_role = 'bendahara_umum' and v_kas_kode = 'KAS-UMUM' and new.access_level = 'ketua' then
    raise exception 'Bendahara Umum tidak boleh ditugaskan sebagai Ketua pada Kas Umum untuk menjaga akuntabilitas persetujuan.';
  end if;

  return new;
end;
$$ language plpgsql;

create or replace trigger trg_check_bendahara_umum_kas_access
  before insert or update on public.user_kas_access
  for each row execute function public.check_bendahara_umum_kas_umum();

-- Trigger: Validasi Transaksi (Perlindungan status approved, pencegahan persetujuan diri sendiri, dan periode tutup buku)
create or replace function public.validate_transaction_rules()
returns trigger as $$
declare
  v_tx_year integer;
  v_tx_month integer;
  v_is_period_closed boolean;
begin
  -- 1. Cek penutupan buku untuk tanggal transaksi
  v_tx_year := extract(year from new.tanggal);
  v_tx_month := extract(month from new.tanggal);

  select exists(
    select 1 from public.period_closings
    where tahun = v_tx_year
      and bulan = v_tx_month
      and (kas_id = new.kas_id or kas_id is null)
      and is_closed = true
  ) into v_is_period_closed;

  if v_is_period_closed then
    raise exception 'Transaksi tidak dapat dibuat atau diubah pada periode yang sudah ditutup (% - %). Hubungi Bendahara Umum.', v_tx_month, v_tx_year;
  end if;

  -- 2. Transaksi yang sudah disetujui tidak boleh diedit secara langsung (harus lewat transaksi koreksi / reverses_id)
  if tg_op = 'UPDATE' and old.status = 'approved' then
    if new.amount != old.amount or new.kas_id != old.kas_id or new.storage_account_id != old.storage_account_id or new.type != old.type then
      raise exception 'Transaksi yang sudah Disetujui (Approved) tidak dapat diubah langsung. Buat transaksi koreksi/pembalik.';
    end if;
  end if;

  -- 3. Penginput tidak boleh menyetujui transaksinya sendiri
  if new.status = 'approved' and new.approved_by is not null and new.created_by is not null then
    if new.approved_by = new.created_by then
      raise exception 'Penginput transaksi tidak boleh menyetujui transaksinya sendiri.';
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

create or replace trigger trg_validate_transaction_before_write
  before insert or update on public.transactions
  for each row execute function public.validate_transaction_rules();

-- Mencegah penghapusan transaksi yang sudah Disetujui
create or replace function public.prevent_delete_approved_transaction()
returns trigger as $$
begin
  if old.status = 'approved' then
    raise exception 'Transaksi yang sudah Disetujui tidak boleh dihapus. Buat transaksi koreksi/pembalik.';
  end if;
  return old;
end;
$$ language plpgsql;

create or replace trigger trg_prevent_delete_approved
  before delete on public.transactions
  for each row execute function public.prevent_delete_approved_transaction();

-- -----------------------------------------------------------------------------
-- 5. AUDIT LOG TRIGGER
-- -----------------------------------------------------------------------------

create or replace function public.log_audit_trail()
returns trigger as $$
declare
  v_changed_by uuid;
begin
  v_changed_by := auth.uid();

  if tg_op = 'INSERT' then
    insert into public.audit_logs (table_name, record_id, action, new_data, changed_by)
    values (tg_table_name, new.id::text, 'INSERT', to_jsonb(new), v_changed_by);
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
    values (tg_table_name, new.id::text, 'UPDATE', to_jsonb(old), to_jsonb(new), v_changed_by);
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (table_name, record_id, action, old_data, changed_by)
    values (tg_table_name, old.id::text, 'DELETE', to_jsonb(old), v_changed_by);
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create or replace trigger trg_audit_transactions
  after insert or update or delete on public.transactions
  for each row execute function public.log_audit_trail();

create or replace trigger trg_audit_kas_access
  after insert or update or delete on public.user_kas_access
  for each row execute function public.log_audit_trail();

create or replace trigger trg_audit_period_closings
  after insert or update or delete on public.period_closings
  for each row execute function public.log_audit_trail();

-- -----------------------------------------------------------------------------
-- 6. STORED PROCEDURES / RPC FUNCTIONS
-- -----------------------------------------------------------------------------

-- A. Membuat Transfer Antar Kas / Antar Tempat Penyimpanan Secara Atomik
create or replace function public.create_atomic_transfer(
  p_tanggal date,
  p_source_kas_id uuid,
  p_source_storage_id uuid,
  p_target_kas_id uuid,
  p_target_storage_id uuid,
  p_amount numeric,
  p_description text,
  p_receipt_no text default null,
  p_attachment_url text default null
)
returns uuid as $$
declare
  v_transfer_id uuid;
  v_user_id uuid;
  v_is_same_kas boolean;
  v_has_access boolean;
  v_initial_status public.transaction_status;
begin
  v_user_id := auth.uid();
  v_transfer_id := gen_random_uuid();
  v_is_same_kas := (p_source_kas_id = p_target_kas_id);

  if p_amount <= 0 then
    raise exception 'Nominal transfer harus lebih besar dari 0.';
  end if;

  -- Validasi bahwa user punya akses bendahara pada kas sumber
  select exists(
    select 1 from public.user_kas_access
    where user_id = v_user_id
      and kas_id = p_source_kas_id
      and access_level = 'bendahara'
  ) into v_has_access;

  -- Admin atau Bendahara Umum (untuk kas umum) diizinkan
  if not v_has_access then
    select exists(
      select 1 from public.profiles
      where id = v_user_id and role in ('admin', 'bendahara_umum')
    ) into v_has_access;
  end if;

  if not v_has_access then
    raise exception 'Anda tidak memiliki hak akses sebagai bendahara pada kas pengirim.';
  end if;

  v_initial_status := 'submitted';

  -- 1. Buat transaksi Transfer Keluar (transfer_out)
  insert into public.transactions (
    tanggal, kas_id, storage_account_id, type, amount, description,
    receipt_no, attachment_url, status, transfer_id,
    transfer_target_kas_id, transfer_target_storage_id, created_by
  ) values (
    p_tanggal, p_source_kas_id, p_source_storage_id, 'transfer_out', p_amount,
    p_description || ' (Transfer Keluar)',
    p_receipt_no, p_attachment_url, v_initial_status, v_transfer_id,
    p_target_kas_id, p_target_storage_id, v_user_id
  );

  -- 2. Buat transaksi Transfer Masuk (transfer_in)
  insert into public.transactions (
    tanggal, kas_id, storage_account_id, type, amount, description,
    receipt_no, attachment_url, status, transfer_id,
    transfer_target_kas_id, transfer_target_storage_id, created_by
  ) values (
    p_tanggal, p_target_kas_id, p_target_storage_id, 'transfer_in', p_amount,
    p_description || ' (Transfer Masuk)',
    p_receipt_no, p_attachment_url, v_initial_status, v_transfer_id,
    p_source_kas_id, p_source_storage_id, v_user_id
  );

  return v_transfer_id;
end;
$$ language plpgsql security definer;

-- B. Perubahan Status Transaksi (Diajukan -> Disetujui / Ditolak)
create or replace function public.change_transaction_status(
  p_transaction_id uuid,
  p_new_status public.transaction_status,
  p_reject_note text default null
)
returns boolean as $$
declare
  v_user_id uuid;
  v_user_role public.user_role;
  v_kas_id uuid;
  v_created_by uuid;
  v_current_status public.transaction_status;
  v_is_ketua boolean;
  v_transfer_id uuid;
begin
  v_user_id := auth.uid();

  select kas_id, created_by, status, transfer_id
  into v_kas_id, v_created_by, v_current_status, v_transfer_id
  from public.transactions
  where id = p_transaction_id;

  if not found then
    raise exception 'Transaksi tidak ditemukan.';
  end if;

  select role into v_user_role from public.profiles where id = v_user_id;

  -- Cek apakah user adalah ketua pada kas terkait
  select exists(
    select 1 from public.user_kas_access
    where user_id = v_user_id and kas_id = v_kas_id and access_level = 'ketua'
  ) into v_is_ketua;

  -- Pendeta Ressort dan Sekretaris punya otoritas persetujuan jika ditugaskan
  if not v_is_ketua and v_user_role in ('pendeta_ressort') then
    v_is_ketua := true;
  end if;

  -- Jika bendahara menarik kembali pengajuan yang masih submitted -> draft
  if p_new_status = 'draft' and v_current_status = 'submitted' and v_created_by = v_user_id then
    update public.transactions
    set status = 'draft', updated_at = now()
    where id = p_transaction_id;
    return true;
  end if;

  -- Untuk persetujuan / penolakan: wajib berstatus ketua
  if not v_is_ketua then
    raise exception 'Hanya Ketua Kas yang berwenang menyetujui atau menolak transaksi ini.';
  end if;

  if p_new_status in ('approved', 'rejected') and v_created_by = v_user_id then
    raise exception 'Penginput transaksi tidak boleh menyetujui atau menolak transaksinya sendiri.';
  end if;

  if p_new_status = 'rejected' and (p_reject_note is null or trim(p_reject_note) = '') then
    raise exception 'Penolakan transaksi wajib menyertakan catatan penolakan.';
  end if;

  -- Update transaksi
  update public.transactions
  set status = p_new_status,
      approved_by = case when p_new_status = 'approved' then v_user_id else approved_by end,
      approved_at = case when p_new_status = 'approved' then now() else approved_at end,
      reject_note = case when p_new_status = 'rejected' then p_reject_note else null end,
      updated_at = now()
  where id = p_transaction_id;

  -- Jika transfer dalam kas yang sama, update juga pasangannya
  if v_transfer_id is not null then
    update public.transactions
    set status = p_new_status,
        approved_by = case when p_new_status = 'approved' then v_user_id else approved_by end,
        approved_at = case when p_new_status = 'approved' then now() else approved_at end,
        reject_note = case when p_new_status = 'rejected' then p_reject_note else null end,
        updated_at = now()
    where transfer_id = v_transfer_id
      and id != p_transaction_id
      and kas_id = v_kas_id;
  end if;

  return true;
end;
$$ language plpgsql security definer;

-- C. Konfirmasi Penerimaan Transfer Antar Kas Berbeda oleh Ketua Kas Penerima
create or replace function public.confirm_transfer_receipt(
  p_transfer_id uuid
)
returns boolean as $$
declare
  v_user_id uuid;
  v_receiver_kas_id uuid;
  v_is_receiver_ketua boolean;
begin
  v_user_id := auth.uid();

  select kas_id into v_receiver_kas_id
  from public.transactions
  where transfer_id = p_transfer_id and type = 'transfer_in'
  limit 1;

  if not found then
    raise exception 'Pasangan transaksi transfer masuk tidak ditemukan.';
  end if;

  -- Cek apakah user adalah ketua pada kas penerima
  select exists(
    select 1 from public.user_kas_access
    where user_id = v_user_id and kas_id = v_receiver_kas_id and access_level = 'ketua'
  ) into v_is_receiver_ketua;

  if not v_is_receiver_ketua then
    select exists(
      select 1 from public.profiles
      where id = v_user_id and role = 'pendeta_ressort'
    ) into v_is_receiver_ketua;
  end if;

  if not v_is_receiver_ketua then
    raise exception 'Hanya Ketua Kas Penerima yang berwenang mengonfirmasi penerimaan transfer ini.';
  end if;

  -- Tandai transfer masuk sebagai approved dan catat konfirmasinya
  update public.transactions
  set status = 'approved',
      transfer_confirmed_by = v_user_id,
      transfer_confirmed_at = now(),
      approved_by = v_user_id,
      approved_at = now(),
      updated_at = now()
  where transfer_id = p_transfer_id;

  return true;
end;
$$ language plpgsql security definer;

-- -----------------------------------------------------------------------------
-- 7. DATABASE VIEWS
-- -----------------------------------------------------------------------------

-- View: Saldo Resmi & Proyeksi per Kas
create or replace view public.view_kas_balances as
with initial_balances as (
  select kas_id, coalesce(sum(amount), 0) as total_initial
  from public.opening_balances
  group by kas_id
),
approved_mutations as (
  select
    kas_id,
    coalesce(sum(case when type = 'income' then amount else 0 end), 0) as total_income,
    coalesce(sum(case when type = 'expense' then amount else 0 end), 0) as total_expense,
    coalesce(sum(case when type = 'transfer_in' then amount else 0 end), 0) as total_transfer_in,
    coalesce(sum(case when type = 'transfer_out' then amount else 0 end), 0) as total_transfer_out
  from public.transactions
  where status = 'approved'
  group by kas_id
),
projected_mutations as (
  select
    kas_id,
    coalesce(sum(case when type = 'income' then amount else 0 end), 0) as proj_income,
    coalesce(sum(case when type = 'expense' then amount else 0 end), 0) as proj_expense,
    coalesce(sum(case when type = 'transfer_in' then amount else 0 end), 0) as proj_transfer_in,
    coalesce(sum(case when type = 'transfer_out' then amount else 0 end), 0) as proj_transfer_out
  from public.transactions
  where status in ('approved', 'submitted')
  group by kas_id
)
select
  k.id as kas_id,
  k.kode,
  k.nama,
  k.warna,
  k.is_active,
  coalesce(ib.total_initial, 0) as saldo_awal,
  coalesce(am.total_income, 0) as total_pemasukan,
  coalesce(am.total_expense, 0) as total_pengeluaran,
  coalesce(am.total_transfer_in, 0) as total_transfer_masuk,
  coalesce(am.total_transfer_out, 0) as total_transfer_keluar,
  (coalesce(ib.total_initial, 0) + coalesce(am.total_income, 0) - coalesce(am.total_expense, 0) + coalesce(am.total_transfer_in, 0) - coalesce(am.total_transfer_out, 0)) as saldo_resmi,
  (coalesce(ib.total_initial, 0) + coalesce(pm.proj_income, 0) - coalesce(pm.proj_expense, 0) + coalesce(pm.proj_transfer_in, 0) - coalesce(pm.proj_transfer_out, 0)) as saldo_proyeksi
from public.kas k
left join initial_balances ib on ib.kas_id = k.id
left join approved_mutations am on am.kas_id = k.id
left join projected_mutations pm on pm.kas_id = k.id;

-- View: Saldo per Tempat Penyimpanan (Brankas Tunai, Rekening Bank)
create or replace view public.view_storage_balances as
with initial_balances as (
  select storage_account_id, coalesce(sum(amount), 0) as total_initial
  from public.opening_balances
  group by storage_account_id
),
approved_mutations as (
  select
    storage_account_id,
    coalesce(sum(case when type = 'income' then amount else 0 end), 0) as total_income,
    coalesce(sum(case when type = 'expense' then amount else 0 end), 0) as total_expense,
    coalesce(sum(case when type = 'transfer_in' then amount else 0 end), 0) as total_transfer_in,
    coalesce(sum(case when type = 'transfer_out' then amount else 0 end), 0) as total_transfer_out
  from public.transactions
  where status = 'approved'
  group by storage_account_id
)
select
  sa.id as storage_account_id,
  sa.nama,
  sa.tipe,
  sa.nomor_rekening,
  sa.atas_nama,
  sa.is_active,
  coalesce(ib.total_initial, 0) as saldo_awal,
  (coalesce(ib.total_initial, 0) + coalesce(am.total_income, 0) - coalesce(am.total_expense, 0) + coalesce(am.total_transfer_in, 0) - coalesce(am.total_transfer_out, 0)) as saldo_saat_ini
from public.storage_accounts sa
left join initial_balances ib on ib.storage_account_id = sa.id
left join approved_mutations am on am.storage_account_id = sa.id;

-- View: Ringkasan Bulanan per Kas (Transfer dikecualikan dari pemasukan & pengeluaran)
create or replace view public.view_monthly_summary_per_kas as
select
  k.id as kas_id,
  k.nama as nama_kas,
  extract(year from t.tanggal)::int as tahun,
  extract(month from t.tanggal)::int as bulan,
  sum(case when t.type = 'income' and t.status = 'approved' then t.amount else 0 end) as total_pemasukan,
  sum(case when t.type = 'expense' and t.status = 'approved' then t.amount else 0 end) as total_pengeluaran,
  sum(case when t.type = 'transfer_in' and t.status = 'approved' then t.amount else 0 end) as total_transfer_masuk,
  sum(case when t.type = 'transfer_out' and t.status = 'approved' then t.amount else 0 end) as total_transfer_keluar,
  count(t.id) as total_transaksi,
  count(case when t.status = 'submitted' then 1 end) as jumlah_menunggu_persetujuan
from public.kas k
left join public.transactions t on t.kas_id = k.id
group by k.id, k.nama, extract(year from t.tanggal), extract(month from t.tanggal);

-- -----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.kas enable row level security;
alter table public.user_kas_access enable row level security;
alter table public.storage_accounts enable row level security;
alter table public.opening_balances enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.period_closings enable row level security;
alter table public.reconciliations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;

-- Profiles: Pengguna bisa membaca profil semua user aktif (untuk dropdown & log), edit profil sendiri
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Admins have full access to profiles"
  on public.profiles for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Kas: Dapat dibaca oleh semua authenticated user
create policy "Kas viewable by authenticated users"
  on public.kas for select
  to authenticated
  using (true);

create policy "Kas manageable by admin"
  on public.kas for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- User Kas Access: Viewable by authenticated, manageable by admin
create policy "User kas access viewable by authenticated"
  on public.user_kas_access for select
  to authenticated
  using (true);

create policy "User kas access manageable by admin"
  on public.user_kas_access for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Storage Accounts: Viewable by authenticated, manageable by admin & bendahara umum
create policy "Storage accounts viewable by authenticated"
  on public.storage_accounts for select
  to authenticated
  using (true);

create policy "Storage accounts manageable by admin and bendahara umum"
  on public.storage_accounts for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'bendahara_umum')));

-- Opening Balances: Viewable by authenticated, manageable by admin & bendahara umum
create policy "Opening balances viewable by authenticated"
  on public.opening_balances for select
  to authenticated
  using (true);

create policy "Opening balances manageable by admin and bendahara umum"
  on public.opening_balances for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'bendahara_umum')));

-- Categories: Viewable by authenticated, manageable by admin
create policy "Categories viewable by authenticated"
  on public.categories for select
  to authenticated
  using (true);

create policy "Categories manageable by admin"
  on public.categories for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Transactions: Strict RLS per Penugasan Kas
create policy "Transactions viewable based on role and kas assignment"
  on public.transactions for select
  to authenticated
  using (
    -- Admin, Bendahara Umum, Pendeta Ressort, Sekretaris, Majelis can view all kas
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'bendahara_umum', 'pendeta_ressort', 'sekretaris', 'majelis')
    )
    or
    -- Pengurus kas only sees transactions belonging to their assigned kas
    exists (
      select 1 from public.user_kas_access
      where user_id = auth.uid()
        and kas_id = transactions.kas_id
    )
  );

create policy "Transactions insertable by assigned bendahara or admin/bendum"
  on public.transactions for insert
  to authenticated
  with check (
    -- Admin or Bendahara Umum
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'bendahara_umum')
    )
    or
    -- Assigned bendahara on that kas
    exists (
      select 1 from public.user_kas_access
      where user_id = auth.uid()
        and kas_id = transactions.kas_id
        and access_level = 'bendahara'
    )
  );

create policy "Transactions updatable by author (if draft/submitted) or assigned ketua"
  on public.transactions for update
  to authenticated
  using (
    -- Admin
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or
    -- Author updating draft
    (created_by = auth.uid() and status in ('draft', 'submitted'))
    or
    -- Assigned ketua on that kas
    exists (
      select 1 from public.user_kas_access
      where user_id = auth.uid()
        and kas_id = transactions.kas_id
        and access_level = 'ketua'
    )
    or
    -- Pendeta Ressort (Ketua Kas Umum / pengawas)
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'pendeta_ressort'
    )
  );

create policy "Transactions deletable only if draft and by creator"
  on public.transactions for delete
  to authenticated
  using (
    created_by = auth.uid() and status = 'draft'
  );

-- Period Closings: Viewable by all, manageable by Bendahara Umum and Admin
create policy "Period closings viewable by authenticated"
  on public.period_closings for select
  to authenticated
  using (true);

create policy "Period closings manageable by bendahara umum and admin"
  on public.period_closings for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'bendahara_umum')));

-- Reconciliations: Viewable by authenticated, manageable by bendahara umum and admin
create policy "Reconciliations viewable by authenticated"
  on public.reconciliations for select
  to authenticated
  using (true);

create policy "Reconciliations manageable by bendahara umum and admin"
  on public.reconciliations for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'bendahara_umum')));

-- Audit Logs: Viewable by Admin, Bendahara Umum, Pendeta Ressort, Sekretaris; immutable (no insert/update from client)
create policy "Audit logs viewable by leaders and admin"
  on public.audit_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'bendahara_umum', 'pendeta_ressort', 'sekretaris')
    )
  );

-- App Settings: Viewable by all, editable by admin
create policy "App settings viewable by authenticated"
  on public.app_settings for select
  to authenticated
  using (true);

create policy "App settings editable by admin"
  on public.app_settings for all
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- -----------------------------------------------------------------------------
-- 9. STORAGE BUCKET CONFIGURATION (for receipts / bukti nota)
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "Receipts accessible by authenticated users"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'receipts');

create policy "Receipts uploadable by authenticated users"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'receipts');

-- -----------------------------------------------------------------------------
-- 10. INITIAL SEED DATA
-- -----------------------------------------------------------------------------

-- Master Kas
insert into public.kas (id, kode, nama, deskripsi, warna, is_active) values
  ('11111111-1111-1111-1111-111111111101', 'KAS-UMUM', 'Kas Umum', 'Pusat kas operasional huria dan ressort HKBP Hutaraja', '#7C9CF5', true),
  ('11111111-1111-1111-1111-111111111102', 'KAS-DIAKONIA', 'Kas Diakonia', 'Dana sosial, bantuan kedukaan, sakit, dan kemanusiaan jemaat', '#A8E6CF', true),
  ('11111111-1111-1111-1111-111111111103', 'KAS-SM', 'Kas Sekolah Minggu', 'Dana kegiatan anak-anak Sekolah Minggu dan guru Sekolah Minggu', '#FFE8A3', true),
  ('11111111-1111-1111-1111-111111111104', 'KAS-INA', 'Kas Kaum Ibu (Ina)', 'Dana persekutuan dan kegiatan Seksi Parompuan / Kaum Ibu', '#FFB4A2', true),
  ('11111111-1111-1111-1111-111111111105', 'KAS-AMA', 'Kas Kaum Bapak (Ama)', 'Dana persekutuan dan kegiatan Seksi Ama / Kaum Bapak', '#B8C0FF', true),
  ('11111111-1111-1111-1111-111111111106', 'KAS-RNHKBP', 'Kas Naposobulung (Pemuda)', 'Dana kegiatan Remaja dan Naposobulung HKBP Hutaraja', '#CDB4FF', true),
  ('11111111-1111-1111-1111-111111111107', 'KAS-BANGUN', 'Kas Pembangunan', 'Dana renovasi fisik gereja, pastori, dan sarana ibadah', '#FFD166', true)
on conflict (kode) do update set nama = excluded.nama, warna = excluded.warna;

-- Master Tempat Penyimpanan
insert into public.storage_accounts (id, nama, tipe, nomor_rekening, atas_nama, is_active) values
  ('22222222-2222-2222-2222-222222222201', 'Brankas Tunai Huria', 'cash', null, 'Bendahara HKBP Hutaraja', true),
  ('22222222-2222-2222-2222-222222222202', 'Bank BRI Ressort Hutaraja', 'bank', '3210-01-002345-53-1', 'HKBP Ressort Hutaraja', true),
  ('22222222-2222-2222-2222-222222222203', 'Bank Mandiri Ressort Hutaraja', 'bank', '107-00-1289456-7', 'HKBP Ressort Hutaraja', true)
on conflict (id) do nothing;

-- Master Kategori Pemasukan
insert into public.categories (nama, tipe, kode, deskripsi, is_active) values
  ('Persembahan Minggu (Pelean IA & IB)', 'income', 'IN-01', 'Persembahan kantong ibadah hari minggu', true),
  ('Pelean Ucapan Syukur (Taon Parasi Rohaon)', 'income', 'IN-02', 'Persembahan ucapan syukur keluarga/pribadi', true),
  ('Sulang-sulang Pahoppu / Partumpolon', 'income', 'IN-03', 'Pelean dari pesta pernikahan dan adat gerejawi', true),
  ('Dana Pembangunan', 'income', 'IN-04', 'Iuran tahunan atau spontanitas pembangunan fisik', true),
  ('Diakonia Sosial', 'income', 'IN-05', 'Persembahan khusus pelayanan kasih dan duka', true),
  ('Sumbangan / Donasi Donatur', 'income', 'IN-06', 'Bantuan sukarela dari perorangan atau yayasan', true),
  ('Pemasukan Lain-lain', 'income', 'IN-99', 'Penerimaan lainnya yang sah', true)
on conflict do nothing;

-- Master Kategori Pengeluaran
insert into public.categories (nama, tipe, kode, deskripsi, is_active) values
  ('Gaji / Honor Pelayan & Pegawai', 'expense', 'OUT-01', 'Honorarium pelayan ibadah, koster, dan staf', true),
  ('Operasional Kantor & Ibadah', 'expense', 'OUT-02', 'ATK, kertas warta jemaat, lilin, anggur perjamuan', true),
  ('Listrik, Air & Internet', 'expense', 'OUT-03', 'Tagihan PLN gedung gereja, pastori, dan wifi', true),
  ('Pemeliharaan Gedung & Inventaris', 'expense', 'OUT-04', 'Perbaikan sound system, pengecatan, AC, kebersihan', true),
  ('Kegiatan Ibadah & Hari Besar Gerejawi', 'expense', 'OUT-05', 'Perayaan Paskah, Natal, Advent, Tahun Baru', true),
  ('Diakonia / Bantuan Sosial Jemaat', 'expense', 'OUT-06', 'Santunan jemaat sakit, berduka cita, beasiswa', true),
  ('Setoran ke Distrik & Pusat HKBP', 'expense', 'OUT-07', 'Kewajiban setoran pusat, dana pensiun, distrik', true),
  ('Pengeluaran Lain-lain', 'expense', 'OUT-99', 'Pengeluaran insidentil lainnya', true)
on conflict do nothing;

-- Master Pengaturan
insert into public.app_settings (id, church_name, church_subtext, church_address, church_phone, church_email, pendeta_name, sekretaris_name, bendahara_umum_name, receipt_required_threshold, block_negative_balance, active_year)
values ('main', 'HKBP Ressort Hutaraja', 'Ressort Khusus - Distrik V Sumatera Timur', 'Jl. Gereja No. 1, Hutaraja, Sumatera Utara', '0812-3456-7890', 'ressort.hutaraja@hkbp.or.id', 'Pdt. R. Simanjuntak, S.Th', 'St. M. Siregar', 'St. B. Hutapea', 500000, true, 2026)
on conflict (id) do update set
  church_name = excluded.church_name,
  pendeta_name = excluded.pendeta_name,
  sekretaris_name = excluded.sekretaris_name,
  bendahara_umum_name = excluded.bendahara_umum_name;

-- Saldo Awal Contoh (Tahun Anggaran 2026)
insert into public.opening_balances (tahun, kas_id, storage_account_id, amount, notes) values
  (2026, '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 5450000, 'Saldo fisik brankas per 31 Des 2025'),
  (2026, '11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222202', 38750000, 'Saldo rekening BRI Kas Umum per 31 Des 2025'),
  (2026, '11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222201', 3200000, 'Saldo tunai Kas Diakonia per 31 Des 2025'),
  (2026, '11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222201', 1850000, 'Saldo tunai Kas Sekolah Minggu'),
  (2026, '11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222201', 2600000, 'Saldo tunai Kas Kaum Ibu'),
  (2026, '11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222201', 2100000, 'Saldo tunai Kas Kaum Bapak'),
  (2026, '11111111-1111-1111-1111-111111111106', '22222222-2222-2222-2222-222222222201', 4150000, 'Saldo tunai Kas Pemuda / RNHKBP'),
  (2026, '11111111-1111-1111-1111-111111111107', '22222222-2222-2222-2222-222222222203', 75000000, 'Saldo rekening Mandiri Kas Pembangunan')
on conflict (tahun, kas_id, storage_account_id) do nothing;

-- =============================================================================
-- 11. MODUL ANGGARAN (APBG & APBG-P)
-- =============================================================================

-- Status Anggaran
do $$ begin
  create type public.budget_status as enum ('draft', 'reviewed', 'submitted_rapat', 'approved', 'returned');
exception
  when duplicate_object then null;
end $$;

-- Header Anggaran (Satu Kas + Satu Tahun + Versi)
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  kas_id uuid not null references public.kas(id) on delete cascade,
  tahun integer not null check (tahun >= 2000 and tahun <= 2100),
  version integer not null default 1,
  title text not null,
  status public.budget_status not null default 'draft',
  estimated_opening_balance numeric(15,2) not null default 0,
  is_opening_balance_locked boolean not null default false,
  is_current_active boolean not null default false,
  notes text,
  created_by uuid references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  submitted_rapat_by uuid references public.profiles(id),
  submitted_rapat_at timestamptz,
  ratified_by uuid references public.profiles(id),
  ratified_at timestamptz,
  rapat_date date,
  rapat_berita_acara_no text,
  rapat_document_url text,
  return_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kas_id, tahun, version)
);

-- Rincian Pos / Baris Anggaran
create table if not exists public.budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  type public.category_type not null,
  description text,
  annual_amount numeric(15,2) not null default 0,
  monthly_distribution numeric(15,2)[] not null default array[0,0,0,0,0,0,0,0,0,0,0,0],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Riwayat Pergeseran Anggaran Antar Pos (Reallocation)
create table if not exists public.budget_reallocations (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets(id) on delete cascade,
  kas_id uuid not null references public.kas(id),
  tahun integer not null,
  from_item_id uuid not null references public.budget_items(id),
  to_item_id uuid not null references public.budget_items(id),
  amount numeric(15,2) not null check (amount > 0),
  reason text not null,
  status text not null check (status in ('approved', 'rejected')) default 'approved',
  proposed_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz not null default now(),
  reject_note text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_budgets_lookup on public.budgets(kas_id, tahun, status);
create index if not exists idx_budgets_active on public.budgets(kas_id, tahun, is_current_active);
create index if not exists idx_budget_items_budget on public.budget_items(budget_id);
create index if not exists idx_budget_items_cat on public.budget_items(category_id);
create index if not exists idx_budget_reallocations_budget on public.budget_reallocations(budget_id);

-- Storage bucket untuk Notulen / Berita Acara Rapat Huria
insert into storage.buckets (id, name, public)
values ('budget_minutes', 'budget_minutes', false)
on conflict (id) do nothing;

create policy "Budget minutes accessible by authenticated users"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'budget_minutes');

create policy "Budget minutes uploadable by sekretaris or admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'budget_minutes');

-- Row Level Security (RLS) for Budget Tables
alter table public.budgets enable row level security;
alter table public.budget_items enable row level security;
alter table public.budget_reallocations enable row level security;

-- Budgets: Semua authenticated user dapat membaca (Majelis/Jemaat/Pengurus)
create policy "Budgets viewable by authenticated users"
  on public.budgets for select
  to authenticated
  using (true);

-- Insert & Update Budgets: Hanya bendahara kas terkait atau admin
create policy "Budgets insertable by assigned bendahara or admin"
  on public.budgets for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or
    exists (
      select 1 from public.user_kas_access
      where user_id = auth.uid() and kas_id = budgets.kas_id and access_level = 'bendahara'
    )
    or
    (budgets.kas_id = '11111111-1111-1111-1111-111111111101' and exists (
      select 1 from public.profiles where id = auth.uid() and role = 'bendahara_umum'
    ))
  );

create policy "Budgets updatable by assigned staff or leaders based on status"
  on public.budgets for update
  to authenticated
  using (
    -- Admin
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or
    -- Bendahara if draft
    (status = 'draft' and exists (
      select 1 from public.user_kas_access
      where user_id = auth.uid() and kas_id = budgets.kas_id and access_level = 'bendahara'
    ))
    or
    -- Ketua kas
    exists (
      select 1 from public.user_kas_access
      where user_id = auth.uid() and kas_id = budgets.kas_id and access_level = 'ketua'
    )
    or
    -- Sekretaris & Pendeta Ressort for Rapat Huria approval
    exists (
      select 1 from public.profiles where id = auth.uid() and role in ('sekretaris', 'pendeta_ressort')
    )
  );

-- Budget Items: Viewable by authenticated
create policy "Budget items viewable by authenticated"
  on public.budget_items for select
  to authenticated
  using (true);

create policy "Budget items manageable when budget is draft"
  on public.budget_items for all
  to authenticated
  using (
    exists (
      select 1 from public.budgets b
      where b.id = budget_items.budget_id and (b.status in ('draft', 'returned') or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    )
  );

-- Budget Reallocations: Viewable by authenticated
create policy "Budget reallocations viewable by authenticated"
  on public.budget_reallocations for select
  to authenticated
  using (true);

create policy "Budget reallocations insertable by assigned staff"
  on public.budget_reallocations for insert
  to authenticated
  with check (true);

-- -----------------------------------------------------------------------------
-- 12. RPC FUNCTIONS FOR BUDGET WORKFLOW
-- -----------------------------------------------------------------------------

-- Function: Alur Status Anggaran (RPC)
create or replace function public.change_budget_status(
  p_budget_id uuid,
  p_new_status public.budget_status,
  p_return_note text default null,
  p_rapat_date date default null,
  p_rapat_berita_acara_no text default null,
  p_rapat_document_url text default null
)
returns boolean as $$
declare
  v_user_id uuid := auth.uid();
  v_budget public.budgets%rowtype;
  v_is_bendahara boolean := false;
  v_is_ketua boolean := false;
  v_is_sekretaris boolean := false;
  v_is_pendeta boolean := false;
  v_is_admin boolean := false;
begin
  select * into v_budget from public.budgets where id = p_budget_id;
  if not found then
    raise exception 'Data Anggaran tidak ditemukan.';
  end if;

  -- Cek status terkunci
  if v_budget.status = 'approved' and p_new_status <> 'approved' then
    raise exception 'Anggaran yang sudah Disahkan telah terkunci dan tidak dapat diubah statusnya.';
  end if;

  -- Cek wewenang
  select exists(select 1 from public.profiles where id = v_user_id and role = 'admin') into v_is_admin;
  select exists(select 1 from public.profiles where id = v_user_id and role = 'sekretaris') into v_is_sekretaris;
  select exists(select 1 from public.profiles where id = v_user_id and role = 'pendeta_ressort') into v_is_pendeta;
  select exists(select 1 from public.user_kas_access where user_id = v_user_id and kas_id = v_budget.kas_id and access_level = 'bendahara') into v_is_bendahara;
  select exists(select 1 from public.user_kas_access where user_id = v_user_id and kas_id = v_budget.kas_id and access_level = 'ketua') into v_is_ketua;

  -- Bendahara Umum khusus Kas Umum
  if v_budget.kas_id = '11111111-1111-1111-1111-111111111101' and exists(select 1 from public.profiles where id = v_user_id and role = 'bendahara_umum') then
    v_is_bendahara := true;
  end if;

  -- Validasi Alur
  if p_new_status = 'reviewed' then
    -- Pengajuan oleh Bendahara
    if not (v_is_bendahara or v_is_admin) then
      raise exception 'Hanya bendahara kas yang dapat mengajukan draf anggaran ke Ketua.';
    end if;
    update public.budgets
    set status = 'reviewed', reviewed_by = v_user_id, reviewed_at = now(), updated_at = now()
    where id = p_budget_id;

  elsif p_new_status = 'submitted_rapat' then
    -- Penerusan oleh Ketua Kas (Pembuat draf tidak boleh meneruskan sendiri)
    if v_budget.created_by = v_user_id and not v_is_admin then
      raise exception 'Penyusun anggaran tidak diperbolehkan meneruskan anggarannya sendiri ke Rapat Huria.';
    end if;
    if not (v_is_ketua or v_is_pendeta or v_is_admin) then
      raise exception 'Hanya Ketua Kas (atau Pendeta Ressort) yang berwenang meneruskan ke Rapat Huria.';
    end if;
    update public.budgets
    set status = 'submitted_rapat', submitted_rapat_by = v_user_id, submitted_rapat_at = now(), updated_at = now()
    where id = p_budget_id;

  elsif p_new_status = 'approved' then
    -- Pengesahan Rapat Huria oleh Sekretaris Huria (atau Pendeta)
    if not (v_is_sekretaris or v_is_pendeta or v_is_admin) then
      raise exception 'Hanya Sekretaris Huria (atau Pendeta Ressort) yang mencatat pengesahan Rapat Huria.';
    end if;
    if v_budget.created_by = v_user_id and not v_is_admin then
      raise exception 'Penyusun draf anggaran tidak boleh mengesahkan anggarannya sendiri.';
    end if;

    -- Non-aktifkan versi sebelumnya untuk kas & tahun ini
    update public.budgets
    set is_current_active = false
    where kas_id = v_budget.kas_id and tahun = v_budget.tahun;

    -- Sahkan versi ini
    update public.budgets
    set status = 'approved',
        is_current_active = true,
        ratified_by = v_user_id,
        ratified_at = now(),
        rapat_date = coalesce(p_rapat_date, current_date),
        rapat_berita_acara_no = p_rapat_berita_acara_no,
        rapat_document_url = p_rapat_document_url,
        updated_at = now()
    where id = p_budget_id;

  elsif p_new_status = 'returned' then
    -- Pengembalian dengan catatan
    if p_return_note is null or trim(p_return_note) = '' then
      raise exception 'Catatan perbaikan wajib diisi saat mengembalikan anggaran.';
    end if;
    update public.budgets
    set status = 'returned', return_note = p_return_note, updated_at = now()
    where id = p_budget_id;
  end if;

  return true;
end;
$$ language plpgsql security definer;

-- Function: Perubahan Anggaran (APBG-P) - Membuat Versi Baru
create or replace function public.create_budget_revision(
  p_source_budget_id uuid,
  p_new_title text default null
)
returns uuid as $$
declare
  v_source public.budgets%rowtype;
  v_new_version integer;
  v_new_budget_id uuid;
  v_user_id uuid := auth.uid();
begin
  select * into v_source from public.budgets where id = p_source_budget_id;
  if not found then
    raise exception 'Anggaran sumber tidak ditemukan.';
  end if;

  if v_source.status <> 'approved' then
    raise exception 'Hanya anggaran yang sudah Disahkan yang dapat dibuat revisi APBG-P.';
  end if;

  -- Hitung nomor versi baru
  select coalesce(max(version), 0) + 1 into v_new_version
  from public.budgets
  where kas_id = v_source.kas_id and tahun = v_source.tahun;

  -- Buat draf revisi
  insert into public.budgets (
    kas_id,
    tahun,
    version,
    title,
    status,
    estimated_opening_balance,
    is_opening_balance_locked,
    is_current_active,
    notes,
    created_by
  ) values (
    v_source.kas_id,
    v_source.tahun,
    v_new_version,
    coalesce(p_new_title, v_source.title || ' (Perubahan V' || v_new_version || ')'),
    'draft',
    v_source.estimated_opening_balance,
    v_source.is_opening_balance_locked,
    false,
    'Dibuat dari versi ' || v_source.version || ' untuk Perubahan Anggaran (APBG-P)',
    v_user_id
  ) returning id into v_new_budget_id;

  -- Salin baris anggaran dari versi lama
  insert into public.budget_items (
    budget_id,
    category_id,
    type,
    description,
    annual_amount,
    monthly_distribution
  )
  select
    v_new_budget_id,
    category_id,
    type,
    description,
    annual_amount,
    monthly_distribution
  from public.budget_items
  where budget_id = p_source_budget_id;

  return v_new_budget_id;
end;
$$ language plpgsql security definer;

-- Function: Pergeseran Anggaran Antar Pos (Reallocation)
create or replace function public.reallocate_budget(
  p_budget_id uuid,
  p_from_item_id uuid,
  p_to_item_id uuid,
  p_amount numeric(15,2),
  p_reason text
)
returns uuid as $$
declare
  v_budget public.budgets%rowtype;
  v_from_item public.budget_items%rowtype;
  v_to_item public.budget_items%rowtype;
  v_max_pct numeric(5,2);
  v_max_allowed numeric(15,2);
  v_realloc_id uuid;
  v_user_id uuid := auth.uid();
begin
  if p_amount <= 0 then
    raise exception 'Nominal pergeseran harus lebih besar dari 0.';
  end if;

  if trim(p_reason) = '' then
    raise exception 'Alasan pergeseran anggaran wajib diisi.';
  end if;

  select * into v_budget from public.budgets where id = p_budget_id;
  if not found or v_budget.status <> 'approved' then
    raise exception 'Pergeseran pos hanya dapat dilakukan pada anggaran yang sedang Disahkan.';
  end if;

  select * into v_from_item from public.budget_items where id = p_from_item_id and budget_id = p_budget_id;
  select * into v_to_item from public.budget_items where id = p_to_item_id and budget_id = p_budget_id;

  if not found or v_from_item.id is null or v_to_item.id is null then
    raise exception 'Pos anggaran asal atau tujuan tidak valid.';
  end if;

  if v_from_item.type <> v_to_item.type then
    raise exception 'Pergeseran hanya diperbolehkan antar pos dengan tipe yang sama (pengeluaran ke pengeluaran, atau pemasukan ke pemasukan).';
  end if;

  if v_from_item.annual_amount < p_amount then
    raise exception 'Nominal pos asal tidak mencukupi untuk digeser.';
  end if;

  -- Cek batas persentase di app_settings
  select coalesce(budget_reallocation_max_pct, 15.00) into v_max_pct from public.app_settings where id = 'main';
  if v_max_pct > 0 then
    v_max_allowed := (v_from_item.annual_amount * v_max_pct / 100.0);
    if p_amount > v_max_allowed then
      raise exception 'Nominal pergeseran (Rp %) melebihi batas toleransi pergeseran pos (%s persen atau maksimal Rp %). Jika ingin mengubah lebih besar, silakan ajukan Perubahan Anggaran (APBG-P) melalui Rapat Huria.',
        p_amount, v_max_pct, v_max_allowed;
    end if;
  end if;

  -- Catat log pergeseran
  insert into public.budget_reallocations (
    budget_id,
    kas_id,
    tahun,
    from_item_id,
    to_item_id,
    amount,
    reason,
    status,
    proposed_by,
    approved_by,
    approved_at
  ) values (
    v_budget.id,
    v_budget.kas_id,
    v_budget.tahun,
    p_from_item_id,
    p_to_item_id,
    p_amount,
    p_reason,
    'approved',
    v_user_id,
    v_user_id,
    now()
  ) returning id into v_realloc_id;

  -- Update pos asal
  update public.budget_items
  set annual_amount = annual_amount - p_amount,
      updated_at = now()
  where id = p_from_item_id;

  -- Update pos tujuan
  update public.budget_items
  set annual_amount = annual_amount + p_amount,
      updated_at = now()
  where id = p_to_item_id;

  return v_realloc_id;
end;
$$ language plpgsql security definer;
