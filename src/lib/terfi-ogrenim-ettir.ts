import {
  dkString,
  hesaplaDkIlerleme,
  kazancSatirToPuan,
  minDereceEgitim,
  type KazancPuan,
  type TerfiEttirDurumEtiket,
  type TerfiEttirOnizlemeSatir,
  type TerfiKaynak,
} from '@/lib/terfi-ettir-hesap'

export type TerfiOgrenimOlayTipi = 'hazirlik' | 'yuksek_lisans' | 'doktora'

export const TERFI_OGRENIM_OLAY_SECENEKLERI: {
  value: TerfiOgrenimOlayTipi
  label: string
  kisaLabel: string
}[] = [
  { value: 'hazirlik', label: 'Lisede Hazırlık Okudu', kisaLabel: 'Lise' },
  { value: 'yuksek_lisans', label: 'Yüksek Lisansı Tamamladı', kisaLabel: 'Yüksek' },
  { value: 'doktora', label: 'Doktorayı Tamamladı', kisaLabel: 'Doktora' },
]

export function ogrenimOlayEtiket(tip: TerfiOgrenimOlayTipi): string {
  return TERFI_OGRENIM_OLAY_SECENEKLERI.find(x => x.value === tip)?.label ?? tip
}

export function hedefOgrenimTuru(tip: TerfiOgrenimOlayTipi, mevcut: string | null | undefined): string {
  if (tip === 'yuksek_lisans') return 'Yüksek Lisans'
  if (tip === 'doktora') return 'Doktora'
  const m = String(mevcut ?? '').trim()
  if (m) return m
  return 'Lise'
}

function parseNum(s: string | null | undefined): number | null {
  if (s == null || !String(s).trim()) return null
  const n = Number.parseInt(String(s).trim(), 10)
  return Number.isFinite(n) ? n : null
}

function eslestirOgrenimId(ogrenimTuru: string, tanimlar: { id: number; isim: string }[]): number | null {
  const t = ogrenimTuru.trim().toLowerCase()
  if (!t) return null
  for (const o of tanimlar) {
    if (o.isim.trim().toLowerCase() === t) return o.id
  }
  for (const o of tanimlar) {
    const n = o.isim.trim().toLowerCase()
    if (t.includes(n) || n.includes(t)) return o.id
  }
  return null
}

/** Eğitim seviyesi yükselince derece/kademe ilerlemesi */
function hesaplaOgrenimTerfiIlerleme(d: number, k: number, oldMinD: number, newMinD: number) {
  if (newMinD < oldMinD && d > newMinD) {
    return hesaplaDkIlerleme(d, k, newMinD)
  }
  return hesaplaDkIlerleme(d, k, newMinD)
}

