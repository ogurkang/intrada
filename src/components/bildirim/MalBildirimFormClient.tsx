'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PersonelAramaSecim, { type PersonelAramaOge } from '@/components/bildirim/PersonelAramaSecim'
import type { PersonelSecenek } from '@/lib/bildirim-personel'
import { formatTrMoneyDisplay, parseTrMoneyDisplay, sanitizeTrMoneyTyping } from '@/lib/tr-money-format'
import { malBildirimDetayHref } from '@/lib/mal-bildirim-route'

/** Kimlik listesinde «Seçiniz» = henüz seçim yok */
const KIMLIK_SECILMEDI = -1

export type KimlikFormSatir = {
  ad_soyad: string
  dogum_tarihi: string
  dogum_yeri: string
  yakinlik: string
  tckn: string
}

export type TasinmazFormSatir = {
  tasinmaz_cinsi: '' | 'Bina' | 'Arsa' | 'Arazi'
  adres: string
  hisse_miktari: string
  degeri: string
  edinme_tarihi: string
  /** Kimlik listesindeki satır; Excel’de o satırın TCKN’i yazılır */
  malik_kimlik_indeksi: number
}

export type KooperatifFormSatir = {
  adi_yeri: string
  hisse_degeri: string
  uyelik_tarihi: string
  /** Excel’de hissedar TCKN — listede yakınlık seçilir */
  hissedar_kimlik_indeksi: number
}

export type TasitFormSatir = {
  tasit_cinsi: '' | 'Kara' | 'Deniz' | 'Hava'
  plaka_no: string
  marka_model: string
  model_yili: string
  edinme_degeri_raw: string
  edinme_tarihi: string
  sahip_kimlik_indeksi: number
}

export type DigerTasinirFormSatir = {
  tasinir_cinsi: '' | 'Pul' | 'Silah' | 'Antika' | 'Diğer'
  model_yili: string
  edinme_degeri_raw: string
  edinme_tarihi: string
  sahip_kimlik_indeksi: number
}

export type BankaMenkulFormSatir = {
  nitelik: '' | 'Para' | 'Hisse Senedi' | 'Tahvil' | 'Fon' | 'Diğer'
  cins: '' | 'Türk Lirası' | 'Dolar' | 'Euro' | 'Diğer'
  miktar_raw: string
  kur_raw: string
  sahip_kimlik_indeksi: number
}

export type AltinMucevherFormSatir = {
  cinsi: '' | 'Altın' | 'Mücevher' | 'Diğer'
  turu:
    | ''
    | 'Gram'
    | 'Çeyrek'
    | 'Yarım'
    | 'Tam'
    | 'Reşat'
    | 'Cumhuriyet'
    | 'Bilezik'
    | 'Tektaş'
    | 'Diğer'
  miktar_raw: string
  kur_raw: string
  sahip_kimlik_indeksi: number
}

export type BorcAlacakFormSatir = {
  borclu_adi: string
  alacakli_adi: string
  birimi: '' | 'Türk Lirası' | 'Dolar' | 'Euro' | 'Diğer'
  miktar_raw: string
  kur_raw: string
}

/** Bölüm-8: hak / diğer servet unsuru — sahip TCKN kimlik listesinden */
export type HaklarFormSatir = {
  unsur: string
  edinme_sekli: string
  sahip_kimlik_indeksi: number
}

/** Düzenleme sayfasına sunucudan gelen kayıt özeti */
export type MalDuzenleInitial = {
  id: number
  /** URL segmenti; yoksa sayısal id kullanılır (geçiş). */
  public_id?: string | null
  sicil_no: string
  ad_soyad: string | null
  tckn: string | null
  dogum_tarihi: string | null
  dogum_yeri: string | null
  gorev_unvani: string
  son_net_maas: number | null
  kimlik_json: unknown
  tasinmaz_json: unknown
  kooperatif_json: unknown
  tasitlar_json: unknown
  diger_tasinirlar_json: unknown
  banka_menkul_json: unknown
  altin_mucevher_json: unknown
  borc_alacak_json: unknown
  haklar_json: unknown
  aciklama: string | null
  beyan_turu: string | null
  onay_tarihi: string | null
}

type PropsCreate = {
  mode: 'create'
  memurlar: PersonelSecenek[]
  onKaydet: (fd: FormData) => Promise<{ hata?: string }>
}

type PropsEdit = {
  mode: 'edit'
  initial: MalDuzenleInitial
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
}

export type MalBildirimFormClientProps = PropsCreate | PropsEdit

const YAKINLIK_EK = ['Eşi', 'Çocuğu', 'Diğer'] as const
const BEYAN_TURLERI = ['Genel Beyan', 'Ek Beyan'] as const
const TASINMAZ_CINSLERI = ['Bina', 'Arsa', 'Arazi'] as const
const TASIT_CINSLERI = ['Kara', 'Deniz', 'Hava'] as const
const DIGER_TASINIR_CINSLERI = ['Pul', 'Silah', 'Antika', 'Diğer'] as const
const BANKA_NITELIKLERI = ['Para', 'Hisse Senedi', 'Tahvil', 'Fon', 'Diğer'] as const
const BANKA_CINSLERI = ['Türk Lirası', 'Dolar', 'Euro', 'Diğer'] as const
const ALTIN_MUCEVHER_CINSI = ['Altın', 'Mücevher', 'Diğer'] as const
const ALTIN_MUCEVHER_TURU = [
  'Gram',
  'Çeyrek',
  'Yarım',
  'Tam',
  'Reşat',
  'Cumhuriyet',
  'Bilezik',
  'Tektaş',
  'Diğer',
] as const
const BORC_ALACAK_BIRIMI = ['Türk Lirası', 'Dolar', 'Euro', 'Diğer'] as const

