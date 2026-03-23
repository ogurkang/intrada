'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatTrMoneyDisplay, parseTrMoneyDisplay } from '@/lib/tr-money-format'
import { malBildirimDetayHref, malBildirimUrlSegment } from '@/lib/mal-bildirim-route'

/** Content-Disposition başlığından dosya adı (API UTF-8 filename* kullanıyor). */
function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null
  const utf8 = /filename\*=UTF-8''([^;\n]+)/i.exec(header)
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim())
    } catch {
      return utf8[1].trim()
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header)
  if (quoted?.[1]) return quoted[1]
  const plain = /filename=([^;\s]+)/i.exec(header)
  if (plain?.[1]) return plain[1].replace(/^["']|["']$/g, '')
  return null
}

export type MalDetayKimlikSatir = {
  sira: number
  ad_soyad: string
  dogum_tarihi: string
  dogum_yeri: string
  yakinlik: string
  tckn: string
}

export type MalDetayTasinmazSatir = {
  sira: number
  cins: string
  adres: string
  hisse: string
  deger: string
  edinme: string
  malik_yakinlik_ad: string
  malik_tckn: string
}

export type MalDetayKooperatifSatir = {
  sira: number
  adi_yeri: string
  hisse_degeri: string
  uyelik: string
  hissedar_yakinlik_ad: string
  hissedar_tckn: string
}

export type MalDetayTasitSatir = {
  sira: number
  tasit_cinsi: string
  plaka: string
  marka_model: string
  model_yili: string
  edinme_degeri: string
  edinme: string
  sahip_yakinlik_ad: string
  sahip_tckn: string
}

export type MalDetayDigerTasinirSatir = {
  sira: number
  tasinir_cinsi: string
  model_yili: string
  edinme_degeri: string
  edinme: string
  sahip_yakinlik_ad: string
  sahip_tckn: string
}

export type MalDetayBankaMenkulSatir = {
  sira: number
  nitelik: string
  cinsi: string
  miktar: string
  guncel_kur: string
  deger: string
  sahip_yakinlik_ad: string
  sahip_tckn: string
}

export type MalDetayAltinMucevherSatir = {
  sira: number
  cinsi: string
  turu: string
  miktar: string
  guncel_kur: string
  deger: string
  sahip_yakinlik_ad: string
  sahip_tckn: string
}

export type MalDetayBorcAlacakSatir = {
  sira: number
  borclu: string
  alacakli: string
  birimi: string
  miktar: string
  guncel_kur: string
  tutar: string
}

export type MalDetayHaklarSatir = {
  sira: number
  unsur: string
  edinme_sekli: string
  sahip_yakinlik_ad: string
  sahip_tckn: string
}

export type MalDetayKayit = {
  id: number
  /** URL ve Excel API için tahmin edilemez segment (UUID); yoksa `id` kullanılır. */
  public_id?: string | null
  sicil_no: string
  ad_soyad: string | null
  tckn: string | null
  son_net_maas: number | null
  beyan_turu: string | null
  onay_tarihi: string | null
  aciklama: string | null
  kimlik_json: unknown
  tasinmaz_json: unknown
  kooperatif_json: unknown
  tasitlar_json: unknown
  diger_tasinirlar_json: unknown
  banka_menkul_json: unknown
  altin_mucevher_json: unknown
  borc_alacak_json: unknown
  haklar_json: unknown
}

interface Props {
  kayit: MalDetayKayit
  /** Personel kartından `?salt=1` ile: düzenleme / Excel dışa aktarma gizlenir */
  saltOkunur?: boolean
}

function str(v: unknown): string {
  if (v == null) return ''
  return String(v).trim()
}

function tarihGoster(t: string | null) {
  if (!t) return '—'
  try {
    return new Date(t).toLocaleDateString('tr-TR')
  } catch {
    return t
  }
}

function tarihIsoKisa(iso: string): string {
  const s = String(iso).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split('-')
    return `${d}.${m}.${y}`
  }
  return s || '—'
}

function kimlikDetayParse(raw: unknown): MalDetayKimlikSatir[] {
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((item: Record<string, unknown>, i: number) => ({
    sira: i + 1,
    ad_soyad: str(item.ad_soyad ?? item.adSoyad),
    dogum_tarihi: tarihIsoKisa(str(item.dogum_tarihi ?? item.dogumTarihi)),
    dogum_yeri: str(item.dogum_yeri ?? item.dogumYeri),
    yakinlik: str(item.yakinlik) || (i === 0 ? 'Kendisi' : '—'),
    tckn: str(item.tckn),
  }))
}

