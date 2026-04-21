import { FIRMA_STATU_ETIKET } from '@/lib/firma-statu-etiket'
import {
  etiketAnahtari,
  kadroBaslangic,
  kadroSatirAktifMi,
  type CalisanRaporRow,
  type KadroRaporRow,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'

export interface MudurlugeGorePersonelSatir {
  sicil_no: string
  ad_soyad: string
  mudurluk: string
}

export interface MudurlugeGorePersonelSnapshotInput {
  D: string
  tanimStatuler: TanimStatuRow[]
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, CalisanRaporRow>
}

function sameText(a: string, b: string) {
  return a.toLocaleLowerCase('tr-TR') === b.toLocaleLowerCase('tr-TR')
}

export function mudurlugeGorePersonelListeSnapshot(
  input: MudurlugeGorePersonelSnapshotInput,
): MudurlugeGorePersonelSatir[] {
  const { D, tanimStatuler, kadro, calisanBySicil } = input
  const etiketler = new Set((tanimStatuler ?? []).map(t => t.statu_adi))
  const byAsil = new Map<string, KadroRaporRow[]>()

  for (const r of kadro ?? []) {
    const asil = String(r.asil ?? '').trim()
    if (!asil) continue
    const list = byAsil.get(asil) ?? []
    list.push(r)
    byAsil.set(asil, list)
  }

  const out: MudurlugeGorePersonelSatir[] = []
  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, D))
    if (aktif.length === 0) continue
    const secilen = aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))

    const rawStatu = String(secilen.statu ?? '').trim()
    const statuEtiketi = etiketAnahtari(etiketler, rawStatu) || rawStatu
    if (statuEtiketi && sameText(statuEtiketi, FIRMA_STATU_ETIKET)) continue

    const mudurluk = String(secilen.kadro_mudurlugu ?? '').trim()
    if (!mudurluk) continue

    const calisan = calisanBySicil.get(sicil)
    if (!calisan) continue
    out.push({
      sicil_no: sicil,
      ad_soyad: calisan.ad_soyad,
      mudurluk,
    })
  }

  out.sort((a, b) => {
    const mud = a.mudurluk.localeCompare(b.mudurluk, 'tr')
    if (mud !== 0) return mud
    const sicil = a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true })
    if (sicil !== 0) return sicil
    return a.ad_soyad.localeCompare(b.ad_soyad, 'tr')
  })
  return out
}
