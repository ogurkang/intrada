import Link from 'next/link'
import { getAppAccess } from '@/lib/app-access'
import { createClient } from '@/lib/supabase/server'

const RAPOR_KARTLARI = [
  {
    kod: 'IHR',
    href: '/rapor/izin-hareketleri',
    baslik: 'İzin Hareketleri Raporu',
    aciklama: 'İki sıra numarası aralığına göre izin hareketlerini salt okunur görüntüleyip Excel indirebilirsiniz',
    renk: 'border-teal-200 bg-teal-50 text-teal-900',
  },
  {
    kod: 'IIR',
    href: '/rapor/isci-izinleri',
    baslik: 'İşçi İzinleri Raporu',
    aciklama: 'İşçi statüsündeki personeller için izin hakkı, kullanılan izin ve kalan izin bilgisi',
    renk: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  {
    kod: 'SGC',
    href: '/rapor/statuye-gore-cinsiyet',
    baslik: 'Statüye Göre Cinsiyet Raporu',
    aciklama: 'YILLIK ve Ocak–Aralık sekmeleri; kadın/erkek dağılımı ve gelen/ayrılan özetleri',
    renk: 'border-cyan-200 bg-cyan-50 text-cyan-900',
  },
  {
    kod: 'SGS',
    href: '/rapor/statuye-gore-sayi',
    baslik: 'Statüye Göre Sayı Durumu Raporu',
    aciklama: 'Statü başına toplam personel sayısı; aynı dönem ve gelen/ayrılan özetleri',
    renk: 'border-sky-200 bg-sky-50 text-sky-900',
  },
  {
    kod: 'SGY',
    href: '/rapor/statuye-gore-yas',
    baslik: 'Statüye Göre Yaş Raporu',
    aciklama: 'Yaş aralıklarına göre dağılım; doğum yılından hesaplanan yaş ve dönem özetleri',
    renk: 'border-indigo-200 bg-indigo-50 text-indigo-900',
  },
  {
    kod: 'SGH',
    href: '/rapor/statuye-gore-hizmet',
    baslik: 'Statüye Göre Hizmet Raporu',
    aciklama: 'Hizmet süresi aralıklarına göre dağılım; 360 gün esaslı yıl/ay/gün verilerinden hesaplanır',
    renk: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  {
    kod: 'KGC',
    href: '/rapor/konuma-gore-cinsiyet',
    baslik: 'Konuma Göre Cinsiyet Raporu',
    aciklama: 'Tanımlar > Müdürlük İç/Dış konumuna göre kadın/erkek; aynı sekme ve özet yapısı',
    renk: 'border-violet-200 bg-violet-50 text-violet-900',
  },
  {
    kod: 'SGO',
    href: '/rapor/statuye-gore-ogrenim',
    baslik: 'Statüye Göre Öğrenim Durumu Raporu',
    aciklama: 'Varsayılan öğrenim (kadro) ve firma kartı öğrenimi; Tanımlar > Öğrenim ve Statü sütunları',
    renk: 'border-blue-200 bg-blue-50 text-blue-900',
  },
  {
    kod: 'SGM',
    href: '/rapor/statuye-gore-meslek',
    baslik: 'Statüye Göre Meslek Raporu',
    aciklama: 'Öğrenim kaydındaki meslek (kadro) ve firma meslek alanı; matris ve dönem özetleri',
    renk: 'border-purple-200 bg-purple-50 text-purple-900',
  },
  {
    kod: 'MSL',
    href: '/rapor/meslek-sahibi-liste',
    baslik: 'Meslek Sahibi Personel Listesi',
    aciklama: 'YILLIK ve Ocak–Aralık; sicil, ad soyad ve meslek adı (anlık görüntü)',
    renk: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  {
    kod: 'GYL',
    href: '/rapor/gorev-yerine-gore-liste',
    baslik: 'Görev Yerine Göre Personel Listesi',
    aciklama: 'Konum, cinsiyet, unvan, statü ve fiili görev (Görev Bilgileri ile uyumlu anlık görüntü)',
    renk: 'border-rose-200 bg-rose-50 text-rose-900',
  },
  {
    kod: 'MPL',
    href: '/rapor/mudurluge-gore-personel-liste',
    baslik: 'Müdürlüğe Göre Personel Listesi',
    aciklama: 'Kadro müdürlüğüne göre alfabetik, müdürlük içinde sicil artan sıralı personel listesi',
    renk: 'border-lime-200 bg-lime-50 text-lime-900',
  },
  {
    kod: 'TSM',
    href: '/rapor/tehlike-siniflarina-gore-mudurluk',
    baslik: 'Tehlike Sınıflarına Göre Müdürlük Raporu',
    aciklama: 'Müdürlük tehlike sınıfına göre personel sayısı özeti (ADABEL hariç).',
    renk: 'border-orange-200 bg-orange-50 text-orange-900',
  },
  {
    kod: 'TML',
    href: '/rapor/tehlikeli-sinif-mudurluk-listesi',
    baslik: 'Tehlike Sınıfına Göre Müdürlük Listesi',
    aciklama: 'Aktif müdürlükleri tehlike sınıfı önceliğine göre listeler.',
    renk: 'border-red-200 bg-red-50 text-red-900',
  },
  {
    kod: 'TPL',
    href: '/rapor/tehlikeli-sinif-personel-listesi',
    baslik: 'Tehlike Sınıfına Göre Personel Listesi',
    aciklama: 'Tehlike sınıfı, müdürlük ve sicil sırasına göre personel listesi (ADABEL hariç).',
    renk: 'border-rose-200 bg-rose-50 text-rose-900',
  },
  {
    kod: 'KPL',
    href: '/rapor/kan-grubuna-gore-personel-liste',
    baslik: 'Kan Grubuna Göre Personel Listesi',
    aciklama: 'Kan grubu checkbox filtresiyle personel listesi; yıllık/aylık ve Excel destekli.',
    renk: 'border-cyan-200 bg-cyan-50 text-cyan-900',
  },
  {
    kod: 'DGL',
    href: '/rapor/dogum-gunune-gore-personel-liste',
    baslik: 'Doğum Gününe Göre Personel Listesi',
    aciklama: 'Aylık sekmelerde ilgili ayda doğan aktif personellerin sicil ve ad soyad listesi.',
    renk: 'border-teal-200 bg-teal-50 text-teal-900',
  },
  {
    kod: 'BPL',
    href: '/rapor/belediye-geneli-personel-liste',
    baslik: 'Belediye Geneli Personel Listesi',
    aciklama: 'Kimlik, statü, unvan, müdürlük ve iletişim bilgileriyle belediye geneli aktif personel listesi',
    renk: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900',
  },
  {
    kod: 'YIB',
    href: '/rapor/yonetici-iletisim-bilgileri-liste',
    baslik: 'Yönetici İletişim Bilgileri Listesi',
    aciklama: 'Belediye Başkanı, Başkan Yardımcısı ve Müdür unvanlı kayıtlar için iletişim listesi',
    renk: 'border-slate-300 bg-slate-50 text-slate-900',
  },
  {
    kod: 'YOD',
    href: '/rapor/yonetici-ogrenim-durum-liste',
    baslik: 'Yönetici Öğrenim Durum Listesi',
    aciklama: 'Görev unvanında Müdür ifadesi geçen personellerin öğrenim bilgilerinin tümü (sicil artan).',
    renk: 'border-indigo-200 bg-indigo-50 text-indigo-900',
  },
  {
    kod: 'AGP',
    href: '/rapor/adrese-gore-personel-liste',
    baslik: 'Adrese Göre Personel Listesi',
    aciklama: 'YILLIK ve Ocak–Aralık sekmeleriyle aktif personelin sicil, ad soyad, statü ve adres bilgisi listesi.',
    renk: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  {
    kod: 'ODP',
    href: '/rapor/ogrenim-durumuna-gore-personel-liste',
    baslik: 'Öğrenim Durumuna Göre Personel Listesi',
    aciklama: 'Lisans + lisansüstü/doktora kaydı olan personelde kimlik sütunları birleştirilmiş öğrenim satırlarıyla listelenir.',
    renk: 'border-blue-200 bg-blue-50 text-blue-900',
  },
  {
    kod: 'ILT',
    href: '/rapor/izin-limitine-takilan-personel-liste',
    baslik: 'İzin Limitine Takılan Personel Listesi',
    aciklama: 'Kullanılan izin toplamı yükseldikçe satır rengi kırmızı tona yaklaşan, filtrelenebilir yıllık/aylık personel listesi.',
    renk: 'border-red-200 bg-red-50 text-red-900',
  },
] as const

export default async function RaporYonetimiPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Rapor Yönetimi</h1>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Aşağıdaki raporlar yıllık ve aylık dönem sekmeleriyle sunulur; her raporda genel özet ve dönem bazlı
          detay bulunur.
        </p>
        {access.mode === 'kullanici' && (
          <p className="mt-3 text-xs text-slate-500">
            Erişim, yetkilendirme ekranındaki «Rapor Yönetimi» modül iznine bağlıdır.
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {RAPOR_KARTLARI.map(r => (
          <Link
            key={r.href}
            href={r.href}
            className={`rounded-xl border p-5 ${r.renk} hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start justify-between mb-3 gap-2">
              <div className="min-w-0">
                <span className="text-xs font-bold tracking-widest opacity-60">{r.kod}</span>
                <h2 className="font-semibold text-slate-800 mt-0.5 leading-snug">{r.baslik}</h2>
              </div>
            </div>
            <p className="text-xs opacity-80 mb-4 leading-relaxed">{r.aciklama}</p>
            <span className="text-xs font-medium opacity-90">Raporu aç →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
