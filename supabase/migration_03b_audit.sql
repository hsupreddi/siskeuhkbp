-- =============================================================================
-- SIKU HKBP Hutaraja - Migration 03b: Modul Badan Audit Huria (Internal Audit)
-- =============================================================================
-- Migrasi ini aman dijalankan di atas schema.sql, migration_04_saldo_awal.sql,
-- dan migration_03a_data_lpj.sql tanpa merusak fitur dan data sebelumnya.

-- -----------------------------------------------------------------------------
-- 1. TABEL ANGGOTA BADAN AUDIT HURIA (AUDIT BODY MEMBERS)
-- -----------------------------------------------------------------------------
-- Badan Audit Huria beranggotakan tepat 3 orang aktif: 1 Ketua dan 2 Anggota.
-- Anggota Badan Audit independen: dilarang merangkap jabatan sebagai Bendahara Umum,
-- Pendeta Ressort, Sekretaris Huria, atau pengurus kas mana pun.
create table if not exists public.audit_body_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  jabatan text not null check (jabatan in ('ketua', 'anggota')),
  periode_mulai date not null default current_date,
  periode_selesai date not null default (current_date + interval '2 years'),
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, periode_mulai)
);

-- -----------------------------------------------------------------------------
-- 2. TABEL PENUGASAN PEMERIKSAAN (AUDIT ENGAGEMENTS)
-- -----------------------------------------------------------------------------
-- 3 periode pemeriksaan per tahun: Semester I, Semester II, LPJ Tahunan, serta
-- Saldo Awal ('opening') sekali di awal pemakaian.
create table if not exists public.audit_engagements (
  id uuid primary key default gen_random_uuid(),
  tahun integer not null check (tahun >= 2000 and tahun <= 2100),
  jenis text not null check (jenis in ('opening', 'semester_1', 'semester_2', 'tahunan')),
  judul text not null,
  deskripsi text,
  semester_report_id uuid, -- nullable, tabel dibuat pada modul laporan semester
  lpj_id uuid,             -- nullable, tabel dibuat pada modul LPJ
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'completed', 'cancelled')),
  dibuka_pada date not null default current_date,
  batas_waktu date not null,
  berita_acara_url text,
  combined_with_lpj boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tahun, jenis)
);

