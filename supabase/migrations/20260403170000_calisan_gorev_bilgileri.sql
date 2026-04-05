-- Görev bilgileri personel kartına bağlıdır; kadro hareketleri (norm kadro) ile karıştırılmaz.
alter table public.calisan
  add column if not exists gorev_yeri text,
  add column if not exists gorev_turu text not null default 'Çalışan',
  add column if not exists gorev_turu_tarihi date,
  add column if not exists gorev_durumu text default 'Diğer';

update public.calisan set gorev_turu = 'Çalışan' where gorev_turu is null;
update public.calisan set gorev_durumu = 'Diğer' where gorev_durumu is null;

alter table public.calisan drop constraint if exists calisan_gorev_turu_check;
alter table public.calisan add constraint calisan_gorev_turu_check
  check (gorev_turu in ('Çalışan', 'Aylıksız İzin', 'Geçici Görevlendirme'));

alter table public.calisan drop constraint if exists calisan_gorev_durumu_check;
alter table public.calisan add constraint calisan_gorev_durumu_check
  check (gorev_durumu is null or gorev_durumu in ('Diğer', 'Engelli', 'Eski Hükümlü'));

comment on column public.calisan.gorev_yeri is 'Fiili görev yeri (metin; müdürlük içi birim vb.)';
comment on column public.calisan.gorev_turu is 'Çalışan | Aylıksız İzin | Geçici Görevlendirme';
comment on column public.calisan.gorev_turu_tarihi is 'Aylıksız izin / geçici görevlendirme başlangıcı; Çalışan iken boş';
comment on column public.calisan.gorev_durumu is 'Görev durumu (özel kategori)';
