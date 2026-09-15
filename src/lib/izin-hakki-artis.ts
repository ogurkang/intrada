export type IzinHakKural = {
  statu: string
  en_az: number | null
  en_cok: number | null
  hak_edilen_gun: number
  sira_no: number | null
}

export const ON_YIL_IZIN_ARTIS_GUN = 10

export type IzinHakArtisGecmis = {
  oncekiHak: number | null
  sonrakiHak: number | null
}

export type IzinHakkiOnerilenSonuc = {
  kidemYili: number
  kidemTarihi: string | null
  mevcutHak: number
  onerilenHak: number
  kapsamaGiriyor: boolean
  esit: boolean
  onYilArtisi: boolean
}

function norm(s: string | null | undefined): string {
  return String(s ?? '').trim().toLocaleLowerCase('tr-TR')
}

export function isIsciStatu(statu: string | null | undefined): boolean {
  return norm(statu).includes('işçi')
}

export function izinHakKuralBul(kurallar: IzinHakKural[], statu: string, kidemYili: number): number {
  const statuNorm = norm(statu)
  const aday = kurallar.filter(k => {
    if (norm(k.statu) !== statuNorm) return false
    if (k.en_az != null && kidemYili < k.en_az) return false
    if (k.en_cok != null && kidemYili > k.en_cok) return false
    return true
  })
  if (!aday.length) return 0
  aday.sort((a, b) => {
    const aralikA = (a.en_cok ?? 999) - (a.en_az ?? 0)
    const aralikB = (b.en_cok ?? 999) - (b.en_az ?? 0)
    if (aralikA !== aralikB) return aralikA - aralikB
    return (a.sira_no ?? 999) - (b.sira_no ?? 999)
  })
  return aday[0].hak_edilen_gun ?? 0
}

export function hakEdilenGunSayi(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'object' && !Array.isArray(v)) {
    const rec = v as { hak_edilen_gun?: unknown }
    if ('hak_edilen_gun' in rec) return hakEdilenGunSayi(rec.hak_edilen_gun)
  }
  const n = Number.parseInt(String(v).trim(), 10)
  return Number.isFinite(n) ? n : null
}

export function izinHakArtisGecmisi(
  logs: Array<{ onceki?: unknown; sonraki?: unknown }>,
): IzinHakArtisGecmis[] {
  return logs.map(l => ({
    oncekiHak: hakEdilenGunSayi(l.onceki),
    sonrakiHak: hakEdilenGunSayi(l.sonraki),
  }))
}

/** 10. yıl için mevcut (veya önceki) hakka +10 eklendi mi. */
export function onYilArtisiUygulandiMi(opts: {
  mevcutHak: number
  oncekiYilHak: number | null
  gecmis: IzinHakArtisGecmis[]
}): boolean {
  if (opts.oncekiYilHak != null && opts.mevcutHak === opts.oncekiYilHak + ON_YIL_IZIN_ARTIS_GUN) {
    return true
  }
  return opts.gecmis.some(
    g => g.oncekiHak != null && g.sonrakiHak != null && g.sonrakiHak === g.oncekiHak + ON_YIL_IZIN_ARTIS_GUN,
  )
}

function parseTarih(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s) return null
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  const iso = m ? `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}` : s.slice(0, 10)
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function kidemYiliKurumaGiris(kurumaGiris: string | null | undefined, bugun: string): number {
  const d = parseTarih(kurumaGiris ?? null)
  if (!d) return 0
  const t = new Date(`${bugun}T12:00:00`)
  let yilFark = t.getFullYear() - d.getFullYear()
  const ayFark = t.getMonth() - d.getMonth()
  const gunFark = t.getDate() - d.getDate()
  if (ayFark < 0 || (ayFark === 0 && gunFark < 0)) yilFark--
  return Math.max(0, yilFark)
}

export function yilDonumuBuYil(kurumaGiris: string | null | undefined, buYil: number): string | null {
  const d = parseTarih(kurumaGiris ?? null)
  if (!d) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${buYil}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function izinHakkiOnerilenHesapla(opts: {
  statu: string | null | undefined
  kidemYiliTerfi: number | null | undefined
  kidemTarihiTerfi: string | null | undefined
  kurumaGirisTarihi: string | null | undefined
  mevcutHak: number
  kurallar: IzinHakKural[]
  buYil: number
  bugun: string
  terfiVar: boolean
  oncekiYilHak?: number | null
  hakGecmisi?: IzinHakArtisGecmis[]
}): IzinHakkiOnerilenSonuc | null {
  const isIsci = isIsciStatu(opts.statu)
  if (!isIsci && !opts.terfiVar) return null

  const kidemYili = isIsci
    ? kidemYiliKurumaGiris(opts.kurumaGirisTarihi, opts.bugun)
    : (opts.kidemYiliTerfi ?? 0)
  const kidemTarihi = isIsci
    ? yilDonumuBuYil(opts.kurumaGirisTarihi, opts.buYil)
    : (opts.kidemTarihiTerfi ?? null)

  const kidemTarihBuYil =
    !!kidemTarihi &&
    kidemTarihi.slice(0, 4) === String(opts.buYil) &&
    kidemTarihi <= opts.bugun
  const kapsamaGiriyor = isIsci
    ? Boolean(kidemTarihBuYil)
    : Boolean(kidemYili >= 10 || (kidemYili === 9 && kidemTarihBuYil))

  const mevcutHak = opts.mevcutHak
  if (isIsci) {
    const onerilenHak = kapsamaGiriyor ? izinHakKuralBul(opts.kurallar, opts.statu ?? '', kidemYili) : 0
    return {
      kidemYili,
      kidemTarihi,
      mevcutHak,
      onerilenHak,
      kapsamaGiriyor,
      esit: onerilenHak > 0 && onerilenHak === mevcutHak,
      onYilArtisi: false,
    }
  }

  const tanimOnYil = izinHakKuralBul(opts.kurallar, opts.statu ?? '', 10)
  const artisUygulandi = onYilArtisiUygulandiMi({
    mevcutHak,
    oncekiYilHak: opts.oncekiYilHak ?? null,
    gecmis: opts.hakGecmisi ?? [],
  }) || (tanimOnYil > 0 && mevcutHak >= tanimOnYil)

  const taban = mevcutHak > 0
    ? mevcutHak
    : (opts.oncekiYilHak != null && opts.oncekiYilHak > 0
      ? opts.oncekiYilHak
      : izinHakKuralBul(opts.kurallar, opts.statu ?? '', 9))
  const onerilenHak = artisUygulandi ? mevcutHak : taban + ON_YIL_IZIN_ARTIS_GUN

  return {
    kidemYili,
    kidemTarihi,
    mevcutHak,
    onerilenHak,
    kapsamaGiriyor,
    esit: artisUygulandi,
    onYilArtisi: true,
  }
}
