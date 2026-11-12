-- =============================================================================
-- SIKU HKBP Hutaraja - Migration 04: Saldo Awal & Pembukaan Buku
-- =============================================================================
-- Migrasi ini aman dijalankan di atas schema.sql tanpa merusak atau menghapus tabel lama.
-- Modul Pembukaan Buku mencatat saldo pindahan 31 Desember dari buku manual gereja
-- sebagai dasar saldo awal per 1 Januari tahun anggaran pertama.

-- 1. Status Pembukaan Buku per Kas
do $$ begin
  create type public.opening_book_status as enum (
    'not_started',  -- Belum Dimulai
    'drafting',     -- Penginputan oleh Bendahara
    'submitted',    -- Diajukan ke Ketua Kas
    'approved',     -- Disetujui Ketua Kas
    'locked'        -- Dikunci Resmi oleh Bendahara Umum
  );
exception
  when duplicate_object then null;
end $$;

-- 2. Status Penyesuaian Saldo Awal
do $$ begin
  create type public.opening_adjustment_status as enum (
    'submitted',        -- Diajukan Bendahara
    'approved_ketua',   -- Disetujui Ketua Kas
    'approved_bendum',  -- Disetujui Bendahara Umum (Tuntas)
    'rejected'          -- Ditolak
  );
exception
  when duplicate_object then null;
end $$;

-- 3. Pengaturan Pembukaan Buku (Go-Live Setup)
create table if not exists public.opening_setup (
  id text primary key default 'main',
  first_year integer not null default 2026 check (first_year >= 2000 and first_year <= 2100),
  go_live_date date not null default '2026-01-01',
  status text not null default 'in_progress' check (status in ('setup', 'in_progress', 'completed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_go_live_is_jan_first check (
    extract(month from go_live_date) = 1 and extract(day from go_live_date) = 1
  )
);

-- 4. Entri Saldo Awal (Kas x Tempat Penyimpanan & Pencocokan Fisik)
create table if not exists public.opening_balance_entries (
  id uuid primary key default gen_random_uuid(),
  tahun integer not null check (tahun >= 2000 and tahun <= 2100),
  kas_id uuid not null references public.kas(id) on delete cascade,
  storage_account_id uuid not null references public.storage_accounts(id) on delete cascade,
  amount numeric(15,2) not null check (amount >= 0) default 0,
  book_balance numeric(15,2) not null check (book_balance >= 0) default 0,
  physical_balance numeric(15,2) not null check (physical_balance >= 0) default 0,
  difference numeric(15,2) generated always as (physical_balance - book_balance) stored,
  explanation text,
  document_url text, -- Foto halaman terakhir buku manual, hitung fisik tunai, rekening koran
  status public.opening_book_status not null default 'not_started',
  created_by uuid references public.profiles(id),
  submitted_at timestamptz,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  locked_by uuid references public.profiles(id),
  locked_at timestamptz,
  return_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tahun, kas_id, storage_account_id)
);

