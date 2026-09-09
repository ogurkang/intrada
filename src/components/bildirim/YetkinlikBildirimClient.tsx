'use client'

import PersonelTekAlanTopluClient from '@/components/personel/PersonelTekAlanTopluClient'
import {
  BILGISAYAR_KULLANMIYOR,
  BILGISAYAR_YETKINLIK_SECENEKLER,
  yetkinlikAuditDegerGoster,
  yetkinlikAuditDiffSatirlari,
} from '@/lib/yetkinlik'
import type { Tables } from '@/types/database'

interface Satir {
  sicil_no: string
  public_id: string
  ad_soyad: string
  tckn: string | null
  kadro_unvani: string | null
  gorev_unvani: string | null
  deger: string | null
}

interface Props {
  data: Satir[]
  auditLoglarByRefId: Record<string, Tables<'personel_audit_log'>[]>
  onSatirKaydet: (sicil_no: string, fd: FormData) => Promise<{ hata?: string }>
  onTopluKaydet: (
    satirlar: { sicil_no: string; deger: string | null }[],
  ) => Promise<{ hata?: string; kaydedilen?: number }>
}

export default function YetkinlikBildirimClient({
  data,
  auditLoglarByRefId,
  onSatirKaydet,
  onTopluKaydet,
}: Props) {
  return (
    <PersonelTekAlanTopluClient
      baslik="Yetkinlik Bildirimi"
      alanEtiketi="Yetkinlik"
      data={data}
      inputType="select"
      secenekler={[...BILGISAYAR_YETKINLIK_SECENEKLER]}
      bosSecenekEtiketi="Seçiniz"
      sortBy="sicil_no"
      onSatirKaydet={onSatirKaydet}
      onTopluKaydet={onTopluKaydet}
      vurguDeger={BILGISAYAR_KULLANMIYOR}
      unvanSutunlari
      auditLoglarByRefId={auditLoglarByRefId}
      auditBaslik="Yetkinlik Geçmişi"
      auditDiffSatirlari={yetkinlikAuditDiffSatirlari}
      auditDegerGoster={yetkinlikAuditDegerGoster}
    />
  )
}
