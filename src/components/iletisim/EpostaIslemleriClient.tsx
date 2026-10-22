'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { epostaEkAdresiAction, epostaGonderAction, epostaKisiAraAction, epostaListeAction, epostaOkuAction } from '@/app/(dashboard)/iletisim-yonetimi/e-posta-islemleri/actions'
import { createClient } from '@/lib/supabase/client'
import type { EpostaKutu, EpostaMesaj, EpostaOzet } from '@/lib/eposta-tipler'
import { EPOSTA_EK_LIMIT_BAYT, EPOSTA_EK_LIMIT_YAZI, epostaBoyutYazi } from '@/lib/eposta-limit'

function AliciKutusu({
  etiket,
  value,
  onChange,
  placeholder,
}: {
  etiket: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [oneriler, setOneriler] = useState<{ ad: string; eposta: string }[]>([])
  const parca = value.split(/[;,\n]/).pop()?.trim() ?? ''

  useEffect(() => {
    if (parca.length < 2 || parca.includes('@')) {
      setOneriler([])
      return
    }
    const zaman = setTimeout(() => {
      void epostaKisiAraAction(parca).then(res => setOneriler(res.kisiler))
    }, 250)
    return () => clearTimeout(zaman)
  }, [parca])

  function sec(kisi: { ad: string; eposta: string }) {
    const oncekiler = value
      .split(/[;,\n]/)
      .slice(0, -1)
      .map(s => s.trim())
      .filter(Boolean)
    onChange([...oncekiler, `${kisi.ad} <${kisi.eposta}>`].join(', ') + ', ')
    setOneriler([])
  }

  return (
    <label className="relative block text-sm">
      <span className="text-slate-600">{etiket}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        autoComplete="off"
      />
      {oneriler.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {oneriler.map(kisi => (
            <li key={kisi.eposta}>
              <button type="button" onClick={() => sec(kisi)} className="w-full px-3 py-2 text-left hover:bg-slate-50">
                <span className="block text-sm text-slate-800">{kisi.ad}</span>
                <span className="block text-xs text-slate-500">{kisi.eposta}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </label>
  )
}

const KUTULAR: { id: EpostaKutu; ad: string }[] = [
  { id: 'gelen', ad: 'Gelen' },
  { id: 'giden', ad: 'Gönderilmiş' },
  { id: 'spam', ad: 'Spam' },
]

interface Props {
  hazir: boolean
  imza: string
  adres: string
}

type YazMod = 'yeni' | 'yanit' | 'ilet'

function alintiOlustur(mesaj: EpostaMesaj, ilet: boolean): string {
  const baslik = ilet ? '----- İletilen ileti -----' : '----- Özgün ileti -----'
  const govde = (mesaj.metin || '').trim().slice(0, 12_000)
  return [baslik, `Kimden: ${mesaj.kim}`, `Tarih: ${mesaj.tarih}`, `Konu: ${mesaj.konu}`, '', govde].join('\n')
}

function konuHazir(konu: string, onek: string): string {
  const s = konu.trim()
  if (s.toLocaleLowerCase('tr-TR').startsWith(onek.toLocaleLowerCase('tr-TR'))) return s
  return `${onek} ${s}`.trim()
}

export default function EpostaIslemleriClient({ hazir, imza, adres }: Props) {
  const [kutu, setKutu] = useState<EpostaKutu>('gelen')
  const [satirlar, setSatirlar] = useState<EpostaOzet[]>([])
  const [listeHata, setListeHata] = useState<string | null>(null)
  const [klasorYok, setKlasorYok] = useState(false)
  const [mesaj, setMesaj] = useState<EpostaMesaj | null>(null)
  const [okuHata, setOkuHata] = useState<string | null>(null)
  const [yaz, setYaz] = useState<YazMod | null>(null)
  const [kime, setKime] = useState('')
  const [bilgi, setBilgi] = useState('')
  const [gizli, setGizli] = useState('')
  const [konu, setKonu] = useState('')
  const [metin, setMetin] = useState('')
  const [alinti, setAlinti] = useState('')
  const [messageId, setMessageId] = useState('')
  const [ekler, setEkler] = useState<File[]>([])
  const [gonderHata, setGonderHata] = useState<string | null>(null)
  const [gonderOk, setGonderOk] = useState<string | null>(null)
  const [listeYukleniyor, setListeYukleniyor] = useState(hazir)
  const [gelenOkunmamis, setGelenOkunmamis] = useState(0)
  const [, listeBaslat] = useTransition()
  const [okuBekliyor, okuBaslat] = useTransition()
  const [gonderBekliyor, gonderBaslat] = useTransition()

  const ekToplam = useMemo(() => ekler.reduce((s, f) => s + f.size, 0), [ekler])
  const ekAsildi = ekToplam > EPOSTA_EK_LIMIT_BAYT

  function listeyiYukle(hedef: EpostaKutu) {
    if (!hazir) {
      setListeYukleniyor(false)
      return
    }
    setListeYukleniyor(true)
    setSatirlar([])
    setMesaj(null)
    setListeHata(null)
    setKlasorYok(false)
    listeBaslat(async () => {
      const res = await epostaListeAction(hedef)
      setListeYukleniyor(false)
      if (res.hata) {
        setListeHata(res.hata)
        return
      }
      const gelen = res.satirlar ?? []
      setSatirlar(gelen)
      setKlasorYok(Boolean(res.klasorYok))
      if (hedef === 'gelen') setGelenOkunmamis(gelen.filter(s => s.okunmadi).length)
    })
  }

  useEffect(() => {
    listeyiYukle(kutu)
    // kutu değişince liste boşalır ve yeniden yüklenir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kutu, hazir])

  function ac(uid: string) {
    setOkuHata(null)
    setYaz(null)
    okuBaslat(async () => {
      const res = await epostaOkuAction(kutu, uid)
      if (res.hata || !res.mesaj) {
        setMesaj(null)
        setOkuHata(res.hata ?? 'Mektup açılamadı.')
        return
      }
      setMesaj(res.mesaj)
      setSatirlar(once => once.map(s => (s.uid === uid ? { ...s, okunmadi: false } : s)))
      if (kutu === 'gelen') {
        const acilan = satirlar.find(s => s.uid === uid)
        if (acilan?.okunmadi) setGelenOkunmamis(n => Math.max(0, n - 1))
      }
    })
  }

  function yazAc(mod: YazMod) {
    setGonderHata(null)
    setGonderOk(null)
    setEkler([])
    setBilgi('')
    setGizli('')
    setMetin('')
    if (mod === 'yeni' || !mesaj) {
      setYaz('yeni')
      setKime('')
      setKonu('')
      setAlinti('')
      setMessageId('')
      return
    }
    setYaz(mod)
    setMessageId(mesaj.messageId)
    if (mod === 'yanit') {
      const kimden = mesaj.kim.match(/<([^>]+)>/)?.[1] ?? mesaj.kim
      setKime(kimden.trim())
      setKonu(konuHazir(mesaj.konu, 'Ynt:'))
      setAlinti(alintiOlustur(mesaj, false))
    } else {
      setKime('')
      setKonu(konuHazir(mesaj.konu, 'İlt:'))
      setAlinti(alintiOlustur(mesaj, true))
    }
  }

  function gonder(e: React.FormEvent) {
    e.preventDefault()
    if (ekAsildi) return
    setGonderHata(null)
    setGonderOk(null)
    const fd = new FormData()
    fd.set('mod', yaz ?? 'yeni')
    fd.set('kime', kime)
    fd.set('bilgi', bilgi)
    fd.set('gizli', gizli)
    fd.set('konu', konu)
    fd.set('metin', metin)
    fd.set('alinti', yaz === 'yeni' ? '' : alinti)
    fd.set('messageId', yaz === 'yanit' ? messageId : '')
    gonderBaslat(async () => {
      if (ekler.length) {
        const supabase = createClient()
        for (const f of ekler) {
          const hazir = await epostaEkAdresiAction(f.name, f.size)
          if (hazir.hata || !hazir.path || !hazir.token) {
            setGonderHata(hazir.hata ?? 'Ek için yükleme adresi alınamadı.')
            return
          }
          const { error } = await supabase.storage.from('eposta-ek').uploadToSignedUrl(hazir.path, hazir.token, f, {
            contentType: f.type || 'application/octet-stream',
          })
          if (error) {
            setGonderHata(error.message)
            return
          }
          fd.append('ek_yol', hazir.path)
          fd.append('ek_ad', f.name)
        }
      }
      const res = await epostaGonderAction(fd)
      if (res.hata) {
        setGonderHata(res.hata)
        return
      }
      setGonderOk(res.uyari ?? 'Mektup gönderildi.')
      setYaz(null)
      if (kutu === 'giden') listeyiYukle('giden')
    })
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {KUTULAR.map(k => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKutu(k.id)}
              className={`px-4 py-2 text-sm font-medium inline-flex items-center gap-2 ${kutu === k.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {k.ad}
              {k.id === 'gelen' && gelenOkunmamis > 0 && (
                <span className={`min-w-5 rounded-full px-1.5 text-xs font-semibold ${kutu === 'gelen' ? 'bg-white text-slate-800' : 'bg-sky-600 text-white'}`}>
                  {gelenOkunmamis}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => yazAc('yeni')}
            disabled={!hazir}
            className="px-3 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50"
          >
            Yeni e-posta
          </button>
          <Link href="/iletisim-yonetimi/tanimlar" className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50">
            Tanımlar
          </Link>
        </div>
      </div>

      {!hazir && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          Kutu kapalı veya şifre yok.{' '}
          <Link href="/iletisim-yonetimi/tanimlar" className="font-medium underline">
            Tanımlar
          </Link>{' '}
          ekranından şifreyi yazıp kutuyu açın. Gönderen adres: {adres}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden min-h-80">
          {listeYukleniyor ? (
            <p className="px-4 py-16 text-center text-sm text-slate-500">Yükleniyor…</p>
          ) : (
            <>
          {listeHata && <p className="px-4 py-3 text-sm text-red-600">{listeHata}</p>}
          {klasorYok && <p className="px-4 py-3 text-sm text-slate-500">Sunucuda bu klasör yok.</p>}
          {!listeHata && !klasorYok && satirlar.length === 0 && hazir && (
            <p className="px-4 py-3 text-sm text-slate-500">Bu kutuda mektup yok.</p>
          )}
          <ul className="divide-y divide-slate-100 max-h-[36rem] overflow-auto">
            {satirlar.map(s => (
              <li key={s.uid}>
                <button
                  type="button"
                  onClick={() => ac(s.uid)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${mesaj?.uid === s.uid ? 'bg-slate-50' : ''}`}
                >
                  <div className="flex justify-between gap-2 text-xs text-slate-500">
                    <span className={s.okunmadi ? 'font-semibold text-slate-800' : ''}>{s.kim}</span>
                    <span className="shrink-0">{s.tarih}</span>
                  </div>
                  <p className={`text-sm mt-0.5 truncate ${s.okunmadi ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{s.konu}</p>
                </button>
              </li>
            ))}
          </ul>
            </>
          )}
        </div>

        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 min-h-80">
          {yaz ? (
            <form onSubmit={gonder} className="space-y-3">
              <h2 className="text-base font-semibold text-slate-800">
                {yaz === 'yeni' ? 'Yeni e-posta' : yaz === 'yanit' ? 'Yanıtla' : 'İlet'}
              </h2>
              <AliciKutusu
                etiket="Kime"
                value={kime}
                onChange={setKime}
                placeholder="personel adı veya e-posta; birden fazlaysa virgül"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AliciKutusu etiket="Bilgi" value={bilgi} onChange={setBilgi} placeholder="ad veya e-posta" />
                <AliciKutusu etiket="Gizli" value={gizli} onChange={setGizli} placeholder="ad veya e-posta" />
              </div>
              <label className="block text-sm">
                <span className="text-slate-600">Konu</span>
                <input value={konu} onChange={e => setKonu(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Metin</span>
                <textarea value={metin} onChange={e => setMetin(e.target.value)} rows={8} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </label>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Ek</label>
                <input
                  type="file"
                  multiple
                  onChange={e => setEkler(Array.from(e.target.files ?? []))}
                  className="block w-full cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-blue-800 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
                />
                <p className={`mt-1 text-xs ${ekAsildi ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                  Ek sınırı {EPOSTA_EK_LIMIT_YAZI}. Seçilen: {epostaBoyutYazi(ekToplam)}.
                  {ekAsildi ? ' Sınır aşıldı; göndermeden önce ekleri küçültün veya çıkarın.' : ''}
                </p>
                {ekler.length > 0 && (
                  <ul className="mt-1 text-xs text-slate-600">
                    {ekler.map(f => (
                      <li key={f.name + f.size}>
                        {f.name} · {epostaBoyutYazi(f.size)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {imza && (
                <pre className="whitespace-pre-wrap text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{imza}</pre>
              )}
              {alinti && (
                <pre className="whitespace-pre-wrap text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 max-h-40 overflow-auto">{alinti}</pre>
              )}
              {gonderHata && <p className="text-sm text-red-600">{gonderHata}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={gonderBekliyor || ekAsildi}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg disabled:opacity-50"
                >
                  {gonderBekliyor ? 'Gönderiliyor…' : 'Gönder'}
                </button>
                <button type="button" onClick={() => setYaz(null)} className="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg">
                  Vazgeç
                </button>
              </div>
            </form>
          ) : (
            <div>
              {okuBekliyor && <p className="text-sm text-slate-500">Mektup açılıyor…</p>}
              {okuHata && <p className="text-sm text-red-600">{okuHata}</p>}
              {!mesaj && !okuBekliyor && <p className="text-sm text-slate-500">Okumak için soldan bir mektup seçin.</p>}
              {mesaj && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => yazAc('yanit')} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
                      Yanıtla
                    </button>
                    <button type="button" onClick={() => yazAc('ilet')} className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
                      İlet
                    </button>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">{mesaj.konu}</h2>
                  <p className="text-sm text-slate-600">Kimden: {mesaj.kim}</p>
                  {mesaj.kime && <p className="text-sm text-slate-600">Kime: {mesaj.kime}</p>}
                  <p className="text-xs text-slate-400">{mesaj.tarih}</p>
                  {mesaj.html ? (
                    <iframe
                      title="Mektup"
                      sandbox=""
                      srcDoc={mesaj.html}
                      className="w-full min-h-80 border border-slate-200 rounded-lg bg-white"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-slate-800">{mesaj.metin || '(boş mektup)'}</pre>
                  )}
                  {mesaj.ekler.length > 0 && (
                    <ul className="text-sm space-y-1">
                      {mesaj.ekler.map(ek => (
                        <li key={ek.sira}>
                          <a
                            className="text-slate-800 underline"
                            href={`/api/iletisim/eposta/ek?kutu=${kutu}&uid=${mesaj.uid}&sira=${ek.sira}`}
                          >
                            {ek.ad}
                          </a>
                          <span className="text-slate-400"> · {epostaBoyutYazi(ek.boyut)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {gonderOk && <p className="mt-3 text-sm text-green-700">{gonderOk}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
