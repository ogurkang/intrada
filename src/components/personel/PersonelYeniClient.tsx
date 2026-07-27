'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { calisanEkle } from '@/app/(dashboard)/personel/actions'
import GorevYeriListeGuncellendiModal from '@/components/rapor/GorevYeriListeGuncellendiModal'
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
    <div>
      <GorevYeriListeGuncellendiModal open={gorevListeModal} onClose={gorevListeModalKapat} />
      <div className="mb-6 flex items-center gap-4">
        <Link href="/personel"
          className="text-sm font-medium text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50">
          ← Listeye Dön
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Yeni Personel Ekle</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sicil No <span className="text-red-500">*</span></label>
              <input name="sicil_no" type="text" required autoFocus
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="örn: 12345" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Adı Soyadı <span className="text-red-500">*</span></label>
              <input name="ad_soyad" type="text" required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Ali Veli" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">T.C. Kimlik No</label>
            <input name="tckn" type="text" maxLength={11} pattern="\d{11}"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="12345678901" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">SGK/SSK Sicil No</label>
            <input
              name="sgk_ssk_sicil_no"
              type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="SGK/SSK Sicil No"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Doğum Tarihi</label>
              <input name="dogum_tarihi" type="date"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Cinsiyet</label>
              <select name="cinsiyet"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                <option value="">— Seçin —</option>
                {CINSIYET.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kan Grubu</label>
              <select name="kan_grubu"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                <option value="">— Seçin —</option>
                {KAN_GRUBU.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Askerlik Durumu</label>
              <select name="askerlik_durumu"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                <option value="">— Seçin —</option>
                {ASKERLIK.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefon</label>
              <input name="telefon" type="tel"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="05xx xxx xx xx" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-Posta</label>
              <input name="e_posta" type="email"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="ali@belediye.gov.tr" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Doğum Yeri</label>
            <input name="dogum_yeri" type="text"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="İl / İlçe" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Anne Adı</label>
              <input name="anne_adi" type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Baba Adı</label>
              <input name="baba_adi" type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Adres</label>
            <PersonelAdresAlanlari mahalleKayitlari={mahalleKayitlari} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Yakını</label>
              <input name="yakini" type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Acil durumda aranacak kişi" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Yakını Telefonu</label>
              <input name="yakini_telefonu" type="tel"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="05xx xxx xx xx" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Görev Bilgileri</p>
            <p className="text-xs text-slate-500 mb-3">Kadro normundan bağımsızdır; sicil ile saklanır.</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Görev yeri</label>
                <input name="gorev_yeri" type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Örn. şube, servis" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Görev türü</label>
                <select name="gorev_turu" value={gorevTuru} onChange={e => setGorevTuru(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                  {GOREV_TURU_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Görev türü tarihi{gorevTarihZorunlu && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {!gorevTarihGoster && <input type="hidden" name="gorev_turu_tarihi" value="" />}
                {gorevTarihGoster ? (
                  <input name="gorev_turu_tarihi" type="date"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
                ) : (
                  <p className="text-sm text-slate-400 py-2 border border-dashed border-slate-200 rounded-lg px-3 bg-slate-50">—</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Görevlendirme açıklaması</label>
                {!gorevAciklamaGoster && <input type="hidden" name="gorev_turu_aciklama" value="" />}
                {gorevAciklamaGoster ? (
                  <input name="gorev_turu_aciklama" type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Görevlendirilen birim / not" />
                ) : (
                  <p className="text-sm text-slate-400 py-2 border border-dashed border-slate-200 rounded-lg px-3 bg-slate-50">—</p>
                )}
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Görev durumu</label>
                <select name="gorev_durumu" defaultValue="Diğer"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500">
                  {GOREV_DURUMU_OPTIONS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Hizmet Bilgileri</p>
            <p className="text-xs text-slate-500 mb-3">
              Hizmet süresi 360 günlük yıl esasına göre girilir (1 ay = 30 gün). Kadro ataması sonrası tarihler kadro ile de eşlenebilir.
            </p>
            {hizmetKilitli && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                Aylıksız izin: hizmet süresi bu kayıt değiştirilene kadar sıfırdan başlar ve güncellenmez.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Memuriyete giriş</label>
                <input name="memuriyet_tarihi" type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Kuruma giriş</label>
                <input name="kuruma_giris_tarihi" type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
              </div>
            </div>
            <p className="text-xs font-medium text-slate-600 mb-2">Hizmet süresi</p>
            <div className="grid grid-cols-3 gap-3 max-w-lg">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Yıl</label>
                <input name="hizmet_suresi_yil" type="number" min={0} step={1} defaultValue={0} disabled={hizmetKilitli}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:bg-slate-100" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Ay</label>
                <input name="hizmet_suresi_ay" type="number" min={0} step={1} defaultValue={0} disabled={hizmetKilitli}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:bg-slate-100" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Gün</label>
                <input name="hizmet_suresi_gun" type="number" min={0} step={1} defaultValue={0} disabled={hizmetKilitli}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:bg-slate-100" />
              </div>
            </div>
          </div>

          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Link href="/personel"
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
