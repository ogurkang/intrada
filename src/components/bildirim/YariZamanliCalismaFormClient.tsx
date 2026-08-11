'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import PersonelAramaSecim from '@/components/bildirim/PersonelAramaSecim'
import YariZamanliCalismaProgramGrid from '@/components/bildirim/YariZamanliCalismaProgramGrid'
import type { BildirimFormPersonel } from '@/lib/bildirim-form-personel'
import { bildirimTcknGecerliMi } from '@/lib/bildirim-belge-ortak'
import {
  YZC_BIRIM,
  YZC_MAKAM,
  yzcBelgeAlanlari,
  yzcProgramGunSayisi,
  yzcTarihFormat,
  type YzcCalismaProgrami,
} from '@/lib/yari-zamanli-calisma-belge'

type Sonuc = { hata?: string; ok?: boolean; id?: number }

interface BaslangicDegerleri {
  cocuk_dogum_tarihi: string
  yari_zamanli_baslangic_tarihi: string
  normal_zamanli_donus_tarihi: string
  calisma_programi: YzcCalismaProgrami
}

interface Props {
  mode?: 'create' | 'edit'
  kayitId?: number
  personeller: BildirimFormPersonel[]
  sabitSicil?: string
  baslangic?: BaslangicDegerleri
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

export default function YariZamanliCalismaFormClient({
  mode = 'create',
  kayitId,
  personeller,
  sabitSicil,
  baslangic,
  onKaydet,
}: Props) {
  const router = useRouter()
  const duzenleme = mode === 'edit'
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState<string | null>(null)
  const [seciliSicil, setSeciliSicil] = useState(sabitSicil ?? '')
  const [cocukDogumTarihi, setCocukDogumTarihi] = useState(baslangic?.cocuk_dogum_tarihi ?? '')
  const [yariZamanliBaslangic, setYariZamanliBaslangic] = useState(
    baslangic?.yari_zamanli_baslangic_tarihi ?? '',
  )
  const [normalDonusTarihi, setNormalDonusTarihi] = useState(
    baslangic?.normal_zamanli_donus_tarihi ?? '',
  )
  const [calismaProgrami, setCalismaProgrami] = useState<YzcCalismaProgrami>(
    baslangic?.calisma_programi ?? {},
  )

  const aramaOgeleri = useMemo(
    () => personeller.map(p => ({ sicil_no: p.sicil_no, ad_soyad: p.ad_soyad, alt: p.tckn ?? '' })),
    [personeller],
  )

  const secili = useMemo(
    () => personeller.find(p => p.sicil_no === seciliSicil) ?? null,
    [personeller, seciliSicil],
  )

  const tcknUygun = bildirimTcknGecerliMi(secili?.tckn)
  const programGunSayisi = yzcProgramGunSayisi(calismaProgrami)
  const formHazir =
    Boolean(seciliSicil && tcknUygun && secili?.unvan && secili?.mudurluk) &&
    Boolean(cocukDogumTarihi && yariZamanliBaslangic && normalDonusTarihi) &&
    programGunSayisi >= 3

  const onizlemeAlanlar =
    secili && cocukDogumTarihi && yariZamanliBaslangic && normalDonusTarihi && secili.unvan && secili.mudurluk
      ? yzcBelgeAlanlari(
          {
            sicil_no: secili.sicil_no,
            ad_soyad: secili.ad_soyad,
            tckn: secili.tckn,
            unvan: secili.unvan,
            mudurluk: secili.mudurluk,
            cocuk_dogum_tarihi: cocukDogumTarihi,
            yari_zamanli_baslangic_tarihi: yariZamanliBaslangic,
            normal_zamanli_donus_tarihi: normalDonusTarihi,
            calisma_programi: calismaProgrami,
          },
          yzcTarihFormat(),
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
    if (!cocukDogumTarihi) {
      setHata('Çocuğun doğum tarihi zorunludur.')
      return
    }
    if (!yariZamanliBaslangic) {
      setHata('Yarı zamanlı çalışma başlama tarihi zorunludur.')
      return
    }
    if (!normalDonusTarihi) {
      setHata('Normal zamanlı çalışmaya dönüş tarihi zorunludur.')
      return
    }
    if (programGunSayisi < 3) {
      setHata('Haftalık çalışma programında en az 3 gün seçilmelidir.')
      return
    }

    const fd = new FormData()
    fd.set('sicil_no', seciliSicil)
    fd.set('cocuk_dogum_tarihi', cocukDogumTarihi)
    fd.set('yari_zamanli_baslangic_tarihi', yariZamanliBaslangic)
    fd.set('normal_zamanli_donus_tarihi', normalDonusTarihi)
    fd.set('calisma_programi', JSON.stringify(calismaProgrami))

    startTransition(async () => {
      const sonuc = await onKaydet(fd)
      if (sonuc?.hata) {
        setHata(sonuc.hata)
        return
      }
      router.push(duzenleme && kayitId ? `/bildirim/yari-zamanli-calisma/${kayitId}` : '/bildirim/yari-zamanli-calisma')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={duzenleme && kayitId ? `/bildirim/yari-zamanli-calisma/${kayitId}` : '/bildirim/yari-zamanli-calisma'}
          className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mb-2"
        >
          ← {duzenleme ? 'Talep Detayı' : 'Yarı Zamanlı Çalışma İşlemleri'}
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">
          {duzenleme ? 'Yarı Zamanlı Çalışma Talebini Düzenle' : 'Yeni Yarı Zamanlı Çalışma Talebi'}
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-4xl">
          Personel bilgileri kadro kaydından alınır. Dilekçe ile birlikte ekte yer alacak yarı zamanlı çalışma
          formunu doldurun.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-5">
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
                  <div className="text-slate-500 text-xs mb-1">Görev Yaptığı Birim</div>
                  <div className="text-slate-800">{secili.mudurluk || '—'}</div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TarihSecim
                label="Çocuğun Doğum Tarihi"
                value={cocukDogumTarihi}
                onChange={setCocukDogumTarihi}
                ornek="15.03.2026"
              />
              <TarihSecim
                label="Yarı Zamanlı Başlangıç"
                value={yariZamanliBaslangic}
                onChange={setYariZamanliBaslangic}
                ornek="01.04.2026"
              />
              <TarihSecim
                label="Normal Zamanlı Dönüş"
                value={normalDonusTarihi}
                onChange={setNormalDonusTarihi}
                ornek="01.04.2027"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <YariZamanliCalismaProgramGrid value={calismaProgrami} onChange={setCalismaProgrami} />
            {programGunSayisi > 0 && programGunSayisi < 3 ? (
              <p className="text-xs text-amber-700 mt-3">En az 3 gün seçilmelidir ({programGunSayisi}/3).</p>
            ) : null}
          </div>

          {hata ? (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{hata}</div>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={gonder}
              disabled={pending || !formHazir}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 text-white px-4 py-2 text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {pending ? 'Kaydediliyor…' : duzenleme ? 'Kaydet' : 'Oluştur'}
            </button>
            <Link
              href={duzenleme && kayitId ? `/bildirim/yari-zamanli-calisma/${kayitId}` : '/bildirim/yari-zamanli-calisma'}
              className="text-sm text-slate-600 hover:text-slate-800"
            >
              İptal
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Dilekçe Önizleme</h2>
            {onizlemeAlanlar ? (
              <div className="text-sm text-slate-800 space-y-4 font-serif leading-relaxed">
                <div className="text-right text-slate-600">{onizlemeAlanlar.tarih}</div>
                <div className="text-center font-bold">{YZC_MAKAM}</div>
                <div className="text-center text-slate-600">{YZC_BIRIM}</div>
                <p className="text-justify indent-8">{onizlemeAlanlar.metin}</p>
                <div className="pt-6 border-t border-dashed border-slate-300 text-right">
                  <div className="font-mono text-xs">{onizlemeAlanlar.tckn}</div>
                  <div className="font-bold mt-1">{onizlemeAlanlar.ad_soyad.toLocaleUpperCase('tr-TR')}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Zorunlu alanları doldurduğunuzda dilekçe metni burada görünür.</p>
            )}
          </div>

          {onizlemeAlanlar ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-700 space-y-2">
              <h2 className="text-sm font-semibold text-slate-700 mb-2">Ek Önizleme — Personel Bilgileri</h2>
              <p>
                <span className="text-slate-500">Başlangıç:</span> {onizlemeAlanlar.yari_zamanli_baslangic_tarihi}
              </p>
              <p>
                <span className="text-slate-500">Dönüş:</span> {onizlemeAlanlar.normal_zamanli_donus_tarihi}
              </p>
              <p className="text-xs text-slate-500 pt-2">
                PDF çıktısında ek form (çalışma programı tablosu ve açıklamalar) dilekçe ile birlikte tek sayfada üretilir.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
