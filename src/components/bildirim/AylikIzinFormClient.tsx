'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import PersonelAramaSecim from '@/components/bildirim/PersonelAramaSecim'
import type { BildirimFormPersonel } from '@/lib/bildirim-form-personel'
import { bildirimTcknGecerliMi } from '@/lib/bildirim-belge-ortak'
import {
  AYLIK_IZIN_BIRIM,
  AYLIK_IZIN_MAKAM,
  aylikIzinBelgeAlanlari,
  aylikIzinTarihFormat,
} from '@/lib/aylik-izin-belge'

type Sonuc = { hata?: string; ok?: boolean; id?: number }

interface Props {
  personeller: BildirimFormPersonel[]
  sabitSicil?: string
  onKaydet: (fd: FormData) => Promise<Sonuc>
}

function TarihSecim({
  label,
  value,
  onChange,
  ornek,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  ornek: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            !value ? '[&::-webkit-datetime-edit]:opacity-0' : ''
          }`}
        />
        {!value ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            {ornek}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export default function AylikIzinFormClient({ personeller, sabitSicil, onKaydet }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [seciliSicil, setSeciliSicil] = useState(sabitSicil ?? '')
  const [baslangicTarihi, setBaslangicTarihi] = useState('')
  const [bitisTarihi, setBitisTarihi] = useState('')

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
    Boolean(seciliSicil && tcknUygun && secili?.unvan && secili?.mudurluk && baslangicTarihi && bitisTarihi)

  const onizlemeAlanlar =
    secili && formHazir
      ? aylikIzinBelgeAlanlari(
          {
            sicil_no: secili.sicil_no,
            ad_soyad: secili.ad_soyad,
            tckn: secili.tckn,
            unvan: secili.unvan!,
            mudurluk: secili.mudurluk!,
            baslangic_tarihi: baslangicTarihi,
            bitis_tarihi: bitisTarihi,
          },
          aylikIzinTarihFormat(),
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
    if (!baslangicTarihi) {
      setHata('Başlangıç tarihi zorunludur.')
      return
    }
    if (!bitisTarihi) {
      setHata('Bitiş tarihi zorunludur.')
      return
    }

    const fd = new FormData()
    fd.set('sicil_no', seciliSicil)
    fd.set('baslangic_tarihi', baslangicTarihi)
    fd.set('bitis_tarihi', bitisTarihi)

    startTransition(async () => {
      const sonuc = await onKaydet(fd)
      if (sonuc?.hata) {
        setHata(sonuc.hata)
        return
      }
      router.push('/bildirim/aylik-izin')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/bildirim/aylik-izin"
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
        >
          ← Aylıksız İşlemleri
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Yeni Aylıksız İzin Talebi</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Personel seçildiğinde sicil, unvan ve müdürlük bilgileri kadro kaydından alınır. Başlangıç
          ve bitiş tarihlerini girerek 657 SK m.108 aylıksız izin dilekçesi oluşturabilirsiniz.
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TarihSecim
              label="Başlangıç Tarihi"
              value={baslangicTarihi}
              onChange={setBaslangicTarihi}
              ornek="15.01.2026"
            />
            <TarihSecim
              label="Bitiş Tarihi"
              value={bitisTarihi}
              onChange={setBitisTarihi}
              ornek="14.01.2027"
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
            <Link href="/bildirim/aylik-izin" className="text-sm text-slate-600 hover:text-slate-800">
              İptal
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Belge Önizleme</h2>
          {onizlemeAlanlar ? (
            <div className="text-sm text-slate-800 space-y-4 font-serif leading-relaxed">
              <div className="text-right text-slate-600">{onizlemeAlanlar.tarih}</div>
              <div className="text-center font-bold">{AYLIK_IZIN_MAKAM}</div>
              <div className="text-center text-slate-600">{AYLIK_IZIN_BIRIM}</div>
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
              Personel ve izin tarihlerini doldurduğunuzda dilekçe metni burada görünür.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
