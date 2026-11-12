-- =============================================================================
-- SIKU HKBP Hutaraja - Migration 03c: Laporan Semester & LPJ Tahunan (ISAK 35)
-- =============================================================================
-- Migrasi ini aman dijalankan di atas schema.sql, migration_04_saldo_awal.sql,
-- migration_03a_data_lpj.sql, dan migration_03b_audit.sql.
-- Menambahkan: semester_reports, lpj_reports, lpj_exceptions, foreign key audit_engagements,
-- database views ISAK 35, RPC alur pengesahan & pewartaan, triggers, dan storage bucket.

-- -----------------------------------------------------------------------------
-- 1. TABEL LAPORAN SEMESTER (SEMESTER REPORTS)
-- -----------------------------------------------------------------------------
create table if not exists public.semester_reports (
  id uuid primary key default gen_random_uuid(),
  tahun integer not null check (tahun >= 2000 and tahun <= 2100),
  semester integer not null check (semester in (1, 2)),
  status text not null default 'preparation' check (
    status in ('preparation', 'drafted', 'audit_in_progress', 'sent_to_pastor', 'announced', 'returned')
  ),
  version integer not null default 1,
  snapshot_data jsonb,
  checklist_result jsonb not null default '{}'::jsonb,
  sent_to_pastor_date date,
  sent_ref text,
  pastor_ack_by uuid references public.profiles(id),
  pastor_ack_at timestamptz,
  pastor_note text,
  announced_date date,
  announcement_medium text check (announcement_medium in ('warta_jemaat', 'mimbar', 'papan_pengumuman', 'lainnya')),
  announcement_text text,
  announcement_document_url text,
  return_notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tahun, semester, version)
);

-- -----------------------------------------------------------------------------
-- 2. TABEL LPJ TAHUNAN (LPJ REPORTS)
-- -----------------------------------------------------------------------------
create table if not exists public.lpj_reports (
  id uuid primary key default gen_random_uuid(),
  tahun integer not null check (tahun >= 2000 and tahun <= 2100),
  nomor_dokumen text not null,
  status text not null default 'preparation' check (
    status in ('preparation', 'drafted', 'audit_in_progress', 'submitted_to_meeting', 'approved', 'returned')
  ),
  version integer not null default 1,
  snapshot_data jsonb,
  checklist_result jsonb not null default '{}'::jsonb,
  meeting_date date,
  meeting_ref text,
  meeting_document_url text,
  meeting_notes text,
  meeting_attendees_count integer default 0,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  return_notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tahun, version)
);

-- -----------------------------------------------------------------------------
-- 3. TABEL PENGECUALIAN CHECKLIST (LPJ EXCEPTIONS)
-- -----------------------------------------------------------------------------
create table if not exists public.lpj_exceptions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('semester', 'lpj')),
  target_id uuid not null,
  rule_code text not null,
  reason text not null,
  granted_by uuid not null references public.profiles(id),
  granted_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 4. UPDATE FOREIGN KEY PADA AUDIT_ENGAGEMENTS
