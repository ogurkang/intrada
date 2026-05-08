import { FIRMA_STATU_ETIKET } from '@/lib/firma-statu-etiket'
import {
  etiketAnahtari,
  kadroBaslangic,
  kadroSatirAktifMi,
  type CalisanRaporRow,
  type KadroRaporRow,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'

export interface IzinLimitineTakilanPersonelSatir {
  sicil_no: string
  ad_soyad: string
  mudurluk: string
  kullanilan_izin: number
}

export interface IzinLimitineTakilanSnapshotInput {
  D: string
  bas: string
  bit: string
  tanimStatuler: TanimStatuRow[]
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, CalisanRaporRow>
  izinRows: Array<{
    sicil_no: string | null
    ayrilis: string | null
    gun: number | null
    tur: string | null
  }>
}

function sameText(a: string, b: string) {
  return a.toLocaleLowerCase('tr-TR') === b.toLocaleLowerCase('tr-TR')
}

function memurStatuMu(statu: string) {
  return sameText(statu, 'Memur')
}

function yillikIzinMi(tur: string | null | undefined) {
  return String(tur ?? '')
    .trim()
    .toLocaleLowerCase('tr-TR') === 'yıllık izin'
}

function sliceD(s: string | null | undefined): string | null {
  if (!s) return null
  return String(s).slice(0, 10)
}

export function izinLimitineTakilanPersonelListeSnapshot(
  input: IzinLimitineTakilanSnapshotInput,
): IzinLimitineTakilanPersonelSatir[] {
  const { D, bas, bit, tanimStatuler, kadro, calisanBySicil, izinRows } = input
  const etiketler = new Set((tanimStatuler ?? []).map(t => t.statu_adi))
  const byAsil = new Map<string, KadroRaporRow[]>()

  for (const r of kadro ?? []) {
    const asil = String(r.asil ?? '').trim()
    if (!asil) continue
    const list = byAsil.get(asil) ?? []
    list.push(r)
    byAsil.set(asil, list)
  }

  const kullanilanBySicil = new Map<string, number>()
  for (const iz of izinRows ?? []) {
    const sicil = String(iz.sicil_no ?? '').trim()
    if (!sicil) continue
    if (!yillikIzinMi(iz.tur)) continue
    const ayrilis = sliceD(iz.ayrilis)
    if (!ayrilis || ayrilis < bas || ayrilis > bit) continue
    const gun = Number(iz.gun ?? 0)
    if (!Number.isFinite(gun) || gun <= 0) continue
    kullanilanBySicil.set(sicil, (kullanilanBySicil.get(sicil) ?? 0) + gun)
  }

  const out: IzinLimitineTakilanPersonelSatir[] = []
  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, D))
    if (aktif.length === 0) continue
    const secilen = aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    const rawStatu = String(secilen.statu ?? '').trim()
    const statuEtiketi = etiketAnahtari(etiketler, rawStatu) || rawStatu
    if (statuEtiketi && sameText(statuEtiketi, FIRMA_STATU_ETIKET)) continue
    if (!memurStatuMu(statuEtiketi)) continue
    const mudurluk = String(secilen.kadro_mudurlugu ?? secilen.gorev_mudurlugu ?? '').trim()
    if (!mudurluk) continue
    const calisan = calisanBySicil.get(sicil)
    if (!calisan) continue
    const kullanilan = Number((kullanilanBySicil.get(sicil) ?? 0).toFixed(2))
    if (kullanilan <= 0) continue
    out.push({
      sicil_no: sicil,
      ad_soyad: calisan.ad_soyad,
      mudurluk,
      kullanilan_izin: kullanilan,
    })
  }

  out.sort((a, b) => {
    if (b.kullanilan_izin !== a.kullanilan_izin) return b.kullanilan_izin - a.kullanilan_izin
    const sicil = a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true })
    if (sicil !== 0) return sicil
    return a.ad_soyad.localeCompare(b.ad_soyad, 'tr')
  })

  return out
}
