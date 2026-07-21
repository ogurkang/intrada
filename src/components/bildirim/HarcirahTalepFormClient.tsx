'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import PersonelAramaSecim from '@/components/bildirim/PersonelAramaSecim'
import type { MemurBildirimPersonel } from '@/lib/bildirim-memur-personel'
import { bildirimTcknGecerliMi } from '@/lib/bildirim-belge-ortak'
import {
  HARCIRAH_TALEP_BIRIM,
  HARCIRAH_TALEP_MAKAM,
  harcirahTalepBelgeAlanlari,
  harcirahTalepMetinOlustur,
  harcirahTalepTarihFormat,
} from '@/lib/harcirah-talep-belge'

type Sonuc = { ok?: boolean; hata?: string; id?: number }

interface Props {
  personeller: MemurBildirimPersonel[]
  sabitSicil?: string
  onKaydet: (fd: FormData) => Promise<Sonuc>
}

export default function HarcirahTalepFormClient({ personeller, sabitSicil, onKaydet }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)

  const [seciliSicil, setSeciliSicil] = useState(sabitSicil ?? '')
  const [geldigiKurum, setGeldigiKurum] = useState('')
  const [nakilTarihi, setNakilTarihi] = useState('')

  const aramaOgeleri = useMemo(
    () => personeller.map(p => ({ sicil_no: p.sicil_no, ad_soyad: p.ad_soyad, alt: p.tckn ?? '' })),
    [personeller],
  )

  const secili = useMemo(
    () => personeller.find(p => p.sicil_no === seciliSicil) ?? null,
    [personeller, seciliSicil],
  )

  const tcknUygun = bildirimTcknGecerliMi(secili?.tckn)
  const formHazir =
    Boolean(seciliSicil) &&
    tcknUygun &&
    Boolean(geldigiKurum.trim()) &&
    Boolean(nakilTarihi)

  const onizlemeMetin =
    formHazir
      ? harcirahTalepMetinOlustur({
          geldigi_kurum: geldigiKurum.trim(),
          nakil_tarihi: nakilTarihi,
        })
      : null

  const onizlemeAlanlar =
    secili && formHazir
      ? harcirahTalepBelgeAlanlari(
          {
            sicil_no: secili.sicil_no,
            ad_soyad: secili.ad_soyad,
            tckn: secili.tckn,
            adres: secili.adres,
            geldigi_kurum: geldigiKurum.trim(),
            nakil_tarihi: nakilTarihi,
          },
          harcirahTalepTarihFormat(),
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
    if (!geldigiKurum.trim()) {
      setHata('Geldiği kurum zorunludur.')
      return
    }
    if (!nakilTarihi) {
      setHata('Nakil tarihi zorunludur.')
      return
    }

    const fd = new FormData()
    fd.set('sicil_no', seciliSicil)
    fd.set('geldigi_kurum', geldigiKurum.trim())
    fd.set('nakil_tarihi', nakilTarihi)

    startTransition(async () => {
      const sonuc = await onKaydet(fd)
      if (sonuc?.hata) {
        setHata(sonuc.hata)
        return
      }
      router.push('/bildirim/harcirah-talep')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/bildirim/harcirah-talep"
          className="intrada-btn intrada-btn-ust-menu mb-2"
        >
          ← Harcırah Talep Bildirimi
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Yeni Harcırah Talep Bildirimi</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Yalnızca memur statüsündeki personel seçilebilir. T.C. kimlik numarası ve adres personel
          kaydından otomatik alınır.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
                <div className="text-slate-500 text-xs mb-1">T.C. Kimlik No (otomatik)</div>
                <div className="font-mono text-slate-800">{secili.tckn || '—'}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm sm:col-span-2">
                <div className="text-slate-500 text-xs mb-1">Adres (otomatik)</div>
                <div className="text-slate-800">{secili.adres || '—'}</div>
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Geldiği Kurum</label>
            <input
              type="text"
              value={geldigiKurum}
              onChange={e => setGeldigiKurum(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Örn. Adalet Bakanlığı"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nakil Tarihi</label>
            <input
              type="date"
              value={nakilTarihi}
              onChange={e => setNakilTarihi(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
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
              className="intrada-btn intrada-btn-ekle disabled:opacity-50 transition-colors"
            >
              {pending ? 'Kaydediliyor…' : 'Oluştur'}
            </button>
            <Link
              href="/bildirim/harcirah-talep"
              className="text-sm text-slate-600 hover:text-slate-800"
            >
              İptal
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Belge Önizleme</h2>
          {onizlemeAlanlar && onizlemeMetin ? (
            <div className="text-sm text-slate-800 space-y-4 font-serif leading-relaxed">
              <div className="text-right text-slate-600">{onizlemeAlanlar.tarih}</div>
              <div className="text-center font-bold">{HARCIRAH_TALEP_MAKAM}</div>
              <div className="text-center text-slate-600">{HARCIRAH_TALEP_BIRIM}</div>
              <p className="text-justify indent-8">{onizlemeMetin}</p>
              <div className="pt-8 border-t border-dashed border-slate-300 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-slate-500">Adres:</div>
                  <div>{onizlemeAlanlar.adres || '—'}</div>
                </div>
                <div />
                <div className="text-right">
                  <div className="font-mono">{onizlemeAlanlar.tckn}</div>
                  <div className="font-bold mt-1">
                    {onizlemeAlanlar.ad_soyad.toLocaleUpperCase('tr-TR')}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Personel ve zorunlu alanları doldurduğunuzda dilekçe metni burada görünür.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