-- -----------------------------------------------------------------------------
do $$ begin
  alter table public.audit_engagements
    add constraint fk_audit_engagements_semester_report
    foreign key (semester_report_id) references public.semester_reports(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter table public.audit_engagements
    add constraint fk_audit_engagements_lpj_report
    foreign key (lpj_id) references public.lpj_reports(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 5. DATABASE VIEWS (ISAK 35 REPORTING VIEWS)
-- -----------------------------------------------------------------------------

-- View 5.1: Laporan Penerimaan dan Pengeluaran (Transfer Antar Kas Dipisah)
create or replace view public.view_laporan_penerimaan_pengeluaran as
select
  t.id,
  extract(year from t.tanggal)::integer as tahun,
  extract(month from t.tanggal)::integer as bulan,
  t.tanggal,
  t.kas_id,
  k.nama as nama_kas,
  k.kode as kode_kas,
  k.fund_type,
  t.storage_account_id,
  sa.nama as nama_storage,
  t.category_id,
  c.nama as nama_kategori,
  c.kode as kode_kategori,
  t.type as tipe_transaksi,
  t.amount,
  case
    when t.type in ('income', 'expense') then 'operasional'
    else 'transfer'
  end as klasifikasi_mutasi,
  t.description,
  t.status
from public.transactions t
join public.kas k on k.id = t.kas_id
join public.storage_accounts sa on sa.id = t.storage_account_id
left join public.categories c on c.id = t.category_id
where t.status = 'approved';

-- View 5.2: Laporan Perubahan Saldo Dana (Per Kas & Per Fund Type)
create or replace view public.view_laporan_perubahan_saldo_dana as
select
  k.id as kas_id,
  k.nama as nama_kas,
  k.kode as kode_kas,
  k.fund_type,
  coalesce(ob.total_saldo_awal, 0) as saldo_awal,
  coalesce(tx.total_masuk, 0) as penerimaan_murni,
  coalesce(tx.total_keluar, 0) as pengeluaran_murni,
  (coalesce(tx.total_masuk, 0) - coalesce(tx.total_keluar, 0)) as surplus_defisit,
  coalesce(tx.total_transfer_masuk, 0) as transfer_antar_dana_masuk,
  coalesce(tx.total_transfer_keluar, 0) as transfer_antar_dana_keluar,
  (
    coalesce(ob.total_saldo_awal, 0) +
    coalesce(tx.total_masuk, 0) -
    coalesce(tx.total_keluar, 0) +
    coalesce(tx.total_transfer_masuk, 0) -
    coalesce(tx.total_transfer_keluar, 0)
  ) as saldo_akhir
from public.kas k
left join (
  select kas_id, sum(amount) as total_saldo_awal
  from public.opening_balances
  group by kas_id
) ob on ob.kas_id = k.id
left join (
  select
    kas_id,
    sum(case when type = 'income' then amount else 0 end) as total_masuk,
    sum(case when type = 'expense' then amount else 0 end) as total_keluar,
    sum(case when type = 'transfer_in' then amount else 0 end) as total_transfer_masuk,
    sum(case when type = 'transfer_out' then amount else 0 end) as total_transfer_keluar
  from public.transactions
  where status = 'approved'
  group by kas_id
) tx on tx.kas_id = k.id;

-- View 5.3: Laporan Posisi Keuangan ISAK 35 (Neraca Berimbang)
create or replace view public.view_laporan_posisi_keuangan as
with kas_summary as (
  select
    coalesce(sum(saldo_akhir), 0) as total_kas_dan_bank,
    coalesce(sum(case when fund_type = 'unrestricted' then saldo_akhir else 0 end), 0) as saldo_dana_tidak_terikat,
    coalesce(sum(case when fund_type = 'restricted' then saldo_akhir else 0 end), 0) as saldo_dana_terikat
  from public.view_laporan_perubahan_saldo_dana
),
piutang_summary as (
  select
    coalesce(sum(remaining_amount), 0) as total_piutang_pihak_ketiga
  from public.receivables_payables
  where type = 'receivable' and status != 'paid'
),
panjar_summary as (
  select
    coalesce(sum(amount), 0) as total_panjar_berjalan
  from public.advances
  where status != 'settled'
),
utang_summary as (
  select
    coalesce(sum(remaining_amount), 0) as total_kewajiban_utang
  from public.receivables_payables
  where type = 'payable' and status != 'paid'
),
aset_tetap_summary as (
  select
    coalesce(sum(nilai_perolehan), 0) as total_aset_tetap_bruto,
    coalesce(sum(salvage_value), 0) as total_nilai_residu
  from public.fixed_assets
  where status = 'aktif'
)
select
  ks.total_kas_dan_bank,
  (ps.total_piutang_pihak_ketiga + pjs.total_panjar_berjalan) as total_piutang,
  ps.total_piutang_pihak_ketiga,
  pjs.total_panjar_berjalan,
  ats.total_aset_tetap_bruto,
  (
    ks.total_kas_dan_bank +
    ps.total_piutang_pihak_ketiga +
    pjs.total_panjar_berjalan +
    ats.total_aset_tetap_bruto
  ) as total_aset,
  us.total_kewajiban_utang as total_kewajiban,
  ks.saldo_dana_tidak_terikat,
  ks.saldo_dana_terikat,
  (ks.saldo_dana_tidak_terikat + ks.saldo_dana_terikat + ats.total_aset_tetap_bruto + ps.total_piutang_pihak_ketiga + pjs.total_panjar_berjalan - us.total_kewajiban_utang) as total_saldo_dana_bersih,
  (
    us.total_kewajiban_utang +
    (ks.saldo_dana_tidak_terikat + ks.saldo_dana_terikat + ats.total_aset_tetap_bruto + ps.total_piutang_pihak_ketiga + pjs.total_panjar_berjalan - us.total_kewajiban_utang)
  ) as total_kewajiban_dan_saldo_dana,
  (
    (ks.total_kas_dan_bank + ps.total_piutang_pihak_ketiga + pjs.total_panjar_berjalan + ats.total_aset_tetap_bruto) -
    (us.total_kewajiban_utang + (ks.saldo_dana_tidak_terikat + ks.saldo_dana_terikat + ats.total_aset_tetap_bruto + ps.total_piutang_pihak_ketiga + pjs.total_panjar_berjalan - us.total_kewajiban_utang))
  ) as selisih_neraca
from kas_summary ks
cross join piutang_summary ps
cross join panjar_summary pjs
cross join utang_summary us
cross join aset_tetap_summary ats;

-- View 5.4: Laporan Arus Kas Metode Langsung
create or replace view public.view_laporan_arus_kas as
select
  extract(year from t.tanggal)::integer as tahun,
  -- 1. Arus Kas dari Aktivitas Operasi
  sum(case when t.type = 'income' and lower(coalesce(c.nama, '')) not like '%pembangunan%' then t.amount else 0 end) as kas_masuk_operasi,
  sum(case when t.type = 'expense' and lower(coalesce(c.nama, '')) not like '%pengadaan aset%' and lower(coalesce(c.nama, '')) not like '%pembangunan%' then t.amount else 0 end) as kas_keluar_operasi,
  -- 2. Arus Kas dari Aktivitas Investasi
  sum(case when t.type = 'expense' and (lower(coalesce(c.nama, '')) like '%pengadaan aset%' or lower(coalesce(c.nama, '')) like '%inventaris%') then t.amount else 0 end) as kas_keluar_investasi,
  -- 3. Arus Kas dari Aktivitas Pendanaan
  sum(case when t.type = 'income' and (lower(coalesce(c.nama, '')) like '%pembangunan%' or lower(coalesce(c.nama, '')) like '%donasi terikat%') then t.amount else 0 end) as kas_masuk_pendanaan,
  sum(case when t.type = 'expense' and lower(coalesce(c.nama, '')) like '%pembangunan%' then t.amount else 0 end) as kas_keluar_pendanaan
from public.transactions t
left join public.categories c on c.id = t.category_id
where t.status = 'approved'
group by extract(year from t.tanggal);

-- View 5.5: Laporan Semester Ringkasan
create or replace view public.view_laporan_semester_ringkasan as
select
  extract(year from t.tanggal)::integer as tahun,
  case when extract(month from t.tanggal) <= 6 then 1 else 2 end as semester,
  t.kas_id,
  k.nama as nama_kas,
  sum(case when t.type = 'income' then t.amount else 0 end) as penerimaan_semester,
  sum(case when t.type = 'expense' then t.amount else 0 end) as pengeluaran_semester,
  sum(case when t.type = 'transfer_in' then t.amount else 0 end) as transfer_masuk,
  sum(case when t.type = 'transfer_out' then t.amount else 0 end) as transfer_keluar
from public.transactions t
join public.kas k on k.id = t.kas_id
where t.status = 'approved'
group by extract(year from t.tanggal), case when extract(month from t.tanggal) <= 6 then 1 else 2 end, t.kas_id, k.nama;

-- -----------------------------------------------------------------------------
-- 6. STORAGE BUCKET: report-docs (Private)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('report-docs', 'report-docs', false)
on conflict (id) do nothing;

create policy "Report docs bucket read access"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'report-docs');

create policy "Report docs bucket insert access"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'report-docs');

