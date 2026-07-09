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
  PASAPORT_UYGUN_DERECELER,
  mudurlukBaz,
  pasaportAyrilisNedeniNorm,
  pasaportDereceUygunMu,
  pasaportGorevCumlesiSonu,
  pasaportPersonelDurumNorm,
  pasaportTarihFormat,
  pasaportTcknGecerliMi,
  pasaportTelefonGecerliMi,
  type PasaportAyrilisNedeni,
  type PasaportPersonelDurum,
} from '@/lib/pasaport-belge'

type Sonuc = { ok?: boolean; hata?: string }

export interface PasaportFormBaslangic {
  personel_durum: PasaportPersonelDurum
  ayrilis_nedeni?: PasaportAyrilisNedeni | null
  ad_soyad?: string
  unvan?: string
  derece?: string
  tckn?: string | null
  telefon?: string | null
}

interface Props {
  mode: 'create' | 'edit'
  personeller: PasaportPersonel[]
  /** Düzenleme: sabit personel sicili. Oluşturma: kullanıcı rolünde kendi sicili. */
  sabitSicil?: string
  /** Düzenleme: hâlihazırda seçili kadro. */
  baslangicKadroId?: number | null
  /** Düzenleme / ayrılan kaydı başlangıç değerleri. */
  baslangic?: PasaportFormBaslangic | null
  /** Düzenleme kaydının id'si (geri/iptal linki için). */
  kayitId?: number
  /** Kullanıcı rolü yalnızca çalışan (kendi) formu oluşturabilir. */
  ayrilanIzinli?: boolean
  onKaydet: (fd: FormData) => Promise<Sonuc>
}

