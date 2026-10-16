'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { ickEylemKaydet, type IckEylemGirdi } from '@/app/(dashboard)/ic-kontrol/actions'
import IckEylemKisiSecimClient from '@/components/ic-kontrol/IckEylemKisiSecimClient'
import { ICK_BUTON, ICK_BUTON_IKINCIL, ICK_ETIKET, ICK_INPUT, IckUyari } from '@/components/ic-kontrol/IckUi'
import { KalemDuzenleDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { ickTerminCoz, ICK_TERMIN_TIPI_ETIKET, ickTarihMetni, type IckIsbirligiKapsam } from '@/lib/ick/tanim'

export type IckGenelSartSecenek = { id: number; kod: string; metin: string }

export default function IckEylemFormClient({
  baslangic,
  planBasYil,
  genelSartlar,
  mudurlukler,
  dugmeMetni,
  ikincil,
  kalem,
}: {
  baslangic: IckEylemGirdi
  planBasYil: number
  genelSartlar: IckGenelSartSecenek[]
  mudurlukler: { id: number; ad: string }[]
  dugmeMetni: string
  ikincil?: boolean
  kalem?: boolean
}) {
  const router = useRouter()
  const [acik, setAcik] = useState(false)
  const [f, setF] = useState<IckEylemGirdi>(baslangic)
  const [hata, setHata] = useState<string | null>(null)
  const [mesgul, setMesgul] = useState(false)
  const termin = ickTerminCoz(f.terminMetin, planBasYil)
  const baslangicTermin = ickTerminCoz(baslangic.terminMetin, planBasYil)
  const terminDegisti = Boolean(f.id) && termin.ok && baslangicTermin.ok && termin.ilk !== baslangicTermin.ilk

  async function kaydet() {
    if (mesgul) return
    setMesgul(true)
    setHata(null)
    const s = await ickEylemKaydet(f)
    setMesgul(false)
    if (s.hata) {
      setHata(s.hata)
      return
    }
    setAcik(false)
    router.refresh()
  }

  function isbirligiDegistir(id: number, secili: boolean) {
    const liste = secili ? [...f.isbirligiMudurlukIdleri, id] : f.isbirligiMudurlukIdleri.filter(x => x !== id)
    setF({ ...f, isbirligiMudurlukIdleri: liste })
  }

  function ac() {
    setF(baslangic)
    setHata(null)
    setAcik(true)
  }

  return (
    <>
      {kalem ? (
        <KalemDuzenleDugmesi onClick={ac} title={dugmeMetni} />
      ) : (
        <button type="button" className={ikincil ? ICK_BUTON_IKINCIL : ICK_BUTON} onClick={ac}>
          {dugmeMetni}
        </button>
      )}
      <Modal open={acik} onClose={() => setAcik(false)} title={f.id ? 'Eylemi düzenle' : 'Eylem ekle'} size="xl">
        <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
          {hata ? <IckUyari tur="hata" metin={hata} /> : null}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className={ICK_ETIKET}>Eylem kodu</label>
              <input className={ICK_INPUT} value={f.kod} placeholder="KOS 01" onChange={e => setF({ ...f, kod: e.target.value })} />
            </div>
            <div className="sm:col-span-3">
              <label className={ICK_ETIKET}>Genel şart</label>
              <select className={ICK_INPUT} value={f.genelSartId || ''} onChange={e => setF({ ...f, genelSartId: Number(e.target.value) })}>
                <option value="">Seçin</option>
                {genelSartlar.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.kod} — {g.metin.length > 110 ? `${g.metin.slice(0, 110)}…` : g.metin}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={ICK_ETIKET}>Öngörülen eylem</label>
            <textarea rows={3} className={ICK_INPUT} value={f.ongorulenEylem} onChange={e => setF({ ...f, ongorulenEylem: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={ICK_ETIKET}>Sorumlu</label>
              <select className={ICK_INPUT} value={f.sorumluTur} onChange={e => setF({ ...f, sorumluTur: e.target.value as 'mudurluk' | 'ust_yonetim' })}>
                <option value="mudurluk">Müdürlük</option>
                <option value="ust_yonetim">Üst yönetim</option>
              </select>
            </div>
            {f.sorumluTur === 'mudurluk' ? (
              <div className="sm:col-span-2">
                <label className={ICK_ETIKET}>Sorumlu müdürlük</label>
                <select
                  className={ICK_INPUT}
                  value={f.sorumluMudurlukId ?? ''}
                  onChange={e =>
                    setF({
                      ...f,
                      sorumluMudurlukId: e.target.value ? Number(e.target.value) : null,
                      koordinatorSiciller: [],
                      islemciSiciller: [],
                    })
                  }
                >
                  <option value="">Seçin</option>
                  {mudurlukler.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.ad}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className={ICK_ETIKET}>Sorumlu (metin)</label>
                <input className={ICK_INPUT} value={f.sorumluMetin} onChange={e => setF({ ...f, sorumluMetin: e.target.value })} />
              </div>
            )}
          </div>
          {f.sorumluTur === 'mudurluk' ? (
            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              <div>
                <p className="text-sm font-medium text-slate-700">Müdürlük koordinatörü ve müdürlük işlemcisi</p>
                <p className="text-xs text-slate-500">
                  Sorumlu müdürlüğün görevdeki personeli listelenir. Bu eyleme yalnızca seçilen kişiler bildirim girer; koordinatöre müdürlük koordinatörü gönderir.
                </p>
              </div>
              <IckEylemKisiSecimClient
                mudurlukId={f.sorumluMudurlukId}
                koordinatorler={f.koordinatorSiciller}
                islemciler={f.islemciSiciller}
                onChange={(k, i) => setF({ ...f, koordinatorSiciller: k, islemciSiciller: i })}
              />
              {f.sorumluMudurlukId ? (
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={f.kisileriMudurlugeUygula}
                    onChange={e => setF({ ...f, kisileriMudurlugeUygula: e.target.checked })}
                  />
                  Bu seçimi plandaki aynı müdürlüğün diğer açık eylemlerine de uygula (oradaki seçimlerin yerine geçer)
                </label>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Üst yönetim eyleminde bildirimi planın iç kontrol koordinatörleri girer.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={ICK_ETIKET}>İşbirliği</label>
              <select
                className={ICK_INPUT}
                value={f.isbirligiKapsam}
                onChange={e => setF({ ...f, isbirligiKapsam: e.target.value as IckIsbirligiKapsam })}
              >
                <option value="yok">Yok</option>
                <option value="tum_mudurlukler">Tüm müdürlükler</option>
                <option value="ilgili_mudurlukler">İlgili müdürlükler</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={ICK_ETIKET}>İşbirliği (belgedeki metin)</label>
              <input className={ICK_INPUT} value={f.isbirligiMetin} onChange={e => setF({ ...f, isbirligiMetin: e.target.value })} />
            </div>
          </div>
          {f.isbirligiKapsam !== 'yok' ? (
            <div>
              <label className={ICK_ETIKET}>İşbirliği yapılacak müdürlükler</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {mudurlukler.map(m => (
                  <label key={m.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={f.isbirligiMudurlukIdleri.includes(m.id)} onChange={e => isbirligiDegistir(m.id, e.target.checked)} />
                    {m.ad}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <div>
            <label className={ICK_ETIKET}>Çıktı / sonuç</label>
            <input className={ICK_INPUT} value={f.cikti} onChange={e => setF({ ...f, cikti: e.target.value })} />
          </div>
          <div>
            <label className={ICK_ETIKET}>Tamamlanma tarihi</label>
            <input className={ICK_INPUT} value={f.terminMetin} placeholder="Aralık 2026, Her yıl Ocak, Sürekli" onChange={e => setF({ ...f, terminMetin: e.target.value })} />
            <p className={`mt-1 text-xs ${termin.ok ? 'text-slate-500' : 'text-red-600'}`}>
              {termin.ok ? `${ICK_TERMIN_TIPI_ETIKET[termin.tip]}${termin.ilk ? ` — ${ickTarihMetni(termin.ilk)}` : ''}` : termin.hata}
            </p>
          </div>
          {terminDegisti ? (
            <div>
              <label className={ICK_ETIKET}>Tamamlanma tarihi revizyon gerekçesi</label>
              <textarea rows={2} className={ICK_INPUT} value={f.revizyonNotu} onChange={e => setF({ ...f, revizyonNotu: e.target.value })} />
              <p className="mt-1 text-xs text-slate-500">İlk tamamlanma tarihi korunur; güncel tarih değişir ve geçmişe yazılır.</p>
            </div>
          ) : null}
          <div>
            <label className={ICK_ETIKET}>Açıklama</label>
            <input className={ICK_INPUT} value={f.aciklama} onChange={e => setF({ ...f, aciklama: e.target.value })} />
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
