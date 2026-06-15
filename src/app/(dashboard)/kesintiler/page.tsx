import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ModulHubClient from '@/components/ui/ModulHubClient'
import KesintilerListeTabSync from '@/components/kesintiler/KesintilerListeTabSync'
import { ayyZabitaHavuzSatirlari } from '@/lib/ayy-zabita-havuz'
import { getCariYilAraligi } from '@/lib/tarih'
import { loadAuditLoglarByRefTables, hubSonIslemFromLogs } from '@/lib/hub-audit-load'

const TANIMLAR = [
  {
    key: 'yev',
    kod: 'YEV',
    baslik: 'Yevmiye Puantajı',
    aciklama: 'Günlük saha çalışma kayıtları',
    href: '/kesintiler/yevmiye',
    tablo: 'yevmiye_donem' as const,
    renk: 'border-rose-200 bg-rose-50',
    ikonRenk: 'bg-rose-100 text-rose-600',
    birim: 'dönem',
    ikon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    key: 'arz',
    kod: 'ARZ',
    baslik: 'Arazi Puantajı',
    aciklama: 'TH kadrosu arazi tazminatı kayıtları',
    href: '/kesintiler/arazi',
    tablo: 'arazi_donem' as const,
    renk: 'border-teal-200 bg-teal-50',
    ikonRenk: 'bg-teal-100 text-teal-600',
    birim: 'dönem',
    ikon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
  },
  {
    key: 'ayy',
    kod: 'AYY',
    baslik: 'Aylık Yemek Yeni',
    aciklama: 'İzinli personelin yemek kesintileri',
    href: '/kesintiler/ayy',
    tablo: 'aylik_yemek_yeni_donem' as const,
    renk: 'border-blue-200 bg-blue-50',
    ikonRenk: 'bg-blue-100 text-blue-600',
    birim: 'dönem',
    ikon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-3.9.096-5.593.284M15 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A1.125 1.125 0 009.375 7.5H8.25m11.622 10.006a48.523 48.523 0 01-2.274.306 48.523 48.523 0 01-2.274-.306m0 0a48.523 48.523 0 002.274-.306 48.523 48.523 0 012.274.306" />
      </svg>
    ),
  },
  {
    key: 'rmy',
    kod: 'RMY',
    baslik: 'Raporlu Memurlar',
    aciklama: 'Raporlu personel kesinti dönemleri',
    href: '/kesintiler/rmy',
    tablo: 'raporlu_memurlar_yeni_donem' as const,
    renk: 'border-green-200 bg-green-50',
    ikonRenk: 'bg-green-100 text-green-600',
    birim: 'dönem',
    ikon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    key: 'ivy',
    kod: 'İVY',
    baslik: 'İzinli Vekiller',
    aciklama: 'Vekâlet eden personel kesintileri',
    href: '/kesintiler/ivy',
    tablo: 'izinli_vekiller_yeni_donem' as const,
    renk: 'border-purple-200 bg-purple-50',
    ikonRenk: 'bg-purple-100 text-purple-600',
    birim: 'dönem',
    ikon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    key: 'izy',
    kod: 'İZY',
    baslik: 'İzinli Zabıtalar',
    aciklama: 'Zabıta izin kesinti dönemleri',
    href: '/kesintiler/izy',
    tablo: 'izinli_zabitalar_yeni_donem' as const,
    renk: 'border-amber-200 bg-amber-50',
    ikonRenk: 'bg-amber-100 text-amber-600',
    birim: 'dönem',
    ikon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0110.5 3h6a2.25 2.25 0 012.25 2.25v13.5A2.25 2.25 0 0116.5 21h-6a2.25 2.25 0 01-2.25-2.25V15m-3 0l3-3m0 0l3 3m-3-3V12" />
      </svg>
    ),
  },
  {
    key: 'trm',
    kod: 'TRM',
    baslik: 'Toplam Raporlu Zabıtalar',
    aciklama: 'Zabıta personeli cari yıl rapor günü listesi',
    href: '/kesintiler/toplam-raporlu',
    tablo: null,
    renk: 'border-indigo-200 bg-indigo-50',
    ikonRenk: 'bg-indigo-100 text-indigo-600',
    birim: 'liste',
    ikon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
] as const

