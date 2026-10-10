'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { CopKutusuSilDugmesi, KalemDuzenleDugmesi, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import AnketGecmisPanel from '@/components/anket/AnketGecmisPanel'
import { anketDurumEtiket, anketTipEtiket, type AnketSoruTipi } from '@/lib/anket'
import {
  anketBaslikGuncelle,
  anketDemografiSorulariEkle,
  anketSoruEkle,
  anketSoruGuncelle,
  anketSoruSil,
  anketSorulariTopluSil,
  anketSoruTasi,
  anketYayinDegistir,
  type AnketLogSatir,
} from '@/app/(dashboard)/anket-yonetimi/actions'
import { AnketSoruFormu, bosSoru, type SoruTaslak } from '@/components/anket/AnketSoruFormu'
import { anketDemografiEksikler, type AnketDemografiSoru } from '@/lib/anket-demografi-sablon'

const inputSinif =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-800'

export type AnketSoruSatir = {
  id: string
  sira: number
  metin: string
  tip: AnketSoruTipi
  secenekler: string[]
  cevapSayisi: number
}

const CEVAPLI_SORU_UYARI =
  'Bu soruya verilmiş cevaplar var. Sorunun silinmesi anketin yorumlanmasını ve sonuçlarını etkileyebilir. Hala silmek istiyor musunuz?'

