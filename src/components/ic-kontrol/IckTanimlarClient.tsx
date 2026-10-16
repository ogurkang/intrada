'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { ickBelgeTuruKaydet, ickRolAtamaBitir, ickRolAtamaEkle } from '@/app/(dashboard)/ic-kontrol/actions'
import { ICK_BUTON, ICK_BUTON_IKINCIL, ICK_ETIKET, ICK_INPUT, ICK_TD, ICK_TH, IckKart, IckRozet, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ICK_ROL_ACIKLAMA, ICK_ROL_ETIKET, ickBugun, ickTarihMetni, type IckRol } from '@/lib/ick/tanim'

export type IckRolSatir = {
  id: number
  user_id: string
  rol: IckRol
  mudurluk_id: number | null
  baslangic: string
  bitis: string | null
  aciklama: string
  kullanici: string
}

type BelgeTuru = { id: number; ad: string; aciklama: string; sira: number; aktif: boolean }
type Bilesen = { id: number; kod: string; ad: string; sira: number }
type Standart = { id: number; bilesen_id: number; no: number; ad: string; aciklama: string }
type Sart = { id: number; standart_id: number; kod: string; sira: number; metin: string }

const SEKMELER = [
  { id: 'rol', ad: 'Rol Atama' },
  { id: 'belge', ad: 'Belge Türleri' },
  { id: 'mevzuat', ad: 'Standartlar ve Genel Şartlar' },
] as const

