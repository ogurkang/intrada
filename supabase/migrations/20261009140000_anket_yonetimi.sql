-- Anket yönetimi. Cevaplarda ad, sicil ve kullanıcı kimliği tutulmaz.

create table if not exists public.anketler (
  id uuid primary key default gen_random_uuid(),
  baslik text not null,
  aciklama text not null default '',
  kod text not null,
  durum text not null default 'durduruldu',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anketler_kod_tekil unique (kod),
  constraint anketler_durum check (durum in ('yayinda', 'durduruldu')),
  constraint anketler_baslik_bos check (char_length(trim(baslik)) > 0)
);

create table if not exists public.anket_sorulari (
  id uuid primary key default gen_random_uuid(),
  anket_id uuid not null references public.anketler (id) on delete cascade,
  sira integer not null,
  metin text not null,
  tip text not null,
  secenekler jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anket_sorulari_tip check (tip in ('tek_secim', 'coklu_secim', 'evet_hayir', 'puan', 'metin')),
  constraint anket_sorulari_sira_pozitif check (sira > 0),
  constraint anket_sorulari_metin_bos check (char_length(trim(metin)) > 0),
  constraint anket_sorulari_anket_sira unique (anket_id, sira)
);

create table if not exists public.anket_log (
  id uuid primary key default gen_random_uuid(),
  anket_id uuid not null references public.anketler (id) on delete cascade,
  soru_id uuid null references public.anket_sorulari (id) on delete set null,
  islem text not null,
  ozet text not null default '',
  yapan_id uuid null,
  yapan_ad text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.anket_katilim (
  id uuid primary key default gen_random_uuid(),
  anket_id uuid not null references public.anketler (id) on delete cascade,
  tarayici_ozeti text not null,
  created_at timestamptz not null default now(),
  constraint anket_katilim_tekil unique (anket_id, tarayici_ozeti)
);

create table if not exists public.anket_cevaplar (
  id uuid primary key default gen_random_uuid(),
  katilim_id uuid not null references public.anket_katilim (id) on delete cascade,
  anket_id uuid not null references public.anketler (id) on delete cascade,
  soru_id uuid not null references public.anket_sorulari (id) on delete cascade,
  secimler text[] not null default '{}',
  puan smallint null,
  metin text null,
  created_at timestamptz not null default now(),
  constraint anket_cevaplar_puan check (puan is null or (puan >= 1 and puan <= 5)),
  constraint anket_cevaplar_katilim_soru unique (katilim_id, soru_id)
);

create index if not exists anket_sorulari_anket_idx on public.anket_sorulari (anket_id, sira);
create index if not exists anket_log_anket_idx on public.anket_log (anket_id, created_at desc);
create index if not exists anket_katilim_anket_idx on public.anket_katilim (anket_id);
create index if not exists anket_cevaplar_anket_idx on public.anket_cevaplar (anket_id, soru_id);

comment on table public.anket_katilim is
  'Aynı tarayıcının ikinci gönderimini kesmek için özet. Kişi kimliği değildir.';

do $$
declare
  tbl text;
  ok text := '(
        public.is_admin_like(auth.uid())
        or not exists (select 1 from public.app_profiles ap where ap.id = auth.uid())
      )';
begin
  foreach tbl in array array['anketler', 'anket_sorulari', 'anket_log', 'anket_katilim', 'anket_cevaplar']
  loop
    execute format('alter table public.%I enable row level security', tbl);

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = tbl and policyname = tbl || '_select'
    ) then
      execute format(
        'create policy %I on public.%I for select to authenticated using %s',
        tbl || '_select', tbl, ok
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = tbl and policyname = tbl || '_insert'
    ) then
      execute format(
        'create policy %I on public.%I for insert to authenticated with check %s',
        tbl || '_insert', tbl, ok
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = tbl and policyname = tbl || '_update'
    ) then
      execute format(
        'create policy %I on public.%I for update to authenticated using %s with check %s',
        tbl || '_update', tbl, ok, ok
      );
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = tbl and policyname = tbl || '_delete'
    ) then
      execute format(
        'create policy %I on public.%I for delete to authenticated using %s',
        tbl || '_delete', tbl, ok
      );
    end if;
  end loop;
end
$$;
