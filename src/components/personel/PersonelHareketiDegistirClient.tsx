'use client'

import { useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Tables } from '@/types/database'
import { dogrulaAyrilisAlanlari } from '@/lib/personel-ayrilis'
import { trNormalize } from '@/lib/turkce-search'
import {
  PERSONEL_HAREKET_SABLON_SAYFA,
  PERSONEL_HAREKET_SABLON_URL,
  personelHareketExcelDoldurExcelJs,
  personelHareketFormVerisiOlustur,
  personelHareketWordBelgesi,
  type GostergeKayit,
} from '@/lib/personel-hareket-belge'

type Calisan = Tables<'calisan'>
type KH = Tables<'kadro_hareketleri'>
type TH = Tables<'terfi_hareketleri'>

type DurumBilgi = {
  gorev_yeri: string
  unvan: string
  sinif: string
  kadro_derecesi: string
  kadro_sira_no: string
  kadro_durumu: string
  kha_derece: string
  kha_kademe: string
  kha_tarihi: string
  ekea_derece: string
  ekea_kademe: string
  ekea_tarihi: string
  kidem_yili: string
  kidem_tarihi: string
  iyi_hal_terfi_tarihi: string
  ek_gosterge: string
  ek_odeme: string
  oht: string
  igz: string
  sds_orani: string
}

const BOS_DURUM: DurumBilgi = {
  gorev_yeri: '',
  unvan: '',
  sinif: '',
  kadro_derecesi: '',
  kadro_sira_no: '',
  kadro_durumu: '',
  kha_derece: '',
  kha_kademe: '',
  kha_tarihi: '',
  ekea_derece: '',
  ekea_kademe: '',
  ekea_tarihi: '',
  kidem_yili: '',
  kidem_tarihi: '',
  iyi_hal_terfi_tarihi: '',
  ek_gosterge: '',
  ek_odeme: '',
  oht: '',
  igz: '',
  sds_orani: '',
}

interface Props {
  personel: Calisan | null
  personeller?: { sicil_no: string; ad_soyad: string }[]
  ogrenimDurumu?: string | null
  seciliKadro: KH | null
  seciliKadroRol: 'asil' | 'vekil'
  bosKadrolar: Pick<KH, 'id' | 'kadro_sira_no' | 'kadro_derecesi' | 'kadro_unvani' | 'gorev_unvani' | 'kadro_mudurlugu' | 'gorev_mudurlugu' | 'statu' | 'durumu'>[]
  mudurlukler: string[]
  unvanlar: { id: number; ad: string; sinif: string | null }[]
  onaylayan: string
  yardimcilar: { sicil: string; ad: string }[]
  terfiSon: TH | null
  gostergeler: GostergeKayit[]
  ayrilisNedenleri: string[]
  sonHareketAyrilis?: { tarih: string | null; nedeni: string | null }
  popup?: boolean
  yeniKayit?: boolean
  saltOkunur?: boolean
  onKaydet: (fd: FormData) => Promise<{ hata?: string }>
}

