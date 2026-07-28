import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { logRaporAyarListeDegisikligi, logRaporAyarListeReferansKaydi, raporAuditKayitKeyleriCikar } from '@/lib/rapor-audit'
import type { GorevYerineGoreListeSatir } from '@/lib/rapor-gorev-yerine-gore-liste'
import { gorevYerineGoreListeSatirlariYukle } from '@/lib/rapor-gorev-yerine-gore-liste-yukle'
import {
  gorevYerineGoreListeArtimliSenkron,
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
  opts: { logAudit?: boolean; logReferans?: boolean; oncekiKeys?: string[]; revalidate?: boolean } = {},
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

  if (opts.logReferans && opts.oncekiKeys) {
    await logRaporAyarListeReferansKaydi(supabase, 'GYL', opts.oncekiKeys, keys)
  } else if (opts.logAudit && opts.oncekiKeys) {
    await logRaporAyarListeDegisikligi(supabase, 'GYL', opts.oncekiKeys, keys)
  }

  if (opts.revalidate !== false) {
    revalidatePath('/rapor')
    revalidatePath('/rapor/gorev-yerine-gore-liste')
    revalidatePath('/api/rapor/gorev-yerine-gore-liste/excel')
  }
  return {}
}

export type GorevYeriListeSenkronOpts = {
  /** Yeni eklenen kayıtlar — listeye otomatik eklenir, ilgili grubun sonuna alınır. */
  otomatikEkleKeys?: string[]
  /** Manuel kayıt sonrası denetim günlüğü. */
  logAudit?: boolean
  /** false: sayfa render sırasında cache invalidation yapılmaz (Next.js kuralı). */
  revalidate?: boolean
}

/**
 * Kayıt listesini güncel verilere göre artımlı senkronize eder.
 * Mevcut sıra korunur; yalnızca ayrılanlar çıkarılır, müdürlük değişen ve yeni kayıtlar bloğun sonuna eklenir.
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
  const yeniSira = gorevYerineGoreListeArtimliSenkron(satirlar, oncekiAyar, otomatikEkleKeys)

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
    revalidate: opts.revalidate,
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

/**
 * Toplu güncelle ekranındaki sırayı aynen kaydeder (kurallar yeniden sıralamaz).
 * Denetim günlüğüne tam liste yazılır; sonraki sync kuralları bu sıra üzerinden uygular.
 */
export async function gorevYeriListeReferansSiraKaydetInternal(
  supabase: SupabaseClient,
  kayitKeyleri: string[],
): Promise<{ hata?: string; kayitSayisi?: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const temiz: string[] = []
  const seen = new Set<string>()
  for (const k of kayitKeyleri) {
    const key = String(k ?? '').trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    temiz.push(key)
  }
  if (!temiz.length) return { hata: 'Kaydedilecek kayıt yok.' }

  const { data: mevcutRows, error: mevcutErr } = await sb
    .from('rapor_gorev_yeri_liste_ayar')
    .select('kayit_key')
    .order('sira_no', { ascending: true })
  if (mevcutErr) return { hata: mevcutErr.message }
  const oncekiKeys = (mevcutRows ?? []).map((r: { kayit_key: string }) => r.kayit_key)

  const { satirlar, hata: yukleHata } = await gorevYerineGoreListeSatirlariYukle(supabase)
  if (yukleHata) return { hata: yukleHata }
  const satirByKey = new Map(satirlar.map(s => [s.kayit_key, s] as const))

  const sirali = temiz.filter(k => satirByKey.has(k))
  if (!sirali.length) return { hata: 'Geçerli personel kaydı bulunamadı.' }

  const yaz = await gorevYeriListeAyarYaz(sb, supabase, sirali, satirByKey, {
    logReferans: true,
    oncekiKeys,
  })
  if (yaz.hata) return yaz
  return { kayitSayisi: sirali.length }
}

/** Kayıt listesini tamamen boşaltır (sıfırdan sıralama için). */
export async function gorevYeriListeKayitListesiSifirlaInternal(
  supabase: SupabaseClient,
): Promise<{ hata?: string; silinen?: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: mevcutRows, error: mevcutErr } = await sb
    .from('rapor_gorev_yeri_liste_ayar')
    .select('kayit_key')
    .order('sira_no', { ascending: true })
  if (mevcutErr) return { hata: mevcutErr.message }
  const oncekiKeys = (mevcutRows ?? []).map((r: { kayit_key: string }) => r.kayit_key)
  const silinen = oncekiKeys.length

  const { error: delErr } = await sb.from('rapor_gorev_yeri_liste_ayar').delete().neq('id', 0)
  if (delErr) return { hata: delErr.message }

  if (silinen > 0) {
    await logRaporAyarListeDegisikligi(supabase, 'GYL', oncekiKeys, [])
  }

  revalidatePath('/rapor')
  revalidatePath('/rapor/gorev-yerine-gore-liste')
  revalidatePath('/api/rapor/gorev-yerine-gore-liste/excel')
  return { silinen }
}

