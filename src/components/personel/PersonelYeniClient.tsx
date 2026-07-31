'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { calisanEkle } from '@/app/(dashboard)/personel/actions'
import GorevYeriListeGuncellendiModal from '@/components/rapor/GorevYeriListeGuncellendiModal'
import TanimEkleListeGeriLink from '@/components/tanimlar/TanimEkleListeGeriLink'
import { personelDetayHref } from '@/lib/personel-link'
import PersonelAdresAlanlari from '@/components/personel/PersonelAdresAlanlari'
import type { MahalleTanimSatir } from '@/lib/personel-adres'
import {
  GOREV_DURUMU_OPTIONS,
  GOREV_TURU_OPTIONS,
  gorevTuruAciklamaGoster,
  gorevTuruTarihZorunlu,
  gorevTuruBitisGoster,
} from '@/lib/gorev-bilgileri'

const CINSIYET = ['Erkek', 'Kadın']
const KAN_GRUBU = ['A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-', '0 Rh+', '0 Rh-']
const ASKERLIK = ['Yapıldı', 'Tecilli', 'Muaf', 'Yapılmadı', '—']

const inputCls =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500'
const selectCls = `${inputCls} bg-white`
const labelCls = 'block text-sm font-medium text-slate-700 mb-1'

function BolumBaslik({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide pt-1 border-t border-slate-100">
      {children}
    </p>
  )
}

