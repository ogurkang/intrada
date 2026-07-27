import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { logRaporAyarListeDegisikligi } from '@/lib/rapor-audit'
import type { GorevYerineGoreListeSatir } from '@/lib/rapor-gorev-yerine-gore-liste'
import { gorevYerineGoreListeSatirlariYukle } from '@/lib/rapor-gorev-yerine-gore-liste-yukle'
import {
  gorevYerineGoreListeSiraOlustur,
  type GorevYeriListeAyarSatir,
} from '@/lib/rapor-gorev-yerine-gore-liste-siralama'

function normMud(v: string | null | undefined): string {
  return String(v ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR')
}

function mudurlukDegisti(
  onceki: string | null | undefined,
  guncel: string | null | undefined,
): boolean {
  return normMud(onceki) !== normMud(guncel)
}

async function gorevYeriListeAyarYaz(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  supabase: SupabaseClient,
  keys: string[],
  satirByKey: Map<string, GorevYerineGoreListeSatir>,
  opts: { logAudit?: boolean; oncekiKeys?: string[] } = {},
): Promise<{ hata?: string }> {
  const { error: delErr } = await sb.from('rapor_gorev_yeri_liste_ayar').delete().neq('id', 0)
  if (delErr) return { hata: delErr.message }

  if (keys.length) {
    const payload = keys.map((kayit_key, i) => ({
      kayit_key,
      sira_no: i + 1,
      mudurluk: satirByKey.get(kayit_key)?.mudurluk ?? null,
    }))
    const { error: insErr } = await sb.from('rapor_gorev_yeri_liste_ayar').insert(payload)
    if (insErr) return { hata: insErr.message }
  }

  if (opts.logAudit && opts.oncekiKeys) {
    await logRaporAyarListeDegisikligi(supabase, 'GYL', opts.oncekiKeys, keys)
  }

  revalidatePath('/rapor')
  revalidatePath('/rapor/gorev-yerine-gore-liste')
  revalidatePath('/api/rapor/gorev-yerine-gore-liste/excel')
  return {}
}

export type GorevYeriListeSenkronOpts = {
  /** Yeni eklenen kayıtlar — listeye otomatik eklenir ve grubun sonuna alınır. */
  otomatikEkleKeys?: string[]
  /** Manuel kayıt sonrası denetim günlüğü. */
  logAudit?: boolean
}

/**
 * Kayıt listesini güncel verilere göre yeniden sıralar.
 * Müdürlük değişimi ve yeni kayıtlar ilgili statü grubunun sonuna taşınır.
 */
export async function gorevYeriListeSenkronizeEt(
  supabase: SupabaseClient,
  opts: GorevYeriListeSenkronOpts = {},
): Promise<{ hata?: string; guncellendi?: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const otomatikEkleKeys = opts.otomatikEkleKeys ?? []

  const { satirlar, hata: yukleHata } = await gorevYerineGoreListeSatirlariYukle(supabase)
  if (yukleHata) return { hata: yukleHata }

  const satirByKey = new Map(satirlar.map(s => [s.kayit_key, s] as const))

  const { data: ayarRaw, error: ayarErr } = await sb
    .from('rapor_gorev_yeri_liste_ayar')
    .select('kayit_key, sira_no, mudurluk')
    .order('sira_no', { ascending: true })
  if (ayarErr) return { hata: ayarErr.message }

  const oncekiAyar: GorevYeriListeAyarSatir[] = (ayarRaw ?? [])
    .map((a: { kayit_key: string; mudurluk?: string | null }) => ({
      kayit_key: String(a.kayit_key ?? '').trim(),
      mudurluk: a.mudurluk ?? null,
    }))
    .filter((a: GorevYeriListeAyarSatir) => a.kayit_key)

  const oncekiKeys = oncekiAyar.map(a => a.kayit_key)
  const yeniSira = gorevYerineGoreListeSiraOlustur(satirlar, oncekiAyar, otomatikEkleKeys)

  const siraDegisti =
    yeniSira.length !== oncekiKeys.length || yeniSira.some((k, i) => k !== oncekiKeys[i])

  const mudurlukGuncelleme = yeniSira.some(key => {
    const prev = oncekiAyar.find(a => a.kayit_key === key)
    const guncel = satirByKey.get(key)?.mudurluk ?? null
    return !prev || mudurlukDegisti(prev.mudurluk, guncel)
  })

  const yeniEkleme = otomatikEkleKeys.some(k => satirByKey.has(k) && !oncekiKeys.includes(k))

  if (!siraDegisti && !mudurlukGuncelleme && !yeniEkleme) {
    return { guncellendi: false }
  }

  const yaz = await gorevYeriListeAyarYaz(sb, supabase, yeniSira, satirByKey, {
    logAudit: opts.logAudit,
    oncekiKeys,
  })
  if (yaz.hata) return { hata: yaz.hata }
  return { guncellendi: true }
}

/** Toplu güncelle / kayıt listesi kaydetme — mudurluk anlık görüntüsü ile birlikte. */
export async function gorevYeriListeAyarKaydetInternal(
  supabase: SupabaseClient,
  kayitKeyleri: string[],
): Promise<{ hata?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const temiz = Array.from(
    new Set(kayitKeyleri.map(k => String(k ?? '').trim()).filter(Boolean)),
  )

  const { data: mevcutRows, error: mevcutErr } = await sb
    .from('rapor_gorev_yeri_liste_ayar')
    .select('kayit_key')
    .order('sira_no', { ascending: true })
  if (mevcutErr) return { hata: mevcutErr.message }
  const oncekiKeys = (mevcutRows ?? []).map((r: { kayit_key: string }) => r.kayit_key)

  const { satirlar, hata: yukleHata } = await gorevYerineGoreListeSatirlariYukle(supabase)
  if (yukleHata) return { hata: yukleHata }
  const satirByKey = new Map(satirlar.map(s => [s.kayit_key, s] as const))

  const oncekiAyar: GorevYeriListeAyarSatir[] = oncekiKeys.map((k: string) => ({
    kayit_key: k,
    mudurluk: satirByKey.get(k)?.mudurluk ?? null,
  }))

  const yeniKeys = temiz.filter(k => !oncekiKeys.includes(k))
  const sirali = gorevYerineGoreListeSiraOlustur(satirlar, oncekiAyar, yeniKeys).filter(k =>
    temiz.includes(k),
  )

  for (const k of temiz) {
    if (!sirali.includes(k) && satirByKey.has(k)) sirali.push(k)
  }

  return gorevYeriListeAyarYaz(sb, supabase, sirali, satirByKey, {
    logAudit: true,
    oncekiKeys,
  })
}