-- 5. Penyesuaian Saldo Awal (Koreksi Setelah Dikunci, Sebelum Bulan 1 Ditutup)
create table if not exists public.opening_balance_adjustments (
  id uuid primary key default gen_random_uuid(),
  tahun integer not null check (tahun >= 2000 and tahun <= 2100),
  kas_id uuid not null references public.kas(id) on delete cascade,
  storage_account_id uuid not null references public.storage_accounts(id) on delete cascade,
  amount numeric(15,2) not null, -- Boleh positif (+) atau negatif (-)
  reason text not null,
  document_url text,
  status public.opening_adjustment_status not null default 'submitted',
  proposed_by uuid references public.profiles(id),
  approved_ketua_by uuid references public.profiles(id),
  approved_ketua_at timestamptz,
  approved_bendum_by uuid references public.profiles(id),
  approved_bendum_at timestamptz,
  reject_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Posisi Lain per Tanggal Mulai (Inventaris Awal, Panjar, Piutang, Utang, Dana Terikat)
create table if not exists public.opening_other_positions (
  id uuid primary key default gen_random_uuid(),
  tahun integer not null check (tahun >= 2000 and tahun <= 2100),
  kas_id uuid not null references public.kas(id) on delete cascade,
  type text not null check (type in ('asset', 'advance', 'receivable', 'payable', 'restricted_fund')),
  name text not null,
  category text,
  acquisition_year integer,
  amount numeric(15,2) not null check (amount >= 0) default 0,
  condition text check (condition in ('baik', 'rusak_ringan', 'rusak_berat')),
  location text,
  section_manager text,
  notes text,
  created_at timestamptz not null default now()
);

-- 7. Angka Ringkas Tahun Sebelumnya (Opsional, dari buku manual untuk komparasi laporan)
create table if not exists public.prior_year_summaries (
  id uuid primary key default gen_random_uuid(),
  tahun integer not null check (tahun >= 2000 and tahun <= 2100),
  kas_id uuid not null references public.kas(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  jumlah numeric(15,2) not null check (jumlah >= 0) default 0,
  sumber text not null default 'manual',
  created_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tahun, kas_id, category_id)
);

-- 8. Indexes untuk performa kueri
create index if not exists idx_opening_entries_lookup on public.opening_balance_entries(tahun, kas_id, status);
create index if not exists idx_opening_entries_storage on public.opening_balance_entries(storage_account_id);
create index if not exists idx_opening_adjustments_lookup on public.opening_balance_adjustments(tahun, kas_id, status);
create index if not exists idx_opening_other_positions_kas on public.opening_other_positions(kas_id, type);
create index if not exists idx_prior_year_summaries_kas on public.prior_year_summaries(tahun, kas_id);

-- 9. Storage Bucket: opening-docs (Private)
insert into storage.buckets (id, name, public)
values ('opening-docs', 'opening-docs', false)
on conflict (id) do nothing;

create policy "Opening docs viewable by authenticated users"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'opening-docs');

create policy "Opening docs uploadable by authenticated users"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'opening-docs');

-- 10. Enable Row Level Security (RLS)
alter table public.opening_setup enable row level security;
alter table public.opening_balance_entries enable row level security;
alter table public.opening_balance_adjustments enable row level security;
alter table public.opening_other_positions enable row level security;
alter table public.prior_year_summaries enable row level security;

-- Policies: opening_setup
create policy "Opening setup viewable by authenticated"
  on public.opening_setup for select to authenticated using (true);

create policy "Opening setup manageable by admin"
  on public.opening_setup for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Policies: opening_balance_entries
create policy "Opening balance entries viewable by authenticated"
  on public.opening_balance_entries for select to authenticated using (true);

create policy "Opening balance entries editable by assigned bendahara or admin"
  on public.opening_balance_entries for all to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or
    (
      status in ('not_started', 'drafting')
      and (
        exists (
          select 1 from public.user_kas_access
          where user_id = auth.uid() and kas_id = opening_balance_entries.kas_id and access_level = 'bendahara'
        )
        or
        (opening_balance_entries.kas_id = '11111111-1111-1111-1111-111111111101' and exists (
          select 1 from public.profiles where id = auth.uid() and role = 'bendahara_umum'
        ))
      )
    )
  );

-- Policies: opening_balance_adjustments
create policy "Opening adjustments viewable by authenticated"
  on public.opening_balance_adjustments for select to authenticated using (true);

create policy "Opening adjustments insertable by assigned bendahara"
  on public.opening_balance_adjustments for insert to authenticated
  with check (true);

create policy "Opening adjustments manageable by leaders and admin"
  on public.opening_balance_adjustments for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'bendahara_umum', 'pendeta_ressort', 'sekretaris')
    )
    or
    exists (
      select 1 from public.user_kas_access
      where user_id = auth.uid() and kas_id = opening_balance_adjustments.kas_id and access_level = 'ketua'
    )
  );

