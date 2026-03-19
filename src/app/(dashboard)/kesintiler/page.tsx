import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getCariYilAraligi } from '@/lib/tarih'

const TANIMLAR = [
  { kod: 'YEV', baslik: 'Yevmiye Puantajı',       aciklama: 'Günlük saha çalışma kayıtları',           href: '/kesintiler/yevmiye',       tablo: 'yevmiye_donem',               renk: 'border-rose-200 bg-rose-50 text-rose-800'     },
  { kod: 'ARZ', baslik: 'Arazi Puantajı',         aciklama: 'TH kadrosu arazi tazminatı kayıtları',    href: '/kesintiler/arazi',         tablo: 'arazi_donem',                 renk: 'border-teal-200 bg-teal-50 text-teal-800'     },
  { kod: 'AYY', baslik: 'Aylık Yemek Yeni',        aciklama: 'İzinli personelin yemek kesintileri',     href: '/kesintiler/ayy',           tablo: 'aylik_yemek_yeni_donem',      renk: 'border-blue-200 bg-blue-50 text-blue-800'    },
  { kod: 'RMY', baslik: 'Raporlu Memurlar',    aciklama: 'Raporlu personel kesinti dönemleri',      href: '/kesintiler/rmy',           tablo: 'raporlu_memurlar_yeni_donem', renk: 'border-green-200 bg-green-50 text-green-800'  },
  { kod: 'İVY', baslik: 'İzinli Vekiller',   aciklama: 'Vekâlet eden personel kesintileri',       href: '/kesintiler/ivy',           tablo: 'izinli_vekiller_yeni_donem',  renk: 'border-purple-200 bg-purple-50 text-purple-800'},
  { kod: 'İZY', baslik: 'İzinli Zabıtalar', aciklama: 'Zabıta izin kesinti dönemleri',   href: '/kesintiler/izy',           tablo: 'izinli_zabitalar_yeni_donem', renk: 'border-amber-200 bg-amber-50 text-amber-800'  },
  { kod: 'TRM', baslik: 'Toplam Raporlu Zabıtalar', aciklama: 'Zabıta personeli cari yıl rapor günü listesi', href: '/kesintiler/toplam-raporlu', tablo: null, renk: 'border-indigo-200 bg-indigo-50 text-indigo-800' },
] as const

type DonemTablo = Exclude<(typeof TANIMLAR)[number]['tablo'], null>

function tarihTr(d: Date) {
  return d.toLocaleDateString('tr-TR')
}

export default async function KesintilerPage() {
  const supabase = await createClient()
  const buYil = new Date().getFullYear()
  const cariYil = getCariYilAraligi(buYil)

  const sonuclar = await Promise.all(
    TANIMLAR.map(async (t) => {
      if (!t.tablo) {
        return { ...t, acik: 0, toplamYil: 0 }
      }
      const { count: acik } = await supabase
        .from(t.tablo)
        .select('id', { count: 'exact', head: true })
        .eq('durum', 'Açık')
      const { count: toplamYil } = await supabase
        .from(t.tablo)
        .select('id', { count: 'exact', head: true })
        .eq('yil', buYil)
      return { ...t, acik: acik ?? 0, toplamYil: toplamYil ?? 0 }
    })
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Kesinti Yönetimi</h1>
        <p className="text-sm text-slate-500 mt-0.5">Dönem bazlı kesinti ve puantaj yönetimi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sonuclar.map((k) => (
          <Link key={k.href} href={k.href}
            className={`rounded-xl border p-5 ${k.renk} hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-xs font-bold tracking-widest opacity-60">{k.kod}</span>
                <h2 className="font-semibold text-slate-800 mt-0.5">{k.baslik}</h2>
              </div>
              {k.acik > 0 && (
                <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
                  {k.acik} açık
                </span>
              )}
            </div>
            <p className="text-xs opacity-60 mb-4">{k.aciklama}</p>
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-60">{k.tablo ? `${buYil} yılı: ${k.toplamYil} dönem` : `${tarihTr(cariYil.baslangic)} – ${tarihTr(cariYil.bitis)}`}</span>
              <span className="font-medium">Yönet →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
