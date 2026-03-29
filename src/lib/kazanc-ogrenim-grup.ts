/** Kazanç ekranı sekmeleri: Lisans/Önlisans vs Lise/Meslek Lisesi */
export type KazancOgrenimSekmesi = 'lisans_onlisans' | 'lise_meslek'

/**
 * `tanim_ogrenim.isim` metnine göre sekme; eşleşmeyenler Lisans/Önlisans altında.
 */
export function kazancOgrenimSekmesi(isim: string): KazancOgrenimSekmesi {
  const t = isim.trim().toLowerCase()
  if (t.includes('önlisans') || t.includes('onlisans')) return 'lisans_onlisans'
  if (t.includes('lisans')) return 'lisans_onlisans'
  if (t.includes('meslek') && t.includes('lise')) return 'lise_meslek'
  if (t === 'lise' || /\blise\b/i.test(isim.trim())) return 'lise_meslek'
  return 'lisans_onlisans'
}

/** Lisans/Önlisans sekmesinde yalnızca tam adı «Lisans» veya «Önlisans» olan türler (Yüksek Lisans, Doktora vb. hariç). */
export function kazancOgrenimLisansSekmesiSecilebilir(isim: string): boolean {
  const t = isim.trim()
  if (!t) return false
  const lower = t.toLowerCase()
  if (lower.includes('yüksek') || lower.includes('doktora')) return false
  if (/^önlisans$/i.test(t) || /^onlisans$/i.test(t)) return true
  if (/^lisans$/i.test(t)) return true
  return false
}

/** Sekmeye göre çoklu seçim listesi: Lisans sekmesinde yalnız Lisans/Önlisans; diğer sekmede mecut lise/meslek kuralı. */
export function kazancOgrenimlerSekmeListesi<T extends { isim: string }>(
  ogrenimler: T[],
  sekme: KazancOgrenimSekmesi,
): T[] {
  if (sekme === 'lise_meslek') {
    return ogrenimler.filter((o) => kazancOgrenimSekmesi(o.isim) === 'lise_meslek')
  }
  return ogrenimler.filter((o) => kazancOgrenimLisansSekmesiSecilebilir(o.isim))
}
