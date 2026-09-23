import { ggAayyyyToIso, parseTarihEsnek, toGgAayyyy } from '@/lib/tarih'

/**
 * İSG tespit/öneri durumları — tek kaynak.
 * Her aşama %25 ilerleme; etiketlerde kümülatif oran gösterilir.
 */
export const ISG_DURUM_TANIMLARI = [
  {
    kod: 'Planlandı',
    oran: 25,
    aciklama: 'Tespit veya öneri kayda alındı; uygulama henüz başlamadı.',
  },
  {
    kod: 'Devam Ediyor',
    oran: 50,
    aciklama: 'İlgili birimler üzerinde çalışıyor; aksiyon sürüyor.',
  },
  {
    kod: 'Kontrolde',
    oran: 75,
    aciklama: 'Uygulama tamamlandı; sonuç İSG tarafından kontrol ediliyor.',
  },
  {
    kod: 'Tamamlandı',
    oran: 100,
    aciklama: 'Kontrol sonucu uygun bulundu; süreç kapatıldı.',
  },
] as const

export type TespitOneriDurum = (typeof ISG_DURUM_TANIMLARI)[number]['kod']

/** Geriye uyum: eski sabit ad */
export const TESPIT_ONERI_DURUMLAR = ISG_DURUM_TANIMLARI.map(d => d.kod)

export type MudurlukSecenek = {
  id: number
  mudurluk_adi: string
}

export function tespitOneriDurumMu(v: string | null | undefined): v is TespitOneriDurum {
  return ISG_DURUM_TANIMLARI.some(d => d.kod === v)
}

export function isgDurumTanimi(kod: string | null | undefined) {
  return ISG_DURUM_TANIMLARI.find(d => d.kod === kod) ?? null
}

/** Seçim listesi ve tabloda: Planlandı (%25) */
export function isgDurumEtiket(kod: string | null | undefined): string {
  const t = isgDurumTanimi(kod)
  if (!t) return kod?.trim() || '—'
  return `${t.kod} (%${t.oran})`
}

/** gg.aa.yyyy veya ISO metnini gerçek takvim günü olarak doğrular. */
export function tespitOneriTarihIso(ham: string | null | undefined): string | null {
  const yazi = String(ham ?? '').trim()
  const iso = ggAayyyyToIso(yazi)
  if (!iso) return null
  const tarih = parseTarihEsnek(iso)
  if (!tarih) return null
  const [yil, ay, gun] = iso.split('-').map(Number)
  if (tarih.getFullYear() !== yil || tarih.getMonth() + 1 !== ay || tarih.getDate() !== gun) return null
  return iso
}

export function tespitOneriTarihGoster(iso: string | null | undefined): string {
  return toGgAayyyy(iso)
}