-- Policies: opening_other_positions & prior_year_summaries
create policy "Other positions viewable by authenticated"
  on public.opening_other_positions for select to authenticated using (true);

create policy "Other positions manageable by assigned bendahara and admin"
  on public.opening_other_positions for all to authenticated
  using (true);

create policy "Prior year summaries viewable by authenticated"
  on public.prior_year_summaries for select to authenticated using (true);

create policy "Prior year summaries manageable by bendahara umum and admin"
  on public.prior_year_summaries for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'bendahara_umum')));

-- -----------------------------------------------------------------------------
-- 11. TRIGGERS & VALIDATION CONSTRAINTS
-- -----------------------------------------------------------------------------

-- Trigger 1: Menolak transaksi bertanggal sebelum go_live_date
create or replace function public.check_transaction_date_against_golive()
returns trigger as $$
declare
  v_go_live date;
begin
  select coalesce(go_live_date, '2026-01-01') into v_go_live
  from public.opening_setup
  where id = 'main';

  if NEW.tanggal < v_go_live then
    raise exception 'Tanggal transaksi (%) tidak boleh mendahului Tanggal Mulai Pemakaian aplikasi (%). Seluruh saldo sebelum tanggal ini dicatat sebagai Saldo Pindahan.',
      NEW.tanggal, v_go_live;
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_check_tx_golive on public.transactions;
create trigger trg_check_tx_golive
  before insert or update of tanggal on public.transactions
  for each row
  execute function public.check_transaction_date_against_golive();

-- Trigger 2: Kas yang saldo awalnya belum Dikunci TIDAK boleh menerima transaksi
create or replace function public.check_kas_opening_locked_for_transaction()
returns trigger as $$
declare
  v_tx_year integer;
  v_is_locked boolean := false;
begin
  v_tx_year := extract(year from NEW.tanggal)::int;

  -- Periksa apakah kas sudah memiliki status locked untuk tahun tersebut
  select exists (
    select 1 from public.opening_balance_entries
    where kas_id = NEW.kas_id and tahun = v_tx_year and status = 'locked'
  ) into v_is_locked;

  -- Jika belum ada entri sama sekali atau belum locked, tolak input transaksi
  if not v_is_locked then
    raise exception 'Pembukaan buku untuk kas ini belum Dikunci (Locked). Selesaikan dan kunci saldo awal kas terlebih dahulu sebelum mencatat transaksi.';
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_check_kas_locked on public.transactions;
create trigger trg_check_kas_locked
  before insert on public.transactions
  for each row
  execute function public.check_kas_opening_locked_for_transaction();

-- Trigger 3: Saldo awal yang sudah Dikunci tidak boleh diedit atau dihapus secara langsung
create or replace function public.protect_locked_opening_entries()
returns trigger as $$
begin
  if OLD.status = 'locked' and TG_OP = 'DELETE' then
    raise exception 'Entri Saldo Awal yang telah Dikunci tidak dapat dihapus.';
  end if;

  if OLD.status = 'locked' and TG_OP = 'UPDATE' and NEW.status = 'locked' then
    if (OLD.amount <> NEW.amount or OLD.book_balance <> NEW.book_balance or OLD.physical_balance <> NEW.physical_balance) then
      raise exception 'Saldo awal yang telah Dikunci tidak boleh diedit secara langsung. Gunakan menu Penyesuaian Saldo Awal jika ada koreksi sah.';
    end if;
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_protect_locked_opening on public.opening_balance_entries;
create trigger trg_protect_locked_opening
  before update or delete on public.opening_balance_entries
  for each row
  execute function public.protect_locked_opening_entries();

-- -----------------------------------------------------------------------------
-- 12. RPC FUNCTIONS (ALUR PENGAJUAN, PERSETUJUAN, DAN PENGUNCIAN)
-- -----------------------------------------------------------------------------

-- RPC 1: Ajukan Saldo Awal ke Ketua Kas
create or replace function public.ajukan_saldo_awal(
  p_kas_id uuid,
  p_tahun integer
)
returns boolean as $$
declare
  v_user_id uuid := auth.uid();
  v_is_bendahara boolean := false;
  v_count integer;
  v_unexplained integer;
