'use client'

import { useMemo, useState } from 'react'
import { ornekKisiAyAy, type PersonelMaliyetBelge } from '@/lib/personel-maliyet-hesap'

function tl(n: number): string {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const DONEMLER = [
  { id: 'mevcut', etiket: 'Mevcut' },
  { id: 'yil1', etiket: '1. yıl' },
  { id: 'yil2', etiket: '2. yıl' },
] as const

export default function OrnekKisiAyAy({ belge }: { belge: PersonelMaliyetBelge }) {
  const [donem, setDonem] = useState<(typeof DONEMLER)[number]['id']>('yil1')
  const [grupId, setGrupId] = useState(belge.gruplar[0]?.id ?? '')
  const grup = belge.gruplar.find(g => g.id === grupId) ?? belge.gruplar[0]
  const aylar = useMemo(() => (grup ? ornekKisiAyAy(belge, grup, donem) : []), [belge, grup, donem])
  const toplam = aylar.reduce(
    (t, a) => ({ net: t.net + a.net, vergi: t.vergi + a.vergi, maliyet: t.maliyet + a.maliyet }),
    { net: 0, vergi: 0, maliyet: 0 },
  )

  if (!grup) return null

  return (
    <section className="space-y-3">
      <div className="max-w-3xl">
        <h2 className="text-sm font-semibold text-slate-800">Örnek kişi, ay ay</h2>
        <p className="mt-1 text-sm text-slate-600">
          Her görev grubundan bir kişinin yıllık kazancı. NET eline geçendir. VERGİ, asgari ücret istisnası düşülmüş gelir vergisi ile damga vergisidir.
          MALİYET, brüte işveren SGK ve işsizlik primi eklenmiş tutardır. Yıl içinde vergi dilimi yükseldikçe net düşer; maliyet aynı kalır.
          İkramiye on iki aya bölünür. Evlenme ve doğum yardımı bu tabloya yazılmaz.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {DONEMLER.map(d => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDonem(d.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${donem === d.id ? 'bg-slate-800 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            {d.etiket}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {belge.gruplar.map(g => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGrupId(g.id)}
            className={`rounded-full px-3 py-1 text-xs ${g.id === grup.id ? 'bg-slate-800 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
          >
            {g.ad}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Ay</th>
              <th className="px-3 py-2 text-right">Net</th>
              <th className="px-3 py-2 text-right">Vergi</th>
              <th className="px-3 py-2 text-right">Maliyet</th>
            </tr>
          </thead>
          <tbody>
            {aylar.map(a => (
              <tr key={a.ay} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-800">{a.ay}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-800">{tl(a.net)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-800">{tl(a.vergi)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-800">{tl(a.maliyet)}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-200 bg-slate-50 font-medium">
              <td className="px-3 py-2 text-slate-800">Yıl</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-800">{tl(toplam.net)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-800">{tl(toplam.vergi)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-800">{tl(toplam.maliyet)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        {grup.ad}, 1 kişi. İşçi SGK %14 ve işsizlik %1 netten düşülür, vergi sütununa yazılmaz.
        Yemek yardımının günlük 300 TL’ye kadar olan kısmı prim ve vergi matrahına girmez.
        Vergi dilimleri ve asgari ücret 2026 tarifesidir. 2027 dilimleri yayımlanınca güncellenir.
        Üstteki kurum maliyeti bütün personelin toplamıdır; bu tablo tek kişinin bordrosudur.
      </p>
    </section>
  )
}
