import Link from 'next/link'
import { getAppAccess } from '@/lib/app-access'
import { createClient } from '@/lib/supabase/server'

export default async function RaporYonetimiPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const access = user ? await getAppAccess(supabase, user.id) : { mode: 'full' as const }

  return (
    <div className="max-w-3xl space-y-6">
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
      <ul className="space-y-2">
        <li>
          <Link
            href="/rapor/izin-hareketleri"
            className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
          >
            İzin Hareketleri Raporu
            <span className="block text-xs font-normal text-slate-500 mt-0.5">
              İki sıra numarası aralığına göre izin hareketlerini salt okunur görüntüleyip Excel indirebilirsiniz
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/rapor/isci-izinleri"
            className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
          >
            İşçi İzinleri Raporu
            <span className="block text-xs font-normal text-slate-500 mt-0.5">
              İşçi statüsündeki personeller için izin hakkı, kullanılan izin ve kalan izin bilgisi
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/rapor/statuye-gore-cinsiyet"
            className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
          >
            Statüye Göre Cinsiyet Raporu
            <span className="block text-xs font-normal text-slate-500 mt-0.5">
              YILLIK ve Ocak–Aralık sekmeleri; kadın/erkek dağılımı ve gelen/ayrılan özetleri
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/rapor/statuye-gore-sayi"
            className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
          >
            Statüye Göre Sayı Durumu Raporu
            <span className="block text-xs font-normal text-slate-500 mt-0.5">
              Statü başına toplam personel sayısı; aynı dönem ve gelen/ayrılan özetleri
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/rapor/statuye-gore-yas"
            className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
          >
            Statüye Göre Yaş Raporu
            <span className="block text-xs font-normal text-slate-500 mt-0.5">
              Yaş aralıklarına göre dağılım; doğum yılından hesaplanan yaş ve dönem özetleri
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/rapor/konuma-gore-cinsiyet"
            className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
          >
            Konuma Göre Cinsiyet Raporu
            <span className="block text-xs font-normal text-slate-500 mt-0.5">
              Tanımlar {'>'} Müdürlük İç/Dış konumuna göre kadın/erkek; aynı sekme ve özet yapısı
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/rapor/statuye-gore-ogrenim"
            className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
          >
            Statüye Göre Öğrenim Durumu Raporu
            <span className="block text-xs font-normal text-slate-500 mt-0.5">
              Varsayılan öğrenim (kadro) ve firma kartı öğrenimi; Tanımlar {'>'} Öğrenim ve Statü sütunları
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/rapor/statuye-gore-meslek"
            className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
          >
            Statüye Göre Meslek Raporu
            <span className="block text-xs font-normal text-slate-500 mt-0.5">
              Öğrenim kaydındaki meslek (kadro) ve firma meslek alanı; matris ve dönem özetleri
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/rapor/meslek-sahibi-liste"
            className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
          >
            Meslek Sahibi Personel Listesi
            <span className="block text-xs font-normal text-slate-500 mt-0.5">
              YILLIK ve Ocak–Aralık; sicil, ad soyad ve meslek adı (anlık görüntü)
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/rapor/gorev-yerine-gore-liste"
            className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
          >
            Görev Yerine Göre Personel Listesi
            <span className="block text-xs font-normal text-slate-500 mt-0.5">
              Konum, cinsiyet, unvan, statü ve fiili görev (Görev Bilgileri ile uyumlu anlık görüntü)
            </span>
          </Link>
        </li>
      </ul>
    </div>
  )
}
