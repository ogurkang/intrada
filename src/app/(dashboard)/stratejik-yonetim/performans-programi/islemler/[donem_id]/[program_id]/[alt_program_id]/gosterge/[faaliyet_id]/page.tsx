import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PpFaaliyetGostergeClient, { type PpGostergeForm } from '@/components/stratejik/PpFaaliyetGostergeClient'
import { getKullaniciGorevMudurlukleri } from '@/lib/kullanici-mudurluk'
import { ppMaliyetSeciciMi, ppNorm, ppOturum } from '@/lib/pp-erisim'

function sayi(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export default async function FaaliyetGostergePage({
  params,
}: {
  params: Promise<{ donem_id: string; program_id: string; alt_program_id: string; faaliyet_id: string }>
}) {
  const p = await params
  const yil = Number.parseInt(p.donem_id, 10)
  const programId = Number.parseInt(p.program_id, 10)
  const altProgramId = Number.parseInt(p.alt_program_id, 10)
  const faaliyetId = Number.parseInt(p.faaliyet_id, 10)
  if (![yil, programId, altProgramId, faaliyetId].every(Number.isFinite)) notFound()

  const supabase = await createClient()
  const ot = await ppOturum(supabase)
  if (!ot) notFound()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: faaliyet } = await sb.from('stratejik_plan_faaliyet').select('id, faaliyet_adi, alt_hedef_id').eq('id', faaliyetId).maybeSingle()
  const altHedefId = Number(faaliyet?.alt_hedef_id)
  if (!faaliyet || !Number.isFinite(altHedefId)) notFound()
  const { data: bag } = await sb.from('performans_programi_alt_program_hedef').select('id').eq('alt_program_id', altProgramId).eq('alt_hedef_id', altHedefId).maybeSingle()
  if (!bag) notFound()
  const { data: altHedef } = await sb.from('stratejik_plan_alt_hedef').select('kodu, alt_hedef_adi, mudurluk').eq('id', altHedefId).maybeSingle()
  const mudurluk = String(altHedef?.mudurluk ?? '').trim()
  const secici = await ppMaliyetSeciciMi(supabase, ot.access)
  if (!secici) {
    if (ot.access.mode !== 'kullanici') notFound()
    const { mudurlukler } = await getKullaniciGorevMudurlukleri(supabase, ot.access.sicilNo)
    if (!mudurlukler.some(m => ppNorm(m) === ppNorm(mudurluk))) notFound()
  }

  const { data: donemRaw } = await sb.from('stratejik_plan_donem').select('baslangic_tarihi, bitis_tarihi').order('id', { ascending: false })
  const donem = (donemRaw ?? []).find((d: { baslangic_tarihi: string; bitis_tarihi: string }) => {
    const a = Number(String(d.baslangic_tarihi).slice(0, 4))
    const b = Number(String(d.bitis_tarihi).slice(0, 4))
    return yil >= a && yil <= b
  })
  const donemBas = donem ? Number(String(donem.baslangic_tarihi).slice(0, 4)) : yil
  const { data: gostergeRaw } = await sb
    .from('stratejik_plan_gosterge')
    .select('id, gosterge_adi, birim, yil_1, yil_2, yil_3, yil_4, yil_5')
    .eq('faaliyet_id', faaliyetId)
    .eq('aktif', true)
    .order('sira_no')
  const gostergeler = (gostergeRaw ?? []) as { id: number; gosterge_adi: string; birim: string; yil_1: number | null; yil_2: number | null; yil_3: number | null; yil_4: number | null; yil_5: number | null }[]
  const ids = gostergeler.map(g => g.id)
  const { data: veriRaw } = ids.length
    ? await sb.from('performans_programi_veri_giris').select('gosterge_id, yil, mudurluk, onceki_yil_gerceklesme, planlanan_cari_yil, gerceklesme_tahmini_cari_yil, tahmin_sonraki_yil_1, tahmin_sonraki_yil_2, gosterge_aciklama, hesaplama_yontemi').in('gosterge_id', ids).in('yil', [yil - 1, yil])
    : { data: [] }
  const veriler = ((veriRaw ?? []) as { gosterge_id: number; yil: number; mudurluk: string; onceki_yil_gerceklesme?: number | null; planlanan_cari_yil?: number | null; gerceklesme_tahmini_cari_yil?: number | null; tahmin_sonraki_yil_1?: number | null; tahmin_sonraki_yil_2?: number | null; gosterge_aciklama?: string | null; hesaplama_yontemi?: string | null }[])
    .filter(v => ppNorm(v.mudurluk) === ppNorm(mudurluk))

  function planYil(g: { yil_1: number | null; yil_2: number | null; yil_3: number | null; yil_4: number | null; yil_5: number | null }, hedefYil: number): number | null {
    const i = hedefYil - donemBas
    if (i < 0 || i > 4) return null
    return sayi([g.yil_1, g.yil_2, g.yil_3, g.yil_4, g.yil_5][i])
  }

  const satirlar: PpGostergeForm[] = gostergeler.map(g => {
    const onceki = veriler.find(v => v.gosterge_id === g.id && v.yil === yil - 1)
    const cari = veriler.find(v => v.gosterge_id === g.id && v.yil === yil)
    return {
      id: g.id,
      ad: g.gosterge_adi,
      birim: g.birim,
      gerceklesme: sayi(onceki?.onceki_yil_gerceklesme) ?? planYil(g, yil - 2),
      planlanan: sayi(onceki?.planlanan_cari_yil) ?? planYil(g, yil - 1),
      yilSonu: sayi(onceki?.gerceklesme_tahmini_cari_yil),
      hedef: sayi(cari?.planlanan_cari_yil) ?? planYil(g, yil),
      tahmin1: sayi(cari?.tahmin_sonraki_yil_1) ?? planYil(g, yil + 1),
      tahmin2: sayi(cari?.tahmin_sonraki_yil_2) ?? planYil(g, yil + 2),
      aciklama: String(cari?.gosterge_aciklama ?? ''),
      hesaplama: String(cari?.hesaplama_yontemi ?? ''),
    }
  })

  return (
    <PpFaaliyetGostergeClient
      yil={yil}
      altProgramId={altProgramId}
      programId={programId}
      faaliyetId={faaliyetId}
      faaliyetAdi={String(faaliyet.faaliyet_adi)}
      satirlar={satirlar}
    />
  )
}
