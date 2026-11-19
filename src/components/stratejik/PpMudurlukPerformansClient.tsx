'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PpPerformansRaporYil } from '@/lib/pp-mudurluk-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'
import PpPerformansBlokTablo from '@/components/stratejik/PpPerformansBlokTablo'

export default function PpMudurlukPerformansClient({ rapor }: { rapor: PpPerformansRaporYil }) {
  const router = useRouter()
  const [sekme, setSekme] = useState(0)
  const aktif = rapor.sekmeler[sekme] ?? rapor.sekmeler[0]
  const excel = aktif
    ? `/api/performans-programi/raporlar/mudurluk-performans/excel?yil=${rapor.yil}&m=${encodeURIComponent(aktif.mudurluk)}`
    : ''

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Müdürlüklerin Performans Programı Tablosu</h1>
            <PpEkranBilgi maddeler={[
              { baslik: 'Yıl', metin: 'Raporun bütçe yılını değiştirir. Kayıt girişi yapmaz.' },
              { baslik: 'Müdürlük sekmesi', metin: 'Seçilen müdürlüğün alt program bloklarını açar.' },
              { baslik: 'Excel İndir', metin: 'Açık müdürlüğün tablosunu örnek formun düzeniyle indirir.' },
            ]} />
          </div>
          <p className="text-sm text-slate-600 mt-1">Seçilen yıl ve müdürlüğün performans programı tablosu.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Link
            href={PP_RAPORLAR_BASE}
            className="inline-flex items-center rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700"
          >
            ← Raporlar
          </Link>
          {aktif && (
            <a href={excel} className="inline-flex items-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-600">
              Excel İndir ({aktif.mudurluk})
            </a>
          )}
          <label className="text-sm text-slate-600 whitespace-nowrap">Yıl</label>
          <select
            value={rapor.yil}
            onChange={e => router.push(`${PP_RAPORLAR_BASE}/mudurluklerin-performans-programi?y=${e.target.value}`)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            {rapor.yillar.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {rapor.sekmeler.length === 0 ? (
        <p className="text-sm text-slate-500">Bu yıl için bağlı müdürlük yok.</p>
      ) : (
        <>
          <div className="border-b border-slate-200 overflow-x-auto">
            <nav className="flex gap-0 min-w-max" aria-label="Müdürlük sekmeleri">
              {rapor.sekmeler.map((s, i) => (
                <button
                  key={s.mudurluk}
                  type="button"
                  onClick={() => setSekme(i)}
                  className={`px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                    (aktif?.mudurluk === s.mudurluk)
                      ? 'border-teal-600 text-teal-800 bg-teal-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {s.mudurluk}
                </button>
              ))}
            </nav>
          </div>
          {aktif?.bloklar.map(blok => (
            <PpPerformansBlokTablo
              key={`${blok.programAdi}-${blok.altProgramAdi}-${blok.hedefKod ?? blok.hedef}`}
              blok={blok}
              yil={rapor.yil}
              tabloBaslik="MÜDÜRLÜK PERFORMANS BİLGİSİ"
            />
          ))}
        </>
      )}
    </div>
  )
}