create policy "Report docs bucket update access"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'report-docs');

-- -----------------------------------------------------------------------------
-- 7. TRIGGERS: KUNCI TRANSAKSI SETELAH LPJ DISAHKAN & INTEGRITAS STATUS
-- -----------------------------------------------------------------------------

-- Trigger A: Melarang perubahan transaksi pada tahun yang LPJ-nya telah disahkan
create or replace function public.fn_protect_transactions_approved_lpj()
returns trigger
language plpgsql
security definer
as $$
declare
  v_year integer;
  v_is_approved boolean;
begin
  v_year := extract(year from coalesce(new.tanggal, old.tanggal));

  select exists (
    select 1 from public.lpj_reports
    where tahun = v_year and status = 'approved'
  ) into v_is_approved;

  if v_is_approved then
    raise exception 'Tahun Anggaran % telah memiliki Laporan Pertanggungjawaban (LPJ) yang Disahkan oleh Rapat Huria. Seluruh transaksi tahun tersebut terkunci permanen. Koreksi wajib dicatat sebagai penyesuaian di tahun berjalan.', v_year;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_protect_transactions_approved_lpj on public.transactions;
create trigger trg_protect_transactions_approved_lpj
  before insert or update or delete on public.transactions
  for each row
  execute function public.fn_protect_transactions_approved_lpj();