const CEVAPLI_DUZENLE_UYARI =
  'Bu soruya verilmiş cevaplar var. Sorunun düzenlenmesi anketin yorumlanmasını ve sonuçlarını etkileyebilir. Hala düzenlemek istiyor musunuz?'

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
  demografiSablon,
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
  demografiSablon: AnketDemografiSoru[]
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
  const [duzenUyari, setDuzenUyari] = useState(false)
  const [silinecek, setSilinecek] = useState<AnketSoruSatir | null>(null)
  const [secili, setSecili] = useState<string[]>([])
  const [topluAcik, setTopluAcik] = useState(false)

  const yayinda = durum === 'yayinda'
  const demografiEksik = anketDemografiEksikler(demografiSablon, sorular.map(s => s.metin))
  const gorunenLog = soruLog ? loglar.filter(l => l.soru_id === soruLog) : loglar

  function duzenlemeyiKaydet() {
    if (!duzenlenen) return
    void calistir(
      () => anketSoruGuncelle(id, duzenlenen.id, {
        metin: duzenForm.metin,
        tip: duzenForm.tip,
        secenekler: duzenForm.secenekler,
      }),
      () => {
        setDuzenUyari(false)
        setDuzenlenen(null)
      },
    )
  }

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
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${yayinda ? 'border border-red-300 text-red-800 hover:bg-red-50' : 'bg-blue-700 text-white hover:bg-blue-600'}`}
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
          <button type="submit" disabled={mesgul} className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50">Kaydet</button>
        </form>
      ) : null}

      {hata ? <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{hata}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium w-10">
                <input
                  type="checkbox"
                  aria-label="Tüm soruları seç"
                  checked={sorular.length > 0 && secili.length === sorular.length}
                  onChange={e => setSecili(e.target.checked ? sorular.map(s => s.id) : [])}
                />
              </th>
              <th className="px-4 py-3 font-medium">Sıra</th>
              <th className="px-4 py-3 font-medium">Soru</th>
              <th className="px-4 py-3 font-medium">Cevap tipi</th>
              <th className="px-4 py-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {sorular.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Soru yok.</td>
              </tr>
            ) : sorular.map(soru => (
              <tr key={soru.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`${soru.sira}. soruyu seç`}
                    checked={secili.includes(soru.id)}
                    onChange={e => setSecili(once => e.target.checked ? [...once, soru.id] : once.filter(x => x !== soru.id))}
                  />
                </td>
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
                  <div className="flex items-center gap-1">
                    <SaatGecmisDugmesi
                      sayi={loglar.filter(l => l.soru_id === soru.id).length}
                      onClick={() => { setSoruLog(soru.id); setLogAcik(true) }}
                      title="Soru geçmişi"
                    />
                    <KalemDuzenleDugmesi
                      onClick={() => {
                        setDuzenlenen(soru)
                        setDuzenForm({
                          anahtar: soru.id,
                          metin: soru.metin,
                          tip: soru.tip,
                          secenekler: soru.secenekler.length ? soru.secenekler : ['', ''],
                        })
                      }}
                      title="Düzenle"
                    />
                    <CopKutusuSilDugmesi onClick={() => setSilinecek(soru)} title="Sil" />
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
            <button type="submit" disabled={mesgul} className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50">Soruyu kaydet</button>
            <button type="button" onClick={() => setEkleAcik(false)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">Vazgeç</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={() => setEkleAcik(true)} className="text-sm font-medium text-blue-700 underline">
            Soru ekle
          </button>
          <button
            type="button"
            disabled={mesgul || demografiEksik.length === 0}
            onClick={() => void calistir(() => anketDemografiSorulariEkle(id))}
            className="text-sm font-medium text-blue-700 underline disabled:text-slate-400 disabled:no-underline"
          >
            Demografik soruları ekle
          </button>
          {secili.length > 0 ? (
            <button type="button" onClick={() => setTopluAcik(true)} className="text-sm font-medium text-red-700 underline">
              Seçilenleri sil ({secili.length})
            </button>
          ) : null}
        </div>
      )}
      <p className="text-xs text-slate-500">
        {demografiEksik.length === 0
          ? 'Demografik sorular bu ankette var. İstemediğinizi işaretleyip Seçilenleri sil deyin.'
          : 'Cinsiyet ve yaş kurumdaki gruplardan, öğrenim ve statü kayıtlı tanımlardan gelir. İstemediğinizi işaretleyip Seçilenleri sil deyin.'}
      </p>

      <AnketGecmisPanel
        acik={logAcik}
        onKapat={() => setLogAcik(false)}
        loglar={gorunenLog}
        baslik={soruLog ? 'Soru geçmişi' : 'Anket geçmişi'}
      />

      <Modal
        open={duzenlenen !== null}
        onClose={() => {
          if (mesgul) return
          setDuzenUyari(false)
          setDuzenlenen(null)
        }}
        title="Soruyu düzenle"
        size="lg"
      >
        {duzenlenen ? (
          <form
            className="space-y-3"
            onSubmit={e => {
              e.preventDefault()
              if (duzenlenen.cevapSayisi > 0) {
                setDuzenUyari(true)
                return
              }
              duzenlemeyiKaydet()
            }}
          >
            <AnketSoruFormu sira={duzenlenen.sira} deger={duzenForm} onChange={setDuzenForm} />
            <button type="submit" disabled={mesgul} className="px-3 py-2 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50">Kaydet</button>
          </form>
        ) : null}
      </Modal>

      <Modal open={duzenUyari} onClose={() => !mesgul && setDuzenUyari(false)} title="Soruyu düzenle" size="md">
        <p className="text-sm text-slate-700 leading-relaxed">{CEVAPLI_DUZENLE_UYARI}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setDuzenUyari(false)} disabled={mesgul} className="px-3 py-1.5 text-sm text-slate-600">
            Hayır
          </button>
          <button
            type="button"
            disabled={mesgul}
            onClick={() => duzenlemeyiKaydet()}
            className="px-3 py-1.5 text-sm bg-red-700 text-white rounded-lg disabled:opacity-50"
          >
            {mesgul ? 'Kaydediliyor…' : 'Hala düzenle'}
          </button>
        </div>
      </Modal>

      <Modal open={topluAcik} onClose={() => !mesgul && setTopluAcik(false)} title="Seçilen soruları sil" size="md">
        <p className="text-sm text-slate-700 leading-relaxed">
          {secili.some(sid => (sorular.find(s => s.id === sid)?.cevapSayisi ?? 0) > 0)
            ? CEVAPLI_SORU_UYARI
            : `Seçilen ${secili.length} soru silinir.`}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setTopluAcik(false)} disabled={mesgul} className="px-3 py-1.5 text-sm text-slate-600">
            Hayır
          </button>
          <button
            type="button"
            disabled={mesgul || secili.length === 0}
            onClick={() => {
              const idler = secili.slice()
              void calistir(() => anketSorulariTopluSil(id, idler), () => {
                setSecili([])
                setTopluAcik(false)
              })
            }}
            className="px-3 py-1.5 text-sm bg-red-700 text-white rounded-lg disabled:opacity-50"
          >
            {mesgul
              ? 'Siliniyor…'
              : secili.some(sid => (sorular.find(s => s.id === sid)?.cevapSayisi ?? 0) > 0)
                ? 'Hala sil'
                : 'Sil'}
          </button>
        </div>
      </Modal>

      <Modal open={silinecek !== null} onClose={() => !mesgul && setSilinecek(null)} title="Soruyu sil" size="md">
        <p className="text-sm text-slate-700 leading-relaxed">
          {silinecek && silinecek.cevapSayisi > 0 ? CEVAPLI_SORU_UYARI : 'Bu soru silinir.'}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setSilinecek(null)} disabled={mesgul} className="px-3 py-1.5 text-sm text-slate-600">
            Hayır
          </button>
          <button
            type="button"
            disabled={mesgul}
            onClick={() => {
              if (!silinecek) return
              void calistir(() => anketSoruSil(id, silinecek.id), () => setSilinecek(null))
            }}
            className="px-3 py-1.5 text-sm bg-red-700 text-white rounded-lg disabled:opacity-50"
          >
            {mesgul ? 'Siliniyor…' : silinecek && silinecek.cevapSayisi > 0 ? 'Hala sil' : 'Sil'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
