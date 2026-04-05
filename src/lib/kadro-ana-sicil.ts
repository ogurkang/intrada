import type { Tables } from '@/types/database'

type KH = Tables<'kadro_hareketleri'>

/** Personel detayı / Kadro sekmesi ile aynı: önce Dolu asil, yoksa vekillikte en düşük derece. */
export function anaKadroSec(kadrolar: KH[], sicilNo: string): KH | null {
  const sicil = sicilNo.trim()
  const asilKadro = kadrolar.find(
    k => (k.asil ?? '').trim() === sicil && (k.durumu ?? '') === 'Dolu',
  )
  const vekilKadrolar = kadrolar
    .filter(k => (k.vekil ?? '').trim() === sicil)
    .sort(
      (a, b) =>
        parseInt(a.kadro_derecesi ?? '999999', 10) - parseInt(b.kadro_derecesi ?? '999999', 10),
    )
  return asilKadro ?? (vekilKadrolar.length > 0 ? vekilKadrolar[0] : null)
}