export function buildTerfiOgrenimOnizleme(input: {
  kaynak: TerfiKaynak
  olay: TerfiOgrenimOlayTipi
  kazancLookup: (unvanId: number, ogrenimId: number, derece: number) => KazancPuan | null
  tanimOgList: { id: number; isim: string }[]
}): TerfiEttirOnizlemeSatir | null {
  const { kaynak, olay, kazancLookup, tanimOgList } = input
  if (!kaynak.terfi_id) return null

  const kd = parseNum(kaynak.kha_derece)
  const kk = parseNum(kaynak.kha_kademe)
  const ed = parseNum(kaynak.ekea_derece)
  const ek = parseNum(kaynak.ekea_kademe)
  if (kd == null || kk == null || ed == null || ek == null) return null

  const yeniOgrenimTuru = hedefOgrenimTuru(olay, kaynak.ogrenim_turu)
  const yeniOgrenimId = eslestirOgrenimId(yeniOgrenimTuru, tanimOgList) ?? kaynak.ogrenim_id
  const oldMinD = minDereceEgitim(kaynak.ogrenim_turu)
  const newMinD = minDereceEgitim(yeniOgrenimTuru)

  const puanEski = kazancSatirToPuan(kaynak)
  const uId = kaynak.unvan_id

  const lookup = (derece: number, ogrenimId: number | null): KazancPuan => {
    if (uId == null || ogrenimId == null) return puanEski
    const row = kazancLookup(uId, ogrenimId, derece)
    return row ? kazancSatirToPuan(row) : puanEski
  }

  const sonK = hesaplaOgrenimTerfiIlerleme(kd, kk, oldMinD, newMinD)
  const sonE = hesaplaOgrenimTerfiIlerleme(ed, ek, oldMinD, newMinD)

  let newKd = sonK.yeniDerece
  let newKk = sonK.yeniKademe
  let newEd = sonE.yeniDerece
  let newEk = sonE.yeniKademe

  let puanSon = { ...puanEski }
  if (sonK.dereceDegisti) puanSon = { ...puanSon, ...lookup(newKd, yeniOgrenimId) }
  else if (yeniOgrenimId !== kaynak.ogrenim_id) puanSon = { ...puanSon, ...lookup(newKd, yeniOgrenimId) }
  if (sonE.dereceDegisti && sonE.yeniDerece !== sonK.yeniDerece) {
    puanSon = { ...puanSon, ...lookup(newEd, yeniOgrenimId) }
  }

  const durumEtiket = ogrenimOlayEtiket(olay) as TerfiEttirDurumEtiket

  return {
    sicil_no: kaynak.sicil_no,
    ad_soyad: kaynak.ad_soyad,
    unvan_adi: kaynak.unvan_adi,
    kadro_derecesi: kaynak.kadro_derecesi,
    ogrenim_turu: kaynak.ogrenim_turu,
    kha_tarihi: kaynak.kha_tarihi,
    ekea_tarihi: kaynak.ekea_tarihi,
    kidem_tarihi_eski: kaynak.kidem_tarihi ?? '—',
    kidem_tarihi_yeni: kaynak.kidem_tarihi ?? '—',
    iyi_hal_tarihi_eski: kaynak.iyi_hal_terfi_tarihi ?? '—',
    iyi_hal_tarihi_yeni: kaynak.iyi_hal_terfi_tarihi ?? '—',
    kidem_yili_eski: kaynak.kidem_yili ?? '—',
    kidem_yili_yeni: kaynak.kidem_yili ?? '—',
    dk_kha_eski: dkString(kd, kk),
    dk_kha_yeni: dkString(newKd, newKk),
    dk_ekea_eski: dkString(ed, ek),
    dk_ekea_yeni: dkString(newEd, newEk),
    ek_gosterge_eski: kaynak.ek_gosterge ?? '—',
    ek_gosterge_yeni: puanSon.ek_gosterge ?? '—',
    ek_odeme_eski: kaynak.ek_odeme ?? '—',
    ek_odeme_yeni: puanSon.ek_odeme ?? '—',
    oht_eski: kaynak.oht ?? '—',
    oht_yeni: puanSon.oht ?? '—',
    yan_odeme_eski: kaynak.yan_odeme ?? '—',
    yan_odeme_yeni: puanSon.yan_odeme ?? '—',
    sds_eski: kaynak.sds_orani ?? '—',
    sds_yeni: puanSon.sds_orani ?? '—',
    durum: durumEtiket,
    terfi_id: kaynak.terfi_id,
    ogrenim_terfi: true,
    ogrenim_olay: olay,
    yeni_ogrenim_turu: yeniOgrenimTuru,
    payload: {
      kha_derece: String(newKd),
      kha_kademe: String(newKk),
      ekea_derece: String(newEd),
      ekea_kademe: String(newEk),
      kha_tarihi: kaynak.kha_tarihi,
      ekea_tarihi: kaynak.ekea_tarihi,
      kidem_tarihi: kaynak.kidem_tarihi,
      kidem_yili: kaynak.kidem_yili,
      iyi_hal_terfi_tarihi: kaynak.iyi_hal_terfi_tarihi,
      ek_gosterge: puanSon.ek_gosterge,
      ek_odeme: puanSon.ek_odeme,
      oht: puanSon.oht,
      yan_odeme: puanSon.yan_odeme,
      sds_orani: puanSon.sds_orani,
    },
  }
}

export function kazancLookupFromEntries(
  entries: Array<{ key: string; puan: KazancPuan }>,
): (unvanId: number, ogrenimId: number, derece: number) => KazancPuan | null {
  const map = new Map(entries.map(e => [e.key, e.puan]))
  return (unvanId, ogrenimId, derece) => map.get(`${unvanId}-${ogrenimId}-${derece}`) ?? null
}
