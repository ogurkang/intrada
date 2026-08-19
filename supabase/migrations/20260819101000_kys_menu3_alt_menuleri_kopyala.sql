-- kys/m/3 altındaki alt menüleri id 4–39 arası ana alt menülere kopyala (aynı başlık yoksa).

insert into public.kys_menu (parent_id, baslik, aciklama, slug, sayfa_turu, ikon, sira_no)
select
  p.id,
  c.baslik,
  c.aciklama,
  c.slug || '-p' || p.id::text,
  c.sayfa_turu,
  c.ikon,
  c.sira_no
from public.kys_menu c
cross join public.kys_menu p
where c.parent_id = 3
  and p.id between 4 and 39
  and not exists (
    select 1
    from public.kys_menu x
    where x.parent_id = p.id
      and lower(btrim(x.baslik)) = lower(btrim(c.baslik))
  );

notify pgrst, 'reload schema';
