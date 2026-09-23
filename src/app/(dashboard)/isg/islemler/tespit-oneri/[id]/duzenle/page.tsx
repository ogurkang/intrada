import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TespitOneriFormClient from '@/components/isg/TespitOneriFormClient'
import { tespitOneriDurumMu, type MudurlukSecenek } from '@/lib/isg-tespit-oneri'
import { aktifMudurlukleriGetir } from '@/lib/yerel-bilgi-butce-mudurluk'
import { tespitOneriGuncelle } from '../../actions'

export const dynamic = 'force-dynamic'

export default async function TespitOneriDuzenlePage({
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
  const [{ data }, mudurlukler] = await Promise.all([
    sb
      .from('isg_tespit_oneri')
      .select('id, sira_no, isyeri_mudurluk_id, tespit_oneri, sorumlu_mudurluk_id, isbirligi_mudurluk_id, durum, son_tarih')
      .eq('id', id)
      .maybeSingle(),
    aktifMudurlukleriGetir(supabase),
  ])
  if (!data || !tespitOneriDurumMu(data.durum)) notFound()

  const seciliIdler = [data.isyeri_mudurluk_id, data.sorumlu_mudurluk_id, data.isbirligi_mudurluk_id]
    .filter((v): v is number => typeof v === 'number')
  const eksik = seciliIdler.filter(secili => !mudurlukler.some(m => m.id === secili))
  let secenekler: MudurlukSecenek[] = mudurlukler
  if (eksik.length) {
    const { data: eski } = await supabase
      .from('tanim_mudurluk')
      .select('id, mudurluk_adi')
      .in('id', eksik)
    secenekler = [...mudurlukler, ...(eski ?? [])]
  }

  return (
    <TespitOneriFormClient
      mudurlukler={secenekler}
      kayit={data}
      baslik="Tespit/Öneri Düzenle"
      onKaydet={tespitOneriGuncelle.bind(null, id)}
    />
  )
}
