'use client'

import { useState, useTransition, useMemo } from 'react'
import { personelSendikaTopluEkle } from '@/app/(dashboard)/bildirim/sendika/actions'
import { broadcastIntradaRefresh } from '@/lib/intrada-tab-sync'
import { kadroStatuSendikaGrubu } from '@/lib/sendika-statu'
import { ggAayyyyToIso } from '@/lib/tarih'
import Modal from '@/components/ui/Modal'

type Satir = { sendika_id: number | ''; baslangic_tarihi: string }

interface Props {
  personeller: { sicil_no: string; ad_soyad: string; statu: string | null }[]
  sendikalar: { id: number; statu: string; kisa_ad: string; uzun_ad: string }[]
  aktifUyelikBySicil?: Record<string, { baslangic: string; ad: string }>
}

function bosSatir(): Satir {
  return { sendika_id: '', baslangic_tarihi: '' }
}

export default function SendikaYeniClient({ personeller, sendikalar, aktifUyelikBySicil = {} }: Props) {
  const [sicilArama, setSicilArama] = useState('')
  const [secilenSicil, setSecilenSicil] = useState('')
  const [aramaAcik, setAramaAcik] = useState(false)
  const [satirlar, setSatirlar] = useState<Satir[]>([bosSatir()])
  const [istifaTarih, setIstifaTarih] = useState('')
  const [istifaUyari, setIstifaUyari] = useState(false)
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const secilen = personeller.find(p => p.sicil_no === secilenSicil)
  const aktifUyelik = secilenSicil ? aktifUyelikBySicil[secilenSicil] : undefined
  const sendikaGrubu = kadroStatuSendikaGrubu(secilen?.statu)

  const uygunSendikalar = useMemo(
    () => (sendikaGrubu ? sendikalar.filter(s => s.statu === sendikaGrubu) : []),
    [sendikalar, sendikaGrubu],
  )

  const filtreliPersonel = personeller
    .filter(
      p =>
        !sicilArama.trim() ||
        p.sicil_no.includes(sicilArama) ||
        p.ad_soyad.toLocaleLowerCase('tr-TR').includes(sicilArama.toLocaleLowerCase('tr-TR')),
    )
    .slice(0, 8)

  function satirEkle() {
    setSatirlar(s => [...s, bosSatir()])
  }

  function satirSil(idx: number) {
    setSatirlar(s => (s.length <= 1 ? s : s.filter((_, i) => i !== idx)))
  }

  function satirDegistir(idx: number, patch: Partial<Satir>) {
    setSatirlar(s => s.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  function kaydet() {
    setHata(null)
    if (!secilenSicil.trim()) {
      setHata('Personel seçin.')
      return
    }
    const dolu = satirlar.filter(s => s.sendika_id !== '' && Number(s.sendika_id) > 0)
    if (!dolu.length) {
      setHata('En az bir sendika seçin.')
      return
    }
    if (dolu.length > 1) {
      setHata('Bir personel için tek seferde bir sendika üyeliği açılır.')
      return
    }
    if (aktifUyelik && !/^\d{4}-\d{2}-\d{2}$/.test(istifaTarih)) {
      setIstifaUyari(true)
      return
    }
    if (aktifUyelik && istifaTarih < aktifUyelik.baslangic) {
      setHata('İstifa tarihi üyelik başlangıcından önce olamaz.')
      return
    }
    const yeniBaslangic = dolu[0]?.baslangic_tarihi.trim()
      ? ggAayyyyToIso(dolu[0].baslangic_tarihi.trim().replace(/\//g, '.'))
      : null
    if (aktifUyelik && yeniBaslangic && yeniBaslangic < istifaTarih) {
      setHata('Yeni üyelik, mevcut üyelik bitmeden başlayamaz.')
      return
    }
    startTransition(async () => {
      const res = await personelSendikaTopluEkle(
        dolu.map(s => ({
          sicil_no: secilenSicil,
          sendika_id: Number(s.sendika_id),
          baslangic_tarihi: s.baslangic_tarihi.trim() || null,
          istifa_tarihi: aktifUyelik ? istifaTarih : null,
        })),
      )
      if (res.hata) setHata(res.hata)
      else {
        broadcastIntradaRefresh('sendika')
        if (typeof window !== 'undefined' && window.opener) {
          try {
            window.opener.postMessage({ source: 'intrada-sendika-yeni', type: 'refresh' }, window.location.origin)
          } catch {
            window.opener.postMessage({ source: 'intrada-sendika-yeni', type: 'refresh' }, '*')
          }
        }
        if (typeof window !== 'undefined') window.close()
      }
    })
  }

  if (!sendikalar.length) {
    return (
      <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-4">
        Tanımlarda sendika kaydı yok. Önce Tanımlar → Sendika Bilgileri ekranından tanım ekleyin.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {hata && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{hata}</div>}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Personel</label>
        {secilen ? (
          <div className="flex items-center justify-between p-3 border border-green-300 bg-green-50 rounded-lg max-w-md">
            <div>
              <span className="font-medium text-slate-800">{secilen.ad_soyad}</span>
              <span className="text-xs text-slate-500 ml-2 font-mono">{secilen.sicil_no}</span>
              {secilen.statu && <span className="text-xs text-slate-500 ml-2">({secilen.statu})</span>}
            </div>
            <button type="button" onClick={() => setSecilenSicil('')} className="text-xs text-slate-600 hover:text-slate-900">
              Değiştir
            </button>
          </div>
        ) : (
          <div className="relative max-w-md">
            <input
              placeholder="İsim veya sicil ara…"
              value={sicilArama}
              onChange={e => {
                setSicilArama(e.target.value)
                setAramaAcik(true)
              }}
              onFocus={() => setAramaAcik(true)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            {aramaAcik && filtreliPersonel.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                {filtreliPersonel.map(p => (
                  <li key={p.sicil_no}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                      onClick={() => {
                        setSecilenSicil(p.sicil_no)
                        setAramaAcik(false)
                        setSicilArama('')
                        setSatirlar([bosSatir()])
                        setIstifaTarih('')
                      }}
                    >
                      {p.ad_soyad} <span className="text-slate-400 font-mono text-xs">{p.sicil_no}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {secilen && !sendikaGrubu && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Bu personelin statüsü için sendika tanımı eşleşmesi bulunamadı (Memur/Sözleşmeli veya İşçi/Geçici İşçi).
        </p>
      )}

      {secilen && sendikaGrubu && (
        <>
          <p className="text-xs text-slate-500">
            {sendikaGrubu} sendikası seçenekleri listelenir.
            {aktifUyelik
              ? ' Açık üyelik varsa istifa tarihi olmadan yeni üyelik açılmaz. Bu tarih dilekçe oluşturmaz.'
              : ' Açık üyelik yok.'}
          </p>
          {aktifUyelik && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-sm text-amber-950">
                Mevcut üyelik: <span className="font-medium">{aktifUyelik.ad || '—'}</span>
              </p>
              <label className="flex flex-col gap-1 text-xs text-slate-700 max-w-xs">
                <span className="font-medium">Mevcut üyeliğin istifa tarihi</span>
                <input
                  type="date"
                  value={istifaTarih}
                  onChange={e => setIstifaTarih(e.target.value)}
                  className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                />
              </label>
            </div>
          )}
          <div className="space-y-3">
            {satirlar.map((satir, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/60">
                <label className="flex flex-col gap-1 text-xs text-slate-600 flex-1 min-w-[12rem]">
                  <span className="font-medium">Sendika</span>
                  <select
                    className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                    value={satir.sendika_id}
                    onChange={e =>
                      satirDegistir(idx, { sendika_id: e.target.value ? Number(e.target.value) : '' })
                    }
                  >
                    <option value="">Seçin…</option>
                    {uygunSendikalar.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.kisa_ad}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs text-slate-600 w-36">
                  <span className="font-medium">Başlangıç (ops.)</span>
                  <input
                    type="text"
                    placeholder="GG.AA.YYYY"
                    className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                    value={satir.baslangic_tarihi}
                    onChange={e => satirDegistir(idx, { baslangic_tarihi: e.target.value })}
                  />
                </label>
                {satirlar.length > 1 && (
                  <button type="button" onClick={() => satirSil(idx)} className="text-red-600 text-xs font-medium px-2 py-1">
                    Kaldır
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 justify-between">
            <button type="button" onClick={satirEkle} className="text-sm border border-slate-300 rounded-lg px-3 py-2">
              + Satır ekle
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={kaydet}
              className="text-sm bg-slate-800 text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </>
      )}
      <Modal open={istifaUyari} onClose={() => setIstifaUyari(false)} title="İstifa tarihi gerekli" size="md">
        <p className="text-sm text-slate-700 leading-relaxed">
          Mevcut sendika üyeliğinin istifa tarihini işlemeden yeni bir sendika üyeliği oluşturulamaz.
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setIstifaUyari(false)}
            className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg"
          >
            Tamam
          </button>
        </div>
      </Modal>
    </div>
  )
}
