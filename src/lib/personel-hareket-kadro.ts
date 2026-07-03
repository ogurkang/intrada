import type { Tables } from '@/types/database'

type KH = Tables<'kadro_hareketleri'>
type PH = Tables<'personel_hareketleri'>

/** Kadro satırından görüntüleme için sentetik personel hareketi (form kaydı yoksa). */
export function sentetikHareketKadrodan(
  kadro: KH,
  sicil_no: string,
  kadroRol: 'asil' | 'vekil',
): PH {
  const mud = kadro.gorev_mudurlugu ?? kadro.kadro_mudurlugu ?? ''
  const unvan = kadro.gorev_unvani ?? kadro.kadro_unvani ?? ''
  const now = new Date(0).toISOString()
  return {
    id: 0,
    public_id: '',
    sicil_no,
    hareket_tipi: kadroRol === 'vekil' ? 'Vekalet' : (kadro.gelis_nedeni ?? null),
    kadro_sira_no: kadro.kadro_sira_no ?? null,
    kadro_id: kadro.id,
    kadro_rol: kadroRol,
    yururluk_tarihi: kadro.memuriyet_tarihi ?? kadro.kuruma_giris_tarihi ?? null,
    adaylik_suresi: null,
    asli_memuriyete_atanma_tarihi: kadro.memuriyet_tarihi ?? null,
    eski_gorev_yeri: kadro.geldigi_yer ?? null,
    eski_unvan: null,
    eski_sinif: null,
    eski_kadro_derecesi: null,
    eski_kha_derece: null,
    eski_kha_kademe: null,
    eski_ekea_derece: null,
    eski_ekea_kademe: null,
    eski_kidem_yili: null,
    eski_oht: null,
    eski_igz: null,
    eski_ek_odeme: null,
    eski_ek_gosterge: null,
    yeni_gorev_yeri: mud || null,
    yeni_unvan: unvan || null,
    yeni_sinif: null,
    yeni_kadro_derecesi: kadro.kadro_derecesi ?? null,
    yeni_kha_derece: null,
    yeni_kha_kademe: null,
    yeni_ekea_derece: null,
    yeni_ekea_kademe: null,
    yeni_kidem_yili: null,
    yeni_oht: null,
    yeni_igz: null,
    yeni_ek_odeme: null,
    yeni_ek_gosterge: null,
    dayanak: null,
    aciklama: kadro.aciklama ?? null,
    teklif_eden: null,
    onaylayan: null,
    ise_baslama_tarihi: kadro.memuriyet_tarihi ?? null,
    ayrilis_tarihi: kadro.ayrilis_tarihi ?? null,
    ayrilis_nedeni: null,
    kayit_tarihi: null,
    kayit_no: null,
    dagitim_mudurlukleri: null,
    kayit_zamani: kadro.created_at ?? kadro.updated_at ?? now,
  }
}

export function kadroRolDogrula(
  kadro: Pick<KH, 'asil' | 'vekil'>,
  sicil_no: string,
  rol: string,
): 'asil' | 'vekil' | null {
  const s = sicil_no.trim()
  if (rol === 'vekil' && (kadro.vekil ?? '').trim() === s) return 'vekil'
  if (rol === 'asil' && (kadro.asil ?? '').trim() === s) return 'asil'
  if ((kadro.vekil ?? '').trim() === s) return 'vekil'
  if ((kadro.asil ?? '').trim() === s) return 'asil'
  return null
}
