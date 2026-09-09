import { createClient } from '@/lib/supabase/server'
import YetkinlikBildirimClient from '@/components/bildirim/YetkinlikBildirimClient'
import { filterOutGodmodeCalisan } from '@/lib/godmode-calisan'
import { bilgisayarYetkinlikEtiket } from '@/lib/yetkinlik'
import { yetkinlikSatirKaydet, yetkinlikTopluKaydet } from './actions'
import { fetchAllCalisan, fetchAllPaged } from '@/lib/supabase-sayfala'
import { loadAuditLoglarGroupedByRefId } from '@/lib/audit-load'

export default async function YetkinlikBildirimPage() {
  const supabase = await createClient()
  const D = new Date().toISOString().slice(0, 10)

  const [{ data: calisanRaw }, { data: phRaw }, { data: kadroOzet }] = await Promise.all([
    fetchAllCalisan<{
      sicil_no: string
      public_id: string
      ad_soyad: string
      tckn: string | null
      bilgisayar_kullaniyor: boolean | null
    }>(supabase, 'sicil_no, public_id, ad_soyad, tckn, bilgisayar_kullaniyor'),
    fetchAllPaged<{ sicil_no: string; ayrilis_tarihi: string | null }>((from, to) =>
      supabase
        .from('personel_hareketleri')
        .select('sicil_no, ayrilis_tarihi')
        .order('yururluk_tarihi', { ascending: false })
        .range(from, to),
    ),
    fetchAllPaged<{
      sicil_no: string
      statu: string | null
      kadro_unvani: string | null
      gorev_unvani: string | null
    }>((from, to) =>
      supabase
        .from('personel_kadro_ozet')
        .select('sicil_no, statu, kadro_unvani, gorev_unvani')
        .order('sicil_no')
        .range(from, to),
    ),
  ])

  const sonAyrilis = new Map<string, string | null>()
  for (const r of phRaw ?? []) {
    if (!sonAyrilis.has(r.sicil_no)) sonAyrilis.set(r.sicil_no, r.ayrilis_tarihi)
  }
  const kadroBySicil = new Map<string, { statu: string | null; kadro_unvani: string | null; gorev_unvani: string | null }>()
  for (const k of kadroOzet ?? []) {
    if (!kadroBySicil.has(k.sicil_no)) kadroBySicil.set(k.sicil_no, k)
  }
  const memurSet = new Set(
    [...kadroBySicil.entries()].filter(([, k]) => (k.statu ?? '').trim() === 'Memur').map(([sicil]) => sicil),
  )

  const data = filterOutGodmodeCalisan(calisanRaw ?? [])
    .filter(c => {
      const ayr = sonAyrilis.get(c.sicil_no)
      if (ayr && ayr <= D) return false
      return memurSet.has(c.sicil_no)
    })
    .map(c => {
      const kadro = kadroBySicil.get(c.sicil_no)
      return {
        sicil_no: c.sicil_no,
        public_id: c.public_id,
        ad_soyad: c.ad_soyad,
        tckn: c.tckn ?? null,
        kadro_unvani: kadro?.kadro_unvani ?? null,
        gorev_unvani: kadro?.gorev_unvani ?? null,
        deger: bilgisayarYetkinlikEtiket(c.bilgisayar_kullaniyor),
      }
    })

  const auditLoglarByRefId = await loadAuditLoglarGroupedByRefId(
    supabase,
    'calisan',
    data.map(c => c.sicil_no),
    'yetkinlik',
  )

  return (
    <YetkinlikBildirimClient
      data={data}
      auditLoglarByRefId={auditLoglarByRefId}
      onSatirKaydet={yetkinlikSatirKaydet}
      onTopluKaydet={yetkinlikTopluKaydet}
    />
  )
}
