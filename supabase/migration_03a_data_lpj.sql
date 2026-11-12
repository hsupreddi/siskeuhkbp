-- =============================================================================
-- SIKU HKBP Hutaraja - Migration 03a: Data Pendukung Laporan Pertanggungjawaban (LPJ)
-- Basis Kas yang Dimodifikasi (Modified Cash Basis) - Mengacu ISAK 35
-- =============================================================================
-- Migrasi ini aman dijalankan di atas schema.sql dan migration_04_saldo_awal.sql.
-- Menyiapkan data: Klasifikasi Dana, Aset Tetap & Inventaris, Panjar Kegiatan,
-- Piutang & Utang, Catatan atas Laporan Keuangan (CaLK), dan Pengaturan LPJ.

-- -----------------------------------------------------------------------------
-- 1. KLASIFIKASI DANA PADA MASTER KAS (FUND TYPE)
-- -----------------------------------------------------------------------------
-- Klasifikasi dana menurut ISAK 35: Dana Tidak Terikat (Unrestricted) dan Dana Terikat (Restricted)
alter table public.kas
  add column if not exists fund_type text not null default 'unrestricted'
    check (fund_type in ('unrestricted', 'restricted')),
  add column if not exists restricted_purpose text;

-- Update kas default HKBP Hutaraja
update public.kas
set fund_type = 'restricted',
    restricted_purpose = 'Pelayanan kasih, bantuan sosial diakonia, janda/yatim, dan kedukaan jemaat'
where kode = 'KAS-DIAKONIA' and (fund_type = 'unrestricted' or restricted_purpose is null);

update public.kas
set fund_type = 'restricted',
    restricted_purpose = 'Pembangunan fisik gereja, menara lonceng, dan renovasi pastori ressort'
where kode = 'KAS-BANGUN' and (fund_type = 'unrestricted' or restricted_purpose is null);

