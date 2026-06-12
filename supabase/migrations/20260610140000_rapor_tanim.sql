-- Rapor tanımları: oluşturulma tarihi ve kart meta verisi
create table if not exists public.rapor_tanim (
  kod text primary key,
  slug text not null unique,
  baslik text not null,
  aciklama text not null default '',
  renk text not null default 'border-slate-200 bg-slate-50 text-slate-900',
  olusturulma_tarihi date not null,
  kapsam_tipi text not null default 'yok'
    check (kapsam_tipi in ('ayar_liste', 'excel_aralik', 'yok')),
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.rapor_tanim is
  'Rapor Yönetimi kartları; olusturulma_tarihi rapor audit loglarında referans alınır.';

alter table public.rapor_tanim enable row level security;

drop policy if exists rapor_tanim_select_auth on public.rapor_tanim;
create policy rapor_tanim_select_auth
  on public.rapor_tanim for select to authenticated using (true);

insert into public.rapor_tanim (kod, slug, baslik, aciklama, renk, olusturulma_tarihi, kapsam_tipi) values
  ('IHR', 'izin-hareketleri', 'İzin Hareketleri Raporu', 'İki sıra numarası aralığına göre izin hareketlerini salt okunur görüntüleyip Excel indirebilirsiniz', 'border-teal-200 bg-teal-50 text-teal-900', '2026-01-10', 'excel_aralik'),
  ('MIR', 'memur-izinleri', 'Memur İzinleri Raporu', 'Memur statüsündeki personeller için izin hakkı, kullanılan izin ve kalan izin bilgisi', 'border-blue-200 bg-blue-50 text-blue-900', '2026-06-01', 'yok'),
  ('IIR', 'isci-izinleri', 'İşçi İzinleri Raporu', 'İşçi statüsündeki personeller için izin hakkı, kullanılan izin ve kalan izin bilgisi', 'border-emerald-200 bg-emerald-50 text-emerald-900', '2026-06-01', 'yok'),
  ('SGC', 'statuye-gore-cinsiyet', 'Statüye Göre Cinsiyet Raporu', 'YILLIK ve Ocak–Aralık sekmeleri; kadın/erkek dağılımı ve gelen/ayrılan özetleri', 'border-cyan-200 bg-cyan-50 text-cyan-900', '2026-01-15', 'yok'),
  ('SGS', 'statuye-gore-sayi', 'Statüye Göre Sayı Durumu Raporu', 'Statü başına toplam personel sayısı; aynı dönem ve gelen/ayrılan özetleri', 'border-sky-200 bg-sky-50 text-sky-900', '2026-01-15', 'yok'),
  ('SGY', 'statuye-gore-yas', 'Statüye Göre Yaş Raporu', 'Yaş aralıklarına göre dağılım; doğum yılından hesaplanan yaş ve dönem özetleri', 'border-indigo-200 bg-indigo-50 text-indigo-900', '2026-01-15', 'yok'),
  ('SGH', 'statuye-gore-hizmet', 'Statüye Göre Hizmet Raporu', 'Hizmet süresi aralıklarına göre dağılım; 360 gün esaslı yıl/ay/gün verilerinden hesaplanır', 'border-emerald-200 bg-emerald-50 text-emerald-900', '2026-01-15', 'yok'),
  ('KGC', 'konuma-gore-cinsiyet', 'Konuma Göre Cinsiyet Raporu', 'Tanımlar > Müdürlük yerleşke eşlemesindeki İç/Dış konumuna göre kadın/erkek; aynı sekme ve özet yapısı', 'border-violet-200 bg-violet-50 text-violet-900', '2026-02-01', 'yok'),
  ('YGP', 'yerleske-adresine-gore-personel-sayi', 'Yerleşke Adresine Göre Personel Sayısı', 'Müdürlük–yerleşke satırlarında ADABEL ve belediye personeli sayıları; YILLIK ve aylık sekmeler', 'border-indigo-200 bg-indigo-50 text-indigo-900', '2026-02-01', 'yok'),
  ('SGO', 'statuye-gore-ogrenim', 'Statüye Göre Öğrenim Durumu Raporu', 'Varsayılan öğrenim (kadro) ve firma kartı öğrenimi; Tanımlar > Öğrenim ve Statü sütunları', 'border-blue-200 bg-blue-50 text-blue-900', '2026-01-20', 'yok'),
  ('SGM', 'statuye-gore-meslek', 'Statüye Göre Meslek Raporu', 'Öğrenim kaydındaki meslek (kadro) ve firma meslek alanı; matris ve dönem özetleri', 'border-purple-200 bg-purple-50 text-purple-900', '2026-01-20', 'yok'),
  ('MSL', 'meslek-sahibi-liste', 'Meslek Sahibi Personel Listesi', 'YILLIK ve Ocak–Aralık; sicil, ad soyad ve meslek adı (anlık görüntü)', 'border-amber-200 bg-amber-50 text-amber-900', '2026-01-20', 'yok'),
  ('GYL', 'gorev-yerine-gore-liste', 'Görev Yerine Göre Personel Listesi', 'Konum, cinsiyet, unvan, statü ve fiili görev (Görev Bilgileri ile uyumlu anlık görüntü)', 'border-rose-200 bg-rose-50 text-rose-900', '2026-04-27', 'ayar_liste'),
  ('MPL', 'mudurluge-gore-personel-liste', 'Müdürlüğe Göre Personel Listesi', 'Kadro müdürlüğüne göre alfabetik, müdürlük içinde sicil artan sıralı personel listesi', 'border-lime-200 bg-lime-50 text-lime-900', '2026-03-01', 'yok'),
  ('TSM', 'tehlike-siniflarina-gore-mudurluk', 'Tehlike Sınıflarına Göre Müdürlük Raporu', 'Müdürlük tehlike sınıfına göre personel sayısı özeti (ADABEL hariç).', 'border-orange-200 bg-orange-50 text-orange-900', '2026-03-01', 'yok'),
  ('TML', 'tehlikeli-sinif-mudurluk-listesi', 'Tehlike Sınıfına Göre Müdürlük Listesi', 'Aktif müdürlükleri tehlike sınıfı önceliğine göre listeler.', 'border-red-200 bg-red-50 text-red-900', '2026-03-01', 'yok'),
  ('TPL', 'tehlikeli-sinif-personel-listesi', 'Tehlike Sınıfına Göre Personel Listesi', 'Tehlike sınıfı, müdürlük ve sicil sırasına göre personel listesi (ADABEL hariç).', 'border-rose-200 bg-rose-50 text-rose-900', '2026-03-01', 'yok'),
  ('KPL', 'kan-grubuna-gore-personel-liste', 'Kan Grubuna Göre Personel Listesi', 'Kan grubu checkbox filtresiyle personel listesi; yıllık/aylık ve Excel destekli.', 'border-cyan-200 bg-cyan-50 text-cyan-900', '2026-03-10', 'yok'),
  ('DGL', 'dogum-gunune-gore-personel-liste', 'Doğum Gününe Göre Personel Listesi', 'Aylık sekmelerde ilgili ayda doğan aktif personellerin sicil ve ad soyad listesi.', 'border-teal-200 bg-teal-50 text-teal-900', '2026-03-10', 'yok'),
  ('BPL', 'belediye-geneli-personel-liste', 'Belediye Geneli Personel Listesi', 'Kimlik, statü, unvan, müdürlük ve iletişim bilgileriyle belediye geneli aktif personel listesi', 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900', '2026-04-01', 'yok'),
  ('APL', 'adabel-personel-bilgileri-liste', 'ADABEL Personel Bilgileri Listesi', 'ADABEL personelinin sicil, kimlik, iletişim ve görev bilgileri; yıllık/aylık sekmeler ve Excel.', 'border-amber-200 bg-amber-50 text-amber-900', '2026-04-01', 'yok'),
  ('YIB', 'yonetici-iletisim-bilgileri-liste', 'Yönetici İletişim Bilgileri Listesi', 'Belediye Başkanı, Başkan Yardımcısı ve Müdür unvanlı kayıtlar için iletişim listesi', 'border-slate-300 bg-slate-50 text-slate-900', '2026-04-28', 'ayar_liste'),
  ('YOD', 'yonetici-ogrenim-durum-liste', 'Yönetici Öğrenim Durum Listesi', 'Görev unvanında Müdür ifadesi geçen personellerin öğrenim bilgilerinin tümü (sicil artan).', 'border-indigo-200 bg-indigo-50 text-indigo-900', '2026-04-01', 'yok'),
  ('AGP', 'adrese-gore-personel-liste', 'Adrese Göre Personel Listesi', 'YILLIK ve Ocak–Aralık sekmeleriyle aktif personelin sicil, ad soyad, statü ve adres bilgisi listesi.', 'border-emerald-200 bg-emerald-50 text-emerald-900', '2026-04-01', 'yok'),
  ('ODP', 'ogrenim-durumuna-gore-personel-liste', 'Öğrenim Durumuna Göre Personel Listesi', 'Lisans + lisansüstü/doktora kaydı olan personelde kimlik sütunları birleştirilmiş öğrenim satırlarıyla listelenir.', 'border-blue-200 bg-blue-50 text-blue-900', '2026-04-15', 'yok'),
  ('ILT', 'izin-limitine-takilan-personel-liste', 'İzin Limitine Takılan Personel Listesi', 'Kullanılan izin toplamı yükseldikçe satır rengi kırmızı tona yaklaşan, filtrelenebilir yıllık/aylık personel listesi.', 'border-red-200 bg-red-50 text-red-900', '2026-04-15', 'yok'),
  ('PGI', 'personele-gore-kullanilan-izin-listesi', 'Personele Göre Kullanılan İzin Listesi', 'Müdürlük, sicil ve türe göre filtrelenebilir, başlıklarda sıralanabilir izin kayıt listesi; Excel destekli.', 'border-teal-200 bg-teal-50 text-teal-900', '2026-04-20', 'yok'),
  ('BGI', 'belirli-gunde-izinli-personel', 'Belirli Günde İzinli Olan Personel Listesi', 'Seçilen tarihte aktif izni devam eden personeli müdürlük, konum (İç/Dış) ve türe göre filtreli listeler; Excel destekli.', 'border-violet-200 bg-violet-50 text-violet-900', '2026-04-20', 'yok'),
  ('MIM', 'maas-oncesi-izinli-mudurler', 'Maaş Öncesi İzinli Müdürler Raporu', 'Her ayın 10–14. günlerinde izinli olan müdür unvanlı personeli sicil numarasına göre listeler; Yıllık/Aylık sekmesi ve Excel destekli.', 'border-orange-200 bg-orange-50 text-orange-900', '2026-04-22', 'yok'),
  ('GTC', 'gorev-turune-gore-calisan', 'Görev Türüne Göre Çalışan Bilgisi', 'Geçici Görevlendirme ve Kurum Görevlendirme türündeki personeli başlangıç/bitiş/süre bilgisiyle listeler; müdürlük ve tür filtresi, Excel destekli.', 'border-amber-200 bg-amber-50 text-amber-900', '2026-04-22', 'yok')
on conflict (kod) do update set
  slug = excluded.slug,
  baslik = excluded.baslik,
  aciklama = excluded.aciklama,
  renk = excluded.renk,
  olusturulma_tarihi = excluded.olusturulma_tarihi,
  kapsam_tipi = excluded.kapsam_tipi,
  aktif = true;