function tasinmazDetayParse(raw: unknown, kimlikRaw: unknown): MalDetayTasinmazSatir[] {
  const kArr = Array.isArray(kimlikRaw) ? kimlikRaw : []
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((item: Record<string, unknown>, i: number) => {
    const idx = Number(item.malik_kimlik_indeksi)
    const k = Number.isFinite(idx) && idx >= 0 && idx < kArr.length
      ? (kArr[idx] as Record<string, unknown>)
      : null
    const y = k ? str(k.yakinlik) : ''
    const ad = k ? str(k.ad_soyad ?? k.adSoyad) : ''
    const tcFromKimlik = k ? str(k.tckn) : ''
    const tcDirekt = str(item.malik_tc ?? item.malikTc)
    return {
      sira: i + 1,
      cins: str(item.tasinmaz_cinsi ?? item.cins),
      adres: str(item.adres ?? item.adresi),
      hisse: str(item.hisse_miktari ?? item.hissesi),
      deger: str(item.degeri ?? item.deger),
      edinme: tarihIsoKisa(str(item.edinme_tarihi ?? item.edinme)),
      malik_yakinlik_ad: y && ad ? `${y} — ${ad}` : ad || y || '—',
      malik_tckn: tcDirekt || tcFromKimlik,
    }
  })
}

function kooperatifDetayParse(raw: unknown, kimlikRaw: unknown): MalDetayKooperatifSatir[] {
  const kArr = Array.isArray(kimlikRaw) ? kimlikRaw : []
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((item: Record<string, unknown>, i: number) => {
    const idx = Number(item.hissedar_kimlik_indeksi ?? item.hissedarKimlikIndeksi)
    const k = Number.isFinite(idx) && idx >= 0 && idx < kArr.length
      ? (kArr[idx] as Record<string, unknown>)
      : null
    const y = k ? str(k.yakinlik) : ''
    const ad = k ? str(k.ad_soyad ?? k.adSoyad) : ''
    const tcFromKimlik = k ? str(k.tckn) : ''
    const tcDirekt = str(item.hissedar_tc ?? item.hissedarTc)
    return {
      sira: i + 1,
      adi_yeri: str(item.adi_yeri ?? item.ad_yeri ?? item.adYeri),
      hisse_degeri: str(item.hisse_degeri ?? item.hisseDegeri),
      uyelik: tarihIsoKisa(str(item.uyelik_tarihi ?? item.uyelikTarihi)),
      hissedar_yakinlik_ad: y && ad ? `${y} — ${ad}` : ad || y || '—',
      hissedar_tckn: tcDirekt || tcFromKimlik,
    }
  })
}

function paraGoster(v: unknown): string {
  if (v == null || v === '') return '—'
  if (typeof v === 'number' && Number.isFinite(v)) return formatTrMoneyDisplay(v)
  const s = String(v).trim()
  if (!s) return '—'
  const n = parseTrMoneyDisplay(s)
  if (Number.isFinite(n) && n > 0) return formatTrMoneyDisplay(n)
  return s
}

function tasitDetayParse(raw: unknown, kimlikRaw: unknown): MalDetayTasitSatir[] {
  const kArr = Array.isArray(kimlikRaw) ? kimlikRaw : []
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((item: Record<string, unknown>, i: number) => {
    const idx = Number(item.sahip_kimlik_indeksi ?? item.sahipKimlikIndeksi)
    const k = Number.isFinite(idx) && idx >= 0 && idx < kArr.length
      ? (kArr[idx] as Record<string, unknown>)
      : null
    const y = k ? str(k.yakinlik) : ''
    const ad = k ? str(k.ad_soyad ?? k.adSoyad) : ''
    const tcFromKimlik = k ? str(k.tckn) : ''
    const tcDirekt = str(item.sahibi_tc ?? item.sahibiTc)
    return {
      sira: i + 1,
      tasit_cinsi: str(item.tasit_cinsi ?? item.tasitCinsi),
      plaka: str(item.plaka_no ?? item.plakaNo),
      marka_model: str(item.marka_model ?? item.markaModel),
      model_yili: str(item.model_yili ?? item.modelYili),
      edinme_degeri: paraGoster(item.edinme_degeri ?? item.edinmeDegeri),
      edinme: tarihIsoKisa(str(item.edinme_tarihi ?? item.edinmeTarihi)),
      sahip_yakinlik_ad: y && ad ? `${y} — ${ad}` : ad || y || '—',
      sahip_tckn: tcDirekt || tcFromKimlik,
    }
  })
}