begin
  -- Cek wewenang penginput
  select exists (
    select 1 from public.user_kas_access
    where user_id = v_user_id and kas_id = p_kas_id and access_level = 'bendahara'
  ) into v_is_bendahara;

  if p_kas_id = '11111111-1111-1111-1111-111111111101' and exists (
    select 1 from public.profiles where id = v_user_id and role in ('admin', 'bendahara_umum')
  ) then
    v_is_bendahara := true;
  end if;

  if exists (select 1 from public.profiles where id = v_user_id and role = 'admin') then
    v_is_bendahara := true;
  end if;

  if not v_is_bendahara then
    raise exception 'Hanya bendahara yang ditugaskan pada kas ini yang dapat mengajukan saldo awal.';
  end if;

  -- Pastikan ada entri
  select count(*) into v_count
  from public.opening_balance_entries
  where kas_id = p_kas_id and tahun = p_tahun;

  if v_count = 0 then
    raise exception 'Belum ada rincian saldo tempat penyimpanan yang dimasukkan.';
  end if;

  -- Pastikan selisih fisik sudah memiliki penjelasan
  select count(*) into v_unexplained
  from public.opening_balance_entries
  where kas_id = p_kas_id and tahun = p_tahun
    and (physical_balance <> book_balance)
    and (explanation is null or trim(explanation) = '');

  if v_unexplained > 0 then
    raise exception 'Terdapat selisih fisik kas/bank yang belum memiliki penjelasan tertulis.';
  end if;

  -- Update status ke submitted
  update public.opening_balance_entries
  set status = 'submitted',
      submitted_at = now(),
      created_by = coalesce(created_by, v_user_id),
      return_note = null,
      updated_at = now()
  where kas_id = p_kas_id and tahun = p_tahun;

  return true;
end;
$$ language plpgsql security definer;

-- RPC 2: Setujui atau Kembalikan Saldo Awal oleh Ketua Kas
create or replace function public.setujui_saldo_awal(
  p_kas_id uuid,
  p_tahun integer,
  p_action text, -- 'approve' or 'return'
  p_note text default null
)
returns boolean as $$
declare
  v_user_id uuid := auth.uid();
  v_is_ketua boolean := false;
  v_creator_id uuid;
begin
  -- Cek apakah pembuat draf sama dengan user yang menyetujui (Dilarang menyetujui sendiri)
  select created_by into v_creator_id
  from public.opening_balance_entries
  where kas_id = p_kas_id and tahun = p_tahun
  limit 1;

  if v_creator_id = v_user_id and not exists (select 1 from public.profiles where id = v_user_id and role = 'admin') then
    raise exception 'Penyusun saldo awal tidak boleh menyetujui pengajuannya sendiri demi kepatuhan pemisahan tugas (segregation of duties).';
  end if;

  -- Cek wewenang ketua
  select exists (
    select 1 from public.user_kas_access
    where user_id = v_user_id and kas_id = p_kas_id and access_level = 'ketua'
  ) into v_is_ketua;

  if p_kas_id = '11111111-1111-1111-1111-111111111101' and exists (
    select 1 from public.profiles where id = v_user_id and role in ('pendeta_ressort', 'sekretaris', 'admin')
  ) then
    v_is_ketua := true;
  end if;

  if exists (select 1 from public.profiles where id = v_user_id and role = 'admin') then
    v_is_ketua := true;
  end if;

  if not v_is_ketua then
    raise exception 'Hanya Ketua Kas (atau Pendeta Ressort untuk Kas Umum) yang berwenang memeriksa dan menyetujui saldo awal.';
  end if;

  if p_action = 'approve' then
    update public.opening_balance_entries
    set status = 'approved',
        approved_by = v_user_id,
        approved_at = now(),
        return_note = null,
        updated_at = now()
    where kas_id = p_kas_id and tahun = p_tahun;
  elsif p_action = 'return' then
    if p_note is null or trim(p_note) = '' then
      raise exception 'Catatan perbaikan wajib disertakan saat mengembalikan pengajuan.';
    end if;

    update public.opening_balance_entries
    set status = 'drafting',
        return_note = p_note,
        updated_at = now()
    where kas_id = p_kas_id and tahun = p_tahun;
  else
    raise exception 'Aksi tidak valid (gunakan approve atau return).';
  end if;

  return true;
