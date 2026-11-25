import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StratejikPlanBreadcrumb from '@/components/stratejik/StratejikPlanBreadcrumb'
import PpPfGostergeClient, {
  type PpGostergeOdenekKod,
  type PpPfGostergeBaslangic,
} from '@/components/stratejik/PpPfGostergeClient'
import { ppIliskiSecenekleri } from '../islemler/[donem_id]/[program_id]/iliski-actions'
import { fetchAllTable } from '@/lib/supabase-sayfala'
import { ppFaaliyetKodu, ppParaYaz } from '@/lib/pp-iliski'

export default async function PpPfGostergeFormSayfa({
  faaliyetId,
  gostergeId,
}: {
  faaliyetId: number
  gostergeId?: number
}) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: faaliyet } = await sb
    .from('performans_programi_pf_faaliyet')
    .select('id, bag_id, sira_no, faaliyet_adi')
    .eq('id', faaliyetId)
    .maybeSingle()
  if (!faaliyet) notFound()
  const bagId = Number(faaliyet.bag_id)
  const { data: bag } = await sb
    .from('performans_programi_alt_program_hedef')
    .select('id, alt_hedef_id, faaliyet_id, alt_program_id')
    .eq('id', bagId)
    .maybeSingle()
  if (!bag) notFound()
  const { data: alt } = await sb
    .from('performans_programi_alt_program')
    .select('id, program_id')
    .eq('id', bag.alt_program_id)
    .maybeSingle()
  if (!alt) notFound()
  const { data: program } = await sb
    .from('performans_programi_program')
    .select('id, yil')
    .eq('id', alt.program_id)
    .maybeSingle()
  if (!program) notFound()
  const yil = Number(program.yil)
  const sec = await ppIliskiSecenekleri()
  const ph = sec.secenekler.find(s => s.id === Number(bag.alt_hedef_id))
  const fKod = ppFaaliyetKodu(ph?.kod ?? '', Number(faaliyet.sira_no))

  let kayit: {
    id: number
    sira_no: number
    gosterge_adi: string
    birim: string
    aciklama: string
    hesaplama_yontemi: string
    t2_gerceklesme: number | null
    t1_planlanan: number | null
    t1_yil_sonu: number | null
    t_hedef: number | null
    t1_tahmin: number | null
    t2_tahmin: number | null
    kurum_ici?: boolean
  } | null = null
  let kurumIci = false

  if (gostergeId) {
    const kurumlu = await sb
      .from('performans_programi_pf_gosterge')
      .select(
        'id, sira_no, gosterge_adi, birim, aciklama, hesaplama_yontemi, t2_gerceklesme, t1_planlanan, t1_yil_sonu, t_hedef, t1_tahmin, t2_tahmin, kurum_ici',
      )
      .eq('id', gostergeId)
      .eq('faaliyet_id', faaliyetId)
      .maybeSingle()
    const gostergeRes = kurumlu.error
      ? await sb
          .from('performans_programi_pf_gosterge')
          .select(
            'id, sira_no, gosterge_adi, birim, aciklama, hesaplama_yontemi, t2_gerceklesme, t1_planlanan, t1_yil_sonu, t_hedef, t1_tahmin, t2_tahmin',
          )
          .eq('id', gostergeId)
          .eq('faaliyet_id', faaliyetId)
          .maybeSingle()
      : kurumlu
    if (!gostergeRes.data) notFound()
    kayit = gostergeRes.data
    kurumIci = Boolean(kayit?.kurum_ici)
  }

  let sira = kayit?.sira_no ?? 0
  if (!kayit) {
    const { data: tum } = await sb
      .from('performans_programi_pf_gosterge')
      .select('sira_no')
      .eq('faaliyet_id', faaliyetId)
    const nolar = ((tum ?? []) as { sira_no: number | null }[])
      .map(r => Number(r.sira_no))
      .filter(Number.isFinite)
    sira = (nolar.length ? Math.max(...nolar) : 0) + 1
  }

  const yaz = (n: number | null | undefined) => ppParaYaz(n == null ? null : Number(n))
  const baslangic: PpPfGostergeBaslangic = {
    gostergeId: kayit?.id,
    ad: kayit?.gosterge_adi ?? '',
    birim: kayit?.birim ?? 'Adet',
    aciklama: kayit?.aciklama ?? '',
    hesaplama: kayit?.hesaplama_yontemi ?? '',
    t2: yaz(kayit?.t2_gerceklesme),
    t1plan: yaz(kayit?.t1_planlanan),
    t1son: yaz(kayit?.t1_yil_sonu),
    thedef: yaz(kayit?.t_hedef),
    t1tahmin: yaz(kayit?.t1_tahmin),
    t2tahmin: yaz(kayit?.t2_tahmin),
    sira,
  }

  const kodSorgu = await fetchAllTable<{ id: number; ekonomik_kod: string; hesap_adi: string }>(
    sb,
    'performans_programi_butce_kodu',
    'id, ekonomik_kod, hesap_adi',
    { orderColumn: 'ekonomik_kod', apply: q => q.eq('aktif', true) },
  )

  const odenek = new Map<number, PpGostergeOdenekKod>()
  if (kayit) {
    const { data: odenekRaw, error } = await sb
      .from('performans_programi_pf_odenek')
      .select('butce_kodu_id, t1_butce, t1_haziran, t1_yil_sonu, t_butce, t1_tahmin, t2_tahmin')
      .eq('pf_gosterge_id', kayit.id)
    if (!error) {
      for (const r of odenekRaw ?? []) {
        const satir = r as {
          butce_kodu_id: number
          t1_butce: number | null
          t1_haziran: number | null
          t1_yil_sonu: number | null
          t_butce: number | null
          t1_tahmin: number | null
          t2_tahmin: number | null
        }
        odenek.set(Number(satir.butce_kodu_id), {
          butce_kodu_id: Number(satir.butce_kodu_id),
          ekonomik_kod: '',
          hesap_adi: '',
          t1Butce: satir.t1_butce == null ? null : Number(satir.t1_butce),
          t1Haziran: satir.t1_haziran == null ? null : Number(satir.t1_haziran),
          t1YilSonu: satir.t1_yil_sonu == null ? null : Number(satir.t1_yil_sonu),
          tButce: satir.t_butce == null ? null : Number(satir.t_butce),
          t1Tahmin: satir.t1_tahmin == null ? null : Number(satir.t1_tahmin),
          t2Tahmin: satir.t2_tahmin == null ? null : Number(satir.t2_tahmin),
        })
      }
    }
  }

  const kodlar: PpGostergeOdenekKod[] = (kodSorgu.data ?? []).map(k => {
    const varOlan = odenek.get(k.id)
    return {
      butce_kodu_id: k.id,
      ekonomik_kod: k.ekonomik_kod,
      hesap_adi: k.hesap_adi,
      t1Butce: varOlan?.t1Butce ?? null,
      t1Haziran: varOlan?.t1Haziran ?? null,
      t1YilSonu: varOlan?.t1YilSonu ?? null,
      tButce: varOlan?.tButce ?? null,
      t1Tahmin: varOlan?.t1Tahmin ?? null,
      t2Tahmin: varOlan?.t2Tahmin ?? null,
    }
  })

  return (
    <div className="space-y-4">
      <StratejikPlanBreadcrumb
        items={[
          { label: 'İşlemler', href: '/stratejik-yonetim/performans-programi/islemler' },
          { label: 'Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}` },
          { label: 'Alt Programlar', href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${alt.program_id}` },
          {
            label: 'Faaliyetler',
            href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${alt.program_id}/${bag.alt_program_id}/faaliyetler`,
          },
          {
            label: 'Alt Program Hedefleri',
            href: `/stratejik-yonetim/performans-programi/islemler/${yil}/${alt.program_id}/${bag.alt_program_id}/faaliyetler/${bag.faaliyet_id}`,
          },
          { label: 'Performans Faaliyetleri', href: `/stratejik-yonetim/performans-programi/hedef/${bagId}` },
          {
            label: 'Göstergeler',
            href: `/stratejik-yonetim/performans-programi/pf/${faaliyetId}/gostergeler`,
          },
          { label: kayit ? 'Düzenle' : 'Ekle' },
        ]}
      />
      <PpPfGostergeClient
        yil={yil}
        faaliyetId={faaliyetId}
        faaliyetAd={String(faaliyet.faaliyet_adi ?? '')}
        fKod={fKod}
        baslangic={baslangic}
        kodlar={kodlar}
        kurumIciBaslangic={kurumIci}
      />
    </div>
  )
}
