'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ppHarcamaYetkilileriSirala,
  type PpHarcamaYetkilileriRapor,
  type PpHarcamaYetkilileriSirala,
  type PpHarcamaYetkilileriYon,
} from '@/lib/pp-harcama-yetkilileri-rapor'
import { PP_RAPORLAR_BASE } from '@/lib/pp-rapor-listesi'
import { ppHarcamaYetkilileriKaydetAction } from '@/app/(dashboard)/stratejik-yonetim/performans-programi/raporlar/harcama-birim-yetkilileri/actions'
import PpEkranBilgi from '@/components/stratejik/PpEkranBilgi'

const EXCEL = '/api/performans-programi/raporlar/harcama-birim-yetkilileri/excel'

const HUCRE = 'border border-slate-300 px-3 py-2.5 align-middle text-sm'
const BASLIK = 'border border-slate-300 bg-[#9DC3E6] px-3 py-2.5 text-center text-sm font-bold text-slate-900'

function okIsaret(aktif: boolean, yon: PpHarcamaYetkilileriYon): string {
  if (!aktif) return '↕'
  return yon === 'asc' ? '↑' : '↓'
}

export default function PpHarcamaYetkilileriClient({
  rapor,
}: {
  rapor: PpHarcamaYetkilileriRapor
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [hata, setHata] = useState('')
  const [bilgi, setBilgi] = useState('')
  const [sirala, setSirala] = useState<PpHarcamaYetkilileriSirala>('yetkili')
  const [yon, setYon] = useState<PpHarcamaYetkilileriYon>('asc')

  const satirlar = useMemo(
    () => ppHarcamaYetkilileriSirala(rapor.satirlar, sirala, yon),
    [rapor.satirlar, sirala, yon],
  )

  function sutunSirala(alan: PpHarcamaYetkilileriSirala) {
    if (sirala === alan) setYon(y => (y === 'asc' ? 'desc' : 'asc'))
    else {
      setSirala(alan)
      setYon('asc')
    }
  }

  function kaydetVeyaGuncelle(tur: 'kaydet' | 'guncelle') {
    setHata('')
    setBilgi('')
    startTransition(async () => {
      const sonuc = await ppHarcamaYetkilileriKaydetAction()
      if (!sonuc.ok) {
        setHata(sonuc.hata ?? 'İşlem başarısız.')
        return
      }
      setBilgi(
        tur === 'kaydet'
          ? `Liste mühürlendi (${sonuc.adet ?? 0} satır).`
          : `Liste kadrodan güncellendi (${sonuc.adet ?? 0} satır).`,
      )
      router.refresh()
    })
  }

  const guncellemeMetin = rapor.guncellemeAt
    ? new Date(rapor.guncellemeAt).toLocaleString('tr-TR')
    : null

  const excel = `${EXCEL}?sirala=${sirala}&yon=${yon}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">
              Harcama Birim Yetkilileri Tablosu
            </h1>
            <PpEkranBilgi maddeler={[
              { baslik: 'Hazır liste', metin: 'İlk açılışta kadro hareketindeki müdürler hazır gelir. Kaydet ile mühürlenir.' },
              { baslik: 'Kaydet', metin: 'Ekrandaki / canlı kadro listesini kaydeder; bundan sonra değişiklikler Güncelle olmadan yansımaz.' },
              { baslik: 'Güncelle', metin: 'Kadro hareketindeki güncel müdürleri mühürlü listenin üstüne yazar.' },
              { baslik: 'Sıralama', metin: 'Harcama Yetkilisi veya Harcama Birimi başlığına tıklayarak A–Z / Z–A sıralayın; Excel aynı sırayı kullanır.' },
            ]} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {rapor.kayitli
              ? (guncellemeMetin ? `Mühürlü liste — son kayıt/güncelleme: ${guncellemeMetin}` : 'Mühürlü liste gösteriliyor.')
              : 'Canlı kadro listesi (henüz mühürlenmedi). Kaydet ile sabitleyin.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href={PP_RAPORLAR_BASE}
            className="inline-flex items-center rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            ← Raporlar
          </Link>
          <button
            type="button"
            disabled={pending}
            onClick={() => kaydetVeyaGuncelle('kaydet')}
            className="inline-flex items-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-60"
          >
            {pending ? '…' : 'Kaydet'}
          </button>
          <button
            type="button"
            disabled={pending || !rapor.kayitli}
            onClick={() => kaydetVeyaGuncelle('guncelle')}
            className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
            title={!rapor.kayitli ? 'Önce Kaydet ile mühürleyin' : 'Kadroya göre yenile'}
          >
            {pending ? '…' : 'Güncelle'}
          </button>
          <a
            href={excel}
            className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Excel İndir
          </a>
        </div>
      </div>

      {hata ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{hata}</div>
      ) : null}
      {bilgi ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{bilgi}</div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${BASLIK} w-24`}>Sıra No</th>
              <th className={BASLIK}>
                <button
                  type="button"
                  onClick={() => sutunSirala('yetkili')}
                  className="inline-flex w-full items-center justify-center gap-1.5 font-bold"
                  title="A–Z / Z–A"
                >
                  Harcama Yetkilisi
                  <span className="text-xs font-normal" aria-hidden>{okIsaret(sirala === 'yetkili', yon)}</span>
                </button>
              </th>
              <th className={BASLIK}>
                <button
                  type="button"
                  onClick={() => sutunSirala('birim')}
                  className="inline-flex w-full items-center justify-center gap-1.5 font-bold"
                  title="A–Z / Z–A"
                >
                  Harcama Birimi
                  <span className="text-xs font-normal" aria-hidden>{okIsaret(sirala === 'birim', yon)}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {satirlar.length === 0 ? (
              <tr>
                <td colSpan={3} className={`${HUCRE} py-10 text-center text-slate-500`}>
                  Unvanında «müdürü» geçen asil/vekil kayıt bulunamadı.
                </td>
              </tr>
            ) : satirlar.map((s, i) => {
              const zemin = i % 2 === 0 ? 'bg-[#C6EFCE]' : 'bg-[#F2F2F2]'
              return (
                <tr key={`${s.sicilNo}-${s.harcamaBirimi}-${i}`}>
                  <td className={`${HUCRE} text-center tabular-nums ${zemin}`}>{s.siraNo || i + 1}</td>
                  <td className={`${HUCRE} ${zemin}`}>{s.harcamaYetkilisi}</td>
                  <td className={`${HUCRE} ${zemin}`}>{s.harcamaBirimi}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