end;
$$ language plpgsql security definer;

-- RPC 3: Kunci Pembukaan Buku oleh Bendahara Umum (Per Kas atau Semua Kas)
-- Otomatis mensinkronkan ke tabel public.opening_balances agar view & laporan bekerja
create or replace function public.kunci_pembukaan_buku(
  p_kas_id uuid default null, -- NULL untuk mengunci semua kas yang sudah approved
  p_tahun integer default 2026
)
returns integer as $$
declare
  v_user_id uuid := auth.uid();
  v_is_bendum boolean := false;
  v_affected integer := 0;
  r record;
begin
  -- Cek wewenang: Bendahara Umum atau Admin
  select exists (
    select 1 from public.profiles
    where id = v_user_id and role in ('admin', 'bendahara_umum')
  ) into v_is_bendum;

  if not v_is_bendum then
    raise exception 'Hanya Bendahara Umum atau Admin yang berwenang mengunci Pembukaan Buku.';
  end if;

  -- Loop entri yang sudah approved untuk dikunci
  for r in
    select * from public.opening_balance_entries
    where tahun = p_tahun
      and (p_kas_id is null or kas_id = p_kas_id)
      and status = 'approved'
  loop
    -- Tandai locked pada entri
    update public.opening_balance_entries
    set status = 'locked',
        locked_by = v_user_id,
        locked_at = now(),
        updated_at = now()
    where id = r.id;

    -- Sinkronisasi otomatis ke tabel opening_balances (Fase 1)
    insert into public.opening_balances (
      tahun,
      kas_id,
      storage_account_id,
      amount,
      notes
    ) values (
      r.tahun,
      r.kas_id,
      r.storage_account_id,
      r.amount,
      coalesce(r.explanation, 'Saldo pindahan per 31 Desember ' || (p_tahun - 1) || ' resmi dikunci')
    )
    on conflict (tahun, kas_id, storage_account_id)
    do update set
      amount = excluded.amount,
      notes = excluded.notes,
      updated_at = now();

    v_affected := v_affected + 1;
  end loop;

  -- Jika semua kas sudah locked, update status opening_setup ke completed
  if not exists (
    select 1 from public.kas k
    where k.is_active = true
      and not exists (
        select 1 from public.opening_balance_entries obe
        where obe.kas_id = k.id and obe.tahun = p_tahun and obe.status = 'locked'
      )
  ) then
    update public.opening_setup
    set status = 'completed', updated_at = now()
    where id = 'main';
  end if;

  return v_affected;
end;
$$ language plpgsql security definer;

-- RPC 4: Buat Penyesuaian Saldo Awal (Sebelum Bulan 1 Ditutup)
create or replace function public.buat_penyesuaian_saldo_awal(
  p_kas_id uuid,
  p_storage_id uuid,
  p_tahun integer,
  p_amount numeric,
  p_reason text,
  p_doc_url text default null
)
returns uuid as $$
declare
  v_user_id uuid := auth.uid();
  v_is_closed boolean := false;
  v_new_id uuid;
