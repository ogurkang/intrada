import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import type { KadroRaporRow, RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import { ayAraligi, periyotSonGunu, yilAraligi } from '@/lib/rapor-statuye-gore-cinsiyet'

const HAKTAN_DUSEN_DURUMLAR = new Set(['Onaylandı', 'Değiştirildi'])

export type StatuIzinTip = 'isci' | 'memur'

export interface StatuIzinRaporSatir {
  sicil_no: string
  ad_soyad: string
  mudurluk: string
  devreden_izin: number
  hak_edilen_izin: number
  kullanilan_izin: number
  kalan_izin: number
}

export interface StatuIzinRaporTabVerisi {
  periyot: RaporPeriyot
  label: string
  sonGunuEtiket: string
  satirlar: StatuIzinRaporSatir[]
}

export interface StatuIzinHareketRow {
  sicil_no: string
  tur: string
  ayrilis: string | null
  baslama: string | null
  kayit_tarihi: string | null
  gun: number
  durum: string | null
}

export interface StatuIzinHakRow {
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

function statuEslesir(rawStatu: string | null | undefined, tip: StatuIzinTip): boolean {
  const n = normTr(rawStatu)
  return tip === 'isci' ? n === 'işçi' : n === 'memur'
}

function hareketTarih(h: StatuIzinHareketRow): string | null {
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

function mudurlukMetin(sec: KadroRaporRow): string {
  return String(sec.gorev_mudurlugu ?? sec.kadro_mudurlugu ?? '').trim() || '—'
}

export function statuIzinRaporSnapshot(input: {
  statuTip: StatuIzinTip
  yil: number
  periyot: RaporPeriyot
  D: string
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, { ad_soyad: string }>
  hakBySicil: Map<string, StatuIzinHakRow>
  hareketler: StatuIzinHareketRow[]
  hakKullananTurler: Set<string>
  mudurlukFiltre?: string[]
}): StatuIzinRaporSatir[] {
  const {
    statuTip,
    yil,
    periyot,
    D,
    kadro,
    calisanBySicil,
    hakBySicil,
    hareketler,
    hakKullananTurler,
    mudurlukFiltre,
  } = input

  const kadroByAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadro) {
    if (!r.asil) continue
    const list = kadroByAsil.get(r.asil) ?? []
    list.push(r)
    kadroByAsil.set(r.asil, list)
  }

  const statuSiciller = new Map<string, { mudurluk: string }>()
  for (const [sicil, rows] of kadroByAsil) {
    const sec = secilenKadroSatirAsil(rows, D)
    if (!sec) continue
    if (!statuEslesir(sec.statu, statuTip)) continue
    statuSiciller.set(sicil, { mudurluk: mudurlukMetin(sec) })
  }

  const aralik = periyot === 'yillik' ? yilAraligi(yil) : ayAraligi(yil, periyot as number)

  const kullanilanBySicil = new Map<string, number>()
  for (const h of hareketler) {
    if (!statuSiciller.has(h.sicil_no)) continue
    if (!HAKTAN_DUSEN_DURUMLAR.has(String(h.durum ?? '').trim())) continue
    if (!hakKullananTurler.has(String(h.tur ?? '').trim())) continue
    const ht = hareketTarih(h)
    if (!ht || ht > D) continue
    if (ht < aralik.bas || ht > aralik.bit) continue
    const onceki = kullanilanBySicil.get(h.sicil_no) ?? 0
    kullanilanBySicil.set(h.sicil_no, onceki + (h.gun ?? 0))
  }

  const mudurlukSet =
    mudurlukFiltre && mudurlukFiltre.length > 0 ? new Set(mudurlukFiltre) : null

  return [...statuSiciller.entries()]
    .map(([sicil, meta]) => {
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
        mudurluk: meta.mudurluk,
        devreden_izin: devreden,
        hak_edilen_izin: hakEdilen,
        kullanilan_izin: kullanilan,
        kalan_izin: kalan,
      }
    })
    .filter(r => !mudurlukSet || mudurlukSet.has(r.mudurluk))
    .sort((a, b) => {
      const sa = sicilSayisal(a.sicil_no)
      const sb = sicilSayisal(b.sicil_no)
      if (sa !== sb) return sa - sb
      return a.ad_soyad.localeCompare(b.ad_soyad, 'tr')
    })
}

export function statuIzinRaporTablariOlustur(input: {
  statuTip: StatuIzinTip
  yil: number
  periyotlar: RaporPeriyot[]
  etiketler: string[]
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, { ad_soyad: string }>
  hakBySicil: Map<string, StatuIzinHakRow>
  hareketler: StatuIzinHareketRow[]
  hakKullananTurler: Set<string>
  mudurlukFiltre?: string[]
}): StatuIzinRaporTabVerisi[] {
  const { yil, periyotlar, etiketler, mudurlukFiltre, ...rest } = input
  return periyotlar.map((p, i) => {
    const D = periyotSonGunu(yil, p)
    return {
      periyot: p,
      label: etiketler[i] ?? String(p),
      sonGunuEtiket: sonGunuMetin(D),
      satirlar: statuIzinRaporSnapshot({
        ...rest,
        yil,
        periyot: p,
        D,
        mudurlukFiltre,
      }),
    }
  })
}

export function statuIzinMudurlukListesi(tabs: StatuIzinRaporTabVerisi[]): string[] {
  return [...new Set(tabs.flatMap(t => t.satirlar.map(r => r.mudurluk).filter(m => m && m !== '—')))].sort(
    (a, b) => a.localeCompare(b, 'tr'),
  )
}

export function parseMudurlukParam(raw: string | undefined): string[] {
  return String(raw ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}
