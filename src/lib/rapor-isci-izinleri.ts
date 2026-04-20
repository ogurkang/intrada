import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import type { KadroRaporRow, RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import { ayAraligi, periyotSonGunu, yilAraligi } from '@/lib/rapor-statuye-gore-cinsiyet'

const HAKTAN_DUSEN_DURUMLAR = new Set(['Onaylandı', 'Değiştirildi'])

export interface IsciIzinRaporSatir {
  sicil_no: string
  ad_soyad: string
  devreden_izin: number
  hak_edilen_izin: number
  kullanilan_izin: number
  kalan_izin: number
}

export interface IsciIzinRaporTabVerisi {
  periyot: RaporPeriyot
  label: string
  sonGunuEtiket: string
  satirlar: IsciIzinRaporSatir[]
}

export interface IsciIzinHareketRow {
  sicil_no: string
  tur: string
  ayrilis: string | null
  baslama: string | null
  kayit_tarihi: string | null
  gun: number
  durum: string | null
}

export interface IsciIzinHakRow {
  sicil_no: string
  devreden_gun: number
  hak_edilen_gun: number
}

function date10(v: string | null | undefined): string | null {
  if (!v) return null
  return String(v).slice(0, 10)
}

function normTr(v: string | null | undefined): string {
  return String(v ?? '').trim().toLocaleLowerCase('tr-TR')
}

function isciStatuMu(rawStatu: string | null | undefined): boolean {
  return normTr(rawStatu) === 'işçi'
}

function hareketTarih(h: IsciIzinHareketRow): string | null {
  return date10(h.ayrilis) ?? date10(h.baslama) ?? date10(h.kayit_tarihi)
}

function sicilSayisal(s: string): number {
  const n = parseInt(s.replace(/\D/g, '') || '0', 10)
  return Number.isFinite(n) ? n : 0
}

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function isciIzinRaporSnapshot(input: {
  yil: number
  periyot: RaporPeriyot
  D: string
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, { ad_soyad: string }>
  hakBySicil: Map<string, IsciIzinHakRow>
  hareketler: IsciIzinHareketRow[]
  hakKullananTurler: Set<string>
}): IsciIzinRaporSatir[] {
  const { yil, periyot, D, kadro, calisanBySicil, hakBySicil, hareketler, hakKullananTurler } = input

  const kadroByAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadro) {
    if (!r.asil) continue
    const list = kadroByAsil.get(r.asil) ?? []
    list.push(r)
    kadroByAsil.set(r.asil, list)
  }

  const isciSiciller = new Set<string>()
  for (const [sicil, rows] of kadroByAsil) {
    const sec = secilenKadroSatirAsil(rows, D)
    if (!sec) continue
    if (isciStatuMu(sec.statu)) isciSiciller.add(sicil)
  }

  const aralik = periyot === 'yillik' ? yilAraligi(yil) : ayAraligi(yil, periyot as number)

  const kullanilanBySicil = new Map<string, number>()
  for (const h of hareketler) {
    if (!isciSiciller.has(h.sicil_no)) continue
    if (!HAKTAN_DUSEN_DURUMLAR.has(String(h.durum ?? '').trim())) continue
    if (!hakKullananTurler.has(String(h.tur ?? '').trim())) continue
    const ht = hareketTarih(h)
    if (!ht || ht > D) continue
    if (ht < aralik.bas || ht > aralik.bit) continue
    const onceki = kullanilanBySicil.get(h.sicil_no) ?? 0
    kullanilanBySicil.set(h.sicil_no, onceki + (h.gun ?? 0))
  }

  return [...isciSiciller]
    .map(sicil => {
      const ad = calisanBySicil.get(sicil)?.ad_soyad?.trim() || sicil
      const hak = hakBySicil.get(sicil)
      const devreden = hak?.devreden_gun ?? 0
      const hakEdilen = hak?.hak_edilen_gun ?? 0
      const toplamHak = devreden + hakEdilen
      const kullanilan = kullanilanBySicil.get(sicil) ?? 0
      const kalan = toplamHak - kullanilan
      return {
        sicil_no: sicil,
        ad_soyad: ad,
        devreden_izin: devreden,
        hak_edilen_izin: hakEdilen,
        kullanilan_izin: kullanilan,
        kalan_izin: kalan,
      }
    })
    .sort((a, b) => {
      const sa = sicilSayisal(a.sicil_no)
      const sb = sicilSayisal(b.sicil_no)
      if (sa !== sb) return sa - sb
      return a.ad_soyad.localeCompare(b.ad_soyad, 'tr')
    })
}

export function isciIzinRaporTablariOlustur(input: {
  yil: number
  periyotlar: RaporPeriyot[]
  etiketler: string[]
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, { ad_soyad: string }>
  hakBySicil: Map<string, IsciIzinHakRow>
  hareketler: IsciIzinHareketRow[]
  hakKullananTurler: Set<string>
}): IsciIzinRaporTabVerisi[] {
  const { yil, periyotlar, etiketler, kadro, calisanBySicil, hakBySicil, hareketler, hakKullananTurler } = input
  return periyotlar.map((p, i) => {
    const D = periyotSonGunu(yil, p)
    return {
      periyot: p,
      label: etiketler[i] ?? String(p),
      sonGunuEtiket: sonGunuMetin(D),
      satirlar: isciIzinRaporSnapshot({
        yil,
        periyot: p,
        D,
        kadro,
        calisanBySicil,
        hakBySicil,
        hareketler,
        hakKullananTurler,
      }),
    }
  })
}
