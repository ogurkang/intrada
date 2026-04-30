import {
  etiketAnahtari,
  kadroBaslangic,
  kadroSatirAktifMi,
  type CalisanRaporRow,
  type KadroRaporRow,
  type TanimStatuRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'

function txt(v: string | null | undefined): string {
  return String(v ?? '').trim()
}

function sameText(a: string, b: string): boolean {
  return a.toLocaleLowerCase('tr-TR') === b.toLocaleLowerCase('tr-TR')
}

function sicilKarsilastir(a: string, b: string): number {
  return a.localeCompare(b, 'tr', { numeric: true })
}

function statuOncelik(statu: string): number {
  const s = statu.trim().toLocaleLowerCase('tr-TR')
  if (s === 'memur') return 0
  if (s === 'sözleşmeli' || s === 'sozlesmeli') return 1
  if (s === 'işçi' || s === 'isci') return 2
  return 999
}

export interface AdreseGorePersonelListeSatir {
  sicil_no: string
  ad_soyad: string
  gorev_unvani: string
  adres: string
  _statu_siralama: string
}

function gorevUnvaniGrubu(unvan: string): number {
  const u = unvan.trim().toLocaleLowerCase('tr-TR')
  if (u === 'belediye başkanı' || u === 'belediye baskani') return 0
  if (u.includes('başkan yardımcısı') || u.includes('baskan yardimcisi')) return 1
  return 2
}

export function adreseGorePersonelListeSnapshot(input: {
  D: string
  tanimStatuler: TanimStatuRow[]
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, CalisanRaporRow & { adresi?: string | null }>
}): AdreseGorePersonelListeSatir[] {
  const { D, tanimStatuler, kadro, calisanBySicil } = input
  const etiketler = new Set((tanimStatuler ?? []).map(t => txt(t.statu_adi)).filter(Boolean))
  const byAsil = new Map<string, KadroRaporRow[]>()

  for (const r of kadro ?? []) {
    const asil = txt(r.asil)
    if (!asil) continue
    const list = byAsil.get(asil) ?? []
    list.push(r)
    byAsil.set(asil, list)
  }

  const out: AdreseGorePersonelListeSatir[] = []
  for (const [sicil, rows] of byAsil) {
    const aktifRows = rows.filter(r => kadroSatirAktifMi(r, D))
    if (aktifRows.length === 0) continue
    const secilen = aktifRows.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    const calisan = calisanBySicil.get(sicil)
    if (!calisan) continue

    const rawStatu = txt(secilen.statu)
    const mapped = etiketAnahtari(etiketler, rawStatu)
    const statu = mapped || rawStatu || '—'
    const gorevUnvani = txt(secilen.gorev_unvani) || txt(secilen.kadro_unvani) || '—'
    const adSoyad = txt(calisan.ad_soyad) || sicil
    const adres = txt(calisan.adresi) || '—'
    out.push({
      sicil_no: sicil,
      ad_soyad: adSoyad,
      gorev_unvani: gorevUnvani,
      adres,
      _statu_siralama: statu,
    })
  }

  out.sort((a, b) => {
    const ga = gorevUnvaniGrubu(a.gorev_unvani)
    const gb = gorevUnvaniGrubu(b.gorev_unvani)
    if (ga !== gb) return ga - gb
    if (ga < 2 && !sameText(a.gorev_unvani, b.gorev_unvani)) {
      return a.gorev_unvani.localeCompare(b.gorev_unvani, 'tr')
    }
    if (ga === 2) {
      const oa = statuOncelik(a._statu_siralama)
      const ob = statuOncelik(b._statu_siralama)
      if (oa !== ob) return oa - ob
    }
    const sic = sicilKarsilastir(a.sicil_no, b.sicil_no)
    if (sic !== 0) return sic
    return a.ad_soyad.localeCompare(b.ad_soyad, 'tr')
  })

  return out
}
