import { createClient } from '@/lib/supabase/server'
import GorevYerineGoreIletisimBilgileriClient from '@/components/rapor/GorevYerineGoreIletisimBilgileriClient'
import type { GorevYerineGoreListeSatir } from '@/lib/rapor-gorev-yerine-gore-liste'
import { gorevYeriListeSenkronizeEt } from '@/lib/rapor-gorev-yerine-gore-liste-sync'
import { gorevYerineGoreListeSatirlariYukle } from '@/lib/rapor-gorev-yerine-gore-liste-yukle'
import { gorevYeriIletisimSatirlariOlustur } from '@/lib/rapor-gorev-yerine-gore-iletisim'

const LISTE_ACIKLAMA =
  'Görev Yerine Göre Personel Listesi sırası ve sütunları; ek olarak personel / ADABEL kartındaki telefon numarası.'

export default async function GorevYerineGoreIletisimBilgileriPage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const anlikTarihEtiket = new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  await gorevYeriListeSenkronizeEt(supabase, { revalidate: false })

  const { satirlar, hata } = await gorevYerineGoreListeSatirlariYukle(supabase)

  const { data: ayarRaw } = await sb
    .from('rapor_gorev_yeri_liste_ayar')
    .select('kayit_key, sira_no')
    .order('sira_no', { ascending: true })

  const satirByKey = new Map(satirlar.map(s => [s.kayit_key, s] as const))
  const seciliKeys = (ayarRaw ?? [])
    .map((a: { kayit_key: string | null }) => String(a.kayit_key ?? '').trim())
    .filter(Boolean) as string[]
  const kayitListesiSatirlari = seciliKeys
    .map((k: string) => satirByKey.get(k))
    .filter((s): s is GorevYerineGoreListeSatir => !!s)

  const kadroSiciller = kayitListesiSatirlari
    .filter(s => s.kaynak === 'kadro' && s.sicil_no)
    .map(s => String(s.sicil_no))
  const firmaIds = kayitListesiSatirlari
    .filter(s => s.kaynak === 'firma')
    .map(s => Number(s.kayit_key.replace(/^firma:/, '')))
    .filter(n => Number.isFinite(n) && n > 0)

  const telefonByKayitKey = new Map<string, string | null>()

  for (let i = 0; i < kadroSiciller.length; i += 120) {
    const part = kadroSiciller.slice(i, i + 120)
    if (!part.length) continue
    const { data } = await supabase.from('calisan').select('sicil_no, telefon').in('sicil_no', part)
    for (const c of data ?? []) {
      telefonByKayitKey.set(`kadro:${c.sicil_no}`, c.telefon)
    }
  }

  for (let i = 0; i < firmaIds.length; i += 120) {
    const part = firmaIds.slice(i, i + 120)
    if (!part.length) continue
    const { data } = await supabase.from('firma_calisanlar').select('id, telefon').in('id', part)
    for (const f of data ?? []) {
      telefonByKayitKey.set(`firma:${f.id}`, f.telefon)
    }
  }

  const iletisimSatirlari = gorevYeriIletisimSatirlariOlustur(kayitListesiSatirlari, telefonByKayitKey)

  return (
    <div>
      {hata && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {hata}
        </div>
      )}

      <GorevYerineGoreIletisimBilgileriClient
        satirlar={iletisimSatirlari}
        anlikTarihEtiket={anlikTarihEtiket}
        aciklama={LISTE_ACIKLAMA}
        excelHref="/api/rapor/gorev-yerine-gore-iletisim-bilgileri/excel"
      />
    </div>
  )
}