-- -----------------------------------------------------------------------------
-- 2. TABEL INVENTARIS / ASET TETAP (FIXED ASSETS)
-- -----------------------------------------------------------------------------
create table if not exists public.fixed_assets (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,
  nama text not null,
  kategori text not null check (kategori in ('tanah', 'bangunan', 'kendaraan', 'alat_musik', 'elektronik', 'perabot', 'lainnya')),
  tanggal_perolehan date not null default current_date,
  nilai_perolehan numeric(15,2) not null check (nilai_perolehan >= 0),
  kondisi text not null default 'baik' check (kondisi in ('baik', 'rusak_ringan', 'rusak_berat')),
  lokasi text not null,
  kas_id uuid not null references public.kas(id) on delete restrict,
  status text not null default 'aktif' check (status in ('aktif', 'diajukan_penghapusan', 'diajukan_hibah', 'dihapus', 'dihibahkan')),
  foto_url text,
  dokumen_url text,
  notes text,
  transaction_id uuid references public.transactions(id) on delete set null,
  useful_life_years integer not null default 5 check (useful_life_years >= 0),
  salvage_value numeric(15,2) not null default 0 check (salvage_value >= 0),
  disposal_reason text,
  disposal_date date,
  disposal_proposed_by uuid references public.profiles(id),
  disposal_approved_by uuid references public.profiles(id),
  disposal_approved_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 3. TABEL PENYUSUTAN ASET (ASSET DEPRECIATIONS)
-- -----------------------------------------------------------------------------
create table if not exists public.asset_depreciations (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.fixed_assets(id) on delete cascade,
  tahun integer not null check (tahun >= 2000 and tahun <= 2100),
  depreciation_amount numeric(15,2) not null check (depreciation_amount >= 0),
  accumulated_depreciation numeric(15,2) not null check (accumulated_depreciation >= 0),
  book_value numeric(15,2) not null check (book_value >= 0),
  method text not null default 'straight_line',
  calculated_at timestamptz not null default now(),
  unique (asset_id, tahun)
);

-- -----------------------------------------------------------------------------
-- 4. TABEL PANJAR / UANG MUKA KEGIATAN (ADVANCES)
-- -----------------------------------------------------------------------------
create table if not exists public.advances (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,
  kas_id uuid not null references public.kas(id) on delete restrict,
  storage_account_id uuid references public.storage_accounts(id) on delete set null,
  recipient_name text not null,
  recipient_phone text,
  amount numeric(15,2) not null check (amount > 0),
  advance_date date not null default current_date,
  due_date date not null,
  purpose text not null,
  status text not null default 'active' check (status in ('active', 'settled', 'overdue')),
  transaction_id uuid references public.transactions(id) on delete set null,
  settled_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 5. TABEL PERTANGGUNGJAWABAN PANJAR (ADVANCE SETTLEMENTS)
-- -----------------------------------------------------------------------------
create table if not exists public.advance_settlements (
  id uuid primary key default gen_random_uuid(),
  advance_id uuid not null references public.advances(id) on delete cascade,
  settlement_date date not null default current_date,
  spent_amount numeric(15,2) not null check (spent_amount >= 0),
  remaining_returned numeric(15,2) not null check (remaining_returned >= 0) default 0,
  deficit_reimbursed numeric(15,2) not null check (deficit_reimbursed >= 0) default 0,
  notes text not null,
  receipt_url text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'rejected')),
  submitted_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  reject_note text,
  return_transaction_id uuid references public.transactions(id) on delete set null,
  reimburse_transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 6. TABEL PIUTANG DAN UTANG (RECEIVABLES & PAYABLES)
-- -----------------------------------------------------------------------------
create table if not exists public.receivables_payables (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('receivable', 'payable')),
  kode text unique not null,
  kas_id uuid not null references public.kas(id) on delete restrict,
  counterparty_name text not null,
  counterparty_contact text,
  amount numeric(15,2) not null check (amount > 0),
  remaining_amount numeric(15,2) not null check (remaining_amount >= 0),
  issue_date date not null default current_date,
  due_date date,
  status text not null default 'active' check (status in ('active', 'partially_paid', 'paid', 'written_off')),
  description text not null,
  document_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 7. TABEL PEMBAYARAN / PELUNASAN PIUTANG & UTANG (RECEIVABLE PAYABLE PAYMENTS)
-- -----------------------------------------------------------------------------
create table if not exists public.receivable_payable_payments (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.receivables_payables(id) on delete cascade,
  payment_date date not null default current_date,
  payment_amount numeric(15,2) not null check (payment_amount > 0),
  storage_account_id uuid references public.storage_accounts(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 8. TABEL CATATAN ATAS LAPORAN KEUANGAN (CALK - ISAK 35)
-- -----------------------------------------------------------------------------
create table if not exists public.lpj_notes (
  id uuid primary key default gen_random_uuid(),
  year integer not null unique check (year >= 2000 and year <= 2100),
  accounting_basis text not null default 'Laporan Keuangan disajikan dengan Basis Kas yang Dimodifikasi (Modified Cash Basis) mengacu pada ISAK 35 untuk Entitas Berorientasi Nonlaba, di mana transaksi penerimaan dan pengeluaran dicatat saat kas diterima atau dikeluarkan, dilengkapi pengungkapan aset tetap, panjar kegiatan, serta saldo piutang dan utang.',
  accounting_policies text not null default 'Kebijakan Akuntansi: 1) Kas dikelola terpisah per seksi kategorial dan Kas Umum. 2) Dana diklasifikasikan sebagai Dana Tidak Terikat dan Dana Terikat. 3) Aset tetap dicatat berdasarkan harga perolehan historis. 4) Panjar kegiatan diakui sebagai piutang sementara sampai pertanggungjawaban disetujui.',
  significant_items_notes text,
  budget_variance_notes text,
  significant_events text,
  restricted_funds_notes text,
  post_reporting_events text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 9. TABEL PENGATURAN LPJ (LPJ SETTINGS)
-- -----------------------------------------------------------------------------
create table if not exists public.lpj_settings (
  id text primary key default 'main',
  enable_depreciation boolean not null default false,
  depreciation_method text not null default 'straight_line' check (depreciation_method in ('straight_line', 'none')),
  budget_variance_threshold_percent numeric(5,2) not null default 10.00 check (budget_variance_threshold_percent >= 0),
  default_advance_days integer not null default 14 check (default_advance_days > 0),
  document_number_format text not null default 'HKBP-HTR/LPJ/{TAHUN}/{NOMOR}',
  signatories jsonb not null default '[
    {"role": "Bendahara Seksi", "title": "Bendahara Seksi Pengelola", "name": "Bendahara Seksi Terkait"},
    {"role": "Ketua Seksi", "title": "Ketua Seksi Pengelola", "name": "Ketua Seksi Terkait"},
    {"role": "Bendahara Umum", "title": "Bendahara Huria / Ressort", "name": "St. B. Hutapea"},
    {"role": "Pendeta Ressort", "title": "Pendeta HKBP Ressort Hutaraja", "name": "Pdt. R. Simanjuntak, S.Th"}
  ]'::jsonb,
  useful_life_defaults jsonb not null default '{
    "tanah": 0,
    "bangunan": 20,
    "kendaraan": 5,
    "alat_musik": 5,
    "elektronik": 4,
    "perabot": 5,
    "lainnya": 4
  }'::jsonb,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 10. INDEXES
-- -----------------------------------------------------------------------------
create index if not exists idx_fixed_assets_kas on public.fixed_assets(kas_id, status);
create index if not exists idx_fixed_assets_kategori on public.fixed_assets(kategori);
create index if not exists idx_advances_kas on public.advances(kas_id, status);
create index if not exists idx_advances_due on public.advances(due_date);
create index if not exists idx_advance_settlements_advance on public.advance_settlements(advance_id, status);
create index if not exists idx_receivables_payables_kas on public.receivables_payables(kas_id, type, status);
create index if not exists idx_lpj_notes_year on public.lpj_notes(year);

-- -----------------------------------------------------------------------------
-- 11. STORAGE BUCKET: asset-docs (Private)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('asset-docs', 'asset-docs', false)
on conflict (id) do nothing;

create policy "Asset docs bucket read access"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'asset-docs');

create policy "Asset docs bucket insert access"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'asset-docs');

create policy "Asset docs bucket update access"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'asset-docs');