function bankaMenkulDetayParse(raw: unknown, kimlikRaw: unknown): MalDetayBankaMenkulSatir[] {
  const kArr = Array.isArray(kimlikRaw) ? kimlikRaw : []
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((item: Record<string, unknown>, i: number) => {
    const idx = Number(item.sahip_kimlik_indeksi ?? item.sahipKimlikIndeksi)
    const k = Number.isFinite(idx) && idx >= 0 && idx < kArr.length
      ? (kArr[idx] as Record<string, unknown>)
      : null
    const y = k ? str(k.yakinlik) : ''
    const ad = k ? str(k.ad_soyad ?? k.adSoyad) : ''
    const tcFromKimlik = k ? str(k.tckn) : ''
    const tcDirekt = str(item.sahibi_tc ?? item.sahibiTc)
    const m = item.miktar
    const kur = item.guncel_kur ?? item.guncelKur
    const mNum = typeof m === 'number' && Number.isFinite(m) ? m : parseTrMoneyDisplay(String(m ?? ''))
    const kNum = typeof kur === 'number' && Number.isFinite(kur) ? kur : parseTrMoneyDisplay(String(kur ?? ''))
    const degerNum = mNum * kNum
    return {
      sira: i + 1,
      nitelik: str(item.nitelik),
      cinsi: str(item.cins ?? item.cinsi),
      miktar: paraGoster(m),
      guncel_kur: paraGoster(kur),
      deger: degerNum > 0 ? formatTrMoneyDisplay(degerNum) : '—',
      sahip_yakinlik_ad: y && ad ? `${y} — ${ad}` : ad || y || '—',
      sahip_tckn: tcDirekt || tcFromKimlik,
    }
  })
}

function borcAlacakDetayParse(raw: unknown): MalDetayBorcAlacakSatir[] {
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((item: Record<string, unknown>, i: number) => {
    const m = item.miktar
    const kur = item.guncel_kur ?? item.guncelKur
    const mNum = typeof m === 'number' && Number.isFinite(m) ? m : parseTrMoneyDisplay(String(m ?? ''))
    const kNum = typeof kur === 'number' && Number.isFinite(kur) ? kur : parseTrMoneyDisplay(String(kur ?? ''))
    const tutarNum = mNum * kNum
    return {
      sira: i + 1,
      borclu: str(item.borclu ?? item.borclu_adi_soyad),
      alacakli: str(item.alacakli ?? item.alacakli_adi_soyad),
      birimi: str(item.birimi ?? item.birim),
      miktar: paraGoster(m),
      guncel_kur: paraGoster(kur),
      tutar: tutarNum > 0 ? formatTrMoneyDisplay(tutarNum) : '—',
    }
  })
}

function haklarDetayParse(raw: unknown, kimlikRaw: unknown): MalDetayHaklarSatir[] {
  const kArr = Array.isArray(kimlikRaw) ? kimlikRaw : []
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((item: Record<string, unknown>, i: number) => {
    const idx = Number(item.sahip_kimlik_indeksi ?? item.sahipKimlikIndeksi)
    const k = Number.isFinite(idx) && idx >= 0 && idx < kArr.length
      ? (kArr[idx] as Record<string, unknown>)
      : null
    const y = k ? str(k.yakinlik) : ''
    const ad = k ? str(k.ad_soyad ?? k.adSoyad) : ''
    const tcFromKimlik = k ? str(k.tckn) : ''
    const tcDirekt = str(item.sahibi_tc ?? item.sahibiTc)
    return {
      sira: i + 1,
      unsur: str(item.unsur ?? item.tanim ?? item.tur),
      edinme_sekli: str(item.edinme_sekli ?? item.edinmeSekli ?? item.edinme),
      sahip_yakinlik_ad: y && ad ? `${y} — ${ad}` : ad || y || '—',
      sahip_tckn: tcDirekt || tcFromKimlik,
    }
  })
}

function altinMucevherDetayParse(raw: unknown, kimlikRaw: unknown): MalDetayAltinMucevherSatir[] {
  const kArr = Array.isArray(kimlikRaw) ? kimlikRaw : []
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((item: Record<string, unknown>, i: number) => {
    const idx = Number(item.sahip_kimlik_indeksi ?? item.sahipKimlikIndeksi)
    const k = Number.isFinite(idx) && idx >= 0 && idx < kArr.length
      ? (kArr[idx] as Record<string, unknown>)
      : null
    const y = k ? str(k.yakinlik) : ''
    const ad = k ? str(k.ad_soyad ?? k.adSoyad) : ''
    const tcFromKimlik = k ? str(k.tckn) : ''
    const tcDirekt = str(item.sahibi_tc ?? item.sahibiTc)
    const m = item.miktar
    const kur = item.guncel_kur ?? item.guncelKur
    const mNum = typeof m === 'number' && Number.isFinite(m) ? m : parseTrMoneyDisplay(String(m ?? ''))
    const kNum = typeof kur === 'number' && Number.isFinite(kur) ? kur : parseTrMoneyDisplay(String(kur ?? ''))
    const degerNum = mNum * kNum
    return {
      sira: i + 1,
      cinsi: str(item.cinsi ?? item.cins),
      turu: str(item.turu ?? item.tur),
      miktar: paraGoster(m),
      guncel_kur: paraGoster(kur),
      deger: degerNum > 0 ? formatTrMoneyDisplay(degerNum) : '—',
      sahip_yakinlik_ad: y && ad ? `${y} — ${ad}` : ad || y || '—',
      sahip_tckn: tcDirekt || tcFromKimlik,
    }
  })
}

