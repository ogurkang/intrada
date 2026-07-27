-- Performans: 1./2. amir imza dosyaları (Ek-5 imza alanı)

create table if not exists public.performans_amir_imza (
  sicil_no text primary key references public.calisan(sicil_no) on delete cascade,
  storage_path text not null,
  dosya_adi text null,
  mime_type text null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

comment on table public.performans_amir_imza is
  'Performans değerlendirme formlarında (Ek-5) kullanılan 1./2. amir imza görselleri.';

create index if not exists idx_perf_amir_imza_updated
  on public.performans_amir_imza (updated_at desc);

alter table public.performans_amir_imza enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'performans_amir_imza' and policyname = 'perf_amir_imza_select'
  ) then
    create policy perf_amir_imza_select on public.performans_amir_imza
      for select to authenticated using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'performans_amir_imza' and policyname = 'perf_amir_imza_write'
  ) then
    create policy perf_amir_imza_write on public.performans_amir_imza
      for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Supabase Storage: özel imza bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'performans-imza',
  'performans-imza',
  false,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'perf_imza_select'
  ) then
    create policy perf_imza_select on storage.objects
      for select to authenticated
      using (bucket_id = 'performans-imza');
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'perf_imza_insert'
  ) then
    create policy perf_imza_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'performans-imza');
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'perf_imza_update'
  ) then
    create policy perf_imza_update on storage.objects
      for update to authenticated
      using (bucket_id = 'performans-imza');
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'perf_imza_delete'
  ) then
    create policy perf_imza_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'performans-imza');
  end if;
end $$;
