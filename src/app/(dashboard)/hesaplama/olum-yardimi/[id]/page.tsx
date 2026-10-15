import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { katsayiTr, paraTr } from '@/lib/ayliktan-kesme-hesap'
import { OLUM_YARDIMI_DAYANAK, olumBelgeCoz } from '@/lib/olum-yardimi-hesap'
import { ikGorevPersonelleri } from '@/lib/ik-imza-personel'
import { EvrakPdfIndir } from '@/components/hesaplama/EvrakImzaSecimi'

export const dynamic = 'force-dynamic'

export default async function OlumDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const kayitId = Number(id)
  if (!Number.isFinite(kayitId)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('olum_yardimi_kayitlari')
    .select('id, belge')
    .eq('id', kayitId)
    .maybeSingle()
  const belge = olumBelgeCoz(data?.belge)
  if (!belge) notFound()
  const imzaPersonel = await ikGorevPersonelleri(supabase)
  const payToplam = belge.varisler.reduce((a, v) => a + v.tutar, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link href="/hesaplama/olum-yardimi" className="text-sm text-slate-500 hover:text-slate-700">
            ← Ölüm Yardımı
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-2">Ölüm Yardımı</h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Link href={`/hesaplama/olum-yardimi/${kayitId}/duzenle`} className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
            Düzenle
          </Link>
          <EvrakPdfIndir href={`/api/hesaplama/olum-yardimi/pdf?id=${kayitId}`} personel={imzaPersonel} />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-3xl">
        <table className="w-full text-sm">
          <tbody>
            {[
              ['Personel', `${belge.ad_soyad} (${belge.sicil_no})`],
              ['T.C. Kimlik No', belge.tckn || '—'],
              ['Ünvan', belge.unvan || '—'],
              ['Gösterge', String(belge.gosterge)],
              ['Memur aylık katsayısı', katsayiTr(belge.maasKatsayi)],
              ['Kat', String(belge.kat)],
              ['En yüksek devlet memuru aylığı', paraTr(belge.aylik)],
              ['Ölüm yardımı', paraTr(belge.toplam)],
            ].map(([etiket, deger]) => (
              <tr key={etiket} className="border-b border-slate-100">
                <td className="py-2 text-slate-500 w-64">{etiket}</td>
                <td className="py-2 text-slate-800">{deger}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 text-left font-medium">TCKN</th>
              <th className="py-2 text-left font-medium">Ad soyad</th>
              <th className="py-2 text-left font-medium">IBAN</th>
              <th className="py-2 text-right font-medium">Pay</th>
            </tr>
          </thead>
          <tbody>
            {belge.varisler.map(v => (
              <tr key={v.tckn} className="border-b border-slate-100">
                <td className="py-2 font-mono text-xs">{v.tckn}</td>
                <td className="py-2">{v.adSoyad}</td>
                <td className="py-2 font-mono text-xs">{v.iban}</td>
                <td className="py-2 text-right tabular-nums">{paraTr(v.tutar)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 font-semibold" colSpan={3}>Varis payları toplamı</td>
              <td className="pt-3 text-right font-semibold tabular-nums">{paraTr(payToplam)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-4 text-sm text-slate-700">{OLUM_YARDIMI_DAYANAK}</p>
      </div>
    </div>
  )
}
