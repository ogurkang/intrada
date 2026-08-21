'use client'

import Link from 'next/link'
import { organizasyonAgacKur, type OrganizasyonBirimSatir } from '@/lib/organizasyon-birim'

export default function DenetimOrganizasyonSemasiClient({
  baslik,
  aciklama,
  organizasyonAdi,
  birimler,
  geriHref,
  geriLabel,
}: {
  baslik: string
  aciklama?: string | null
  organizasyonAdi: string | null
  birimler: OrganizasyonBirimSatir[]
  geriHref: string
  geriLabel: string
}) {
  const agac = organizasyonAgacKur(birimler)

  function satirlar(
    dugum: ReturnType<typeof organizasyonAgacKur>[number],
    seviye: number,
  ): { dugum: typeof dugum; seviye: number }[] {
    return [{ dugum, seviye }, ...dugum.cocuklar.flatMap(c => satirlar(c, seviye + 1))]
  }

  const duz = agac.flatMap(d => satirlar(d, 0))

  return (
    <div>
      <Link href={geriHref} className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-4">
        {geriLabel}
      </Link>
      <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
      {aciklama ? <p className="text-sm text-slate-600 mt-1">{aciklama}</p> : null}
      {organizasyonAdi ? (
        <p className="text-xs text-slate-500 mt-2">Kaynak: Tanımlar — {organizasyonAdi}</p>
      ) : null}

      <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
        {!organizasyonAdi ? (
          <div className="text-center py-12 text-slate-400 text-sm">Aktif organizasyon tanımı bulunamadı.</div>
        ) : duz.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">Aktif organizasyonda birim yok.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Birim</th>
                <th className="px-4 py-3 font-semibold">Personel</th>
                <th className="px-4 py-3 font-semibold">Telefon</th>
              </tr>
            </thead>
            <tbody>
              {duz.map(({ dugum, seviye }) => {
                const ozel = dugum.birim_turu !== 'mudurluk'
                return (
                  <tr key={dugum.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5" style={{ paddingLeft: `${seviye * 1.5 + 1}rem` }}>
                      <div className="flex items-center gap-2">
                        {seviye > 0 && <span className="text-slate-300">└</span>}
                        <span className={`font-medium ${ozel ? 'text-sky-800' : 'text-slate-800'}`}>{dugum.ad}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {dugum.personel_adi || <span className="italic text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                      {dugum.personel_telefon || <span className="italic text-slate-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