function Accordion({
  title,
  acik,
  onClick,
  children,
}: {
  title: string
  acik: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button type="button" onClick={onClick}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-left text-sm font-semibold text-slate-800">
        {title}
        <svg className={`w-4 h-4 text-slate-500 transition-transform shrink-0 ${acik ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {acik && <div className="p-4 border-t border-slate-100 space-y-4">{children}</div>}
    </div>
  )
}

function bosKimlikSatir(): KimlikFormSatir {
  return { ad_soyad: '', dogum_tarihi: '', dogum_yeri: '', yakinlik: '', tckn: '' }
}

function bosTasinmazSatir(malikIdx = KIMLIK_SECILMEDI): TasinmazFormSatir {
  return {
    tasinmaz_cinsi: '',
    adres: '',
    hisse_miktari: '',
    degeri: '',
    edinme_tarihi: '',
    malik_kimlik_indeksi: malikIdx,
  }
}

function bosKooperatifSatir(hissedarIdx = KIMLIK_SECILMEDI): KooperatifFormSatir {
  return {
    adi_yeri: '',
    hisse_degeri: '',
    uyelik_tarihi: '',
    hissedar_kimlik_indeksi: hissedarIdx,
  }
}

function bosTasitSatir(sahipIdx = KIMLIK_SECILMEDI): TasitFormSatir {
  return {
    tasit_cinsi: '',
    plaka_no: '',
    marka_model: '',
    model_yili: '',
    edinme_degeri_raw: '',
    edinme_tarihi: '',
    sahip_kimlik_indeksi: sahipIdx,
  }
}

function bosDigerTasinirSatir(sahipIdx = KIMLIK_SECILMEDI): DigerTasinirFormSatir {
  return {
    tasinir_cinsi: '',
    model_yili: '',
    edinme_degeri_raw: '',
    edinme_tarihi: '',
    sahip_kimlik_indeksi: sahipIdx,
  }
}

function bosBankaMenkulSatir(sahipIdx = KIMLIK_SECILMEDI): BankaMenkulFormSatir {
  return {
    nitelik: '',
    cins: '',
    miktar_raw: '',
    kur_raw: '',
    sahip_kimlik_indeksi: sahipIdx,
  }
}

function bosAltinMucevherSatir(sahipIdx = KIMLIK_SECILMEDI): AltinMucevherFormSatir {
  return {
    cinsi: '',
    turu: '',
    miktar_raw: '',
    kur_raw: '',
    sahip_kimlik_indeksi: sahipIdx,
  }
}

function bosBorcAlacakSatir(): BorcAlacakFormSatir {
  return {
    borclu_adi: '',
    alacakli_adi: '',
    birimi: '',
    miktar_raw: '',
    kur_raw: '',
  }
}

function bosHaklarSatir(sahipIdx = KIMLIK_SECILMEDI): HaklarFormSatir {
  return {
    unsur: '',
    edinme_sekli: '',
    sahip_kimlik_indeksi: sahipIdx,
  }
}

function tarihInputDegeri(v: string | null | undefined): string {
  if (!v) return ''
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return ''
}

function kimlikJsonToSatirlar(
  raw: unknown,
  fallback: { ad_soyad: string; dogum_tarihi: string | null; dogum_yeri: string | null; tckn: string | null },
): KimlikFormSatir[] {
  const arr = Array.isArray(raw) ? raw : []
  if (arr.length === 0) {
    const d = tarihInputDegeri(fallback.dogum_tarihi)
    return [{
      ad_soyad: fallback.ad_soyad,
      dogum_tarihi: d,
      dogum_yeri: fallback.dogum_yeri ?? '',
      yakinlik: 'Kendisi',
      tckn: fallback.tckn ?? '',
    }]
  }
  return arr.map((item: Record<string, unknown>, idx: number) => {
    const y = String(item.yakinlik ?? '')
    return {
      ad_soyad: String(item.ad_soyad ?? item.adSoyad ?? ''),
      dogum_tarihi: tarihInputDegeri(String(item.dogum_tarihi ?? item.dogumTarihi ?? '')),
      dogum_yeri: String(item.dogum_yeri ?? item.dogumYeri ?? ''),
      yakinlik: idx === 0 ? (y || 'Kendisi') : y,
      tckn: String(item.tckn ?? '').replace(/\D/g, '').slice(0, 11),
    }
  })
}

function normalizeTasinmazCins(v: unknown): TasinmazFormSatir['tasinmaz_cinsi'] {
  const s = String(v ?? '').trim()
  if (s === 'Bina' || s === 'Arsa' || s === 'Arazi') return s
  return ''
}

function tasinmazJsonToSatirlar(raw: unknown, kimlikLen: number): TasinmazFormSatir[] {
  const arr = Array.isArray(raw) ? raw : []
  const maxI = kimlikLen <= 0 ? 0 : kimlikLen - 1
  return arr.map((item: Record<string, unknown>) => {
    let idx = Number(item.malik_kimlik_indeksi ?? item.malikKimlikIndeksi)
    if (!Number.isFinite(idx) || idx < 0) idx = KIMLIK_SECILMEDI
    else idx = Math.min(idx, maxI)
    return {
      tasinmaz_cinsi: normalizeTasinmazCins(item.tasinmaz_cinsi ?? item.cins),
      adres: String(item.adres ?? item.adresi ?? ''),
      hisse_miktari: String(item.hisse_miktari ?? item.hissesi ?? item.metrekare ?? ''),
      degeri: String(item.degeri ?? item.deger ?? ''),
      edinme_tarihi: tarihInputDegeri(String(item.edinme_tarihi ?? item.edinme ?? '')),
      malik_kimlik_indeksi: idx,
    }
  })
}

function tasinmazSatirDolu(row: TasinmazFormSatir): boolean {
  return Boolean(
    row.tasinmaz_cinsi
    || row.adres.trim()
    || row.hisse_miktari.trim()
    || row.degeri.trim()
    || row.edinme_tarihi.trim(),
  )
}

function kooperatifJsonToSatirlar(raw: unknown, kimlikLen: number): KooperatifFormSatir[] {
  const arr = Array.isArray(raw) ? raw : []
  const maxI = kimlikLen <= 0 ? 0 : kimlikLen - 1
  return arr.map((item: Record<string, unknown>) => {
    let idx = Number(item.hissedar_kimlik_indeksi ?? item.hissedarKimlikIndeksi)
    if (!Number.isFinite(idx) || idx < 0) idx = KIMLIK_SECILMEDI
    else idx = Math.min(idx, maxI)
    return {
      adi_yeri: String(item.adi_yeri ?? item.ad_yeri ?? item.adYeri ?? ''),
      hisse_degeri: String(item.hisse_degeri ?? item.hisseDegeri ?? ''),
      uyelik_tarihi: tarihInputDegeri(String(item.uyelik_tarihi ?? item.uyelikTarihi ?? '')),
      hissedar_kimlik_indeksi: idx,
    }
  })
}

function kooperatifSatirDolu(row: KooperatifFormSatir): boolean {
  return Boolean(
    row.adi_yeri.trim() || row.hisse_degeri.trim() || row.uyelik_tarihi.trim(),
  )
}

function normalizeTasitCins(v: unknown): TasitFormSatir['tasit_cinsi'] {
  const s = String(v ?? '').trim()
  if (s === 'Kara' || s === 'Deniz' || s === 'Hava') return s
  return ''
}

function normalizeDigerTasinirCins(v: unknown): DigerTasinirFormSatir['tasinir_cinsi'] {
  const s = String(v ?? '').trim()
  if (s === 'Pul' || s === 'Silah' || s === 'Antika' || s === 'Diğer') return s
  return ''
}

function tasitJsonToSatirlar(raw: unknown, kimlikLen: number): TasitFormSatir[] {
  const arr = Array.isArray(raw) ? raw : []
  const maxI = kimlikLen <= 0 ? 0 : kimlikLen - 1
  return arr.map((item: Record<string, unknown>) => {
    let idx = Number(item.sahip_kimlik_indeksi ?? item.sahipKimlikIndeksi)
    if (!Number.isFinite(idx) || idx < 0) idx = KIMLIK_SECILMEDI
    else idx = Math.min(idx, maxI)
    const ed = item.edinme_degeri ?? item.edinmeDegeri
    const edNum = typeof ed === 'number' && Number.isFinite(ed)
      ? ed
      : parseTrMoneyDisplay(String(ed ?? ''))
    return {
      tasit_cinsi: normalizeTasitCins(item.tasit_cinsi ?? item.tasitCinsi),
      plaka_no: String(item.plaka_no ?? item.plakaNo ?? ''),
      marka_model: String(item.marka_model ?? item.markaModel ?? ''),
      model_yili: String(item.model_yili ?? item.modelYili ?? ''),
      edinme_degeri_raw: edNum > 0 ? formatTrMoneyDisplay(edNum) : '',
      edinme_tarihi: tarihInputDegeri(String(item.edinme_tarihi ?? '')),
      sahip_kimlik_indeksi: idx,
    }
  })
}

function digerTasinirJsonToSatirlar(raw: unknown, kimlikLen: number): DigerTasinirFormSatir[] {
  const arr = Array.isArray(raw) ? raw : []
  const maxI = kimlikLen <= 0 ? 0 : kimlikLen - 1
  return arr.map((item: Record<string, unknown>) => {
    let idx = Number(item.sahip_kimlik_indeksi ?? item.sahipKimlikIndeksi)
    if (!Number.isFinite(idx) || idx < 0) idx = KIMLIK_SECILMEDI
    else idx = Math.min(idx, maxI)
    const ed = item.edinme_degeri ?? item.edinmeDegeri
    const edNum = typeof ed === 'number' && Number.isFinite(ed)
      ? ed
      : parseTrMoneyDisplay(String(ed ?? ''))
    return {
      tasinir_cinsi: normalizeDigerTasinirCins(item.tasinir_cinsi ?? item.tasinirCinsi),
      model_yili: String(item.model_yili ?? item.modelYili ?? ''),
      edinme_degeri_raw: edNum > 0 ? formatTrMoneyDisplay(edNum) : '',
      edinme_tarihi: tarihInputDegeri(String(item.edinme_tarihi ?? '')),
      sahip_kimlik_indeksi: idx,
    }
  })
}

function tasitSatirDolu(row: TasitFormSatir): boolean {
  return Boolean(
    row.tasit_cinsi
    || row.plaka_no.trim()
    || row.marka_model.trim()
    || row.model_yili.trim()
    || row.edinme_degeri_raw.trim()
    || row.edinme_tarihi.trim(),
  )
}

function digerTasinirSatirDolu(row: DigerTasinirFormSatir): boolean {
  return Boolean(
    row.tasinir_cinsi
    || row.model_yili.trim()
    || row.edinme_degeri_raw.trim()
    || row.edinme_tarihi.trim(),
  )
}

function normalizeBankaNitelik(v: unknown): BankaMenkulFormSatir['nitelik'] {
  const s = String(v ?? '').trim()
  if (s === 'Para' || s === 'Hisse Senedi' || s === 'Tahvil' || s === 'Fon' || s === 'Diğer') return s
  return ''
}

function normalizeBankaCins(v: unknown): BankaMenkulFormSatir['cins'] {
  const s = String(v ?? '').trim()
  if (s === 'Türk Lirası' || s === 'Dolar' || s === 'Euro' || s === 'Diğer') return s
  return ''
}

function bankaMenkulJsonToSatirlar(raw: unknown, kimlikLen: number): BankaMenkulFormSatir[] {
  const arr = Array.isArray(raw) ? raw : []
  const maxI = kimlikLen <= 0 ? 0 : kimlikLen - 1
  return arr.map((item: Record<string, unknown>) => {
    let idx = Number(item.sahip_kimlik_indeksi ?? item.sahipKimlikIndeksi)
    if (!Number.isFinite(idx) || idx < 0) idx = KIMLIK_SECILMEDI
    else idx = Math.min(idx, maxI)
    const m = item.miktar
    const k = item.guncel_kur ?? item.guncelKur
    const mNum = typeof m === 'number' && Number.isFinite(m)
      ? m
      : parseTrMoneyDisplay(String(m ?? ''))
    const kNum = typeof k === 'number' && Number.isFinite(k)
      ? k
      : parseTrMoneyDisplay(String(k ?? ''))
    return {
      nitelik: normalizeBankaNitelik(item.nitelik),
      cins: normalizeBankaCins(item.cins ?? item.cinsi),
      miktar_raw: mNum > 0 ? formatTrMoneyDisplay(mNum) : '',
      kur_raw: kNum > 0 ? formatTrMoneyDisplay(kNum) : '',
      sahip_kimlik_indeksi: idx,
    }
  })
}

function bankaMenkulSatirDolu(row: BankaMenkulFormSatir): boolean {
  return Boolean(
    row.nitelik
    || row.cins
    || row.miktar_raw.trim()
    || row.kur_raw.trim(),
  )
}

function normalizeAltinCinsi(v: unknown): AltinMucevherFormSatir['cinsi'] {
  const s = String(v ?? '').trim()
  if (s === 'Altın' || s === 'Mücevher' || s === 'Diğer') return s
  return ''
}

const ALTIN_TURU_SET = new Set<string>([
  'Gram',
  'Çeyrek',
  'Yarım',
  'Tam',
  'Reşat',
  'Cumhuriyet',
  'Bilezik',
  'Tektaş',
  'Diğer',
])

function normalizeAltinTuru(v: unknown): AltinMucevherFormSatir['turu'] {
  const s = String(v ?? '').trim()
  if (ALTIN_TURU_SET.has(s)) return s as AltinMucevherFormSatir['turu']
  return ''
}

function altinMucevherJsonToSatirlar(raw: unknown, kimlikLen: number): AltinMucevherFormSatir[] {
  const arr = Array.isArray(raw) ? raw : []
  const maxI = kimlikLen <= 0 ? 0 : kimlikLen - 1
  return arr.map((item: Record<string, unknown>) => {
    let idx = Number(item.sahip_kimlik_indeksi ?? item.sahipKimlikIndeksi)
    if (!Number.isFinite(idx) || idx < 0) idx = KIMLIK_SECILMEDI
    else idx = Math.min(idx, maxI)
    const m = item.miktar
    const k = item.guncel_kur ?? item.guncelKur
    const mNum = typeof m === 'number' && Number.isFinite(m)
      ? m
      : parseTrMoneyDisplay(String(m ?? ''))
    const kNum = typeof k === 'number' && Number.isFinite(k)
      ? k
      : parseTrMoneyDisplay(String(k ?? ''))
    return {
      cinsi: normalizeAltinCinsi(item.cinsi ?? item.cins),
      turu: normalizeAltinTuru(item.turu ?? item.tur),
      miktar_raw: mNum > 0 ? formatTrMoneyDisplay(mNum) : '',
      kur_raw: kNum > 0 ? formatTrMoneyDisplay(kNum) : '',
      sahip_kimlik_indeksi: idx,
    }
  })
}

function altinMucevherSatirDolu(row: AltinMucevherFormSatir): boolean {
  return Boolean(
    row.cinsi
    || row.turu
    || row.miktar_raw.trim()
    || row.kur_raw.trim(),
  )
}

function normalizeBorcBirim(v: unknown): BorcAlacakFormSatir['birimi'] {
  const s = String(v ?? '').trim()
  if (s === 'Türk Lirası' || s === 'Dolar' || s === 'Euro' || s === 'Diğer') return s
  return ''
}

function borcAlacakJsonToSatirlar(raw: unknown): BorcAlacakFormSatir[] {
  const arr = Array.isArray(raw) ? raw : []
  return arr.map((item: Record<string, unknown>) => {
    const m = item.miktar
    const k = item.guncel_kur ?? item.guncelKur
    const mNum = typeof m === 'number' && Number.isFinite(m)
      ? m
      : parseTrMoneyDisplay(String(m ?? ''))
    const kNum = typeof k === 'number' && Number.isFinite(k)
      ? k
      : parseTrMoneyDisplay(String(k ?? ''))
    return {
      borclu_adi: String(item.borclu ?? item.borclu_adi_soyad ?? ''),
      alacakli_adi: String(item.alacakli ?? item.alacakli_adi_soyad ?? ''),
      birimi: normalizeBorcBirim(item.birimi ?? item.birim),
      miktar_raw: mNum > 0 ? formatTrMoneyDisplay(mNum) : '',
      kur_raw: kNum > 0 ? formatTrMoneyDisplay(kNum) : '',
    }
  })
}

function borcAlacakSatirDolu(row: BorcAlacakFormSatir): boolean {
  return Boolean(
    row.borclu_adi.trim()
    || row.alacakli_adi.trim()
    || row.birimi
    || row.miktar_raw.trim()
    || row.kur_raw.trim(),
  )
}

function haklarJsonToSatirlar(raw: unknown, kimlikLen: number): HaklarFormSatir[] {
  const arr = Array.isArray(raw) ? raw : []
  const maxI = kimlikLen <= 0 ? 0 : kimlikLen - 1
  return arr.map((item: Record<string, unknown>) => {
    let idx = Number(item.sahip_kimlik_indeksi ?? item.sahipKimlikIndeksi)
    if (!Number.isFinite(idx) || idx < 0) idx = KIMLIK_SECILMEDI
    else idx = Math.min(idx, maxI)
    return {
      unsur: String(item.unsur ?? item.tanim ?? item.tur ?? ''),
      edinme_sekli: String(item.edinme_sekli ?? item.edinmeSekli ?? item.edinme ?? ''),
      sahip_kimlik_indeksi: idx,
    }
  })
}

function haklarSatirDolu(row: HaklarFormSatir): boolean {
  return Boolean(row.unsur.trim() || row.edinme_sekli.trim())
}

export default function MalBildirimFormClient(props: MalBildirimFormClientProps) {
  const router = useRouter()
  const isCreate = props.mode === 'create'
  const memurlar = isCreate ? props.memurlar : []

  const [sicil, setSicil] = useState(() => (isCreate ? '' : props.initial.sicil_no))
  const [maasRaw, setMaasRaw] = useState('')
  const [kimlikSatirlari, setKimlikSatirlari] = useState<KimlikFormSatir[]>([])
  const [tasinmazSatirlari, setTasinmazSatirlari] = useState<TasinmazFormSatir[]>([])
  const [kooperatifSatirlari, setKooperatifSatirlari] = useState<KooperatifFormSatir[]>([])
  const [tasitSatirlari, setTasitSatirlari] = useState<TasitFormSatir[]>([])
  const [digerTasinirSatirlari, setDigerTasinirSatirlari] = useState<DigerTasinirFormSatir[]>([])
  const [bankaMenkulSatirlari, setBankaMenkulSatirlari] = useState<BankaMenkulFormSatir[]>([])
  const [altinMucevherSatirlari, setAltinMucevherSatirlari] = useState<AltinMucevherFormSatir[]>([])
  const [borcAlacakSatirlari, setBorcAlacakSatirlari] = useState<BorcAlacakFormSatir[]>([])
  const [haklarSatirlari, setHaklarSatirlari] = useState<HaklarFormSatir[]>([])
  const [aciklama, setAciklama] = useState('')
  const [beyanTuru, setBeyanTuru] = useState('')
  const [onayTarihi, setOnayTarihi] = useState('')
  const [acikKimlik, setAcikKimlik] = useState(true)
  const [acikTasinmaz, setAcikTasinmaz] = useState(false)
  const [acikKoop, setAcikKoop] = useState(false)
  const [acikTasinir, setAcikTasinir] = useState(false)
  const [acikBankaMenkul, setAcikBankaMenkul] = useState(false)
  const [acikAltinMucevher, setAcikAltinMucevher] = useState(false)
  const [acikBorcAlacak, setAcikBorcAlacak] = useState(false)
  const [acikHaklar, setAcikHaklar] = useState(false)
  const [acikAciklama, setAcikAciklama] = useState(false)
  const [acikOnay, setAcikOnay] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()


  const duzenleKayitId = !isCreate ? props.initial.id : 0

  /* Düzenleme: sunucu verisinden formu doldur (id değişince yeniden) */
  useEffect(() => {
    if (isCreate) return
    const init = props.initial
    const n = init.son_net_maas
    setMaasRaw(n != null && Number.isFinite(Number(n)) ? formatTrMoneyDisplay(Number(n)) : '')
    setAciklama(init.aciklama ?? '')
    setBeyanTuru(init.beyan_turu ?? '')
    setOnayTarihi(tarihInputDegeri(init.onay_tarihi))
    const kRows = kimlikJsonToSatirlar(init.kimlik_json, {
      ad_soyad: init.ad_soyad ?? init.sicil_no,
      dogum_tarihi: init.dogum_tarihi,
      dogum_yeri: init.dogum_yeri,
      tckn: init.tckn,
    })
    setKimlikSatirlari(kRows)
    setTasinmazSatirlari(tasinmazJsonToSatirlar(init.tasinmaz_json, kRows.length))
    setKooperatifSatirlari(kooperatifJsonToSatirlar(init.kooperatif_json, kRows.length))
    setTasitSatirlari(tasitJsonToSatirlar(init.tasitlar_json, kRows.length))
    setDigerTasinirSatirlari(digerTasinirJsonToSatirlar(init.diger_tasinirlar_json, kRows.length))
    setBankaMenkulSatirlari(bankaMenkulJsonToSatirlar(init.banka_menkul_json, kRows.length))
    setAltinMucevherSatirlari(altinMucevherJsonToSatirlar(init.altin_mucevher_json, kRows.length))
    setBorcAlacakSatirlari(borcAlacakJsonToSatirlar(init.borc_alacak_json))
    setHaklarSatirlari(haklarJsonToSatirlar(init.haklar_json, kRows.length))
  }, [isCreate, duzenleKayitId])

  const ogeler: PersonelAramaOge[] = useMemo(
    () =>
      memurlar.map(m => ({
        sicil_no: m.sicil_no,
        ad_soyad: m.ad_soyad,
        alt: m.gorev_unvani || undefined,
      })),
    [memurlar],
  )

  const seciliCreate = useMemo(() => memurlar.find(m => m.sicil_no === sicil) ?? null, [memurlar, sicil])

  const seciliEdit = !isCreate
    ? {
        gorev_unvani: props.initial.gorev_unvani,
        sicil_no: props.initial.sicil_no,
        tckn: props.initial.tckn,
        ad_soyad: props.initial.ad_soyad,
      }
    : null

  const seciliOzet = isCreate ? seciliCreate : seciliEdit

  useEffect(() => {
    if (!isCreate) return
    if (!sicil) {
      setKimlikSatirlari([])
      return
    }
    const s = memurlar.find(m => m.sicil_no === sicil)
    if (!s) {
      setKimlikSatirlari([])
      return
    }
    const d = tarihInputDegeri(s.dogum_tarihi)
    setKimlikSatirlari([{
      ad_soyad: s.ad_soyad,
      dogum_tarihi: d,
      dogum_yeri: s.dogum_yeri ?? '',
      yakinlik: 'Kendisi',
      tckn: s.tckn ?? '',
    }])
  }, [isCreate, sicil, memurlar])

  /* Taşınmaz / kooperatif: kimlik indekslerini satır sayısına göre sınırla; «Seçiniz» (-1) korunur */
  useEffect(() => {
    const n = kimlikSatirlari.length
    if (n === 0) return
    setTasinmazSatirlari(prev =>
      prev.map(row => ({
        ...row,
        malik_kimlik_indeksi:
          row.malik_kimlik_indeksi < 0
            ? KIMLIK_SECILMEDI
            : Math.max(0, Math.min(row.malik_kimlik_indeksi, n - 1)),
      })),
    )
    setKooperatifSatirlari(prev =>
      prev.map(row => ({
        ...row,
        hissedar_kimlik_indeksi:
          row.hissedar_kimlik_indeksi < 0
            ? KIMLIK_SECILMEDI
            : Math.max(0, Math.min(row.hissedar_kimlik_indeksi, n - 1)),
      })),
    )
    setTasitSatirlari(prev =>
      prev.map(row => ({
        ...row,
        sahip_kimlik_indeksi:
          row.sahip_kimlik_indeksi < 0
            ? KIMLIK_SECILMEDI
            : Math.max(0, Math.min(row.sahip_kimlik_indeksi, n - 1)),
      })),
    )
    setDigerTasinirSatirlari(prev =>
      prev.map(row => ({
        ...row,
        sahip_kimlik_indeksi:
          row.sahip_kimlik_indeksi < 0
            ? KIMLIK_SECILMEDI
            : Math.max(0, Math.min(row.sahip_kimlik_indeksi, n - 1)),
      })),
    )
    setBankaMenkulSatirlari(prev =>
      prev.map(row => ({
        ...row,
        sahip_kimlik_indeksi:
          row.sahip_kimlik_indeksi < 0
            ? KIMLIK_SECILMEDI
            : Math.max(0, Math.min(row.sahip_kimlik_indeksi, n - 1)),
      })),
    )
    setAltinMucevherSatirlari(prev =>
      prev.map(row => ({
        ...row,
        sahip_kimlik_indeksi:
          row.sahip_kimlik_indeksi < 0
            ? KIMLIK_SECILMEDI
            : Math.max(0, Math.min(row.sahip_kimlik_indeksi, n - 1)),
      })),
    )
    setHaklarSatirlari(prev =>
      prev.map(row => ({
        ...row,
        sahip_kimlik_indeksi:
          row.sahip_kimlik_indeksi < 0
            ? KIMLIK_SECILMEDI
            : Math.max(0, Math.min(row.sahip_kimlik_indeksi, n - 1)),
      })),
    )
  }, [kimlikSatirlari.length])

  const maasSayi = useMemo(() => parseTrMoneyDisplay(maasRaw), [maasRaw])
  const maasX5Goster = maasSayi > 0 ? formatTrMoneyDisplay(maasSayi * 5) : '—'

  function maasInputChange(v: string) {
    setMaasRaw(sanitizeTrMoneyTyping(v))
  }

  function kimlikGuncelle(i: number, alan: keyof KimlikFormSatir, val: string) {
    if (i === 0) return
    setKimlikSatirlari(prev => prev.map((row, idx) => {
      if (idx !== i) return row
      return { ...row, [alan]: val }
    }))
  }

  function kisiEkle() {
    setKimlikSatirlari(prev => [...prev, { ...bosKimlikSatir(), yakinlik: '' }])
  }

  function kisiSil(i: number) {
    if (i === 0) return
    setKimlikSatirlari(prev => prev.filter((_, idx) => idx !== i))
  }

  function kimlikJsonPayload(): Record<string, string>[] {
    return kimlikSatirlari.map(row => ({
      ad_soyad: row.ad_soyad.trim(),
      dogum_tarihi: row.dogum_tarihi.trim(),
      dogum_yeri: row.dogum_yeri.trim(),
      yakinlik: row.yakinlik.trim(),
      tckn: row.tckn.replace(/\D/g, '').slice(0, 11),
    }))
  }

  function tasinmazGuncelle(i: number, alan: keyof TasinmazFormSatir, val: string | number) {
    setTasinmazSatirlari(prev => prev.map((row, idx) => {
      if (idx !== i) return row
      return { ...row, [alan]: val }
    }))
  }

  function tasinmazEkle() {
    setTasinmazSatirlari(prev => [...prev, bosTasinmazSatir()])
  }

  function tasinmazSil(i: number) {
    setTasinmazSatirlari(prev => prev.filter((_, idx) => idx !== i))
  }

  function tasinmazJsonPayload(): Record<string, string | number>[] {
    return tasinmazSatirlari
      .filter(tasinmazSatirDolu)
      .map(row => ({
        tasinmaz_cinsi: row.tasinmaz_cinsi,
        adres: row.adres.trim(),
        hisse_miktari: row.hisse_miktari.trim(),
        degeri: row.degeri.trim(),
        edinme_tarihi: row.edinme_tarihi.trim(),
        malik_kimlik_indeksi: row.malik_kimlik_indeksi,
      }))
  }

  function kooperatifGuncelle(i: number, alan: keyof KooperatifFormSatir, val: string | number) {
    setKooperatifSatirlari(prev => prev.map((row, idx) => {
      if (idx !== i) return row
      return { ...row, [alan]: val }
    }))
  }

  function kooperatifEkle() {
    setKooperatifSatirlari(prev => [...prev, bosKooperatifSatir()])
  }

  function kooperatifSil(i: number) {
    setKooperatifSatirlari(prev => prev.filter((_, idx) => idx !== i))
  }

  function kooperatifJsonPayload(): Record<string, string | number>[] {
    return kooperatifSatirlari
      .filter(kooperatifSatirDolu)
      .map(row => ({
        adi_yeri: row.adi_yeri.trim(),
        hisse_degeri: row.hisse_degeri.trim(),
        uyelik_tarihi: row.uyelik_tarihi.trim(),
        hissedar_kimlik_indeksi: row.hissedar_kimlik_indeksi,
      }))
  }

  function tasitGuncelle(i: number, alan: keyof TasitFormSatir, val: string | number) {
    setTasitSatirlari(prev => prev.map((row, idx) => {
      if (idx !== i) return row
      return { ...row, [alan]: val }
    }))
  }

  function tasitEkle() {
    setTasitSatirlari(prev => [...prev, bosTasitSatir()])
  }

  function tasitSil(i: number) {
    setTasitSatirlari(prev => prev.filter((_, idx) => idx !== i))
  }

  function tasitJsonPayload(): Record<string, string | number>[] {
    return tasitSatirlari
      .filter(tasitSatirDolu)
      .map(row => ({
        tasit_cinsi: row.tasit_cinsi,
        plaka_no: row.plaka_no.trim(),
        marka_model: row.marka_model.trim(),
        model_yili: row.model_yili.trim(),
        edinme_degeri: parseTrMoneyDisplay(row.edinme_degeri_raw),
        edinme_tarihi: row.edinme_tarihi.trim(),
        sahip_kimlik_indeksi: row.sahip_kimlik_indeksi,
      }))
  }

  function digerTasinirGuncelle(i: number, alan: keyof DigerTasinirFormSatir, val: string | number) {
    setDigerTasinirSatirlari(prev => prev.map((row, idx) => {
      if (idx !== i) return row
      return { ...row, [alan]: val }
    }))
  }

  function digerTasinirEkle() {
    setDigerTasinirSatirlari(prev => [...prev, bosDigerTasinirSatir()])
  }

  function digerTasinirSil(i: number) {
    setDigerTasinirSatirlari(prev => prev.filter((_, idx) => idx !== i))
  }

  function digerTasinirJsonPayload(): Record<string, string | number>[] {
    return digerTasinirSatirlari
      .filter(digerTasinirSatirDolu)
      .map(row => ({
        tasinir_cinsi: row.tasinir_cinsi,
        model_yili: row.model_yili.trim(),
        edinme_degeri: parseTrMoneyDisplay(row.edinme_degeri_raw),
        edinme_tarihi: row.edinme_tarihi.trim(),
        sahip_kimlik_indeksi: row.sahip_kimlik_indeksi,
      }))
  }

  function bankaMenkulGuncelle(i: number, alan: keyof BankaMenkulFormSatir, val: string | number) {
    setBankaMenkulSatirlari(prev => prev.map((row, idx) => {
      if (idx !== i) return row
      return { ...row, [alan]: val }
    }))
  }

  function bankaMenkulEkle() {
    setBankaMenkulSatirlari(prev => [...prev, bosBankaMenkulSatir()])
  }

  function bankaMenkulSil(i: number) {
    setBankaMenkulSatirlari(prev => prev.filter((_, idx) => idx !== i))
  }

  function bankaMenkulJsonPayload(): Record<string, string | number>[] {
    return bankaMenkulSatirlari
      .filter(bankaMenkulSatirDolu)
      .map(row => ({
        nitelik: row.nitelik,
        cins: row.cins,
        miktar: parseTrMoneyDisplay(row.miktar_raw),
        guncel_kur: parseTrMoneyDisplay(row.kur_raw),
        sahip_kimlik_indeksi: row.sahip_kimlik_indeksi,
      }))
  }

  function altinMucevherGuncelle(i: number, alan: keyof AltinMucevherFormSatir, val: string | number) {
    setAltinMucevherSatirlari(prev => prev.map((row, idx) => {
      if (idx !== i) return row
      return { ...row, [alan]: val }
    }))
  }

  function altinMucevherEkle() {
    setAltinMucevherSatirlari(prev => [...prev, bosAltinMucevherSatir()])
  }

  function altinMucevherSil(i: number) {
    setAltinMucevherSatirlari(prev => prev.filter((_, idx) => idx !== i))
  }

  function altinMucevherJsonPayload(): Record<string, string | number>[] {
    return altinMucevherSatirlari
      .filter(altinMucevherSatirDolu)
      .map(row => ({
        cinsi: row.cinsi,
        turu: row.turu,
        miktar: parseTrMoneyDisplay(row.miktar_raw),
        guncel_kur: parseTrMoneyDisplay(row.kur_raw),
        sahip_kimlik_indeksi: row.sahip_kimlik_indeksi,
      }))
  }

  function borcAlacakGuncelle(i: number, alan: keyof BorcAlacakFormSatir, val: string) {
    setBorcAlacakSatirlari(prev => prev.map((row, idx) => {
      if (idx !== i) return row
      return { ...row, [alan]: val }
    }))
  }

  function borcAlacakEkle() {
    setBorcAlacakSatirlari(prev => [...prev, bosBorcAlacakSatir()])
  }

  function borcAlacakSil(i: number) {
    setBorcAlacakSatirlari(prev => prev.filter((_, idx) => idx !== i))
  }

  function borcAlacakJsonPayload(): Record<string, string | number>[] {
    return borcAlacakSatirlari
      .filter(borcAlacakSatirDolu)
      .map(row => ({
        borclu: row.borclu_adi.trim(),
        alacakli: row.alacakli_adi.trim(),
        birimi: row.birimi,
        miktar: parseTrMoneyDisplay(row.miktar_raw),
        guncel_kur: parseTrMoneyDisplay(row.kur_raw),
      }))
  }

  function haklarGuncelle(i: number, alan: keyof HaklarFormSatir, val: string | number) {
    setHaklarSatirlari(prev => prev.map((row, idx) => {
      if (idx !== i) return row
      return { ...row, [alan]: val }
    }))
  }

  function haklarEkle() {
    setHaklarSatirlari(prev => [...prev, bosHaklarSatir()])
  }

  function haklarSil(i: number) {
    setHaklarSatirlari(prev => prev.filter((_, idx) => idx !== i))
  }

  function haklarJsonPayload(): Record<string, string | number>[] {
    return haklarSatirlari
      .filter(haklarSatirDolu)
      .map(row => ({
        unsur: row.unsur.trim(),
        edinme_sekli: row.edinme_sekli.trim(),
        sahip_kimlik_indeksi: row.sahip_kimlik_indeksi,
      }))
  }

  function afterSuccessCreate() {
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.location.href = '/bildirim/mal'
      }
    } catch { /* ignore */ }
    window.close()
    setTimeout(() => {
      if (document.visibilityState === 'visible') window.location.href = '/bildirim/mal'
    }, 200)
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)

    if (isCreate && !sicil) {
      setHata('Personel seçiniz.')
      return
    }
    if (!Number.isFinite(maasSayi) || maasSayi <= 0) {
      setHata('Net maaş için geçerli bir tutar giriniz.')
      return
    }
    if (!beyanTuru) {
      setHata('Onay bölümünde beyan türü seçiniz.')
      setAcikOnay(true)
      return
    }
    if (!onayTarihi) {
      setHata('Onay bölümünde tarih seçiniz.')
      setAcikOnay(true)
      return
    }

    const payload = kimlikJsonPayload()
    if (payload.length === 0 || !payload[0].ad_soyad) {
      setHata('Kimlik: bildiren kişi bilgisi eksik.')
      setAcikKimlik(true)
      return
    }
    for (let i = 1; i < payload.length; i++) {
      if (!payload[i].ad_soyad || !payload[i].yakinlik) {
        setHata(`Kimlik satırı ${i + 1}: ad soyad ve yakınlık zorunludur.`)
        setAcikKimlik(true)
        return
      }
    }

    const tasinmPayload = tasinmazJsonPayload()
    for (let i = 0; i < tasinmazSatirlari.length; i++) {
      const row = tasinmazSatirlari[i]
      if (!tasinmazSatirDolu(row)) continue
      if (!row.tasinmaz_cinsi) {
        setHata(`Taşınmaz satırı ${i + 1}: taşınmaz cinsi seçiniz.`)
        setAcikTasinmaz(true)
        return
      }
      if (!row.adres.trim()) {
        setHata(`Taşınmaz satırı ${i + 1}: adres zorunludur.`)
        setAcikTasinmaz(true)
        return
      }
      if (!row.hisse_miktari.trim()) {
        setHata(`Taşınmaz satırı ${i + 1}: hisse miktarı zorunludur.`)
        setAcikTasinmaz(true)
        return
      }
      if (!row.degeri.trim()) {
        setHata(`Taşınmaz satırı ${i + 1}: değer zorunludur.`)
        setAcikTasinmaz(true)
        return
      }
      if (!row.edinme_tarihi.trim()) {
        setHata(`Taşınmaz satırı ${i + 1}: edinme tarihi zorunludur.`)
        setAcikTasinmaz(true)
        return
      }
      if (kimlikSatirlari.length === 0 || row.malik_kimlik_indeksi < 0 || row.malik_kimlik_indeksi >= kimlikSatirlari.length) {
        setHata(`Taşınmaz satırı ${i + 1}: malik (yakınlık) seçimi geçersiz.`)
        setAcikTasinmaz(true)
        return
      }
      const mk = kimlikSatirlari[row.malik_kimlik_indeksi]
      if (!String(mk?.tckn ?? '').replace(/\D/g, '').slice(0, 11)) {
        setHata(`Taşınmaz satırı ${i + 1}: seçilen malik için ilgili kimlik satırında TCKN girilmelidir (Excel’e yazılır).`)
        setAcikTasinmaz(true)
        setAcikKimlik(true)
        return
      }
    }

    const koopPayload = kooperatifJsonPayload()
    for (let i = 0; i < kooperatifSatirlari.length; i++) {
      const row = kooperatifSatirlari[i]
      if (!kooperatifSatirDolu(row)) continue
      if (!row.adi_yeri.trim()) {
        setHata(`Kooperatif satırı ${i + 1}: kooperatifin adı ve yeri zorunludur.`)
        setAcikKoop(true)
        return
      }
      if (!row.hisse_degeri.trim()) {
        setHata(`Kooperatif satırı ${i + 1}: hisse değeri zorunludur.`)
        setAcikKoop(true)
        return
      }
      if (!row.uyelik_tarihi.trim()) {
        setHata(`Kooperatif satırı ${i + 1}: üyelik tarihi zorunludur.`)
        setAcikKoop(true)
        return
      }
      if (kimlikSatirlari.length === 0 || row.hissedar_kimlik_indeksi < 0 || row.hissedar_kimlik_indeksi >= kimlikSatirlari.length) {
        setHata(`Kooperatif satırı ${i + 1}: hissedar (yakınlık) seçimi geçersiz.`)
        setAcikKoop(true)
        return
      }
      const hk = kimlikSatirlari[row.hissedar_kimlik_indeksi]
      if (!String(hk?.tckn ?? '').replace(/\D/g, '').slice(0, 11)) {
        setHata(`Kooperatif satırı ${i + 1}: seçilen hissedar için kimlik satırında TCKN girilmelidir (Excel’e yazılır).`)
        setAcikKoop(true)
        setAcikKimlik(true)
        return
      }
    }

    const tasitPayload = tasitJsonPayload()
    for (let i = 0; i < tasitSatirlari.length; i++) {
      const row = tasitSatirlari[i]
      if (!tasitSatirDolu(row)) continue
      if (!row.tasit_cinsi) {
        setHata(`Taşıt satırı ${i + 1}: taşıt cinsi seçiniz.`)
        setAcikTasinir(true)
        return
      }
      if (!row.plaka_no.trim()) {
        setHata(`Taşıt satırı ${i + 1}: plaka no zorunludur.`)
        setAcikTasinir(true)
        return
      }
      if (!row.marka_model.trim()) {
        setHata(`Taşıt satırı ${i + 1}: marka/model zorunludur.`)
        setAcikTasinir(true)
        return
      }
      if (!row.model_yili.trim()) {
        setHata(`Taşıt satırı ${i + 1}: model yılı zorunludur.`)
        setAcikTasinir(true)
        return
      }
      const edT = parseTrMoneyDisplay(row.edinme_degeri_raw)
      if (!Number.isFinite(edT) || edT <= 0) {
        setHata(`Taşıt satırı ${i + 1}: geçerli edinme değeri giriniz (örn. 12.456,78).`)
        setAcikTasinir(true)
        return
      }
      if (!row.edinme_tarihi.trim()) {
        setHata(`Taşıt satırı ${i + 1}: edinme tarihi zorunludur.`)
        setAcikTasinir(true)
        return
      }
      if (kimlikSatirlari.length === 0 || row.sahip_kimlik_indeksi < 0 || row.sahip_kimlik_indeksi >= kimlikSatirlari.length) {
        setHata(`Taşıt satırı ${i + 1}: sahip seçimi geçersiz.`)
        setAcikTasinir(true)
        return
      }
      const sk = kimlikSatirlari[row.sahip_kimlik_indeksi]
      if (!String(sk?.tckn ?? '').replace(/\D/g, '').slice(0, 11)) {
        setHata(`Taşıt satırı ${i + 1}: seçilen sahip için kimlik satırında TCKN girilmelidir.`)
        setAcikTasinir(true)
        setAcikKimlik(true)
        return
      }
    }

    const digerPayload = digerTasinirJsonPayload()
    for (let i = 0; i < digerTasinirSatirlari.length; i++) {
      const row = digerTasinirSatirlari[i]
      if (!digerTasinirSatirDolu(row)) continue
      if (!row.tasinir_cinsi) {
        setHata(`Diğer taşınır satırı ${i + 1}: taşınır cinsi seçiniz.`)
        setAcikTasinir(true)
        return
      }
      if (!row.model_yili.trim()) {
        setHata(`Diğer taşınır satırı ${i + 1}: model yılı zorunludur.`)
        setAcikTasinir(true)
        return
      }
      const edD = parseTrMoneyDisplay(row.edinme_degeri_raw)
      if (!Number.isFinite(edD) || edD <= 0) {
        setHata(`Diğer taşınır satırı ${i + 1}: geçerli edinme değeri giriniz (örn. 12.456,78).`)
        setAcikTasinir(true)
        return
      }
      if (!row.edinme_tarihi.trim()) {
        setHata(`Diğer taşınır satırı ${i + 1}: edinme tarihi zorunludur.`)
        setAcikTasinir(true)
        return
      }
      if (kimlikSatirlari.length === 0 || row.sahip_kimlik_indeksi < 0 || row.sahip_kimlik_indeksi >= kimlikSatirlari.length) {
        setHata(`Diğer taşınır satırı ${i + 1}: sahip seçimi geçersiz.`)
        setAcikTasinir(true)
        return
      }
      const dk = kimlikSatirlari[row.sahip_kimlik_indeksi]
      if (!String(dk?.tckn ?? '').replace(/\D/g, '').slice(0, 11)) {
        setHata(`Diğer taşınır satırı ${i + 1}: seçilen sahip için kimlik satırında TCKN girilmelidir.`)
        setAcikTasinir(true)
        setAcikKimlik(true)
        return
      }
    }

    const bankaPayload = bankaMenkulJsonPayload()
    for (let i = 0; i < bankaMenkulSatirlari.length; i++) {
      const row = bankaMenkulSatirlari[i]
      if (!bankaMenkulSatirDolu(row)) continue
      if (!row.nitelik) {
        setHata(`Banka / menkul satırı ${i + 1}: nitelik seçiniz.`)
        setAcikBankaMenkul(true)
        return
      }
      if (!row.cins) {
        setHata(`Banka / menkul satırı ${i + 1}: cinsi seçiniz.`)
        setAcikBankaMenkul(true)
        return
      }
      const mik = parseTrMoneyDisplay(row.miktar_raw)
      const kur = parseTrMoneyDisplay(row.kur_raw)
      if (!Number.isFinite(mik) || mik <= 0) {
        setHata(`Banka / menkul satırı ${i + 1}: geçerli miktar giriniz (örn. 12.456,79).`)
        setAcikBankaMenkul(true)
        return
      }
      if (!Number.isFinite(kur) || kur <= 0) {
        setHata(`Banka / menkul satırı ${i + 1}: geçerli güncel kur giriniz (örn. 1,00 veya 34,56).`)
        setAcikBankaMenkul(true)
        return
      }
      if (kimlikSatirlari.length === 0 || row.sahip_kimlik_indeksi < 0 || row.sahip_kimlik_indeksi >= kimlikSatirlari.length) {
        setHata(`Banka / menkul satırı ${i + 1}: sahip seçimi geçersiz.`)
        setAcikBankaMenkul(true)
        return
      }
      const bk = kimlikSatirlari[row.sahip_kimlik_indeksi]
      if (!String(bk?.tckn ?? '').replace(/\D/g, '').slice(0, 11)) {
        setHata(`Banka / menkul satırı ${i + 1}: seçilen sahip için kimlik satırında TCKN girilmelidir.`)
        setAcikBankaMenkul(true)
        setAcikKimlik(true)
        return
      }
    }

    const altinPayload = altinMucevherJsonPayload()
    for (let i = 0; i < altinMucevherSatirlari.length; i++) {
      const row = altinMucevherSatirlari[i]
      if (!altinMucevherSatirDolu(row)) continue
      if (!row.cinsi) {
        setHata(`Altın / mücevher satırı ${i + 1}: cinsi seçiniz.`)
        setAcikAltinMucevher(true)
        return
      }
      if (!row.turu) {
        setHata(`Altın / mücevher satırı ${i + 1}: türü seçiniz.`)
        setAcikAltinMucevher(true)
        return
      }
      const am = parseTrMoneyDisplay(row.miktar_raw)
      const ak = parseTrMoneyDisplay(row.kur_raw)
      if (!Number.isFinite(am) || am <= 0) {
        setHata(`Altın / mücevher satırı ${i + 1}: geçerli miktar giriniz (örn. 12.456,79).`)
        setAcikAltinMucevher(true)
        return
      }
      if (!Number.isFinite(ak) || ak <= 0) {
        setHata(`Altın / mücevher satırı ${i + 1}: geçerli güncel kur giriniz (örn. 1.234,56).`)
        setAcikAltinMucevher(true)
        return
      }
      if (kimlikSatirlari.length === 0 || row.sahip_kimlik_indeksi < 0 || row.sahip_kimlik_indeksi >= kimlikSatirlari.length) {
        setHata(`Altın / mücevher satırı ${i + 1}: sahip seçimi geçersiz.`)
        setAcikAltinMucevher(true)
        return
      }
      const akRow = kimlikSatirlari[row.sahip_kimlik_indeksi]
      if (!String(akRow?.tckn ?? '').replace(/\D/g, '').slice(0, 11)) {
        setHata(`Altın / mücevher satırı ${i + 1}: seçilen sahip için kimlik satırında TCKN girilmelidir.`)
        setAcikAltinMucevher(true)
        setAcikKimlik(true)
        return
      }
    }

    const borcPayload = borcAlacakJsonPayload()
    for (let i = 0; i < borcAlacakSatirlari.length; i++) {
      const row = borcAlacakSatirlari[i]
      if (!borcAlacakSatirDolu(row)) continue
      if (!row.borclu_adi.trim()) {
        setHata(`Borç / alacak satırı ${i + 1}: borçlunun adı soyadı giriniz.`)
        setAcikBorcAlacak(true)
        return
      }
      if (!row.alacakli_adi.trim()) {
        setHata(`Borç / alacak satırı ${i + 1}: alacaklının adı soyadı giriniz.`)
        setAcikBorcAlacak(true)
        return
      }
      if (!row.birimi) {
        setHata(`Borç / alacak satırı ${i + 1}: birimi seçiniz.`)
        setAcikBorcAlacak(true)
        return
      }
      const bm = parseTrMoneyDisplay(row.miktar_raw)
      const bk = parseTrMoneyDisplay(row.kur_raw)
      if (!Number.isFinite(bm) || bm <= 0) {
        setHata(`Borç / alacak satırı ${i + 1}: geçerli miktar giriniz (örn. 12.456,79).`)
        setAcikBorcAlacak(true)
        return
      }
      if (!Number.isFinite(bk) || bk <= 0) {
        setHata(`Borç / alacak satırı ${i + 1}: geçerli güncel kur giriniz (örn. 1.234,56).`)
        setAcikBorcAlacak(true)
        return
      }
    }

    const haklarPayload = haklarJsonPayload()
    for (let i = 0; i < haklarSatirlari.length; i++) {
      const row = haklarSatirlari[i]
      if (!haklarSatirDolu(row)) continue
      if (!row.unsur.trim()) {
        setHata(`Haklar / diğer unsurlar satırı ${i + 1}: hak veya beyanı gerekli görülen diğer servet unsurlarını giriniz.`)
        setAcikHaklar(true)
        return
      }
      if (!row.edinme_sekli.trim()) {
        setHata(`Haklar / diğer unsurlar satırı ${i + 1}: edinme şeklini giriniz.`)
        setAcikHaklar(true)
        return
      }
      if (kimlikSatirlari.length === 0 || row.sahip_kimlik_indeksi < 0 || row.sahip_kimlik_indeksi >= kimlikSatirlari.length) {
        setHata(`Haklar / diğer unsurlar satırı ${i + 1}: sahip (kimlik) seçimi geçersiz.`)
        setAcikHaklar(true)
        return
      }
      const hk = kimlikSatirlari[row.sahip_kimlik_indeksi]
      if (!String(hk?.tckn ?? '').replace(/\D/g, '').slice(0, 11)) {
        setHata(`Haklar / diğer unsurlar satırı ${i + 1}: seçilen sahip için kimlik satırında TCKN girilmelidir (Excel U sütunu).`)
        setAcikHaklar(true)
        setAcikKimlik(true)
        return
      }
    }

    const fd = new FormData()
    if (isCreate) fd.set('sicil_no', sicil)
    fd.set('son_net_maas', String(maasSayi))
    fd.set('kimlik_json', JSON.stringify(payload))
    fd.set('tasinmaz_json', JSON.stringify(tasinmPayload))
    fd.set('kooperatif_json', JSON.stringify(koopPayload))
    fd.set('tasitlar_json', JSON.stringify(tasitPayload))
    fd.set('diger_tasinirlar_json', JSON.stringify(digerPayload))
    fd.set('banka_menkul_json', JSON.stringify(bankaPayload))
    fd.set('altin_mucevher_json', JSON.stringify(altinPayload))
    fd.set('borc_alacak_json', JSON.stringify(borcPayload))
    fd.set('haklar_json', JSON.stringify(haklarPayload))
    fd.set('aciklama', aciklama.trim())
    fd.set('beyan_turu', beyanTuru)
    fd.set('onay_tarihi', onayTarihi)

    startTransition(async () => {
      const r = isCreate
        ? await props.onKaydet(fd)
        : await props.onGuncelle(props.initial.id, fd)
      if (r.hata) setHata(r.hata)
      else if (isCreate) afterSuccessCreate()
      else router.push(malBildirimDetayHref(props.initial))
    })
  }

  const baslik = isCreate ? 'Yeni Mal Bildirimi' : 'Mal Bildirimi - Düzenle'
  const listLink = isCreate ? '/bildirim/mal' : malBildirimDetayHref(props.initial)

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
        <Link href={listLink}
          className="text-sm text-slate-600 border border-slate-300 px-3 py-2 rounded-lg hover:bg-slate-50">
          {isCreate ? 'Listeye dön' : '← Kayda dön'}
        </Link>
      </div>

      {isCreate && (
        <p className="text-sm text-slate-500 mb-4">
          Yalnızca kadro hareketlerinde statüsü <strong>Memur</strong> ve durumu <strong>Dolu</strong> olan kadrolarda asil personel seçilebilir.
        </p>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="flex flex-col lg:flex-row gap-6 lg:items-end">
            {isCreate ? (
              <div className="flex-1 min-w-0 space-y-2">
                <label className="block text-sm font-medium text-slate-700">Personel *</label>
                <PersonelAramaSecim personeller={ogeler} value={sicil} onChange={setSicil} required />
              </div>
            ) : (
              <div className="flex-1 min-w-0 space-y-1">
                <label className="block text-sm font-medium text-slate-700">Personel</label>
                <div className="h-[42px] px-3 flex items-center border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-800">
                  {props.initial.ad_soyad ?? props.initial.sicil_no}
                  <span className="ml-2 font-mono text-xs text-slate-500">({props.initial.sicil_no})</span>
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-2 lg:max-w-sm">
              <label className="block text-sm font-medium text-slate-700">Net Maaş (₺) *</label>
              <input
                name="son_net_maas_display"
                value={maasRaw}
                onChange={e => maasInputChange(e.target.value)}
                onBlur={() => {
                  if (maasSayi > 0) setMaasRaw(formatTrMoneyDisplay(maasSayi))
                }}
                placeholder="12.456,78"
                className="w-full h-[42px] px-3 border border-slate-300 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-500"
                inputMode="decimal"
              />
              <p className="text-xs text-slate-500">
                Net Maaş × 5 (önizleme):{' '}
                <span className="font-semibold text-slate-800 tabular-nums">{maasX5Goster}</span>
              </p>
            </div>
          </div>

          {seciliOzet && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600 space-y-1">
              <p><span className="text-slate-400">Görev ünvanı (Excel G2):</span> {seciliOzet.gorev_unvani || '—'}</p>
              <p><span className="text-slate-400">Sicil (G3):</span> <span className="font-mono">{seciliOzet.sicil_no}</span></p>
              <p><span className="text-slate-400">TCKN (U3):</span> <span className="font-mono">{seciliOzet.tckn ?? '—'}</span></p>
            </div>
          )}
        </div>

        <Accordion title="Kimlik Bilgileri" acik={acikKimlik} onClick={() => setAcikKimlik(v => !v)}>
          <p className="text-xs text-slate-500 mb-3">
            İlk satır (bildiren) personel kaydından gelir; <strong>salt okunur</strong>. Ek satırlarda yakınlık seçilir; Excel’de taşınmaz maliki için yakınlık seçildiğinde ilgili kişinin <strong>TCKN</strong> yazılır.
          </p>
          <div className="flex flex-wrap justify-end mb-2">
            <button type="button" onClick={kisiEkle}
              className="text-xs font-medium text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50">
              + Kişi Ekle
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="border-b border-slate-200 p-2 text-left font-semibold w-10">Sıra</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[140px]">Adı Soyadı</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[120px]">Doğum Tarihi</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[100px]">Doğum Yeri</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[100px]">Yakınlığı</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[110px]">TC Kimlik No</th>
                  <th className="border-b border-slate-200 p-2 w-16" />
                </tr>
              </thead>
              <tbody>
                {kimlikSatirlari.map((row, i) => {
                  const kilit = i === 0
                  const inputRo = kilit
                    ? 'bg-slate-100 text-slate-800 cursor-not-allowed'
                    : 'bg-white'
                  return (
                    <tr key={i} className="align-top">
                      <td className="border-b border-slate-100 p-2 tabular-nums text-slate-500 font-medium">{i + 1}</td>
                      <td className="border-b border-slate-100 p-1">
                        <input readOnly={kilit} value={row.ad_soyad}
                          onChange={e => kimlikGuncelle(i, 'ad_soyad', e.target.value)}
                          className={`w-full px-2 py-1.5 border border-slate-200 rounded text-xs ${inputRo}`} />
                      </td>
                      <td className="border-b border-slate-100 p-1">
                        <input type="date" readOnly={kilit} value={row.dogum_tarihi}
                          onChange={e => kimlikGuncelle(i, 'dogum_tarihi', e.target.value)}
                          className={`w-full px-2 py-1.5 border border-slate-200 rounded text-xs ${inputRo}`} />
                      </td>
                      <td className="border-b border-slate-100 p-1">
                        <input readOnly={kilit} value={row.dogum_yeri}
                          onChange={e => kimlikGuncelle(i, 'dogum_yeri', e.target.value)}
                          className={`w-full px-2 py-1.5 border border-slate-200 rounded text-xs ${inputRo}`} />
                      </td>
                      <td className="border-b border-slate-100 p-1">
                        {kilit ? (
                          <input readOnly value="Kendisi"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-slate-100 cursor-not-allowed" />
                        ) : (
                          <select value={row.yakinlik}
                            onChange={e => kimlikGuncelle(i, 'yakinlik', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                            <option value="">—</option>
                            {YAKINLIK_EK.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="border-b border-slate-100 p-1">
                        <input readOnly={kilit} value={row.tckn} maxLength={11}
                          onChange={e => kimlikGuncelle(i, 'tckn', e.target.value.replace(/\D/g, '').slice(0, 11))}
                          className={`w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono ${inputRo}`} />
                      </td>
                      <td className="border-b border-slate-100 p-1 text-center">
                        {i > 0 && (
                          <button type="button" onClick={() => kisiSil(i)}
                            className="text-red-600 hover:underline whitespace-nowrap">Sil</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {kimlikSatirlari.length === 0 && isCreate && sicil && (
              <p className="text-xs text-amber-600 p-3">Personel seçimine göre kimlik satırı yükleniyor…</p>
            )}
          </div>
        </Accordion>

        <Accordion title="Taşınmaz Bilgileri" acik={acikTasinmaz} onClick={() => setAcikTasinmaz(v => !v)}>
          <p className="text-xs text-slate-500 mb-3">
            Bölüm-2 Excel: sıra <strong>A17+</strong>, taşınmaz cinsi <strong>C</strong>, adres <strong>D</strong>, hisse miktarı <strong>L</strong>, değer <strong>N</strong>, edinme tarihi <strong>R</strong>, malik TCKN <strong>U</strong>.
            Malikte yakınlık seçilir; dosyaya <strong>TCKN</strong> yazılır.
          </p>
          <div className="flex flex-wrap justify-end mb-2">
            <button type="button" onClick={tasinmazEkle} disabled={kimlikSatirlari.length === 0}
              className="text-xs font-medium text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none">
              + Taşınmaz Ekle
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="border-b border-slate-200 p-2 text-left font-semibold w-10">Sıra</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[90px]">Taşınmaz cinsi</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[200px]">Adres</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[80px]">Hisse miktarı</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[90px]">Değeri</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[110px]">Edinme tarihi</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[180px]">Malik (yakınlık — Excel’e TCKN)</th>
                  <th className="border-b border-slate-200 p-2 w-14" />
                </tr>
              </thead>
              <tbody>
                {tasinmazSatirlari.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-slate-500 text-center">
                      Kayıt yok. «Taşınmaz Ekle» ile satır ekleyin (önce kimlik satırları dolu olmalı).
                    </td>
                  </tr>
                ) : (
                  tasinmazSatirlari.map((tRow, i) => (
                    <tr key={i} className="align-top">
                      <td className="border-b border-slate-100 p-2 tabular-nums text-slate-500 font-medium">{i + 1}</td>
                      <td className="border-b border-slate-100 p-1">
                        <select value={tRow.tasinmaz_cinsi}
                          onChange={e => tasinmazGuncelle(i, 'tasinmaz_cinsi', e.target.value as TasinmazFormSatir['tasinmaz_cinsi'])}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                          <option value="">—</option>
                          {TASINMAZ_CINSLERI.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="border-b border-slate-100 p-1">
                        <input value={tRow.adres}
                          onChange={e => tasinmazGuncelle(i, 'adres', e.target.value)}
                          placeholder="Mahal, ada, parsel, no…"
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white" />
                      </td>
                      <td className="border-b border-slate-100 p-1">
                        <input value={tRow.hisse_miktari}
                          onChange={e => tasinmazGuncelle(i, 'hisse_miktari', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white" />
                      </td>
                      <td className="border-b border-slate-100 p-1">
                        <input value={tRow.degeri}
                          onChange={e => tasinmazGuncelle(i, 'degeri', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white" />
                      </td>
                      <td className="border-b border-slate-100 p-1">
                        <input type="date" value={tRow.edinme_tarihi}
                          onChange={e => tasinmazGuncelle(i, 'edinme_tarihi', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white" />
                      </td>
                      <td className="border-b border-slate-100 p-1">
                        <select value={tRow.malik_kimlik_indeksi < 0 ? '' : String(tRow.malik_kimlik_indeksi)}
                          onChange={e => {
                            const v = e.target.value
                            tasinmazGuncelle(i, 'malik_kimlik_indeksi', v === '' ? KIMLIK_SECILMEDI : parseInt(v, 10))
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                          <option value="">— Seçiniz —</option>
                          {kimlikSatirlari.map((kRow, kIdx) => (
                            <option key={kIdx} value={kIdx}>
                              {(kRow.yakinlik || '—') + ' — ' + (kRow.ad_soyad || '—')}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-b border-slate-100 p-1 text-center">
                        <button type="button" onClick={() => tasinmazSil(i)}
                          className="text-red-600 hover:underline">Sil</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Accordion>

        <Accordion title="Kooperatif Bilgileri" acik={acikKoop} onClick={() => setAcikKoop(v => !v)}>
          <p className="text-xs text-slate-500 mb-3">
            Bölüm-3 Excel: sıra <strong>A28+</strong>, ad-yer <strong>C</strong>, hisse değeri <strong>N</strong>, üyelik <strong>R</strong>, hissedar TCKN <strong>V</strong>.
            Hissedar alanında yakınlık seçilir; dosyaya <strong>TCKN</strong> yazılır.
          </p>
          <div className="flex flex-wrap justify-end mb-2">
            <button type="button" onClick={kooperatifEkle} disabled={kimlikSatirlari.length === 0}
              className="text-xs font-medium text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none">
              + Kooperatif Ekle
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs border-collapse min-w-[880px]">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="border-b border-slate-200 p-2 text-left font-semibold w-10">Sıra</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[220px]">Kooperatifin adı ve yeri</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[100px]">Hisse değeri</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[110px]">Üyelik tarihi</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[180px]">Hissedar (yakınlık — Excel’e TCKN)</th>
                  <th className="border-b border-slate-200 p-2 w-14" />
                </tr>
              </thead>
              <tbody>
                {kooperatifSatirlari.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-slate-500 text-center">
                      Kayıt yok. «Kooperatif Ekle» ile satır ekleyin.
                    </td>
                  </tr>
                ) : (
                  kooperatifSatirlari.map((kRow, i) => (
                    <tr key={i} className="align-top">
                      <td className="border-b border-slate-100 p-2 tabular-nums text-slate-500 font-medium">{i + 1}</td>
                      <td className="border-b border-slate-100 p-1">
                        <input value={kRow.adi_yeri}
                          onChange={e => kooperatifGuncelle(i, 'adi_yeri', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white" />
                      </td>
                      <td className="border-b border-slate-100 p-1">
                        <input value={kRow.hisse_degeri}
                          onChange={e => kooperatifGuncelle(i, 'hisse_degeri', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white" />
                      </td>
                      <td className="border-b border-slate-100 p-1">
                        <input type="date" value={kRow.uyelik_tarihi}
                          onChange={e => kooperatifGuncelle(i, 'uyelik_tarihi', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white" />
                      </td>
                      <td className="border-b border-slate-100 p-1">
                        <select value={kRow.hissedar_kimlik_indeksi < 0 ? '' : String(kRow.hissedar_kimlik_indeksi)}
                          onChange={e => {
                            const v = e.target.value
                            kooperatifGuncelle(i, 'hissedar_kimlik_indeksi', v === '' ? KIMLIK_SECILMEDI : parseInt(v, 10))
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                          <option value="">— Seçiniz —</option>
                          {kimlikSatirlari.map((kimRow, kIdx) => (
                            <option key={kIdx} value={kIdx}>
                              {(kimRow.yakinlik || '—') + ' — ' + (kimRow.ad_soyad || '—')}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-b border-slate-100 p-1 text-center">
                        <button type="button" onClick={() => kooperatifSil(i)}
                          className="text-red-600 hover:underline">Sil</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Accordion>

        <Accordion title="Taşınır Mal Bilgileri" acik={acikTasinir} onClick={() => setAcikTasinir(v => !v)}>
          <p className="text-xs text-slate-500 mb-4">
            Bölüm-4 Excel: taşıtlar satır <strong>34+</strong> (A sıra, C cins, D plaka, F marka-model, M model yılı, N edinme değeri, R edinme tarihi, T TCKN); diğer taşınırlar satır <strong>43+</strong> (A sıra, C cins, J model yılı, N edinme değeri, R edinme tarihi, T TCKN).
          </p>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-800">A — Taşıt Bilgileri</h3>
              <button type="button" onClick={tasitEkle} disabled={kimlikSatirlari.length === 0}
                className="text-xs font-medium text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-white disabled:opacity-40 disabled:pointer-events-none">
                + Taşıt Ekle
              </button>
            </div>
            <div className="overflow-x-auto rounded border border-slate-200 bg-white">
              <table className="w-full text-xs border-collapse min-w-[1020px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-600">
                    <th className="border-b p-2 text-left w-8">#</th>
                    <th className="border-b p-2 text-left min-w-[80px]">Taşıtın cinsi</th>
                    <th className="border-b p-2 text-left min-w-[90px]">Plaka</th>
                    <th className="border-b p-2 text-left min-w-[120px]">Marka model</th>
                    <th className="border-b p-2 text-left min-w-[70px]">Model yılı</th>
                    <th className="border-b p-2 text-left min-w-[100px]">Edinme değeri</th>
                    <th className="border-b p-2 text-left min-w-[100px]">Edinme tarihi</th>
                    <th className="border-b p-2 text-left min-w-[180px]">Sahip (Excel’e TCKN)</th>
                    <th className="border-b p-2 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {tasitSatirlari.length === 0 ? (
                    <tr><td colSpan={9} className="p-3 text-slate-500 text-center">Kayıt yok.</td></tr>
                  ) : (
                    tasitSatirlari.map((tr, i) => (
                      <tr key={i} className="align-top">
                        <td className="border-b border-slate-100 p-2 text-slate-500">{i + 1}</td>
                        <td className="border-b border-slate-100 p-1">
                          <select value={tr.tasit_cinsi}
                            onChange={e => tasitGuncelle(i, 'tasit_cinsi', e.target.value as TasitFormSatir['tasit_cinsi'])}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                            <option value="">—</option>
                            {TASIT_CINSLERI.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <input value={tr.plaka_no} onChange={e => tasitGuncelle(i, 'plaka_no', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" />
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <input value={tr.marka_model} onChange={e => tasitGuncelle(i, 'marka_model', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" />
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <input value={tr.model_yili} onChange={e => tasitGuncelle(i, 'model_yili', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" />
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <input value={tr.edinme_degeri_raw}
                            onChange={e => tasitGuncelle(i, 'edinme_degeri_raw', sanitizeTrMoneyTyping(e.target.value))}
                            onBlur={() => {
                              const n = parseTrMoneyDisplay(tr.edinme_degeri_raw)
                              if (n > 0) tasitGuncelle(i, 'edinme_degeri_raw', formatTrMoneyDisplay(n))
                            }}
                            placeholder="12.456,78"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono tabular-nums"
                            inputMode="decimal"
                          />
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <input type="date" value={tr.edinme_tarihi}
                            onChange={e => tasitGuncelle(i, 'edinme_tarihi', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" />
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <select value={tr.sahip_kimlik_indeksi < 0 ? '' : String(tr.sahip_kimlik_indeksi)}
                            onChange={e => {
                              const v = e.target.value
                              tasitGuncelle(i, 'sahip_kimlik_indeksi', v === '' ? KIMLIK_SECILMEDI : parseInt(v, 10))
                            }}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                            <option value="">— Seçiniz —</option>
                            {kimlikSatirlari.map((kr, kix) => (
                              <option key={kix} value={kix}>
                                {(kr.yakinlik || '—') + ' — ' + (kr.ad_soyad || '—')}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border-b border-slate-100 p-1 text-center">
                          <button type="button" onClick={() => tasitSil(i)} className="text-red-600 hover:underline">Sil</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-3 mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <h3 className="text-sm font-bold text-slate-800">B — Diğer Taşınır Malları</h3>
              <button type="button" onClick={digerTasinirEkle} disabled={kimlikSatirlari.length === 0}
                className="text-xs font-medium text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-white disabled:opacity-40 disabled:pointer-events-none">
                + Taşınır Ekle
              </button>
            </div>
            <div className="overflow-x-auto rounded border border-slate-200 bg-white">
              <table className="w-full text-xs border-collapse min-w-[860px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-600">
                    <th className="border-b p-2 text-left w-8">#</th>
                    <th className="border-b p-2 text-left min-w-[90px]">Taşınır cinsi</th>
                    <th className="border-b p-2 text-left min-w-[70px]">Model yılı</th>
                    <th className="border-b p-2 text-left min-w-[100px]">Edinme değeri</th>
                    <th className="border-b p-2 text-left min-w-[100px]">Edinme tarihi</th>
                    <th className="border-b p-2 text-left min-w-[180px]">Sahip (Excel’e TCKN)</th>
                    <th className="border-b p-2 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {digerTasinirSatirlari.length === 0 ? (
                    <tr><td colSpan={7} className="p-3 text-slate-500 text-center">Kayıt yok.</td></tr>
                  ) : (
                    digerTasinirSatirlari.map((dr, i) => (
                      <tr key={i} className="align-top">
                        <td className="border-b border-slate-100 p-2 text-slate-500">{i + 1}</td>
                        <td className="border-b border-slate-100 p-1">
                          <select value={dr.tasinir_cinsi}
                            onChange={e => digerTasinirGuncelle(i, 'tasinir_cinsi', e.target.value as DigerTasinirFormSatir['tasinir_cinsi'])}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                            <option value="">—</option>
                            {DIGER_TASINIR_CINSLERI.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <input value={dr.model_yili} onChange={e => digerTasinirGuncelle(i, 'model_yili', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" />
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <input value={dr.edinme_degeri_raw}
                            onChange={e => digerTasinirGuncelle(i, 'edinme_degeri_raw', sanitizeTrMoneyTyping(e.target.value))}
                            onBlur={() => {
                              const n = parseTrMoneyDisplay(dr.edinme_degeri_raw)
                              if (n > 0) digerTasinirGuncelle(i, 'edinme_degeri_raw', formatTrMoneyDisplay(n))
                            }}
                            placeholder="12.456,78"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono tabular-nums"
                            inputMode="decimal"
                          />
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <input type="date" value={dr.edinme_tarihi}
                            onChange={e => digerTasinirGuncelle(i, 'edinme_tarihi', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" />
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <select value={dr.sahip_kimlik_indeksi < 0 ? '' : String(dr.sahip_kimlik_indeksi)}
                            onChange={e => {
                              const v = e.target.value
                              digerTasinirGuncelle(i, 'sahip_kimlik_indeksi', v === '' ? KIMLIK_SECILMEDI : parseInt(v, 10))
                            }}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                            <option value="">— Seçiniz —</option>
                            {kimlikSatirlari.map((kr, kix) => (
                              <option key={kix} value={kix}>
                                {(kr.yakinlik || '—') + ' — ' + (kr.ad_soyad || '—')}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border-b border-slate-100 p-1 text-center">
                          <button type="button" onClick={() => digerTasinirSil(i)} className="text-red-600 hover:underline">Sil</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Accordion>

        <Accordion title="Banka ve Menkul Değerlere Ait Bilgiler" acik={acikBankaMenkul} onClick={() => setAcikBankaMenkul(v => !v)}>
          <p className="text-xs text-slate-500 mb-3">
            Bölüm-5 Excel: sıra <strong>A53+</strong>, nitelik <strong>B</strong>, cinsi <strong>D</strong>, miktar <strong>H</strong>, güncel kur <strong>M</strong>, değer (miktar × kur) <strong>O</strong>, sahip TCKN <strong>U</strong>.
          </p>
          <div className="flex flex-wrap justify-end mb-2">
            <button type="button" onClick={bankaMenkulEkle} disabled={kimlikSatirlari.length === 0}
              className="text-xs font-medium text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none">
              + Satır Ekle
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="border-b border-slate-200 p-2 text-left font-semibold w-10">Sıra</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[120px]">Niteliği</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[110px]">Cinsi</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[100px]">Miktarı</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[100px]">Güncel kur</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[100px]">Değeri (otomatik)</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[180px]">Sahip (Excel’e TCKN)</th>
                  <th className="border-b border-slate-200 p-2 w-14" />
                </tr>
              </thead>
              <tbody>
                {bankaMenkulSatirlari.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-slate-500 text-center">
                      Kayıt yok. «Satır Ekle» ile ekleyin.
                    </td>
                  </tr>
                ) : (
                  bankaMenkulSatirlari.map((br, i) => {
                    const m = parseTrMoneyDisplay(br.miktar_raw)
                    const k = parseTrMoneyDisplay(br.kur_raw)
                    const degerGoster = m > 0 && k > 0 ? formatTrMoneyDisplay(m * k) : '—'
                    return (
                      <tr key={i} className="align-top">
                        <td className="border-b border-slate-100 p-2 tabular-nums text-slate-500 font-medium">{i + 1}</td>
                        <td className="border-b border-slate-100 p-1">
                          <select value={br.nitelik}
                            onChange={e => bankaMenkulGuncelle(i, 'nitelik', e.target.value as BankaMenkulFormSatir['nitelik'])}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                            <option value="">—</option>
                            {BANKA_NITELIKLERI.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <select value={br.cins}
                            onChange={e => bankaMenkulGuncelle(i, 'cins', e.target.value as BankaMenkulFormSatir['cins'])}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                            <option value="">—</option>
                            {BANKA_CINSLERI.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <input value={br.miktar_raw}
                            onChange={e => bankaMenkulGuncelle(i, 'miktar_raw', sanitizeTrMoneyTyping(e.target.value))}
                            onBlur={() => {
                              const n = parseTrMoneyDisplay(br.miktar_raw)
                              if (n > 0) bankaMenkulGuncelle(i, 'miktar_raw', formatTrMoneyDisplay(n))
                            }}
                            placeholder="12.456,79"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono tabular-nums"
                            inputMode="decimal"
                          />
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <input value={br.kur_raw}
                            onChange={e => bankaMenkulGuncelle(i, 'kur_raw', sanitizeTrMoneyTyping(e.target.value))}
                            onBlur={() => {
                              const n = parseTrMoneyDisplay(br.kur_raw)
                              if (n > 0) bankaMenkulGuncelle(i, 'kur_raw', formatTrMoneyDisplay(n))
                            }}
                            placeholder="1.234,56"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono tabular-nums"
                            inputMode="decimal"
                          />
                        </td>
                        <td className="border-b border-slate-100 p-2 font-mono tabular-nums text-slate-700 bg-slate-50">
                          {degerGoster}
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <select value={br.sahip_kimlik_indeksi < 0 ? '' : String(br.sahip_kimlik_indeksi)}
                            onChange={e => {
                              const v = e.target.value
                              bankaMenkulGuncelle(i, 'sahip_kimlik_indeksi', v === '' ? KIMLIK_SECILMEDI : parseInt(v, 10))
                            }}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                            <option value="">— Seçiniz —</option>
                            {kimlikSatirlari.map((kr, kix) => (
                              <option key={kix} value={kix}>
                                {(kr.yakinlik || '—') + ' — ' + (kr.ad_soyad || '—')}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border-b border-slate-100 p-1 text-center">
                          <button type="button" onClick={() => bankaMenkulSil(i)} className="text-red-600 hover:underline">Sil</button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Accordion>

        <Accordion title="Altın ve Mücevherat Bilgileri" acik={acikAltinMucevher} onClick={() => setAcikAltinMucevher(v => !v)}>
          <p className="text-xs text-slate-500 mb-3">
            Bölüm-6 Excel: sıra <strong>A63+</strong>, cinsi <strong>B</strong>, türü <strong>D</strong>, miktar <strong>I</strong>, güncel kur <strong>M</strong>, değer (miktar × kur) <strong>O</strong>, sahip TCKN <strong>U</strong>. Listelerden seçim yapınız.
          </p>
          <div className="flex flex-wrap justify-end mb-2">
            <button type="button" onClick={altinMucevherEkle} disabled={kimlikSatirlari.length === 0}
              className="text-xs font-medium text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none">
              + Satır Ekle
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="border-b border-slate-200 p-2 text-left font-semibold w-10">Sıra</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[110px]">Cinsi</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[120px]">Türü</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[100px]">Miktarı</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[100px]">Güncel kur</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[100px]">Değeri (otomatik)</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[180px]">Sahip (Excel’e TCKN)</th>
                  <th className="border-b border-slate-200 p-2 w-14" />
                </tr>
              </thead>
              <tbody>
                {altinMucevherSatirlari.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-slate-500 text-center">
                      Kayıt yok. «Satır Ekle» ile ekleyin.
                    </td>
                  </tr>
                ) : (
                  altinMucevherSatirlari.map((ar, i) => {
                    const m = parseTrMoneyDisplay(ar.miktar_raw)
                    const k = parseTrMoneyDisplay(ar.kur_raw)
                    const degerGoster = m > 0 && k > 0 ? formatTrMoneyDisplay(m * k) : '—'
                    return (
                      <tr key={i} className="align-top">
                        <td className="border-b border-slate-100 p-2 tabular-nums text-slate-500 font-medium">{i + 1}</td>
                        <td className="border-b border-slate-100 p-1">
                          <select value={ar.cinsi}
                            onChange={e => altinMucevherGuncelle(i, 'cinsi', e.target.value as AltinMucevherFormSatir['cinsi'])}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                            <option value="">— Seçiniz —</option>
                            {ALTIN_MUCEVHER_CINSI.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <select value={ar.turu}
                            onChange={e => altinMucevherGuncelle(i, 'turu', e.target.value as AltinMucevherFormSatir['turu'])}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                            <option value="">— Seçiniz —</option>
                            {ALTIN_MUCEVHER_TURU.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <input value={ar.miktar_raw}
                            onChange={e => altinMucevherGuncelle(i, 'miktar_raw', sanitizeTrMoneyTyping(e.target.value))}
                            onBlur={() => {
                              const n = parseTrMoneyDisplay(ar.miktar_raw)
                              if (n > 0) altinMucevherGuncelle(i, 'miktar_raw', formatTrMoneyDisplay(n))
                            }}
                            placeholder="12.456,79"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono tabular-nums"
                            inputMode="decimal"
                          />
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <input value={ar.kur_raw}
                            onChange={e => altinMucevherGuncelle(i, 'kur_raw', sanitizeTrMoneyTyping(e.target.value))}
                            onBlur={() => {
                              const n = parseTrMoneyDisplay(ar.kur_raw)
                              if (n > 0) altinMucevherGuncelle(i, 'kur_raw', formatTrMoneyDisplay(n))
                            }}
                            placeholder="1.234,56"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono tabular-nums"
                            inputMode="decimal"
                          />
                        </td>
                        <td className="border-b border-slate-100 p-2 font-mono tabular-nums text-slate-700 bg-slate-50">
                          {degerGoster}
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <select value={ar.sahip_kimlik_indeksi < 0 ? '' : String(ar.sahip_kimlik_indeksi)}
                            onChange={e => {
                              const v = e.target.value
                              altinMucevherGuncelle(i, 'sahip_kimlik_indeksi', v === '' ? KIMLIK_SECILMEDI : parseInt(v, 10))
                            }}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                            <option value="">— Seçiniz —</option>
                            {kimlikSatirlari.map((kr, kix) => (
                              <option key={kix} value={kix}>
                                {(kr.yakinlik || '—') + ' — ' + (kr.ad_soyad || '—')}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border-b border-slate-100 p-1 text-center">
                          <button type="button" onClick={() => altinMucevherSil(i)} className="text-red-600 hover:underline">Sil</button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Accordion>

        <Accordion title="Borç – Alacak Bilgileri" acik={acikBorcAlacak} onClick={() => setAcikBorcAlacak(v => !v)}>
          <p className="text-xs text-slate-500 mb-3">
            Bölüm-7 Excel: sıra <strong>A69+</strong>, borçlu <strong>B</strong>, alacaklı <strong>G</strong>, birim <strong>M</strong>, miktar <strong>N</strong>, güncel kur <strong>R</strong>, borç/alacak tutarı (miktar × kur) <strong>U</strong>.
          </p>
          <div className="flex flex-wrap justify-end mb-2">
            <button type="button" onClick={borcAlacakEkle}
              className="text-xs font-medium text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50">
              + Satır Ekle
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs border-collapse min-w-[1020px]">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="border-b border-slate-200 p-2 text-left font-semibold w-10">Sıra</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[140px]">Borçlunun adı soyadı</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[140px]">Alacaklının adı soyadı</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[110px]">Birimi</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[100px]">Miktarı</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[100px]">Güncel kur</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[100px]">Borç alacak tutarı</th>
                  <th className="border-b border-slate-200 p-2 w-14" />
                </tr>
              </thead>
              <tbody>
                {borcAlacakSatirlari.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-slate-500 text-center">
                      Kayıt yok. «Satır Ekle» ile ekleyin.
                    </td>
                  </tr>
                ) : (
                  borcAlacakSatirlari.map((br, i) => {
                    const m = parseTrMoneyDisplay(br.miktar_raw)
                    const k = parseTrMoneyDisplay(br.kur_raw)
                    const tutarGoster = m > 0 && k > 0 ? formatTrMoneyDisplay(m * k) : '—'
                    return (
                      <tr key={i} className="align-top">
                        <td className="border-b border-slate-100 p-2 tabular-nums text-slate-500 font-medium">{i + 1}</td>
                        <td className="border-b border-slate-100 p-1">
                          <input value={br.borclu_adi}
                            onChange={e => borcAlacakGuncelle(i, 'borclu_adi', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
                            placeholder="Ad Soyad"
                          />
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <input value={br.alacakli_adi}
                            onChange={e => borcAlacakGuncelle(i, 'alacakli_adi', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
                            placeholder="Ad Soyad"
                          />
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <select value={br.birimi}
                            onChange={e => borcAlacakGuncelle(i, 'birimi', e.target.value as BorcAlacakFormSatir['birimi'])}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                            <option value="">— Seçiniz —</option>
                            {BORC_ALACAK_BIRIMI.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <input value={br.miktar_raw}
                            onChange={e => borcAlacakGuncelle(i, 'miktar_raw', sanitizeTrMoneyTyping(e.target.value))}
                            onBlur={() => {
                              const n = parseTrMoneyDisplay(br.miktar_raw)
                              if (n > 0) borcAlacakGuncelle(i, 'miktar_raw', formatTrMoneyDisplay(n))
                            }}
                            placeholder="12.456,79"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono tabular-nums"
                            inputMode="decimal"
                          />
                        </td>
                        <td className="border-b border-slate-100 p-1">
                          <input value={br.kur_raw}
                            onChange={e => borcAlacakGuncelle(i, 'kur_raw', sanitizeTrMoneyTyping(e.target.value))}
                            onBlur={() => {
                              const n = parseTrMoneyDisplay(br.kur_raw)
                              if (n > 0) borcAlacakGuncelle(i, 'kur_raw', formatTrMoneyDisplay(n))
                            }}
                            placeholder="1.234,56"
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-mono tabular-nums"
                            inputMode="decimal"
                          />
                        </td>
                        <td className="border-b border-slate-100 p-2 font-mono tabular-nums text-slate-700 bg-slate-50">
                          {tutarGoster}
                        </td>
                        <td className="border-b border-slate-100 p-1 text-center">
                          <button type="button" onClick={() => borcAlacakSil(i)} className="text-red-600 hover:underline">Sil</button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Accordion>

        <Accordion title="Haklar ve Diğer Unsurlar" acik={acikHaklar} onClick={() => setAcikHaklar(v => !v)}>
          <p className="text-xs text-slate-500 mb-3">
            Bölüm-8 Excel: sıra <strong>A76+</strong>, hak / diğer servet unsuru <strong>B</strong>, edinme şekli <strong>M</strong>, sahip TCKN <strong>U76+</strong>. Sahip, kimlik listesinden seçilir.
          </p>
          <div className="flex flex-wrap justify-end mb-2">
            <button type="button" onClick={haklarEkle} disabled={kimlikSatirlari.length === 0}
              className="text-xs font-medium text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none">
              + Satır Ekle
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="border-b border-slate-200 p-2 text-left font-semibold w-10">Sıra</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[220px]">Hak veya beyanı gerekli görülen diğer servet unsurları</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[160px]">Edinme şekli</th>
                  <th className="border-b border-slate-200 p-2 text-left font-semibold min-w-[200px]">Sahibinin TC kimlik no</th>
                  <th className="border-b border-slate-200 p-2 w-14" />
                </tr>
              </thead>
              <tbody>
                {haklarSatirlari.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-slate-500 text-center">
                      Kayıt yok. «Satır Ekle» ile ekleyin (önce kimlik bilgileri dolu olmalıdır).
                    </td>
                  </tr>
                ) : (
                  haklarSatirlari.map((hr, i) => (
                    <tr key={i} className="align-top">
                      <td className="border-b border-slate-100 p-2 tabular-nums text-slate-500 font-medium">{i + 1}</td>
                      <td className="border-b border-slate-100 p-1">
                        <input value={hr.unsur}
                          onChange={e => haklarGuncelle(i, 'unsur', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
                          placeholder="Açıklama"
                        />
                      </td>
                      <td className="border-b border-slate-100 p-1">
                        <input value={hr.edinme_sekli}
                          onChange={e => haklarGuncelle(i, 'edinme_sekli', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs"
                          placeholder="Edinme şekli"
                        />
                      </td>
                      <td className="border-b border-slate-100 p-1">
                        <select value={hr.sahip_kimlik_indeksi < 0 ? '' : String(hr.sahip_kimlik_indeksi)}
                          onChange={e => {
                            const v = e.target.value
                            haklarGuncelle(i, 'sahip_kimlik_indeksi', v === '' ? KIMLIK_SECILMEDI : parseInt(v, 10))
                          }}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs bg-white">
                          <option value="">— Seçiniz —</option>
                          {kimlikSatirlari.map((kr, kix) => (
                            <option key={kix} value={kix}>
                              {(kr.yakinlik || '—') + ' — ' + (kr.ad_soyad || '—')}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-b border-slate-100 p-1 text-center">
                        <button type="button" onClick={() => haklarSil(i)} className="text-red-600 hover:underline">Sil</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Accordion>

        <Accordion title="Açıklama" acik={acikAciklama} onClick={() => setAcikAciklama(v => !v)}>
          <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama (Excel A80)</label>
          <textarea value={aciklama} onChange={e => setAciklama(e.target.value)} rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            placeholder="İsteğe bağlı açıklama…" />
        </Accordion>

        <Accordion title="Onay" acik={acikOnay} onClick={() => setAcikOnay(v => !v)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Beyan Türü * (Excel U83)</label>
              <select value={beyanTuru} onChange={e => setBeyanTuru(e.target.value)}
                className="w-full h-[42px] px-3 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                <option value="">— Seçiniz —</option>
                {BEYAN_TURLERI.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tarih * (Excel U82)</label>
              <input type="date" value={onayTarihi} onChange={e => setOnayTarihi(e.target.value)}
                className="w-full h-[42px] px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Seçili personelin adı soyadı Excel <strong>U81</strong> hücresine yazılır.</p>
        </Accordion>

        {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="submit" disabled={isPending}
            className="px-5 py-2.5 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
