import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { paraTr } from '@/lib/ayliktan-kesme-hesap'
import { emekliIkramiyeBelgeCoz } from '@/lib/emekli-ikramiye-maas-hesap'
import { ikGorevPersonelleri } from '@/lib/ik-imza-personel'
import { EvrakPdfIndir } from '@/components/hesaplama/EvrakImzaSecimi'

export const dynamic = 'force-dynamic'

export default async function EmekliIkramiyeDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const kayitId = Number(id)
  if (!Number.isFinite(kayitId)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('emekli_ikramiye_maas_kayitlari')
    .select('id, belge')
    .eq('id', kayitId)
    .maybeSingle()
  const belge = emekliIkramiyeBelgeCoz(data?.belge)
  if (!belge) notFound()
  const imzaPersonel = await ikGorevPersonelleri(supabase)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link href="/hesaplama/emekli-ikramiye-maas" className="text-sm text-slate-500 hover:text-slate-700">
            ← 4/C İkramiye ve Maaş
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-2">4/C İkramiye ve Maaş</h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Link
            href={`/hesaplama/emekli-ikramiye-maas/${kayitId}/duzenle`}
            className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Düzenle
          </Link>
          <EvrakPdfIndir href={`/api/hesaplama/emekli-ikramiye-maas/pdf?id=${kayitId}`} personel={imzaPersonel} />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-3xl">
        <table className="w-full text-sm">
          <tbody>
            {[
              ['Personel', `${belge.ad_soyad} (${belge.sicil_no})`],
              ['T.C. Kimlik No', belge.tckn || '—'],
              ['Ünvan', belge.unvan || '—'],
              ['Kanun', belge.kanun],
              ['Derece / kademe', `${belge.derece}/${belge.kademe}`],
              ['Aylık gösterge', String(belge.gosterge)],
              ['Ek gösterge', String(belge.ekGosterge)],
              ['Kıdem yılı', String(belge.kidemYili)],
              ['Hizmet', `${belge.hizmetYil} yıl ${belge.hizmetAy} ay ${belge.hizmetGun} gün`],
              ['İkramiye yılı', String(belge.ikramiyeYili)],
              ['Aylık tarihi', belge.donemEtiket],
              ['Tazminat oranı', `%${belge.tazminatOrani}`],
              ['Bağlama oranı', `%${belge.baglamaOrani}`],
            ].map(([etiket, deger]) => (
              <tr key={etiket} className="border-b border-slate-100">
                <td className="py-2 text-slate-500 w-56">{etiket}</td>
                <td className="py-2 text-slate-800">{deger}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 text-left font-medium">Kalem</th>
              <th className="py-2 text-right font-medium">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {belge.matrahKalemler.map(k => (
              <tr key={k.ad} className="border-b border-slate-100">
                <td className="py-2">{k.ad}</td>
                <td className="py-2 text-right tabular-nums">{paraTr(k.tutar)}</td>
              </tr>
            ))}
            <tr className="border-b border-slate-100">
              <td className="py-2 font-medium">Matrah</td>
              <td className="py-2 text-right tabular-nums font-medium">{paraTr(belge.matrah)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2">İkramiye</td>
              <td className="py-2 text-right tabular-nums">{paraTr(belge.ikramiye)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2">5434 usulü maaş</td>
              <td className="py-2 text-right tabular-nums">
                {belge.maas5434 != null ? paraTr(belge.maas5434) : '—'}
              </td>
            </tr>
          </tbody>
        </table>
        {belge.maasUyari ? <p className="mt-3 text-sm text-amber-900 bg-amber-50 rounded-lg px-3 py-2">{belge.maasUyari}</p> : null}
        <p className="mt-4 text-sm text-slate-700">{belge.uyari}</p>
      </div>
    </div>
  )
}
