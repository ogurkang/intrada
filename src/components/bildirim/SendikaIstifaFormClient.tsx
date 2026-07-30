'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition, useEffect } from 'react'
import PersonelAramaSecim from '@/components/bildirim/PersonelAramaSecim'
import Modal from '@/components/ui/Modal'
import { broadcastIntradaRefresh } from '@/lib/intrada-tab-sync'
import type { BildirimFormPersonel } from '@/lib/bildirim-form-personel'
import { bildirimTcknGecerliMi } from '@/lib/bildirim-belge-ortak'
import {
  SENDIKA_ISTIFA_BIRIM,
  SENDIKA_ISTIFA_MAKAM,
  sendikaIstifaBelgeAlanlari,
  sendikaIstifaTarihFormat,
} from '@/lib/sendika-istifa-belge'

type Sonuc = { hata?: string; ok?: boolean; id?: number; sendikaPasiflestirildi?: boolean }

interface Props {
  personeller: BildirimFormPersonel[]
  sabitSicil?: string
  aktifSendikaUzunAd?: Record<string, string>
  onKaydet: (fd: FormData) => Promise<Sonuc>
}

export default function SendikaIstifaFormClient({ personeller, sabitSicil, aktifSendikaUzunAd = {}, onKaydet }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [bilgiModalAcik, setBilgiModalAcik] = useState(false)
  const [seciliSicil, setSeciliSicil] = useState(sabitSicil ?? '')
  const [sendikaAdi, setSendikaAdi] = useState('')

  const aramaOgeleri = useMemo(
    () => personeller.map(p => ({ sicil_no: p.sicil_no, ad_soyad: p.ad_soyad, alt: p.tckn ?? '' })),
    [personeller],
  )

  const secili = useMemo(
    () => personeller.find(p => p.sicil_no === seciliSicil) ?? null,
    [personeller, seciliSicil],
  )

  useEffect(() => {
    if (!seciliSicil) {
      setSendikaAdi('')
      return
    }
    const uzun = aktifSendikaUzunAd[seciliSicil]
    if (uzun) setSendikaAdi(uzun)
  }, [seciliSicil, aktifSendikaUzunAd])

  const tcknUygun = bildirimTcknGecerliMi(secili?.tckn)
  const formHazir = Boolean(seciliSicil && tcknUygun && sendikaAdi.trim())

  const onizlemeAlanlar =
    secili && formHazir
      ? sendikaIstifaBelgeAlanlari(
          {
            sicil_no: secili.sicil_no,
            ad_soyad: secili.ad_soyad,
            tckn: secili.tckn,
            sendika_adi: sendikaAdi.trim(),
          },
          sendikaIstifaTarihFormat(),
        )
      : null

  function listeyeDon() {
    router.push('/bildirim/sendika-istifa')
    router.refresh()
  }

  function gonder() {
    setHata(null)
    if (!seciliSicil) {
      setHata('Personel seçilmelidir.')
      return
    }
    if (!tcknUygun) {
      setHata('Personel kaydında geçerli T.C. kimlik numarası bulunamadı.')
      return
    }
    if (!sendikaAdi.trim()) {
      setHata('Sendika adı zorunludur.')
      return
    }

    const fd = new FormData()
    fd.set('sicil_no', seciliSicil)
    fd.set('sendika_adi', sendikaAdi.trim())

    startTransition(async () => {
      const sonuc = await onKaydet(fd)
      if (sonuc?.hata) {
        setHata(sonuc.hata)
        return
      }
      if (sonuc?.ok) {
        if (sonuc.sendikaPasiflestirildi) broadcastIntradaRefresh('sendika')
        setBilgiModalAcik(true)
        return
      }
      listeyeDon()
    })
  }

  function bilgiModalKapat() {
    setBilgiModalAcik(false)
    listeyeDon()
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/bildirim/sendika-istifa"
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
        >
          ← Sendika İstifa İşlemleri
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Yeni Sendika İstifa Bildirimi</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Personel ve sendika adı girildiğinde istifa dilekçesi oluşturulur.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <PersonelAramaSecim
            personeller={aramaOgeleri}
            value={seciliSicil}
            onChange={setSeciliSicil}
            readOnly={Boolean(sabitSicil)}
          />

          {secili ? (
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
              <div className="text-slate-500 text-xs mb-1">T.C. Kimlik No</div>
              <div className="font-mono text-slate-800">{secili.tckn || '—'}</div>
            </div>
          ) : null}

          <div>
            <label htmlFor="sendika_adi" className="block text-sm font-medium text-slate-700 mb-1">
              Sendika Adı <span className="text-red-500">*</span>
            </label>
            <input
              id="sendika_adi"
              type="text"
              value={sendikaAdi}
              onChange={e => setSendikaAdi(e.target.value)}
              placeholder="Örn. Tüm Belediye ve Yerel Yönetim Hizmetleri Emekçileri Sendikası"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {hata ? (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              {hata}
            </div>
          ) : null}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={gonder}
              disabled={pending || !formHazir}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {pending ? 'Kaydediliyor…' : 'Oluştur'}
            </button>
            <Link href="/bildirim/sendika-istifa" className="text-sm text-slate-600 hover:text-slate-800">
              İptal
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Belge Önizleme</h2>
          {onizlemeAlanlar ? (
            <div className="text-sm text-slate-800 space-y-4 font-serif leading-relaxed">
              <div className="text-right text-slate-600">{onizlemeAlanlar.tarih}</div>
              <div className="text-center font-bold">{SENDIKA_ISTIFA_MAKAM}</div>
              <div className="text-center text-slate-600">{SENDIKA_ISTIFA_BIRIM}</div>
              <p className="text-justify indent-8">{onizlemeAlanlar.metin}</p>
              <div className="pt-8 border-t border-dashed border-slate-300">
                <div className="flex justify-end text-right">
                  <div>
                    <div className="font-mono text-xs">{onizlemeAlanlar.tckn}</div>
                    <div className="font-bold mt-1">
                      {onizlemeAlanlar.ad_soyad.toLocaleUpperCase('tr-TR')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Personel ve sendika adı girildiğinde dilekçe metni burada görünür.
            </p>
          )}
        </div>
      </div>

      <Modal open={bilgiModalAcik} onClose={bilgiModalKapat} title="Sendika üyeliği güncellendi" size="md">
        <p className="text-sm text-slate-700 leading-relaxed">
          Personelin mevcut sendika üyelik bilgisi pasif duruma gelmiştir. Yeni bir sendika üyesi olduğunda Sendika
          Bildirimi ekranından işlem yapmayı unutmayınız.
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={bilgiModalKapat}
            className="inline-flex items-center rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Tamam
          </button>
        </div>
      </Modal>
    </div>
  )
}