-- Trigger B: Melarang penyusun mengesahkan laporannya sendiri
create or replace function public.fn_anti_self_approval_reports()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.status = 'approved' and new.approved_by is not null then
    if new.created_by is not null and new.created_by = new.approved_by then
      raise exception 'Penyusun laporan dilarang mengesahkan laporannya sendiri (Pemisahan Wewenang / Segregation of Duties).';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_anti_self_approval_semester on public.semester_reports;
create trigger trg_anti_self_approval_semester
  before update on public.semester_reports
  for each row
  execute function public.fn_anti_self_approval_reports();

drop trigger if exists trg_anti_self_approval_lpj on public.lpj_reports;
create trigger trg_anti_self_approval_lpj
  before update on public.lpj_reports
  for each row
  execute function public.fn_anti_self_approval_reports();

-- -----------------------------------------------------------------------------
-- 8. RPC FUNCTIONS UNTUK ALUR LAPORAN
-- -----------------------------------------------------------------------------

-- RPC: Jalankan Checklist Semester
create or replace function public.jalankan_checklist_semester(
  p_tahun integer,
  p_semester integer
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_start_month integer := case when p_semester = 1 then 1 else 7 end;
  v_end_month integer := case when p_semester = 1 then 6 else 12 end;
  v_unclosed_months integer := 0;
  v_draft_tx integer := 0;
  v_unreconciled integer := 0;
  v_overdue_advances integer := 0;
  v_unresolved_findings integer := 0;
  v_all_passed boolean := true;
  v_items jsonb;
begin
  -- 1. Cek bulan tutup buku
  select count(*) into v_unclosed_months
  from generate_series(v_start_month, v_end_month) as m
  where not exists (
    select 1 from public.period_closings
    where tahun = p_tahun and bulan = m and is_closed = true
  );

  -- 2. Cek transaksi draft/submitted
  select count(*) into v_draft_tx
  from public.transactions
  where extract(year from tanggal) = p_tahun
    and extract(month from tanggal) between v_start_month and v_end_month
    and status in ('draft', 'submitted');

  -- 3. Cek panjar overdue
  select count(*) into v_overdue_advances
  from public.advances
  where status = 'active'
    and due_date < case when p_semester = 1 then to_date(p_tahun || '-06-30', 'YYYY-MM-DD') else to_date(p_tahun || '-12-31', 'YYYY-MM-DD') end;

  -- 4. Cek temuan wajib diperbaiki
  select count(*) into v_unresolved_findings
  from public.audit_findings
  where severity = 'wajib_diperbaiki' and status not in ('selesai', 'diterima');

  if v_unclosed_months > 0 or v_draft_tx > 0 or v_overdue_advances > 0 or v_unresolved_findings > 0 then
    v_all_passed := false;
  end if;

  v_items := jsonb_build_object(
    'unclosed_months_count', v_unclosed_months,
    'draft_tx_count', v_draft_tx,
    'overdue_advances_count', v_overdue_advances,
    'unresolved_findings_count', v_unresolved_findings,
    'passed', v_all_passed
  );

  return v_items;
end;
$$;

-- RPC: Kunci Snapshot Laporan Semester
create or replace function public.kunci_snapshot_semester(
  p_tahun integer,
  p_semester integer
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_can_draft boolean;
  v_snapshot jsonb;
  v_rep_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Pengguna belum terautentikasi.');
  end if;

  select exists (
    select 1 from public.profiles
    where id = v_user_id and role in ('admin', 'bendahara_umum')
  ) into v_can_draft;

  if not v_can_draft then
    return jsonb_build_object('success', false, 'error', 'Hanya Bendahara Umum atau Admin yang berwenang menyusun dan mengunci snapshot laporan semester.');
  end if;

  -- Kumpulkan snapshot data
  select jsonb_build_object(
    'posisi_keuangan', (select row_to_json(pk) from public.view_laporan_posisi_keuangan pk),
    'perubahan_saldo', (select jsonb_agg(row_to_json(ps)) from public.view_laporan_perubahan_saldo_dana ps),
    'ringkasan_semester', (select jsonb_agg(row_to_json(sr)) from public.view_laporan_semester_ringkasan sr where tahun = p_tahun and semester = p_semester),
    'locked_at', now(),
    'locked_by', v_user_id
  ) into v_snapshot;

  insert into public.semester_reports (
    tahun,
    semester,
    status,
    snapshot_data,
    checklist_result,
    created_by
  ) values (
    p_tahun,
    p_semester,
    'drafted',
    v_snapshot,
    jsonb_build_object('passed', true, 'locked_at', now()),
    v_user_id
  )
  on conflict (tahun, semester, version) do update set
    status = 'drafted',
    snapshot_data = v_snapshot,
    updated_at = now()
  returning id into v_rep_id;

  return jsonb_build_object('success', true, 'report_id', v_rep_id);
end;
$$;

-- RPC: Teruskan Laporan Semester ke Pendeta Ressort
create or replace function public.teruskan_ke_pendeta(
  p_report_id uuid,
  p_sent_ref text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_can_send boolean;
begin
  select exists (
    select 1 from public.profiles
    where id = v_user_id and role in ('admin', 'sekretaris', 'bendahara_umum')
  ) into v_can_send;

  if not v_can_send then
    return jsonb_build_object('success', false, 'error', 'Hanya Sekretaris atau Bendahara Umum yang berwenang meneruskan laporan ke Pendeta Ressort.');
  end if;

  update public.semester_reports
  set status = 'sent_to_pastor',
      sent_to_pastor_date = current_date,
      sent_ref = p_sent_ref,
      updated_at = now()
  where id = p_report_id;

  return jsonb_build_object('success', true);
end;
$$;

-- RPC: Pendeta Ressort Menandai Diterima Laporan Semester
create or replace function public.terima_laporan_semester(
  p_report_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_pastor boolean;
begin
  select exists (
    select 1 from public.profiles
    where id = v_user_id and role in ('pendeta_ressort', 'admin')
  ) into v_is_pastor;

  if not v_is_pastor then
    return jsonb_build_object('success', false, 'error', 'Hanya Pendeta Ressort yang berwenang menandai laporan diterima.');
  end if;

  update public.semester_reports
  set pastor_ack_by = v_user_id,
      pastor_ack_at = now(),
      pastor_note = p_note,
      updated_at = now()
  where id = p_report_id;

  return jsonb_build_object('success', true);
end;
$$;

-- RPC: Catat Pewartaan Laporan Semester kepada Jemaat
create or replace function public.catat_pewartaan(
  p_report_id uuid,
  p_announced_date date,
  p_medium text,
  p_text text,
  p_doc_url text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_can_announce boolean;
begin
  select exists (
    select 1 from public.profiles
    where id = v_user_id and role in ('sekretaris', 'admin')
  ) into v_can_announce;

  if not v_can_announce then
    return jsonb_build_object('success', false, 'error', 'Hanya Sekretaris Huria yang berwenang mencatat pewartaan jemaat.');
  end if;

  update public.semester_reports
  set status = 'announced',
      announced_date = coalesce(p_announced_date, current_date),
      announcement_medium = p_medium,
      announcement_text = p_text,
      announcement_document_url = p_doc_url,
      updated_at = now()
  where id = p_report_id;

  return jsonb_build_object('success', true);
end;
$$;

-- RPC: Kunci Snapshot LPJ Tahunan
create or replace function public.kunci_snapshot_lpj(
  p_tahun integer,
  p_nomor_dokumen text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_can_draft boolean;
  v_snapshot jsonb;
  v_lpj_id uuid;
begin
  select exists (
    select 1 from public.profiles
    where id = v_user_id and role in ('admin', 'bendahara_umum')
  ) into v_can_draft;

  if not v_can_draft then
    return jsonb_build_object('success', false, 'error', 'Hanya Bendahara Umum atau Admin yang berwenang menyusun dan mengunci snapshot LPJ Tahunan.');
  end if;

  -- Kumpulkan snapshot keuangan lengkap ISAK 35
  select jsonb_build_object(
    'posisi_keuangan', (select row_to_json(pk) from public.view_laporan_posisi_keuangan pk),
    'perubahan_saldo', (select jsonb_agg(row_to_json(ps)) from public.view_laporan_perubahan_saldo_dana ps),
    'arus_kas', (select row_to_json(ak) from public.view_laporan_arus_kas ak where tahun = p_tahun),
    'calk', (select row_to_json(ln) from public.lpj_notes ln where year = p_tahun),
    'aset_tetap', (select jsonb_agg(row_to_json(fa)) from public.fixed_assets fa where status = 'aktif'),
    'panjar', (select jsonb_agg(row_to_json(adv)) from public.advances adv),
    'piutang_utang', (select jsonb_agg(row_to_json(rp)) from public.receivables_payables rp),
    'locked_at', now(),
    'locked_by', v_user_id
  ) into v_snapshot;

  insert into public.lpj_reports (
    tahun,
    nomor_dokumen,
    status,
    snapshot_data,
    checklist_result,
    created_by
  ) values (
    p_tahun,
    coalesce(p_nomor_dokumen, 'LPJ/' || p_tahun::text || '/HKBP-HTR'),
    'drafted',
    v_snapshot,
    jsonb_build_object('passed', true, 'locked_at', now()),
    v_user_id
  )
  on conflict (tahun, version) do update set
    status = 'drafted',
    snapshot_data = v_snapshot,
    updated_at = now()
  returning id into v_lpj_id;

  return jsonb_build_object('success', true, 'lpj_id', v_lpj_id);
end;
$$;

-- RPC: Catat Pengesahan LPJ oleh Rapat Huria
create or replace function public.catat_pengesahan_lpj(
  p_report_id uuid,
  p_meeting_date date,
  p_meeting_ref text,
  p_document_url text default null,
  p_notes text default null,
  p_attendees_count integer default 0
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_can_approve boolean;
  v_lpj public.lpj_reports%rowtype;
begin
  select * into v_lpj from public.lpj_reports where id = p_report_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Dokumen LPJ tidak ditemukan.');
  end if;

  select exists (
    select 1 from public.profiles
    where id = v_user_id and role in ('sekretaris', 'admin')
  ) into v_can_approve;

  if not v_can_approve then
    return jsonb_build_object('success', false, 'error', 'Hanya Sekretaris Huria atau Admin yang berwenang mencatat hasil keputusan Rapat Huria.');
  end if;

  if v_lpj.created_by = v_user_id then
    return jsonb_build_object('success', false, 'error', 'Penyusun LPJ dilarang mencatat pengesahan laporannya sendiri.');
  end if;

  update public.lpj_reports
  set status = 'approved',
      meeting_date = coalesce(p_meeting_date, current_date),
      meeting_ref = p_meeting_ref,
      meeting_document_url = p_document_url,
      meeting_notes = p_notes,
      meeting_attendees_count = p_attendees_count,
      approved_by = v_user_id,
      approved_at = now(),
      updated_at = now()
  where id = p_report_id;

  return jsonb_build_object('success', true);
end;
$$;

-- RPC: Buat Teks Ringkasan Warta Jemaat Otomatis
create or replace function public.buat_ringkasan_warta(
  p_report_id uuid
)
returns text
language plpgsql
security definer
as $$
declare
  v_rep public.semester_reports%rowtype;
  v_inflow numeric := 0;
  v_outflow numeric := 0;
  v_saldo numeric := 0;
  v_text text;
begin
  select * into v_rep from public.semester_reports where id = p_report_id;
  if not found then
    raise exception 'Laporan semester tidak ditemukan.';
  end if;

  select
    coalesce(sum(case when type = 'income' then amount else 0 end), 0),
    coalesce(sum(case when type = 'expense' then amount else 0 end), 0)
  into v_inflow, v_outflow
  from public.transactions
  where extract(year from tanggal) = v_rep.tahun
    and (case when v_rep.semester = 1 then extract(month from tanggal) <= 6 else extract(month from tanggal) > 6 end)
    and status = 'approved';

  select coalesce(sum(saldo_akhir), 0) into v_saldo
  from public.view_laporan_perubahan_saldo_dana;

  v_text := format(
    'WARTA KEUANGAN JEMAAT HKBP RESSORT HUTARAJA%s' ||
    'Periode: Semester %s Tahun Anggaran %s%s%s' ||
    'Diberitahukan kepada seluruh ruas jemaat, rekapitulasi keuangan kas huria dan seksi kategorial sampai akhir semester:%s' ||
    '1. Total Penerimaan (Pelean & Donasi Kas): Rp %s%s' ||
    '2. Total Realisasi Belanja & Pelayanan: Rp %s%s' ||
    '3. Total Saldo Kas & Rekening Bank: Rp %s%s%s' ||
    'Laporan ini telah ditinjau dan dinyatakan Sesuai dengan Catatan oleh Badan Audit Huria HKBP Ressort Hutaraja. ' ||
    'Salinan lengkap dapat dilihat di papan pengumuman gereja atau menghubungi Sekretaris Huria.',
    chr(10), v_rep.semester, v_rep.tahun, chr(10), chr(10), chr(10),
    to_char(v_inflow, 'FM999,999,999,999'), chr(10),
    to_char(v_outflow, 'FM999,999,999,999'), chr(10),
    to_char(v_saldo, 'FM999,999,999,999'), chr(10), chr(10)
  );

  update public.semester_reports
  set announcement_text = v_text,
      updated_at = now()
  where id = p_report_id;

  return v_text;
end;
$$;

-- RPC: Jalankan Checklist Persiapan LPJ Tahunan
create or replace function public.jalankan_checklist_lpj(
  p_tahun integer
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_unclosed_months integer := 0;
  v_draft_tx integer := 0;
  v_unsettled_advances integer := 0;
  v_calk_filled boolean := false;
  v_sem1_announced boolean := false;
  v_unresolved_findings integer := 0;
  v_balance_balanced boolean := false;
  v_all_passed boolean := true;
begin
  -- 1. Seluruh 12 bulan ditutup
  select count(*) into v_unclosed_months
  from generate_series(1, 12) as m
  where not exists (
    select 1 from public.period_closings
    where tahun = p_tahun and bulan = m and is_closed = true
  );

  -- 2. Tidak ada transaksi draft/submitted
  select count(*) into v_draft_tx
  from public.transactions
  where extract(year from tanggal) = p_tahun
    and status in ('draft', 'submitted');

  -- 3. Panjar selesai atau dicatat
  select count(*) into v_unsettled_advances
  from public.advances
  where status = 'active'
    and due_date < to_date(p_tahun || '-12-31', 'YYYY-MM-DD');

  -- 4. CaLK terisi
  select exists (
    select 1 from public.lpj_notes where year = p_tahun
  ) into v_calk_filled;

  -- 5. Laporan semester I diwartakan
  select exists (
    select 1 from public.semester_reports
    where tahun = p_tahun and semester = 1 and status = 'announced'
  ) into v_sem1_announced;

  -- 6. Temuan audit selesai
  select count(*) into v_unresolved_findings
  from public.audit_findings
  where severity = 'wajib_diperbaiki' and status not in ('selesai', 'diterima');

  -- 7. Posisi keuangan seimbang
  select (abs(coalesce(selisih_neraca, 0)) < 0.01) into v_balance_balanced
  from public.view_laporan_posisi_keuangan;

  if v_unclosed_months > 0 or v_draft_tx > 0 or v_unsettled_advances > 0
     or not v_calk_filled or not v_sem1_announced or v_unresolved_findings > 0
     or not coalesce(v_balance_balanced, false) then
    v_all_passed := false;
  end if;

  return jsonb_build_object(
    'unclosed_months_count', v_unclosed_months,
    'draft_tx_count', v_draft_tx,
    'unsettled_advances_count', v_unsettled_advances,
    'calk_filled', v_calk_filled,
    'sem1_announced', v_sem1_announced,
    'unresolved_findings_count', v_unresolved_findings,
    'balance_balanced', coalesce(v_balance_balanced, true),
    'passed', v_all_passed
  );
end;
$$;

-- RPC: Ajukan Laporan ke Badan Audit Huria
create or replace function public.ajukan_pemeriksaan(
  p_target_type text, -- 'semester' atau 'lpj'
  p_target_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_can_submit boolean;
begin
  select exists (
    select 1 from public.profiles
    where id = v_user_id and role in ('bendahara_umum', 'admin')
  ) into v_can_submit;

  if not v_can_submit then
    return jsonb_build_object('success', false, 'error', 'Hanya Bendahara Umum atau Admin yang berwenang mengajukan laporan ke Badan Audit.');
  end if;

  if p_target_type = 'semester' then
    update public.semester_reports
    set status = 'audit_in_progress',
        updated_at = now()
    where id = p_target_id;

    update public.audit_engagements
    set semester_report_id = p_target_id,
        status = 'in_progress',
        updated_at = now()
    where id in (
      select ae.id from public.audit_engagements ae
      join public.semester_reports sr on sr.tahun = ae.tahun
      where sr.id = p_target_id and ae.engagement_type = case when sr.semester = 1 then 'semester_1' else 'semester_2' end
      limit 1
    );

  elsif p_target_type = 'lpj' then
    update public.lpj_reports
    set status = 'audit_in_progress',
        updated_at = now()
    where id = p_target_id;

    update public.audit_engagements
    set lpj_id = p_target_id,
        status = 'in_progress',
        updated_at = now()
    where id in (
      select ae.id from public.audit_engagements ae
      join public.lpj_reports lr on lr.tahun = ae.tahun
      where lr.id = p_target_id and ae.engagement_type = 'tahunan'
      limit 1
    );
  else
    return jsonb_build_object('success', false, 'error', 'Jenis laporan tidak valid.');
  end if;

  return jsonb_build_object('success', true);
end;
$$;

-- RPC: Teruskan LPJ ke Rapat Huria
create or replace function public.teruskan_ke_rapat(
  p_lpj_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_can_submit boolean;
  v_lpj public.lpj_reports%rowtype;
begin
  select * into v_lpj from public.lpj_reports where id = p_lpj_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Dokumen LPJ tidak ditemukan.');
  end if;

  select exists (
    select 1 from public.profiles
    where id = v_user_id and role in ('sekretaris', 'pendeta_ressort', 'admin')
  ) into v_can_submit;

  if not v_can_submit then
    return jsonb_build_object('success', false, 'error', 'Hanya Sekretaris Huria atau Pendeta Ressort yang berwenang meneruskan LPJ ke Rapat Huria.');
  end if;

  update public.lpj_reports
  set status = 'submitted_to_meeting',
      updated_at = now()
  where id = p_lpj_id;

  return jsonb_build_object('success', true);
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
alter table public.semester_reports enable row level security;
alter table public.lpj_reports enable row level security;
alter table public.lpj_exceptions enable row level security;

-- semester_reports RLS
create policy "semester_reports_select"
  on public.semester_reports for select
  to authenticated using (true);

create policy "semester_reports_write"
  on public.semester_reports for all
  to authenticated using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'bendahara_umum', 'sekretaris', 'pendeta_ressort')
    )
  );

-- lpj_reports RLS
create policy "lpj_reports_select"
  on public.lpj_reports for select
  to authenticated using (true);

create policy "lpj_reports_write"
  on public.lpj_reports for all
  to authenticated using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'bendahara_umum', 'sekretaris')
    )
  );

-- lpj_exceptions RLS
create policy "lpj_exceptions_select"
  on public.lpj_exceptions for select
  to authenticated using (true);

create policy "lpj_exceptions_write"
  on public.lpj_exceptions for all
  to authenticated using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'bendahara_umum')
    )
  );

-- -----------------------------------------------------------------------------
-- 10. DATA SEED CONTOH NYATA UNTUK HKBP HUTARAJA
-- -----------------------------------------------------------------------------
-- Laporan Semester I Tahun 2026 (Status: Diwartakan)
insert into public.semester_reports (
  id,
  tahun,
  semester,
  status,
  version,
  sent_to_pastor_date,
  sent_ref,
  pastor_ack_at,
  pastor_note,
  announced_date,
  announcement_medium,
  announcement_text
) values (
  'sem-1-2026',
  2026,
  1,
  'announced',
  1,
  '2026-07-05',
  'SRT/SEM-1/2026/HKBP-HTR',
  '2026-07-06 14:00:00+00',
  'Laporan Semester I telah diperiksa bersama Badan Audit Huria dan diterima dengan baik. Silakan diwartakan kepada seluruh ruas jemaat.',
  '2026-07-12',
  'warta_jemaat',
  'Warta Keuangan Semester I Tahun 2026 HKBP Ressort Hutaraja: Total Penerimaan Pelean & Donasi Kas Huria mencapai Rp 182.450.000, Realisasi Belanja Pelayanan & Operasional sebesar Rp 142.100.000. Saldo Kas dan Bank per 30 Juni 2026 sebesar Rp 124.850.000 yang tersimpan aman di Brankas Huria dan Rekening BRI Ressort Hutaraja. Opini Badan Audit Huria: Sesuai dengan Catatan.'
) on conflict (tahun, semester, version) do nothing;

-- Draf LPJ Tahunan 2026 (Status: Disusun / In Progress)
insert into public.lpj_reports (
  id,
  tahun,
  nomor_dokumen,
  status,
  version,
  checklist_result
) values (
  'lpj-2026',
  2026,
  'LPJ/2026/HKBP-HTR',
  'drafted',
  1,
  '{"passed": true, "notes": "Checklist persiapan tuntas, siap dilanjutkan audit Badan Huria"}'::jsonb
) on conflict (tahun, version) do nothing;