/** GYL denetim günlüğü kayıtlarını siler. */
export async function gorevYeriListeDenetimGecmisiSifirlaInternal(
  supabase: SupabaseClient,
): Promise<{ hata?: string; silinen?: number }> {
  const { data: mevcut, error: selErr } = await supabase
    .from('personel_audit_log')
    .select('id')
    .eq('ref_table', 'rapor_tanim')
    .eq('ref_id', 'GYL')
  if (selErr) return { hata: selErr.message }

  const ids = (mevcut ?? []).map(r => r.id)
  if (!ids.length) return { silinen: 0 }

  const { error: delErr } = await supabase.from('personel_audit_log').delete().in('id', ids)
  if (delErr) return { hata: delErr.message }

  revalidatePath('/rapor')
  revalidatePath('/rapor/gorev-yerine-gore-liste')
  return { silinen: ids.length }
}

/**
 * Denetim günlüğündeki kayıt sırasını geri yükler.
 * Blok hiyerarşisi (Başkan → BBY → müdürlük) korunur; yeni personel ilgili grubun sonuna eklenir.
 */
export async function gorevYeriListeDenetimdenGeriYukleInternal(
  supabase: SupabaseClient,
  auditLogId: number,
): Promise<{ hata?: string; yuklenen?: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: log, error: logErr } = await supabase
    .from('personel_audit_log')
    .select('*')
    .eq('id', auditLogId)
    .eq('ref_table', 'rapor_tanim')
    .eq('ref_id', 'GYL')
    .maybeSingle()
  if (logErr) return { hata: logErr.message }
  if (!log) return { hata: 'Denetim kaydı bulunamadı.' }

  const keysFromAudit =
    raporAuditKayitKeyleriCikar(log.sonraki) ?? raporAuditKayitKeyleriCikar(log.onceki)
  if (!keysFromAudit?.length) {
    return {
      hata:
        'Bu kayıtta tam liste sırası yok (eski format). Önce manuel kayıt yapın veya daha yeni bir denetim kaydı seçin.',
    }
  }

  const { satirlar, hata: yukleHata } = await gorevYerineGoreListeSatirlariYukle(supabase)
  if (yukleHata) return { hata: yukleHata }
  const satirByKey = new Map(satirlar.map(s => [s.kayit_key, s] as const))

  const restoredKeys = keysFromAudit.filter(k => satirByKey.has(k))
  if (!restoredKeys.length) {
    return { hata: 'Denetim kaydındaki personelin hiçbiri güncel listede bulunamadı.' }
  }

  const restoredSet = new Set(restoredKeys)
  const yeniKeys = satirlar.map(s => s.kayit_key).filter(k => !restoredSet.has(k))

  const oncekiAyar: GorevYeriListeAyarSatir[] = restoredKeys.map(k => ({
    kayit_key: k,
    mudurluk: satirByKey.get(k)?.mudurluk ?? null,
  }))

  const referansKayit = String(log.islem ?? '') === 'Referans Sıralama Kaydı'
  const sirali =
    referansKayit && yeniKeys.length === 0
      ? restoredKeys
      : referansKayit
        ? gorevYerineGoreListeArtimliSenkron(
            satirlar,
            oncekiAyar,
            yeniKeys,
          )
        : gorevYerineGoreListeSiraOlustur(satirlar, oncekiAyar, yeniKeys)

  const { data: mevcutRows, error: mevcutErr } = await sb
    .from('rapor_gorev_yeri_liste_ayar')
    .select('kayit_key')
    .order('sira_no', { ascending: true })
  if (mevcutErr) return { hata: mevcutErr.message }
  const oncekiKeys = (mevcutRows ?? []).map((r: { kayit_key: string }) => r.kayit_key)

  const yaz = await gorevYeriListeAyarYaz(sb, supabase, sirali, satirByKey, {
    logAudit: true,
    oncekiKeys,
  })
  if (yaz.hata) return yaz
  return { yuklenen: sirali.length }
}
