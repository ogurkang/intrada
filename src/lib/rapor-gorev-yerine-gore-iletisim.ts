import type { GorevYerineGoreListeSatir } from '@/lib/rapor-gorev-yerine-gore-liste'

export type GorevYerineGoreIletisimSatir = GorevYerineGoreListeSatir & {
  telefon: string
}

export function telefonGoster(v: string | null | undefined): string {
  const t = String(v ?? '').trim()
  return t || '—'
}

/** kayit_key → telefon eşlemesi (kadro:sicil / firma:id). */
export function gorevYeriIletisimSatirlariOlustur(
  satirlar: GorevYerineGoreListeSatir[],
  telefonByKayitKey: Map<string, string | null | undefined>,
): GorevYerineGoreIletisimSatir[] {
  return satirlar.map(s => ({
    ...s,
    telefon: telefonGoster(telefonByKayitKey.get(s.kayit_key)),
  }))
}
