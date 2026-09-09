import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import { tasinirGoreviNormalize } from '@/lib/tasinir-gorevi'
import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'

export type TasinirGoreviListeSatir = {
  sicil_no: string
  ad_soyad: string
  tasinir_gorevi: string
  gorev_unvani: string
  gorev_mudurlugu: string
}

export type TasinirGoreviCalisanRow = {
  sicil_no: string
  ad_soyad: string | null
  tasinir_gorevi: string | null
}

export function tasinirGoreviListeSnapshot(input: {
  D: string
  kadro: KadroRaporRow[]
  calisanlar: TasinirGoreviCalisanRow[]
}): TasinirGoreviListeSatir[] {
  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const k of input.kadro) {
    if (!k.asil) continue
    const list = byAsil.get(k.asil) ?? []
    list.push(k)
    byAsil.set(k.asil, list)
  }

  const out: TasinirGoreviListeSatir[] = []
  for (const c of input.calisanlar) {
    const gorev = tasinirGoreviNormalize(c.tasinir_gorevi)
    if (!gorev) continue
    const sec = secilenKadroSatirAsil(byAsil.get(c.sicil_no) ?? [], input.D)
    if (!sec) continue
    out.push({
      sicil_no: c.sicil_no,
      ad_soyad: (c.ad_soyad ?? '').trim() || c.sicil_no,
      tasinir_gorevi: gorev,
      gorev_unvani: (sec.gorev_unvani ?? sec.kadro_unvani ?? '').trim() || '—',
      gorev_mudurlugu: (sec.gorev_mudurlugu ?? sec.kadro_mudurlugu ?? '').trim() || '—',
    })
  }

  return out.sort(
    (a, b) =>
      a.tasinir_gorevi.localeCompare(b.tasinir_gorevi, 'tr') ||
      a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }),
  )
}

/** Boş / Seçiniz → tüm görevler; aksi halde tek görev. */
export function tasinirGoreviListeFiltrele(
  satirlar: TasinirGoreviListeSatir[],
  gorevHam: string | null | undefined,
): TasinirGoreviListeSatir[] {
  const gorev = tasinirGoreviNormalize(gorevHam)
  if (!gorev) return satirlar
  return satirlar.filter(s => s.tasinir_gorevi === gorev)
}