-- -----------------------------------------------------------------------------
-- 12. TRIGGERS: ANTI SELF-APPROVAL & AUDIT
-- -----------------------------------------------------------------------------

-- Trigger larangan menyetujui penghapusan/hibah aset sendiri
create or replace function public.fn_check_asset_disposal_anti_self_approval()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status in ('dihapus', 'dihibahkan') and new.disposal_approved_by is not null then
    if new.disposal_proposed_by is not null and new.disposal_proposed_by = new.disposal_approved_by then
      raise exception 'Penyusun usulan penghapusan/hibah aset tidak diperbolehkan menyetujui pengajuannya sendiri.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_asset_disposal_anti_self_approval on public.fixed_assets;
create trigger trg_asset_disposal_anti_self_approval
  before update on public.fixed_assets
  for each row
  execute function public.fn_check_asset_disposal_anti_self_approval();

-- Trigger larangan menyetujui settlement panjar sendiri
create or replace function public.fn_check_advance_settlement_anti_self_approval()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'approved' and new.approved_by is not null then
    if new.submitted_by is not null and new.submitted_by = new.approved_by then
      raise exception 'Penyusun pertanggungjawaban panjar tidak diperbolehkan menyetujui laporannya sendiri.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_advance_settlement_anti_self_approval on public.advance_settlements;
create trigger trg_advance_settlement_anti_self_approval
  before update on public.advance_settlements
  for each row
  execute function public.fn_check_advance_settlement_anti_self_approval();

-- -----------------------------------------------------------------------------
-- 13. RPC FUNCTIONS FOR WORKFLOWS
-- -----------------------------------------------------------------------------

