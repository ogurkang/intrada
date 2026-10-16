-- İç kontrol: müdürlük adına bildirim (vekâleten giriş) ve doğrudan işleme
--
-- Planın iç kontrol koordinatörü, eylemde seçilen kişiler yerine müdürlük adına
-- bildirim girebilir, kanıt yükleyebilir ve gönderebilir. Bilginin kaynağı ve
-- açıklaması zorunludur. Planda tek koordinatör bulunduğundan bu kayıtlarda
-- görevler ayrılığı istisnası uygulanır: koordinatör kendi girdiği müdürlük adına
-- kaydı kesinleştirebilir; kayıt "doğrudan işlendi" olarak işaretlenir.

alter table public.ick_gerceklesme
  add column if not exists vekaleten boolean not null default false,
  add column if not exists vekalet_kaynak text not null default '',
  add column if not exists vekalet_aciklama text not null default '',
  add column if not exists dogrudan boolean not null default false;

alter table public.ick_gerceklesme drop constraint if exists ick_gerceklesme_vekalet_kaynak;
alter table public.ick_gerceklesme add constraint ick_gerceklesme_vekalet_kaynak
  check (vekalet_kaynak in ('', 'resmi_yazi', 'eposta', 'toplanti', 'telefon', 'diger'));

drop policy if exists ick_gerceklesme_vekalet_insert on public.ick_gerceklesme;
create policy ick_gerceklesme_vekalet_insert on public.ick_gerceklesme
  for insert to authenticated
  with check (
    vekaleten
    and kaynak = 'sistem'
    and akis = 'taslak'
    and olusturan_id = auth.uid()
    and exists (select 1 from public.ick_eylem e where e.id = eylem_id and public.ick_plan_koordinatoru(auth.uid(), e.plan_id))
  );

drop policy if exists ick_gerceklesme_update on public.ick_gerceklesme;
create policy ick_gerceklesme_update on public.ick_gerceklesme
  for update to authenticated
  using (
    (akis = 'incelemede' and exists (
      select 1 from public.ick_eylem e where e.id = eylem_id and public.ick_plan_koordinatoru(auth.uid(), e.plan_id)
    ))
    or (
      akis in ('taslak', 'iade')
      and vekaleten
      and exists (select 1 from public.ick_eylem e where e.id = eylem_id and public.ick_plan_koordinatoru(auth.uid(), e.plan_id))
    )
    or (
      akis in ('taslak', 'iade')
      and not vekaleten
      and public.ick_eylem_yazabilir(auth.uid(), eylem_id)
      and (olusturan_id = auth.uid() or public.ick_eylem_gonderebilir(auth.uid(), eylem_id))
    )
  )
  with check (
    exists (select 1 from public.ick_eylem e where e.id = eylem_id and public.ick_plan_koordinatoru(auth.uid(), e.plan_id))
    or (public.ick_eylem_yazabilir(auth.uid(), eylem_id) and akis in ('taslak', 'incelemede'))
  );

drop policy if exists ick_gerceklesme_delete on public.ick_gerceklesme;
create policy ick_gerceklesme_delete on public.ick_gerceklesme
  for delete to authenticated
  using (
    akis = 'taslak'
    and (
      (vekaleten and exists (select 1 from public.ick_eylem e where e.id = eylem_id and public.ick_plan_koordinatoru(auth.uid(), e.plan_id)))
      or (not vekaleten and (olusturan_id = auth.uid() or public.ick_eylem_gonderebilir(auth.uid(), eylem_id)))
    )
  );

create or replace function public.ick_gerceklesme_kural()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_kanit integer;
  v_termin_tipi text;
  v_plan bigint;
  v_eylem_durum text;
