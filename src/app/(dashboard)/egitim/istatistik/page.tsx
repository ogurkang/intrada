import { createClient } from '@/lib/supabase/server'
import EgitimIstatistikClient, {
  type IstatistikDonem, type IstatistikEgitim, type IstatistikPersonel,
} from '@/components/egitim/EgitimIstatistikClient'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'
import { istatistikKatilimKaydet } from './actions'

interface Props {
  searchParams: Promise<{ donem?: string }>
}

export default async function EgitimIstatistikPage({ searchParams }: Props) {
  const { donem: donemStr } = await searchParams
  const seciliDonemId = donemStr ? parseInt(donemStr, 10) : null

  const supabase = await createClient()

  // Tüm dönemler
  const { data: donemRaw } = await supabase
    .from('egitim_takvimi_donem')
    .select('id, yil, donem_adi')
    .order('yil', { ascending: false })

  const donemler: IstatistikDonem[] = (donemRaw ?? []).map(d => ({
    id: d.id, yil: d.yil, donem_adi: d.donem_adi,
  }))

  const seciliDonem = donemler.find(d => d.id === seciliDonemId) ?? null

  if (!seciliDonem) {
    return (
      <EgitimIstatistikClient
        donemler={donemler}
        seciliDonem={null}
        egitimler={[]}
        personeller={[]}
        katilimSet={new Set()}
      />
    )
  }

  // Seçili dönem için eğitimler + katılımlar + personel
  const [{ data: egitimRaw }, { data: katilimRaw }, { data: kadroRaw }, { data: calisanRaw }] =
    await Promise.all([
      supabase.from('egitim_takvimi_egitim')
        .select('id, egitim_adi, kisa_ad, kanal, sure_dakika, katilimci_sayisi, program, egitim_baslangic, egitim_bitis')
        .eq('donem_id', seciliDonemId!)
        .order('egitim_baslangic'),
      supabase.from('egitim_istatistik_katilim')
        .select('sicil_no, egitim_id')
        .eq('donem_id', seciliDonemId!),
      supabase.from('kadro_hareketleri')
        .select('asil, gorev_mudurlugu, kadro_mudurlugu')
        .is('ayrilis_tarihi', null)
        .not('asil', 'is', null),
      supabase.from('calisan').select('sicil_no, ad_soyad'),
    ])

  const egitimler: IstatistikEgitim[] = (egitimRaw ?? []).map(e => ({
    id:               e.id,
    egitim_adi:       e.egitim_adi,
    kisa_ad:          e.kisa_ad,
    kanal:            e.kanal,
    sure_dakika:      e.sure_dakika ?? 0,
    katilimci_sayisi: e.katilimci_sayisi ?? 0,
    program:          e.program as string | null,
    egitim_baslangic: e.egitim_baslangic,
    egitim_bitis:     e.egitim_bitis,
  }))

  const katilimSet = new Set<string>(
    (katilimRaw ?? []).map(k => `${k.sicil_no}:${k.egitim_id}`)
  )

  const katilimAuditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'egitim_istatistik_katilim',
    Array.from(katilimSet),
  )

  const adMap: Record<string, string> = {}
  ;(calisanRaw ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })

  const mudMap: Record<string, string> = {}
  ;(kadroRaw ?? []).forEach(k => { if (k.asil) mudMap[k.asil] = k.gorev_mudurlugu ?? k.kadro_mudurlugu ?? '' })

  const sicilSeti = new Set((kadroRaw ?? []).map(k => k.asil).filter(Boolean) as string[])

  const personeller: IstatistikPersonel[] = Array.from(sicilSeti).map(s => ({
    sicil_no: s,
    ad_soyad: adMap[s] ?? null,
    mudurluk: mudMap[s] ?? null,
  })).sort((a, b) => (a.mudurluk ?? '').localeCompare(b.mudurluk ?? '', 'tr') || (a.ad_soyad ?? '').localeCompare(b.ad_soyad ?? '', 'tr'))

  const mudurlukMap: Record<string, string> = Object.fromEntries(
    personeller.map(p => [p.sicil_no, p.mudurluk ?? ''])
  )

  return (
    <EgitimIstatistikClient
      donemler={donemler}
      seciliDonem={seciliDonem}
      egitimler={egitimler}
      personeller={personeller}
      katilimSet={katilimSet}
      donemId={seciliDonemId ?? undefined}
      mudurlukMap={mudurlukMap}
      katilimAuditLoglarByRefId={katilimAuditLoglarByRefId}
      onKatilimKaydet={istatistikKatilimKaydet}
    />
  )
}
