'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import SmsMesajGonderKutusu from './SmsMesajGonderKutusu'
import { smsGonderAction } from '@/app/(dashboard)/iletisim-yonetimi/sms-islemleri/actions'
import { grupSil, grupUyeleriKaydet, grupYenidenAdlandir } from '@/app/(dashboard)/iletisim-yonetimi/sms-islemleri/grup/actions'
import type { SmsGrup } from '@/lib/sms-grup'
import type { SmsPersonelSatir, SmsSablonSecenek } from '@/lib/sms-islemleri-tipleri'

interface Props {
  grup: SmsGrup
  personeller: SmsPersonelSatir[]
  sablonlar: SmsSablonSecenek[]
  originatorlar: string[]
  gonderimAcik: boolean
}

function benzersizSirali(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'))
}

export default function SmsGrupDetayClient({ grup, personeller, sablonlar, originatorlar, gonderimAcik }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mesaj, setMesaj] = useState<string | null>(null)

  const [uyeler, setUyeler] = useState<string[]>(grup.uyeler)
  const [solArama, setSolArama] = useState('')
  const [sagArama, setSagArama] = useState('')
  const [solMudurluk, setSolMudurluk] = useState('')

  const personelById = useMemo(() => new Map(personeller.map(p => [p.sicil_no, p])), [personeller])
  const uyeSet = useMemo(() => new Set(uyeler), [uyeler])
  const mudurlukler = useMemo(() => benzersizSirali(personeller.map(p => p.mudurluk)), [personeller])

  const kaydedildiMi = useMemo(() => {
    const a = [...grup.uyeler].sort()
    const b = [...uyeler].sort()
    return a.length === b.length && a.every((x, i) => x === b[i])
  }, [grup.uyeler, uyeler])

  const solAdaylar = useMemo(() => {
    const q = solArama.trim().toLocaleLowerCase('tr-TR')
    return personeller.filter(p => {
      if (uyeSet.has(p.sicil_no)) return false
      if (solMudurluk && p.mudurluk !== solMudurluk) return false
      if (!q) return true
      return p.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) || p.sicil_no.includes(q)
    })
  }, [personeller, uyeSet, solArama, solMudurluk])

  const sagUyeler = useMemo(() => {
    const q = sagArama.trim().toLocaleLowerCase('tr-TR')
    const list = uyeler.map(s => personelById.get(s)).filter((p): p is SmsPersonelSatir => !!p)
    if (!q) return list
    return list.filter(p => p.ad_soyad.toLocaleLowerCase('tr-TR').includes(q) || p.sicil_no.includes(q))
  }, [uyeler, personelById, sagArama])

  const gecerliUyeler = useMemo(
    () => uyeler.map(s => personelById.get(s)).filter((p): p is SmsPersonelSatir => !!p && p.telefon_gecerli).map(p => p.sicil_no),
    [uyeler, personelById],
  )

  function ekle(sicil: string) {
    setUyeler(prev => (prev.includes(sicil) ? prev : [...prev, sicil]))
  }
  function cikar(sicil: string) {
    setUyeler(prev => prev.filter(s => s !== sicil))
  }

  function uyeleriKaydet() {
    setMesaj(null)
    startTransition(async () => {
      const res = await grupUyeleriKaydet(grup.id, uyeler)
      if (res.hata) {
        setMesaj(res.hata)
        return
      }
      setMesaj('Grup üyeleri kaydedildi.')
      router.refresh()
    })
  }

  function adDuzenle() {
    const ad = window.prompt('Yeni grup adı', grup.ad)
    if (ad == null) return
    startTransition(async () => {
      const res = await grupYenidenAdlandir(grup.id, ad)
      if (res.hata) setMesaj(res.hata)
      else router.refresh()
    })
  }

  function sil() {
    if (!window.confirm(`«${grup.ad}» grubu silinsin mi?`)) return
    startTransition(async () => {
      const res = await grupSil(grup.id)
      if (res.hata) {
        setMesaj(res.hata)
        return
      }
      router.push('/iletisim-yonetimi/sms-islemleri/grup')
    })
  }

  return (
    <div className="space-y-4">
      {mesaj && <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg">{mesaj}</p>}

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-slate-500">{uyeler.length} üye · {gecerliUyeler.length} geçerli numara</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={adDuzenle} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
            Adı Düzenle
          </button>
          <button type="button" onClick={sil} className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
            Grubu Sil
          </button>
        </div>
      </div>

      {/* Üye ekleme: toplu güncelle yapısı */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm text-slate-600">
            Soldaki personel listesinden isme tıklayarak gruba ekleyin; sağdaki isimden çıkarın.
          </p>
          <button
            type="button"
            onClick={uyeleriKaydet}
            disabled={isPending || kaydedildiMi}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50"
          >
            {kaydedildiMi ? 'Kaydedildi' : isPending ? 'Kaydediliyor…' : 'Üyeleri Kaydet'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="border border-slate-200 rounded-lg">
            <div className="px-3 py-2 border-b bg-slate-50 text-sm font-medium text-slate-700">
              Personel Listesi ({solAdaylar.length})
            </div>
            <div className="p-2 border-b flex gap-2">
              <input
                type="search"
                value={solArama}
                onChange={e => setSolArama(e.target.value)}
                placeholder="Ad veya sicil ara…"
                className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <select
                value={solMudurluk}
                onChange={e => setSolMudurluk(e.target.value)}
                className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white max-w-[140px]"
              >
                <option value="">Tüm müdürlükler</option>
                {mudurlukler.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="max-h-[400px] overflow-auto p-2 space-y-1">
              {solAdaylar.map(p => (
                <button
                  type="button"
                  key={p.sicil_no}
                  onClick={() => ekle(p.sicil_no)}
                  className="w-full text-left text-sm p-2 rounded border border-transparent bg-white hover:bg-slate-50"
                >
                  {p.ad_soyad} <span className="text-slate-400">({p.sicil_no})</span>
                  {!p.telefon_gecerli && <span className="ml-1 text-xs text-red-500">telefon yok</span>}
                </button>
              ))}
              {!solAdaylar.length && <p className="py-6 text-center text-xs text-slate-400">Sonuç yok.</p>}
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg">
            <div className="px-3 py-2 border-b bg-slate-50 text-sm font-medium text-slate-700">
              Grup Üyeleri ({uyeler.length})
            </div>
            <div className="p-2 border-b">
              <input
                type="search"
                value={sagArama}
                onChange={e => setSagArama(e.target.value)}
                placeholder="Üyelerde ara…"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="max-h-[400px] overflow-auto p-2 space-y-1">
              {sagUyeler.map(p => (
                <div
                  key={p.sicil_no}
                  className="flex items-center justify-between gap-2 text-sm p-2 rounded border border-slate-200 bg-white"
                >
                  <span>
                    {p.ad_soyad} <span className="text-slate-400">({p.sicil_no})</span>
                    {!p.telefon_gecerli && <span className="ml-1 text-xs text-red-500">telefon yok</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => cikar(p.sicil_no)}
                    className="px-2 py-0.5 text-xs rounded border border-slate-300 text-slate-500 hover:bg-slate-100"
                  >
                    Çıkar
                  </button>
                </div>
              ))}
              {!sagUyeler.length && <p className="py-6 text-center text-xs text-slate-400">Üye yok.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Mesaj gönder */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Gruba mesaj gönder</h3>
        {!kaydedildiMi && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
            Üye listesinde kaydedilmemiş değişiklikler var. Mesaj, ekrandaki güncel üye listesine gönderilir.
          </p>
        )}
        <SmsMesajGonderKutusu
          sablonlar={sablonlar}
          izinliTurler={['genel', 'dogum_gunu', 'hosgeldin_bebek', 'evlilik']}
          originatorlar={originatorlar}
          baglam="grup"
          sicilNolar={gecerliUyeler}
          gonderimAcik={gonderimAcik}
          onGonder={smsGonderAction}
        />
      </div>
    </div>
  )
}