export default function PersonelYeniClient({ mahalleKayitlari }: { mahalleKayitlari: MahalleTanimSatir[] }) {
  const router = useRouter()
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [gorevListeModal, setGorevListeModal] = useState(false)
  const [gorevListeSonuc, setGorevListeSonuc] = useState<{ sicil_no?: string; public_id?: string } | null>(null)
  const [gorevTuru, setGorevTuru] = useState('Çalışan')
  const gorevTarihGoster = gorevTuruBitisGoster(gorevTuru)
  const gorevTarihZorunlu = gorevTuruTarihZorunlu(gorevTuru)
  const gorevAciklamaGoster = gorevTuruAciklamaGoster(gorevTuru)
  const hizmetKilitli = gorevTuru === 'Aylıksız İzin'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    const fd = new FormData(e.currentTarget)
    setIsPending(true)
    calisanEkle(fd).then((res) => {
      if (res.hata) {
        setHata(res.hata)
        setIsPending(false)
      } else if (res.gorev_yeri_liste_guncellendi) {
        setGorevListeSonuc({ sicil_no: res.sicil_no, public_id: res.public_id })
        setGorevListeModal(true)
        setIsPending(false)
      } else {
        if (window.opener) {
          window.opener.postMessage('refresh', '*')
          window.close()
        } else {
          router.push(
            res.public_id
              ? `/link/${res.public_id}`
              : res.sicil_no
                ? personelDetayHref({ sicil_no: res.sicil_no })
                : '/personel',
          )
        }
      }
    })
  }

  function gorevListeModalKapat() {
    setGorevListeModal(false)
    const sonuc = gorevListeSonuc
    setGorevListeSonuc(null)
    if (window.opener) {
      window.opener.postMessage('refresh', '*')
      window.close()
    } else if (sonuc?.public_id) {
      router.push(`/link/${sonuc.public_id}`)
    } else if (sonuc?.sicil_no) {
      router.push(personelDetayHref({ sicil_no: sonuc.sicil_no }))
    } else {
      router.push('/personel')
    }
  }

  return (
    <div className="max-w-7xl">
      <GorevYeriListeGuncellendiModal open={gorevListeModal} onClose={gorevListeModalKapat} />
      <div className="flex items-center justify-between mb-5 gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Yeni Personel Ekle</h1>
        <TanimEkleListeGeriLink href="/personel" label="Listeye dön" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
            <div>
              <label className={labelCls}>Sicil No <span className="text-red-500">*</span></label>
              <input name="sicil_no" type="text" required autoFocus className={`${inputCls} uppercase`} placeholder="örn: 12345" />
            </div>
            <div>
              <label className={labelCls}>Adı Soyadı <span className="text-red-500">*</span></label>
              <input name="ad_soyad" type="text" required className={inputCls} placeholder="Ali Veli" />
            </div>
            <div>
              <label className={labelCls}>T.C. Kimlik No</label>
              <input name="tckn" type="text" maxLength={11} pattern="\d{11}" className={`${inputCls} font-mono`} placeholder="12345678901" />
            </div>
            <div>
              <label className={labelCls}>SGK/SSK Sicil No</label>
              <input name="sgk_ssk_sicil_no" type="text" className={inputCls} placeholder="SGK/SSK Sicil No" />
            </div>

            <div>
              <label className={labelCls}>Doğum Tarihi</label>
              <input name="dogum_tarihi" type="date" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Cinsiyet</label>
              <select name="cinsiyet" className={selectCls}>
                <option value="">— Seçin —</option>
                {CINSIYET.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Kan Grubu</label>
              <select name="kan_grubu" className={selectCls}>
                <option value="">— Seçin —</option>
                {KAN_GRUBU.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Askerlik Durumu</label>
              <select name="askerlik_durumu" className={selectCls}>
                <option value="">— Seçin —</option>
                {ASKERLIK.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Telefon</label>
              <input name="telefon" type="tel" className={inputCls} placeholder="05xx xxx xx xx" />
            </div>
            <div>
              <label className={labelCls}>E-Posta</label>
              <input name="e_posta" type="email" className={inputCls} placeholder="ali@belediye.gov.tr" />
            </div>
            <div>
              <label className={labelCls}>Doğum Yeri</label>
              <input name="dogum_yeri" type="text" className={inputCls} placeholder="İl / İlçe" />
            </div>
            <div className="hidden lg:block" aria-hidden />

            <div>
              <label className={labelCls}>Anne Adı</label>
              <input name="anne_adi" type="text" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Baba Adı</label>
              <input name="baba_adi" type="text" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Yakını</label>
              <input name="yakini" type="text" className={inputCls} placeholder="Acil durumda aranacak kişi" />
            </div>
            <div>
              <label className={labelCls}>Yakını Telefonu</label>
              <input name="yakini_telefonu" type="tel" className={inputCls} placeholder="05xx xxx xx xx" />
            </div>
          </div>

          <div>
            <BolumBaslik>Adres</BolumBaslik>
            <div className="mt-3">
              <PersonelAdresAlanlari mahalleKayitlari={mahalleKayitlari} compact />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <BolumBaslik>Görev Bilgileri</BolumBaslik>
              <p className="text-xs text-slate-500 mt-2 mb-3">Kadro normundan bağımsızdır; sicil ile saklanır.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Görev yeri</label>
                  <input name="gorev_yeri" type="text" className={inputCls} placeholder="Örn. şube, servis" />
                </div>
                <div>
                  <label className={labelCls}>Görev türü</label>
                  <select name="gorev_turu" value={gorevTuru} onChange={e => setGorevTuru(e.target.value)} className={selectCls}>
                    {GOREV_TURU_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>
                    Görev türü tarihi{gorevTarihZorunlu && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {!gorevTarihGoster && <input type="hidden" name="gorev_turu_tarihi" value="" />}
                  {gorevTarihGoster ? (
                    <input name="gorev_turu_tarihi" type="date" className={inputCls} />
                  ) : (
                    <p className="text-sm text-slate-400 py-2 border border-dashed border-slate-200 rounded-lg px-3 bg-slate-50">—</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Görevlendirme açıklaması</label>
                  {!gorevAciklamaGoster && <input type="hidden" name="gorev_turu_aciklama" value="" />}
                  {gorevAciklamaGoster ? (
                    <input name="gorev_turu_aciklama" type="text" className={inputCls} placeholder="Görevlendirilen birim / not" />
                  ) : (
                    <p className="text-sm text-slate-400 py-2 border border-dashed border-slate-200 rounded-lg px-3 bg-slate-50">—</p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Görev durumu</label>
                  <select name="gorev_durumu" defaultValue="Diğer" className={selectCls}>
                    {GOREV_DURUMU_OPTIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <BolumBaslik>Hizmet Bilgileri</BolumBaslik>
              <p className="text-xs text-slate-500 mt-2 mb-3">
                Hizmet süresi 360 günlük yıl esasına göre girilir (1 ay = 30 gün).
              </p>
              {hizmetKilitli && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                  Aylıksız izin: hizmet süresi bu kayıt değiştirilene kadar sıfırdan başlar ve güncellenmez.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className={labelCls}>Memuriyete giriş</label>
                  <input name="memuriyet_tarihi" type="date" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Kuruma giriş</label>
                  <input name="kuruma_giris_tarihi" type="date" className={inputCls} />
                </div>
              </div>
              <p className="text-xs font-medium text-slate-600 mb-2">Hizmet süresi</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Yıl</label>
                  <input name="hizmet_suresi_yil" type="number" min={0} step={1} defaultValue={0} disabled={hizmetKilitli}
                    className={`${inputCls} disabled:bg-slate-100`} />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Ay</label>
                  <input name="hizmet_suresi_ay" type="number" min={0} step={1} defaultValue={0} disabled={hizmetKilitli}
                    className={`${inputCls} disabled:bg-slate-100`} />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Gün</label>
                  <input name="hizmet_suresi_gun" type="number" min={0} step={1} defaultValue={0} disabled={hizmetKilitli}
                    className={`${inputCls} disabled:bg-slate-100`} />
                </div>
              </div>
            </div>
          </div>

          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <Link href="/personel"
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
              İptal
            </Link>
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
