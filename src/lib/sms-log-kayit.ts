import type { SupabaseClient } from '@supabase/supabase-js'
import type { SmsGonderSonuc } from '@/lib/sms-mesajpaketi'
import { tryCreateServiceRoleClient } from '@/lib/supabase/service-role'

export async function smsLogTekKayit(
  supabase: SupabaseClient,
  params: {
    actorId: string
    actorEmail: string | null
    aliciAd: string | null
    aliciSicil: string | null
    telefon: string
    mesaj: string
    originator: string
    baglam: string
    sonuc: SmsGonderSonuc
    planlananGonderimAt?: string | null
  },
): Promise<number | null> {
  const now = new Date().toISOString()
  const durum = params.sonuc.ok
    ? params.planlananGonderimAt
      ? 'planlandi'
      : 'gonderildi'
    : 'basarisiz'

  const yazici = tryCreateServiceRoleClient() ?? supabase

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (yazici as any)
    .from('iletisim_sms_log')
    .insert({
      actor_id: params.actorId,
      actor_email: params.actorEmail,
      alici_sicil: params.aliciSicil,
      alici_ad: params.aliciAd,
      telefon: params.telefon,
      mesaj: params.mesaj,
      originator: params.originator,
      durum,
      baglam: params.baglam,
      planlanan_gonderim_at: params.planlananGonderimAt ?? null,
      saglayici_mesaj_id: params.sonuc.mesajId ?? null,
      hata_kodu: params.sonuc.hataKodu ?? null,
      hata_mesaji: params.sonuc.ok ? null : params.sonuc.hata ?? null,
      created_at: now,
    })
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('SMS_LOG_INSERT', error.message)
    return null
  }

  const logId = data?.id as number | undefined
  if (!logId) return null

  const olayTipi = durum === 'planlandi' ? 'planlandi' : durum === 'gonderildi' ? 'gonderildi' : 'basarisiz'
  const aciklama =
    durum === 'gonderildi'
      ? 'Mesaj anında gönderildi.'
      : durum === 'planlandi'
        ? 'İleriki tarihte iletilmek üzere planlandı.'
        : `Gönderim başarısız: ${params.sonuc.hata ?? '—'}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: olayErr } = await (yazici as any).from('iletisim_sms_log_olay').insert({
    log_id: logId,
    olay_tipi: olayTipi,
    aciklama,
    saglayici_durum: null,
  })
  if (olayErr) console.error('SMS_LOG_OLAY_INSERT', olayErr.message)

  return logId
}