-- RPC: Ajukan Penghapusan / Hibah Aset
create or replace function public.ajukan_penghapusan_aset(
  p_asset_id uuid,
  p_action_type text, -- 'diajukan_penghapusan' | 'diajukan_hibah'
  p_reason text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_asset public.fixed_assets%rowtype;
  v_can_input boolean;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Pengguna belum terautentikasi');
  end if;

  select * into v_asset from public.fixed_assets where id = p_asset_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Aset tidak ditemukan');
  end if;

  if v_asset.status != 'aktif' then
    return jsonb_build_object('success', false, 'error', 'Hanya aset berstatus aktif yang dapat diajukan penghapusan atau hibah');
  end if;

  if coalesce(trim(p_reason), '') = '' then
    return jsonb_build_object('success', false, 'error', 'Alasan penghapusan atau hibah wajib diisi');
  end if;

  -- Periksa hak input kas
  select exists (
    select 1 from public.user_kas_access
    where user_id = v_user_id and kas_id = v_asset.kas_id and access_level = 'bendahara'
  ) into v_can_input;

  if not v_can_input then
    select exists (
      select 1 from public.profiles
      where id = v_user_id and role in ('admin', 'bendahara_umum')
    ) into v_can_input;
  end if;

  if not v_can_input then
    return jsonb_build_object('success', false, 'error', 'Anda tidak memiliki hak mengajukan penghapusan aset kas ini');
  end if;

  update public.fixed_assets
  set status = p_action_type,
      disposal_reason = p_reason,
      disposal_proposed_by = v_user_id,
      updated_at = now()
  where id = p_asset_id;

  return jsonb_build_object('success', true);
end;
$$;

-- RPC: Setujui Penghapusan / Hibah Aset
create or replace function public.setujui_penghapusan_aset(
  p_asset_id uuid,
  p_is_approved boolean,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_asset public.fixed_assets%rowtype;
  v_can_approve boolean;
  v_new_status text;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Pengguna belum terautentikasi');
  end if;

  select * into v_asset from public.fixed_assets where id = p_asset_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Aset tidak ditemukan');
  end if;

  if v_asset.status not in ('diajukan_penghapusan', 'diajukan_hibah') then
    return jsonb_build_object('success', false, 'error', 'Aset tidak sedang dalam proses pengajuan persetujuan');
  end if;

  if v_asset.disposal_proposed_by = v_user_id then
    return jsonb_build_object('success', false, 'error', 'Pengusul tidak diperbolehkan menyetujui pengajuannya sendiri');
  end if;

  -- Periksa hak persetujuan ketua kas atau pendeta
  select exists (
    select 1 from public.user_kas_access
    where user_id = v_user_id and kas_id = v_asset.kas_id and access_level = 'ketua'
  ) into v_can_approve;

  if not v_can_approve then
    select exists (
      select 1 from public.profiles
      where id = v_user_id and role in ('admin', 'pendeta_ressort')
    ) into v_can_approve;
  end if;

  if not v_can_approve then
    return jsonb_build_object('success', false, 'error', 'Anda tidak berwenang menyetujui aset pada kas ini');
  end if;

  if p_is_approved then
    v_new_status := case when v_asset.status = 'diajukan_penghapusan' then 'dihapus' else 'dihibahkan' end;
    update public.fixed_assets
    set status = v_new_status,
        disposal_date = current_date,
        disposal_approved_by = v_user_id,
        disposal_approved_at = now(),
        notes = coalesce(notes || E'\n', '') || 'Disetujui: ' || coalesce(p_notes, 'Sesuai persetujuan ketua kas'),
        updated_at = now()
    where id = p_asset_id;
  else
    update public.fixed_assets
    set status = 'aktif',
        disposal_reason = null,
        disposal_proposed_by = null,
        notes = coalesce(notes || E'\n', '') || 'Ditolak: ' || coalesce(p_notes, 'Pengajuan dibatalkan'),
        updated_at = now()
    where id = p_asset_id;
  end if;

  return jsonb_build_object('success', true);
end;
$$;

-- RPC: Ajukan Pertanggungjawaban Panjar
create or replace function public.ajukan_penyelesaian_panjar(
  p_settlement_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_st public.advance_settlements%rowtype;
  v_adv public.advances%rowtype;
  v_can_input boolean;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Pengguna belum terautentikasi');
  end if;

  select * into v_st from public.advance_settlements where id = p_settlement_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Data penyelesaian panjar tidak ditemukan');
  end if;

  select * into v_adv from public.advances where id = v_st.advance_id;

  select exists (
    select 1 from public.user_kas_access
    where user_id = v_user_id and kas_id = v_adv.kas_id and access_level = 'bendahara'
  ) into v_can_input;

  if not v_can_input then
    select exists (
      select 1 from public.profiles
      where id = v_user_id and role in ('admin', 'bendahara_umum')
    ) into v_can_input;
  end if;

  if not v_can_input then
    return jsonb_build_object('success', false, 'error', 'Anda tidak memiliki hak pada kas panjar ini');
  end if;

  update public.advance_settlements
  set status = 'submitted',
      submitted_by = v_user_id,
      updated_at = now()
  where id = p_settlement_id;

  return jsonb_build_object('success', true);
end;
$$;

-- RPC: Setujui Pertanggungjawaban Panjar
create or replace function public.setujui_penyelesaian_panjar(
  p_settlement_id uuid,
  p_is_approved boolean,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_st public.advance_settlements%rowtype;
  v_adv public.advances%rowtype;
  v_can_approve boolean;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Pengguna belum terautentikasi');
  end if;

  select * into v_st from public.advance_settlements where id = p_settlement_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Data penyelesaian tidak ditemukan');
  end if;

  select * into v_adv from public.advances where id = v_st.advance_id;

  if v_st.submitted_by = v_user_id then
    return jsonb_build_object('success', false, 'error', 'Penyusun SPJ tidak boleh menyetujui laporannya sendiri');
  end if;

  select exists (
    select 1 from public.user_kas_access
    where user_id = v_user_id and kas_id = v_adv.kas_id and access_level = 'ketua'
  ) into v_can_approve;

  if not v_can_approve then
    select exists (
      select 1 from public.profiles
      where id = v_user_id and role in ('admin', 'pendeta_ressort')
    ) into v_can_approve;
  end if;

  if not v_can_approve then
    return jsonb_build_object('success', false, 'error', 'Anda tidak berwenang menyetujui panjar kas ini');
  end if;

  if p_is_approved then
    update public.advance_settlements
    set status = 'approved',
        approved_by = v_user_id,
        approved_at = now(),
        updated_at = now()
    where id = p_settlement_id;

    -- Update status panjar menjadi settled (tuntas)
    update public.advances
    set status = 'settled',
        settled_at = now(),
        updated_at = now()
    where id = v_st.advance_id;
  else
    update public.advance_settlements
    set status = 'rejected',
        reject_note = p_notes,
        updated_at = now()
    where id = p_settlement_id;
  end if;

  return jsonb_build_object('success', true);
end;
$$;

-- RPC: Catat Pembayaran / Pelunasan Piutang / Utang
create or replace function public.catat_pembayaran_piutang_utang(
  p_id uuid,
  p_payment_amount numeric,
  p_payment_date date,
  p_storage_id uuid default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.receivables_payables%rowtype;
  v_new_remaining numeric;
  v_new_status text;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Pengguna belum terautentikasi');
  end if;

  select * into v_item from public.receivables_payables where id = p_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Data piutang/utang tidak ditemukan');
  end if;

  if p_payment_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'Nominal pembayaran harus lebih dari nol');
  end if;

  if p_payment_amount > v_item.remaining_amount then
    return jsonb_build_object('success', false, 'error', 'Nominal pembayaran melebihi sisa saldo berjalan');
  end if;

  v_new_remaining := v_item.remaining_amount - p_payment_amount;
  if v_new_remaining = 0 then
    v_new_status := 'paid';
  else
    v_new_status := 'partially_paid';
  end if;

  -- Masukkan riwayat pembayaran
  insert into public.receivable_payable_payments (
    parent_id,
    payment_date,
    payment_amount,
    storage_account_id,
    notes,
    created_by
  ) values (
    p_id,
    coalesce(p_payment_date, current_date),
    p_payment_amount,
    p_storage_id,
    p_notes,
    v_user_id
  );

  -- Perbarui saldo sisa
  update public.receivables_payables
  set remaining_amount = v_new_remaining,
      status = v_new_status,
      updated_at = now()
  where id = p_id;

  return jsonb_build_object(
    'success', true,
    'remaining_amount', v_new_remaining,
    'status', v_new_status
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
alter table public.fixed_assets enable row level security;
alter table public.asset_depreciations enable row level security;
alter table public.advances enable row level security;
alter table public.advance_settlements enable row level security;
alter table public.receivables_payables enable row level security;
alter table public.receivable_payable_payments enable row level security;
alter table public.lpj_notes enable row level security;
alter table public.lpj_settings enable row level security;

-- fixed_assets RLS
create policy "fixed_assets_read_all_authenticated"
  on public.fixed_assets for select
  to authenticated
  using (true);

create policy "fixed_assets_insert_policy"
  on public.fixed_assets for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_kas_access
      where user_id = auth.uid() and kas_id = fixed_assets.kas_id and access_level = 'bendahara'
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'bendahara_umum')
    )
  );

create policy "fixed_assets_update_policy"
  on public.fixed_assets for update
  to authenticated
  using (
    exists (
      select 1 from public.user_kas_access
      where user_id = auth.uid() and kas_id = fixed_assets.kas_id
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'bendahara_umum', 'pendeta_ressort')
    )
  );

-- advances RLS
create policy "advances_read_all_authenticated"
  on public.advances for select
  to authenticated
  using (true);

create policy "advances_insert_policy"
  on public.advances for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_kas_access
      where user_id = auth.uid() and kas_id = advances.kas_id and access_level = 'bendahara'
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'bendahara_umum')
    )
  );

