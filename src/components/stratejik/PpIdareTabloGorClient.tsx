'use client'

import Link from 'next/link'
import type { PpPerformansBlok } from '@/lib/pp-mudurluk-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import PpPerformansBlokTablo from '@/components/stratejik/PpPerformansBlokTablo'
import PpFaaliyetMaliyetTabloGorunum from '@/components/stratejik/PpFaaliyetMaliyetTablo'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'

const LISTE_YOL = `${PP_RAPORLAR_BASE}/idare-performans-bilgisi`
const EXCEL = '/api/performans-programi/raporlar/idare-performans/excel'

export default function PpIdareTabloGorClient({
  blok,
  yil,
  mudurluk,
}: {
  blok: PpPerformansBlok
  yil: number
  mudurluk: string
}) {
  const listeQ = new URLSearchParams({ y: String(yil) })
  if (mudurluk) listeQ.set('m', mudurluk)
  if (blok.tabloKey) listeQ.set('h', blok.tabloKey)
  const excelQ = new URLSearchParams({
    yil: String(yil),
    ap: String(blok.altProgramId ?? ''),
    ah: String(blok.altHedefId ?? ''),
  })
  const excel = `${EXCEL}?${excelQ}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 truncate">
              {blok.hedefKod ? `${blok.hedefKod} — ` : ''}{blok.hedefAd ?? 'İdare Performans Bilgisi'}
            </h1>
            <PpEkranBilgi maddeler={[
              { baslik: 'Tablo', metin: 'Seçilen müdürlük ve performans hedefine özel İdare Performans Bilgisi tablosu.' },
              { baslik: 'Faaliyet maliyeti', metin: 'Her performans faaliyetinin ödenek teklifi, ekonomik sınıflandırmanın 1. düzeyinde ayrıca listelenir.' },
              { baslik: 'Excel İndir', metin: 'İdare tablosu ile faaliyet maliyet tablolarını birlikte indirir.' },
            ]} />
          </div>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-600">
            {blok.veriKaynagi || mudurluk}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={`${LISTE_YOL}?${listeQ}`}
            className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            ← Liste
          </Link>
          <a
            href={excel}
            className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Excel İndir
          </a>
        </div>
      </div>

      <PpPerformansBlokTablo blok={blok} yil={yil} tabloBaslik="İDARE PERFORMANS BİLGİSİ" />

      {(blok.maliyetTablolari ?? []).map(t => (
        <PpFaaliyetMaliyetTabloGorunum
          key={t.kod}
          blok={blok}
          tablo={t}
          yil={yil}
        />
      ))}
    </div>
  )
}
