'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { KalemDuzenleDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { ickBelgeTuruKaydet } from '@/app/(dashboard)/ic-kontrol/actions'
import { ICK_BUTON, ICK_BUTON_IKINCIL, ICK_ETIKET, ICK_INPUT, ICK_TD, ICK_TH, IckKart, IckRozet, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ICK_ROL_ACIKLAMA, ICK_ROL_ETIKET, type IckRol } from '@/lib/ick/tanim'

type BelgeTuru = { id: number; ad: string; aciklama: string; sira: number; aktif: boolean }
type Bilesen = { id: number; kod: string; ad: string; sira: number }
type Standart = { id: number; bilesen_id: number; no: number; ad: string; aciklama: string }
type Sart = { id: number; standart_id: number; kod: string; sira: number; metin: string }

const SEKMELER = [
  { id: 'roller', ad: 'Roller' },
  { id: 'belge', ad: 'Belge Türleri' },
  { id: 'mevzuat', ad: 'Standartlar ve Genel Şartlar' },
] as const

export default function IckTanimlarClient(p: {
  yetki: { admin: boolean; koordinator: boolean }
  izleyiciler: { ad: string; gorev: string }[]
  turler: BelgeTuru[]
  bilesenler: Bilesen[]
  standartlar: Standart[]
  sartlar: Sart[]
}) {
  const router = useRouter()
  const [sekme, setSekme] = useState<(typeof SEKMELER)[number]['id']>('roller')
  const [hata, setHata] = useState<string | null>(null)
  const [mesgul, setMesgul] = useState(false)
  const [turForm, setTurForm] = useState<{ acik: boolean; id?: number; ad: string; aciklama: string; sira: number; aktif: boolean }>({
    acik: false,
    ad: '',
    aciklama: '',
    sira: 1,
    aktif: true,
  })
  const duzenler = p.yetki.admin || p.yetki.koordinator

  async function calistir(is: () => Promise<{ hata?: string }>, kapat: () => void) {
    if (mesgul) return
    setMesgul(true)
    setHata(null)
    const s = await is()
    setMesgul(false)
    if (s.hata) {
      setHata(s.hata)
      return
    }
    kapat()
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {SEKMELER.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSekme(s.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${sekme === s.id ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-800'}`}
          >
            {s.ad}
          </button>
        ))}
      </div>
      {hata && !turForm.acik ? <IckUyari tur="hata" metin={hata} /> : null}

      {sekme === 'roller' ? (
        <IckKart baslik="Roller">
          <p className="mb-3 text-sm leading-6 text-slate-600">
            Rol atama ekranı yoktur; roller personel kaydından gelir. İç kontrol koordinatörleri plan ekranında, müdürlük koordinatörü ve müdürlük işlemcisi her eylemde
            (eylem ekle veya kalem işareti) sorumlu müdürlüğün personelinden seçilir. Yönetici hesabı plan açabilir ve koordinatör seçebilir, ancak bildirimlere karar vermez.
          </p>
          <ul className="space-y-2 text-sm text-slate-600">
            {(Object.keys(ICK_ROL_ETIKET) as IckRol[]).map(r => (
              <li key={r}>
                <span className="font-medium text-slate-700">{ICK_ROL_ETIKET[r]}:</span> {ICK_ROL_ACIKLAMA[r]}
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-700">Aktif organizasyondaki izleyiciler</p>
            {p.izleyiciler.length ? (
              <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                {p.izleyiciler.map(i => (
                  <li key={`${i.gorev}-${i.ad}`}>
                    {i.ad} <span className="text-slate-500">· {i.gorev}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-500">Aktif organizasyonda başkan veya başkan yardımcısı kaydı bulunamadı.</p>
            )}
          </div>
        </IckKart>
      ) : null}

      {sekme === 'belge' ? (
        <IckKart
          baslik="Belge türleri"
          sag={
            duzenler ? (
              <button type="button" className={ICK_BUTON} onClick={() => setTurForm({ acik: true, ad: '', aciklama: '', sira: p.turler.length + 1, aktif: true })}>
                Belge türü ekle
              </button>
            ) : null
          }
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className={`${ICK_TH} w-20`}>Sıra No</th>
                <th className={ICK_TH}>Ad</th>
                <th className={ICK_TH}>Açıklama</th>
                <th className={ICK_TH}>Durum</th>
                {duzenler ? <th className={`${ICK_TH} text-center w-24`}>İşlemler</th> : null}
              </tr>
            </thead>
            <tbody>
              {p.turler.map(t => (
                <tr key={t.id} className="border-b border-slate-100">
                  <td className={ICK_TD}>{t.sira}</td>
                  <td className={ICK_TD}>{t.ad}</td>
                  <td className={ICK_TD}>{t.aciklama}</td>
                  <td className={ICK_TD}>
                    <IckRozet durum={t.aktif ? 'tamamlandi' : 'iptal'} etiket={t.aktif ? 'Aktif' : 'Pasif'} />
                  </td>
                  {duzenler ? (
                    <td className={ICK_TD}>
                      <div className="flex items-center justify-center gap-1">
                        <KalemDuzenleDugmesi
                          title="Belge türünü düzenle"
                          onClick={() => {
                            setHata(null)
                            setTurForm({ acik: true, ...t })
                          }}
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </IckKart>
      ) : null}

      {sekme === 'mevzuat' ? (
        <div className="space-y-4">
          {p.bilesenler.map(b => (
            <IckKart key={b.id} baslik={`${b.kod} — ${b.ad}`}>
              <div className="space-y-4">
                {p.standartlar
                  .filter(s => s.bilesen_id === b.id)
                  .map(s => (
                    <div key={s.id}>
                      <p className="font-medium text-slate-800">
                        Standart {s.no}: {s.ad}
                      </p>
                      <p className="text-sm text-slate-600">{s.aciklama}</p>
                      <ul className="mt-2 space-y-1">
                        {p.sartlar
                          .filter(g => g.standart_id === s.id)
                          .map(g => (
                            <li key={g.id} className="text-sm text-slate-700">
                              <span className="font-mono text-slate-500 mr-2">{g.kod}</span>
                              {g.metin}
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </IckKart>
          ))}
          <p className="text-sm text-slate-500">
            {p.bilesenler.length} bileşen, {p.standartlar.length} standart, {p.sartlar.length} genel şart.
          </p>
        </div>
      ) : null}

      <Modal open={turForm.acik} onClose={() => setTurForm(f => ({ ...f, acik: false }))} title={turForm.id ? 'Belge türünü düzenle' : 'Belge türü ekle'}>
        <div className="space-y-3">
          {hata ? <IckUyari tur="hata" metin={hata} /> : null}
          <div>
            <label className={ICK_ETIKET}>Ad</label>
            <input className={ICK_INPUT} value={turForm.ad} onChange={e => setTurForm(f => ({ ...f, ad: e.target.value }))} />
          </div>
          <div>
            <label className={ICK_ETIKET}>Açıklama</label>
            <input className={ICK_INPUT} value={turForm.aciklama} onChange={e => setTurForm(f => ({ ...f, aciklama: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className={ICK_ETIKET}>Sıra</label>
              <input type="number" min={1} className={ICK_INPUT} value={turForm.sira} onChange={e => setTurForm(f => ({ ...f, sira: Number(e.target.value) }))} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 pb-2">
              <input type="checkbox" checked={turForm.aktif} onChange={e => setTurForm(f => ({ ...f, aktif: e.target.checked }))} />
              Aktif
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className={ICK_BUTON_IKINCIL} onClick={() => setTurForm(f => ({ ...f, acik: false }))}>
              Vazgeç
            </button>
            <button
              type="button"
              className={ICK_BUTON}
              disabled={mesgul}
              onClick={() =>
                calistir(
                  () => ickBelgeTuruKaydet({ id: turForm.id, ad: turForm.ad, aciklama: turForm.aciklama, sira: turForm.sira, aktif: turForm.aktif }),
                  () => setTurForm(f => ({ ...f, acik: false })),
                )
              }
            >
              Kaydet
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