create policy "advances_update_policy"
  on public.advances for update
  to authenticated
  using (
    exists (
      select 1 from public.user_kas_access
      where user_id = auth.uid() and kas_id = advances.kas_id
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'bendahara_umum', 'pendeta_ressort')
    )
  );

-- receivables_payables RLS
create policy "receivables_payables_read_all"
  on public.receivables_payables for select
  to authenticated
  using (true);

create policy "receivables_payables_insert_policy"
  on public.receivables_payables for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_kas_access
      where user_id = auth.uid() and kas_id = receivables_payables.kas_id and access_level = 'bendahara'
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'bendahara_umum')
    )
  );

create policy "receivables_payables_update_policy"
  on public.receivables_payables for update
  to authenticated
  using (
    exists (
      select 1 from public.user_kas_access
      where user_id = auth.uid() and kas_id = receivables_payables.kas_id
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'bendahara_umum')
    )
  );

-- lpj_notes RLS (Semua membaca, Bendahara Umum & Admin mengedit)
create policy "lpj_notes_read_all"
  on public.lpj_notes for select
  to authenticated
  using (true);

create policy "lpj_notes_write_policy"
  on public.lpj_notes for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'bendahara_umum')
    )
  );

-- lpj_settings RLS (Semua membaca, Admin & Bendahara Umum mengedit)
create policy "lpj_settings_read_all"
  on public.lpj_settings for select
  to authenticated
  using (true);

