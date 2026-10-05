'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SmsExcelGonderInput, SmsGonderActionSonuc } from '@/app/(dashboard)/iletisim-yonetimi/sms-islemleri/actions'
import SmsPlanliGonderimAlanlari from '@/components/iletisim/SmsPlanliGonderimAlanlari'
import {
  smsExcelKolonSecenekleri,
  smsExcelOnizleme,
  type SmsExcelKolonSecenegi,
  type SmsExcelSatir,
} from '@/lib/sms-excel'

interface SablonSecenek {
  id: number
  baslik: string
  metin: string
}

interface Props {
  originatorlar: string[]
  sablonlar: SablonSecenek[]
  gonderimAcik: boolean
  onGonder: (input: SmsExcelGonderInput) => Promise<SmsGonderActionSonuc>
}

function smsAdedi(uzunluk: number): number {
  if (uzunluk === 0) return 0
  if (uzunluk <= 160) return 1
  return Math.ceil(uzunluk / 153)
}

function hucreYazi(v: unknown): string {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    const o = v as { text?: unknown; result?: unknown; richText?: { text?: string }[] }
    if (Array.isArray(o.richText)) return o.richText.map(p => p.text ?? '').join('')
    if (o.text != null) return String(o.text)
    if (o.result != null) return String(o.result)
  }
  return String(v)
}

const DURUM_SINIF: Record<SmsExcelSatir['durum'], string> = {
  hazir: 'bg-emerald-50 text-emerald-800',
  gecersiz_numara: 'bg-red-50 text-red-700',
  bos_mesaj: 'bg-red-50 text-red-700',
  uzun_mesaj: 'bg-red-50 text-red-700',
  mukerrer: 'bg-amber-50 text-amber-800',
}

