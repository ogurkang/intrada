import { ANKET_GRAFIK_HEX, anketGenelYorum, anketSoruYorumu, anketTipEtiket, type AnketDagilim, type AnketSoruSonuc } from '@/lib/anket'

const CUBUK_RENKLERI = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-500',
  'bg-indigo-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-violet-600',
  'bg-orange-600',
]

function pastaZemin(dilimler: AnketDagilim[]): string {
  const toplam = dilimler.reduce((t, d) => t + d.adet, 0)
  if (toplam <= 0) return 'conic-gradient(#e2e8f0 0% 100%)'
  let bas = 0
  const duraklar = dilimler.map((d, i) => {
    const pay = (d.adet / toplam) * 100
    const renk = ANKET_GRAFIK_HEX[i % ANKET_GRAFIK_HEX.length]
    const parca = `${renk} ${bas}% ${bas + pay}%`
    bas += pay
    return parca
  })
  return `conic-gradient(${duraklar.join(', ')})`
}

function Pasta({ dilimler, coklu }: { dilimler: AnketDagilim[]; coklu: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div
        className="h-40 w-40 shrink-0 rounded-full border border-slate-200"
        style={{ background: pastaZemin(dilimler) }}
        role="img"
        aria-label="Pasta grafik"
      />
      <ul className="min-w-[220px] flex-1 space-y-2">
        {dilimler.map((dilim, i) => (
          <li key={dilim.etiket} className="flex items-center gap-2 text-sm text-slate-800">
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ background: ANKET_GRAFIK_HEX[i % ANKET_GRAFIK_HEX.length] }}
            />
            <span className="min-w-0 flex-1 break-words">{dilim.etiket}</span>
            <span className="shrink-0 text-slate-600">{dilim.adet} · %{dilim.yuzde}</span>
          </li>
        ))}
      </ul>
      <p className="w-full text-xs text-slate-500">
        {coklu
          ? 'Pasta dilimi, işaretlenen seçenekler arasındaki paydır. Yüzde, soruyu cevaplayan kişi sayısına göredir. Bir kişi birden fazla dilime girebilir.'
          : 'Pasta dilimi, o soruyu cevaplayanlar içindeki paydır. Kaynak: isimsiz anket cevapları.'}
      </p>
    </div>
  )
}

function Cubuk({ etiket, adet, yuzde, renk }: { etiket: string; adet: number; yuzde: number; renk: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-slate-800">{etiket}</span>
        <span className="shrink-0 text-slate-600">{adet} cevap · %{yuzde}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100">
        <div className={`h-2.5 rounded-full ${renk}`} style={{ width: `${Math.max(yuzde > 0 ? 2 : 0, Math.min(100, yuzde))}%` }} />
      </div>
    </div>
  )
}

export default function AnketRaporGorunum({
  baslik,
  katilim,
  kurumMetin,
  sorular,
}: {
  baslik: string
  katilim: number
  kurumMetin: string | null
  sorular: { id: string; sira: number; metin: string; sonuc: AnketSoruSonuc; kirilimlar: string[] }[]
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{baslik}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{anketGenelYorum(katilim)}</p>
        {kurumMetin ? (
          <div className="mt-3 max-w-3xl whitespace-pre-line rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            {kurumMetin}
          </div>
        ) : null}
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
          ) : soru.sonuc.tip === 'puan' ? (
            <div className="space-y-3">
              {soru.sonuc.dagilim.map((dilim, i) => (
                <Cubuk
                  key={dilim.etiket}
                  etiket={dilim.etiket}
                  adet={dilim.adet}
                  yuzde={dilim.yuzde}
                  renk={CUBUK_RENKLERI[i % CUBUK_RENKLERI.length]}
                />
              ))}
              <p className="text-xs text-slate-500">Çubuk uzunluğu, o soruyu cevaplayanlar içindeki paydır. 1 çok kötü, 5 çok iyi.</p>
            </div>
          ) : (
            <Pasta dilimler={soru.sonuc.dagilim} coklu={soru.sonuc.tip === 'coklu_secim'} />
          )}
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">Yorum</p>
            <p className="mt-1 text-sm text-slate-800">{anketSoruYorumu(soru.sonuc, soru.metin)}</p>
            {soru.kirilimlar.length > 0 ? (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="text-xs font-medium text-slate-500">Grup yorumu</p>
                <ul className="mt-1 space-y-2">
                  {soru.kirilimlar.map((satir, i) => (
                    <li key={`${soru.id}-kirilim-${i}`} className="text-sm text-slate-800">{satir}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  )
}
