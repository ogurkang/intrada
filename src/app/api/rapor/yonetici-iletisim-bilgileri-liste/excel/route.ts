import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { periyotSonGunu, type RaporPeriyot } from '@/lib/rapor-statuye-gore-cinsiyet'
import { raporExcelStandartResponse } from '@/lib/rapor-excel-standart'
import {
  yoneticiIletisimListeSnapshot,
  type PersonelHareketSatir,
  type YoneticiKadroSatir,
} from '@/lib/rapor-yonetici-iletisim-bilgileri-liste'
import type { Tables } from '@/types/database'

const AYLAR_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const MIN_YIL = 2000
const MAX_YIL = 2035

function parseYil(v: string | null): number {
  const parsed = Number.parseInt(v ?? '', 10)
  if (!Number.isFinite(parsed)) return new Date().getFullYear()
  return Math.min(MAX_YIL, Math.max(MIN_YIL, parsed))
}

function parsePeriyot(v: string | null): RaporPeriyot {
  if (v === 'yillik') return 'yillik'
  const n = Number.parseInt(v ?? '', 10)
  if (Number.isFinite(n) && n >= 1 && n <= 12) return n as RaporPeriyot
  return 'yillik'
}

function sonGunuMetin(D: string): string {
  const [y, m, d] = D.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { searchParams } = new URL(req.url)
    const yil = parseYil(searchParams.get('y'))
    const periyot = parsePeriyot(searchParams.get('p'))
    const D = periyotSonGunu(yil, periyot)
    const label = periyot === 'yillik' ? 'YILLIK' : AYLAR_TR[(periyot as number) - 1]

    const [{ data: kadroRaw }, { data: calisanRaw }, { data: ayarRaw }, { data: phRaw }, { data: auditRaw }] =
      await Promise.all([
        supabase
          .from('kadro_hareketleri')
          .select(
            'id, kadro_unvani, asil, vekil, iptal_karar_tarihi, iptal_karar_no, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu',
          )
          .order('id', { ascending: true }),
        supabase.from('calisan').select('sicil_no, ad_soyad, telefon, e_posta'),
        sb.from('rapor_yonetici_iletisim_liste_ayar').select('kayit_key, sira_no').order('sira_no', { ascending: true }),
        supabase
          .from('personel_hareketleri')
          .select('sicil_no, kadro_id, kadro_rol, yururluk_tarihi, ise_baslama_tarihi, ayrilis_tarihi')
          .not('kadro_id', 'is', null),
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

    const seciliKeys = (ayarRaw ?? [])
      .map((a: { kayit_key: string | null }) => String(a.kayit_key ?? '').trim())
      .filter(Boolean) as string[]

    const satirlar = yoneticiIletisimListeSnapshot({
      D,
      seciliKeys,
      kadroById,
      hareketlerByKadroId,
      calisanBySicil,
      auditBySicil,
    })

    return raporExcelStandartResponse({
      baslik: 'Yönetici İletişim Bilgileri Listesi',
      donemEtiket: `Yıl: ${yil} · Sekme: ${label}`,
      anlikTarihEtiket: `Anlık görüntü tarihi: ${sonGunuMetin(D)}`,
      kolonlar: ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Kadro Unvanı', 'Telefon Numarası', 'E-Posta Adresi'],
      satirlar: satirlar.map((r, i) => [i + 1, r.sicil_no, r.ad_soyad, r.kadro_unvani, r.telefon, r.e_posta]),
      sheetName: 'Yonetici Iletisim',
      downloadFileName: `Yonetici_Iletisim_Bilgileri_Listesi_${yil}_${label}.xlsx`,
    })
  } catch (err) {
    console.error('YONETICI_ILETISIM_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