export default function SmsExcelClient({ originatorlar, sablonlar, gonderimAcik, onGonder }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [originator, setOriginator] = useState(originatorlar[0] ?? '')
  const [ortakMesaj, setOrtakMesaj] = useState('')
  const [dosyaAdi, setDosyaAdi] = useState('')
  const [ham, setHam] = useState<unknown[][] | null>(null)
  const [kolonlar, setKolonlar] = useState<SmsExcelKolonSecenegi[]>([])
  const [telefonKolon, setTelefonKolon] = useState(-1)
  const [adKolon, setAdKolon] = useState(-1)
  const [mesajKolon, setMesajKolon] = useState(-1)
  const [baslikSatiri, setBaslikSatiri] = useState(true)
  const [onizleme, setOnizleme] = useState<SmsExcelSatir[] | null>(null)
  const [onizlemeHatasi, setOnizlemeHatasi] = useState<string | null>(null)
  const [sonuc, setSonuc] = useState<SmsGonderActionSonuc | null>(null)
  const [planliGonderim, setPlanliGonderim] = useState(false)
  const [planliTarihSaat, setPlanliTarihSaat] = useState('')
  const [isPending, startTransition] = useTransition()

  const hazir = useMemo(() => (onizleme ?? []).filter(s => s.durum === 'hazir'), [onizleme])

  function onizlemeyiSil() {
    setOnizleme(null)
    setOnizlemeHatasi(null)
    setSonuc(null)
  }

  function kolonlariSifirla() {
    setKolonlar([])
    setTelefonKolon(-1)
    setAdKolon(-1)
    setMesajKolon(-1)
    setBaslikSatiri(true)
  }

  async function dosyaSec(file: File | null) {
    onizlemeyiSil()
    setHam(null)
    setDosyaAdi('')
    kolonlariSifirla()
    if (!file) return
    if (!file.name.match(/\.xlsx$/i)) {
      setOnizlemeHatasi('Yalnızca .xlsx dosyası yükleyebilirsiniz. Eski .xls dosyasını Excel’de .xlsx olarak kaydedin.')
      return
    }
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(await file.arrayBuffer())
      const sayfa = wb.worksheets[0]
      if (!sayfa) {
        setOnizlemeHatasi('Dosyada sayfa yok.')
        return
      }
      const rows: unknown[][] = []
      sayfa.eachRow({ includeEmpty: false }, row => {
        const cells: unknown[] = []
        row.eachCell({ includeEmpty: true }, (cell, col) => {
          cells[col - 1] = hucreYazi(cell.value)
        })
        rows.push(cells)
      })
      const kolon = smsExcelKolonSecenekleri(rows)
      setKolonlar(kolon.secenekler)
      setTelefonKolon(kolon.oneri.telefon)
      setAdKolon(kolon.oneri.ad)
      setMesajKolon(kolon.oneri.mesaj)
      setBaslikSatiri(kolon.oneri.baslikSatiri)
      setHam(rows)
      setDosyaAdi(file.name)
    } catch {
      setOnizlemeHatasi('Excel okunamadı. Dosyanın .xlsx olduğundan emin olun.')
    }
  }

  function onizle() {
    setSonuc(null)
    if (!ham) {
      setOnizleme(null)
      setOnizlemeHatasi('Önce bir Excel dosyası seçin.')
      return
    }
    const sonucOnizleme = smsExcelOnizleme(ham, ortakMesaj, {
      telefon: telefonKolon,
      ad: adKolon,
      mesaj: mesajKolon,
      baslikSatiri,
    })
    setOnizleme(sonucOnizleme.satirlar)
    setOnizlemeHatasi(sonucOnizleme.hata ?? null)
  }

  async function sablonIndir() {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    const sayfa = wb.addWorksheet('SMS')
    sayfa.addRow(['Telefon', 'Ad Soyad', 'Mesaj'])
    sayfa.addRow(['5320000000', 'Ayşe Yılmaz', 'Yarın saat 10:00’da toplantı vardır.'])
    sayfa.getRow(1).font = { bold: true }
    sayfa.columns = [{ width: 18 }, { width: 24 }, { width: 48 }]
    const buf = await wb.xlsx.writeBuffer()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }))
    a.download = 'sms-yukleme-sablonu.xlsx'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function gonder() {
    if (!hazir.length) return
    if (planliGonderim && !planliTarihSaat) {
      setSonuc({ hata: 'Planlanan gönderim tarihi ve saati seçin.' })
      return
    }
    const onay = planliGonderim
      ? `${hazir.length} numaraya SMS, seçilen tarihte gönderilmek üzere planlanacak. Onaylıyor musunuz?`
      : `${hazir.length} numaraya SMS gönderilecek. Onaylıyor musunuz?`
    if (!confirm(onay)) return
    setSonuc(null)
    startTransition(async () => {
      const res = await onGonder({
        originator,
        planlananGonderimAt: planliGonderim ? planliTarihSaat : undefined,
        satirlar: hazir.map(s => ({
          telefon: s.telefon ?? '',
          mesaj: s.mesaj,
          ad: s.ad,
        })),
      })
      setSonuc(res)
      if (res.ok) {
        setHam(null)
        setDosyaAdi('')
        kolonlariSifirla()
        setOnizleme(null)
        setOrtakMesaj('')
        setPlanliGonderim(false)
        setPlanliTarihSaat('')
        if (fileRef.current) fileRef.current.value = ''
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Excel dosyası</h2>
            <p className="text-xs text-slate-500 mt-1">
              Dosyayı yükledikten sonra telefon, ad soyad ve mesaj sütunlarını seçin. Mesaj sütunu boşsa veya seçilmezse ortak metin kullanılır.
              Gönderim, önizlemeyi onayladıktan sonra başlar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void sablonIndir()}
            className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Şablon indir
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={e => void dosyaSec(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600"
        />
        {dosyaAdi ? <p className="text-xs text-slate-500">Seçilen dosya: {dosyaAdi}</p> : null}

        {kolonlar.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Telefon sütunu</label>
                <select
                  value={telefonKolon}
                  onChange={e => {
                    setTelefonKolon(Number(e.target.value))
                    onizlemeyiSil()
                  }}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value={-1}>— Seçin —</option>
                  {kolonlar.map(k => (
                    <option key={k.index} value={k.index}>{k.etiket}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ad soyad sütunu</label>
                <select
                  value={adKolon}
                  onChange={e => {
                    setAdKolon(Number(e.target.value))
                    onizlemeyiSil()
                  }}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value={-1}>— Kullanma —</option>
                  {kolonlar.map(k => (
                    <option key={k.index} value={k.index}>{k.etiket}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mesaj sütunu</label>
                <select
                  value={mesajKolon}
                  onChange={e => {
                    setMesajKolon(Number(e.target.value))
                    onizlemeyiSil()
                  }}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value={-1}>— Ortak mesaj —</option>
                  {kolonlar.map(k => (
                    <option key={k.index} value={k.index}>{k.etiket}</option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={baslikSatiri}
                onChange={e => {
                  setBaslikSatiri(e.target.checked)
                  onizlemeyiSil()
                }}
                className="rounded border-slate-300"
              />
              İlk satır başlık satırıdır
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sablonlar.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ortak mesaj şablonu</label>
              <select
                defaultValue=""
                onChange={e => {
                  const s = sablonlar.find(x => String(x.id) === e.target.value)
                  if (s) {
                    setOrtakMesaj(s.metin)
                    onizlemeyiSil()
                  }
                }}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="">— Şablon —</option>
                {sablonlar.map(s => (
                  <option key={s.id} value={s.id}>{s.baslik}</option>
                ))}
              </select>
            </div>
          )}
          {originatorlar.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Gönderici başlığı</label>
              <select
                value={originator}
                onChange={e => setOriginator(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
              >
                {originatorlar.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Ortak mesaj</label>
          <textarea
            value={ortakMesaj}
            onChange={e => {
              setOrtakMesaj(e.target.value)
              onizlemeyiSil()
            }}
            rows={3}
            placeholder="Satırda mesaj yoksa bu metin gider."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <button
          type="button"
          onClick={onizle}
          disabled={!ham}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          Önizle
        </button>
      </div>

      {onizlemeHatasi ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{onizlemeHatasi}</p>
      ) : null}

      {onizleme ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 space-y-3">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">{hazir.length}</span> hazır
              <span className="text-slate-400"> · </span>
              {onizleme.length - hazir.length} gönderilmeyecek
            </p>
            <SmsPlanliGonderimAlanlari
              planli={planliGonderim}
              onPlanliChange={setPlanliGonderim}
              tarihSaat={planliTarihSaat}
              onTarihSaatChange={setPlanliTarihSaat}
            />
            <button
              type="button"
              onClick={gonder}
              disabled={!gonderimAcik || !hazir.length || isPending}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {isPending
                ? planliGonderim
                  ? 'Planlanıyor…'
                  : 'Gönderiliyor…'
                : planliGonderim
                  ? 'Onayla ve planla'
                  : 'Onayla ve gönder'}
            </button>
          </div>
          <div className="overflow-x-auto max-h-[28rem]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600 sticky top-0">
                <tr>
                  <th className="px-3 py-2 font-medium w-14">Satır</th>
                  <th className="px-3 py-2 font-medium">Ad</th>
                  <th className="px-3 py-2 font-medium">Telefon</th>
                  <th className="px-3 py-2 font-medium">Gidecek mesaj</th>
                  <th className="px-3 py-2 font-medium">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {onizleme.map(s => (
                  <tr key={s.sira}>
                    <td className="px-3 py-2 text-slate-500 tabular-nums">{s.sira}</td>
                    <td className="px-3 py-2 text-slate-800">{s.ad || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">{s.telefon || s.telefonHam || '—'}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-pre-wrap">
                      {s.mesaj || '—'}
                      {s.mesaj ? (
                        <span className="block text-xs text-slate-400 mt-1">{s.mesaj.length} karakter · {smsAdedi(s.mesaj.length)} SMS</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs ${DURUM_SINIF[s.durum]}`}>{s.aciklama}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {sonuc?.hata ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{sonuc.hata}</p>
      ) : null}
      {sonuc?.ok ? (
        <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          {(sonuc.gonderilen ?? 0) > 0 && <>{sonuc.gonderilen} alıcıya gönderildi. </>}
          {(sonuc.planlanan ?? 0) > 0 && <>{sonuc.planlanan} alıcıya ileri tarihte iletilmek üzere planlandı. </>}
        </p>
      ) : null}
    </div>
  )
}
