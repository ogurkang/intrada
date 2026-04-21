import {
  etiketAnahtari,
  kadroBaslangic,
  kadroSatirAktifMi,
  type CalisanRaporRow,
  type KadroRaporRow,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { statuEtiketSirasi, type StatuMatrisSatir } from '@/lib/rapor-statuye-gore-ogrenim-meslek'

export const HIZMET_DAGILIM_KOLONLARI = ['0', '1-10', '11-20', '21-30', '31-40', '41 ve Üzeri'] as const

type HizmetDagilimEtiket = (typeof HIZMET_DAGILIM_KOLONLARI)[number]

function hizmetToplamGun360(c: CalisanRaporRow): number {
  const yil = Math.max(0, Math.floor(Number(c.hizmet_suresi_yil ?? 0)))
  const ay = Math.max(0, Math.floor(Number(c.hizmet_suresi_ay ?? 0)))
  const gun = Math.max(0, Math.floor(Number(c.hizmet_suresi_gun ?? 0)))
  return yil * 360 + ay * 30 + gun
}

function hizmetYilBandi(toplamGun: number): HizmetDagilimEtiket {
  const tamYil = Math.floor(Math.max(0, toplamGun) / 360)
  if (tamYil === 0) return '0'
  if (tamYil <= 10) return '1-10'
  if (tamYil <= 20) return '11-20'
  if (tamYil <= 30) return '21-30'
  if (tamYil <= 40) return '31-40'
  return '41 ve Üzeri'
}

export interface HizmetSnapshotResult {
  kolonlar: string[]
  satirlar: StatuMatrisSatir[]
}

export function statuHizmetSnapshot(input: {
  D: string
  tanimStatuler: TanimStatuRow[]
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, CalisanRaporRow>
}): HizmetSnapshotResult {
  const { D, tanimStatuler, kadro, calisanBySicil } = input
  const statuSirali = statuEtiketSirasi(tanimStatuler)
  const etiketler = new Set(statuSirali)
  const kolonlar: string[] = [...HIZMET_DAGILIM_KOLONLARI]
  const colIx = (label: string) => kolonlar.indexOf(label)

  const bosSatir = (): number[] => new Array(kolonlar.length).fill(0)
  const say: Record<string, number[]> = {}
  for (const e of etiketler) say[e] = bosSatir()
  let diger = bosSatir()

  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadro) {
    if (!r.asil) continue
    const list = byAsil.get(r.asil) ?? []
    list.push(r)
    byAsil.set(r.asil, list)
  }

  for (const [sicil, rows] of byAsil) {
    const aktifRows = rows.filter(r => kadroSatirAktifMi(r, D))
    if (aktifRows.length === 0) continue
    const secilen = aktifRows.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    const stKey = etiketAnahtari(etiketler, secilen.statu)
    const c = calisanBySicil.get(sicil)
    if (!c) continue
    const band = hizmetYilBandi(hizmetToplamGun360(c))
    const ci = colIx(band)
    if (ci < 0) continue
    const hedef = stKey ? say[stKey] : diger
    hedef[ci] += 1
  }

  const satirlar: StatuMatrisSatir[] = statuSirali.map(et => ({
    statuEtiket: et,
    sayilar: [...say[et]],
  }))
  if (diger.some(n => n > 0)) satirlar.push({ statuEtiket: 'Tanımda olmayan statü', sayilar: diger })
  return { kolonlar, satirlar }
}
