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

export interface PersonelAdresBilgi {
  il: string
  ilce: string
  mahalle: string
  adres_detay: string
  legacy_adresi: string
}

export interface AdreseGorePersonelListeSatir {
  sicil_no: string
  ad_soyad: string
  gorev_unvani: string
  il: string
  ilce: string
  mahalle: string
  adres: string
  _statu_siralama: string
}

function gorevUnvaniGrubu(unvan: string): number {
  const u = unvan.trim().toLocaleLowerCase('tr-TR')
  if (u === 'belediye başkanı' || u === 'belediye baskani') return 0
  if (u.includes('başkan yardımcısı') || u.includes('baskan yardimcisi')) return 1
  return 2
}

/** Ekranda tek satırda: açık adres, mahalle, ilçe, il */
export function adresGosterimMetni(b: PersonelAdresBilgi): string {
  const parcalar: string[] = []
  if (b.adres_detay) parcalar.push(b.adres_detay)
  if (b.mahalle) parcalar.push(b.mahalle)
  if (b.ilce) parcalar.push(b.ilce)
  if (b.il) parcalar.push(b.il)
  if (parcalar.length) return parcalar.join(', ')
  return b.legacy_adresi || '—'
}

export function adreseGorePersonelListeSnapshot(input: {
  D: string
  tanimStatuler: TanimStatuRow[]
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, CalisanRaporRow>
  adresBySicil: Map<string, PersonelAdresBilgi>
}): AdreseGorePersonelListeSatir[] {
  const { D, tanimStatuler, kadro, calisanBySicil, adresBySicil } = input
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

    const adresBilgi: PersonelAdresBilgi =
      adresBySicil.get(sicil) ?? { il: '', ilce: '', mahalle: '', adres_detay: '', legacy_adresi: '' }

    out.push({
      sicil_no: sicil,
      ad_soyad: adSoyad,
      gorev_unvani: gorevUnvani,
      il: adresBilgi.il || '—',
      ilce: adresBilgi.ilce || '—',
      mahalle: adresBilgi.mahalle || '—',
      adres: adresGosterimMetni(adresBilgi),
      _statu_siralama: statu,
    })
  }

  out.sort((a, b) => {
    const ilBosA = a.il === '—'
    const ilBosB = b.il === '—'
    if (ilBosA !== ilBosB) return ilBosA ? 1 : -1
    const il = a.il.localeCompare(b.il, 'tr')
    if (il !== 0) return il
    const ilce = a.ilce.localeCompare(b.ilce, 'tr')
    if (ilce !== 0) return ilce
    const mahalle = a.mahalle.localeCompare(b.mahalle, 'tr')
    if (mahalle !== 0) return mahalle
    const sic = sicilKarsilastir(a.sicil_no, b.sicil_no)
    if (sic !== 0) return sic
    return a.ad_soyad.localeCompare(b.ad_soyad, 'tr')
  })

  return out
}

export function adreseGorePersonelListeFiltrele(
  satirlar: AdreseGorePersonelListeSatir[],
  filtre: { il?: string; ilce?: string; mahalle?: string },
): AdreseGorePersonelListeSatir[] {
  const il = txt(filtre.il)
  const ilce = txt(filtre.ilce)
  const mahalle = txt(filtre.mahalle)
  return satirlar.filter(s => {
    if (il && !sameText(s.il, il)) return false
    if (ilce && !sameText(s.ilce, ilce)) return false
    if (mahalle && !sameText(s.mahalle, mahalle)) return false
    return true
  })
}
