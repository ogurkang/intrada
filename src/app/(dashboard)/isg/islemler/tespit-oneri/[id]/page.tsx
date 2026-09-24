import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IsgYonlendiriciDugme } from '@/components/isg/IsgYonlendiriciDugme'
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
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800">Tespit/Öneri Detayı</h1>
          <p className="mt-1 text-sm text-slate-500">Sıra No: {kayit.sira_no}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <IsgYonlendiriciDugme href="/isg/islemler/tespit-oneri">← Tespit ve Öneri</IsgYonlendiriciDugme>
          <IsgYonlendiriciDugme href={`/isg/islemler/tespit-oneri/${kayit.id}/duzenle`}>
            Düzenle
          </IsgYonlendiriciDugme>
        </div>
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
