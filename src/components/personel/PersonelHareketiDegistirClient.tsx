'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Tables } from '@/types/database'

type Calisan = Tables<'calisan'>
type KH = Tables<'kadro_hareketleri'>
type PH = Tables<'personel_hareketleri'>

const SINIFLAR = ['GİH', 'TH', 'SHS', 'AH', 'EH', 'DH', 'YH', 'ZB']

interface Props {
  personel: Calisan
  ogrenimDurumu?: string | null
  kadrolar: KH[]
  sonKayit: PH | null
  mudurlukler: string[]
  unvanlar: { id: number; ad: string; sinif: string | null }[]
  onaylayan: string
  yardimcilar: { sicil: string; ad: string }[]
  onKaydet: (fd: FormData) => Promise<{ hata?: string }>
}

export default function PersonelHareketiDegistirClient({
  personel,
  ogrenimDurumu = null,
  kadrolar,
  sonKayit,
  mudurlukler,
  unvanlar,
  onaylayan,
  yardimcilar,
  onKaydet,
}: Props) {
  const router = useRouter()
  const [seciliKadroIdx, setSeciliKadroIdx] = useState(0)
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const seciliKadro = kadrolar[seciliKadroIdx] ?? null

  const { eski, yeni } = useMemo(() => {
    const k = seciliKadro
    const sk = sonKayit
    const memuriyet = k?.memuriyet_tarihi ?? k?.kuruma_giris_tarihi ?? ''
    const kidemYili = memuriyet ? (() => {
      const d = new Date(memuriyet)
      if (isNaN(d.getTime())) return ''
      const y = new Date().getFullYear() - d.getFullYear()
      return y < 0 ? '' : String(y)
    })() : ''

    if (sk && k && (sk.kadro_sira_no ?? '').trim() === (k.kadro_sira_no ?? '').trim()) {
      return {
        eski: {
          gorev_yeri: sk.yeni_gorev_yeri ?? '',
          unvan: sk.yeni_unvan ?? '',
          sinif: sk.yeni_sinif ?? '',
          kadro_derecesi: sk.yeni_kadro_derecesi ?? '',
          kha_derece: sk.yeni_kha_derece ?? '',
          kha_kademe: sk.yeni_kha_kademe ?? '',
          ekea_derece: sk.yeni_ekea_derece ?? '',
          ekea_kademe: sk.yeni_ekea_kademe ?? '',
          kidem_yili: sk.yeni_kidem_yili ?? '',
          oht: sk.yeni_oht ?? '',
          igz: sk.yeni_igz ?? '',
          ek_odeme: sk.yeni_ek_odeme ?? '',
          ek_gosterge: sk.yeni_ek_gosterge ?? '',
        },
        yeni: {
          gorev_yeri: sk.yeni_gorev_yeri ?? '',
          unvan: sk.yeni_unvan ?? '',
          sinif: sk.yeni_sinif ?? '',
          kadro_derecesi: sk.yeni_kadro_derecesi ?? '',
          kha_derece: sk.yeni_kha_derece ?? '',
          kha_kademe: sk.yeni_kha_kademe ?? '',
          ekea_derece: sk.yeni_ekea_derece ?? '',
          ekea_kademe: sk.yeni_ekea_kademe ?? '',
          kidem_yili: sk.yeni_kidem_yili ?? '',
          oht: sk.yeni_oht ?? '',
          igz: sk.yeni_igz ?? '',
          ek_odeme: sk.yeni_ek_odeme ?? '',
          ek_gosterge: sk.yeni_ek_gosterge ?? '',
        },
      }
    }

    const mud = k?.kadro_mudurlugu ?? k?.gorev_mudurlugu ?? ''
    const unvan = k?.kadro_unvani ?? k?.gorev_unvani ?? ''
    const derece = k?.kadro_derecesi ?? ''

    return {
      eski: {
        gorev_yeri: mud,
        unvan,
        sinif: unvanlar.find(u => u.ad === unvan)?.sinif ?? '',
        kadro_derecesi: derece,
        kha_derece: '',
        kha_kademe: '',
        ekea_derece: '',
        ekea_kademe: '',
        kidem_yili: kidemYili,
        oht: '',
        igz: '',
        ek_odeme: '',
        ek_gosterge: '',
      },
      yeni: {
        gorev_yeri: mud,
        unvan,
        sinif: unvanlar.find(u => u.ad === unvan)?.sinif ?? '',
        kadro_derecesi: derece,
        kha_derece: '',
        kha_kademe: '',
        ekea_derece: '',
        ekea_kademe: '',
        kidem_yili: kidemYili,
        oht: '',
        igz: '',
        ek_odeme: '',
        ek_gosterge: '',
      },
    }
  }, [seciliKadro, sonKayit, unvanlar])

  const dogumYeriTarihi = [personel.dogum_yeri, personel.dogum_tarihi].filter(Boolean).join(' ')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    setIsPending(true)
    const fd = new FormData(e.currentTarget)
    fd.set('sicil_no', personel.sicil_no)
    fd.set('kadro_sira_no', seciliKadro?.kadro_sira_no ?? '')
    onKaydet(fd).then(res => {
      setIsPending(false)
      if (res.hata) setHata(res.hata)
      else router.push('/personel-hareketleri')
    })
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Personel Hareketi - Değiştir</h1>
        <Link href="/personel-hareketleri"
          className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          ← Listeye Dön
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hareket Tipi */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Hareket Tipi</h2>
          <div className="flex flex-wrap gap-4">
            {[
              { v: 'IlkAtanma', l: 'İlk Atanma' },
              { v: 'YerDegistirme', l: 'Yer Değiştirme' },
              { v: 'Yukselme', l: 'Yükselme' },
            ].map(({ v, l }) => (
              <label key={v} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="hareket_tipi" value={v} defaultChecked={v === 'Yukselme'}
                  className="rounded border-slate-300 text-slate-600 focus:ring-slate-500" />
                <span className="text-sm text-slate-700">{l}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Kişisel Bilgiler */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Kişisel Bilgiler</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">1. Adı, Soyadı</label>
              <input type="text" value={personel.ad_soyad ?? ''} readOnly
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">2. Sicil No</label>
              <input type="text" value={personel.sicil_no} readOnly
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">3. Doğum Yeri ve Tarihi</label>
              <input type="text" value={dogumYeriTarihi} readOnly
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">4. Yürürlük Tarihi</label>
              <input name="yururluk_tarihi" type="date"
                defaultValue={(seciliKadro?.memuriyet_tarihi ?? seciliKadro?.kuruma_giris_tarihi ?? '').toString().slice(0, 10)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">5. Adaylık Süresi</label>
              <input name="adaylik_suresi" type="text" placeholder="Örn: 1 yıl"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">6. Asli Memurluğa Atanma Tarihi</label>
              <input name="asli_memuriyete_atanma_tarihi" type="date"
                defaultValue={(seciliKadro?.memuriyet_tarihi ?? '').toString().slice(0, 10)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">7. Öğrenim Durumu</label>
              <input type="text" value={ogrenimDurumu ?? ''} readOnly
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">8. Askerlik Durumu</label>
              <input type="text" value={personel.askerlik_durumu ?? ''} readOnly
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
          </div>
        </div>

        {/* İşlem yapılacak kadro */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">İşlem yapılacak kadro</h2>
          <select value={kadrolar.length ? seciliKadroIdx : -1} onChange={e => setSeciliKadroIdx(parseInt(e.target.value, 10))}
            className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500">
            {kadrolar.length === 0 ? (
              <option value={-1}>Bu personel için kadro kaydı yok</option>
            ) : (
            kadrolar.map((k, i) => {
              const no = k.kadro_sira_no ?? ''
              const unvan = k.kadro_unvani ?? k.gorev_unvani ?? ''
              const mud = k.kadro_mudurlugu ?? k.gorev_mudurlugu ?? ''
              const rol = (k.asil ?? '').trim() === personel.sicil_no ? 'Asil' : 'Vekil'
              return (
                <option key={k.id} value={i}>{no} – {unvan} ({mud}) – {rol}</option>
              )
            }))}
          </select>
        </div>

        {/* Durum Bilgileri ESKİ / YENİ */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Durum Bilgileri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">ESKİ</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { l: 'Görev Yeri', v: eski.gorev_yeri },
                  { l: 'Unvanı', v: eski.unvan },
                  { l: 'Sınıfı', v: eski.sinif },
                  { l: 'Kadro derecesi', v: eski.kadro_derecesi },
                  { l: 'KHA Derece', v: eski.kha_derece },
                  { l: 'KHA Kademe', v: eski.kha_kademe },
                  { l: 'EKEA Derece', v: eski.ekea_derece },
                  { l: 'EKEA Kademe', v: eski.ekea_kademe },
                  { l: 'Kıdem Yılı', v: eski.kidem_yili },
                  { l: 'ÖHT', v: eski.oht },
                  { l: 'İGZ', v: eski.igz },
                  { l: 'Ek Ödeme', v: eski.ek_odeme },
                  { l: 'Ek Gösterge', v: eski.ek_gosterge },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <span className="text-slate-400 text-xs block">{l}</span>
                    <span className="text-slate-700">{v || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-indigo-600 uppercase mb-3">YENİ</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">Görev Yeri</label>
                  <select name="yeni_gorev_yeri" defaultValue={yeni.gorev_yeri}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm">
                    <option value="">Seçiniz</option>
                    {mudurlukler.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">Unvanı</label>
                  <input name="yeni_unvan" defaultValue={yeni.unvan}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" list="unvan-list" />
                  <datalist id="unvan-list">
                    {unvanlar.map(u => <option key={u.id} value={u.ad} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">Sınıfı</label>
                  <select name="yeni_sinif" defaultValue={yeni.sinif}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm">
                    <option value="">—</option>
                    {SINIFLAR.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">Kadro derecesi</label>
                  <input name="yeni_kadro_derecesi" type="text" defaultValue={yeni.kadro_derecesi} readOnly
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-slate-50" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">KHA Derece</label>
                  <input name="yeni_kha_derece" type="text" defaultValue={yeni.kha_derece}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">KHA Kademe</label>
                  <input name="yeni_kha_kademe" type="text" defaultValue={yeni.kha_kademe}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">EKEA Derece</label>
                  <input name="yeni_ekea_derece" type="text" defaultValue={yeni.ekea_derece}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">EKEA Kademe</label>
                  <input name="yeni_ekea_kademe" type="text" defaultValue={yeni.ekea_kademe}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">Kıdem Yılı</label>
                  <input name="yeni_kidem_yili" type="text" defaultValue={yeni.kidem_yili} readOnly
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-slate-50" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">ÖHT</label>
                  <input name="yeni_oht" type="text" defaultValue={yeni.oht} placeholder="Örn: 48+10%"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">İGZ</label>
                  <input name="yeni_igz" type="text" defaultValue={yeni.igz} placeholder="Örn: 500"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">Ek Ödeme</label>
                  <input name="yeni_ek_odeme" type="text" defaultValue={yeni.ek_odeme} placeholder="Örn: 85"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">Ek Gösterge</label>
                  <input name="yeni_ek_gosterge" type="text" defaultValue={yeni.ek_gosterge} placeholder="Örn: 0"
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden ESKİ values for form submit */}
        <input type="hidden" name="eski_gorev_yeri" value={eski.gorev_yeri} />
        <input type="hidden" name="eski_unvan" value={eski.unvan} />
        <input type="hidden" name="eski_sinif" value={eski.sinif} />
        <input type="hidden" name="eski_kadro_derecesi" value={eski.kadro_derecesi} />
        <input type="hidden" name="eski_kha_derece" value={eski.kha_derece} />
        <input type="hidden" name="eski_kha_kademe" value={eski.kha_kademe} />
        <input type="hidden" name="eski_ekea_derece" value={eski.ekea_derece} />
        <input type="hidden" name="eski_ekea_kademe" value={eski.ekea_kademe} />
        <input type="hidden" name="eski_kidem_yili" value={eski.kidem_yili} />
        <input type="hidden" name="eski_oht" value={eski.oht} />
        <input type="hidden" name="eski_igz" value={eski.igz} />
        <input type="hidden" name="eski_ek_odeme" value={eski.ek_odeme} />
        <input type="hidden" name="eski_ek_gosterge" value={eski.ek_gosterge} />

        {/* Dayanak ve Açıklama */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Dayanağı</label>
              <input name="dayanak" type="text" defaultValue="657 Sayılı Memurlar Yasasının 68. maddesi gereği"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Açıklama</label>
              <input name="aciklama" type="text" placeholder="Gereğinde yapılacak açıklama"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
        </div>

        {/* Teklif eden / Onaylayan */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">16. Teklif eden</label>
              <select name="teklif_eden"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
                <option value="">Seçiniz</option>
                {yardimcilar.map(y => (
                  <option key={y.sicil} value={y.sicil}>{y.ad}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">17. Onaylayan (Belediye Başkanı)</label>
              <p className="py-1.5 text-sm font-medium text-slate-700">{onaylayan || '—'}</p>
              <input type="hidden" name="onaylayan" value={onaylayan} />
            </div>
          </div>
        </div>

        {/* Tarih ve Kayıt */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">İşe başladığı tarih</label>
              <input name="ise_baslama_tarihi" type="date"
                defaultValue={(seciliKadro?.memuriyet_tarihi ?? '').toString().slice(0, 10)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Ayrıldığı tarih</label>
              <input name="ayrilis_tarihi" type="date"
                defaultValue={(seciliKadro?.ayrilis_tarihi ?? '').toString().slice(0, 10)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Kayıt Tarihi</label>
              <input name="kayit_tarihi" type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Kayıt No</label>
              <input name="kayit_no" type="text"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">Dağıtım (Müdürlükler)</label>
            <div className="flex flex-wrap gap-3">
              {mudurlukler.map(m => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="dagitim_mudurlukleri" value={m}
                    className="rounded border-slate-300 text-slate-600" />
                  <span className="text-sm text-slate-700">{m}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1">Seçilen müdürlükler noktalı virgülle birleştirilerek kaydedilir.</p>
          </div>
        </div>

        {hata && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{hata}</p>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/personel-hareketleri"
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
  )
}