function tarihTr(d: Date) {
  return d.toLocaleDateString('tr-TR')
}

export default async function KesintilerPage() {
  const supabase = await createClient()
  const buYil = new Date().getFullYear()
  const cariYil = getCariYilAraligi(buYil)

  const donemTablolari = TANIMLAR.map(t => t.tablo).filter(Boolean) as string[]

  const [zabitaHavuzSatirlari, auditLoglarByRefTable, ...donemSonuclari] = await Promise.all([
    ayyZabitaHavuzSatirlari(supabase),
    loadAuditLoglarByRefTables(supabase, donemTablolari),
    ...TANIMLAR.map(async (t) => {
      if (!t.tablo) {
        return { acik: 0, toplamYil: 0 }
      }
      const { count: acik } = await supabase
        .from(t.tablo)
        .select('id', { count: 'exact', head: true })
        .eq('durum', 'Açık')
      const { count: toplamYil } = await supabase
        .from(t.tablo)
        .select('id', { count: 'exact', head: true })
        .eq('yil', buYil)
      return { acik: acik ?? 0, toplamYil: toplamYil ?? 0 }
    }),
  ])

  const kartlar = TANIMLAR.map((t, i) => {
    const { acik, toplamYil } = donemSonuclari[i]
    const auditLoglar = t.tablo ? (auditLoglarByRefTable[t.tablo] ?? []) : []
    return {
      key: t.key,
      kod: t.kod,
      baslik: t.baslik,
      aciklama: t.aciklama,
      href: t.href,
      renk: t.renk,
      ikonRenk: t.ikonRenk,
      ikon: t.ikon,
      sayi: t.tablo ? toplamYil : `${tarihTr(cariYil.baslangic)} – ${tarihTr(cariYil.bitis)}`,
      altMetin: t.tablo ? `${buYil} yılı · ${t.birim}` : t.birim,
      badge: t.tablo && acik > 0 ? `${acik} açık` : null,
      sonIslem: hubSonIslemFromLogs(auditLoglar),
      auditLoglar,
      auditTip: t.tablo ? ('kesinti-donem' as const) : undefined,
      gecmisBaslik: `Dönem Geçmişi — ${t.baslik}`,
    }
  })

  const zabitaHavuzAlt = (
    <Link href="/kesintiler/zabita-havuz" target="_blank" rel="noopener noreferrer"
      className="block rounded-xl border-2 border-amber-200 bg-amber-50 p-6 hover:shadow-md transition-all group mt-8">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-xl bg-amber-100 text-amber-600">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <svg className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors mt-1"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
      <p className="text-2xl font-bold text-slate-800 tabular-nums">{zabitaHavuzSatirlari.length}</p>
      <p className="text-xs text-slate-500 mb-2">kayıt · AYY havuzu</p>
      <p className="font-semibold text-slate-700">Zabıta Havuzu</p>
      <p className="text-sm text-slate-500 mt-0.5">
        Zabıta/normal kesinti kuralına alınacak personel listesi
        {zabitaHavuzSatirlari.filter(s => !s.zabitaKesintiAktif).length > 0 && (
          <span className="block mt-1 text-xs text-amber-700">
            Normal kesintiye alınan: {zabitaHavuzSatirlari.filter(s => !s.zabitaKesintiAktif).length}
          </span>
        )}
      </p>
    </Link>
  )

  return (
    <ModulHubClient
      baslik="Kesinti Yönetimi"
      aciklama="Dönem bazlı kesinti ve puantaj yönetimi. Kartlarda son dönem işlemi gösterilir; saat simgesiyle tüm geçmişe erişebilirsiniz."
      ustBilesen={<KesintilerListeTabSync />}
      altBilesen={zabitaHavuzAlt}
      kartlar={kartlar}
    />
  )
}
