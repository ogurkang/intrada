-- İç kontrol: kişiler sicil veya kullanıcı adıyla değil, personel kaydındaki ad soyadla görünür.
-- Vekil olarak müdür unvanına bağlı kişi, asıl unvanı yerine o müdür unvanıyla listelenir.

create or replace function public.ick_sicil_adlari(p_siciller text[])
returns table (sicil text, ad text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.sicil,
    coalesce(
      nullif(trim((select c.ad_soyad from public.calisan c where c.sicil_no::text = s.sicil limit 1)), ''),
      nullif(trim((select f.ad_soyad from public.firma_calisanlar f where f.sicil_no::text = s.sicil limit 1)), '')
    )
  from (
    select distinct nullif(trim(x), '') as sicil
    from unnest(coalesce(p_siciller, array[]::text[])) as x
  ) s
  where s.sicil is not null
    and public.ick_okuyabilir(auth.uid())
    and coalesce(
      nullif(trim((select c.ad_soyad from public.calisan c where c.sicil_no::text = s.sicil limit 1)), ''),
      nullif(trim((select f.ad_soyad from public.firma_calisanlar f where f.sicil_no::text = s.sicil limit 1)), '')
    ) is not null;
$$;

revoke all on function public.ick_sicil_adlari(text[]) from public;
grant execute on function public.ick_sicil_adlari(text[]) to authenticated;

create or replace function public.ick_mudurluk_personeli(p_mudurluk_id integer)
returns table (sicil text, ad text, unvan text, hesap_var boolean, menu_acik boolean)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_ad text;
begin
  if not (public.is_admin_like(auth.uid()) or public.ick_koordinator(auth.uid())) then
    raise exception 'Personel listesini yönetici veya iç kontrol koordinatörü görür.';
  end if;
  select m.mudurluk_adi into v_ad from public.tanim_mudurluk m where m.id = p_mudurluk_id;
  if v_ad is null then
    return;
  end if;
  return query
  with k as (
    select kh.asil::text as s,
      coalesce(nullif(trim(kh.gorev_unvani), ''), nullif(trim(kh.kadro_unvani), ''), '') as u,
      1 as oncelik
    from public.kadro_hareketleri kh
    where kh.ayrilis_tarihi is null
      and nullif(trim(kh.asil::text), '') is not null
      and public.ick_metin_norm(coalesce(nullif(trim(kh.gorev_mudurlugu), ''), kh.kadro_mudurlugu)) = public.ick_metin_norm(v_ad)
    union all
    select kh.vekil::text,
      coalesce(nullif(trim(kh.kadro_unvani), ''), nullif(trim(kh.gorev_unvani), ''), ''),
      case
        when public.ick_metin_norm(coalesce(kh.kadro_unvani, '') || ' ' || coalesce(kh.gorev_unvani, '')) ~ '(^| )muduru?( |$)'
          then 0
        else 2
      end
    from public.kadro_hareketleri kh
    where kh.ayrilis_tarihi is null
      and nullif(trim(kh.vekil::text), '') is not null
      and public.ick_metin_norm(coalesce(nullif(trim(kh.gorev_mudurlugu), ''), kh.kadro_mudurlugu)) = public.ick_metin_norm(v_ad)
    union all
    select fc.sicil_no::text, 'ADABEL', 3
    from public.firma_calisanlar fc
    where fc.ayrilis_tarihi is null
      and nullif(trim(fc.sicil_no::text), '') is not null
      and public.ick_metin_norm(fc.gorev_mudurlugu) = public.ick_metin_norm(v_ad)
  ),
  tekil as (
    select distinct on (k.s) k.s, k.u from k order by k.s, k.oncelik
  )
  select
    t.s,
    coalesce(
      nullif(trim((select c.ad_soyad from public.calisan c where c.sicil_no::text = t.s limit 1)), ''),
      nullif(trim((select f.ad_soyad from public.firma_calisanlar f where f.sicil_no::text = t.s limit 1)), ''),
      'Ad soyad yok'
    )::text,
    t.u::text,
    exists (select 1 from public.app_profiles ap where nullif(trim(ap.sicil_no::text), '') = t.s and coalesce(ap.hesap_aktif, true)),
    exists (
      select 1 from public.app_profiles ap
      where nullif(trim(ap.sicil_no::text), '') = t.s
        and coalesce(ap.hesap_aktif, true)
        and ((ap.menu_izinleri ->> 'icKontrolYonetimi') = 'true' or public.is_admin_like(ap.id))
    )
  from tekil t;
end;
$$;

notify pgrst, 'reload schema';
