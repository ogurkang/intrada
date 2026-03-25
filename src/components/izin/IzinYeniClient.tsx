'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { izinGunHesapla } from '@/app/(dashboard)/izin/actions'
import { broadcastIntradaRefresh } from '@/lib/intrada-tab-sync'

interface Personel { sicil_no: string; ad_soyad: string }

interface Props {
  yil: number
  personeller: Personel[]
  izinTurleri: string[]
  hakMap: Record<string, number>
  onEkle: (fd: FormData) => Promise<{ hata?: string }>
}

/** Takvim günü farkı (Yıllık İzin dışı türler için) */
function hesaplaGunBasit(ayrilis: string, baslama: string): number {
  if (!ayrilis || !baslama) return 0
  const a = new Date(ayrilis)
  const b = new Date(baslama)
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

export default function IzinYeniClient({
  yil, personeller, izinTurleri, hakMap, onEkle,
}: Props) {
  const router = useRouter()
  const [sicilArama, setSicilArama]   = useState('')
  const [secilenSicil, setSecilenSicil] = useState('')
  const [aramaAcik, setAramaAcik]     = useState(false)
  const [tur, setTur]                 = useState('')
  const [ayrilis, setAyrilis]         = useState('')
  const [baslama, setBaslama]         = useState('')
  const [gun, setGun]                 = useState(0)
  const [bilgi, setBilgi]             = useState('')
  const [hata, setHata]               = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  const isYillikIzin = tur === 'Yıllık İzin' || (tur && tur.includes('Yıllık'))

  useEffect(() => {
    if (!ayrilis || !baslama) { setGun(0); setBilgi(''); return }
    if (!isYillikIzin || !secilenSicil) {
      setGun(hesaplaGunBasit(ayrilis, baslama))
      setBilgi('')
      return
    }
    let cancelled = false
    izinGunHesapla(secilenSicil, tur, ayrilis, baslama).then(res => {
      if (!cancelled) {
        setGun(res.gun)
        setBilgi(res.bilgiler?.join('\n') ?? '')
      }
    })
    return () => { cancelled = true }
  }, [ayrilis, baslama, tur, secilenSicil, isYillikIzin])

  const filtreliPersonel = useMemo(() => {
    const q = sicilArama.toLowerCase()
    if (!q) return personeller.slice(0, 8)
    return personeller
      .filter(p => p.sicil_no.toLowerCase().includes(q) || p.ad_soyad.toLowerCase().includes(q))
      .slice(0, 8)
  }, [personeller, sicilArama])

  const secilenPersonel = personeller.find(p => p.sicil_no === secilenSicil)
  const kalanGun = secilenSicil ? (hakMap[secilenSicil] ?? null) : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    const fd = new FormData(e.currentTarget)
    fd.set('sicil_no', secilenSicil)
    fd.set('gun', String(gun))
    fd.set('yil', String(yil))
    startTransition(async () => {
      const res = await onEkle(fd)
      if (res.hata) {
        setHata(res.hata)
        return
      }
      broadcastIntradaRefresh('izin')
      if (typeof window !== 'undefined' && window.opener) {
        try {
          window.opener.postMessage({ source: 'intrada-izin-yeni', type: 'refresh' }, window.location.origin)
        } catch {
          window.opener.postMessage({ source: 'intrada-izin-yeni', type: 'refresh' }, '*')
        }
        window.close()
        setTimeout(() => {
          if (document.visibilityState === 'visible') router.push(`/izin?yil=${yil}`)
        }, 300)
      } else {
        router.push(`/izin?yil=${yil}`)
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Satır 1: Personel, Vekalet */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Personel <span className="text-red-500">*</span>
            </label>
            {secilenPersonel ? (
              <div className="flex items-center justify-between p-2.5 border border-green-300 bg-green-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-slate-800">{secilenPersonel.ad_soyad}</span>
                  <span className="text-xs text-slate-500 ml-2">{secilenPersonel.sicil_no}</span>
                  {kalanGun !== null && (
                    <span className="ml-3 text-xs bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-600">
                      Kalan: <strong>{kalanGun} gün</strong>
                    </span>
                  )}
                </div>
                <button type="button" onClick={() => { setSecilenSicil(''); setSicilArama('') }}
                  className="text-xs text-slate-500 hover:text-slate-700">Değiştir</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="İsim veya sicil no ile ara…"
                  value={sicilArama}
                  onChange={e => { setSicilArama(e.target.value); setAramaAcik(true) }}
                  onFocus={() => setAramaAcik(true)}
                  onBlur={() => setTimeout(() => setAramaAcik(false), 200)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                {aramaAcik && filtreliPersonel.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filtreliPersonel.map(p => (
                      <li key={p.sicil_no}>
                        <button type="button"
                          onMouseDown={() => { setSecilenSicil(p.sicil_no); setSicilArama(''); setAramaAcik(false) }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm">
                          <span className="font-medium text-slate-800">{p.ad_soyad}</span>
                          <span className="text-slate-400 text-xs ml-2">{p.sicil_no}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Vekalet Eden</label>
            <input name="vekalet" type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="Ad Soyad veya Sicil No" />
          </div>
        </div>

        {/* Satır 2: İzin türü, Ayrılış, Başlama, Gün hesabı */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              İzin Türü <span className="text-red-500">*</span>
            </label>
            <select name="tur" required value={tur} onChange={e => setTur(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
              <option value="">— Seçin —</option>
              {izinTurleri.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Ayrılış <span className="text-red-500">*</span>
            </label>
            <input name="ayrilis" type="date" required
              value={ayrilis} onChange={e => setAyrilis(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            <p className="text-xs text-slate-400 mt-0.5">İznin ilk günü</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Başlama <span className="text-red-500">*</span>
            </label>
            <input name="baslama" type="date" required
              value={baslama} onChange={e => setBaslama(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            <p className="text-xs text-slate-400 mt-0.5">İşe dönüş günü</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Gün <span className="text-red-500">*</span>
            </label>
            <input name="gun" type="number" min={1} required readOnly
              value={gun || ''}
              className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm font-semibold text-center text-slate-700" />
            <p className="text-xs text-slate-400 mt-0.5">Otomatik hesaplandı</p>
          </div>
        </div>

        {/* Satır 3: Açıklama */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Açıklama</label>
          <textarea name="aciklama" rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-500"
            placeholder="Gerekirse not ekleyin" />
        </div>

        {/* Satır 4: Bilgi */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Bilgi</label>
          <textarea name="bilgi" rows={3} value={bilgi} readOnly
            className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-sm resize-none text-slate-700"
            placeholder="Yıllık İzin için: Tatil bilgilendirme metni (örn. Ramazan Bayramı yıllık izninizden sayılmayacaktır.)" />
          <p className="text-xs text-slate-400 mt-0.5">Yıllık İzin türünde tatil ve personel için tanımlı ifadeler otomatik gösterilir.</p>
        </div>

        {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50">
            {isPending ? 'Kaydediliyor…' : 'Taslak Olarak Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
