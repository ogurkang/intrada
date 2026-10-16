import Link from 'next/link'
import { ICK_TD, ICK_TH, IckBaslik, IckRozet, IckUyari } from '@/components/ic-kontrol/IckUi'
import { ICK_YETKI_YOK, ickHataMetni, ickSayfa } from '@/lib/ick/erisim'
import { ICK_EYLEM_DURUM_ETIKET, type IckBeyanDurum } from '@/lib/ick/tanim'
import { ickSorumluAdi, ickTumMudurlukHaritasi } from '@/lib/ick/yukle'

type Satir = {
  id: number
  eylem_id: number
  beyan_durum: IckBeyanDurum
  beyan_ilerleme: number
  donem_yili: number | null
  olusturan_id: string | null
  olusturan_ad: string
  gonderen_id: string | null
  gonderen_ad: string
  gonderim_at: string | null
  ick_eylem: {
    kod_norm: string
    ongorulen_eylem: string
    sorumlu_tur: 'mudurluk' | 'ust_yonetim'
    sorumlu_mudurluk_id: number | null
    sorumlu_metin: string
  } | null
}

export default async function IckIncelemePage() {
  const { db, yetki, hata } = await ickSayfa()
  if (!yetki.okuyabilir) {
    return (
      <div className="space-y-6">
        <IckBaslik baslik="İnceleme" />
        <IckUyari metin={hata ?? ICK_YETKI_YOK} />
      </div>
    )
  }
  const [{ data, error }, mudAd] = await Promise.all([
    db
      .from('ick_gerceklesme')
      .select(
        'id, eylem_id, beyan_durum, beyan_ilerleme, donem_yili, olusturan_id, olusturan_ad, gonderen_id, gonderen_ad, gonderim_at, ick_eylem!eylem_id(kod_norm, ongorulen_eylem, sorumlu_tur, sorumlu_mudurluk_id, sorumlu_metin)',
      )
      .eq('akis', 'incelemede')
      .order('gonderim_at', { ascending: true }),
    ickTumMudurlukHaritasi(db),
  ])
  const satirlar = (data as Satir[] | null) ?? []

  return (
    <div className="space-y-6">
      <IckBaslik baslik="İnceleme" />
      <p className="text-sm leading-6 text-slate-600">
        Birimlerin incelemeye gönderdiği bildirimler, gönderim sırasıyla. Karar eylem kartında verilir. Kendi girdiğiniz veya gönderdiğiniz bildirime karar veremezsiniz.
        {yetki.koordinator ? '' : ' Karar yetkisi iç kontrol koordinatöründedir; bu listeyi yalnızca okursunuz.'}
      </p>
      {error ? <IckUyari tur="hata" metin={ickHataMetni(error.message)} /> : null}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className={ICK_TH}>Kod</th>
              <th className={ICK_TH}>Öngörülen eylem</th>
              <th className={ICK_TH}>Sorumlu</th>
              <th className={ICK_TH}>Bildirilen</th>
              <th className={ICK_TH}>Gönderen</th>
              <th className={ICK_TH}>Gönderim</th>
            </tr>
          </thead>
          <tbody>
            {satirlar.length === 0 ? (
              <tr>
                <td className={ICK_TD} colSpan={6}>
                  İncelemede bildirim yok.
                </td>
              </tr>
            ) : null}
            {satirlar.map(s => {
              const kendi = s.olusturan_id === yetki.userId || s.gonderen_id === yetki.userId
              return (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className={`${ICK_TD} whitespace-nowrap`}>
                    <Link href={`/ic-kontrol/eylemler/${s.eylem_id}`} className="font-medium text-blue-700 hover:underline">
                      {s.ick_eylem?.kod_norm}
                    </Link>
                    {s.donem_yili ? <span className="block text-xs text-slate-400">{s.donem_yili}</span> : null}
                  </td>
                  <td className={ICK_TD}>{s.ick_eylem?.ongorulen_eylem}</td>
                  <td className={ICK_TD}>{s.ick_eylem ? ickSorumluAdi(s.ick_eylem, mudAd) : ''}</td>
                  <td className={ICK_TD}>
                    <IckRozet
                      durum={s.beyan_durum}
                      etiket={s.beyan_durum === 'devam' ? `Devam %${Math.round(Number(s.beyan_ilerleme))}` : ICK_EYLEM_DURUM_ETIKET[s.beyan_durum]}
                    />
                  </td>
                  <td className={ICK_TD}>
                    {s.gonderen_ad || s.olusturan_ad}
                    {kendi ? <span className="block text-xs text-amber-700">Sizin kaydınız</span> : null}
                  </td>
                  <td className={`${ICK_TD} whitespace-nowrap`}>
                    {s.gonderim_at ? new Date(s.gonderim_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' }) : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
