import { anketGenelYorum, anketSoruYorumu, anketTipEtiket, type AnketSoruSonuc } from '@/lib/anket'

function Cubuk({ etiket, adet, yuzde }: { etiket: string; adet: number; yuzde: number }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-slate-800">{etiket}</span>
        <span className="shrink-0 text-slate-600">{adet} cevap · %{yuzde}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100">
        <div className="h-2.5 rounded-full bg-slate-800" style={{ width: `${Math.max(0, Math.min(100, yuzde))}%` }} />
      </div>
    </div>
  )
}

export default function AnketRaporGorunum({
  baslik,
  katilim,
  sorular,
}: {
  baslik: string
  katilim: number
  sorular: { id: string; sira: number; metin: string; sonuc: AnketSoruSonuc }[]
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{anketGenelYorum(katilim)}</p>
      </div>
      {sorular.map(soru => (
        <section key={soru.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Soru {soru.sira} · {anketTipEtiket(soru.sonuc.tip)}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-800">{soru.metin}</h2>
          </div>
          {soru.sonuc.tip === 'metin' ? (
            soru.sonuc.metinler.length === 0 ? (
              <p className="text-sm text-slate-500">Yazılı cevap yok.</p>
            ) : (
              <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-800">
                {soru.sonuc.metinler.map((metin, i) => (
                  <li key={`${soru.id}-${i}`}>{metin}</li>
                ))}
              </ol>
            )
          ) : (
            <div className="space-y-3">
              {soru.sonuc.dagilim.map(dilim => (
                <Cubuk key={dilim.etiket} etiket={dilim.etiket} adet={dilim.adet} yuzde={dilim.yuzde} />
              ))}
              <p className="text-xs text-slate-500">Kaynak: isimsiz anket cevapları. Çubuk uzunluğu, o soruyu cevaplayanlar içindeki paydır.</p>
            </div>
          )}
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Yorum</p>
            <p className="mt-1 text-sm text-slate-800">{anketSoruYorumu(soru.sonuc)}</p>
          </div>
        </section>
      ))}
    </div>
  )
}
