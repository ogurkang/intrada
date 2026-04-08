import {
  kadroBaslangic,
  kadroSatirAktifMi,
  type KadroRaporRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'

/** Anlık görüntü tarihinde (D) asıl için seçilen kadro satırı — raporlarla aynı kural. */
export function secilenKadroSatirAsil(rows: KadroRaporRow[], D: string): KadroRaporRow | null {
  const aktif = rows.filter(r => kadroSatirAktifMi(r, D))
  if (aktif.length === 0) return null
  return aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
}