begin
  if tg_op = 'DELETE' then
    if old.akis <> 'taslak' then
      raise exception 'Yalnızca taslak gerçekleşme silinebilir.';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    new.dogrudan := false;
  end if;

  if tg_op = 'UPDATE' then
    if old.akis = 'kesinlesti' then
      raise exception 'Kesinleşmiş gerçekleşme değiştirilemez.';
    end if;
    if old.eylem_id <> new.eylem_id
      or old.kaynak <> new.kaynak
      or old.olusturan_id is distinct from new.olusturan_id
      or old.vekaleten <> new.vekaleten then
      raise exception 'Gerçekleşmenin eylemi, kaynağı, oluşturanı ve müdürlük adına girilme bilgisi değiştirilemez.';
    end if;
    if old.akis = 'incelemede' and (
      old.beyan_durum <> new.beyan_durum
      or old.beyan_ilerleme <> new.beyan_ilerleme
      or old.calisma <> new.calisma
      or old.kanit_aciklama <> new.kanit_aciklama
      or old.donem_yili is distinct from new.donem_yili
      or old.vekalet_kaynak <> new.vekalet_kaynak
      or old.vekalet_aciklama <> new.vekalet_aciklama
    ) then
      raise exception 'İncelemedeki bildirimin içeriği değiştirilemez; gerekiyorsa iade edilmelidir.';
    end if;
    new.dogrudan := old.dogrudan;
  end if;

  select e.termin_tipi, e.plan_id, e.durum into v_termin_tipi, v_plan, v_eylem_durum
  from public.ick_eylem e where e.id = new.eylem_id;

  if tg_op = 'INSERT' and v_eylem_durum in ('iptal', 'devredildi') then
    raise exception 'İptal edilen veya devredilen eyleme bildirim girilmez.';
  end if;

  if new.kaynak = 'aktarim' and tg_op = 'INSERT' and not public.ick_plan_koordinatoru(auth.uid(), v_plan) then
    raise exception 'Aktarım kaydını yalnızca bu planın iç kontrol koordinatörü oluşturabilir.';
  end if;

  if new.vekaleten then
    if new.kaynak <> 'sistem' then
      raise exception 'Aktarım kaydı müdürlük adına girilmiş sayılmaz.';
    end if;
    if tg_op = 'INSERT' and not public.ick_plan_koordinatoru(auth.uid(), v_plan) then
      raise exception 'Müdürlük adına bildirimi yalnızca bu planın iç kontrol koordinatörü girer.';
    end if;
    if new.vekalet_kaynak = '' or char_length(trim(new.vekalet_aciklama)) = 0 then
      raise exception 'Müdürlük adına bildirimde bilginin kaynağı ve açıklaması zorunludur.';
    end if;
  end if;

  if v_termin_tipi in ('yillik', 'alti_aylik') and new.donem_yili is null then
    raise exception 'Tekrarlayan eylemde gerçekleşme yılı belirtilmelidir.';
  end if;

  new.updated_at := now();

  if new.akis = 'incelemede' and (tg_op = 'INSERT' or old.akis <> 'incelemede') then
    if new.kaynak = 'sistem' then
      if new.vekaleten then
        if not public.ick_plan_koordinatoru(auth.uid(), v_plan) then
          raise exception 'Müdürlük adına girilen bildirimi iç kontrol koordinatörü gönderir.';
        end if;
      elsif not public.ick_eylem_gonderebilir(auth.uid(), new.eylem_id) then
        raise exception 'Bildirimi koordinatöre müdürlük koordinatörü gönderir.';
      end if;
    end if;
    if new.beyan_durum = 'tamamlandi' and new.kaynak = 'sistem' then
      select count(*) into v_kanit
      from public.ick_belge b
      where b.aktif
        and b.gerceklesme_id = new.id
        and exists (select 1 from public.ick_belge_versiyon v where v.belge_id = b.id);
      if v_kanit = 0 then
        raise exception 'Tamamlandı bildirimi için en az bir kanıt belgesi yüklenmelidir.';
      end if;
    end if;
    new.gonderen_id := coalesce(auth.uid(), new.gonderen_id);
    new.gonderim_at := now();
  end if;

  if new.akis in ('kesinlesti', 'iade') and (tg_op = 'INSERT' or old.akis <> new.akis) then
    if new.kaynak = 'sistem' then
      if tg_op = 'INSERT' or old.akis <> 'incelemede' then
        raise exception 'Yalnızca incelemedeki gerçekleşme için karar verilebilir.';
      end if;
      if not public.ick_plan_koordinatoru(auth.uid(), v_plan) then
        raise exception 'Karar yetkisi bu planın iç kontrol koordinatörlerindedir.';
      end if;
      if auth.uid() = new.gonderen_id or auth.uid() = new.olusturan_id then
        if not new.vekaleten then
          raise exception 'Görevler ayrılığı: kendi girdiğiniz veya gönderdiğiniz kaydı kesinleştiremez ya da iade edemezsiniz.';
        end if;
        if new.akis = 'kesinlesti' and char_length(trim(coalesce(new.degerlendirme, ''))) = 0 then
          raise exception 'Doğrudan işlenen bildirimde izleme değerlendirmesi zorunludur.';
        end if;
        new.dogrudan := new.akis = 'kesinlesti';
      end if;
    end if;
    new.karar_veren_id := coalesce(auth.uid(), new.karar_veren_id);
    new.karar_at := now();
  end if;

  return new;
end;
$$;

notify pgrst, 'reload schema';
