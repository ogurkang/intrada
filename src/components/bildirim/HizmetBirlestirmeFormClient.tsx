'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import PersonelAramaSecim from '@/components/bildirim/PersonelAramaSecim'
import type { HizmetBirlestirmePersonel } from '@/lib/hizmet-birlestirme-personel'
import {
  HIZMET_BIRLESTIRME_BIRIM,
  HIZMET_BIRLESTIRME_MAKAM,
  HIZMET_BIRLESTIRME_METIN,
  hizmetBirlestirmePersonelDurumNorm,
  hizmetBirlestirmeTarihFormat,
  hizmetBirlestirmeTcknGecerliMi,
  type HizmetBirlestirmePersonelDurum,
} from '@/lib/hizmet-birlestirme-belge'

type Sonuc = { ok?: boolean; hata?: string; id?: number }

export interface HizmetBirlestirmeFormBaslangic {
  personel_durum: HizmetBirlestirmePersonelDurum
  ad_soyad?: string
  tckn?: string | null
  emeklilik_sicil_no?: string | null
  ssk?: string | null
  bagkur_sicil_no?: string | null
  hizmet_illeri?: string | null
}

interface Props {
  mode: 'create' | 'edit'
  personeller: HizmetBirlestirmePersonel[]
  sabitSicil?: string
  baslangic?: HizmetBirlestirmeFormBaslangic | null
  kayitId?: number
  ayrilanIzinli?: boolean
  onKaydet: (fd: FormData) => Promise<Sonuc>
}

