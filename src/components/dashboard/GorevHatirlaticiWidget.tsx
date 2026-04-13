import Link from 'next/link'

export interface GorevHatirlaticiItem {
  sicil_no: string
  ad_soyad: string
  gorev_turu: string
  bitis_tarihi: string
  bitis_turu: 'gorev' | 'engelli'
  kalan_gun: number
}

interface Props {
  items: GorevHatirlaticiItem[]
}

function tarihFormatla(t: string) {
  return new Date(t).toLocaleDateString('tr-TR')
}

export default function GorevHatirlaticiWidget({ items }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">
          Görev Hatırlatıcıları
          {items.length > 0 && (
            <span className="ml-2 bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </h2>
        {items.length > 0 && (
          <Link
            href="/personel/gorev-bilgileri"
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Tümünü gör →
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Yaklaşan görev / engelli bitiş hatırlatıcısı yok</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item, i) => {
            const renk =
              item.kalan_gun <= 3
                ? 'text-red-600 bg-red-50'
                : item.kalan_gun <= 7
                  ? 'text-orange-600 bg-orange-50'
                  : 'text-amber-600 bg-amber-50'

            return (
              <div
                key={`${item.sicil_no}-${item.bitis_turu}-${i}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href="/personel/gorev-bilgileri"
                      className="font-medium text-slate-800 text-sm hover:text-blue-700 hover:underline truncate"
                    >
                      {item.ad_soyad}
                    </Link>
                    <span className="text-xs text-slate-400 font-mono shrink-0">{item.sicil_no}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-slate-500">
                      {item.bitis_turu === 'gorev' ? item.gorev_turu : 'Engelli Bitiş'}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-500">{tarihFormatla(item.bitis_tarihi)}</span>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${renk}`}>
                  {item.kalan_gun === 0 ? 'Bugün' : `${item.kalan_gun} gün`}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
