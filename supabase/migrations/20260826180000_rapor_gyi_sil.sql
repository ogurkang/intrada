-- Görev Yerine Göre İletişim Bilgileri raporu kaldırıldı.
delete from public.personel_audit_log
where ref_table = 'rapor_tanim' and ref_id = 'GYI';

delete from public.rapor_tanim
where kod = 'GYI';
