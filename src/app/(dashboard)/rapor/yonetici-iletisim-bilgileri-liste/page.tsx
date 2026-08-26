import { createClient } from '@/lib/supabase/server'
import { fetchAllKadroHareketleri, fetchAllPersonelHareketleri } from '@/lib/supabase-sayfala'
import YoneticiIletisimBilgileriListeClient, {
  type YoneticiIletisimTabVerisi,
} from '@/components/rapor/YoneticiIletisimBilgileriListeClient'
import { periyotSonGunu, type RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import {
  yoneticiIletisimAdaySatirlariOlustur,
  yoneticiIletisimListeSnapshot,
  type PersonelHareketSatir,
  type YoneticiKadroSatir,
} from '@/lib/rapor-yonetici-iletisim-bilgileri-liste'
import type { Tables } from '@/types/database'

const AYLAR_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const MIN_YIL = 2000
const MAX_YIL = 2035

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function YoneticiIletisimBilgileriListePage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string }>
}) {
  const sp = await searchParams
  const parsed = parseInt(sp.y ?? '', 10)
  const yil = Number.isFinite(parsed) ? Math.min(MAX_YIL, Math.max(MIN_YIL, parsed)) : new Date().getFullYear()

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const [{ data: kadroRaw, error }, { data: calisanRaw }, { data: ayarRaw }, { data: phRaw }, { data: auditRaw }] =
    await Promise.all([
      fetchAllKadroHareketleri(
        supabase,
        'id, kadro_unvani, asil, vekil, iptal_karar_tarihi, iptal_karar_no, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu',
      ),
      supabase.from('calisan').select('sicil_no, ad_soyad, telefon, e_posta'),
      sb.from('rapor_yonetici_iletisim_liste_ayar').select('kayit_key, sira_no').order('sira_no', { ascending: true }),
      fetchAllPersonelHareketleri(
        supabase,
        'sicil_no, kadro_id, kadro_rol, yururluk_tarihi, ise_baslama_tarihi, ayrilis_tarihi',
        q => q.not('kadro_id', 'is', null),
      ),
      supabase
        .from('personel_audit_log')
        .select('created_at, onceki, sonraki, ref_id')
        .eq('ref_table', 'calisan')
        .order('created_at', { ascending: true }),
    ])

  const kadrolar = (kadroRaw ?? []) as YoneticiKadroSatir[]
  const kadroById = new Map(kadrolar.map(k => [k.id, k]))

  const calisanBySicil = new Map<string, { ad_soyad: string; telefon: string; e_posta: string }>()
  for (const c of calisanRaw ?? []) {
    const sicil = String(c.sicil_no ?? '').trim()
    if (!sicil) continue
    calisanBySicil.set(sicil, {
      ad_soyad: String(c.ad_soyad ?? '').trim() || '—',
      telefon: String(c.telefon ?? '').trim() || '—',
      e_posta: String(c.e_posta ?? '').trim() || '—',
    })
  }

  const hareketlerByKadroId = new Map<number, PersonelHareketSatir[]>()
  for (const h of phRaw ?? []) {
    const kid = h.kadro_id as number | null
    if (!kid) continue
    const list = hareketlerByKadroId.get(kid) ?? []
    list.push(h)
    hareketlerByKadroId.set(kid, list)
  }

  const auditBySicil = new Map<string, Tables<'personel_audit_log'>[]>()
  for (const a of auditRaw ?? []) {
    const sicil = String(a.ref_id ?? '').trim()
    if (!sicil) continue
    const list = auditBySicil.get(sicil) ?? []
    list.push(a as Tables<'personel_audit_log'>)
    auditBySicil.set(sicil, list)
  }

  const tumSatirlar = yoneticiIletisimAdaySatirlariOlustur(kadrolar, calisanBySicil)
  const seciliKeys = (ayarRaw ?? [])
    .map((a: { kayit_key: string | null }) => String(a.kayit_key ?? '').trim())
    .filter(Boolean) as string[]

  const periyotlar: RaporPeriyot[] = ['yillik', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const tabs: YoneticiIletisimTabVerisi[] = periyotlar.map(p => {
    const D = periyotSonGunu(yil, p)
    const satirlar = yoneticiIletisimListeSnapshot({
      D,
      seciliKeys,
      kadroById,
      hareketlerByKadroId,
      calisanBySicil,
      auditBySicil,
    })
    const label = p === 'yillik' ? 'YILLIK' : AYLAR_TR[(p as number) - 1]
    return { periyot: p, label, sonGunuEtiket: sonGunuMetin(D), satirlar }
  })

  return (
    <div>
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          Veri yüklenirken hata: {error}
        </div>
      )}
      <YoneticiIletisimBilgileriListeClient
        yil={yil}
        minYil={MIN_YIL}
        maxYil={MAX_YIL}
        tabs={tabs}
        tumSatirlar={tumSatirlar}
        seciliKeyler={seciliKeys}
        raporBasePath="/rapor/yonetici-iletisim-bilgileri-liste"
        excelBasePath="/api/rapor/yonetici-iletisim-bilgileri-liste/excel"
      />
    </div>
  )
}
