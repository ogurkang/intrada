'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import {
  GozDetayLink,
  IndirLink,
  KalemDuzenleLink,
  SaatGecmisDugmesi,
  YenidenHesaplaDugmesi,
} from '@/components/ui/TabloIslemIkonlari'
import AnketGecmisPanel from '@/components/anket/AnketGecmisPanel'
import { anketDurumEtiket } from '@/lib/anket'
import { anketLogGetir, anketSifirla, anketYayinDegistir, type AnketLogSatir } from '@/app/(dashboard)/anket-yonetimi/actions'

export type AnketListeSatir = {
  id: string
  baslik: string
  kod: string
  durum: string
  soruSayisi: number
  cevapSayisi: number
  logSayisi: number
}

const IKON = 'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors disabled:opacity-40'

export default function AnketListeClient({
  satirlar,
  tur,
}: {
  satirlar: AnketListeSatir[]
  tur: 'anket' | 'rapor'
}) {
  const router = useRouter()
  const [logAcik, setLogAcik] = useState(false)
  const [logBaslik, setLogBaslik] = useState('Değişiklik Geçmişi')
  const [loglar, setLoglar] = useState<AnketLogSatir[]>([])
  const [logHata, setLogHata] = useState<string | null>(null)
  const [logYukleniyor, setLogYukleniyor] = useState(false)
  const [sifirlanacak, setSifirlanacak] = useState<AnketListeSatir | null>(null)
  const [mesgul, setMesgul] = useState(false)
  const [hata, setHata] = useState<string | null>(null)

  async function logAc(satir: AnketListeSatir) {
    setLogBaslik(`${satir.baslik} geçmişi`)
    setLogAcik(true)
    setLogYukleniyor(true)
    setLogHata(null)
    setLoglar([])
    const sonuc = await anketLogGetir(satir.id)
    setLogYukleniyor(false)
    if (sonuc.hata) setLogHata(sonuc.hata)
    else setLoglar(sonuc.satirlar)
  }

  async function yayin(satir: AnketListeSatir) {
    if (mesgul) return
    setMesgul(true)
    setHata(null)
    const sonuc = await anketYayinDegistir(satir.id, satir.durum !== 'yayinda')
    setMesgul(false)
    if (sonuc.hata) {
      setHata(sonuc.hata)
      return
    }
    router.refresh()
  }

  async function sifirla() {
    if (!sifirlanacak || mesgul) return
    setMesgul(true)
    setHata(null)
    const sonuc = await anketSifirla(sifirlanacak.id)
    setMesgul(false)
    setSifirlanacak(null)
    if (sonuc.hata) {
      setHata(sonuc.hata)
      return
    }
    router.refresh()
  }

  return (
    <>
      {hata ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{hata}</p> : null}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Başlık</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Durum</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Kod</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Soru</th>
                {tur === 'rapor' ? <th className="text-left px-4 py-3 font-semibold text-slate-700">Cevap</th> : null}
                <th className="text-center px-4 py-3 font-semibold text-slate-700 w-52">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {satirlar.length === 0 ? (
                <tr>
                  <td colSpan={tur === 'rapor' ? 6 : 5} className="px-4 py-10 text-center text-slate-400">
                    Henüz anket yok.
                  </td>
                </tr>
              ) : satirlar.map(satir => {
                const detay = tur === 'rapor'
                  ? `/anket-yonetimi/raporlar/${satir.id}`
                  : `/anket-yonetimi/anketler/${satir.id}`
                const duzenle = `/anket-yonetimi/anketler/${satir.id}?duzenle=1`
                const yayinda = satir.durum === 'yayinda'
                return (
                  <tr key={satir.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{satir.baslik}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${yayinda ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                        {anketDurumEtiket(satir.durum)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">{satir.kod}</td>
                    <td className="px-4 py-3 text-slate-700">{satir.soruSayisi}</td>
                    {tur === 'rapor' ? <td className="px-4 py-3 text-slate-700">{satir.cevapSayisi}</td> : null}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <SaatGecmisDugmesi sayi={satir.logSayisi} onClick={() => logAc(satir)} title="İşlem geçmişi" />
                        {tur === 'anket' ? (
                          <button
                            type="button"
                            disabled={mesgul}
                            onClick={() => yayin(satir)}
                            className={`${IKON} ${yayinda ? 'text-emerald-700 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                            title={yayinda ? 'Yayını kaldır' : 'Yayınla'}
                            aria-label={yayinda ? 'Yayını kaldır' : 'Yayınla'}
                          >
                            {yayinda ? <DurdurSvg /> : <YayinSvg />}
                          </button>
                        ) : null}
                        <KalemDuzenleLink href={duzenle} title="Düzenle" />
                        <GozDetayLink href={detay} title="Detay" />
                        {tur === 'anket' ? (
                          <YenidenHesaplaDugmesi onClick={() => setSifirlanacak(satir)} disabled={mesgul} title="Anketi sıfırla" />
                        ) : (
                          <IndirLink href={`/api/anket-yonetimi/rapor/pdf?id=${satir.id}`} title="PDF indir" />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnketGecmisPanel
        acik={logAcik}
        onKapat={() => setLogAcik(false)}
        loglar={loglar}
        baslik={logBaslik}
        yukleniyor={logYukleniyor}
        hata={logHata}
      />

      <Modal open={sifirlanacak != null} onClose={() => !mesgul && setSifirlanacak(null)} title="Anketi sıfırla" size="md">
        <p className="text-sm text-slate-700 leading-relaxed">
          Bu işlem anketin tüm cevaplarını siler. Sorular ve anket adı durur. Sıfırlamayı onaylıyor musunuz?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setSifirlanacak(null)} disabled={mesgul} className="px-3 py-1.5 text-sm text-slate-600">
            Hayır
          </button>
          <button type="button" onClick={() => void sifirla()} disabled={mesgul} className="px-3 py-1.5 text-sm bg-red-700 text-white rounded-lg disabled:opacity-50">
            {mesgul ? 'Sıfırlanıyor…' : 'Tamam'}
          </button>
        </div>
      </Modal>
    </>
  )
}

function YayinSvg() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5v14l11-7L8 5z" />
    </svg>
  )
}

function DurdurSvg() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  )
}
