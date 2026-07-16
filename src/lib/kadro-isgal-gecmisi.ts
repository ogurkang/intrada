import type { Tables } from '@/types/database'
import { kadroAuditDiffSatirlari } from '@/lib/kadro-audit'

export interface KadroIsgalKaydi {
  sicil_no: string
  ad_soyad: string | null
  rol: 'Asil' | 'Vekil'
  baslangic: string | null
  bitis: string | null
  devam_ediyor: boolean
  hareket_tipi: string | null
}

type PH = Pick<
  Tables<'personel_hareketleri'>,
  | 'id'
  | 'sicil_no'
  | 'kadro_id'
  | 'kadro_rol'
  | 'kadro_sira_no'
  | 'hareket_tipi'
  | 'yururluk_tarihi'
  | 'ise_baslama_tarihi'
  | 'ayrilis_tarihi'
>

type AuditLog = Tables<'personel_audit_log'>

function baslangicTarihi(h: PH): string | null {
  return h.ise_baslama_tarihi ?? h.yururluk_tarihi ?? null
}

function rolEtiket(rol: string | null | undefined): 'Asil' | 'Vekil' | null {
  const r = String(rol ?? '').trim().toLocaleLowerCase('tr-TR')
  if (r === 'asil') return 'Asil'
  if (r === 'vekil') return 'Vekil'
  return null
}

function personelHareketlerindenIsgal(
  rows: PH[],
  adMap: Record<string, string>,
  aktif: { asil: string | null; vekil: string | null },
): KadroIsgalKaydi[] {
  const out: KadroIsgalKaydi[] = []
  for (const h of rows) {
    const rol = rolEtiket(h.kadro_rol) ?? 'Asil'
    const sicil = String(h.sicil_no ?? '').trim()
    if (!sicil) continue
    const bitis = h.ayrilis_tarihi ?? null
    const devam =
      !bitis &&
      ((rol === 'Asil' && aktif.asil === sicil) || (rol === 'Vekil' && aktif.vekil === sicil))
    out.push({
      sicil_no: sicil,
      ad_soyad: adMap[sicil] ?? null,
      rol,
      baslangic: baslangicTarihi(h),
      bitis,
      devam_ediyor: devam,
      hareket_tipi: h.hareket_tipi ?? null,
    })
  }
  return out.sort((a, b) => {
    const ta = a.baslangic ?? ''
    const tb = b.baslangic ?? ''
    return tb.localeCompare(ta) || a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true })
  })
}

function auditLoglarindanIsgal(
  logs: AuditLog[],
  adMap: Record<string, string>,
  aktif: { asil: string | null; vekil: string | null },
): KadroIsgalKaydi[] {
  const sorted = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  const acik = new Map<string, { rol: 'Asil' | 'Vekil'; baslangic: string }>()
  const kapali: KadroIsgalKaydi[] = []

  function kapat(sicil: string, rol: 'Asil' | 'Vekil', bitis: string) {
    const key = `${sicil}|${rol}`
    const prev = acik.get(key)
    if (!prev) return
    kapali.push({
      sicil_no: sicil,
      ad_soyad: adMap[sicil] ?? null,
      rol,
      baslangic: prev.baslangic,
      bitis,
      devam_ediyor: false,
      hareket_tipi: null,
    })
    acik.delete(key)
  }

  function ac(sicil: string, rol: 'Asil' | 'Vekil', baslangic: string) {
    acik.set(`${sicil}|${rol}`, { rol, baslangic })
  }

  for (const log of sorted) {
    const gun = String(log.created_at ?? '').slice(0, 10)
    for (const d of kadroAuditDiffSatirlari(log.onceki, log.sonraki)) {
      if (d.alan !== 'asil' && d.alan !== 'vekil') continue
      const rol: 'Asil' | 'Vekil' = d.alan === 'vekil' ? 'Vekil' : 'Asil'
      const eski = String(d.onceki ?? '').trim()
      const yeni = String(d.sonraki ?? '').trim()
      if (eski && eski !== yeni) kapat(eski, rol, gun)
      if (yeni && eski !== yeni) ac(yeni, rol, gun)
    }
  }

  for (const [key, v] of acik) {
    const sicil = key.split('|')[0]!
    const devam =
      (v.rol === 'Asil' && aktif.asil === sicil) ||
      (v.rol === 'Vekil' && aktif.vekil === sicil)
    kapali.push({
      sicil_no: sicil,
      ad_soyad: adMap[sicil] ?? null,
      rol: v.rol,
      baslangic: v.baslangic,
      bitis: null,
      devam_ediyor: devam,
      hareket_tipi: null,
    })
  }

  return kapali.sort((a, b) => {
    const ta = a.baslangic ?? ''
    const tb = b.baslangic ?? ''
    return tb.localeCompare(ta) || a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true })
  })
}

export async function yukleKadroIsgalGecmisi(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  kadro: Pick<Tables<'kadro_hareketleri'>, 'id' | 'kadro_sira_no' | 'asil' | 'vekil'>,
  adMap: Record<string, string>,
  auditLoglar: AuditLog[],
): Promise<KadroIsgalKaydi[]> {
  const aktif = {
    asil: String(kadro.asil ?? '').trim() || null,
    vekil: String(kadro.vekil ?? '').trim() || null,
  }

  const select =
    'id, sicil_no, kadro_id, kadro_rol, kadro_sira_no, hareket_tipi, yururluk_tarihi, ise_baslama_tarihi, ayrilis_tarihi'

  const byIdRes = await supabase
    .from('personel_hareketleri')
    .select(select)
    .eq('kadro_id', kadro.id)
    .order('yururluk_tarihi', { ascending: false })

  let hareketRows = (byIdRes.data ?? []) as PH[]

  const sira = String(kadro.kadro_sira_no ?? '').trim()
  if (sira) {
    const bySiraRes = await supabase
      .from('personel_hareketleri')
      .select(select)
      .eq('kadro_sira_no', sira)
      .order('yururluk_tarihi', { ascending: false })
    const seen = new Set(hareketRows.map(r => r.id))
    for (const r of (bySiraRes.data ?? []) as PH[]) {
      if (!seen.has(r.id)) hareketRows.push(r)
    }
  }

  if (hareketRows.length > 0) {
    return personelHareketlerindenIsgal(hareketRows, adMap, aktif)
  }

  const fromAudit = auditLoglarindanIsgal(auditLoglar, adMap, aktif)
  return fromAudit.filter(
    r => r.baslangic || r.bitis || r.devam_ediyor,
  )
}
