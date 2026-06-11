import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { kadroDurumuHesapla } from '@/lib/kadro-durum'
import {
  kadroAuditSnapshot,
  KADRO_AUDIT_SELECT,
  KADRO_ALAN_ETIKETLERI,
  type KadroBosaltmaAuditKayit,
} from '@/lib/kadro-audit'
import { alanDegisiklikleriHesapla, degisiklikPayload } from '@/lib/personel-audit'

type SB = SupabaseClient<Database>

export type { KadroBosaltmaAuditKayit }

/**
 * Personel ayrılışı (tarih + nedeni) kaydedildiğinde: sicilin atandığı aktif kadro
 * satırlarından çıkarılır; asıl ayrılıp kadro tamamen boşalırsa ayrılış bilgisi yazılır.
 */
export async function kadroPasifeAlPersonelIcin(
  supabase: SB,
  sicil_no: string,
  ayrilis_tarihi: string,
  ayrilis_nedeni: string,
): Promise<{ hata?: string; bosaltilanKadroIdleri?: number[]; bosaltmaKayitlari?: KadroBosaltmaAuditKayit[] }> {
  const sicil = sicil_no.trim()
  if (!sicil) return {}

  const { data: kadrolar, error: selErr } = await supabase
    .from('kadro_hareketleri')
    .select(`id, ${KADRO_AUDIT_SELECT}`)
    .or(`asil.eq.${sicil},vekil.eq.${sicil}`)
    .is('ayrilis_tarihi', null)

  if (selErr) return { hata: selErr.message }
  if (!kadrolar?.length) return {}

  const bosaltilanKadroIdleri: number[] = []
  const bosaltmaKayitlari: KadroBosaltmaAuditKayit[] = []

  for (const k of kadrolar) {
    const asil = String(k.asil ?? '').trim()
    const vekil = String(k.vekil ?? '').trim()
    if (asil !== sicil && vekil !== sicil) continue

    const oncekiSnap = kadroAuditSnapshot(k)
    const sonAsil = asil === sicil ? null : k.asil
    const sonVekil = vekil === sicil ? null : k.vekil
    const durumu = kadroDurumuHesapla(sonAsil, sonVekil)

    const update: {
      asil: string | null
      vekil: string | null
      durumu: 'Dolu' | 'Vekil' | 'Boş'
      ayrilis_tarihi?: string
      ayrilis_nedeni?: string
    } = {
      asil: sonAsil,
      vekil: sonVekil,
      durumu,
    }

    if (asil === sicil && durumu === 'Boş') {
      update.ayrilis_tarihi = ayrilis_tarihi
      update.ayrilis_nedeni = ayrilis_nedeni
    }

    const sonrakiSnap = kadroAuditSnapshot({ ...k, ...update })
    const degisiklikler = alanDegisiklikleriHesapla(oncekiSnap, sonrakiSnap, KADRO_ALAN_ETIKETLERI)
    const payload = degisiklikPayload(degisiklikler)

    const { error: updErr } = await supabase
      .from('kadro_hareketleri')
      .update(update)
      .eq('id', k.id)
    if (updErr) return { hata: updErr.message }
    bosaltilanKadroIdleri.push(k.id)
    if (degisiklikler.length > 0) {
      bosaltmaKayitlari.push({
        kadroId: k.id,
        onceki: payload.onceki,
        sonraki: payload.sonraki,
      })
    }
  }

  return { bosaltilanKadroIdleri, bosaltmaKayitlari }
}
