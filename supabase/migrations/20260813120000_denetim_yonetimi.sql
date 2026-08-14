-- Denetim Yönetimi: müdürlük bazlı menüler ve belgeler (PDF/Word/Excel)

create table if not exists public.denetim_menu (
  id bigint generated always as identity primary key,
  mudurluk_id integer not null references public.tanim_mudurluk(id) on delete cascade,
  baslik text not null,
  aciklama text null,
  sira_no integer not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  created_by_email text null
);

comment on table public.denetim_menu is
  'Denetim Yönetimi: her aktif müdürlük altında kullanıcı tanımlı menüler (yönetmelik, yönerge vb.).';

create unique index if not exists uq_denetim_menu_mudurluk_baslik
  on public.denetim_menu (mudurluk_id, lower(btrim(baslik)))
  where aktif = true;

create index if not exists idx_denetim_menu_mudurluk
  on public.denetim_menu (mudurluk_id, sira_no, baslik);

create table if not exists public.denetim_belge (
  id bigint generated always as identity primary key,
  menu_id bigint not null references public.denetim_menu(id) on delete cascade,
  dosya_adi text not null,
  storage_path text not null,
  mime_type text null,
  boyut_byte bigint null,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  created_by_email text null
);

comment on table public.denetim_belge is
  'Denetim menülerine eklenen PDF, Word ve Excel belgeleri.';

create index if not exists idx_denetim_belge_menu
  on public.denetim_belge (menu_id, created_at desc);

alter table public.denetim_menu enable row level security;
alter table public.denetim_belge enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'denetim_menu' and policyname = 'denetim_menu_select'
  ) then
    create policy denetim_menu_select on public.denetim_menu
      for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'denetim_menu' and policyname = 'denetim_menu_write'
  ) then
    create policy denetim_menu_write on public.denetim_menu
      for all to authenticated using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'denetim_belge' and policyname = 'denetim_belge_select'
  ) then
    create policy denetim_belge_select on public.denetim_belge
      for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'denetim_belge' and policyname = 'denetim_belge_write'
  ) then
    create policy denetim_belge_write on public.denetim_belge
      for all to authenticated using (true) with check (true);
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'denetim-belgeler',
  'denetim-belgeler',
  false,
  15728640,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12'
  ]::text[]
)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'denetim_belge_select'
  ) then
    create policy denetim_belge_select on storage.objects
      for select to authenticated
      using (bucket_id = 'denetim-belgeler');
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'denetim_belge_insert'
  ) then
    create policy denetim_belge_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'denetim-belgeler');
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'denetim_belge_update'
  ) then
    create policy denetim_belge_update on storage.objects
      for update to authenticated
      using (bucket_id = 'denetim-belgeler');
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'denetim_belge_delete'
  ) then
    create policy denetim_belge_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'denetim-belgeler');
  end if;
end $$;
