'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import PersonelAramaSecim from '@/components/bildirim/PersonelAramaSecim'
import type { PasaportKadro, PasaportPersonel } from '@/lib/pasaport-personel'
import {
  PASAPORT_BIRIM,
  PASAPORT_DERECE_UYARI,
  PASAPORT_KONU_METNI,
  PASAPORT_MAKAM,
  mudurlukBaz,
  pasaportDereceUygunMu,
  pasaportTarihFormat,
} from '@/lib/pasaport-belge'

type Sonuc = { ok?: boolean; hata?: string }

interface Props {
  mode: 'create' | 'edit'
  personeller: PasaportPersonel[]
  /** Düzenleme: sabit personel sicili. Oluşturma: kullanıcı rolünde kendi sicili. */
  sabitSicil?: string
  /** Düzenleme: hâlihazırda seçili kadro. */
  baslangicKadroId?: number | null
  /** Düzenleme kaydının id'si (geri/iptal linki için). */
  kayitId?: number
  onKaydet: (fd: FormData) => Promise<Sonuc>
}

export default function PasaportFormClient({
  mode,
  personeller,
  sabitSicil,
  baslangicKadroId,
  kayitId,
  onKaydet,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)

  const [seciliSicil, setSeciliSicil] = useState(sabitSicil ?? '')
  const [seciliKadroId, setSeciliKadroId] = useState<number | null>(baslangicKadroId ?? null)

  const aramaOgeleri = useMemo(
    () => personeller.map(p => ({ sicil_no: p.sicil_no, ad_soyad: p.ad_soyad, alt: p.tckn ?? '' })),
    [personeller],
  )

  const secili = useMemo(
    () => personeller.find(p => p.sicil_no === seciliSicil) ?? null,
    [personeller, seciliSicil],
  )

  const kadrolar = secili?.kadrolar ?? []
  const seciliKadro = useMemo(
    () => kadrolar.find(k => k.kadro_id === seciliKadroId) ?? null,
    [kadrolar, seciliKadroId],
  )

  const dereceUygun = seciliKadro ? pasaportDereceUygunMu(seciliKadro.derece) : false

  function personelDegis(sicil: string) {
    setSeciliSicil(sicil)
    setSeciliKadroId(null)
    setHata(null)
  }

  function kadroEtiket(k: PasaportKadro): string {
    return [k.rol, k.derece ? `${k.derece}. derece` : 'derece yok', k.unvan, k.mudurluk]
      .filter(Boolean)
      .join(' · ')
  }

  function gonder() {
    if (!seciliSicil || !seciliKadro) {
      setHata('Personel ve kadro seçilmelidir.')
      return
    }
    if (!dereceUygun) {
      setHata(PASAPORT_DERECE_UYARI)
      return
    }
    setHata(null)
    const fd = new FormData()
    fd.set('sicil_no', seciliSicil)
    fd.set('kadro_id', String(seciliKadro.kadro_id))
    startTransition(async () => {
      const sonuc = await onKaydet(fd)
      if (sonuc?.hata) {
        setHata(sonuc.hata)
        return
      }
      router.push('/bildirim/pasaport')
      router.refresh()
    })
  }

  const geriHref =
    mode === 'edit' && kayitId ? `/bildirim/pasaport/${kayitId}` : '/bildirim/pasaport'

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={geriHref}
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
        >
          ← {mode === 'edit' ? 'Form Detayı' : 'Pasaport İşlemleri'}
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">
          {mode === 'edit' ? 'Pasaport Formunu Değiştir' : 'Yeni Pasaport Formu'}
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Yalnızca memur statüsündeki personel için ve 1, 2 veya 3. derece kadrolarda form
          düzenlenebilir. Personelin birden fazla kadrosu varsa form için kullanılacak kadroyu
          seçin.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5 max-w-3xl">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Personel</label>
          <PersonelAramaSecim
            personeller={aramaOgeleri}
            value={seciliSicil}
            onChange={personelDegis}
            readOnly={Boolean(sabitSicil)}
            placeholder="Sicil veya ad soyad ile ara…"
          />
          {sabitSicil ? (
            <p className="text-xs text-slate-400 mt-1.5">
              {mode === 'edit'
                ? 'Form personeli değiştirilemez; yalnızca kadro seçimi güncellenir.'
                : 'Yalnızca kendi siciliniz için belge oluşturabilirsiniz.'}
            </p>
          ) : null}
        </div>

        {secili ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Kadro Seçimi</label>
            {kadrolar.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Bu personel için memur kadrosu bulunamadı.
              </div>
            ) : (
              <div className="space-y-2">
                {kadrolar.map(k => {
                  const uygun = pasaportDereceUygunMu(k.derece)
                  const aktif = seciliKadroId === k.kadro_id
                  return (
                    <label
                      key={k.kadro_id}
                      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                        aktif
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="kadro"
                        className="mt-0.5"
                        checked={aktif}
                        onChange={() => {
                          setSeciliKadroId(k.kadro_id)
                          setHata(null)
                        }}
                      />
                      <span className="text-sm">
                        <span className="text-slate-800">{kadroEtiket(k)}</span>
                        {!uygun ? (
                          <span className="block text-xs text-red-600 mt-0.5">
                            {PASAPORT_DERECE_UYARI}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}

        {seciliKadro && !dereceUygun ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
            {PASAPORT_DERECE_UYARI}
          </div>
        ) : null}

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
            disabled={pending || !seciliKadro || !dereceUygun}
            className="inline-flex items-center rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? 'Kaydediliyor…' : mode === 'edit' ? 'Kaydet' : 'Oluştur'}
          </button>
        </div>
      </div>

      {secili && seciliKadro && dereceUygun ? (
        <div className="max-w-3xl">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Belge Önizleme
          </p>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-10 py-10 text-slate-800 leading-relaxed font-serif">
            <p className="text-right">{pasaportTarihFormat()}</p>
            <p className="text-center font-bold mt-10">{PASAPORT_MAKAM}</p>
            <p className="text-center">{PASAPORT_BIRIM}</p>
            <p className="mt-8 text-justify indent-8">
              Belediyenizde {mudurlukBaz(seciliKadro.mudurluk) || '—'} Müdürlüğünde{' '}
              {secili.sicil_no} sicil numarası ile {seciliKadro.derece || '—'} dereceli{' '}
              {seciliKadro.unvan || '—'} kadrosunda olarak çalışmaktayım.
            </p>
            <p className="mt-4 text-justify indent-8">{PASAPORT_KONU_METNI}</p>
            <p className="text-right mt-20">{secili.tckn || '—'}</p>
            <p className="text-right font-semibold">{secili.ad_soyad}</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