-- -----------------------------------------------------------------------------
-- 3. TABEL TINJAUAN AUDITOR INDIVIDUAL (AUDIT REVIEWS)
-- -----------------------------------------------------------------------------
-- Tepat satu baris per anggota Badan Audit per engagement.
-- Setiap anggota mengisi catatan per bagian pos keuangan dan opini pribadinya.
create table if not exists public.audit_reviews (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.audit_engagements(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete restrict,
  notes_per_section jsonb not null default '{}'::jsonb,
  general_notes text,
  personal_opinion text not null check (personal_opinion in ('sesuai', 'sesuai_dengan_catatan', 'perlu_perbaikan')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (engagement_id, member_id)
);

-- -----------------------------------------------------------------------------
-- 4. TABEL TEMUAN AUDIT (AUDIT FINDINGS)
-- -----------------------------------------------------------------------------
-- Temuan tingkat "informasi" atau "wajib_diperbaiki".
-- Temuan wajib_diperbaiki harus diselesaikan atau diterima beralasan sebelum engagement ditutup.
-- Temuan yang belum selesai terbawa ke pemeriksaan berikutnya (carried_from_finding_id).
create table if not exists public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.audit_engagements(id) on delete cascade,
  kas_id uuid references public.kas(id) on delete set null,
  kode text unique not null,
  title text not null,
  description text not null,
  severity text not null default 'informasi' check (severity in ('informasi', 'wajib_diperbaiki')),
  status text not null default 'terbuka' check (status in ('terbuka', 'ditanggapi', 'selesai', 'diterima')),
  carried_from_finding_id uuid references public.audit_findings(id) on delete set null,
  due_date date,
  response_notes text,
  response_by uuid references public.profiles(id),
  responded_at timestamptz,
  closed_by uuid references public.profiles(id),
  closed_at timestamptz,
  closing_notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 5. TABEL OPINI FINAL & BERITA ACARA (AUDIT FINAL OPINIONS)
-- -----------------------------------------------------------------------------
-- Opini final ditentukan oleh suara terbanyak (minimal 2 dari 3 anggota).
-- Opini final baru dihitung sah jika ketiga anggota telah menginput review.
create table if not exists public.audit_final_opinions (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null unique references public.audit_engagements(id) on delete cascade,
  final_opinion text not null check (final_opinion in ('sesuai', 'sesuai_dengan_catatan', 'perlu_perbaikan')),
  vote_breakdown jsonb not null default '{}'::jsonb,
  has_dissenting_opinion boolean not null default false,
  dissenting_opinion_notes text,
  berita_acara_no text not null,
  berita_acara_date date not null default current_date,
  berita_acara_url text,
  signatories jsonb not null default '[]'::jsonb,
  finalized_by uuid references public.profiles(id),
  finalized_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 6. TABEL OPNAME KAS FISIK (CASH COUNTS)
-- -----------------------------------------------------------------------------
-- Pencatatan pemeriksaan kas fisik mendadak oleh auditor.
-- Bila terdapat selisih (difference != 0), sistem otomatis membuat draf temuan audit.
create table if not exists public.cash_counts (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null default current_date,
  kas_id uuid not null references public.kas(id) on delete restrict,
  storage_account_id uuid not null references public.storage_accounts(id) on delete restrict,
  book_balance numeric(15,2) not null check (book_balance >= 0),
  physical_balance numeric(15,2) not null check (physical_balance >= 0),
  difference numeric(15,2) generated always as (physical_balance - book_balance) stored,
  cash_breakdown jsonb default '{}'::jsonb,
  explanation text,
  photo_url text,
  auditor_id uuid not null references public.profiles(id),
  witness_name text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 7. INDEXES
-- -----------------------------------------------------------------------------
create index if not exists idx_audit_members_active on public.audit_body_members(aktif, jabatan);
create index if not exists idx_audit_engagements_year on public.audit_engagements(tahun, jenis);
create index if not exists idx_audit_reviews_eng on public.audit_reviews(engagement_id);
create index if not exists idx_audit_findings_eng on public.audit_findings(engagement_id, status);
create index if not exists idx_audit_findings_kas on public.audit_findings(kas_id);
create index if not exists idx_cash_counts_kas on public.cash_counts(kas_id, tanggal);

-- -----------------------------------------------------------------------------
-- 8. STORAGE BUCKET: audit-docs (Private)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('audit-docs', 'audit-docs', false)
on conflict (id) do nothing;

create policy "Audit docs bucket read access"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'audit-docs');

create policy "Audit docs bucket insert access"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'audit-docs');

create policy "Audit docs bucket update access"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'audit-docs');

-- -----------------------------------------------------------------------------
-- 9. TRIGGERS: INDEPENDENSI, KOMPOSISI, & SELISIH OPNAME
-- -----------------------------------------------------------------------------

-- Trigger A: Cek independensi anggota Badan Audit (dilarang merangkap bendahara/ketua/pimpinan)
create or replace function public.fn_check_audit_member_independence()
returns trigger
language plpgsql
security definer
as $$
declare
  v_role text;
  v_has_kas_assignment boolean;
begin
  -- Cek role global pengguna
  select role into v_role from public.profiles where id = new.user_id;
  if v_role in ('bendahara_umum', 'pendeta_ressort', 'sekretaris') then
    raise exception 'Independensi Badan Audit: Pengguna dengan jabatan % tidak diperbolehkan menjadi anggota Badan Audit Huria.', v_role;
  end if;

  -- Cek penugasan kas seksi
  select exists (
    select 1 from public.user_kas_access where user_id = new.user_id
  ) into v_has_kas_assignment;

  if v_has_kas_assignment then
    raise exception 'Independensi Badan Audit: Pengguna yang sedang menjabat sebagai bendahara atau ketua pada kas seksi tidak boleh merangkap sebagai anggota Badan Audit Huria.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_audit_member_independence on public.audit_body_members;
create trigger trg_audit_member_independence
  before insert or update on public.audit_body_members
  for each row
  execute function public.fn_check_audit_member_independence();

-- Trigger B: Larangan menugaskan anggota Badan Audit aktif ke kas seksi
create or replace function public.fn_prevent_audit_member_kas_assignment()
returns trigger
language plpgsql
security definer
as $$
declare
  v_is_active_auditor boolean;
begin
  select exists (
    select 1 from public.audit_body_members
    where user_id = new.user_id and aktif = true
  ) into v_is_active_auditor;

  if v_is_active_auditor then
    raise exception 'Pengguna sedang menjabat sebagai anggota aktif Badan Audit Huria dan tidak diperbolehkan merangkap sebagai bendahara/ketua kas.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_audit_member_kas_assignment on public.user_kas_access;
create trigger trg_prevent_audit_member_kas_assignment
  before insert or update on public.user_kas_access
  for each row
  execute function public.fn_prevent_audit_member_kas_assignment();

-- Trigger C: Cek komposisi anggota aktif (tepat 3 orang aktif, tepat 1 ketua)
create or replace function public.fn_check_audit_body_composition()
returns trigger
language plpgsql
security definer
as $$
declare
  v_active_count integer;
  v_ketua_count integer;
begin
  if new.aktif = true then
    select count(*) into v_active_count
    from public.audit_body_members
    where aktif = true and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if v_active_count >= 3 then
      raise exception 'Badan Audit Huria dibatasi tepat 3 anggota aktif. Nonaktifkan anggota lama terlebih dahulu.';
    end if;

    if new.jabatan = 'ketua' then
      select count(*) into v_ketua_count
      from public.audit_body_members
      where aktif = true and jabatan = 'ketua' and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

      if v_ketua_count >= 1 then
        raise exception 'Badan Audit Huria hanya boleh memiliki tepat 1 orang Ketua aktif.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_audit_body_composition on public.audit_body_members;
create trigger trg_audit_body_composition
  before insert or update on public.audit_body_members
  for each row
  execute function public.fn_check_audit_body_composition();

-- Trigger D: Selisih opname kas otomatis membuat draf temuan audit
create or replace function public.fn_auto_create_finding_on_cash_count()
returns trigger
language plpgsql
security definer
as $$
declare
  v_active_eng_id uuid;
  v_kas_nama text;
  v_storage_nama text;
  v_diff_text text;
begin
  if new.difference != 0 then
    -- Cari engagement pemeriksaan yang sedang in_progress atau aktif di tahun berjalan
    select id into v_active_eng_id
    from public.audit_engagements
    where tahun = extract(year from new.tanggal) and status in ('in_progress', 'draft')
    order by case when status = 'in_progress' then 1 else 2 end, opened_at desc
    limit 1;

    if v_active_eng_id is null then
      -- Buat engagement darurat jika belum ada
      insert into public.audit_engagements (
        tahun,
        jenis,
        judul,
        deskripsi,
        status,
        dibuka_pada,
        batas_waktu
      ) values (
        extract(year from new.tanggal),
        'semester_1',
        'Pemeriksaan Semester I ' || extract(year from new.tanggal)::text,
        'Pemeriksaan rutin semesteran Badan Audit Huria',
        'in_progress',
        current_date,
        current_date + interval '30 days'
      )
      on conflict (tahun, jenis) do update set status = 'in_progress'
      returning id into v_active_eng_id;
    end if;

    select nama into v_kas_nama from public.kas where id = new.kas_id;
    select nama into v_storage_nama from public.storage_accounts where id = new.storage_account_id;

    v_diff_text := case
      when new.difference < 0 then 'Kekurangan fisik kas sebesar Rp ' || to_char(abs(new.difference), 'FM999,999,999,999')
      else 'Kelebihan fisik kas sebesar Rp ' || to_char(new.difference, 'FM999,999,999,999')
    end;

    insert into public.audit_findings (
      engagement_id,
      kas_id,
      kode,
      title,
      description,
      severity,
      status,
      due_date,
      created_by
    ) values (
      v_active_eng_id,
      new.kas_id,
      'TMN-OPN-' || substr(new.id::text, 1, 6),
      'Selisih Opname Kas Fisik: ' || coalesce(v_kas_nama, 'Kas Seksi') || ' (' || coalesce(v_storage_nama, 'Brankas') || ')',
      v_diff_text || '. Hasil penghitungan fisik per ' || to_char(new.tanggal, 'DD/MM/YYYY') || ': Buku Rp ' || to_char(new.book_balance, 'FM999,999,999,999') || ', Fisik Rp ' || to_char(new.physical_balance, 'FM999,999,999,999') || '. Catatan auditor: ' || coalesce(new.explanation, 'Wajib ditelusuri kwitansi gantung.'),
      'wajib_diperbaiki',
      'terbuka',
      new.tanggal + interval '7 days',
      new.auditor_id
    )
    on conflict (kode) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auto_create_finding_on_cash_count on public.cash_counts;
create trigger trg_auto_create_finding_on_cash_count
  after insert on public.cash_counts
  for each row
  execute function public.fn_auto_create_finding_on_cash_count();

-- -----------------------------------------------------------------------------
-- 10. RPC FUNCTIONS UNTUK ALUR AUDIT
-- -----------------------------------------------------------------------------

-- RPC: Anggota Badan Audit Mengisi Hasil Pemeriksaan & Opini Pribadi
create or replace function public.isi_pemeriksaan(
  p_engagement_id uuid,
  p_notes_per_section jsonb,
  p_general_notes text,
  p_personal_opinion text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_member boolean;
  v_eng public.audit_engagements%rowtype;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Pengguna belum terautentikasi.');
  end if;

  select * into v_eng from public.audit_engagements where id = p_engagement_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Penugasan audit tidak ditemukan.');
  end if;

  if v_eng.status = 'completed' then
    return jsonb_build_object('success', false, 'error', 'Pemeriksaan telah selesai dan dikunci.');
  end if;

  -- Periksa apakah user adalah anggota Badan Audit yang aktif
  select exists (
    select 1 from public.audit_body_members
    where user_id = v_user_id and aktif = true
      and current_date between periode_mulai and periode_selesai
  ) into v_is_member;

  if not v_is_member then
    -- Admin cadangan
    select exists (
      select 1 from public.profiles where id = v_user_id and role = 'admin'
    ) into v_is_member;
  end if;

  if not v_is_member then
    return jsonb_build_object('success', false, 'error', 'Hanya anggota aktif Badan Audit Huria yang berwenang mengisi hasil pemeriksaan.');
  end if;

  insert into public.audit_reviews (
    engagement_id,
    member_id,
    notes_per_section,
    general_notes,
    personal_opinion,
    submitted_at,
    updated_at
  ) values (
    p_engagement_id,
    v_user_id,
    coalesce(p_notes_per_section, '{}'::jsonb),
    p_general_notes,
    p_personal_opinion,
    now(),
    now()
  )
  on conflict (engagement_id, member_id) do update set
    notes_per_section = excluded.notes_per_section,
    general_notes = excluded.general_notes,
    personal_opinion = excluded.personal_opinion,
    submitted_at = now(),
    updated_at = now();

  return jsonb_build_object('success', true);
end;
$$;

-- RPC: Bendahara atau Ketua Kas Menanggapi Temuan
create or replace function public.tanggapi_temuan(
  p_finding_id uuid,
  p_response_notes text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_f public.audit_findings%rowtype;
  v_can_respond boolean;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Pengguna belum terautentikasi.');
  end if;

  select * into v_f from public.audit_findings where id = p_finding_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Temuan audit tidak ditemukan.');
  end if;

  if coalesce(trim(p_response_notes), '') = '' then
    return jsonb_build_object('success', false, 'error', 'Tanggapan penjelasan wajib diisi.');
  end if;

  -- Periksa hak respon kas terkait atau bendahara umum
  if v_f.kas_id is not null then
    select exists (
      select 1 from public.user_kas_access
      where user_id = v_user_id and kas_id = v_f.kas_id
    ) into v_can_respond;
  end if;

  if not v_can_respond then
    select exists (
      select 1 from public.profiles
      where id = v_user_id and role in ('admin', 'bendahara_umum', 'pendeta_ressort')
    ) into v_can_respond;
  end if;

  if not v_can_respond then
    return jsonb_build_object('success', false, 'error', 'Anda tidak memiliki wewenang menanggapi temuan kas ini.');
  end if;

  update public.audit_findings
  set status = 'ditanggapi',
      response_notes = p_response_notes,
      response_by = v_user_id,
      responded_at = now(),
      updated_at = now()
  where id = p_finding_id;

  return jsonb_build_object('success', true);
end;
$$;

-- RPC: Badan Audit Menutup Temuan (Selesai / Diterima)
create or replace function public.tutup_temuan(
  p_finding_id uuid,
  p_status text, -- 'selesai' | 'diterima'
  p_closing_notes text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_auditor boolean;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Pengguna belum terautentikasi.');
  end if;

  if p_status not in ('selesai', 'diterima') then
    return jsonb_build_object('success', false, 'error', 'Status penutupan temuan harus selesai atau diterima.');
  end if;

  select exists (
    select 1 from public.audit_body_members
    where user_id = v_user_id and aktif = true
  ) into v_is_auditor;

  if not v_is_auditor then
    select exists (
      select 1 from public.profiles where id = v_user_id and role = 'admin'
    ) into v_is_auditor;
  end if;

  if not v_is_auditor then
    return jsonb_build_object('success', false, 'error', 'Hanya anggota aktif Badan Audit yang berwenang menutup temuan.');
  end if;

  update public.audit_findings
  set status = p_status,
      closed_by = v_user_id,
      closed_at = now(),
      closing_notes = p_closing_notes,
      updated_at = now()
  where id = p_finding_id;

  return jsonb_build_object('success', true);
end;
$$;

-- RPC: Penetapan Opini Final Audit (Majority Rule: Min 2 dari 3 Suara)
create or replace function public.tetapkan_opini_final_audit(
  p_engagement_id uuid,
  p_berita_acara_no text,
  p_berita_acara_url text default null,
  p_dissenting_notes text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_eng public.audit_engagements%rowtype;
  v_active_members_count integer;
  v_review_count integer;
  v_count_sesuai integer := 0;
  v_count_catatan integer := 0;
  v_count_perbaikan integer := 0;
  v_final_opinion text;
  v_has_dissenting boolean := false;
  v_open_findings integer;
  v_is_chairperson boolean;
  v_signatories jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Pengguna belum terautentikasi.');
  end if;

  select * into v_eng from public.audit_engagements where id = p_engagement_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Engagement audit tidak ditemukan.');
  end if;

  -- Periksa apakah user adalah Ketua Badan Audit atau Admin
  select exists (
    select 1 from public.audit_body_members
    where user_id = v_user_id and aktif = true and jabatan = 'ketua'
  ) into v_is_chairperson;

  if not v_is_chairperson then
    select exists (
      select 1 from public.profiles where id = v_user_id and role = 'admin'
    ) into v_is_chairperson;
  end if;

  if not v_is_chairperson then
    return jsonb_build_object('success', false, 'error', 'Hanya Ketua Badan Audit Huria yang berwenang menetapkan dan mengesahkan Berita Acara Opini Final.');
  end if;

  -- Hitung review anggota aktif (wajib 3 review masuk)
  select count(*) into v_review_count
  from public.audit_reviews
  where engagement_id = p_engagement_id;

  if v_review_count < 3 then
    return jsonb_build_object(
      'success', false,
      'error', 'Opini final belum dapat dihitung karena baru ' || v_review_count::text || ' dari 3 anggota Badan Audit yang memasukkan review pribadi.'
    );
  end if;

  -- Hitung sebaran suara opini
  select count(*) into v_count_sesuai
  from public.audit_reviews where engagement_id = p_engagement_id and personal_opinion = 'sesuai';

  select count(*) into v_count_catatan
  from public.audit_reviews where engagement_id = p_engagement_id and personal_opinion = 'sesuai_dengan_catatan';

  select count(*) into v_count_perbaikan
  from public.audit_reviews where engagement_id = p_engagement_id and personal_opinion = 'perlu_perbaikan';

  -- Majority rule: minimal 2 suara sama
  if v_count_sesuai >= 2 then
    v_final_opinion := 'sesuai';
  elsif v_count_catatan >= 2 then
    v_final_opinion := 'sesuai_dengan_catatan';
  elsif v_count_perbaikan >= 2 then
    v_final_opinion := 'perlu_perbaikan';
  else
    return jsonb_build_object(
      'success', false,
      'error', 'Tidak tercapai suara terbanyak (1 Sesuai, 1 Sesuai Catatan, 1 Perlu Perbaikan). Diperlukan musyawarah anggota untuk menyepakati minimal 2 suara sama.'
    );
  end if;

  -- Deteksi pendapat berbeda (dissenting opinion)
  if (v_count_sesuai = 2 or v_count_catatan = 2 or v_count_perbaikan = 2) then
    v_has_dissenting := true;
  end if;

  -- Periksa temuan wajib diperbaiki yang masih terbuka
  select count(*) into v_open_findings
  from public.audit_findings
  where engagement_id = p_engagement_id
    and severity = 'wajib_diperbaiki'
    and status not in ('selesai', 'diterima');

  if v_open_findings > 0 and v_final_opinion != 'perlu_perbaikan' then
    return jsonb_build_object(
      'success', false,
      'error', 'Masih terdapat ' || v_open_findings::text || ' temuan wajib diperbaiki yang belum selesai ditindaklanjuti.'
    );
  end if;

  -- Siapkan data penandatangan
  select jsonb_agg(
    jsonb_build_object(
      'user_id', p.id,
      'full_name', p.full_name,
      'jabatan', abm.jabatan,
      'personal_opinion', ar.personal_opinion
    )
  ) into v_signatories
  from public.audit_body_members abm
  join public.profiles p on p.id = abm.user_id
  left join public.audit_reviews ar on ar.member_id = p.id and ar.engagement_id = p_engagement_id
  where abm.aktif = true;

  -- Simpan opini final
  insert into public.audit_final_opinions (
    engagement_id,
    final_opinion,
    vote_breakdown,
    has_dissenting_opinion,
    dissenting_opinion_notes,
    berita_acara_no,
    berita_acara_date,
    berita_acara_url,
    signatories,
    finalized_by,
    finalized_at
  ) values (
    p_engagement_id,
    v_final_opinion,
    jsonb_build_object(
      'sesuai', v_count_sesuai,
      'sesuai_dengan_catatan', v_count_catatan,
      'perlu_perbaikan', v_count_perbaikan
    ),
    v_has_dissenting,
    p_dissenting_notes,
    p_berita_acara_no,
    current_date,
    p_berita_acara_url,
    coalesce(v_signatories, '[]'::jsonb),
    v_user_id,
    now()
  )
  on conflict (engagement_id) do update set
    final_opinion = excluded.final_opinion,
    vote_breakdown = excluded.vote_breakdown,
    has_dissenting_opinion = excluded.has_dissenting_opinion,
    dissenting_opinion_notes = excluded.dissenting_opinion_notes,
    berita_acara_no = excluded.berita_acara_no,
    berita_acara_url = excluded.berita_acara_url,
    signatories = excluded.signatories,
    finalized_by = excluded.finalized_by,
    finalized_at = now();

  -- Perbarui status engagement menjadi completed
  update public.audit_engagements
  set status = 'completed',
      berita_acara_url = p_berita_acara_url,
      updated_at = now()
  where id = p_engagement_id;

  return jsonb_build_object(
    'success', true,
    'final_opinion', v_final_opinion,
    'vote_breakdown', jsonb_build_object(
      'sesuai', v_count_sesuai,
      'sesuai_dengan_catatan', v_count_catatan,
      'perlu_perbaikan', v_count_perbaikan
    )
  );
end;
$$;

-- RPC: Catat Pemeriksaan Kas Fisik (Opname Kas)
create or replace function public.catat_opname_kas(
  p_kas_id uuid,
  p_storage_id uuid,
  p_tanggal date,
  p_book_balance numeric,
  p_physical_balance numeric,
  p_breakdown jsonb default '{}'::jsonb,
  p_explanation text default null,
  p_photo_url text default null,
  p_witness text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_auditor boolean;
  v_new_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Pengguna belum terautentikasi.');
  end if;

  select exists (
    select 1 from public.audit_body_members
    where user_id = v_user_id and aktif = true
  ) into v_is_auditor;

  if not v_is_auditor then
    select exists (
      select 1 from public.profiles where id = v_user_id and role = 'admin'
    ) into v_is_auditor;
  end if;

  if not v_is_auditor then
    return jsonb_build_object('success', false, 'error', 'Hanya anggota aktif Badan Audit Huria yang berwenang mencatat opname kas fisik.');
  end if;

  insert into public.cash_counts (
    tanggal,
    kas_id,
    storage_account_id,
    book_balance,
    physical_balance,
    cash_breakdown,
    explanation,
    photo_url,
    auditor_id,
    witness_name
  ) values (
    coalesce(p_tanggal, current_date),
    p_kas_id,
    p_storage_id,
    p_book_balance,
    p_physical_balance,
    coalesce(p_breakdown, '{}'::jsonb),
    p_explanation,
    p_photo_url,
    v_user_id,
    p_witness
  )
  returning id into v_new_id;

  return jsonb_build_object('success', true, 'id', v_new_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
alter table public.audit_body_members enable row level security;
alter table public.audit_engagements enable row level security;
alter table public.audit_reviews enable row level security;
alter table public.audit_findings enable row level security;
alter table public.audit_final_opinions enable row level security;
alter table public.cash_counts enable row level security;

-- audit_body_members: Read all, write by admin
create policy "audit_body_members_select"
  on public.audit_body_members for select
  to authenticated using (true);

create policy "audit_body_members_admin_write"
  on public.audit_body_members for all
  to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- audit_engagements: Read all authenticated, write by audit members & admin
create policy "audit_engagements_select"
  on public.audit_engagements for select
  to authenticated using (true);

create policy "audit_engagements_write"
  on public.audit_engagements for all
  to authenticated using (
    exists (select 1 from public.audit_body_members where user_id = auth.uid() and aktif = true)
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- audit_reviews: Read all authenticated, write by owner auditor
create policy "audit_reviews_select"
  on public.audit_reviews for select
  to authenticated using (true);

create policy "audit_reviews_write"
  on public.audit_reviews for all
  to authenticated using (
    member_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- audit_findings: Read all, write by audit members, respond by kas handlers
create policy "audit_findings_select"
  on public.audit_findings for select
  to authenticated using (true);

create policy "audit_findings_write"
  on public.audit_findings for all
  to authenticated using (
    exists (select 1 from public.audit_body_members where user_id = auth.uid() and aktif = true)
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'bendahara_umum'))
    or (kas_id is not null and exists (select 1 from public.user_kas_access where user_id = auth.uid() and kas_id = audit_findings.kas_id))
  );

-- audit_final_opinions: Read all, write by chairperson / admin
create policy "audit_final_opinions_select"
  on public.audit_final_opinions for select
  to authenticated using (true);

create policy "audit_final_opinions_write"
  on public.audit_final_opinions for all
  to authenticated using (
    exists (select 1 from public.audit_body_members where user_id = auth.uid() and aktif = true and jabatan = 'ketua')
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- cash_counts: Read all, write by audit members
create policy "cash_counts_select"
  on public.cash_counts for select
  to authenticated using (true);

create policy "cash_counts_write"
  on public.cash_counts for all
  to authenticated using (
    exists (select 1 from public.audit_body_members where user_id = auth.uid() and aktif = true)
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- -----------------------------------------------------------------------------
-- 12. DATA SEED AUDIT BADAN HURIA HKBP HUTARAJA
-- -----------------------------------------------------------------------------
-- 1. Tambah Profil Auditor Independen jika belum ada
insert into public.profiles (id, email, full_name, role, phone, is_active)
values
  ('user-audit-1', 'audit.ketua@hkbp-hutaraja.org', 'St. D. Simatupang (Ketua Audit)', 'majelis', '0812-7001-0001', true),
  ('user-audit-2', 'audit.anggota1@hkbp-hutaraja.org', 'Bpk. K. Siregar, SE, Ak (Anggota Audit)', 'majelis', '0812-7002-0002', true),
  ('user-audit-3', 'audit.anggota2@hkbp-hutaraja.org', 'Ny. R. boru Tobing, S.Ak (Anggota Audit)', 'majelis', '0812-7003-0003', true)
on conflict (id) do nothing;

-- 2. Keanggotaan Badan Audit Huria (Tepat 3 Anggota: 1 Ketua, 2 Anggota)
insert into public.audit_body_members (id, user_id, jabatan, periode_mulai, periode_selesai, aktif)
values
  ('abm-1', 'user-audit-1', 'ketua', '2026-01-01', '2027-12-31', true),
  ('abm-2', 'user-audit-2', 'anggota', '2026-01-01', '2027-12-31', true),
  ('abm-3', 'user-audit-3', 'anggota', '2026-01-01', '2027-12-31', true)
on conflict (id) do nothing;

-- 3. Engagement Pemeriksaan Saldo Awal ('opening')
insert into public.audit_engagements (
  id,
  tahun,
  jenis,
  judul,
  deskripsi,
  status,
  dibuka_pada,
  batas_waktu
) values (
  'eng-opening-2026',
  2026,
  'opening',
  'Pemeriksaan Saldo Awal & Pembukaan Buku 2026',
  'Pemeriksaan keabsahan saldo pindahan per 31 Desember 2025 dari buku kas manual gereja ke sistem SIKU',
  'completed',
  '2026-01-02',
  '2026-01-15'
) on conflict (tahun, jenis) do nothing;

-- 4. Review 3 Anggota untuk Pemeriksaan Saldo Awal
insert into public.audit_reviews (
  engagement_id,
  member_id,
  notes_per_section,
  general_notes,
  personal_opinion,
  submitted_at
) values
  (
    'eng-opening-2026',
    'user-audit-1',
    '{"kas_bank": "Saldo kas tunai dan rekening BRI/Mandiri cocok dengan buku manual.", "rekonsiliasi": "Terdapat selisih Rp 150.000 pada Kas Sekolah Minggu yang telah diberi penjelasan kas bon lilin.", "inventaris": "Daftar inventaris awal memadai."}'::jsonb,
    'Secara umum saldo pindahan telah diverifikasi fisik dengan baik.',
    'sesuai_dengan_catatan',
    '2026-01-10 10:00:00+00'
  ),
  (
    'eng-opening-2026',
    'user-audit-2',
    '{"kas_bank": "Rekening koran bank per 31 Desember telah diverifikasi valid.", "rekonsiliasi": "Selisih fisik kas tunai telah dilampiri surat pernyataan bendahara seksi."}'::jsonb,
    'Dokumen pendukung lengkap dan dapat dipertanggungjawabkan.',
    'sesuai',
    '2026-01-11 11:30:00+00'
  ),
  (
    'eng-opening-2026',
    'user-audit-3',
    '{"kas_bank": "Verifikasi buku manual 7 seksi kas telah dicocokkan dengan lembar hitung fisik.", "inventaris": "Perlu percepatan sertifikasi aset tanah."}'::jsonb,
    'Saldo awal layak disahkan sebagai dasar pembukuan 2026.',
    'sesuai',
    '2026-01-11 15:00:00+00'
  )
on conflict (engagement_id, member_id) do nothing;

-- 5. Opini Final Saldo Awal (Mayoritas: 2 Sesuai, 1 Sesuai Catatan -> Hasil: Sesuai)
insert into public.audit_final_opinions (
  engagement_id,
  final_opinion,
  vote_breakdown,
  has_dissenting_opinion,
  dissenting_opinion_notes,
  berita_acara_no,
  berita_acara_date,
  finalized_by,
  finalized_at
) values (
  'eng-opening-2026',
  'sesuai',
  '{"sesuai": 2, "sesuai_dengan_catatan": 1, "perlu_perbaikan": 0}'::jsonb,
  true,
  '1 anggota memberikan catatan terkait penyelesaian kas bon lilin Sekolah Minggu per 31 Desember.',
  'BA-AUDIT/01/2026/HKBP-HTR',
  '2026-01-12',
  'user-audit-1',
  '2026-01-12 16:00:00+00'
) on conflict (engagement_id) do nothing;

-- 6. Engagement Pemeriksaan Semester I (In Progress)
insert into public.audit_engagements (
  id,
  tahun,
  jenis,
  judul,
  deskripsi,
  status,
  dibuka_pada,
  batas_waktu
) values (
  'eng-sem1-2026',
  2026,
  'semester_1',
  'Pemeriksaan Keuangan Semester I Tahun 2026',
  'Audit berkala mutasi penerimaan persembahan dan realisasi belanja periode Januari - Juni 2026',
  'in_progress',
  '2026-07-01',
  '2026-07-25'
) on conflict (tahun, jenis) do nothing;

-- 7. Contoh Temuan Audit
insert into public.audit_findings (
  id,
  engagement_id,
  kas_id,
  kode,
  title,
  description,
  severity,
  status,
  due_date,
  response_notes,
  created_by
) values
  (
    'fnd-1',
    'eng-sem1-2026',
    'kas-3',
    'TMN-2026-001',
    'Panjar Pembelian Lilin Natal Sekolah Minggu Melewati Batas Waktu SPJ',
    'Terdapat panjar sebesar Rp 3.500.000 dengan jatuh tempo 15 Januari 2026 yang belum dipertanggungjawabkan secara tuntas dengan kuitansi sah.',
    'wajib_diperbaiki',
    'ditanggapi',
    '2026-07-15',
    'Kuitansi pembelian toko telah dikumpulkan dan sedang diajukan SPJ ke Ketua Seksi.',
    'user-audit-1'
  ),
  (
    'fnd-2',
    'eng-sem1-2026',
    'kas-1',
    'TMN-2026-002',
    'Pengarsipan Bukti Setor Pelean Bank BRI Perlu Ditandatangani 2 Orang',
    'Slip setoran tunai bank persembahan Minggu kedua bulan Februari belum dilampiri tanda tangan saksi penghitung pelean.',
    'informasi',
    'selesai',
    '2026-07-20',
    'Telah dilengkapi tanda tangan saksi St. M. Siregar dan arsip telah diperbarui.',
    'user-audit-2'
  )
on conflict (id) do nothing;

-- 8. Contoh Opname Kas Fisik Mendadak
insert into public.cash_counts (
  id,
  tanggal,
  kas_id,
  storage_account_id,
  book_balance,
  physical_balance,
  cash_breakdown,
  explanation,
  auditor_id,
  witness_name
) values (
  'cc-1',
  '2026-06-25',
  'kas-1',
  'stor-1',
  14500000,
  14500000,
  '{"100000": 120, "50000": 40, "20000": 25}'::jsonb,
  'Penghitungan fisik kas tunai di brankas gereja tepat cocok dengan saldo buku kas operasional.',
  'user-audit-1',
  'St. B. Hutapea (Bendahara Umum)'
) on conflict (id) do nothing;