create policy "lpj_settings_write_policy"
  on public.lpj_settings for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'bendahara_umum')
    )
  );

-- -----------------------------------------------------------------------------
-- 15. MIGRASI DATA DARI opening_other_positions (JIKA ADA DATA SEMENTARA)
-- -----------------------------------------------------------------------------
-- Pindahkan aset awal
insert into public.fixed_assets (
  kode,
  nama,
  kategori,
  tanggal_perolehan,
  nilai_perolehan,
  kondisi,
  lokasi,
  kas_id,
  status,
  notes,
  useful_life_years
)
select
  'AST-AWAL-' || substr(oop.id::text, 1, 6),
  oop.name,
  case
    when lower(coalesce(oop.category, '')) like '%tanah%' then 'tanah'
    when lower(coalesce(oop.category, '')) like '%bangunan%' or lower(coalesce(oop.category, '')) like '%gedung%' then 'bangunan'
    when lower(coalesce(oop.category, '')) like '%kendaraan%' then 'kendaraan'
    when lower(coalesce(oop.category, '')) like '%musik%' then 'alat_musik'
    when lower(coalesce(oop.category, '')) like '%elektronik%' or lower(coalesce(oop.category, '')) like '%sound%' then 'elektronik'
    when lower(coalesce(oop.category, '')) like '%perabot%' or lower(coalesce(oop.category, '')) like '%kursi%' then 'perabot'
    else 'lainnya'
  end as kategori,
  to_date(coalesce(oop.acquisition_year::text, '2023') || '-01-01', 'YYYY-MM-DD'),
  oop.amount,
  coalesce(oop.condition, 'baik'),
  coalesce(oop.location, 'Kompleks Gereja HKBP Hutaraja'),
  oop.kas_id,
  'aktif',
  coalesce(oop.notes, 'Dipindahkan dari modul Saldo Awal'),
  case
    when lower(coalesce(oop.category, '')) like '%tanah%' then 0
    when lower(coalesce(oop.category, '')) like '%bangunan%' then 20
    when lower(coalesce(oop.category, '')) like '%kendaraan%' then 5
    when lower(coalesce(oop.category, '')) like '%musik%' then 5
    else 4
  end