export default function PersonelHareketiDegistirClient({
  personel,
  personeller = [],
  ogrenimDurumu = null,
  seciliKadro,
  seciliKadroRol,
  bosKadrolar,
  mudurlukler,
  unvanlar,
  onaylayan,
  yardimcilar,
  terfiSon,
  gostergeler,
  ayrilisNedenleri,
  sonHareketAyrilis,
  popup = false,
  yeniKayit = false,
  saltOkunur = false,
  onKaydet,
}: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [kaydedildi, setKaydedildi] = useState(false)
  const [kadroSecModalAcik, setKadroSecModalAcik] = useState(false)
  const [kadroArama, setKadroArama] = useState('')
  const [yeniBolumKey, setYeniBolumKey] = useState(0)
  const [personelArama, setPersonelArama] = useState('')
  const [personelAramaAcik, setPersonelAramaAcik] = useState(false)

  const { eski, yeni } = useMemo(() => {
    if (yeniKayit) {
      return { eski: BOS_DURUM, yeni: BOS_DURUM }
    }

    const k = seciliKadro

    const mud = k?.gorev_mudurlugu ?? k?.kadro_mudurlugu ?? ''
    const unvan = k?.gorev_unvani ?? k?.kadro_unvani ?? ''
    const sinif = unvanlar.find(u => u.ad === (k?.kadro_unvani ?? k?.gorev_unvani ?? ''))?.sinif ?? ''
    const derece = String(k?.kadro_derecesi ?? '')
    const siraNo = String(k?.kadro_sira_no ?? '')
    const kadroDurumu = k?.durumu ?? ''
    const terfi = {
      kha_derece: String(terfiSon?.kha_derece ?? ''),
      kha_kademe: String(terfiSon?.kha_kademe ?? ''),
      kha_tarihi: terfiSon?.kha_tarihi ?? '',
      ekea_derece: String(terfiSon?.ekea_derece ?? ''),
      ekea_kademe: String(terfiSon?.ekea_kademe ?? ''),
      ekea_tarihi: terfiSon?.ekea_tarihi ?? '',
      kidem_yili: String(terfiSon?.kidem_yili ?? ''),
      kidem_tarihi: terfiSon?.kidem_tarihi ?? '',
      iyi_hal_terfi_tarihi: terfiSon?.iyi_hal_terfi_tarihi ?? '',
      ek_gosterge: String(terfiSon?.ek_gosterge ?? ''),
      ek_odeme: String(terfiSon?.ek_odeme ?? ''),
      oht: String(terfiSon?.oht ?? ''),
      igz: String(terfiSon?.yan_odeme ?? ''),
      sds_orani: String(terfiSon?.sds_orani ?? ''),
    }

    return {
      eski: {
        gorev_yeri: mud,
        unvan,
        sinif,
        kadro_derecesi: derece,
        kadro_sira_no: siraNo,
        kadro_durumu: kadroDurumu,
        ...terfi,
      },
      yeni: {
        gorev_yeri: mud,
        unvan,
        sinif,
        kadro_derecesi: derece,
        kadro_sira_no: siraNo,
        kadro_durumu: kadroDurumu,
        ...terfi,
      },
    }
  }, [seciliKadro, unvanlar, terfiSon, yeniKayit])

  const filtreliPersoneller = useMemo(() => {
    const q = trNormalize(personelArama)
    if (!q) return personeller.slice(0, 12)
    return personeller
      .filter(p => trNormalize(p.sicil_no).includes(q) || trNormalize(p.ad_soyad).includes(q))
      .slice(0, 12)
  }, [personeller, personelArama])

  const formKilitli = saltOkunur
  const detayKilitli = saltOkunur || (yeniKayit && !personel)

  const dogumTarihiFmt = personel?.dogum_tarihi ? new Date(personel.dogum_tarihi).toLocaleDateString('tr-TR') : ''
  const dogumYeriTarihi = personel ? [personel.dogum_yeri, dogumTarihiFmt].filter(Boolean).join(' ') : ''
  const [yeniGorevYeriState, setYeniGorevYeriState] = useState(yeniKayit ? '' : (yeni.gorev_yeri ?? ''))
  const [yeniKadroIdState, setYeniKadroIdState] = useState<number | null>(yeniKayit ? null : (seciliKadro?.id ?? null))
  const [yeniKadroSiraNoState, setYeniKadroSiraNoState] = useState(yeniKayit ? '' : (yeniKadroIdState ? (seciliKadro?.kadro_sira_no ?? '') : ''))
  const [yeniKadroDurumuState, setYeniKadroDurumuState] = useState(yeniKayit ? '' : (seciliKadro?.durumu ?? ''))
  const [yeniUnvanState, setYeniUnvanState] = useState(yeniKayit ? '' : (yeni.unvan ?? ''))
  const [yeniSinifState, setYeniSinifState] = useState(yeniKayit ? '' : (yeni.sinif ?? ''))
  const [yeniKadroDerecesiState, setYeniKadroDerecesiState] = useState(yeniKayit ? '' : (yeni.kadro_derecesi ?? ''))
  const [yeniKadroRolState, setYeniKadroRolState] = useState<'asil' | 'vekil'>(yeniKayit ? 'asil' : seciliKadroRol)
  const [yeniGirisVarsayilan, setYeniGirisVarsayilan] = useState<DurumBilgi>(yeniKayit ? BOS_DURUM : yeni)

  function kadroRolDegistir(rol: 'asil' | 'vekil') {
    setYeniKadroRolState(rol)
    kadroyuBosalt()
  }

  function personelSec(sicil: string) {
    const q = popup ? '&popup=1' : ''
    router.push(`/personel-hareketleri/${encodeURIComponent(sicil)}/degistir?yeni=1${q}`)
  }

  function personelDegistir() {
    router.push(`/personel-hareketleri/ekle${popup ? '?popup=1' : ''}`)
  }

  const bosKadrolarSirali = useMemo(() => {
    return [...bosKadrolar].sort((a, b) => {
      const aNo = Number.parseInt(String(a.kadro_sira_no ?? '').replace(/[^\d-]/g, ''), 10)
      const bNo = Number.parseInt(String(b.kadro_sira_no ?? '').replace(/[^\d-]/g, ''), 10)
      const aOk = Number.isFinite(aNo)
      const bOk = Number.isFinite(bNo)
      if (aOk && bOk) return aNo - bNo
      if (aOk) return -1
      if (bOk) return 1
      return String(a.kadro_sira_no ?? '').localeCompare(String(b.kadro_sira_no ?? ''), 'tr')
    })
  }, [bosKadrolar])
  const bosKadrolarFiltreli = useMemo(() => {
    const q = kadroArama.trim().toLocaleLowerCase('tr-TR')
    if (!q) return bosKadrolarSirali
    return bosKadrolarSirali.filter(k => {
      const sira = String(k.kadro_sira_no ?? '').toLocaleLowerCase('tr-TR')
      const derece = String(k.kadro_derecesi ?? '').toLocaleLowerCase('tr-TR')
      const unvan = String(k.kadro_unvani ?? k.gorev_unvani ?? '').toLocaleLowerCase('tr-TR')
      return sira.includes(q) || derece.includes(q) || unvan.includes(q)
    })
  }, [bosKadrolarSirali, kadroArama])

  function kadroSec(kadro: Pick<KH, 'id' | 'kadro_sira_no' | 'kadro_derecesi' | 'kadro_unvani' | 'gorev_unvani' | 'kadro_mudurlugu' | 'gorev_mudurlugu' | 'durumu'>) {
    const unvan = kadro.kadro_unvani ?? kadro.gorev_unvani ?? ''
    const sinif = unvanlar.find(u => u.ad === unvan)?.sinif ?? ''
    setYeniKadroIdState(kadro.id)
    setYeniKadroSiraNoState(kadro.kadro_sira_no ?? '')
    setYeniKadroDurumuState(kadro.durumu ?? '')
    setYeniUnvanState(unvan)
    setYeniSinifState(sinif)
    setYeniKadroDerecesiState(kadro.kadro_derecesi ?? '')
    setYeniGorevYeriState(kadro.gorev_mudurlugu ?? kadro.kadro_mudurlugu ?? '')
    setKadroSecModalAcik(false)
  }

  function kadroyuBosalt() {
    setYeniKadroIdState(null)
    setYeniKadroSiraNoState('')
    setYeniKadroDurumuState('')
    setYeniUnvanState('')
    setYeniSinifState('')
    setYeniKadroDerecesiState('')
    setYeniGorevYeriState('')
    setYeniGirisVarsayilan(BOS_DURUM)
    setYeniBolumKey(k => k + 1)
    setKadroSecModalAcik(false)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (saltOkunur) return
    if (!personel) {
      setHata('Lütfen kişisel bilgiler bölümünden personel seçiniz.')
      return
    }
    setHata(null)
    const fd = new FormData(e.currentTarget)
    const hareketTipi = String(fd.get('hareket_tipi') ?? '').trim()
    if (!hareketTipi) {
      setHata('Hareket Tipi seçimini tamamlayınız.')
      return
    }
    const ayrilisHata = dogrulaAyrilisAlanlari(
      String(fd.get('ayrilis_tarihi') ?? '').trim() || null,
      String(fd.get('ayrilis_nedeni') ?? '').trim() || null,
    )
    if (ayrilisHata) {
      setHata(ayrilisHata)
      return
    }
    setIsPending(true)
    fd.set('sicil_no', personel.sicil_no)
    fd.set('kadro_sira_no', yeniKadroSiraNoState)
    onKaydet(fd).then(res => {
      setIsPending(false)
      if (res.hata) setHata(res.hata)
      else {
        setKaydedildi(true)
        try {
          if (typeof window !== 'undefined' && window.opener) {
            window.opener.postMessage({ source: 'intrada-personel-hareketleri', type: 'refresh' }, window.location.origin)
          }
        } catch {
          if (typeof window !== 'undefined' && window.opener) {
            window.opener.postMessage({ source: 'intrada-personel-hareketleri', type: 'refresh' }, '*')
          }
        }
      }
    })
  }

  function handleKapat() {
    if (popup && typeof window !== 'undefined' && window.opener) {
      window.close()
      return
    }
    router.push('/personel-hareketleri')
  }

  function formVerisiOlustur() {
    if (!formRef.current || !personel) return null
    const fd = new FormData(formRef.current)
    return personelHareketFormVerisiOlustur({
      fd,
      personel,
      dogumYeriTarihi,
      ogrenimDurumu,
      onaylayan,
      yardimcilar,
      eski,
      yeniGorevYeri: yeniGorevYeriState,
      yeniUnvan: yeniUnvanState,
      yeniSinif: yeniSinifState,
      yeniKadroDerecesi: yeniKadroDerecesiState,
      gostergeler,
    })
  }

  async function handleExcelIndir() {
    const veri = formVerisiOlustur()
    if (!veri || !personel) return
    setHata(null)

    try {
      const ExcelJS = (await import('exceljs')).default
      const resp = await fetch(PERSONEL_HAREKET_SABLON_URL)
      if (!resp.ok) {
        setHata(`Excel şablonu bulunamadı: ${PERSONEL_HAREKET_SABLON_URL}`)
        return
      }
      const buffer = await resp.arrayBuffer()
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(buffer)
      const ws =
        wb.getWorksheet(PERSONEL_HAREKET_SABLON_SAYFA) ?? wb.worksheets[0]
      if (!ws) {
        setHata('Excel şablonunda veri sayfası bulunamadı.')
        return
      }

      personelHareketExcelDoldurExcelJs(ws, veri)
      const out = await wb.xlsx.writeBuffer()
      const blob = new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `personel-hareketi-${personel.sicil_no}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PERSONEL_HAREKET_EXCEL_HATA', err)
      setHata('Excel belgesi oluşturulamadı.')
    }
  }

  async function handleWordIndir() {
    const veri = formVerisiOlustur()
    if (!veri || !personel) return
    setHata(null)
    try {
      const { Packer } = await import('docx')
      const doc = personelHareketWordBelgesi(veri)
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `personel-hareketi-${personel.sicil_no}.docx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PERSONEL_HAREKET_WORD_HATA', err)
      setHata('Word belgesi oluşturulamadı.')
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {yeniKayit ? 'Personel Hareketi - Yeni Kayıt' : 'Personel Hareketi - Değiştir'}
        </h1>
        <Link href="/personel-hareketleri"
          className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors">
          ← Listeye Dön
        </Link>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        {saltOkunur && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Bu personelin aktif kadro/vekalet kaydı bulunmadığı için form salt okunur açıldı.
            Excel ve Word indirilebilir, değişiklik kaydedilemez.
          </div>
        )}
        {yeniKayit && !saltOkunur && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {personel
              ? 'Yeni personel hareketi oluşturuyorsunuz. ESKİ alan boş; YENİ bölümünü doldurup kaydedin. Boş kadro seçimi ile personeli kadroya atayabilirsiniz.'
              : 'Kişisel bilgiler bölümünden personel seçin; ardından YENİ bölümünü doldurarak kayıt oluşturun.'}
          </div>
        )}
        {kaydedildi && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Kayıt başarıyla tamamlandı. İsterseniz belgeyi indirip ardından formu kapatabilirsiniz.
          </div>
        )}
        <fieldset disabled={formKilitli} className="space-y-6 disabled:opacity-95">
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
                <input type="radio" name="hareket_tipi" value={v}
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
              {yeniKayit && !personel ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="İsim veya sicil no ile ara…"
                    value={personelArama}
                    onChange={e => { setPersonelArama(e.target.value); setPersonelAramaAcik(true) }}
                    onFocus={() => setPersonelAramaAcik(true)}
                    onBlur={() => setTimeout(() => setPersonelAramaAcik(false), 200)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                  />
                  {personelAramaAcik && filtreliPersoneller.length > 0 && (
                    <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filtreliPersoneller.map(p => (
                        <li key={p.sicil_no}>
                          <button
                            type="button"
                            onMouseDown={() => personelSec(p.sicil_no)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                          >
                            <span className="font-medium text-slate-800">{p.ad_soyad}</span>
                            <span className="text-slate-400 text-xs ml-2">{p.sicil_no}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input type="text" value={personel?.ad_soyad ?? ''} readOnly
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50" />
                  {yeniKayit && personel && (
                    <button type="button" onClick={personelDegistir}
                      className="text-xs text-slate-500 hover:text-slate-700 whitespace-nowrap px-2 py-1 border border-slate-200 rounded">
                      Değiştir
                    </button>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">2. Sicil No</label>
              <input type="text" value={personel?.sicil_no ?? ''} readOnly
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">3. Doğum Yeri ve Tarihi</label>
              <input type="text" value={dogumYeriTarihi} readOnly
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">5. Adaylık Süresi</label>
              <input name="adaylik_suresi" type="text" placeholder="Örn: 1 yıl"
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">6. Asli Memurluğa Atanma Tarihi</label>
              <input name="asli_memuriyete_atanma_tarihi" type="date"
                defaultValue={(
                  yeniKayit
                    ? (personel?.memuriyet_tarihi ?? personel?.kuruma_giris_tarihi ?? '')
                    : (seciliKadro?.memuriyet_tarihi ?? '')
                ).toString().slice(0, 10)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">7. Öğrenim Durumu</label>
              <input type="text" value={ogrenimDurumu ?? ''} readOnly
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">8. Askerlik Durumu</label>
              <input type="text" value={personel?.askerlik_durumu ?? ''} readOnly
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
          </div>
        </div>
        </fieldset>

        <fieldset disabled={detayKilitli} className="space-y-6 disabled:opacity-95">
        {/* Durum Bilgileri ESKİ / YENİ */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Durum Bilgileri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">ESKİ</h3>
              <div className="space-y-2 text-sm">
                <div className="border border-slate-200 rounded bg-white px-2 py-1.5">
                  <span className="text-slate-400 text-xs block">Görev Müdürlüğü</span>
                  <span className="text-slate-700">{eski.gorev_yeri || '—'}</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">Unvanı</span><span className="text-slate-700">{eski.unvan || '—'}</span></div>
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">Sınıfı</span><span className="text-slate-700">{eski.sinif || '—'}</span></div>
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">Kadro Derecesi</span><span className="text-slate-700">{eski.kadro_derecesi || '—'}</span></div>
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">Kadro Sıra No</span><span className="text-slate-700">{eski.kadro_sira_no || '—'}</span></div>
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">Durumu</span><span className="text-slate-700">{eski.kadro_durumu || '—'}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">KHA D/K</span><span className="text-slate-700">{[eski.kha_derece, eski.kha_kademe].filter(Boolean).join('/') || '—'}</span></div>
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">KHA Tarihi</span><span className="text-slate-700">{eski.kha_tarihi ? new Date(eski.kha_tarihi).toLocaleDateString('tr-TR') : '—'}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">EKEA D/K</span><span className="text-slate-700">{[eski.ekea_derece, eski.ekea_kademe].filter(Boolean).join('/') || '—'}</span></div>
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">EKEA Tarihi</span><span className="text-slate-700">{eski.ekea_tarihi ? new Date(eski.ekea_tarihi).toLocaleDateString('tr-TR') : '—'}</span></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">Kıdem Yılı</span><span className="text-slate-700">{eski.kidem_yili || '—'}</span></div>
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">Kıdem Tarihi</span><span className="text-slate-700">{eski.kidem_tarihi ? new Date(eski.kidem_tarihi).toLocaleDateString('tr-TR') : '—'}</span></div>
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">İyi Hal Tarihi</span><span className="text-slate-700">{eski.iyi_hal_terfi_tarihi ? new Date(eski.iyi_hal_terfi_tarihi).toLocaleDateString('tr-TR') : '—'}</span></div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">Ek Gösterge</span><span className="text-slate-700">{eski.ek_gosterge || '—'}</span></div>
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">Ek Ödeme</span><span className="text-slate-700">{eski.ek_odeme || '—'}</span></div>
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">ÖHT</span><span className="text-slate-700">{eski.oht || '—'}</span></div>
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">Yan Ödeme</span><span className="text-slate-700">{eski.igz || '—'}</span></div>
                  <div className="border border-slate-200 rounded bg-white px-2 py-1.5"><span className="text-slate-400 text-xs block">SDS</span><span className="text-slate-700">{eski.sds_orani || '—'}</span></div>
                </div>
              </div>
            </div>
            <div key={yeniBolumKey}>
              <h3 className="text-xs font-semibold text-indigo-600 uppercase mb-3">YENİ</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Kadro İlişki Tipi</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={yeniKadroRolState === 'asil'}
                        onChange={() => kadroRolDegistir('asil')}
                        className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                      />
                      <span className="text-sm text-slate-700">Asil</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={yeniKadroRolState === 'vekil'}
                        onChange={() => kadroRolDegistir('vekil')}
                        className="rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                      />
                      <span className="text-sm text-slate-700">Vekil</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Kadro seçiminde yalnızca statüsü Memur ve durumu boş olan kadrolar listelenir. Asil veya vekil seçiminiz kayıt sonrası kadro hareketlerine yansır.
                  </p>
                  <input type="hidden" name="yeni_kadro_rol" value={yeniKadroRolState} />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-0.5">Görev Müdürlüğü</label>
                  <select name="yeni_gorev_yeri" value={yeniGorevYeriState} onChange={(e) => setYeniGorevYeriState(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm">
                    <option value="">Seçiniz</option>
                    {mudurlukler.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-xs text-slate-500">Unvanı</label>
                      <span className="text-xs font-medium text-indigo-600 whitespace-nowrap">Seçim Yap</span>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setKadroSecModalAcik(true)}
                        className="w-full text-left px-2 py-1.5 border border-slate-300 rounded text-sm bg-white hover:bg-slate-50"
                      >
                        {yeniUnvanState || 'Kadro Seç (açılır pencereden)'}
                      </button>
                    </div>
                    <input type="hidden" name="yeni_unvan" value={yeniUnvanState} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Sınıfı</label>
                    <input name="yeni_sinif" value={yeniSinifState} readOnly
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Kadro Derecesi</label>
                    <input name="yeni_kadro_derecesi" type="text" value={yeniKadroDerecesiState} readOnly
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Kadro Sıra No</label>
                    <input type="text" value={yeniKadroSiraNoState} readOnly
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Durumu</label>
                    <input type="text" value={yeniKadroDurumuState} readOnly
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-slate-50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">KHA D/K (D)</label>
                      <input name="yeni_kha_derece" type="text" defaultValue={yeniGirisVarsayilan.kha_derece}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">KHA D/K (K)</label>
                      <input name="yeni_kha_kademe" type="text" defaultValue={yeniGirisVarsayilan.kha_kademe}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">KHA Tarihi</label>
                    <input name="yeni_kha_tarihi" type="date" defaultValue={(yeniGirisVarsayilan.kha_tarihi ?? '').toString().slice(0, 10)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">EKEA D/K (D)</label>
                      <input name="yeni_ekea_derece" type="text" defaultValue={yeniGirisVarsayilan.ekea_derece}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">EKEA D/K (K)</label>
                      <input name="yeni_ekea_kademe" type="text" defaultValue={yeniGirisVarsayilan.ekea_kademe}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">EKEA Tarihi</label>
                    <input name="yeni_ekea_tarihi" type="date" defaultValue={(yeniGirisVarsayilan.ekea_tarihi ?? '').toString().slice(0, 10)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Kıdem Yılı</label>
                    <input name="yeni_kidem_yili" type="text" defaultValue={yeniGirisVarsayilan.kidem_yili}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Kıdem Tarihi</label>
                    <input name="yeni_kidem_tarihi" type="date" defaultValue={(yeniGirisVarsayilan.kidem_tarihi ?? '').toString().slice(0, 10)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">İyi Hal Tarihi</label>
                    <input name="yeni_iyi_hal_terfi_tarihi" type="date" defaultValue={(yeniGirisVarsayilan.iyi_hal_terfi_tarihi ?? '').toString().slice(0, 10)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Ek Gösterge</label>
                    <input name="yeni_ek_gosterge" type="text" defaultValue={yeniGirisVarsayilan.ek_gosterge}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Ek Ödeme</label>
                    <input name="yeni_ek_odeme" type="text" defaultValue={yeniGirisVarsayilan.ek_odeme}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">ÖHT</label>
                    <input name="yeni_oht" type="text" defaultValue={yeniGirisVarsayilan.oht}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Yan Ödeme</label>
                    <input name="yeni_igz" type="text" defaultValue={yeniGirisVarsayilan.igz}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">SDS</label>
                    <input name="yeni_sds_orani" type="text" defaultValue={yeniGirisVarsayilan.sds_orani}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
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
        <input type="hidden" name="onceki_kadro_id" value={seciliKadro?.id ?? ''} />
        <input type="hidden" name="onceki_kadro_rol" value={seciliKadroRol} />
        <input type="hidden" name="yeni_kadro_id" value={yeniKadroIdState ?? ''} />

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">İşe başladığı tarih</label>
              <input name="ise_baslama_tarihi" type="date"
                defaultValue={(
                  yeniKayit
                    ? (personel?.memuriyet_tarihi ?? personel?.kuruma_giris_tarihi ?? '')
                    : (seciliKadro?.memuriyet_tarihi ?? '')
                ).toString().slice(0, 10)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Ayrıldığı tarih</label>
              <input name="ayrilis_tarihi" type="date"
                defaultValue={(
                  yeniKayit ? '' : (sonHareketAyrilis?.tarih ?? seciliKadro?.ayrilis_tarihi ?? '')
                ).toString().slice(0, 10)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Ayrılış Nedeni</label>
              <select name="ayrilis_nedeni" defaultValue={yeniKayit ? '' : (sonHareketAyrilis?.nedeni ?? '')}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="">Seçiniz</option>
                {ayrilisNedenleri.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Kayıt Tarihi</label>
              <input name="kayit_tarihi" type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">İşlem No</label>
              <input type="text" readOnly value="Kayıt sonrası atanır (PH#…)"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Yürürlük Tarihi</label>
              <input name="yururluk_tarihi" type="date"
                defaultValue={(
                  yeniKayit
                    ? ''
                    : (seciliKadro?.memuriyet_tarihi ?? seciliKadro?.kuruma_giris_tarihi ?? '')
                ).toString().slice(0, 10)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500" />
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
        </fieldset>

        <div className="flex justify-end gap-3">
          <Link href="/personel-hareketleri"
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
            İptal
          </Link>
          <button type="submit" disabled={isPending || detayKilitli}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          {kaydedildi && (
            <button
              type="button"
              onClick={handleKapat}
              className="px-4 py-2 text-sm font-medium text-rose-700 border border-rose-300 rounded-lg hover:bg-rose-50"
            >
              Kapat
            </button>
          )}
          <button
            type="button"
            onClick={handleWordIndir}
            className="px-4 py-2 text-sm font-medium text-indigo-700 border border-indigo-300 rounded-lg hover:bg-indigo-50"
          >
            Word İndir
          </button>
          <button
            type="button"
            onClick={handleExcelIndir}
            className="px-4 py-2 text-sm font-medium text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50"
          >
            Excel İndir
          </button>
        </div>
      </form>

      {kadroSecModalAcik && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Yeni Kadro Seçimi (Memur · durumu boş)</h3>
              <button type="button" onClick={() => setKadroSecModalAcik(false)} className="text-sm text-slate-500 hover:text-slate-700">Kapat</button>
            </div>
            <div className="px-4 py-3 border-b border-slate-100 space-y-2">
              <button type="button" onClick={kadroyuBosalt} className="px-3 py-1.5 rounded border border-amber-300 text-amber-700 hover:bg-amber-50">
                İlişkilendirilen kadroyu boşalt
              </button>
              <input
                type="text"
                value={kadroArama}
                onChange={(e) => setKadroArama(e.target.value)}
                placeholder="Hızlı arama: Kadro Sıra No / Kadro Derecesi / Kadro Unvanı"
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
              />
            </div>
            <div className="overflow-auto max-h-[55vh]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-3 py-2">Kadro Sıra No</th>
                    <th className="text-left px-3 py-2">Kadro Derecesi</th>
                    <th className="text-left px-3 py-2">Kadro Unvanı</th>
                    <th className="text-left px-3 py-2 w-28">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bosKadrolarFiltreli.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-slate-400">Uygun boş kadro bulunamadı.</td>
                    </tr>
                  ) : bosKadrolarFiltreli.map(k => (
                    <tr key={k.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">{k.kadro_sira_no ?? '—'}</td>
                      <td className="px-3 py-2">{k.kadro_derecesi ?? '—'}</td>
                      <td className="px-3 py-2">{k.kadro_unvani ?? k.gorev_unvani ?? '—'}</td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => kadroSec(k)} className="px-2 py-1 rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50">
                          Seç
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end">
              <button type="button" onClick={() => setKadroSecModalAcik(false)} className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50">
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
