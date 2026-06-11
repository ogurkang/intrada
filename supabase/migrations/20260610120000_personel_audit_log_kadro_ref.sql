-- Kadro detay geçmişi: boş kadro kayıtları için sicil_no opsiyonel; ref ile sorgu indeksi.
alter table public.personel_audit_log
  alter column sicil_no drop not null;

create index if not exists idx_personel_audit_log_ref
  on public.personel_audit_log (ref_table, ref_id, created_at desc);

comment on column public.personel_audit_log.sicil_no is
  'İlgili personel sicili; kadro merkezli kayıtlarda boş kadro için null olabilir.';
