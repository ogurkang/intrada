import {
  ogrenimDurumunaGorePersonelListeSnapshot,
  type OgrenimDurumunaGorePersonelDetaySatir,
  type OgrenimDurumunaGorePersonelSnapshotInput,
} from '@/lib/rapor-ogrenim-durumuna-gore-personel-liste'

export interface OgrenimIletisimBilgileriSatir {
  sicil_no: string
  ad_soyad: string
  mudurluk: string
  telefon: string
  e_posta: string
  detaylar: OgrenimDurumunaGorePersonelDetaySatir[]
}

export interface OgrenimIletisimBilgileriFlatSatir {
  sira_no: number
  sicil_no: string
  ad_soyad: string
  mudurluk: string
  telefon: string
  e_posta: string
  ogrenim_durumu: string
  okul_bolum: string
  grup_ilk_satir: boolean
  grup_satir_sayisi: number
}

function txt(v: string | null | undefined): string {
  const s = String(v ?? '').trim()
  return s || '—'
}

export function ogrenimDurumunaGoreIletisimBilgileriListeSnapshot(
  input: OgrenimDurumunaGorePersonelSnapshotInput & {
    iletisimBySicil: Map<string, { telefon?: string | null; e_posta?: string | null }>
  },
): OgrenimIletisimBilgileriSatir[] {
  const { iletisimBySicil, ...snapshotInput } = input
  const base = ogrenimDurumunaGorePersonelListeSnapshot(snapshotInput)
  return base.map(g => {
    const iletisim = iletisimBySicil.get(g.sicil_no)
    return {
      sicil_no: g.sicil_no,
      ad_soyad: g.ad_soyad,
      mudurluk: g.mudurluk,
      telefon: txt(iletisim?.telefon),
      e_posta: txt(iletisim?.e_posta),
      detaylar: g.detaylar,
    }
  })
}

export function ogrenimDurumunaGoreIletisimBilgileriFlatten(
  groups: OgrenimIletisimBilgileriSatir[],
): OgrenimIletisimBilgileriFlatSatir[] {
  const rows: OgrenimIletisimBilgileriFlatSatir[] = []
  let sira = 1
  for (const g of groups) {
    const span = Math.max(1, g.detaylar.length)
    g.detaylar.forEach((d, idx) => {
      rows.push({
        sira_no: sira,
        sicil_no: g.sicil_no,
        ad_soyad: g.ad_soyad,
        mudurluk: g.mudurluk,
        telefon: g.telefon,
        e_posta: g.e_posta,
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