function digerTasinirDetayParse(raw: unknown, kimlikRaw: unknown): MalDetayDigerTasinirSatir[] {
  const kArr = Array.isArray(kimlikRaw) ? kimlikRaw : []
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((item: Record<string, unknown>, i: number) => {
    const idx = Number(item.sahip_kimlik_indeksi ?? item.sahipKimlikIndeksi)
    const k = Number.isFinite(idx) && idx >= 0 && idx < kArr.length
      ? (kArr[idx] as Record<string, unknown>)
      : null
    const y = k ? str(k.yakinlik) : ''
    const ad = k ? str(k.ad_soyad ?? k.adSoyad) : ''
    const tcFromKimlik = k ? str(k.tckn) : ''
    const tcDirekt = str(item.sahibi_tc ?? item.sahibiTc)
    return {
      sira: i + 1,
      tasinir_cinsi: str(item.tasinir_cinsi ?? item.tasinirCinsi),
      model_yili: str(item.model_yili ?? item.modelYili),
      edinme_degeri: paraGoster(item.edinme_degeri ?? item.edinmeDegeri),
      edinme: tarihIsoKisa(str(item.edinme_tarihi ?? item.edinmeTarihi)),
      sahip_yakinlik_ad: y && ad ? `${y} — ${ad}` : ad || y || '—',
      sahip_tckn: tcDirekt || tcFromKimlik,
    }
  })
}

