'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { trNormalize } from '@/lib/turkce-search'
import type { PersonelKazancKuralKart } from '@/lib/personel-kazanc-kural'

interface Props {
  kartlar: PersonelKazancKuralKart[]
}

export default function PersonelKazancKuralClient({ kartlar }: Props) {
  const [arama, setArama] = useState('')

  const filtreli = useMemo(() => {
    const q = trNormalize(arama)
    if (!q) return kartlar
    return kartlar.filter(k =>
      trNormalize(
        `${k.sicil_no} ${k.ad_soyad} ${k.asilUnvan ?? ''} ${k.vekilUnvanlar.join(' ')}`,
      ).includes(q),
    )
  }, [kartlar, arama])

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link href="/tanimlar/kazanc-bilgi" className="text-sm text-slate-500 hover:text-slate-700">
            ← Kazanç Bilgileri
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Personel Kazanç Kuralı</h1>
          <p className="text-sm text-slate-500 mt-0.5 max-w-3xl">
            Her personelin asil / vekil unvanı, kadro ve KHA derecesi ile ek gösterge, ek ödeme, ÖHT, yan ödeme ve SDS
            kalemlerinin hangi mevzuata ve Intrada ekranına dayandığı.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder="Sicil, ad soyad veya unvan ara…"
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 min-w-[18rem]"
        />
        <span className="text-sm text-slate-500">{filtreli.length} personel</span>
      </div>

      <div className="space-y-4">
        {filtreli.length === 0 && (
          <p className="text-sm text-slate-400 bg-white border border-slate-200 rounded-xl px-4 py-10 text-center">
            Aramaya uyan personel yok.
          </p>
        )}
        {filtreli.map(k => (
          <article key={k.sicil_no} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <header className="mb-4 pb-4 border-b border-slate-100">
              <p className="text-xs text-slate-400 tabular-nums">{k.sicil_no}</p>
              <h2 className="text-lg font-semibold text-slate-800">{k.ad_soyad}</h2>
              {k.ogrenim ? <p className="text-xs text-slate-500 mt-0.5">{k.ogrenim}</p> : null}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <p>
                  <span className="text-slate-500">Asil unvan:</span>{' '}
                  <span className="font-medium text-slate-800">{k.asilUnvan ?? '—'}</span>
                </p>
                <p>
                  <span className="text-slate-500">Vekil unvan:</span>{' '}
                  <span className="font-medium text-slate-800">
                    {k.vekilUnvanlar.length ? k.vekilUnvanlar.join(', ') : '—'}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">Kadro derecesi:</span>{' '}
                  <span className="font-medium tabular-nums text-slate-800">
                    {kadroDereceMetni(k.asilKadroDerecesi, k.vekilKadroDereceleri)}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500">KHA derecesi:</span>{' '}
                  <span className="font-medium tabular-nums text-slate-800">{k.khaDerece ?? '—'}</span>
                </p>
              </div>
            </header>
            <dl className="space-y-3">
              {k.kalemler.map(kalem => (
                <div key={kalem.baslik} className="grid grid-cols-1 md:grid-cols-[9rem_1fr] gap-1 md:gap-4">
                  <dt className="text-sm font-semibold text-slate-700 pt-0.5">{kalem.baslik}</dt>
                  <dd className="text-sm text-slate-600 leading-relaxed">{kalem.aciklama}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </div>
  )
}

function kadroDereceMetni(asil: string | null, vekiller: string[]): string {
  const asilTxt = asil ? `Asil ${asil}` : null
  const vekilTxt = vekiller.length ? `Vekil ${vekiller.join(', ')}` : null
  return [asilTxt, vekilTxt].filter(Boolean).join(' · ') || '—'
}