from public.opening_other_positions oop
where oop.type = 'asset'
on conflict (kode) do nothing;

-- Pindahkan panjar awal
insert into public.advances (
  kode,
  kas_id,
  recipient_name,
  amount,
  advance_date,
  due_date,
  purpose,
  status
)
select
  'PJR-AWAL-' || substr(oop.id::text, 1, 6),
  oop.kas_id,
  coalesce(oop.section_manager, 'Pengurus Kegiatan'),
  oop.amount,
  '2026-01-01'::date,
  '2026-01-20'::date,
  oop.name,
  'active'
from public.opening_other_positions oop
where oop.type = 'advance'
on conflict (kode) do nothing;

-- Pindahkan piutang & utang awal
insert into public.receivables_payables (
  kode,
  type,
  kas_id,
  counterparty_name,
  amount,
  remaining_amount,
  issue_date,
  status,
  description
)
select
  case when oop.type = 'receivable' then 'PIU-AWAL-' else 'UTG-AWAL-' end || substr(oop.id::text, 1, 6),
  oop.type,
  oop.kas_id,
  coalesce(oop.section_manager, 'Pihak Ketiga'),
  oop.amount,
  oop.amount,
  '2026-01-01'::date,
  'active',
  oop.name
from public.opening_other_positions oop
where oop.type in ('receivable', 'payable')
on conflict (kode) do nothing;

-- Klasifikasi dana terikat jika ada di opening_other_positions
update public.kas
set fund_type = 'restricted',
    restricted_purpose = coalesce(restricted_purpose, 'Dana titipan terikat per saldo awal')
where id in (
  select distinct kas_id from public.opening_other_positions where type = 'restricted_fund'
);

-- -----------------------------------------------------------------------------
-- 16. DATA SEED CONTOH NYATA UNTUK HKBP HUTARAJA
-- -----------------------------------------------------------------------------
-- Inisialisasi Pengaturan LPJ
insert into public.lpj_settings (id, enable_depreciation, budget_variance_threshold_percent, default_advance_days)
values ('main', false, 10.00, 14)
on conflict (id) do nothing;

-- Inisialisasi CaLK 2026
insert into public.lpj_notes (
  year,
  accounting_basis,
  accounting_policies,
  significant_items_notes,
  budget_variance_notes,
  significant_events,
  restricted_funds_notes,
  post_reporting_events
)
values (
  2026,
  'Laporan Keuangan HKBP Ressort Hutaraja Tahun 2026 disusun dengan Basis Kas yang Dimodifikasi (Modified Cash Basis) berdasarkan pedoman ISAK 35. Transaksi operasional disajikan berdasarkan kas riil, dilengkapi pencatatan nilai historis aset tetap, panjar berjalan, dan posisi piutang/utang jemaat.',
  '1. Pengakuan Penerimaan: Pelean, persembahan perpuluhan, dan ucapan syukur diakui saat kas/bank diterima. 2. Pengakuan Pengeluaran: Beban pelayanan dan operasional diakui saat kas dikeluarkan. 3. Klasifikasi Kas Terpisah: Setiap seksi/sektor mengelola kas dan pembukuan mandiri dengan pengawasan Majelis Huria.',
  'Pos Pelean Minggu I-V dan Pelean Perjamuan Kudus disetorkan ke rekening BRI Huria. Saldo Kas Pembangunan dikhususkan untuk kelanjutan proyek renovasi fisik.',
  'Realisasi anggaran dievaluasi per triwulan dalam Rapat Majelis Huria. Varians di atas 10% wajib dilaporkan secara tertulis dalam LPJ tahunan.',
  'Tahun 2026 merupakan tahun tindak lanjut Pesta Jubileum dan dimulainya digitalisasi pelaporan keuangan transparan SIKU HKBP Hutaraja.',
  'Dana Terikat meliputi Kas Diakonia Sosial (santunan duka dan lansia) serta Kas Pembangunan (menara lonceng). Dana ini tidak dapat dialihkan untuk belanja operasional umum tanpa persetujuan Rapat Huria.',
  'Hingga tanggal penutupan laporan, tidak terdapat kejadian luar biasa setelah tanggal pelaporan yang mempengaruhi kelangsungan pembukuan.'
)
on conflict (year) do nothing;
