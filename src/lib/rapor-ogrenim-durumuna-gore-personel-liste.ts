import { FIRMA_STATU_ETIKET } from '@/lib/firma-statu-etiket'
import {
  etiketAnahtari,
  kadroBaslangic,
  kadroSatirAktifMi,
  type CalisanRaporRow,
  type KadroRaporRow,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'

export interface OgrenimDurumunaGorePersonelDetaySatir {
  ogrenim_durumu: string
  okul_bolum: string
}

export interface OgrenimDurumunaGorePersonelSatir {
  sicil_no: string
  ad_soyad: string
  mudurluk: string
  detaylar: OgrenimDurumunaGorePersonelDetaySatir[]
}

export interface OgrenimDurumunaGorePersonelFlatSatir {
  sira_no: number
  sicil_no: string
  ad_soyad: string
  mudurluk: string
  ogrenim_durumu: string
  okul_bolum: string
  grup_ilk_satir: boolean
  grup_satir_sayisi: number
}

interface CalisanOgrenimSatir {
  sicil_no: string
  ogrenim_turu: string | null
  okul_adi: string | null
  bolum: string | null
  varsayilan: boolean | null
  aktif: boolean | null
}

export interface OgrenimDurumunaGorePersonelSnapshotInput {
  D: string
  tanimStatuler: TanimStatuRow[]
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, CalisanRaporRow>
  ogrenimRows: CalisanOgrenimSatir[]
}

function sameText(a: string, b: string): boolean {
  return a.toLocaleLowerCase('tr-TR') === b.toLocaleLowerCase('tr-TR')
}

function txt(v: string | null | undefined): string {
  return String(v ?? '').trim()
}

function normalizeOgrenim(v: string | null | undefined): string {
  return txt(v).toLocaleLowerCase('tr-TR')
}

function isLisans(v: string | null | undefined): boolean {
  return normalizeOgrenim(v) === 'lisans'
}

function isLisansUstu(v: string | null | undefined): boolean {
  const n = normalizeOgrenim(v)
  return n === 'lisansüstü' || n === 'lisansustu' || n === 'yüksek lisans' || n === 'yuksek lisans'
}

function isDoktora(v: string | null | undefined): boolean {
  return normalizeOgrenim(v) === 'doktora'
}

function okulBolum(o: CalisanOgrenimSatir): string {
  const okul = txt(o.okul_adi)
  const bolum = txt(o.bolum)
  if (okul && bolum) return `${okul} / ${bolum}`
  if (okul) return okul
  if (bolum) return bolum
  return '—'
}

function sortOgrenimRows(rows: CalisanOgrenimSatir[]): CalisanOgrenimSatir[] {
  const rank = (v: string | null | undefined): number => {
    if (isLisans(v)) return 1
    if (isLisansUstu(v)) return 2
    if (isDoktora(v)) return 3
    return 9
  }
  return [...rows].sort((a, b) => {
    const ra = rank(a.ogrenim_turu)
    const rb = rank(b.ogrenim_turu)
    if (ra !== rb) return ra - rb
    if ((a.varsayilan ?? false) !== (b.varsayilan ?? false)) return (a.varsayilan ? -1 : 1)
    if ((a.aktif ?? false) !== (b.aktif ?? false)) return (a.aktif ? -1 : 1)
    return txt(a.ogrenim_turu).localeCompare(txt(b.ogrenim_turu), 'tr')
  })
}

export function ogrenimDurumunaGorePersonelListeSnapshot(
  input: OgrenimDurumunaGorePersonelSnapshotInput,
): OgrenimDurumunaGorePersonelSatir[] {
  const { D, tanimStatuler, kadro, calisanBySicil, ogrenimRows } = input
  const etiketler = new Set((tanimStatuler ?? []).map(t => t.statu_adi))

  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadro ?? []) {
    const asil = txt(r.asil)
    if (!asil) continue
    const list = byAsil.get(asil) ?? []
    list.push(r)
    byAsil.set(asil, list)
  }

  const ogrenimBySicil = new Map<string, CalisanOgrenimSatir[]>()
  for (const o of ogrenimRows ?? []) {
    const sicil = txt(o.sicil_no)
    if (!sicil) continue
    const list = ogrenimBySicil.get(sicil) ?? []
    list.push(o)
    ogrenimBySicil.set(sicil, list)
  }

  const out: OgrenimDurumunaGorePersonelSatir[] = []
  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, D))
    if (!aktif.length) continue
    const secilen = aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))

    const rawStatu = txt(secilen.statu)
    const statuEtiketi = etiketAnahtari(etiketler, rawStatu) || rawStatu
    if (statuEtiketi && sameText(statuEtiketi, FIRMA_STATU_ETIKET)) continue

    const mudurluk = txt(secilen.kadro_mudurlugu) || txt(secilen.gorev_mudurlugu)
    if (!mudurluk) continue

    const calisan = calisanBySicil.get(sicil)
    if (!calisan) continue

    const personelOgrenim = sortOgrenimRows(ogrenimBySicil.get(sicil) ?? [])
    const lisans = personelOgrenim.find(o => isLisans(o.ogrenim_turu))
    const lisansUstu = personelOgrenim.find(o => isLisansUstu(o.ogrenim_turu))
    const doktora = personelOgrenim.find(o => isDoktora(o.ogrenim_turu))

    const detaylar: OgrenimDurumunaGorePersonelDetaySatir[] = []
    if (lisans && (lisansUstu || doktora)) {
      detaylar.push({ ogrenim_durumu: txt(lisans.ogrenim_turu) || 'Lisans', okul_bolum: okulBolum(lisans) })
      if (lisansUstu) {
        detaylar.push({
          ogrenim_durumu: txt(lisansUstu.ogrenim_turu) || 'Lisansüstü',
          okul_bolum: okulBolum(lisansUstu),
        })
      }
      if (doktora) {
        detaylar.push({ ogrenim_durumu: txt(doktora.ogrenim_turu) || 'Doktora', okul_bolum: okulBolum(doktora) })
      }
    } else {
      const varsayilan = personelOgrenim.find(o => o.varsayilan) ?? personelOgrenim.find(o => o.aktif) ?? personelOgrenim[0]
      if (varsayilan) {
        detaylar.push({
          ogrenim_durumu: txt(varsayilan.ogrenim_turu) || '—',
          okul_bolum: okulBolum(varsayilan),
        })
      } else {
        detaylar.push({ ogrenim_durumu: '—', okul_bolum: '—' })
      }
    }

    out.push({
      sicil_no: sicil,
      ad_soyad: calisan.ad_soyad,
      mudurluk,
      detaylar,
    })
  }

  out.sort((a, b) => {
    const mud = a.mudurluk.localeCompare(b.mudurluk, 'tr')
    if (mud !== 0) return mud
    return a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true })
  })
  return out
}

export function ogrenimDurumunaGorePersonelFlatten(
  groups: OgrenimDurumunaGorePersonelSatir[],
): OgrenimDurumunaGorePersonelFlatSatir[] {
  const rows: OgrenimDurumunaGorePersonelFlatSatir[] = []
  let sira = 1
  for (const g of groups) {
    const span = Math.max(1, g.detaylar.length)
    g.detaylar.forEach((d, idx) => {
      rows.push({
        sira_no: sira,
        sicil_no: g.sicil_no,
        ad_soyad: g.ad_soyad,
        mudurluk: g.mudurluk,
        ogrenim_durumu: d.ogrenim_durumu,
        okul_bolum: d.okul_bolum,
        grup_ilk_satir: idx === 0,
        grup_satir_sayisi: span,
      })
    })
    sira += 1
  }
  return rows
}
