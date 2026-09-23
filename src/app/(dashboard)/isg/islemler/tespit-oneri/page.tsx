import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GozDetayLink, KalemDuzenleLink } from '@/components/ui/TabloIslemIkonlari'
import { isgDurumEtiket, tespitOneriTarihGoster } from '@/lib/isg-tespit-oneri'

export const dynamic = 'force-dynamic'

type Satir = {
  id: number
  sira_no: number
  tespit_oneri: string
  durum: string
  son_tarih: string
  isyeri_mudurluk_id: number
  sorumlu_mudurluk_id: number
}

export default async function TespitOneriListePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data: kayitlar, error }, { data: mudurlukler }] = await Promise.all([
    sb
      .from('isg_tespit_oneri')
      .select('id, sira_no, tespit_oneri, durum, son_tarih, isyeri_mudurluk_id, sorumlu_mudurluk_id')
      .order('sira_no'),
    supabase.from('tanim_mudurluk').select('id, mudurluk_adi'),
  ])

  const ad = new Map((mudurlukler ?? []).map(m => [m.id, m.mudurluk_adi]))
  const satirlar = (kayitlar ?? []) as Satir[]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link href="/isg/islemler" className="mb-2 inline-flex text-sm text-slate-500 hover:text-slate-700">
            ← İşlemler
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Tespit ve Öneri</h1>
          <p className="mt-0.5 text-sm text-slate-500">İşyeri tespitleri, sorumlu müdürlük ve son tarih takibi</p>
        </div>
        <Link
          href="/isg/islemler/tespit-oneri/yeni"
          className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Tespit/Öneri Ekle
        </Link>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Veri yüklenirken hata: {error.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="w-24 px-4 py-3 text-left font-semibold text-slate-600">Sıra No</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">İş Yeri Unvanı</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Açıklama</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Sorumlu Müdürlük</th>
              <th className="w-40 px-4 py-3 text-left font-semibold text-slate-600">Durum</th>
              <th className="w-32 px-4 py-3 text-left font-semibold text-slate-600">Son Tarih</th>
              <th className="w-28 px-4 py-3 text-center font-semibold text-slate-600">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {satirlar.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-slate-400">
                  Henüz tespit/öneri kaydı yok.
                </td>
              </tr>
            ) : null}
            {satirlar.map(row => (
              <tr key={row.id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.sira_no}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{ad.get(row.isyeri_mudurluk_id) ?? '—'}</td>
                <td className="max-w-md px-4 py-3 text-slate-600">
                  <p className="line-clamp-2">{row.tespit_oneri}</p>
                </td>
                <td className="px-4 py-3 text-slate-700">{ad.get(row.sorumlu_mudurluk_id) ?? '—'}</td>
                <td className="px-4 py-3 text-slate-700">{isgDurumEtiket(row.durum)}</td>
                <td className="px-4 py-3 font-mono text-xs tabular-nums text-slate-600">
                  {tespitOneriTarihGoster(row.son_tarih)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <KalemDuzenleLink href={`/isg/islemler/tespit-oneri/${row.id}/duzenle`} title="Düzenle" />
                    <GozDetayLink href={`/isg/islemler/tespit-oneri/${row.id}`} title="Detay" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
