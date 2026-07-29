'use client'

import MalBildirimFormClient, { type MalKopyalaInitial } from '@/components/bildirim/MalBildirimFormClient'
import type { PersonelSecenek } from '@/lib/bildirim-personel'

export type { KimlikFormSatir, TasinmazFormSatir, KooperatifFormSatir, TasitFormSatir, DigerTasinirFormSatir } from '@/components/bildirim/MalBildirimFormClient'

interface Props {
  memurlar: PersonelSecenek[]
  onKaydet: (fd: FormData) => Promise<{ hata?: string }>
  kullaniciKendiSicil?: string
  kopyalaInitial?: MalKopyalaInitial
}

/** Yeni mal bildirimi — tam form; düzenleme için `MalBildirimFormClient` `mode="edit"` kullanılır. */
export default function MalYeniClient({ memurlar, onKaydet, kullaniciKendiSicil, kopyalaInitial }: Props) {
  return (
    <MalBildirimFormClient
      mode="create"
      memurlar={memurlar}
      onKaydet={onKaydet}
      kullaniciKendiSicil={kullaniciKendiSicil}
      kopyalaInitial={kopyalaInitial}
    />
  )
}
