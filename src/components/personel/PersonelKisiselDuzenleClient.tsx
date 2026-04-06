'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Tables } from '@/types/database'
import { personelDetayHref } from '@/lib/personel-link'
import { GOREV_DURUMU_OPTIONS, GOREV_TURU_OPTIONS, gorevTuruAciklamaGoster } from '@/lib/gorev-bilgileri'

type Calisan = Tables<'calisan'>

interface Props {
  calisan: Calisan
  kaynak?: string
  /** Görüntülenen / düzenlenen değerler: tarihler önce ana kadro, yoksa calisan. */
  hizmetKaynagi: {
    memuriyet_tarihi: string | null
    kuruma_giris_tarihi: string | null
    hizmet_suresi_yil: number
    hizmet_suresi_ay: number
    hizmet_suresi_gun: number
  }
  onGuncelle: (sicil_no: string, fd: FormData) => Promise<{ hata?: string }>
}

export default function PersonelKisiselDuzenleClient({ calisan, kaynak, hizmetKaynagi, onGuncelle }: Props) {
  const router = useRouter()
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [gorevTuru, setGorevTuru] = useState(() => (calisan.gorev_turu?.trim() || 'Çalışan'))

  const detayLink = personelDetayHref(calisan, kaynak ? { kaynak } : undefined)
  const hizmetKilitli = gorevTuru === 'Aylıksız İzin'
  const gorevTarihGoster = gorevTuru === 'Aylıksız İzin' || gorevTuru === 'Geçici Görevlendirme'
  const gorevAciklamaGoster = gorevTuruAciklamaGoster(gorevTuru)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await onGuncelle(calisan.sicil_no, fd)
      if (res.hata) setHata(res.hata)
      else router.push(detayLink)
    })
  }

  const hk = hizmetKaynagi

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href={detayLink}
          className="text-sm font-medium text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50">
          ← İptal
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Kişisel Bilgileri Düzenle — {calisan.ad_soyad}</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Adı Soyadı *</label>
              <input name="ad_soyad" defaultValue={calisan.ad_soyad} required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">TCKN</label>
              <input name="tckn" defaultValue={calisan.tckn ?? ''} maxLength={11}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Doğum Tarihi</label>
              <input name="dogum_tarihi" type="date" defaultValue={calisan.dogum_tarihi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Cinsiyet</label>
              <select name="cinsiyet" defaultValue={calisan.cinsiyet ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                <option value="">—</option>
                <option value="Erkek">Erkek</option>
                <option value="Kadın">Kadın</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kan Grubu</label>
              <select name="kan_grubu" defaultValue={calisan.kan_grubu ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                <option value="">—</option>
                {['A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-', '0 Rh+', '0 Rh-'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Doğum Yeri</label>
              <input name="dogum_yeri" defaultValue={calisan.dogum_yeri ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Anne Adı</label>
              <input name="anne_adi" defaultValue={calisan.anne_adi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Baba Adı</label>
              <input name="baba_adi" defaultValue={calisan.baba_adi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Askerlik</label>
              <input name="askerlik_durumu" defaultValue={calisan.askerlik_durumu ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefon</label>
              <input name="telefon" defaultValue={calisan.telefon ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-posta</label>
              <input name="e_posta" type="email" defaultValue={calisan.e_posta ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Adres</label>
              <input name="adresi" defaultValue={calisan.adresi ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Yakını</label>
              <input name="yakini" defaultValue={calisan.yakini ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Yakın Telefon</label>
              <input name="yakini_telefonu" defaultValue={calisan.yakini_telefonu ?? ''}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 mt-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Görev Bilgileri</p>
            <p className="text-xs text-slate-500 mb-3">
              Norm kadro kaydından bağımsızdır; personel sicili ile taşınır. Kadro değişse de buradan güncellenir.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Görev yeri</label>
                <input
                  name="gorev_yeri"
                  defaultValue={calisan.gorev_yeri ?? ''}
                  placeholder="Örn. şube, servis, birim"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Görev türü</label>
                <select
                  name="gorev_turu"
                  value={gorevTuru}
                  onChange={e => setGorevTuru(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  {GOREV_TURU_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Görev türü tarihi</label>
                {!gorevTarihGoster && <input type="hidden" name="gorev_turu_tarihi" value="" />}
                {gorevTarihGoster ? (
                  <input
                    name="gorev_turu_tarihi"
                    type="date"
                    defaultValue={(calisan.gorev_turu_tarihi ?? '').toString().slice(0, 10)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                ) : (
                  <p className="text-sm text-slate-400 py-2 border border-dashed border-slate-200 rounded-lg px-3 bg-slate-50">
                    —
                  </p>
                )}
                {!gorevTarihGoster && (
                  <p className="text-[11px] text-slate-400 mt-1">Çalışan seçiliyken tarih girilmez.</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Geçici görevlendirme açıklaması</label>
                {!gorevAciklamaGoster && <input type="hidden" name="gorev_turu_aciklama" value="" />}
                {gorevAciklamaGoster ? (
                  <input
                    name="gorev_turu_aciklama"
                    type="text"
                    defaultValue={calisan.gorev_turu_aciklama ?? ''}
                    placeholder="Görevlendirilen birim / not"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  />
                ) : (
                  <p className="text-sm text-slate-400 py-2 border border-dashed border-slate-200 rounded-lg px-3 bg-slate-50">
                    —
                  </p>
                )}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Görev durumu</label>
                <select
                  name="gorev_durumu"
                  defaultValue={calisan.gorev_durumu ?? 'Diğer'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  {GOREV_DURUMU_OPTIONS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 mt-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Hizmet Bilgileri</p>
            <p className="text-xs text-slate-500 mb-3">
              Memuriyet ve kuruma giriş tarihleri ana kadro kaydıyla eşlenir (kadro varsa orada da güncellenir). Hizmet süresi 360 günlük yıl esasına göre (1 ay = 30 gün) girilir.
            </p>
            {hizmetKilitli && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                Aylıksız izin seçili: hizmet süresi bu kayıt güncellenene kadar değiştirilmez (ilerleme durur). Görev türü veya tarihi değiştiğinde tekrar düzenlenebilir.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Memuriyete giriş</label>
                <input
                  name="memuriyet_tarihi"
                  type="date"
                  defaultValue={hk.memuriyet_tarihi?.slice(0, 10) ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Kuruma giriş</label>
                <input
                  name="kuruma_giris_tarihi"
                  type="date"
                  defaultValue={hk.kuruma_giris_tarihi?.slice(0, 10) ?? ''}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
            </div>
            <p className="text-xs font-medium text-slate-600 mb-2">Hizmet süresi</p>
            <div className="grid grid-cols-3 gap-3 max-w-lg">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Yıl</label>
                <input
                  name="hizmet_suresi_yil"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={hk.hizmet_suresi_yil}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Ay</label>
                <input
                  name="hizmet_suresi_ay"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={hk.hizmet_suresi_ay}
                  disabled={hizmetKilitli}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Gün</label>
                <input
                  name="hizmet_suresi_gun"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={hk.hizmet_suresi_gun}
                  disabled={hizmetKilitli}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Link href={detayLink}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">İptal</Link>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50">
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