export default function MalDetayClient({ kayit, saltOkunur = false }: Props) {
  const [excelBusy, setExcelBusy] = useState(false)

  async function malExcelIndir(modCokSatir: boolean) {
    const seg = encodeURIComponent(malBildirimUrlSegment(kayit))
    const url = modCokSatir
      ? `/api/bildirim/mal/excel?id=${seg}&mod=coksatir`
      : `/api/bildirim/mal/excel?id=${seg}`
    setExcelBusy(true)
    try {
      const res = await fetch(url, { credentials: 'same-origin' })
      if (!res.ok) {
        let msg = 'Excel indirilemedi'
        try {
          const j = (await res.json()) as { error?: string }
          if (typeof j?.error === 'string') msg = j.error
        } catch {
          /* yanıt JSON değilse */
        }
        window.alert(msg)
        return
      }
      const blob = await res.blob()
      const fromHeader = parseFilenameFromContentDisposition(res.headers.get('Content-Disposition'))
      const fallback = modCokSatir ? 'Mal_Bildirimi_CokSatirli.xlsx' : 'Mal_Bildirimi.xlsx'
      const name = fromHeader ?? fallback
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(a.href)
    } finally {
      setExcelBusy(false)
    }
  }

  const maasX5 = useMemo(() => {
    if (kayit.son_net_maas == null || !Number.isFinite(Number(kayit.son_net_maas))) return '—'
    return formatTrMoneyDisplay(Number(kayit.son_net_maas) * 5)
  }, [kayit.son_net_maas])

  const kimlikRows = useMemo(
    () => kimlikDetayParse(kayit.kimlik_json),
    [kayit.kimlik_json],
  )
  const tasinmazRows = useMemo(
    () => tasinmazDetayParse(kayit.tasinmaz_json, kayit.kimlik_json),
    [kayit.tasinmaz_json, kayit.kimlik_json],
  )
  const kooperatifRows = useMemo(
    () => kooperatifDetayParse(kayit.kooperatif_json, kayit.kimlik_json),
    [kayit.kooperatif_json, kayit.kimlik_json],
  )
  const tasitRows = useMemo(
    () => tasitDetayParse(kayit.tasitlar_json, kayit.kimlik_json),
    [kayit.tasitlar_json, kayit.kimlik_json],
  )
  const digerTasinirRows = useMemo(
    () => digerTasinirDetayParse(kayit.diger_tasinirlar_json, kayit.kimlik_json),
    [kayit.diger_tasinirlar_json, kayit.kimlik_json],
  )
  const bankaMenkulRows = useMemo(
    () => bankaMenkulDetayParse(kayit.banka_menkul_json, kayit.kimlik_json),
    [kayit.banka_menkul_json, kayit.kimlik_json],
  )
  const altinMucevherRows = useMemo(
    () => altinMucevherDetayParse(kayit.altin_mucevher_json, kayit.kimlik_json),
    [kayit.altin_mucevher_json, kayit.kimlik_json],
  )
  const borcAlacakRows = useMemo(
    () => borcAlacakDetayParse(kayit.borc_alacak_json),
    [kayit.borc_alacak_json],
  )
  const haklarRows = useMemo(
    () => haklarDetayParse(kayit.haklar_json, kayit.kimlik_json),
    [kayit.haklar_json, kayit.kimlik_json],
  )

  const aciklamaTekSatir = (kayit.aciklama ?? '').replace(/\s+/g, ' ').trim()
  const urlSeg = malBildirimUrlSegment(kayit)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Mal Bildirimi - Görüntüle</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/bildirim/mal"
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            ← Geri
          </Link>
          {!saltOkunur && (
            <Link href={`/bildirim/mal/${urlSeg}/duzenle`}
              className="flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">
              Düzenle
            </Link>
          )}
          {!saltOkunur && (
            <details className="relative">
              <summary className="list-none flex cursor-pointer items-center gap-1 border border-green-600 text-green-700 text-sm px-4 py-2 rounded-lg hover:bg-green-50 transition-colors marker:content-none [&::-webkit-details-marker]:hidden">
                Excel İndir
                <span className="text-[10px] opacity-70" aria-hidden>
                  ▾
                </span>
              </summary>
              <div className="absolute right-0 mt-1 z-50 min-w-[220px] rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                <button
                  type="button"
                  disabled={excelBusy}
                  onClick={() => void malExcelIndir(false)}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  Excel İndir
                </button>
                <button
                  type="button"
                  disabled={excelBusy}
                  onClick={() => void malExcelIndir(true)}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  Çok Satırlı İndir
                </button>
              </div>
            </details>
          )}
          {saltOkunur && (
            <p className="text-xs text-slate-500 max-w-xs">Bu ekran salt okunurdur; düzenleme için Bildirim → Mal Beyanı üzerinden ilerleyin.</p>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Özet</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-500">Ad Soyad</span>
              <p className="font-medium">{kayit.ad_soyad ?? '—'}</p>
            </div>
            <div>
              <span className="text-slate-500">Sicil No</span>
              <p className="font-mono">{kayit.sicil_no}</p>
            </div>
            <div>
              <span className="text-slate-500">TCKN</span>
              <p className="font-mono">{kayit.tckn ?? '—'}</p>
            </div>
            <div>
              <span className="text-slate-500">Net Maaş</span>
              <p className="font-mono tabular-nums">
                {kayit.son_net_maas != null
                  ? formatTrMoneyDisplay(Number(kayit.son_net_maas))
                  : '—'}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Net Maaş × 5</span>
              <p className="font-mono tabular-nums">{maasX5}</p>
            </div>
          </div>
        </div>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <h2 className="text-sm font-bold text-slate-700 px-4 py-3 bg-slate-50 border-b border-slate-200">
            Kimlik Bilgileri
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs">
                  <th className="text-left p-2 border-b border-slate-200 w-12">Sıra</th>
                  <th className="text-left p-2 border-b border-slate-200">Adı Soyadı</th>
                  <th className="text-left p-2 border-b border-slate-200">Doğum Tarihi</th>
                  <th className="text-left p-2 border-b border-slate-200">Doğum Yeri</th>
                  <th className="text-left p-2 border-b border-slate-200">Yakınlığı</th>
                  <th className="text-left p-2 border-b border-slate-200">TC Kimlik No</th>
                </tr>
              </thead>
              <tbody>
                {kimlikRows.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-slate-500 text-center">Kayıt yok.</td></tr>
                ) : (
                  kimlikRows.map(row => (
                    <tr key={row.sira} className="border-b border-slate-100">
                      <td className="p-2 tabular-nums text-slate-500">{row.sira}</td>
                      <td className="p-2 font-medium text-slate-800 whitespace-nowrap">{row.ad_soyad || '—'}</td>
                      <td className="p-2 whitespace-nowrap tabular-nums">{row.dogum_tarihi}</td>
                      <td className="p-2 whitespace-nowrap">{row.dogum_yeri || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{row.yakinlik}</td>
                      <td className="p-2 font-mono whitespace-nowrap">{row.tckn || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <h2 className="text-sm font-bold text-slate-700 px-4 py-3 bg-slate-50 border-b border-slate-200">
            Taşınmaz Bilgileri
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs">
                  <th className="text-left p-2 border-b border-slate-200 w-12">Sıra</th>
                  <th className="text-left p-2 border-b border-slate-200">Taşınmaz cinsi</th>
                  <th className="text-left p-2 border-b border-slate-200">Adres</th>
                  <th className="text-left p-2 border-b border-slate-200">Hisse</th>
                  <th className="text-left p-2 border-b border-slate-200">Değer</th>
                  <th className="text-left p-2 border-b border-slate-200">Edinme</th>
                  <th className="text-left p-2 border-b border-slate-200">Malik (yakınlık)</th>
                  <th className="text-left p-2 border-b border-slate-200">Malik TCKN</th>
                </tr>
              </thead>
              <tbody>
                {tasinmazRows.length === 0 ? (
                  <tr><td colSpan={8} className="p-4 text-slate-500 text-center">Taşınmaz kaydı yok.</td></tr>
                ) : (
                  tasinmazRows.map(row => (
                    <tr key={row.sira} className="border-b border-slate-100">
                      <td className="p-2 tabular-nums text-slate-500">{row.sira}</td>
                      <td className="p-2 whitespace-nowrap">{row.cins || '—'}</td>
                      <td className="p-2 text-slate-800 max-w-xs truncate" title={row.adres}>{row.adres || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{row.hisse || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{row.deger || '—'}</td>
                      <td className="p-2 whitespace-nowrap tabular-nums">{row.edinme}</td>
                      <td className="p-2 whitespace-nowrap">{row.malik_yakinlik_ad}</td>
                      <td className="p-2 font-mono whitespace-nowrap">{row.malik_tckn || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <h2 className="text-sm font-bold text-slate-700 px-4 py-3 bg-slate-50 border-b border-slate-200">
            Kooperatif Bilgileri
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs">
                  <th className="text-left p-2 border-b border-slate-200 w-12">Sıra</th>
                  <th className="text-left p-2 border-b border-slate-200">Kooperatifin adı ve yeri</th>
                  <th className="text-left p-2 border-b border-slate-200">Hisse değeri</th>
                  <th className="text-left p-2 border-b border-slate-200">Üyelik tarihi</th>
                  <th className="text-left p-2 border-b border-slate-200">Hissedar (yakınlık)</th>
                  <th className="text-left p-2 border-b border-slate-200">Hissedar TCKN</th>
                </tr>
              </thead>
              <tbody>
                {kooperatifRows.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-slate-500 text-center">Kooperatif kaydı yok.</td></tr>
                ) : (
                  kooperatifRows.map(row => (
                    <tr key={row.sira} className="border-b border-slate-100">
                      <td className="p-2 tabular-nums text-slate-500">{row.sira}</td>
                      <td className="p-2 text-slate-800 max-w-md truncate" title={row.adi_yeri}>{row.adi_yeri || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{row.hisse_degeri || '—'}</td>
                      <td className="p-2 whitespace-nowrap tabular-nums">{row.uyelik}</td>
                      <td className="p-2 whitespace-nowrap">{row.hissedar_yakinlik_ad}</td>
                      <td className="p-2 font-mono whitespace-nowrap">{row.hissedar_tckn || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <h2 className="text-sm font-bold text-slate-700 px-4 py-3 bg-slate-50 border-b border-slate-200">
            Taşınır Mal Bilgileri — Taşıt
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs">
                  <th className="text-left p-2 border-b border-slate-200 w-12">Sıra</th>
                  <th className="text-left p-2 border-b border-slate-200">Taşıtın cinsi</th>
                  <th className="text-left p-2 border-b border-slate-200">Plaka</th>
                  <th className="text-left p-2 border-b border-slate-200">Marka/model</th>
                  <th className="text-left p-2 border-b border-slate-200">Model yılı</th>
                  <th className="text-left p-2 border-b border-slate-200">Edinme değeri</th>
                  <th className="text-left p-2 border-b border-slate-200">Edinme</th>
                  <th className="text-left p-2 border-b border-slate-200">Sahip</th>
                  <th className="text-left p-2 border-b border-slate-200">Sahip TCKN</th>
                </tr>
              </thead>
              <tbody>
                {tasitRows.length === 0 ? (
                  <tr><td colSpan={9} className="p-4 text-slate-500 text-center">Taşıt kaydı yok.</td></tr>
                ) : (
                  tasitRows.map(row => (
                    <tr key={row.sira} className="border-b border-slate-100">
                      <td className="p-2 tabular-nums text-slate-500">{row.sira}</td>
                      <td className="p-2 whitespace-nowrap">{row.tasit_cinsi || '—'}</td>
                      <td className="p-2 font-mono whitespace-nowrap">{row.plaka || '—'}</td>
                      <td className="p-2">{row.marka_model || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{row.model_yili || '—'}</td>
                      <td className="p-2 font-mono tabular-nums whitespace-nowrap">{row.edinme_degeri}</td>
                      <td className="p-2 whitespace-nowrap tabular-nums">{row.edinme}</td>
                      <td className="p-2 whitespace-nowrap">{row.sahip_yakinlik_ad}</td>
                      <td className="p-2 font-mono whitespace-nowrap">{row.sahip_tckn || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <h2 className="text-sm font-bold text-slate-700 px-4 py-3 bg-slate-50 border-b border-slate-200">
            Taşınır Mal Bilgileri — Diğer taşınırlar
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs">
                  <th className="text-left p-2 border-b border-slate-200 w-12">Sıra</th>
                  <th className="text-left p-2 border-b border-slate-200">Taşınır cinsi</th>
                  <th className="text-left p-2 border-b border-slate-200">Model yılı</th>
                  <th className="text-left p-2 border-b border-slate-200">Edinme değeri</th>
                  <th className="text-left p-2 border-b border-slate-200">Edinme</th>
                  <th className="text-left p-2 border-b border-slate-200">Sahip</th>
                  <th className="text-left p-2 border-b border-slate-200">Sahip TCKN</th>
                </tr>
              </thead>
              <tbody>
                {digerTasinirRows.length === 0 ? (
                  <tr><td colSpan={7} className="p-4 text-slate-500 text-center">Kayıt yok.</td></tr>
                ) : (
                  digerTasinirRows.map(row => (
                    <tr key={row.sira} className="border-b border-slate-100">
                      <td className="p-2 tabular-nums text-slate-500">{row.sira}</td>
                      <td className="p-2 whitespace-nowrap">{row.tasinir_cinsi || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{row.model_yili || '—'}</td>
                      <td className="p-2 font-mono tabular-nums whitespace-nowrap">{row.edinme_degeri}</td>
                      <td className="p-2 whitespace-nowrap tabular-nums">{row.edinme}</td>
                      <td className="p-2 whitespace-nowrap">{row.sahip_yakinlik_ad}</td>
                      <td className="p-2 font-mono whitespace-nowrap">{row.sahip_tckn || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <h2 className="text-sm font-bold text-slate-700 px-4 py-3 bg-slate-50 border-b border-slate-200">
            Banka ve Menkul Değerlere Ait Bilgiler
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs">
                  <th className="text-left p-2 border-b border-slate-200 w-12">Sıra</th>
                  <th className="text-left p-2 border-b border-slate-200">Niteliği</th>
                  <th className="text-left p-2 border-b border-slate-200">Cinsi</th>
                  <th className="text-left p-2 border-b border-slate-200">Miktarı</th>
                  <th className="text-left p-2 border-b border-slate-200">Güncel kur</th>
                  <th className="text-left p-2 border-b border-slate-200">Değeri (miktar × kur)</th>
                  <th className="text-left p-2 border-b border-slate-200">Sahip</th>
                  <th className="text-left p-2 border-b border-slate-200">Sahip TCKN</th>
                </tr>
              </thead>
              <tbody>
                {bankaMenkulRows.length === 0 ? (
                  <tr><td colSpan={8} className="p-4 text-slate-500 text-center">Kayıt yok.</td></tr>
                ) : (
                  bankaMenkulRows.map(row => (
                    <tr key={row.sira} className="border-b border-slate-100">
                      <td className="p-2 tabular-nums text-slate-500">{row.sira}</td>
                      <td className="p-2 whitespace-nowrap">{row.nitelik || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{row.cinsi || '—'}</td>
                      <td className="p-2 font-mono tabular-nums whitespace-nowrap">{row.miktar}</td>
                      <td className="p-2 font-mono tabular-nums whitespace-nowrap">{row.guncel_kur}</td>
                      <td className="p-2 font-mono tabular-nums whitespace-nowrap">{row.deger}</td>
                      <td className="p-2 whitespace-nowrap">{row.sahip_yakinlik_ad}</td>
                      <td className="p-2 font-mono whitespace-nowrap">{row.sahip_tckn || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <h2 className="text-sm font-bold text-slate-700 px-4 py-3 bg-slate-50 border-b border-slate-200">
            Altın ve Mücevherat Bilgileri
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs">
                  <th className="text-left p-2 border-b border-slate-200 w-12">Sıra</th>
                  <th className="text-left p-2 border-b border-slate-200">Cinsi</th>
                  <th className="text-left p-2 border-b border-slate-200">Türü</th>
                  <th className="text-left p-2 border-b border-slate-200">Miktarı</th>
                  <th className="text-left p-2 border-b border-slate-200">Güncel kur</th>
                  <th className="text-left p-2 border-b border-slate-200">Değeri (miktar × kur)</th>
                  <th className="text-left p-2 border-b border-slate-200">Sahip</th>
                  <th className="text-left p-2 border-b border-slate-200">Sahip TCKN</th>
                </tr>
              </thead>
              <tbody>
                {altinMucevherRows.length === 0 ? (
                  <tr><td colSpan={8} className="p-4 text-slate-500 text-center">Kayıt yok.</td></tr>
                ) : (
                  altinMucevherRows.map(row => (
                    <tr key={row.sira} className="border-b border-slate-100">
                      <td className="p-2 tabular-nums text-slate-500">{row.sira}</td>
                      <td className="p-2 whitespace-nowrap">{row.cinsi || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{row.turu || '—'}</td>
                      <td className="p-2 font-mono tabular-nums whitespace-nowrap">{row.miktar}</td>
                      <td className="p-2 font-mono tabular-nums whitespace-nowrap">{row.guncel_kur}</td>
                      <td className="p-2 font-mono tabular-nums whitespace-nowrap">{row.deger}</td>
                      <td className="p-2 whitespace-nowrap">{row.sahip_yakinlik_ad}</td>
                      <td className="p-2 font-mono whitespace-nowrap">{row.sahip_tckn || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <h2 className="text-sm font-bold text-slate-700 px-4 py-3 bg-slate-50 border-b border-slate-200">
            Borç – Alacak Bilgileri
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs">
                  <th className="text-left p-2 border-b border-slate-200 w-12">Sıra</th>
                  <th className="text-left p-2 border-b border-slate-200">Borçlunun adı soyadı</th>
                  <th className="text-left p-2 border-b border-slate-200">Alacaklının adı soyadı</th>
                  <th className="text-left p-2 border-b border-slate-200">Birimi</th>
                  <th className="text-left p-2 border-b border-slate-200">Miktarı</th>
                  <th className="text-left p-2 border-b border-slate-200">Güncel kur</th>
                  <th className="text-left p-2 border-b border-slate-200">Borç alacak tutarı</th>
                </tr>
              </thead>
              <tbody>
                {borcAlacakRows.length === 0 ? (
                  <tr><td colSpan={7} className="p-4 text-slate-500 text-center">Kayıt yok.</td></tr>
                ) : (
                  borcAlacakRows.map(row => (
                    <tr key={row.sira} className="border-b border-slate-100">
                      <td className="p-2 tabular-nums text-slate-500">{row.sira}</td>
                      <td className="p-2">{row.borclu || '—'}</td>
                      <td className="p-2">{row.alacakli || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{row.birimi || '—'}</td>
                      <td className="p-2 font-mono tabular-nums whitespace-nowrap">{row.miktar}</td>
                      <td className="p-2 font-mono tabular-nums whitespace-nowrap">{row.guncel_kur}</td>
                      <td className="p-2 font-mono tabular-nums whitespace-nowrap">{row.tutar}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <h2 className="text-sm font-bold text-slate-700 px-4 py-3 bg-slate-50 border-b border-slate-200">
            Haklar ve Diğer Unsurlar
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs">
                  <th className="text-left p-2 border-b border-slate-200 w-12">Sıra</th>
                  <th className="text-left p-2 border-b border-slate-200">Hak veya beyanı gerekli görülen diğer servet unsurları</th>
                  <th className="text-left p-2 border-b border-slate-200">Edinme şekli</th>
                  <th className="text-left p-2 border-b border-slate-200">Sahip</th>
                  <th className="text-left p-2 border-b border-slate-200">Sahip TCKN</th>
                </tr>
              </thead>
              <tbody>
                {haklarRows.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-slate-500 text-center">Kayıt yok.</td></tr>
                ) : (
                  haklarRows.map(row => (
                    <tr key={row.sira} className="border-b border-slate-100">
                      <td className="p-2 tabular-nums text-slate-500">{row.sira}</td>
                      <td className="p-2">{row.unsur || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{row.edinme_sekli || '—'}</td>
                      <td className="p-2 whitespace-nowrap">{row.sahip_yakinlik_ad}</td>
                      <td className="p-2 font-mono whitespace-nowrap">{row.sahip_tckn || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <h2 className="text-sm font-bold text-slate-700 px-4 py-3 bg-slate-50 border-b border-slate-200">
            Açıklama
          </h2>
          <div className="px-4 py-3 text-sm text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis" title={aciklamaTekSatir || undefined}>
            {aciklamaTekSatir || '—'}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <h2 className="text-sm font-bold text-slate-700 px-4 py-3 bg-slate-50 border-b border-slate-200">
            Onay
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-2 w-40 text-slate-500 text-xs font-medium">Beyan türü</td>
                  <td className="p-2 font-medium">{kayit.beyan_turu ?? '—'}</td>
                  <td className="p-2 w-40 text-slate-500 text-xs font-medium">Onay tarihi</td>
                  <td className="p-2 whitespace-nowrap">{tarihGoster(kayit.onay_tarihi)}</td>
                  <td className="p-2 w-40 text-slate-500 text-xs font-medium">İmzalayan (Excel U81)</td>
                  <td className="p-2 font-medium">{kayit.ad_soyad ?? '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <Link href="/bildirim/mal"
          className="inline-flex items-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors">
          ← Listeye Dön
        </Link>
      </div>
    </div>
  )
}
