import { createClient } from '@/lib/supabase/server'
import { trNormalize } from '@/lib/turkce-search'
import YoneticiIletisimBilgileriListeClient, {
  type YoneticiIletisimSatir,
} from '@/components/rapor/YoneticiIletisimBilgileriListeClient'

function unvanOncelik(unvan: string): number | null {
  const n = trNormalize(unvan)
  if (n.includes('belediye baskani')) return 0
  if (n.includes('baskan yardimci')) return 1
  if (n.includes('mudur')) return 2
  return null
}

export default async function YoneticiIletisimBilgileriListePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [{ data: kadroRaw, error }, { data: calisanRaw }, { data: ayarRaw }] = await Promise.all([
    supabase
      .from('kadro_hareketleri')
      .select('id, kadro_unvani, asil, vekil, iptal_karar_tarihi, iptal_karar_no')
      .order('id', { ascending: true }),
    supabase.from('calisan').select('sicil_no, ad_soyad, telefon, e_posta'),
    sb.from('rapor_yonetici_iletisim_liste_ayar').select('kayit_key, sira_no').order('sira_no', { ascending: true }),
  ])

  const calisanBySicil = new Map(
    (calisanRaw ?? []).map(c => [
      String(c.sicil_no ?? '').trim(),
      {
        ad_soyad: String(c.ad_soyad ?? '').trim(),
        telefon: String(c.telefon ?? '').trim(),
        e_posta: String(c.e_posta ?? '').trim(),
      },
    ]),
  )

  const tumSatirlar: YoneticiIletisimSatir[] = []

  for (const k of kadroRaw ?? []) {
    const unvan = String(k.kadro_unvani ?? '').trim()
    const oncelik = unvanOncelik(unvan)
    if (oncelik == null) continue
    if (k.iptal_karar_tarihi || k.iptal_karar_no) continue

    const adaylar: Array<{ rol: 'asil' | 'vekil'; sicil: string }> = [
      { rol: 'asil', sicil: String(k.asil ?? '').trim() },
      { rol: 'vekil', sicil: String(k.vekil ?? '').trim() },
    ]
    for (const a of adaylar) {
      if (!a.sicil) continue
      const c = calisanBySicil.get(a.sicil)
      if (!c) continue
      tumSatirlar.push({
        kayit_key: `kadro:${k.id}:${a.rol}:${a.sicil}`,
        sicil_no: a.sicil,
        ad_soyad: c.ad_soyad || '—',
        kadro_unvani: unvan || '—',
        telefon: c.telefon || '—',
        e_posta: c.e_posta || '—',
      })
    }
  }

  tumSatirlar.sort((a, b) => {
    const o1 = unvanOncelik(a.kadro_unvani) ?? 99
    const o2 = unvanOncelik(b.kadro_unvani) ?? 99
    if (o1 !== o2) return o1 - o2
    return a.ad_soyad.localeCompare(b.ad_soyad, 'tr')
  })

  const satirByKey = new Map(tumSatirlar.map(s => [s.kayit_key, s] as const))
  const seciliKeys = (ayarRaw ?? [])
    .map((a: { kayit_key: string | null }) => String(a.kayit_key ?? '').trim())
    .filter(Boolean) as string[]
  const ayarliSatirlar = seciliKeys
    .map((k: string) => satirByKey.get(k))
    .filter((x): x is YoneticiIletisimSatir => !!x)

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error.message}
        </div>
      )}
      <YoneticiIletisimBilgileriListeClient
        tumSatirlar={tumSatirlar}
        seciliKeyler={ayarliSatirlar.map(s => s.kayit_key)}
        excelHref="/api/rapor/yonetici-iletisim-bilgileri-liste/excel"
      />
    </div>
  )
}
