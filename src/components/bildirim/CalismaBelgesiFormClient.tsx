'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import PersonelAramaSecim from '@/components/bildirim/PersonelAramaSecim'
import type { BildirimFormPersonel } from '@/lib/bildirim-form-personel'
import { bildirimTcknGecerliMi } from '@/lib/bildirim-belge-ortak'
import {
  CALISMA_BELGESI_BIRIM,
  CALISMA_BELGESI_MAKAM,
  calismaBelgesiBelgeAlanlari,
  calismaBelgesiMetinOlustur,
  calismaBelgesiTarihFormat,
} from '@/lib/calisma-belgesi-belge'

type Sonuc = { hata?: string; ok?: boolean; id?: number }

interface Props {
  personeller: BildirimFormPersonel[]
  sabitSicil?: string
  onKaydet: (fd: FormData) => Promise<Sonuc>
}

export default function CalismaBelgesiFormClient({ personeller, sabitSicil, onKaydet }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [seciliSicil, setSeciliSicil] = useState(sabitSicil ?? '')

  const aramaOgeleri = useMemo(
    () => personeller.map(p => ({ sicil_no: p.sicil_no, ad_soyad: p.ad_soyad, alt: p.tckn ?? '' })),
    [personeller],
  )

  const secili = useMemo(
    () => personeller.find(p => p.sicil_no === seciliSicil) ?? null,
    [personeller, seciliSicil],
  )

  const tcknUygun = bildirimTcknGecerliMi(secili?.tckn)
  const formHazir = Boolean(seciliSicil && tcknUygun && secili?.unvan && secili?.mudurluk)

  const onizlemeAlanlar =
    secili && formHazir
      ? calismaBelgesiBelgeAlanlari(
          {
            sicil_no: secili.sicil_no,
            ad_soyad: secili.ad_soyad,
            tckn: secili.tckn,
            unvan: secili.unvan!,
            mudurluk: secili.mudurluk!,
          },
          calismaBelgesiTarihFormat(),
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

    const fd = new FormData()
    fd.set('sicil_no', seciliSicil)

    startTransition(async () => {
      const sonuc = await onKaydet(fd)
      if (sonuc?.hata) {
        setHata(sonuc.hata)
        return
      }
      router.push('/bildirim/calisma-belgesi')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/bildirim/calisma-belgesi"
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
        >
          ← Çalışma Belgesi İşlemleri
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Yeni Çalışma Belgesi Talebi</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Personel seçildiğinde sicil, unvan ve müdürlük bilgileri kadro kaydından alınır.
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
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
                <div className="text-slate-500 text-xs mb-1">T.C. Kimlik No</div>
                <div className="font-mono text-slate-800">{secili.tckn || '—'}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
                <div className="text-slate-500 text-xs mb-1">Unvan (kadro)</div>
                <div className="text-slate-800">{secili.unvan || '—'}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm">
                <div className="text-slate-500 text-xs mb-1">Müdürlük (kadro)</div>
                <div className="text-slate-800">{secili.mudurluk || '—'}</div>
              </div>
            </div>
          ) : null}

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
            <Link href="/bildirim/calisma-belgesi" className="text-sm text-slate-600 hover:text-slate-800">
              İptal
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Belge Önizleme</h2>
          {onizlemeAlanlar ? (
            <div className="text-sm text-slate-800 space-y-4 font-serif leading-relaxed">
              <div className="text-right text-slate-600">{onizlemeAlanlar.tarih}</div>
              <div className="text-center font-bold">{CALISMA_BELGESI_MAKAM}</div>
              <div className="text-center text-slate-600">{CALISMA_BELGESI_BIRIM}</div>
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
            <p className="text-sm text-slate-400">Personel seçildiğinde dilekçe metni burada görünür.</p>
          )}
        </div>
      </div>
    </div>
  )
}
