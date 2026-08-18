-- KYS Yönetimi: dönem olmadan dinamik menü ağacı, başlık, belge ve görüntüleme

create table if not exists public.kys_menu (
  id bigint generated always as identity primary key,
  parent_id bigint null references public.kys_menu(id) on delete cascade,
  baslik text not null,
  aciklama text null,
  slug text not null,
  sayfa_turu text not null check (sayfa_turu in ('hub', 'belge')),
  ikon text null,
  sira_no integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  created_by_email text null,
  constraint chk_kys_menu_baslik check (char_length(baslik) between 2 and 120)
);

create unique index if not exists uq_kys_menu_ad
  on public.kys_menu (coalesce(parent_id, 0), lower(baslik));

create unique index if not exists uq_kys_menu_slug
  on public.kys_menu (slug);

create index if not exists idx_kys_menu_parent
  on public.kys_menu (parent_id, sira_no);

create table if not exists public.kys_baslik (
  id bigint generated always as identity primary key,
  menu_id bigint not null references public.kys_menu(id) on delete cascade,
  baslik text not null,
  aciklama text null,
  sorumlu_birim text null,
  sira_no integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  created_by_email text null,
  constraint chk_kys_baslik_ad check (char_length(baslik) between 2 and 120)
);

create unique index if not exists uq_kys_baslik_menu_ad
  on public.kys_baslik (menu_id, lower(baslik));

create index if not exists idx_kys_baslik_menu
  on public.kys_baslik (menu_id, sira_no);

create table if not exists public.kys_belge (
  id bigint generated always as identity primary key,
  baslik_id bigint not null references public.kys_baslik(id) on delete cascade,
  sorumlu_birim text null,
  dosya_adi text not null,
  storage_path text not null,
  mime_type text null,
  boyut_byte bigint null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  created_by_email text null,
  constraint uq_kys_belge_baslik unique (baslik_id)
);

create table if not exists public.kys_belge_goruntuleme (
  id bigint generated always as identity primary key,
  belge_id bigint not null,
  viewed_by uuid null references auth.users(id) on delete set null,
  viewed_by_email text null,
  viewed_by_username text null,
  viewed_by_name text null,
  viewed_by_institution text null,
  viewed_by_profile_kind text null,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_kys_belge_goruntuleme_belge
  on public.kys_belge_goruntuleme (belge_id, viewed_at desc);

create index if not exists idx_kys_belge_goruntuleme_kullanici
  on public.kys_belge_goruntuleme (viewed_by, viewed_at desc);

create or replace function public.kys_yazabilir()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.app_profiles p
    where p.id = auth.uid()
      and p.profil_turu = 'dis_denetci'
  );
$$;

alter table public.kys_menu enable row level security;
alter table public.kys_baslik enable row level security;
alter table public.kys_belge enable row level security;
alter table public.kys_belge_goruntuleme enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['kys_menu', 'kys_baslik', 'kys_belge', 'kys_belge_goruntuleme']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_select', t
    );
  end loop;

  foreach t in array array['kys_menu', 'kys_baslik', 'kys_belge']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.kys_yazabilir()) with check (public.kys_yazabilir())',
      t || '_write', t
    );
  end loop;
end $$;

drop policy if exists kys_belge_goruntuleme_write on public.kys_belge_goruntuleme;
create policy kys_belge_goruntuleme_write
  on public.kys_belge_goruntuleme
  for insert to authenticated
  with check (viewed_by = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kys-belgeler',
  'kys-belgeler',
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
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'kys_belge_select'
  ) then
    create policy kys_belge_select on storage.objects
      for select to authenticated
      using (bucket_id = 'kys-belgeler');
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'kys_belge_insert'
  ) then
    create policy kys_belge_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'kys-belgeler');
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'kys_belge_update'
  ) then
    create policy kys_belge_update on storage.objects
      for update to authenticated
      using (bucket_id = 'kys-belgeler');
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'kys_belge_delete'
  ) then
    create policy kys_belge_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'kys-belgeler');
  end if;
end $$;

notify pgrst, 'reload schema';
