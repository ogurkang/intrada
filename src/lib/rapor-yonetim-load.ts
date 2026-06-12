import type { SupabaseClient } from '@supabase/supabase-js'
import type { Tables } from '@/types/database'
import { RAPOR_TANIMLARI, type RaporTanim } from '@/lib/rapor-tanimlari'

export interface RaporKapsamOzet {
  tarih: string
  actor_email: string | null
  ozet: string
  kaynak: 'audit' | 'supabase'
}

export interface RaporYonetimSatir extends RaporTanim {
  sonKapsam: RaporKapsamOzet | null
}

type DbRaporTanim = {
  kod: string
  slug: string
  baslik: string
  aciklama: string
  renk: string
  olusturulma_tarihi: string
  kapsam_tipi: string
  aktif: boolean
}

function dbToTanim(row: DbRaporTanim): RaporTanim {
  return {
    kod: row.kod,
    slug: row.slug,
    href: `/rapor/${row.slug}`,
    baslik: row.baslik,
    aciklama: row.aciklama,
    renk: row.renk,
    olusturulma_tarihi: row.olusturulma_tarihi,
    kapsam_tipi: (row.kapsam_tipi as RaporTanim['kapsam_tipi']) ?? 'yok',
  }
}

function statikFallback(): RaporTanim[] {
  return RAPOR_TANIMLARI
}

export async function yukleRaporYonetimVerisi(supabase: SupabaseClient): Promise<{
  raporlar: RaporYonetimSatir[]
  auditLoglarByKod: Record<string, Tables<'personel_audit_log'>[]>
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [
    { data: tanimRaw },
    { data: auditRaw },
    { data: gylAyar },
    { data: yibAyar },
    { data: ihrGecmis },
  ] = await Promise.all([
    sb.from('rapor_tanim').select('*').eq('aktif', true).order('baslik'),
    supabase
      .from('personel_audit_log')
      .select('*')
      .eq('ref_table', 'rapor_tanim')
      .order('created_at', { ascending: false }),
    sb.from('rapor_gorev_yeri_liste_ayar').select('updated_at').order('updated_at', { ascending: false }).limit(1),
    sb.from('rapor_yonetici_iletisim_liste_ayar').select('updated_at').order('updated_at', { ascending: false }).limit(1),
    supabase
      .from('rapor_izin_excel_gecmis')
      .select('created_at, actor_email, yil, sira_bas, sira_bit, kayit_sayisi')
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const tanimlar: RaporTanim[] =
    tanimRaw?.length ? (tanimRaw as DbRaporTanim[]).map(dbToTanim) : statikFallback()

  const dbKodSet = new Set(tanimlar.map(t => t.kod))
  for (const s of statikFallback()) {
    if (!dbKodSet.has(s.kod)) tanimlar.push(s)
  }
  tanimlar.sort((a, b) => a.baslik.localeCompare(b.baslik, 'tr'))

  const auditLoglarByKod: Record<string, Tables<'personel_audit_log'>[]> = {}
  const sonAuditByKod = new Map<string, Tables<'personel_audit_log'>>()
  for (const log of auditRaw ?? []) {
    const kod = String(log.ref_id ?? '').trim()
    if (!kod) continue
    if (!auditLoglarByKod[kod]) auditLoglarByKod[kod] = []
    auditLoglarByKod[kod].push(log as Tables<'personel_audit_log'>)
    if (!sonAuditByKod.has(kod)) sonAuditByKod.set(kod, log as Tables<'personel_audit_log'>)
  }

  const supabaseFallback = new Map<string, RaporKapsamOzet>()
  if (gylAyar?.[0]?.updated_at) {
    supabaseFallback.set('GYL', {
      tarih: gylAyar[0].updated_at,
      actor_email: null,
      ozet: 'Liste kapsam ayarı (Supabase kaydı)',
      kaynak: 'supabase',
    })
  }
  if (yibAyar?.[0]?.updated_at) {
    supabaseFallback.set('YIB', {
      tarih: yibAyar[0].updated_at,
      actor_email: null,
      ozet: 'Liste kapsam ayarı (Supabase kaydı)',
      kaynak: 'supabase',
    })
  }
  if (ihrGecmis?.[0]) {
    const g = ihrGecmis[0]
    supabaseFallback.set('IHR', {
      tarih: g.created_at,
      actor_email: g.actor_email ?? null,
      ozet: `Excel kapsamı: ${g.yil} yılı, sıra ${g.sira_bas}–${g.sira_bit} (${g.kayit_sayisi} kayıt)`,
      kaynak: 'supabase',
    })
  }

  const raporlar: RaporYonetimSatir[] = tanimlar.map(t => {
    const audit = sonAuditByKod.get(t.kod)
    let sonKapsam: RaporKapsamOzet | null = null
    if (audit) {
      sonKapsam = {
        tarih: audit.created_at,
        actor_email: audit.actor_email,
        ozet: audit.ozet,
        kaynak: 'audit',
      }
    } else {
      sonKapsam = supabaseFallback.get(t.kod) ?? null
    }
    return { ...t, sonKapsam }
  })

  return { raporlar, auditLoglarByKod }
}
