import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchSmsAyar, smsAyarToConfig, smsAyarHazirMi } from '@/lib/sms-ayar'
import { smsMesajDurumSorgula } from '@/lib/sms-mesajpaketi'

export interface SmsLogOlaySatir {
  id: number
  log_id: number
  olay_tipi: string
  aciklama: string
  saglayici_durum: string | null
  created_at: string
}

const DURUM_ETIKET: Record<string, string> = {
  '0': 'Beklemede (sağlayıcı)',
  '1': 'İletildi',
  '2': 'Başarısız (sağlayıcı)',
}

function saglayiciDurumAciklama(kod: string | undefined): string {
  if (!kod) return 'Durum bilinmiyor.'
  return DURUM_ETIKET[kod] ?? `Sağlayıcı durum kodu: ${kod}`
}

/** Tek log kaydı için sağlayıcıdan durum sorgular, log + olay günceller. */
export async function smsLogDurumSenkronize(
  supabase: SupabaseClient,
  logId: number,
  opts?: { manuel?: boolean },
): Promise<{ guncellendi: boolean; durum?: string; hata?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayit } = await (supabase as any)
    .from('iletisim_sms_log')
    .select('id, durum, saglayici_mesaj_id, telefon, planlanan_gonderim_at')
    .eq('id', logId)
    .maybeSingle()

  if (!kayit) return { guncellendi: false, hata: 'Kayıt bulunamadı.' }
  if (kayit.durum === 'iptal') {
    return { guncellendi: false, hata: 'Kayıt iptal edilmiş.' }
  }
  if (!kayit.saglayici_mesaj_id) {
    return { guncellendi: false, hata: 'Sağlayıcı mesaj ID yok.' }
  }

  const ayar = await fetchSmsAyar(supabase)
  if (!smsAyarHazirMi(ayar)) return { guncellendi: false, hata: 'SMS ayarları hazır değil.' }

  const sonuc = await smsMesajDurumSorgula(smsAyarToConfig(ayar), String(kayit.saglayici_mesaj_id))
  const now = new Date().toISOString()

  if (!sonuc.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('iletisim_sms_log')
      .update({ gonderim_kontrol_at: now })
      .eq('id', logId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('iletisim_sms_log_olay').insert({
      log_id: logId,
      olay_tipi: 'kontrol_hata',
      aciklama: sonuc.hata ?? 'Durum sorgusu başarısız.',
      saglayici_durum: null,
    })

    return { guncellendi: false, hata: sonuc.hata }
  }

  const kod = sonuc.durumKodu
  let yeniDurum = kayit.durum as string
  let olayTipi = 'kontrol'
  let aciklama = saglayiciDurumAciklama(kod)

  if (kod === '1') {
    yeniDurum = 'gonderildi'
    olayTipi = 'gonderildi'
    aciklama = `Mesaj iletildi.${sonuc.telefon ? ` (${sonuc.telefon})` : ''}`
  } else if (kod === '2') {
    yeniDurum = 'basarisiz'
    olayTipi = 'basarisiz'
    aciklama = 'Sağlayıcı: iletim başarısız.'
  } else if (kod === '0') {
    olayTipi = 'beklemede'
    aciklama = `Sağlayıcı: gönderim henüz beklemede (planlı).${sonuc.telefon ? ` Numara: ${sonuc.telefon}` : ''}`
  }

  const durumDegisti = yeniDurum !== kayit.durum

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('iletisim_sms_log')
    .update({
      durum: yeniDurum,
      gonderim_kontrol_at: now,
      hata_mesaji: kod === '2' ? 'Sağlayıcı iletim raporu: başarısız.' : null,
    })
    .eq('id', logId)

  if (durumDegisti || (kod === '0' && opts?.manuel)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('iletisim_sms_log_olay').insert({
      log_id: logId,
      olay_tipi: olayTipi,
      aciklama,
      saglayici_durum: kod ?? null,
    })
  }

  return { guncellendi: durumDegisti || (kod === '0' && Boolean(opts?.manuel)), durum: yeniDurum }
}

/** Planlanmış ve süresi geçmiş kayıtların durumunu toplu sorgular. */
export async function smsPlanliLoglariSenkronize(
  supabase: SupabaseClient,
  limit = 50,
): Promise<number> {
  const simdi = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayitlar } = await (supabase as any)
    .from('iletisim_sms_log')
    .select('id')
    .eq('durum', 'planlandi')
    .not('saglayici_mesaj_id', 'is', null)
    .lte('planlanan_gonderim_at', simdi)
    .order('planlanan_gonderim_at', { ascending: true })
    .limit(limit)

  let sayac = 0
  for (const k of kayitlar ?? []) {
    const sonuc = await smsLogDurumSenkronize(supabase, k.id as number)
    if (sonuc.guncellendi) sayac += 1
  }
  return sayac
}

export async function smsLogOlaylariGetir(
  supabase: SupabaseClient,
  logIds: number[],
): Promise<Record<number, SmsLogOlaySatir[]>> {
  if (!logIds.length) return {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('iletisim_sms_log_olay')
    .select('id, log_id, olay_tipi, aciklama, saglayici_durum, created_at')
    .in('log_id', logIds)
    .order('created_at', { ascending: false })

  const map: Record<number, SmsLogOlaySatir[]> = {}
  for (const row of (data ?? []) as SmsLogOlaySatir[]) {
    const key = row.log_id
    if (!map[key]) map[key] = []
    map[key].push(row)
  }
  return map
}

/** Planlanmış SMS kaydını iptal eder. Önce sağlayıcı durumu sorgulanır; iletilmişse iptal edilemez. */
export async function smsLogIptalEt(
  supabase: SupabaseClient,
  logId: number,
  iptalEdenEmail: string,
): Promise<{ ok?: boolean; hata?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: kayit } = await (supabase as any)
    .from('iletisim_sms_log')
    .select('id, durum, saglayici_mesaj_id')
    .eq('id', logId)
    .maybeSingle()

  if (!kayit) return { hata: 'Kayıt bulunamadı.' }
  if (kayit.durum === 'iptal') return { hata: 'Bu kayıt zaten iptal edilmiş.' }
  if (kayit.durum !== 'planlandi') {
    return { hata: 'Yalnızca planlanmış gönderimler iptal edilebilir.' }
  }

  let saglayiciNotu = ''

  if (kayit.saglayici_mesaj_id) {
    const sync = await smsLogDurumSenkronize(supabase, logId)
    if (sync.durum === 'gonderildi') {
      return { hata: 'Mesaj sağlayıcı tarafından zaten iletilmiş; iptal edilemez.' }
    }
    if (sync.hata && sync.durum === undefined) {
      saglayiciNotu = ' Sağlayıcı durumu doğrulanamadı; kayıt yine de Intrada\'da iptal edildi.'
    }
  }

  const now = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('iletisim_sms_log')
    .update({ durum: 'iptal', gonderim_kontrol_at: now })
    .eq('id', logId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('iletisim_sms_log_olay').insert({
    log_id: logId,
    olay_tipi: 'iptal',
    aciklama:
      `${iptalEdenEmail} tarafından iptal edildi.${saglayiciNotu} Mesajpaketi API'sinde iptal uç noktası olmadığı için sağlayıcı kuyruğundaki mesaj otomatik iptal edilmeyebilir; gerekirse Mesajpaketi panelinden kontrol edin.`,
    saglayici_durum: null,
  })

  return { ok: true }
}
