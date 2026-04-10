-- calisan.gorev_turu: Yari Zamanli secenegini ekle
alter table public.calisan drop constraint if exists calisan_gorev_turu_check;

alter table public.calisan add constraint calisan_gorev_turu_check
  check (gorev_turu in ('Çalışan', 'Aylıksız İzin', 'Geçici Görevlendirme', 'Yarı Zamanlı'));

comment on column public.calisan.gorev_turu is
  'Çalışan | Aylıksız İzin | Geçici Görevlendirme | Yarı Zamanlı';

comment on column public.calisan.gorev_turu_tarihi is
  'Aylıksız izin / geçici görevlendirme / yarı zamanlı başlangıcı; Çalışan iken boş';
