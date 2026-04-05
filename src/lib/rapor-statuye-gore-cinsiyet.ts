/**
 * Statüye göre cinsiyet raporu — anlık görüntü tarihi (ay sonu veya yıl sonu),
 * kadro asıl personeli + firma personel satırı.
 */

export type RaporPeriyot = 'yillik' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export interface TanimStatuRow {
  statu_adi: string
  sira_no: number | null
}

export interface KadroRaporRow {
  asil: string | null
  statu: string | null
  kuruma_giris_tarihi: string | null
  memuriyet_tarihi: string | null
  ayrilis_tarihi: string | null
  durumu: string | null
  /** Konum raporu — aktif satırdan görev veya kadro müdürlüğü */
  gorev_mudurlugu?: string | null
  kadro_mudurlugu?: string | null
}

export interface CalisanRaporRow {
  sicil_no: string
  ad_soyad: string
  cinsiyet: string | null
  /** Yaş raporu — `calisan.dogum_tarihi` */
  dogum_tarihi?: string | null
}

export interface FirmaRaporRow {
  id: number
  /** Firma personelde isteğe bağlı; rapor listelerinde gösterim için */
  sicil_no?: string | null
  ad_soyad: string
  cinsiyet: string | null
  kuruma_giris_tarihi: string | null
  ayrilis_tarihi: string | null
  /** Konum raporu — görev müdürlüğü (tanim_mudurluk ile eşleştirme) */
  gorev_mudurlugu?: string | null
  /** Öğrenim / meslek raporları — firma kartındaki öğrenim ve meslek alanları */
  ogrenim?: string | null
  meslegi?: string | null
  /** Yaş raporu — `firma_calisanlar.dogum_tarihi` */
  dogum_tarihi?: string | null
}

/** Ayrılan / işe başlama — «Ayrılanlar» ekranı ile uyumlu kaynak: personel_hareketleri */
export interface PersonelHareketRaporRow {
  sicil_no: string
  ayrilis_tarihi: string | null
  ise_baslama_tarihi: string | null
}

export interface StatuCinsiyetSatir {
  statuEtiket: string
  kadin: number
  erkek: number
}

function sliceD(s: string | null | undefined): string | null {
  if (!s) return null
  return String(s).slice(0, 10)
}

export function kadroBaslangic(k: KadroRaporRow): string {
  const a = sliceD(k.kuruma_giris_tarihi)
  const b = sliceD(k.memuriyet_tarihi)
  if (a && b) return a < b ? a : b
  return a ?? b ?? '1900-01-01'
}

/** D: YYYY-MM-DD — o gün sonunda kadroda mı? */
export function kadroSatirAktifMi(k: KadroRaporRow, D: string): boolean {
  if (k.durumu === 'Boş') return false
  const bas = kadroBaslangic(k)
  if (bas > D) return false
  const ay = sliceD(k.ayrilis_tarihi)
  if (ay && ay <= D) return false
  return true
}

export function periyotSonGunu(yil: number, periyot: RaporPeriyot): string {
  if (periyot === 'yillik') {
    return `${yil}-12-31`
  }
  const m = periyot as number
  const son = new Date(yil, m, 0)
  const g = String(son.getDate()).padStart(2, '0')
  const ay = String(m).padStart(2, '0')
  return `${yil}-${ay}-${g}`
}

export function ayAraligi(yil: number, ay: number): { bas: string; bit: string } {
  const son = new Date(yil, ay, 0)
  const g = String(son.getDate()).padStart(2, '0')
  const am = String(ay).padStart(2, '0')
  return { bas: `${yil}-${am}-01`, bit: `${yil}-${am}-${g}` }
}

export function yilAraligi(yil: number): { bas: string; bit: string } {
  return { bas: `${yil}-01-01`, bit: `${yil}-12-31` }
}

function tarihAraliginda(t: string | null | undefined, bas: string, bit: string): boolean {
  const x = sliceD(t)
  if (!x) return false
  return x >= bas && x <= bit
}

/** Cinsiyet: yalnızca Kadın / Erkek sayılır (uygulama seçenekleriyle uyumlu) */
function cinsiyetKolon(c: string | null | undefined): 'Kadın' | 'Erkek' | null {
  const v = String(c ?? '').trim()
  if (v === 'Kadın' || v === 'Kız') return 'Kadın'
  if (v === 'Erkek') return 'Erkek'
  return null
}