export default function HizmetBirlestirmeFormClient({
  mode,
  personeller,
  sabitSicil,
  baslangic,
  kayitId,
  ayrilanIzinli = true,
  onKaydet,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)

  const baslangicDurum = hizmetBirlestirmePersonelDurumNorm(baslangic?.personel_durum ?? 'calisan')
  const durumSabit = mode === 'edit'

  const [personelDurum, setPersonelDurum] = useState<HizmetBirlestirmePersonelDurum>(baslangicDurum)
  const [manuelAdSoyad, setManuelAdSoyad] = useState(baslangic?.ad_soyad ?? '')
  const [manuelTckn, setManuelTckn] = useState((baslangic?.tckn ?? '').toString())
  const [emeklilikSicil, setEmeklilikSicil] = useState(baslangic?.emeklilik_sicil_no ?? '')
  const [ssk, setSsk] = useState(baslangic?.ssk ?? '')
  const [bagkurSicil, setBagkurSicil] = useState(baslangic?.bagkur_sicil_no ?? '')
  const [hizmetIlleri, setHizmetIlleri] = useState(baslangic?.hizmet_illeri ?? '')
  const [seciliSicil, setSeciliSicil] = useState(sabitSicil ?? '')

  const aramaOgeleri = useMemo(
    () => personeller.map(p => ({ sicil_no: p.sicil_no, ad_soyad: p.ad_soyad, alt: p.tckn ?? '' })),
    [personeller],
  )

  const secili = useMemo(
    () => personeller.find(p => p.sicil_no === seciliSicil) ?? null,
    [personeller, seciliSicil],
  )

  const ayrilanTcknUygun = hizmetBirlestirmeTcknGecerliMi(manuelTckn)
  const calisanTcknUygun = hizmetBirlestirmeTcknGecerliMi(secili?.tckn)
  const ayrilanHazir = Boolean(manuelAdSoyad.trim()) && ayrilanTcknUygun
  const calisanHazir = Boolean(seciliSicil) && calisanTcknUygun

  const onizlemeAdSoyad =
    personelDurum === 'ayrilan' ? manuelAdSoyad.trim() : (secili?.ad_soyad ?? '')
  const onizlemeTckn =
    personelDurum === 'ayrilan' ? manuelTckn.trim() : String(secili?.tckn ?? '').trim()

  function gonder() {
    setHata(null)
    const fd = new FormData()
    fd.set('personel_durum', personelDurum)
    fd.set('emeklilik_sicil_no', emeklilikSicil.trim())
    fd.set('ssk', ssk.trim())
    fd.set('bagkur_sicil_no', bagkurSicil.trim())
    fd.set('hizmet_illeri', hizmetIlleri.trim())

    if (personelDurum === 'ayrilan') {
      if (!ayrilanHazir) {
        if (!manuelAdSoyad.trim()) setHata('Ad soyad zorunludur.')
        else setHata('T.C. kimlik numarası 11 rakam olmalıdır.')
        return
      }
      fd.set('ad_soyad', manuelAdSoyad.trim())
      fd.set('tckn', manuelTckn.trim())
    } else {
      if (!seciliSicil) {
        setHata('Personel seçilmelidir.')
        return
      }
      if (!calisanTcknUygun) {
        setHata('Personel kaydında geçerli T.C. kimlik numarası bulunamadı.')
        return
      }
      fd.set('sicil_no', seciliSicil)
    }

    startTransition(async () => {
      const sonuc = await onKaydet(fd)
      if (sonuc?.hata) {
        setHata(sonuc.hata)
        return
      }
      router.push('/bildirim/hizmet-birlestirme')
      router.refresh()
    })
  }

  const geriHref =
    mode === 'edit' && kayitId
      ? `/bildirim/hizmet-birlestirme/${kayitId}`
      : '/bildirim/hizmet-birlestirme'

  const onizlemeHazir = personelDurum === 'ayrilan' ? ayrilanHazir : calisanHazir
  const kaydetAktif = onizlemeHazir

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={geriHref}
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
        >
          ← {mode === 'edit' ? 'Form Detayı' : 'Hizmet Birleştirme İşlemleri'}
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">
          {mode === 'edit' ? 'Hizmet Birleştirme Formunu Değiştir' : 'Yeni Hizmet Birleştirme Formu'}
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Çalışan personelde T.C. kimlik numarası personel kaydından alınır. Emeklilik, S.S.K., Bağ-Kur
          ve hizmet illeri alanları elle girilir. Oluşturduktan sonra Word belgesi indirilebilir.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5 max-w-3xl">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Personel Durumu</label>
          <div className="flex flex-wrap gap-4">
            {([
              ['calisan', 'Çalışan'],
              ['ayrilan', 'Ayrılan'],
            ] as const).map(([val, etiket]) => {
              const disabled =
                durumSabit ||
                (val === 'ayrilan' && !ayrilanIzinli) ||
                (val === 'calisan' && durumSabit && baslangicDurum === 'ayrilan')
              return (
                <label
                  key={val}
                  className={`inline-flex items-center gap-2 text-sm ${
                    disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-800 cursor-pointer'
                  }`}
                >
                  <input
                    type="radio"
                    name="personel_durum"
                    value={val}
                    checked={personelDurum === val}
                    disabled={disabled}
                    onChange={() => {
                      setPersonelDurum(val)
                      setHata(null)
                    }}
                  />
                  {etiket}
                </label>
              )
            })}
          </div>
          {!ayrilanIzinli ? (
            <p className="text-xs text-slate-400 mt-1.5">
              Kullanıcı hesabı yalnızca kendi çalışan kaydı için form oluşturabilir.
            </p>
          ) : null}
        </div>

        {personelDurum === 'calisan' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Personel</label>
            <PersonelAramaSecim
              personeller={aramaOgeleri}
              value={seciliSicil}
              onChange={sicil => {
                setSeciliSicil(sicil)
                setHata(null)
              }}
              readOnly={Boolean(sabitSicil)}
              placeholder="Sicil veya ad soyad ile ara…"
            />
            {sabitSicil ? (
              <p className="text-xs text-slate-400 mt-1.5">
                {mode === 'edit'
                  ? 'Form personeli değiştirilemez; yalnızca alt bilgiler güncellenir.'
                  : 'Yalnızca kendi siciliniz için belge oluşturabilirsiniz.'}
              </p>
            ) : null}
            {secili ? (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Ad Soyad</label>
                  <p className="text-sm text-slate-800 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    {secili.ad_soyad}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    T.C. Kimlik No
                  </label>
                  <p className="text-sm text-slate-800 font-mono px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    {secili.tckn?.trim() || '—'}
                  </p>
                  {secili.tckn && !calisanTcknUygun ? (
                    <p className="text-xs text-red-600 mt-1">Personel TCKN geçersiz (11 rakam olmalı).</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Ad Soyad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={manuelAdSoyad}
                onChange={e => setManuelAdSoyad(e.target.value)}
                required
                className="w-full h-[42px] px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Ad soyad"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                T.C. Kimlik No <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={manuelTckn}
                onChange={e => setManuelTckn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                required
                className="w-full h-[42px] px-3 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="11 haneli"
              />
              {manuelTckn && !ayrilanTcknUygun ? (
                <p className="text-xs text-red-600 mt-1">11 rakam olmalıdır ({manuelTckn.length}/11).</p>
              ) : null}
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-700 mb-3">Dilekçe Alt Bilgileri</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Emeklilik Sicil Numarası
              </label>
              <input
                type="text"
                value={emeklilikSicil}
                onChange={e => setEmeklilikSicil(e.target.value)}
                className="w-full h-[42px] px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">S.S.K.</label>
              <input
                type="text"
                value={ssk}
                onChange={e => setSsk(e.target.value)}
                className="w-full h-[42px] px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Bağ-Kur Sicil Numarası
              </label>
              <input
                type="text"
                value={bagkurSicil}
                onChange={e => setBagkurSicil(e.target.value)}
                className="w-full h-[42px] px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Sigortalı Hizmetin Geçtiği İl/İller
              </label>
              <input
                type="text"
                value={hizmetIlleri}
                onChange={e => setHizmetIlleri(e.target.value)}
                className="w-full h-[42px] px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Örn. Sakarya, İstanbul"
              />
            </div>
          </div>
        </div>

        {hata ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {hata}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Link
            href={geriHref}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            İptal
          </Link>
          <button
            type="button"
            onClick={gonder}
            disabled={pending || !kaydetAktif}
            className="inline-flex items-center rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'Kaydediliyor…' : mode === 'edit' ? 'Kaydet' : 'Oluştur'}
          </button>
        </div>
      </div>

      {onizlemeHazir ? (
        <div className="max-w-3xl">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Belge Önizleme
          </p>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-10 py-10 text-slate-800 leading-relaxed font-serif">
            <p className="text-right">{hizmetBirlestirmeTarihFormat()}</p>
            <p className="text-center font-bold mt-10">{HIZMET_BIRLESTIRME_MAKAM}</p>
            <p className="text-center">{HIZMET_BIRLESTIRME_BIRIM}</p>
            <p className="mt-8 text-justify indent-8">{HIZMET_BIRLESTIRME_METIN}</p>
            <p className="mt-16 text-right font-semibold">{onizlemeAdSoyad || '—'}</p>
            <div className="mt-12 space-y-1 text-sm">
              <p>T.C.Kimlik Numarası : {onizlemeTckn || '—'}</p>
              <p>Emeklilik Sicil Numarası : {emeklilikSicil.trim() || '—'}</p>
              <p>S.S.K. : {ssk.trim() || '—'}</p>
              <p>Bağ-Kur Sicil Numarası : {bagkurSicil.trim() || '—'}</p>
              <p>Sigortalı Hizmetin Geçtiği İl/İller : {hizmetIlleri.trim() || '—'}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
