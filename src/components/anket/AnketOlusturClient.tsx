'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { anketOlustur } from '@/app/(dashboard)/anket-yonetimi/actions'
import { anketDemografiEksikler, type AnketDemografiSoru } from '@/lib/anket-demografi-sablon'
import { AnketSoruFormu, bosSoru, type SoruTaslak } from '@/components/anket/AnketSoruFormu'

const inputSinif =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-slate-800'

export default function AnketOlusturClient({ demografiSablon }: { demografiSablon: AnketDemografiSoru[] }) {
  const router = useRouter()
  const [baslik, setBaslik] = useState('')
  const [aciklama, setAciklama] = useState('')
  const [sorular, setSorular] = useState<SoruTaslak[]>([bosSoru('s1')])
  const [secili, setSecili] = useState<string[]>([])
  const [hata, setHata] = useState<string | null>(null)
  const [kaydediyor, setKaydediyor] = useState(false)

  function demografikEkle() {
    const eksik = anketDemografiEksikler(demografiSablon, sorular.map(s => s.metin))
    if (eksik.length === 0) {
      setHata('Bu demografik sorular listede zaten var. İstemediğinizi işaretleyip Seçilenleri çıkar deyin.')
      return
    }
    setHata(null)
    setSorular([
      ...sorular,
      ...eksik.map((soru, i) => ({
        anahtar: `demo-${Date.now()}-${i}`,
        metin: soru.metin,
        tip: soru.tip,
        secenekler: soru.secenekler,
      })),
    ])
  }

  function tasi(indeks: number, yon: -1 | 1) {
    const hedef = indeks + yon
    if (hedef < 0 || hedef >= sorular.length) return
    const sonraki = sorular.slice()
    const [alinan] = sonraki.splice(indeks, 1)
    sonraki.splice(hedef, 0, alinan)
    setSorular(sonraki)
  }

  async function kaydet(e: React.FormEvent) {
    e.preventDefault()
    if (kaydediyor) return
    setHata(null)
    setKaydediyor(true)
    const sonuc = await anketOlustur({
      baslik,
      aciklama,
      sorular: sorular.map(s => ({ metin: s.metin, tip: s.tip, secenekler: s.secenekler })),
    })
    setKaydediyor(false)
    if (sonuc.hata || !sonuc.id) {
      setHata(sonuc.hata ?? 'Kayıt açılamadı.')
      return
    }
    router.push(`/anket-yonetimi/anketler/${sonuc.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={kaydet} className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Anket adı</span>
          <input value={baslik} onChange={e => setBaslik(e.target.value)} className={`${inputSinif} mt-1`} required />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Açıklama</span>
          <textarea value={aciklama} onChange={e => setAciklama(e.target.value)} rows={2} className={`${inputSinif} mt-1`} />
        </label>
        <p className="text-sm text-slate-500">
          Anket durdurulmuş olarak kaydolur. Yayınla düğmesine basılınca link cevap alır. Cevaplarda ad ve sicil tutulmaz.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Sorular</h2>
          {secili.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setSorular(sorular.filter(s => !secili.includes(s.anahtar)))
                setSecili([])
              }}
              className="text-sm font-medium text-red-700 underline"
            >
              Seçilenleri çıkar ({secili.length})
            </button>
          ) : null}
        </div>
        {sorular.map((soru, indeks) => (
          <div key={soru.anahtar} className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={secili.includes(soru.anahtar)}
                onChange={e => setSecili(once => e.target.checked ? [...once, soru.anahtar] : once.filter(x => x !== soru.anahtar))}
              />
              Seç
            </label>
            <AnketSoruFormu
              sira={indeks + 1}
              deger={soru}
              onChange={sonraki => setSorular(sorular.map(s => s.anahtar === soru.anahtar ? sonraki : s))}
            />
            <div className="flex gap-3 text-sm">
              <button type="button" onClick={() => tasi(indeks, -1)} className="text-slate-600 hover:text-slate-900">Yukarı</button>
              <button type="button" onClick={() => tasi(indeks, 1)} className="text-slate-600 hover:text-slate-900">Aşağı</button>
              {sorular.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setSorular(sorular.filter(s => s.anahtar !== soru.anahtar))}
                  className="text-red-700 hover:text-red-900"
                >
                  Soruyu çıkar
                </button>
              ) : null}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setSorular([...sorular, bosSoru(`s${Date.now()}`)])}
            className="text-sm font-medium text-slate-800 underline"
          >
            Soru ekle
          </button>
          <button type="button" onClick={demografikEkle} className="text-sm font-medium text-blue-700 underline">
            Demografik soruları ekle
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Cinsiyet ve yaş kurumdaki gruplardan, öğrenim ve statü kayıtlı tanımlardan gelir. İstemediğiniz soruyu işaretleyip Seçilenleri çıkar deyin.
        </p>
      </div>

      {hata ? <p className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">{hata}</p> : null}

      <button
        type="submit"
        disabled={kaydediyor}
        className="px-4 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
      >
        {kaydediyor ? 'Kaydediliyor…' : 'Anketi kaydet'}
      </button>
    </form>
  )
}
