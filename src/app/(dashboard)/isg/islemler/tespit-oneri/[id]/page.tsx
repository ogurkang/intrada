import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isgDurumEtiket, tespitOneriTarihGoster } from '@/lib/isg-tespit-oneri'

export const dynamic = 'force-dynamic'

type Kayit = {
  id: number
  sira_no: number
  isyeri_mudurluk_id: number
  tespit_oneri: string
  sorumlu_mudurluk_id: number
  isbirligi_mudurluk_id: number | null
  durum: string
  son_tarih: string
}

function alan(etiket: string, deger: string) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{etiket}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{deger || '—'}</p>
    </div>
  )
}

export default async function TespitOneriDetayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: idParam } = await params
  const id = Number.parseInt(idParam, 10)
  if (!Number.isInteger(id) || id <= 0) notFound()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [{ data, error }, { data: mudurlukler }] = await Promise.all([
    sb
      .from('isg_tespit_oneri')
      .select('id, sira_no, isyeri_mudurluk_id, tespit_oneri, sorumlu_mudurluk_id, isbirligi_mudurluk_id, durum, son_tarih')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('tanim_mudurluk').select('id, mudurluk_adi'),
  ])
  if (error || !data) notFound()

  const kayit = data as Kayit
  const ad = new Map((mudurlukler ?? []).map(m => [m.id, m.mudurluk_adi]))

  return (
    <div className="w-full">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <Link href="/isg/islemler/tespit-oneri" className="mb-2 inline-flex text-sm text-slate-500 hover:text-slate-700">
            ← Tespit ve Öneri
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Tespit/Öneri Detayı</h1>
          <p className="mt-1 text-sm text-slate-500">Sıra No: {kayit.sira_no}</p>
        </div>
        <Link
          href={`/isg/islemler/tespit-oneri/${kayit.id}/duzenle`}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Düzenle
        </Link>
      </div>

      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
        {alan('İşyeri Unvanı', ad.get(kayit.isyeri_mudurluk_id) ?? '—')}
        {alan('Tespit Öneri', kayit.tespit_oneri)}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {alan('Sorumlu Müdürlük', ad.get(kayit.sorumlu_mudurluk_id) ?? '—')}
          {alan(
            'İş Birliği Yapılacak Müdürlük',
            kayit.isbirligi_mudurluk_id ? (ad.get(kayit.isbirligi_mudurluk_id) ?? '—') : '—',
          )}
          {alan('Durum', isgDurumEtiket(kayit.durum))}
          {alan('Son Tarih', tespitOneriTarihGoster(kayit.son_tarih))}
        </div>
      </div>
    </div>
  )
}