begin
  if p_amount = 0 then
    raise exception 'Nominal penyesuaian tidak boleh nol.';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Alasan penyesuaian saldo awal wajib diisi.';
  end if;

  -- Cek apakah bulan 1 tahun anggaran tersebut sudah ditutup
  select exists (
    select 1 from public.period_closings
    where tahun = p_tahun and bulan = 1 and (kas_id is null or kas_id = p_kas_id) and is_closed = true
  ) into v_is_closed;

  if v_is_closed then
    raise exception 'Bulan pertama tahun % telah ditutup buku. Penyesuaian saldo awal tidak diperbolehkan lagi; silakan catat lewat transaksi koreksi pada periode berjalan.',
      p_tahun;
  end if;

  insert into public.opening_balance_adjustments (
    tahun,
    kas_id,
    storage_account_id,
    amount,
    reason,
    document_url,
    status,
    proposed_by
  ) values (
    p_tahun,
    p_kas_id,
    p_storage_id,
    p_amount,
    p_reason,
    p_doc_url,
    'submitted',
    v_user_id
  ) returning id into v_new_id;

  return v_new_id;
end;
$$ language plpgsql security definer;

-- RPC 5: Setujui Penyesuaian Saldo Awal (Ketua Kas lalu Bendahara Umum)
create or replace function public.setujui_penyesuaian_saldo_awal(
  p_adj_id uuid,
  p_action text, -- 'approve' or 'reject'
  p_reject_note text default null
)
returns boolean as $$
declare
  v_user_id uuid := auth.uid();
  v_adj public.opening_balance_adjustments%rowtype;
  v_is_ketua boolean := false;
  v_is_bendum boolean := false;
begin
  select * into v_adj from public.opening_balance_adjustments where id = p_adj_id;
  if not found then
    raise exception 'Data penyesuaian tidak ditemukan.';
  end if;

  if p_action = 'reject' then
    update public.opening_balance_adjustments
    set status = 'rejected',
        reject_note = p_reject_note,
        updated_at = now()
    where id = p_adj_id;
    return true;
  end if;

  -- Cek role
  select exists (select 1 from public.profiles where id = v_user_id and role in ('admin', 'bendahara_umum')) into v_is_bendum;
  select exists (
    select 1 from public.user_kas_access where user_id = v_user_id and kas_id = v_adj.kas_id and access_level = 'ketua'
  ) into v_is_ketua;

  if v_adj.kas_id = '11111111-1111-1111-1111-111111111101' and exists (
    select 1 from public.profiles where id = v_user_id and role in ('pendeta_ressort', 'sekretaris')
  ) then
    v_is_ketua := true;
  end if;

  if v_adj.status = 'submitted' then
    if not (v_is_ketua or v_is_bendum) then
      raise exception 'Hanya Ketua Kas yang dapat menyetujui tahap pertama penyesuaian saldo awal.';
    end if;

    update public.opening_balance_adjustments
    set status = 'approved_ketua',
        approved_ketua_by = v_user_id,
        approved_ketua_at = now(),
        updated_at = now()
    where id = p_adj_id;

  elsif v_adj.status = 'approved_ketua' then
    if not v_is_bendum then
      raise exception 'Hanya Bendahara Umum atau Admin yang dapat memberikan persetujuan final penyesuaian saldo awal.';
    end if;

    -- Update status adjustment
    update public.opening_balance_adjustments
    set status = 'approved_bendum',
        approved_bendum_by = v_user_id,
        approved_bendum_at = now(),
        updated_at = now()
    where id = p_adj_id;

    -- Terapkan penyesuaian ke tabel opening_balances (Fase 1)
    update public.opening_balances
    set amount = amount + v_adj.amount,
        notes = notes || ' [Disesuaikan ' || v_adj.amount || ': ' || v_adj.reason || ']',
        updated_at = now()
    where tahun = v_adj.tahun
      and kas_id = v_adj.kas_id
      and storage_account_id = v_adj.storage_account_id;

  end if;

  return true;
end;
$$ language plpgsql security definer;

-- -----------------------------------------------------------------------------
-- 13. DATA AWAL (SEED SETUP)
-- -----------------------------------------------------------------------------
insert into public.opening_setup (id, first_year, go_live_date, status, notes)
values ('main', 2026, '2026-01-01', 'in_progress', 'Pembukaan Buku Keuangan HKBP Ressort Hutaraja Tahun 2026')
on conflict (id) do nothing;
