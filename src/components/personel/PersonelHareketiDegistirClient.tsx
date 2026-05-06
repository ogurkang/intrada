'use client'

import { useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Tables } from '@/types/database'

type Calisan = Tables<'calisan'>
type KH = Tables<'kadro_hareketleri'>
type TH = Tables<'terfi_hareketleri'>

interface Props {
  personel: Calisan
  ogrenimDurumu?: string | null
  seciliKadro: KH | null
  seciliKadroRol: 'asil' | 'vekil'
  bosKadrolar: Pick<KH, 'id' | 'kadro_sira_no' | 'kadro_derecesi' | 'kadro_unvani' | 'gorev_unvani' | 'kadro_mudurlugu' | 'gorev_mudurlugu' | 'statu' | 'durumu'>[]
  mudurlukler: string[]
  unvanlar: { id: number; ad: string; sinif: string | null }[]
  onaylayan: string
  yardimcilar: { sicil: string; ad: string }[]
  terfiSon: TH | null
  popup?: boolean
  onKaydet: (fd: FormData) => Promise<{ hata?: string }>
}

export default function PersonelHareketiDegistirClient({
  personel,
  ogrenimDurumu = null,
  seciliKadro,
  seciliKadroRol,
  bosKadrolar,
  mudurlukler,
  unvanlar,
  onaylayan,
  yardimcilar,
  terfiSon,
  popup = false,
  onKaydet,
}: Props) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [kadroSecModalAcik, setKadroSecModalAcik] = useState(false)
  const [kadroArama, setKadroArama] = useState('')

  const { eski, yeni } = useMemo(() => {
    const k = seciliKadro

    const mud = k?.gorev_mudurlugu ?? k?.kadro_mudurlugu ?? ''
    const unvan = k?.gorev_unvani ?? k?.kadro_unvani ?? ''
    const sinif = unvanlar.find(u => u.ad === (k?.kadro_unvani ?? k?.gorev_unvani ?? ''))?.sinif ?? ''
    const derece = k?.kadro_derecesi ?? ''
    const siraNo = k?.kadro_sira_no ?? ''
    const kadroDurumu = k?.durumu ?? ''
    const terfi = {
      kha_derece: terfiSon?.kha_derece ?? '',
      kha_kademe: terfiSon?.kha_kademe ?? '',
      kha_tarihi: terfiSon?.kha_tarihi ?? '',
      ekea_derece: terfiSon?.ekea_derece ?? '',
      ekea_kademe: terfiSon?.ekea_kademe ?? '',
      ekea_tarihi: terfiSon?.ekea_tarihi ?? '',
      kidem_yili: terfiSon?.kidem_yili ?? '',
      kidem_tarihi: terfiSon?.kidem_tarihi ?? '',
      iyi_hal_terfi_tarihi: terfiSon?.iyi_hal_terfi_tarihi ?? '',
      ek_gosterge: terfiSon?.ek_gosterge ?? '',
      ek_odeme: terfiSon?.ek_odeme ?? '',
      oht: terfiSon?.oht ?? '',
      igz: terfiSon?.yan_odeme ?? '',
      sds_orani: terfiSon?.sds_orani ?? '',
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
  }, [seciliKadro, unvanlar, terfiSon])

  const dogumTarihiFmt = personel.dogum_tarihi ? new Date(personel.dogum_tarihi).toLocaleDateString('tr-TR') : ''
  const dogumYeriTarihi = [personel.dogum_yeri, dogumTarihiFmt].filter(Boolean).join(' ')
  const [yeniGorevYeriState, setYeniGorevYeriState] = useState(yeni.gorev_yeri ?? '')
  const [yeniKadroIdState, setYeniKadroIdState] = useState<number | null>(seciliKadro?.id ?? null)
  const [yeniKadroSiraNoState, setYeniKadroSiraNoState] = useState(yeniKadroIdState ? (seciliKadro?.kadro_sira_no ?? '') : '')
  const [yeniKadroDurumuState, setYeniKadroDurumuState] = useState(seciliKadro?.durumu ?? '')
  const [yeniUnvanState, setYeniUnvanState] = useState(yeni.unvan ?? '')
  const [yeniSinifState, setYeniSinifState] = useState(yeni.sinif ?? '')
  const [yeniKadroDerecesiState, setYeniKadroDerecesiState] = useState(yeni.kadro_derecesi ?? '')
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
    setKadroSecModalAcik(false)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    const fd = new FormData(e.currentTarget)
    const hareketTipi = String(fd.get('hareket_tipi') ?? '').trim()
    if (!hareketTipi) {
      setHata('Hareket Tipi seçimini tamamlayınız.')
      return
    }
    setIsPending(true)
    fd.set('sicil_no', personel.sicil_no)
    fd.set('kadro_sira_no', yeniKadroSiraNoState)
    onKaydet(fd).then(res => {
      setIsPending(false)
      if (res.hata) setHata(res.hata)
      else if (popup && typeof window !== 'undefined' && window.opener) {
        try {
          window.opener.postMessage({ source: 'intrada-personel-hareketleri', type: 'refresh' }, window.location.origin)
        } catch {
          window.opener.postMessage({ source: 'intrada-personel-hareketleri', type: 'refresh' }, '*')
        }
        window.close()
        setTimeout(() => {
          if (document.visibilityState === 'visible') router.push('/personel-hareketleri')
        }, 300)
      } else router.push('/personel-hareketleri')
    })
  }

  async function handleExcelIndir() {
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    const dagitim = (fd.getAll('dagitim_mudurlukleri') as string[]).filter(Boolean).join('; ')
    const hareketTipiSecim = String(fd.get('hareket_tipi') ?? '')
    const hareketTipiText =
      hareketTipiSecim === 'IlkAtanma'
        ? 'İlk Atanma'
        : hareketTipiSecim === 'YerDegistirme'
          ? 'Yer Değiştirme'
          : hareketTipiSecim === 'Yukselme'
            ? 'Yükselme'
            : ''

    const teklifSicil = String(fd.get('teklif_eden') ?? '')
    const teklifEdenAd = yardimcilar.find(y => y.sicil === teklifSicil)?.ad ?? ''
    const fmtDate = (v: string) => {
      const s = String(v ?? '').trim()
      if (!s) return ''
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-')
        return `${d}.${m}.${y}`
      }
      return s
    }
    const yeniKhaDK = `${String(fd.get('yeni_kha_derece') ?? '')}/${String(fd.get('yeni_kha_kademe') ?? '')}`.replace(/^\/|\/$/g, '')
    const yeniEkeaDK = `${String(fd.get('yeni_ekea_derece') ?? '')}/${String(fd.get('yeni_ekea_kademe') ?? '')}`.replace(/^\/|\/$/g, '')

    const XLSX = await import('xlsx-js-style')
    const resp = await fetch('/templates/personel_hareketler_formu.xls')
    if (!resp.ok) {
      setHata('Excel şablonu bulunamadı: public/templates/personel_hareketler_formu.xls')
      return
    }
    const buffer = await resp.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array', cellStyles: true })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const refStyleFromNearestCell = (addr: string) => {
      // Template files sometimes don't store "blank but styled" cells. If we need to create a
      // new cell, copy style from nearest existing cell to keep borders/formatting intact.
      try {
        const base = XLSX.utils.decode_cell(addr)
        const candidates: { r: number; c: number }[] = []
        for (let d = 1; d <= 10; d++) {
          candidates.push({ r: base.r - d, c: base.c })
          candidates.push({ r: base.r + d, c: base.c })
          candidates.push({ r: base.r, c: base.c - d })
          candidates.push({ r: base.r, c: base.c + d })
        }
        for (const p of candidates) {
          if (p.r < 0 || p.c < 0) continue
          const a = XLSX.utils.encode_cell(p)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cell = ws[a] as any
          if (cell && cell.s) return cell.s
        }
      } catch {
        // ignore
      }
      return undefined
    }

    const setCell = (addr: string, value: string) => {
      if (!value) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cur = ws[addr] as any
      if (cur) {
        cur.v = value
        cur.t = 's'
        ws[addr] = cur
        return
      }
      const s = refStyleFromNearestCell(addr)
      ws[addr] = s ? ({ t: 's', v: value, s } as never) : ({ t: 's', v: value } as never)
    }
    const mark = (addr: string, on: boolean) => setCell(addr, on ? '*' : '')

    mark('B5', hareketTipiSecim === 'IlkAtanma')
    mark('F5', hareketTipiSecim === 'YerDegistirme')
    mark('J5', hareketTipiSecim === 'Yukselme')

    // 1. görsel: başlık üst / bilgi alt
    setCell('A8', personel.ad_soyad ?? '')
    setCell('F8', personel.sicil_no)
    setCell('J8', dogumYeriTarihi)
    setCell('A10', fmtDate(String(fd.get('yururluk_tarihi') ?? '')))
    setCell('F10', String(fd.get('adaylik_suresi') ?? ''))
    setCell('J10', fmtDate(String(fd.get('asli_memuriyete_atanma_tarihi') ?? '')))
    setCell('A12', ogrenimDurumu ?? '')
    setCell('J12', personel.askerlik_durumu ?? '')

    // 2. görsel: 9-10-11
    setCell('A14', eski.sinif || '')
    setCell('H14', yeniSinifState || '')
    setCell('A15', eski.gorev_yeri || '')
    setCell('H15', yeniGorevYeriState || '')
    setCell('A16', eski.unvan || '')
    setCell('H16', yeniUnvanState || '')

    // 12. kısım: satır 17 başlık, satır 18 değer
    setCell('A18', eski.kadro_derecesi || '')
    setCell('B18', [eski.kha_derece, eski.kha_kademe].filter(Boolean).join('/') || '')
    setCell('C18', [eski.ekea_derece, eski.ekea_kademe].filter(Boolean).join('/') || '')
    setCell('D18', `${fmtDate(eski.kha_tarihi ?? '')} / ${fmtDate(eski.ekea_tarihi ?? '')}`.replace(/^ \/ | \/ $/g, ''))
    setCell('E18', `${eski.kidem_yili || ''} / ${fmtDate(eski.kidem_tarihi ?? '')} / ${fmtDate(eski.iyi_hal_terfi_tarihi ?? '')}`)
    setCell('H18', yeniKadroDerecesiState || '')
    setCell('I18', yeniKhaDK)
    setCell('J18', yeniEkeaDK)
    setCell('K18', `${fmtDate(String(fd.get('yeni_kha_tarihi') ?? ''))} / ${fmtDate(String(fd.get('yeni_ekea_tarihi') ?? ''))}`.replace(/^ \/ | \/ $/g, ''))
    setCell('L18', `${String(fd.get('yeni_kidem_yili') ?? '')} / ${fmtDate(String(fd.get('yeni_kidem_tarihi') ?? ''))} / ${fmtDate(String(fd.get('yeni_iyi_hal_terfi_tarihi') ?? ''))}`)

    // 13. kısım: satır 19 başlık, satır 20 değer
    setCell('A20', eski.ek_gosterge || '')
    setCell('B20', eski.ek_odeme || '')
    setCell('C20', eski.oht || '')
    setCell('D20', eski.igz || '')
    setCell('E20', eski.sds_orani || '')
    setCell('H20', String(fd.get('yeni_ek_gosterge') ?? ''))
    setCell('I20', String(fd.get('yeni_ek_odeme') ?? ''))
    setCell('J20', String(fd.get('yeni_oht') ?? ''))
    setCell('K20', String(fd.get('yeni_igz') ?? ''))
    setCell('L20', String(fd.get('yeni_sds_orani') ?? ''))

    // 3. görsel alanları
    setCell('A22', String(fd.get('dayanak') ?? ''))
    setCell('A25', String(fd.get('aciklama') ?? ''))
    setCell('A30', teklifEdenAd)
    setCell('A37', onaylayan || '')
    setCell('G27', fmtDate(String(fd.get('ise_baslama_tarihi') ?? '')))
    setCell('J27', fmtDate(String(fd.get('ayrilis_tarihi') ?? '')))
    setCell('G31', `${fmtDate(String(fd.get('kayit_tarihi') ?? ''))} ${String(fd.get('kayit_no') ?? '').trim()}`.trim())
    if (dagitim) setCell('G34', dagitim)

    XLSX.writeFile(wb, `personel-hareketi-${personel.sicil_no}.xls`)
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

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
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
            <div>
              <h3 className="text-xs font-semibold text-indigo-600 uppercase mb-3">YENİ</h3>
              <div className="space-y-2">
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
                      <input name="yeni_kha_derece" type="text" defaultValue={yeni.kha_derece}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">KHA D/K (K)</label>
                      <input name="yeni_kha_kademe" type="text" defaultValue={yeni.kha_kademe}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">KHA Tarihi</label>
                    <input name="yeni_kha_tarihi" type="date" defaultValue={(yeni.kha_tarihi ?? '').toString().slice(0, 10)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">EKEA D/K (D)</label>
                      <input name="yeni_ekea_derece" type="text" defaultValue={yeni.ekea_derece}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-0.5">EKEA D/K (K)</label>
                      <input name="yeni_ekea_kademe" type="text" defaultValue={yeni.ekea_kademe}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">EKEA Tarihi</label>
                    <input name="yeni_ekea_tarihi" type="date" defaultValue={(yeni.ekea_tarihi ?? '').toString().slice(0, 10)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Kıdem Yılı</label>
                    <input name="yeni_kidem_yili" type="text" defaultValue={yeni.kidem_yili}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Kıdem Tarihi</label>
                    <input name="yeni_kidem_tarihi" type="date" defaultValue={(yeni.kidem_tarihi ?? '').toString().slice(0, 10)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">İyi Hal Tarihi</label>
                    <input name="yeni_iyi_hal_terfi_tarihi" type="date" defaultValue={(yeni.iyi_hal_terfi_tarihi ?? '').toString().slice(0, 10)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Ek Gösterge</label>
                    <input name="yeni_ek_gosterge" type="text" defaultValue={yeni.ek_gosterge}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Ek Ödeme</label>
                    <input name="yeni_ek_odeme" type="text" defaultValue={yeni.ek_odeme}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">ÖHT</label>
                    <input name="yeni_oht" type="text" defaultValue={yeni.oht}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">Yan Ödeme</label>
                    <input name="yeni_igz" type="text" defaultValue={yeni.igz}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-0.5">SDS</label>
                    <input name="yeni_sds_orani" type="text" defaultValue={yeni.sds_orani}
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Yürürlük Tarihi</label>
              <input name="yururluk_tarihi" type="date"
                defaultValue={(seciliKadro?.memuriyet_tarihi ?? seciliKadro?.kuruma_giris_tarihi ?? '').toString().slice(0, 10)}
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

        <div className="flex justify-end gap-3">
          <Link href="/personel-hareketleri"
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50">
            İptal
          </Link>
          <button type="submit" disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Kaydediliyor…' : 'Kaydet'}
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
              <h3 className="text-sm font-semibold text-slate-700">Yeni Kadro Seçimi (Sadece Durumu Boş Olanlar)</h3>
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
