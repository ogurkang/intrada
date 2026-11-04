-- Stratejik plan başlıklarını, altında kayıt yokken silmek için

do $$
declare
  rec record;
begin
  for rec in
    select *
    from (values
      ('stratejik_plan_donem', 'sp_donem_delete_auth'),
      ('stratejik_plan_amac', 'sp_amac_delete_auth'),
      ('stratejik_plan_hedef', 'sp_hedef_delete_auth'),
      ('stratejik_plan_alt_hedef', 'sp_alt_hedef_delete_auth'),
      ('stratejik_plan_faaliyet', 'sp_faaliyet_delete_auth'),
      ('stratejik_plan_gosterge', 'sp_gosterge_delete_auth')
    ) as v(tablo, politika)
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = rec.tablo and policyname = rec.politika
    ) then
      execute format(
        'create policy %I on public.%I for delete to authenticated using (true)',
        rec.politika,
        rec.tablo
      );
    end if;
  end loop;
end
$$;
