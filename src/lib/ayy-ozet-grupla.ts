import type { AyyPersonelOzet, AyyStatuBazliPersonel } from '@/lib/ayy-hesap'

export const AYY_OZET_BOLUM = {
  calisanlar:  'Görev Türüne Göre Çalışanlar',
  zabita:      'Görev Türüne Göre Zabıta Gibi Çalışanlar',
  gecici:      'Görev Türüne Göre Geçici Görevlendirilenler',
  ayliksiz:    'Görev Türüne Göre Aylıksız İzinli Olanlar',
  yariZamanli: 'Görev Türüne Göre Yarı Zamanlı Çalışanlar',
} as const

export type AyyOzetBolumKey = keyof typeof AYY_OZET_BOLUM

export interface AyyOzetGruplar {
  calisanlar:  AyyPersonelOzet[]
  zabita:      AyyPersonelOzet[]
  gecici:      AyyPersonelOzet[]
  ayliksiz:    AyyPersonelOzet[]
  yariZamanli: AyyPersonelOzet[]
}

/** Excel / ekran özetinde bölüm sırası */
export const AYY_OZET_BOLUM_SIRASI: AyyOzetBolumKey[] = [
  'calisanlar',
  'zabita',
  'gecici',
  'ayliksiz',
  'yariZamanli',
]

function gorevMapOlustur(statuBazli: AyyStatuBazliPersonel[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const sp of statuBazli) {
    const key = sp.sicil_no.trim()
    map.set(key, sp.gorev_turu)
    const num = parseInt(key, 10)
    if (!isNaN(num)) map.set(String(num), sp.gorev_turu)
  }
  return map
}

function gorevTuruBul(map: Map<string, string>, sicil: string): string | undefined {
  const key = sicil.trim()
  if (map.has(key)) return map.get(key)
  const num = parseInt(key, 10)
  if (!isNaN(num)) return map.get(String(num))
  return undefined
}

function sicileGoreSirala(list: AyyPersonelOzet[]): AyyPersonelOzet[] {
  const kopya = [...list]
  kopya.sort((a, b) => {
    const na = parseInt(a.sicil_no, 10) || 0
    const nb = parseInt(b.sicil_no, 10) || 0
    if (na !== nb) return na - nb
    return a.sicil_no.localeCompare(b.sicil_no, 'tr-TR')
  })
  return kopya.map((p, i) => ({ ...p, sira_no_seq: i + 1 }))
}

/**
 * Genel özet personel listesini görev türüne göre gruplar.
 * Statü bazlı görev türü (geçici görev / aylıksız izin / yarı zamanlı) önceliklidir;
 * kalan zabıta personeli ayrı bölümde, diğerleri çalışanlar bölümünde listelenir.
 */
export function ayyOzetPersonelGrupla(
  personeller: AyyPersonelOzet[],
  statuBazli: AyyStatuBazliPersonel[],
): AyyOzetGruplar {
  const gorevMap = gorevMapOlustur(statuBazli)

  const calisanlar: AyyPersonelOzet[] = []
  const zabita: AyyPersonelOzet[] = []
  const gecici: AyyPersonelOzet[] = []
  const ayliksiz: AyyPersonelOzet[] = []
  const yariZamanli: AyyPersonelOzet[] = []

  for (const p of personeller) {
    const tur = gorevTuruBul(gorevMap, p.sicil_no)
    if (tur === 'Geçici Görevlendirme') {
      gecici.push(p)
    } else if (tur === 'Aylıksız İzin') {
      ayliksiz.push(p)
    } else if (tur === 'Yarı Zamanlı') {
      yariZamanli.push(p)
    } else if (p.isZabita) {
      zabita.push(p)
    } else {
      calisanlar.push(p)
    }
  }

  return {
    calisanlar:  sicileGoreSirala(calisanlar),
    zabita:      sicileGoreSirala(zabita),
    gecici:      sicileGoreSirala(gecici),
    ayliksiz:    sicileGoreSirala(ayliksiz),
    yariZamanli: sicileGoreSirala(yariZamanli),
  }
}

export function ayyOzetToplamPersonel(gruplar: AyyOzetGruplar): number {
  return AYY_OZET_BOLUM_SIRASI.reduce((n, key) => n + gruplar[key].length, 0)
}
