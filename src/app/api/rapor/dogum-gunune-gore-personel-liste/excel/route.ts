import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { secilenKadroSatirAsil } from '@/lib/kadro-statu-sec'
import type { KadroRaporRow } from '@/lib/rapor-statuye-gore-cinsiyet'
import { raporExcelStandartResponse } from '@/lib/rapor-excel-standart'

const MIN_YIL = 2000
const MAX_YIL = 2035
const AYLAR = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik']

function parseYil(v: string | null): number {
  const n = Number.parseInt(v ?? '', 10)
  if (!Number.isFinite(n)) return new Date().getFullYear()
  return Math.min(MAX_YIL, Math.max(MIN_YIL, n))
}

function parseAy(v: string | null): number {
  const n = Number.parseInt(v ?? '', 10)
  if (!Number.isFinite(n) || n < 1 || n > 12) return new Date().getMonth() + 1
  return n
}

function formatDogumGunu(tarih: string | null): string {
  const s = String(tarih ?? '')
  if (s.length < 10) return '-'
  const ay = s.slice(5, 7)
  const gun = s.slice(8, 10)
  if (!gun || !ay) return '-'
  return `${gun}.${ay}`
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const yil = parseYil(searchParams.get('y'))
    const ay = parseAy(searchParams.get('m'))
    const periyotTarih = new Date(yil, ay, 0).toISOString().slice(0, 10)
    const supabase = await createClient()
    const [{ data: calisanRaw }, { data: kadroRaw }] = await Promise.all([
      supabase.from('calisan').select('sicil_no, ad_soyad, dogum_tarihi, telefon'),
      supabase
        .from('kadro_hareketleri')
        .select('asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
        .not('asil', 'is', null),
    ])
    const kadroByAsil = new Map<string, KadroRaporRow[]>()
    for (const k of (kadroRaw ?? []) as KadroRaporRow[]) {
      if (!k.asil) continue
      const list = kadroByAsil.get(k.asil) ?? []
      list.push(k)
      kadroByAsil.set(k.asil, list)
    }
    const satirlar = (calisanRaw ?? [])
      .filter(c => {
        const dt = String(c.dogum_tarihi ?? '')
        if (!dt || dt.length < 7) return false
        const dogumAy = Number.parseInt(dt.slice(5, 7), 10)
        if (dogumAy !== ay) return false
        const sec = secilenKadroSatirAsil(kadroByAsil.get(c.sicil_no) ?? [], periyotTarih)
        return !!sec
      })
      .sort((a, b) => a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }))

    const kutlamaMesaji =
      'Dogum gununuzu kutlar yeni yasinizin saglik, mutluluk ve huzur getirmesini dilerim. Adapazari Belediye Baskani Mutlu ISIKSU'

    return raporExcelStandartResponse({
      baslik: 'Doğum Gününe Göre Personel Listesi',
      donemEtiket: `Yıl: ${yil} · Ay: ${AYLAR[ay - 1]}`,
      anlikTarihEtiket: `Anlık görüntü tarihi: ${new Date().toLocaleDateString('tr-TR')}`,
      kolonlar: ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Cep Telefonu', 'Doğum Günü', 'Mesaj'],
      satirlar: satirlar.map((r, i) => [i + 1, r.sicil_no, r.ad_soyad, r.telefon ?? '-', formatDogumGunu(r.dogum_tarihi), kutlamaMesaji]),
      sheetName: 'Dogum Gunu',
      downloadFileName: 'Dogum_Gunune_Gore_Personel_Listesi.xlsx',
    })
  } catch (err) {
    console.error('DOGUM_GUNU_LISTE_EXCEL_HATA', err)
    return NextResponse.json({ error: 'Excel olusturulamadi.' }, { status: 500 })
  }
}
