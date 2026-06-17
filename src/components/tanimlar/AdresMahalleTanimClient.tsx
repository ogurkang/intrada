'use client'

import { useMemo, useState, useTransition } from 'react'
import Modal from '@/components/ui/Modal'
import AuditGecmisPanel from '@/components/ui/AuditGecmisPanel'
import { KalemDuzenleDugmesi, SaatGecmisDugmesi } from '@/components/ui/TabloIslemIkonlari'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'
import AdresIlIlceSecim from '@/components/tanimlar/AdresIlIlceSecim'
import { tanimAdresAuditDegerGoster, tanimAdresAuditDiffSatirlari } from '@/lib/tanim-adres-audit'
import { trNormalize } from '@/lib/turkce-search'
import AdresMahalleExcelYukle from '@/components/tanimlar/AdresMahalleExcelYukle'
import type { AdresExcelIceAktarSonuc } from '@/app/(dashboard)/tanimlar/adres/actions'
import type { Tables } from '@/types/database'

type Row = Tables<'tanim_adres_mahalle'>

type Props = {
  data: Row[]
  auditLoglarByRefId?: Record<string, Tables<'personel_audit_log'>[]>
  onEkle: (fd: FormData) => Promise<{ hata?: string }>
  onGuncelle: (id: number, fd: FormData) => Promise<{ hata?: string }>
  onExcelYukle: (fd: FormData) => Promise<AdresExcelIceAktarSonuc>
  loadHata?: string
}

function AktifSecim({ defaultAktif }: { defaultAktif: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">Durum</label>
      <select
        name="aktif"
        defaultValue={defaultAktif ? 'aktif' : 'pasif'}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
      >
        <option value="aktif">Aktif</option>
        <option value="pasif">Pasif</option>
      </select>
    </div>
  )
}

export default function AdresMahalleTanimClient({
  data,
  auditLoglarByRefId = {},
  onEkle,
  onGuncelle,
  onExcelYukle,
  loadHata,
}: Props) {
  const saltOkunur = useTanimlarSaltOkunur()
  const [arama, setArama] = useState('')
  const [ekleAcik, setEkleAcik] = useState(false)
  const [duzenleSatir, setDuzenleSatir] = useState<Row | null>(null)
  const [gecmisRefId, setGecmisRefId] = useState<string | null>(null)
  const [hata, setHata] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [ekleIl, setEkleIl] = useState('Sakarya')
  const [ekleIlce, setEkleIlce] = useState('')
  const [duzenleIl, setDuzenleIl] = useState('')
  const [duzenleIlce, setDuzenleIlce] = useState('')

  const filtreli = useMemo(() => {
    const q = trNormalize(arama)
    if (!q) return data
    return data.filter(
      r =>
        trNormalize(r.il).includes(q) ||
        trNormalize(r.ilce).includes(q) ||
        trNormalize(r.mahalle_adi).includes(q),
    )
  }, [data, arama])

  function ekleAc() {
    setHata(null)
    setEkleIl('Sakarya')
    setEkleIlce('')
    setEkleAcik(true)
  }

  function duzenleAc(row: Row) {
    setHata(null)
    setDuzenleIl(row.il)
    setDuzenleIlce(row.ilce)
    setDuzenleSatir(row)
  }

  function handleEkle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await onEkle(fd)
      if (res.hata) setHata(res.hata)
      else setEkleAcik(false)
    })
  }

  function handleDuzenle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!duzenleSatir) return
    setHata(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await onGuncelle(duzenleSatir.id, fd)
      if (res.hata) setHata(res.hata)
      else setDuzenleSatir(null)
    })
  }

  const gecmisLoglar = gecmisRefId ? auditLoglarByRefId[gecmisRefId] ?? [] : []

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Adres Tanımları</h1>
          <p className="text-sm text-slate-500 mt-1">İl, ilçe ve mahalle kayıtları personel adres seçiminde kullanılır.</p>
        </div>
        {!saltOkunur && (
          <button
            type="button"
            onClick={ekleAc}
            className="flex items-center justify-center gap-2 bg-slate-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors font-medium shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ekle
          </button>
        )}
      </div>

      {(loadHata || hata) && !ekleAcik && !duzenleSatir && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {loadHata || hata}
        </div>
      )}

      {!saltOkunur && (
        <div className="mb-6">
          <AdresMahalleExcelYukle onYukle={onExcelYukle} />
        </div>
      )}

      <div className="mb-4">
        <input
          value={arama}
          onChange={e => setArama(e.target.value)}
          placeholder="İl, ilçe veya mahalle ara…"
          className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-14">Sıra</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">İl</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">İlçe</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Mahalle</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Durum</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-28">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtreli.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14 text-slate-400">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filtreli.map((row, i) => (
                  <tr key={row.id} className={!row.aktif ? 'bg-slate-50/80' : 'hover:bg-slate-50'}>
                    <td className="px-4 py-3 text-slate-500 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3 text-slate-800">{row.il}</td>
                    <td className="px-4 py-3 text-slate-700">{row.ilce}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.mahalle_adi}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          row.aktif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {row.aktif ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <SaatGecmisDugmesi
                          sayi={(auditLoglarByRefId[String(row.id)] ?? []).length}
                          onClick={() => setGecmisRefId(String(row.id))}
                        />
                        {!saltOkunur && (
                          <KalemDuzenleDugmesi onClick={() => duzenleAc(row)} disabled={isPending} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={ekleAcik} onClose={() => setEkleAcik(false)} title="Mahalle Tanımı Ekle">
        <form onSubmit={handleEkle} className="space-y-4">
          <AdresIlIlceSecim
            il={ekleIl}
            ilce={ekleIlce}
            onIlChange={setEkleIl}
            onIlceChange={setEkleIlce}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mahalle adı</label>
            <input
              name="mahalle_adi"
              required
              autoFocus
              placeholder="Örn. Camili"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <AktifSecim defaultAktif />
          {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEkleAcik(false)}
              className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              {isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!duzenleSatir} onClose={() => setDuzenleSatir(null)} title="Mahalle Tanımı Düzenle">
        {duzenleSatir && (
          <form onSubmit={handleDuzenle} className="space-y-4">
            <AdresIlIlceSecim
              il={duzenleIl}
              ilce={duzenleIlce}
              onIlChange={setDuzenleIl}
              onIlceChange={setDuzenleIlce}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mahalle adı</label>
              <input
                name="mahalle_adi"
                required
                defaultValue={duzenleSatir.mahalle_adi}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              />
            </div>
            <AktifSecim defaultAktif={duzenleSatir.aktif} />
            {hata && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{hata}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDuzenleSatir(null)}
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50"
              >
                {isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <AuditGecmisPanel
        acik={gecmisRefId != null}
        onKapat={() => setGecmisRefId(null)}
        auditLoglar={gecmisLoglar}
        baslik="Adres Tanımı Değişiklik Geçmişi"
        diffSatirlari={tanimAdresAuditDiffSatirlari}
        degerGoster={tanimAdresAuditDegerGoster}
      />
    </div>
  )
}
