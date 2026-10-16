'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { ickPlanKaydet, type IckPlanGirdi } from '@/app/(dashboard)/ic-kontrol/actions'
import { ICK_BUTON, ICK_BUTON_IKINCIL, ICK_ETIKET, ICK_INPUT, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ICK_PLAN_DURUM_ETIKET, type IckPlanDurum } from '@/lib/ick/tanim'

export type IckPlanFormDeger = Omit<IckPlanGirdi, 'id'> & { id?: number }

export default function IckPlanFormClient({
  baslangic,
  mudurlukler,
  dugmeMetni,
  ikincil,
}: {
  baslangic: IckPlanFormDeger
  mudurlukler: { id: number; ad: string }[]
  dugmeMetni: string
  ikincil?: boolean
}) {
  const router = useRouter()
  const [acik, setAcik] = useState(false)
  const [f, setF] = useState<IckPlanFormDeger>(baslangic)
  const [hata, setHata] = useState<string | null>(null)
  const [mesgul, setMesgul] = useState(false)
  const ikiYilUstu = f.bitYil - f.basYil + 1 > 2

  async function kaydet() {
    if (mesgul) return
    setMesgul(true)
    setHata(null)
    const s = await ickPlanKaydet(f)
    setMesgul(false)
    if (s.hata) {
      setHata(s.hata)
      return
    }
    setAcik(false)
    if (!f.id && s.id) router.push(`/ic-kontrol/planlar/${s.id}`)
    else router.refresh()
  }

  return (
    <>
      <button
        type="button"
        className={ikincil ? ICK_BUTON_IKINCIL : ICK_BUTON}
        onClick={() => {
          setF(baslangic)
          setHata(null)
          setAcik(true)
        }}
      >
        {dugmeMetni}
      </button>
      <Modal open={acik} onClose={() => setAcik(false)} title={f.id ? 'Planı düzenle' : 'Yeni eylem planı'} size="xl">
        <div className="space-y-3">
          {hata ? <IckUyari tur="hata" metin={hata} /> : null}
          <div>
            <label className={ICK_ETIKET}>Plan adı</label>
            <input className={ICK_INPUT} value={f.ad} onChange={e => setF({ ...f, ad: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={ICK_ETIKET}>Kapsam</label>
              <select className={ICK_INPUT} value={f.kapsam} onChange={e => setF({ ...f, kapsam: e.target.value as 'idare' | 'birim' })}>
                <option value="idare">İdare eylem planı</option>
                <option value="birim">Birim uyum eylem planı</option>
              </select>
            </div>
            <div>
              <label className={ICK_ETIKET}>Başlangıç yılı</label>
              <input type="number" className={ICK_INPUT} value={f.basYil} onChange={e => setF({ ...f, basYil: Number(e.target.value) })} />
            </div>
            <div>
              <label className={ICK_ETIKET}>Bitiş yılı</label>
              <input type="number" className={ICK_INPUT} value={f.bitYil} onChange={e => setF({ ...f, bitYil: Number(e.target.value) })} />
            </div>
          </div>
          {ikiYilUstu ? <IckUyari metin="Kamu İç Kontrol Yönetmeliğine göre eylem planı en fazla iki yıllık hazırlanır." /> : null}
          {f.kapsam === 'birim' ? (
            <div>
              <label className={ICK_ETIKET}>Harcama birimi</label>
              <select className={ICK_INPUT} value={f.mudurlukId ?? ''} onChange={e => setF({ ...f, mudurlukId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Seçin</option>
                {mudurlukler.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.ad}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className={ICK_ETIKET}>Koordinasyon birimi</label>
            <select
              className={ICK_INPUT}
              value={f.koordinatorMudurlukId ?? ''}
              onChange={e => setF({ ...f, koordinatorMudurlukId: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">Seçin</option>
              {mudurlukler.map(m => (
                <option key={m.id} value={m.id}>
                  {m.ad}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={ICK_ETIKET}>Durum</label>
              <select className={ICK_INPUT} value={f.durum} onChange={e => setF({ ...f, durum: e.target.value as IckPlanDurum })}>
                {(Object.keys(ICK_PLAN_DURUM_ETIKET) as IckPlanDurum[]).map(d => (
                  <option key={d} value={d}>
                    {ICK_PLAN_DURUM_ETIKET[d]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={ICK_ETIKET}>Onay sayısı</label>
              <input className={ICK_INPUT} value={f.onaySayi} onChange={e => setF({ ...f, onaySayi: e.target.value })} />
            </div>
            <div>
              <label className={ICK_ETIKET}>Onay tarihi</label>
              <input type="date" className={ICK_INPUT} value={f.onayTarihi} onChange={e => setF({ ...f, onayTarihi: e.target.value })} />
            </div>
            <div>
              <label className={ICK_ETIKET}>Bakanlığa gönderim tarihi</label>
              <input
                type="date"
                className={ICK_INPUT}
                value={f.bakanlikGonderimTarihi}
                onChange={e => setF({ ...f, bakanlikGonderimTarihi: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={ICK_ETIKET}>Açıklama</label>
            <textarea rows={3} className={ICK_INPUT} value={f.aciklama} onChange={e => setF({ ...f, aciklama: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={ICK_BUTON_IKINCIL} onClick={() => setAcik(false)}>
              Vazgeç
            </button>
            <button type="button" className={ICK_BUTON} disabled={mesgul} onClick={kaydet}>
              Kaydet
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
