import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { katsayiTr, paraTr } from '@/lib/ayliktan-kesme-hesap'
import { emeklilikBelgeCoz } from '@/lib/emeklilik-tazminati-hesap'
import { ikGorevPersonelleri } from '@/lib/ik-imza-personel'
import { EvrakPdfIndir } from '@/components/hesaplama/EvrakImzaSecimi'

export const dynamic = 'force-dynamic'

export default async function EmeklilikDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const kayitId = Number(id)
  if (!Number.isFinite(kayitId)) notFound()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('emeklilik_tazminati_kayitlari')
    .select('id, belge')
    .eq('id', kayitId)
    .maybeSingle()
  const belge = emeklilikBelgeCoz(data?.belge)
  if (!belge) notFound()
  const imzaPersonel = await ikGorevPersonelleri(supabase)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link href="/hesaplama/emeklilik-tazminati" className="text-sm text-slate-500 hover:text-slate-700">
            ← Emeklilik Tazminatı
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 mt-2">Emeklilik Tazminatı</h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Link href={`/hesaplama/emeklilik-tazminati/${kayitId}/duzenle`} className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
            Düzenle
          </Link>
          <EvrakPdfIndir href={`/api/hesaplama/emeklilik-tazminati/pdf?id=${kayitId}`} personel={imzaPersonel} />
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-3xl">
        <table className="w-full text-sm">
          <tbody>
            {[
              ['Personel', `${belge.ad_soyad} (${belge.sicil_no})`],
              ['T.C. Kimlik No', belge.tckn || '—'],
              ['Ünvan', belge.unvan || '—'],
              ['Statü', belge.statu],
              ['Gösterge', String(belge.gosterge)],
              ['Memur aylık katsayısı', katsayiTr(belge.maasKatsayi)],
              ['Damga vergisi oranı', katsayiTr(belge.damgaOrani)],
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
            <tr className="border-b border-slate-100"><td className="py-2">Brüt tazminat</td><td className="py-2 text-right tabular-nums">{paraTr(belge.brut)}</td></tr>
            <tr className="border-b border-slate-100"><td className="py-2">Damga vergisi</td><td className="py-2 text-right tabular-nums">{paraTr(belge.damga)}</td></tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 font-semibold">Ödenecek tutar</td>
              <td className="pt-3 text-right font-semibold tabular-nums">{paraTr(belge.net)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-4 text-sm text-slate-700">{belge.dayanak}</p>
      </div>
    </div>
  )
}
