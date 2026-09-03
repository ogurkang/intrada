'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import PersonelAramaSecim from '@/components/bildirim/PersonelAramaSecim'
import type { BildirimFormPersonel } from '@/lib/bildirim-form-personel'
import { bildirimTcknGecerliMi } from '@/lib/bildirim-belge-ortak'
import {
  OKULA_UYUM_IZIN_BIRIM,
  OKULA_UYUM_IZIN_MAKAM,
  OKULA_UYUM_SINIF_SECENEKLERI,
  okulaUyumIzinBelgeAlanlari,
  okulaUyumIzinTarihFormat,
} from '@/lib/okula-uyum-izni-belge'

type Sonuc = { hata?: string; ok?: boolean; id?: number }

interface Props {
  personeller: BildirimFormPersonel[]
  sabitSicil?: string
  mode?: 'create' | 'edit'
  kayitId?: number
  baslangic?: {
    ogrenci_ad_soyad: string
    baslayacagi_sinif: string
  }
  onKaydet: (fd: FormData) => Promise<Sonuc>
}

export default function OkulaUyumIzniFormClient({
  personeller,
  sabitSicil,
  mode = 'create',
  kayitId,
  baslangic,
  onKaydet,
}: Props) {
  const router = useRouter()
  const duzenleme = mode === 'edit'
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [seciliSicil, setSeciliSicil] = useState(sabitSicil ?? '')
  const [ogrenciAdSoyad, setOgrenciAdSoyad] = useState(baslangic?.ogrenci_ad_soyad ?? '')
  const [sinif, setSinif] = useState(baslangic?.baslayacagi_sinif ?? '')

  const aramaOgeleri = useMemo(
    () => personeller.map(p => ({ sicil_no: p.sicil_no, ad_soyad: p.ad_soyad, alt: p.tckn ?? '' })),
    [personeller],
  )

  const secili = useMemo(
    () => personeller.find(p => p.sicil_no === seciliSicil) ?? null,
    [personeller, seciliSicil],
  )

  const tcknUygun = bildirimTcknGecerliMi(secili?.tckn)
  const formHazir = Boolean(
    seciliSicil &&
      tcknUygun &&
      secili?.unvan &&
      secili?.mudurluk &&
      ogrenciAdSoyad.trim() &&
      sinif,
  )

  const geriHref =
    duzenleme && kayitId ? `/bildirim/okula-uyum-izni/${kayitId}` : '/bildirim/okula-uyum-izni'

  const onizlemeAlanlar =
    secili && formHazir
      ? okulaUyumIzinBelgeAlanlari(
          {
            sicil_no: secili.sicil_no,
            ad_soyad: secili.ad_soyad,
            tckn: secili.tckn,
            unvan: secili.unvan!,
            mudurluk: secili.mudurluk!,
            ogrenci_ad_soyad: ogrenciAdSoyad.trim(),
            baslayacagi_sinif: sinif,
          },
          okulaUyumIzinTarihFormat(),
        )
      : null

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
    if (!secili?.unvan || !secili?.mudurluk) {
      setHata('Personelin kadro unvan ve müdürlük bilgisi bulunamadı.')
      return
    }
    if (!ogrenciAdSoyad.trim()) {
      setHata('Öğrenci adı soyadı zorunludur.')
      return
    }
    if (!sinif) {
      setHata('Başlayacağı sınıf seçilmelidir.')
      return
    }

    const fd = new FormData()
    fd.set('sicil_no', seciliSicil)
    fd.set('ogrenci_ad_soyad', ogrenciAdSoyad.trim())
    fd.set('baslayacagi_sinif', sinif)

    startTransition(async () => {
      const sonuc = await onKaydet(fd)
      if (sonuc?.hata) {
        setHata(sonuc.hata)
        return
      }
      if (duzenleme && kayitId) router.push(`/bildirim/okula-uyum-izni/${kayitId}`)
      else router.push('/bildirim/okula-uyum-izni')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={geriHref}
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
        >
          ← {duzenleme ? 'Talep Detayı' : 'Okula Uyum İzni'}
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">
          {duzenleme ? 'Okula Uyum İzni Talebini Düzenle' : 'Yeni Okula Uyum İzni Talebi'}
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          {duzenleme
            ? 'Öğrenci adı soyadı ve başlayacağı sınıf bilgilerini güncelleyebilirsiniz.'
            : 'Personel seçildiğinde sicil, unvan ve müdürlük bilgileri kadro kaydından alınır. Öğrenci bilgilerini girerek üç saatlik idari izin dilekçesi oluşturabilirsiniz.'}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <PersonelAramaSecim
            personeller={aramaOgeleri}
            value={seciliSicil}
            onChange={setSeciliSicil}
            readOnly={Boolean(sabitSicil) || duzenleme}
          />

          {secili ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
                <div className="text-slate-500 text-xs mb-1">T.C. Kimlik No</div>
                <div className="font-mono text-slate-800">{secili.tckn || '—'}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
                <div className="text-slate-500 text-xs mb-1">Sicil No</div>
                <div className="font-mono text-slate-800">{secili.sicil_no}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
                <div className="text-slate-500 text-xs mb-1">Görev Unvanı (kadro)</div>
                <div className="text-slate-800">{secili.unvan || '—'}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
                <div className="text-slate-500 text-xs mb-1">Müdürlük (kadro)</div>
                <div className="text-slate-800">{secili.mudurluk || '—'}</div>
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Öğrenci Adı Soyadı
            </label>
            <input
              type="text"
              value={ogrenciAdSoyad}
              onChange={e => setOgrenciAdSoyad(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Öğrencinin adı soyadı"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Başlayacağı Sınıf
            </label>
            <select
              value={sinif}
              onChange={e => setSinif(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seçiniz</option>
              {OKULA_UYUM_SINIF_SECENEKLERI.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
              {pending ? 'Kaydediliyor…' : duzenleme ? 'Kaydet' : 'Oluştur'}
            </button>
            <Link href={geriHref} className="text-sm text-slate-600 hover:text-slate-800">
              İptal
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Belge Önizleme</h2>
          {onizlemeAlanlar ? (
            <div className="text-sm text-slate-800 space-y-4 font-serif leading-relaxed">
              <div className="text-right text-slate-600">{onizlemeAlanlar.tarih}</div>
              <div className="text-center font-bold">{OKULA_UYUM_IZIN_MAKAM}</div>
              <div className="text-center text-slate-600">{OKULA_UYUM_IZIN_BIRIM}</div>
              {onizlemeAlanlar.paragraflar.map((p, i) => (
                <p key={i} className="text-justify indent-8">
                  {p}
                </p>
              ))}
              <div className="pt-2 space-y-1 text-sm">
                <p>
                  <span className="font-semibold">Öğrenci Adı Soyadı:</span>{' '}
                  {onizlemeAlanlar.ogrenci_ad_soyad}
                </p>
                <p>
                  <span className="font-semibold">Başlayacağı Sınıf:</span>{' '}
                  {onizlemeAlanlar.baslayacagi_sinif}
                </p>
              </div>
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
              Personel ve öğrenci bilgilerini doldurduğunuzda dilekçe metni burada görünür.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