export default function PasaportFormClient({
  mode,
  personeller,
  sabitSicil,
  baslangicKadroId,
  baslangic,
  kayitId,
  ayrilanIzinli = true,
  onKaydet,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)

  const baslangicDurum = pasaportPersonelDurumNorm(baslangic?.personel_durum ?? 'calisan')
  const durumSabit = mode === 'edit'

  const [personelDurum, setPersonelDurum] = useState<PasaportPersonelDurum>(baslangicDurum)
  const [ayrilisNedeni, setAyrilisNedeni] = useState<PasaportAyrilisNedeni | ''>(
    pasaportAyrilisNedeniNorm(baslangic?.ayrilis_nedeni) ?? '',
  )
  const [manuelAdSoyad, setManuelAdSoyad] = useState(baslangic?.ad_soyad ?? '')
  const [manuelUnvan, setManuelUnvan] = useState(baslangic?.unvan ?? '')
  const [manuelDerece, setManuelDerece] = useState(baslangic?.derece ?? '')
  const [manuelTckn, setManuelTckn] = useState((baslangic?.tckn ?? '').toString())
  const [manuelTelefon, setManuelTelefon] = useState((baslangic?.telefon ?? '').toString())

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

  const calisanDereceUygun = seciliKadro ? pasaportDereceUygunMu(seciliKadro.derece) : false
  const ayrilanDereceUygun = pasaportDereceUygunMu(manuelDerece)
  const ayrilanTcknUygun = pasaportTcknGecerliMi(manuelTckn)
  const ayrilanTelefonUygun = pasaportTelefonGecerliMi(manuelTelefon)
  const ayrilanHazir =
    Boolean(manuelAdSoyad.trim()) &&
    Boolean(manuelUnvan.trim()) &&
    ayrilanDereceUygun &&
    ayrilanTcknUygun &&
    ayrilanTelefonUygun &&
    (ayrilisNedeni === 'emekli' || ayrilisNedeni === 'istifa')

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
    setHata(null)
    const fd = new FormData()
    fd.set('personel_durum', personelDurum)

    if (personelDurum === 'ayrilan') {
      if (!ayrilanHazir) {
        if (!manuelAdSoyad.trim()) setHata('Ad soyad zorunludur.')
        else if (!manuelUnvan.trim()) setHata('Kadro (unvan) zorunludur.')
        else if (!manuelDerece.trim()) setHata('Derece zorunludur.')
        else if (!ayrilanDereceUygun) setHata(PASAPORT_DERECE_UYARI)
        else if (!ayrilanTcknUygun) setHata('T.C. kimlik numarası 11 rakam olmalıdır.')
        else if (!ayrilanTelefonUygun) setHata('Telefon numarası 10–11 rakam olmalıdır.')
        else setHata('Ayrılış nedeni (emekli / istifa) seçilmelidir.')
        return
      }
      fd.set('ad_soyad', manuelAdSoyad.trim())
      fd.set('unvan', manuelUnvan.trim())
      fd.set('derece', manuelDerece.trim())
      fd.set('tckn', manuelTckn.trim())
      fd.set('telefon', manuelTelefon.trim())
      fd.set('ayrilis_nedeni', ayrilisNedeni)
    } else {
      if (!seciliSicil || !seciliKadro) {
        setHata('Personel ve kadro seçilmelidir.')
        return
      }
      if (!calisanDereceUygun) {
        setHata(PASAPORT_DERECE_UYARI)
        return
      }
      fd.set('sicil_no', seciliSicil)
      fd.set('kadro_id', String(seciliKadro.kadro_id))
    }

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

  const onizlemeHazir =
    personelDurum === 'ayrilan'
      ? ayrilanHazir
      : Boolean(secili && seciliKadro && calisanDereceUygun)

  const kaydetAktif =
    personelDurum === 'ayrilan'
      ? ayrilanHazir
      : Boolean(seciliKadro && calisanDereceUygun)

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
          Çalışan personelde memur kadrosu (1–3. derece) seçilir; telefon bilgisi personel kaydından alınır.
          Ayrılan personelde ad soyad, kadro, derece, T.C. kimlik no, telefon ve ayrılış nedeni (emekli / istifa)
          zorunludur.
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
          <>
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

            {seciliKadro && !calisanDereceUygun ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
                {PASAPORT_DERECE_UYARI}
              </div>
            ) : null}

            {secili ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefon</label>
                <p className="text-sm text-slate-800 font-mono px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                  {secili.telefon?.trim() || '—'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Personel kaydından otomatik alınır.</p>
              </div>
            ) : null}
          </>
        ) : (
          <>
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
                  Kadro (Unvan) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manuelUnvan}
                  onChange={e => setManuelUnvan(e.target.value)}
                  required
                  className="w-full h-[42px] px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Örn. Şube Müdürü"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Derece <span className="text-red-500">*</span>
                </label>
                <select
                  value={manuelDerece}
                  onChange={e => setManuelDerece(e.target.value)}
                  required
                  className="w-full h-[42px] px-3 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">Seçiniz</option>
                  {PASAPORT_UYGUN_DERECELER.map(d => (
                    <option key={d} value={String(d)}>
                      {d}. derece
                    </option>
                  ))}
                </select>
              </div>
              <div>
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
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Telefon <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={manuelTelefon}
                  onChange={e => setManuelTelefon(e.target.value.replace(/[^\d+\s()-]/g, ''))}
                  required
                  className="w-full h-[42px] px-3 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="05xx xxx xx xx"
                />
                {manuelTelefon && !ayrilanTelefonUygun ? (
                  <p className="text-xs text-red-600 mt-1">10–11 rakam olmalıdır.</p>
                ) : null}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Ayrılış Nedeni <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-4">
                {([
                  ['emekli', 'Emekli'],
                  ['istifa', 'İstifa'],
                ] as const).map(([val, etiket]) => (
                  <label key={val} className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="ayrilis_nedeni"
                      value={val}
                      checked={ayrilisNedeni === val}
                      onChange={() => {
                        setAyrilisNedeni(val)
                        setHata(null)
                      }}
                    />
                    {etiket}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

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
            <p className="text-right">{pasaportTarihFormat()}</p>
            <p className="text-center font-bold mt-10">{PASAPORT_MAKAM}</p>
            <p className="text-center">{PASAPORT_BIRIM}</p>
            {personelDurum === 'ayrilan' ? (
              <p className="mt-8 text-justify indent-8">
                Belediyenizde {manuelDerece || '—'} dereceli {manuelUnvan || '—'}{' '}
                {pasaportGorevCumlesiSonu('ayrilan', ayrilisNedeni || null)}
              </p>
            ) : (
              <p className="mt-8 text-justify indent-8">
                Belediyenizde {mudurlukBaz(seciliKadro?.mudurluk) || '—'} Müdürlüğünde{' '}
                {secili?.sicil_no} sicil numarası ile {seciliKadro?.derece || '—'} dereceli{' '}
                {seciliKadro?.unvan || '—'}{' '}
                {pasaportGorevCumlesiSonu('calisan', null)}
              </p>
            )}
            <p className="mt-4 text-justify indent-8">{PASAPORT_KONU_METNI}</p>
            <div className="flex justify-between items-baseline mt-20">
              <span>
                {personelDurum === 'ayrilan'
                  ? manuelTelefon || '—'
                  : secili?.telefon?.trim() || '—'}
              </span>
              <span>
                {personelDurum === 'ayrilan' ? manuelTckn || '—' : secili?.tckn || '—'}
              </span>
            </div>
            <p className="text-right font-semibold">
              {personelDurum === 'ayrilan' ? manuelAdSoyad : secili?.ad_soyad}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
