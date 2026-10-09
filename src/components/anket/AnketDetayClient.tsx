'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { anketDurumEtiket, anketLogEtiket, anketTipEtiket, anketZaman, type AnketSoruTipi } from '@/lib/anket'
import {
  anketBaslikGuncelle,
  anketSoruEkle,
  anketSoruGuncelle,
  anketSoruSil,
  anketSoruTasi,
  anketYayinDegistir,
  type AnketLogSatir,
} from '@/app/(dashboard)/anket-yonetimi/actions'
import { AnketSoruFormu, bosSoru, type SoruTaslak } from '@/components/anket/AnketSoruFormu'

const inputSinif =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-800'

export type AnketSoruSatir = {
  id: string
  sira: number
  metin: string
  tip: AnketSoruTipi
  secenekler: string[]
}

export default function AnketDetayClient({
  id,
  baslik,
  aciklama,
  kod,
  durum,
  link,
  duzenleAcik,
  sorular,
  loglar,
}: {
  id: string
  baslik: string
  aciklama: string
  kod: string
  durum: string
  link: string
  duzenleAcik: boolean
  sorular: AnketSoruSatir[]
  loglar: AnketLogSatir[]
}) {
  const router = useRouter()
  const [baslikAcik, setBaslikAcik] = useState(duzenleAcik)
  const [baslikForm, setBaslikForm] = useState(baslik)
  const [aciklamaForm, setAciklamaForm] = useState(aciklama)
  const [hata, setHata] = useState<string | null>(null)
  const [mesgul, setMesgul] = useState(false)
  const [kopya, setKopya] = useState(false)
  const [logAcik, setLogAcik] = useState(false)
  const [soruLog, setSoruLog] = useState<string | null>(null)
  const [ekleAcik, setEkleAcik] = useState(false)
  const [yeniSoru, setYeniSoru] = useState<SoruTaslak>(bosSoru('yeni'))
  const [duzenlenen, setDuzenlenen] = useState<AnketSoruSatir | null>(null)
  const [duzenForm, setDuzenForm] = useState<SoruTaslak>(bosSoru('duzen'))
  const [silinecek, setSilinecek] = useState<AnketSoruSatir | null>(null)

  const yayinda = durum === 'yayinda'
  const gorunenLog = soruLog ? loglar.filter(l => l.soru_id === soruLog) : loglar

  async function calistir(islem: () => Promise<{ hata?: string }>, sonra?: () => void) {
    if (mesgul) return
    setMesgul(true)
    setHata(null)
    const sonuc = await islem()
    setMesgul(false)
    if (sonuc.hata) {
      setHata(sonuc.hata)
      return
    }
    sonra?.()
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
          {aciklama ? <p className="mt-1 max-w-3xl text-sm text-slate-600">{aciklama}</p> : null}
          <p className="mt-2">
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${yayinda ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
              {anketDurumEtiket(durum)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setBaslikAcik(v => !v)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 hover:bg-slate-50">
            Düzenle
          </button>
          <button type="button" onClick={() => { setSoruLog(null); setLogAcik(true) }} className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-800 hover:bg-slate-50">
            Log kaydı
          </button>
          <button
            type="button"
            disabled={mesgul}
            onClick={() => calistir(() => anketYayinDegistir(id, !yayinda))}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${yayinda ? 'border border-red-300 text-red-800 hover:bg-red-50' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
          >
            {yayinda ? 'Yayını kaldır' : 'Yayınla'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <p className="text-slate-500">Paylaşım kodu</p>
        <p className="mt-1 font-mono text-lg text-slate-900">{kod}</p>
        <p className="mt-3 text-slate-500">Link</p>
        <p className="mt-1 break-all text-slate-800">{link}</p>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link)
              setKopya(true)
            } catch {
              setHata('Link kopyalanamadı.')
            }
          }}
          className="mt-2 text-sm text-slate-700 underline"
        >
          {kopya ? 'Kopyalandı' : 'Linki kopyala'}
        </button>
        <p className="mt-2 text-slate-500">
          {yayinda
            ? 'Giriş ekranındaki anket alanına bu kod yazılabilir.'
            : 'Yayın durdurulduğu için link yeni cevap almaz.'}
        </p>
      </div>

      {baslikAcik ? (
        <form
          className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
          onSubmit={e => {
            e.preventDefault()
            void calistir(() => anketBaslikGuncelle(id, baslikForm, aciklamaForm), () => setBaslikAcik(false))
          }}
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Anket adı</span>
            <input value={baslikForm} onChange={e => setBaslikForm(e.target.value)} className={`${inputSinif} mt-1`} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Açıklama</span>
            <textarea value={aciklamaForm} onChange={e => setAciklamaForm(e.target.value)} rows={2} className={`${inputSinif} mt-1`} />
          </label>
          <button type="submit" disabled={mesgul} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm">Kaydet</button>
        </form>
      ) : null}

      {hata ? <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{hata}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Sıra</th>
              <th className="px-4 py-3 font-medium">Soru</th>
              <th className="px-4 py-3 font-medium">Cevap tipi</th>
              <th className="px-4 py-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {sorular.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Soru yok.</td>
              </tr>
            ) : sorular.map(soru => (
              <tr key={soru.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{soru.sira}</span>
                    <button type="button" title="Yukarı" onClick={() => calistir(() => anketSoruTasi(id, soru.id, 'yukari'))} className="text-slate-500">↑</button>
                    <button type="button" title="Aşağı" onClick={() => calistir(() => anketSoruTasi(id, soru.id, 'asagi'))} className="text-slate-500">↓</button>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-800">{soru.metin}</td>
                <td className="px-4 py-3 text-slate-700">{anketTipEtiket(soru.tip)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setSoruLog(soru.id); setLogAcik(true) }} className="text-slate-700 underline">Log</button>
                    <button
                      type="button"
                      onClick={() => {
                        setDuzenlenen(soru)
                        setDuzenForm({
                          anahtar: soru.id,
                          metin: soru.metin,
                          tip: soru.tip,
                          secenekler: soru.secenekler.length ? soru.secenekler : ['', ''],
                        })
                      }}
                      className="text-slate-700 underline"
                    >
                      Düzenle
                    </button>
                    <button type="button" onClick={() => setSilinecek(soru)} className="text-red-700 underline">Sil</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ekleAcik ? (
        <form
          className="space-y-3"
          onSubmit={e => {
            e.preventDefault()
            void calistir(
              () => anketSoruEkle(id, { metin: yeniSoru.metin, tip: yeniSoru.tip, secenekler: yeniSoru.secenekler }),
              () => {
                setEkleAcik(false)
                setYeniSoru(bosSoru(`yeni-${Date.now()}`))
              },
            )
          }}
        >
          <AnketSoruFormu sira={sorular.length + 1} deger={yeniSoru} onChange={setYeniSoru} />
          <div className="flex gap-2">
            <button type="submit" disabled={mesgul} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm">Soruyu kaydet</button>
            <button type="button" onClick={() => setEkleAcik(false)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">Vazgeç</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setEkleAcik(true)} className="text-sm font-medium text-slate-800 underline">
          Soru ekle
        </button>
      )}

      <Modal open={logAcik} onClose={() => setLogAcik(false)} title={soruLog ? 'Soru log kaydı' : 'Anket log kaydı'} size="lg">
        {gorunenLog.length === 0 ? <p className="text-sm text-slate-500">Kayıt yok.</p> : (
          <ul className="space-y-3">
            {gorunenLog.map(log => (
              <li key={log.id} className="border-b border-slate-100 pb-3 last:border-0">
                <p className="text-sm font-medium text-slate-800">{anketLogEtiket(log.islem)}</p>
                <p className="text-sm text-slate-600">{log.ozet}</p>
                <p className="mt-1 text-xs text-slate-500">{anketZaman(log.created_at)} · {log.yapan_ad || '—'}</p>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal open={duzenlenen !== null} onClose={() => setDuzenlenen(null)} title="Soruyu düzenle" size="lg">
        {duzenlenen ? (
          <form
            className="space-y-3"
            onSubmit={e => {
              e.preventDefault()
              void calistir(
                () => anketSoruGuncelle(id, duzenlenen.id, {
                  metin: duzenForm.metin,
                  tip: duzenForm.tip,
                  secenekler: duzenForm.secenekler,
                }),
                () => setDuzenlenen(null),
              )
            }}
          >
            <AnketSoruFormu sira={duzenlenen.sira} deger={duzenForm} onChange={setDuzenForm} />
            <button type="submit" disabled={mesgul} className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm">Kaydet</button>
          </form>
        ) : null}
      </Modal>

      <Modal open={silinecek !== null} onClose={() => setSilinecek(null)} title="Soruyu sil" size="sm">
        <p className="text-sm text-slate-700">Bu soru ve ona gelen cevaplar silinir.</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={mesgul}
            onClick={() => {
              if (!silinecek) return
              void calistir(() => anketSoruSil(id, silinecek.id), () => setSilinecek(null))
            }}
            className="px-3 py-2 rounded-lg bg-red-700 text-white text-sm"
          >
            Sil
          </button>
          <button type="button" onClick={() => setSilinecek(null)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">Vazgeç</button>
        </div>
      </Modal>
    </div>
  )
}
