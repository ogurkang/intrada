import { periyotSonGunu, type KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import type { PersonelKonumCtx } from '@/lib/personel-gorev-konum'
import { personelKonumRaporMetni } from '@/lib/personel-gorev-konum'

export type TehlikeSinifi = 'Az Tehlikeli' | 'Tehlikeli' | 'Çok Tehlikeli'

export interface TehlikeCalisanInfo {
  ad_soyad: string
  yerleske_adresi_id?: number | null
  gorev_yeri?: string | null
  gorev_turu?: string | null
}

export interface TehlikePersonelSatir {
  sicil_no: string
  ad_soyad: string
  mudurluk: string
  tehlike_sinifi: TehlikeSinifi
  konum?: string
}

function personelGorevMudurlugu(k: KadroRaporRow): string {
  return String(k.gorev_mudurlugu ?? '').trim() || String(k.kadro_mudurlugu ?? '').trim()
}

export interface TehlikeMudurlukSatir {
  mudurluk: string
  tehlike_sinifi: TehlikeSinifi
  personel_sayisi: number
}

const TEHLIKE_DEFAULT: TehlikeSinifi = 'Az Tehlikeli'

function asTehlike(v: string | null | undefined): TehlikeSinifi {
  if (v === 'Tehlikeli' || v === 'Çok Tehlikeli') return v
  return TEHLIKE_DEFAULT
}

export function aktifPersonelTehlikeSatirlari(input: {
  D: string
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, TehlikeCalisanInfo>
  tehlikeByMudurluk: Map<string, TehlikeSinifi>
  konumCtx?: PersonelKonumCtx
}): TehlikePersonelSatir[] {
  const { D, kadro, calisanBySicil, tehlikeByMudurluk, konumCtx } = input
  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadro) {
    if (!r.asil) continue
    const list = byAsil.get(r.asil) ?? []
    list.push(r)
    byAsil.set(r.asil, list)
  }

  const out: TehlikePersonelSatir[] = []
  for (const [sicil, rows] of byAsil) {
    const sec = secilenKadroSatirAsil(rows, D)
    if (!sec) continue
    const mudurluk = String(sec.kadro_mudurlugu ?? '').trim()
    if (!mudurluk) continue
    const cal = calisanBySicil.get(sicil)
    if (!cal) continue
    const tehlike = tehlikeByMudurluk.get(mudurluk) ?? TEHLIKE_DEFAULT
    const gorevMud = personelGorevMudurlugu(sec)
    const konum = konumCtx
      ? personelKonumRaporMetni(konumCtx, {
          gorevMudurlugu: gorevMud,
          gorevYeri: cal.gorev_yeri,
          yerleskeAdresiId: cal.yerleske_adresi_id,
          gorevTuru: cal.gorev_turu,
        })
      : undefined
    out.push({
      sicil_no: sicil,
      ad_soyad: cal.ad_soyad,
      mudurluk,
      tehlike_sinifi: tehlike,
      konum,
    })
  }
  out.sort((a, b) => a.mudurluk.localeCompare(b.mudurluk, 'tr') || a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }))
  return out
}

export function tehlikeMudurlukOzet(satirlar: TehlikePersonelSatir[]): TehlikeMudurlukSatir[] {
  const map = new Map<string, TehlikeMudurlukSatir>()
  for (const s of satirlar) {
    const k = `${s.mudurluk}|${s.tehlike_sinifi}`
    const prev = map.get(k) ?? { mudurluk: s.mudurluk, tehlike_sinifi: s.tehlike_sinifi, personel_sayisi: 0 }
    prev.personel_sayisi += 1
    map.set(k, prev)
  }
  return [...map.values()].sort((a, b) => a.mudurluk.localeCompare(b.mudurluk, 'tr'))
}

export function parseRaporPeriyot(yil: number, p?: string): { periyot: 'yillik' | number; D: string; label: string } {
  const aylar = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
  if (p === 'yillik' || !p) return { periyot: 'yillik', D: periyotSonGunu(yil, 'yillik'), label: 'YILLIK' }
  const n = Number.parseInt(p, 10)
  if (!Number.isFinite(n) || n < 1 || n > 12) return { periyot: 'yillik', D: periyotSonGunu(yil, 'yillik'), label: 'YILLIK' }
  return { periyot: n, D: periyotSonGunu(yil, n as 1), label: aylar[n - 1]! }
}
