import { ickSayfa } from '@/lib/ick/erisim'
import { ickGorunenAd, ickSicilAdlari } from '@/lib/ick/yukle'
import { ickOnizlemeBaslat, ickOnizlemeBitir } from './onizleme-actions'

export default async function IcKontrolLayout({ children }: { children: React.ReactNode }) {
  const { db, yetki } = await ickSayfa()
  const kisiler = new Map<string, string>()
  if (yetki.onizlemeAcabilir && !yetki.onizleme) {
    const { data } = await db.from('ick_eylem_kisi').select('sicil_no, ad_soyad')
    const ham = (data ?? []) as { sicil_no: string; ad_soyad: string }[]
    const adlar = await ickSicilAdlari(db, ham.map(k => k.sicil_no))
    for (const k of ham) {
      if (!k.sicil_no || kisiler.has(k.sicil_no)) continue
      kisiler.set(k.sicil_no, ickGorunenAd(k.sicil_no, k.ad_soyad, adlar))
    }
  }

  return (
    <div className="space-y-4">
      {yetki.onizleme ? (
        <form action={ickOnizlemeBitir} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <span>
            Salt okunur bakış: <strong>{yetki.onizleme.adSoyad}</strong>. Bu kişinin eylemleri görünür; kayıt değişmez.
          </span>
          <button type="submit" className="rounded-lg bg-amber-800 px-3 py-1.5 text-sm font-medium text-white">
            Kendi ekranıma dön
          </button>
        </form>
      ) : kisiler.size > 0 ? (
        <form action={ickOnizlemeBaslat} className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <label className="text-sm text-slate-700">
            <span className="mb-1 block">Personel olarak bak</span>
            <select name="sicil" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" defaultValue="">
              <option value="" disabled>
                Kişi seçin
              </option>
              {[...kisiler.entries()]
                .sort((a, b) => a[1].localeCompare(b[1], 'tr'))
                .map(([sicil, ad]) => (
                  <option key={sicil} value={sicil}>
                    {ad}
                  </option>
                ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white">
            Salt okunur aç
          </button>
        </form>
      ) : null}
      {children}
    </div>
  )
}
