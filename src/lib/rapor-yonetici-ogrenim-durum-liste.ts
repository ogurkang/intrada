import { kadroBaslangic, kadroSatirAktifMi, type KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { ogrenimTuruSiraIndex } from '@/lib/ogrenim-sira'
import { trNormalize } from '@/lib/turkce-search'

export interface YoneticiOgrenimCalisanRow {
  sicil_no: string
  ad_soyad: string | null
}

export interface YoneticiOgrenimKadroRow extends KadroRaporRow {
  asil: string | null
  vekil?: string | null
  gorev_unvani?: string | null
  kadro_unvani?: string | null
}

export interface YoneticiOgrenimDetayRow {
  sicil_no: string
  ogrenim_turu: string | null
  okul_adi: string | null
  bolum: string | null
  mezuniyet_tarihi: string | null
  meslegi: string | null
  varsayilan: boolean
}

export interface YoneticiOgrenimListeSatir {
  sicil_no: string
  ad_soyad: string
  gorev_unvani: string
  ogrenim_turu: string
  okul_adi: string
  bolum: string
  mezuniyet_tarihi: string
  meslegi: string
  varsayilan: string
}

function txt(v: string | null | undefined): string {
  return String(v ?? '').trim()
}

function tarih(v: string | null | undefined): string {
  const t = txt(v)
  if (!t) return '—'
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return t
  return d.toLocaleDateString('tr-TR')
}

function gorevUnvaniMudurlukMu(unvan: string | null | undefined): boolean {
  const n = trNormalize(unvan ?? '')
  return n.includes('mudur')
}

function sicilSirala(a: string, b: string): number {
  return a.localeCompare(b, 'tr', { numeric: true })
}

const ONLISANS_SIRA = ogrenimTuruSiraIndex('Önlisans')
const DOKTORA_SIRA = ogrenimTuruSiraIndex('Doktora')

export function yoneticiOgrenimDurumListeSatirlari(input: {
  D: string
  calisanlar: YoneticiOgrenimCalisanRow[]
  kadroRows: YoneticiOgrenimKadroRow[]
  ogrenimRows: YoneticiOgrenimDetayRow[]
}): YoneticiOgrenimListeSatir[] {
  const { D, calisanlar, kadroRows, ogrenimRows } = input
  const calisanBySicil = new Map<string, YoneticiOgrenimCalisanRow>()
  for (const c of calisanlar ?? []) {
    const sicil = txt(c.sicil_no)
    if (!sicil) continue
    calisanBySicil.set(sicil, c)
  }

  const byAsil = new Map<string, YoneticiOgrenimKadroRow[]>()
  for (const k of kadroRows ?? []) {
    const asil = txt(k.asil)
    if (asil) {
      const list = byAsil.get(asil) ?? []
      list.push(k)
      byAsil.set(asil, list)
    }
    const vekil = txt(k.vekil)
    if (vekil) {
      const list = byAsil.get(vekil) ?? []
      list.push(k)
      byAsil.set(vekil, list)
    }
  }

  const secilenBySicil = new Map<string, { unvan: string; baslangic: string }>()
  for (const [sicil, rows] of byAsil) {
    for (const r of rows) {
      if (!kadroSatirAktifMi(r, D)) continue
      const unvan = txt(r.gorev_unvani) || txt(r.kadro_unvani)
      if (!gorevUnvaniMudurlukMu(unvan)) continue
      const bas = kadroBaslangic(r)
      const mevcut = secilenBySicil.get(sicil)
      if (!mevcut || bas >= mevcut.baslangic) {
        secilenBySicil.set(sicil, { unvan, baslangic: bas })
      }
    }
  }

  const yoneticiSiciller = new Set<string>()
  for (const sicil of secilenBySicil.keys()) {
    if (!calisanBySicil.has(sicil)) continue
    yoneticiSiciller.add(sicil)
  }

  const ogrenimBySicil = new Map<string, YoneticiOgrenimDetayRow[]>()
  for (const o of ogrenimRows ?? []) {
    const sicil = txt(o.sicil_no)
    if (!sicil || !yoneticiSiciller.has(sicil)) continue
    const sira = ogrenimTuruSiraIndex(o.ogrenim_turu)
    if (sira < ONLISANS_SIRA || sira > DOKTORA_SIRA) continue
    const list = ogrenimBySicil.get(sicil) ?? []
    list.push(o)
    ogrenimBySicil.set(sicil, list)
  }

  const satirlar: YoneticiOgrenimListeSatir[] = []
  const siciller = [...yoneticiSiciller].sort(sicilSirala)
  for (const sicil of siciller) {
    const c = calisanBySicil.get(sicil)
    const ad = txt(c?.ad_soyad) || sicil
    const ogrenimler = [...(ogrenimBySicil.get(sicil) ?? [])].sort((a, b) => {
      const sa = ogrenimTuruSiraIndex(a.ogrenim_turu)
      const sb = ogrenimTuruSiraIndex(b.ogrenim_turu)
      if (sa !== sb) return sa - sb
      if (a.varsayilan !== b.varsayilan) return a.varsayilan ? -1 : 1
      const ta = new Date(a.mezuniyet_tarihi ?? '').getTime()
      const tb = new Date(b.mezuniyet_tarihi ?? '').getTime()
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0)
    })

    if (!ogrenimler.length) {
      satirlar.push({
        sicil_no: sicil,
        ad_soyad: ad,
        gorev_unvani: secilenBySicil.get(sicil)?.unvan || '—',
        ogrenim_turu: '—',
        okul_adi: '—',
        bolum: '—',
        mezuniyet_tarihi: '—',
        meslegi: '—',
        varsayilan: '—',
      })
      continue
    }

    for (const o of ogrenimler) {
      satirlar.push({
        sicil_no: sicil,
        ad_soyad: ad,
        gorev_unvani: secilenBySicil.get(sicil)?.unvan || '—',
        ogrenim_turu: txt(o.ogrenim_turu) || '—',
        okul_adi: txt(o.okul_adi) || '—',
        bolum: txt(o.bolum) || '—',
        mezuniyet_tarihi: tarih(o.mezuniyet_tarihi),
        meslegi: txt(o.meslegi) || '—',
        varsayilan: o.varsayilan ? 'Evet' : 'Hayır',
      })
    }
  }

  return satirlar
}