export default function IckTanimlarClient(p: {
  yetki: { admin: boolean; koordinator: boolean }
  roller: IckRolSatir[]
  turler: BelgeTuru[]
  bilesenler: Bilesen[]
  standartlar: Standart[]
  sartlar: Sart[]
  mudurlukler: { id: number; ad: string }[]
  kullanicilar: { id: string; ad: string }[]
}) {
  const router = useRouter()
  const [sekme, setSekme] = useState<(typeof SEKMELER)[number]['id']>('rol')
  const [hata, setHata] = useState<string | null>(null)
  const [mesgul, setMesgul] = useState(false)
  const bugun = ickBugun()
  const mudAd = useMemo(() => new Map(p.mudurlukler.map(m => [m.id, m.ad])), [p.mudurlukler])

  const [rolForm, setRolForm] = useState<{ acik: boolean; userId: string; rol: IckRol; mudurlukId: string; baslangic: string; bitis: string; aciklama: string }>({
    acik: false,
    userId: '',
    rol: 'birim_irtibat',
    mudurlukId: '',
    baslangic: bugun,
    bitis: '',
    aciklama: '',
  })
  const [bitirilecek, setBitirilecek] = useState<IckRolSatir | null>(null)
  const [bitisTarihi, setBitisTarihi] = useState(bugun)
  const [turForm, setTurForm] = useState<{ acik: boolean; id?: number; ad: string; aciklama: string; sira: number; aktif: boolean }>({
    acik: false,
    ad: '',
    aciklama: '',
    sira: 1,
    aktif: true,
  })

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

  const birimRolu = rolForm.rol === 'birim_yonetici' || rolForm.rol === 'birim_irtibat'

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
      {hata ? <IckUyari tur="hata" metin={hata} /> : null}

      {sekme === 'rol' ? (
        <IckKart
          baslik="Rol atamaları"
          sag={
            p.yetki.admin ? (
              <button type="button" className={ICK_BUTON} onClick={() => setRolForm(f => ({ ...f, acik: true }))}>
                Rol ata
              </button>
            ) : null
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className={ICK_TH}>Kullanıcı</th>
                  <th className={ICK_TH}>Rol</th>
                  <th className={ICK_TH}>Müdürlük</th>
                  <th className={ICK_TH}>Geçerlilik</th>
                  <th className={ICK_TH}>Durum</th>
                  {p.yetki.admin ? <th className={ICK_TH}>İşlem</th> : null}
                </tr>
              </thead>
              <tbody>
                {p.roller.length === 0 ? (
                  <tr>
                    <td className={ICK_TD} colSpan={6}>
                      Rol ataması yok.
                    </td>
                  </tr>
                ) : null}
                {p.roller.map(r => {
                  const gecerli = r.baslangic <= bugun && (!r.bitis || r.bitis >= bugun)
                  return (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className={ICK_TD}>{r.kullanici}</td>
                      <td className={ICK_TD}>{ICK_ROL_ETIKET[r.rol]}</td>
                      <td className={ICK_TD}>{r.mudurluk_id ? mudAd.get(r.mudurluk_id) ?? `#${r.mudurluk_id}` : '—'}</td>
                      <td className={ICK_TD}>
                        {ickTarihMetni(r.baslangic)} – {r.bitis ? ickTarihMetni(r.bitis) : 'süresiz'}
                      </td>
                      <td className={ICK_TD}>
                        <IckRozet durum={gecerli ? 'tamamlandi' : 'iptal'} etiket={gecerli ? 'Geçerli' : 'Geçersiz'} />
                      </td>
                      {p.yetki.admin ? (
                        <td className={ICK_TD}>
                          {gecerli ? (
                            <button
                              type="button"
                              className="text-sm text-red-700 hover:underline"
                              onClick={() => {
                                setBitisTarihi(bugun)
                                setBitirilecek(r)
                              }}
                            >
                              Sona erdir
                            </button>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <ul className="mt-4 space-y-1 text-sm text-slate-600">
            {(Object.keys(ICK_ROL_ETIKET) as IckRol[]).map(r => (
              <li key={r}>
                <span className="font-medium text-slate-700">{ICK_ROL_ETIKET[r]}:</span> {ICK_ROL_ACIKLAMA[r]}
              </li>
            ))}
          </ul>
        </IckKart>
      ) : null}

      {sekme === 'belge' ? (
        <IckKart
          baslik="Belge türleri"
          sag={
            p.yetki.koordinator ? (
              <button type="button" className={ICK_BUTON} onClick={() => setTurForm({ acik: true, ad: '', aciklama: '', sira: p.turler.length + 1, aktif: true })}>
                Belge türü ekle
              </button>
            ) : null
          }
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className={ICK_TH}>Sıra</th>
                <th className={ICK_TH}>Ad</th>
                <th className={ICK_TH}>Açıklama</th>
                <th className={ICK_TH}>Durum</th>
                {p.yetki.koordinator ? <th className={ICK_TH}>İşlem</th> : null}
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
                  {p.yetki.koordinator ? (
                    <td className={ICK_TD}>
                      <button type="button" className="text-sm text-blue-700 hover:underline" onClick={() => setTurForm({ acik: true, ...t })}>
                        Düzenle
                      </button>
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

      <Modal open={rolForm.acik} onClose={() => setRolForm(f => ({ ...f, acik: false }))} title="Rol ata" size="lg">
        <div className="space-y-3">
          <div>
            <label className={ICK_ETIKET}>Kullanıcı</label>
            <select className={ICK_INPUT} value={rolForm.userId} onChange={e => setRolForm(f => ({ ...f, userId: e.target.value }))}>
              <option value="">Seçin</option>
              {p.kullanicilar.map(k => (
                <option key={k.id} value={k.id}>
                  {k.ad}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={ICK_ETIKET}>Rol</label>
            <select className={ICK_INPUT} value={rolForm.rol} onChange={e => setRolForm(f => ({ ...f, rol: e.target.value as IckRol }))}>
              {(Object.keys(ICK_ROL_ETIKET) as IckRol[]).map(r => (
                <option key={r} value={r}>
                  {ICK_ROL_ETIKET[r]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">{ICK_ROL_ACIKLAMA[rolForm.rol]}</p>
          </div>
          {birimRolu ? (
            <div>
              <label className={ICK_ETIKET}>Müdürlük</label>
              <select className={ICK_INPUT} value={rolForm.mudurlukId} onChange={e => setRolForm(f => ({ ...f, mudurlukId: e.target.value }))}>
                <option value="">Seçin</option>
                {p.mudurlukler.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.ad}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={ICK_ETIKET}>Başlangıç</label>
              <input type="date" className={ICK_INPUT} value={rolForm.baslangic} onChange={e => setRolForm(f => ({ ...f, baslangic: e.target.value }))} />
            </div>
            <div>
              <label className={ICK_ETIKET}>Bitiş (boş: süresiz)</label>
              <input type="date" className={ICK_INPUT} value={rolForm.bitis} onChange={e => setRolForm(f => ({ ...f, bitis: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={ICK_ETIKET}>Açıklama (görevlendirme yazısı vb.)</label>
            <input className={ICK_INPUT} value={rolForm.aciklama} onChange={e => setRolForm(f => ({ ...f, aciklama: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className={ICK_BUTON_IKINCIL} onClick={() => setRolForm(f => ({ ...f, acik: false }))}>
              Vazgeç
            </button>
            <button
              type="button"
              className={ICK_BUTON}
              disabled={mesgul}
              onClick={() =>
                calistir(
                  () =>
                    ickRolAtamaEkle({
                      userId: rolForm.userId,
                      rol: rolForm.rol,
                      mudurlukId: rolForm.mudurlukId ? Number(rolForm.mudurlukId) : null,
                      baslangic: rolForm.baslangic,
                      bitis: rolForm.bitis || null,
                      aciklama: rolForm.aciklama,
                    }),
                  () => setRolForm(f => ({ ...f, acik: false, userId: '', mudurlukId: '', aciklama: '' })),
                )
              }
            >
              Kaydet
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={bitirilecek != null} onClose={() => setBitirilecek(null)} title="Rolü sona erdir">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {bitirilecek?.kullanici} — {bitirilecek ? ICK_ROL_ETIKET[bitirilecek.rol] : ''}. Kayıt silinmez; bitiş tarihi yazılır.
          </p>
          <input type="date" className={ICK_INPUT} value={bitisTarihi} onChange={e => setBitisTarihi(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" className={ICK_BUTON_IKINCIL} onClick={() => setBitirilecek(null)}>
              Vazgeç
            </button>
            <button
              type="button"
              className={ICK_BUTON}
              disabled={mesgul}
              onClick={() => bitirilecek && calistir(() => ickRolAtamaBitir(bitirilecek.id, bitisTarihi), () => setBitirilecek(null))}
            >
              Sona erdir
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={turForm.acik} onClose={() => setTurForm(f => ({ ...f, acik: false }))} title={turForm.id ? 'Belge türünü düzenle' : 'Belge türü ekle'}>
        <div className="space-y-3">
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