function normStatu(s: string | null | undefined): string {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Tanım kümesindeki etiketle (statü, öğrenim türü vb.) eşleşen anahtar; yoksa ''. */
export function etiketAnahtari(etiketler: Set<string>, raw: string | null | undefined): string {
  const n = normStatu(raw)
  if (!n) return ''
  const nLower = n.toLocaleLowerCase('tr-TR')
  for (const e of etiketler) {
    if (e.toLocaleLowerCase('tr-TR') === nLower) return e
  }
  return ''
}

function statuKey(etiketler: Set<string>, raw: string | null | undefined): string {
  return etiketAnahtari(etiketler, raw)
}

export interface SnapshotInput {
  D: string
  tanimStatuler: TanimStatuRow[]
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, CalisanRaporRow>
  firma: FirmaRaporRow[]
}

/**
 * Anlık görüntü: D günü sonunda geçerli asıl kadro satırı (en geç başlayan aktif kayıt).
 */
export function statuCinsiyetSnapshot(input: SnapshotInput): {
  satirlar: StatuCinsiyetSatir[]
} {
  const { D, tanimStatuler, kadro, calisanBySicil, firma } = input
  const etiketler = new Set(
    [...tanimStatuler]
      .sort((a, b) => {
        const sa = a.sira_no ?? 9999
        const sb = b.sira_no ?? 9999
        if (sa !== sb) return sa - sb
        return (a.statu_adi || '').localeCompare(b.statu_adi || '', 'tr')
      })
      .map(t => t.statu_adi),
  )

  const say: Record<string, { kadin: number; erkek: number }> = {}
  for (const e of etiketler) {
    say[e] = { kadin: 0, erkek: 0 }
  }
  let digerK = 0
  let digerE = 0

  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadro) {
    if (!r.asil) continue
    const list = byAsil.get(r.asil) ?? []
    list.push(r)
    byAsil.set(r.asil, list)
  }

  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, D))
    if (aktif.length === 0) continue
    const secilen = aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
    const stRaw = secilen.statu
    const key = statuKey(etiketler, stRaw)
    const cal = calisanBySicil.get(sicil)
    const col = cinsiyetKolon(cal?.cinsiyet)
    if (!col) continue
    if (key) {
      if (col === 'Kadın') say[key].kadin += 1
      else say[key].erkek += 1
    } else {
      if (col === 'Kadın') digerK += 1
      else digerE += 1
    }
  }

  const satirlar: StatuCinsiyetSatir[] = [...tanimStatuler]
    .sort((a, b) => {
      const sa = a.sira_no ?? 9999
      const sb = b.sira_no ?? 9999
      if (sa !== sb) return sa - sb
      return (a.statu_adi || '').localeCompare(b.statu_adi || '', 'tr')
    })
    .map(t => ({
      statuEtiket: t.statu_adi,
      kadin: say[t.statu_adi]?.kadin ?? 0,
      erkek: say[t.statu_adi]?.erkek ?? 0,
    }))

  if (digerK > 0 || digerE > 0) {
    satirlar.push({ statuEtiket: 'Tanımda olmayan statü', kadin: digerK, erkek: digerE })
  }

  let fk = 0
  let fe = 0
  for (const f of firma) {
    const bas = sliceD(f.kuruma_giris_tarihi) ?? '1900-01-01'
    const ay = sliceD(f.ayrilis_tarihi)
    if (bas > D) continue
    if (ay && ay <= D) continue
    const col = cinsiyetKolon(f.cinsiyet)
    if (col === 'Kadın') fk += 1
    else if (col === 'Erkek') fe += 1
  }

  return {
    satirlar: [...satirlar, { statuEtiket: 'Firma Personel', kadin: fk, erkek: fe }],
  }
}

function calisanAdi(calisanBySicil: Map<string, CalisanRaporRow>, sicil: string): string {
  const ad = calisanBySicil.get(sicil)?.ad_soyad?.trim()
  return ad || sicil
}

export function gelenlerAyrilanlar(params: {
  periyot: RaporPeriyot
  yil: number
  kadro: KadroRaporRow[]
  calisanBySicil: Map<string, CalisanRaporRow>
  firma: FirmaRaporRow[]
  /** Personel hareketleri (ayrılış / işe başlama) — Ayrılanlar listesi bu tabloyla uyumludur */
  personelHareketleri?: PersonelHareketRaporRow[]
}): { gelenler: string[]; ayrilanlar: string[] } {
  const { periyot, yil, kadro, calisanBySicil, firma, personelHareketleri = [] } = params

  let bas: string
  let bit: string
  if (periyot === 'yillik') {
    const y = yilAraligi(yil)
    bas = y.bas
    bit = y.bit
  } else {
    const a = ayAraligi(yil, periyot as number)
    bas = a.bas
    bit = a.bit
  }

  const gelenMap = new Map<string, string>()
  const ayriMap = new Map<string, string>()

  for (const k of kadro) {
    if (!k.asil) continue
    const ad = calisanAdi(calisanBySicil, k.asil)
    if (tarihAraliginda(k.kuruma_giris_tarihi, bas, bit)) gelenMap.set(`k:${k.asil}`, ad)
    if (tarihAraliginda(k.ayrilis_tarihi, bas, bit)) ayriMap.set(`k:${k.asil}`, ad)
  }

  for (const ph of personelHareketleri) {
    const ad = calisanAdi(calisanBySicil, ph.sicil_no)
    if (tarihAraliginda(ph.ise_baslama_tarihi, bas, bit)) gelenMap.set(`k:${ph.sicil_no}`, ad)
    if (tarihAraliginda(ph.ayrilis_tarihi, bas, bit)) ayriMap.set(`k:${ph.sicil_no}`, ad)
  }

  for (const f of firma) {
    const ad = f.ad_soyad.trim() || `Firma #${f.id}`
    const fk = `f:${f.id}`
    if (tarihAraliginda(f.kuruma_giris_tarihi, bas, bit)) gelenMap.set(fk, ad)
    if (tarihAraliginda(f.ayrilis_tarihi, bas, bit)) ayriMap.set(fk, ad)
  }

  const siralaAd = (m: Map<string, string>) =>
    [...m.values()].sort((a, b) => a.localeCompare(b, 'tr'))

  return {
    gelenler: siralaAd(gelenMap),
    ayrilanlar: siralaAd(ayriMap),
  }
}
