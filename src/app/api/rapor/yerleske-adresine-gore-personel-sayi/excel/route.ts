import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import {
  gelenlerAyrilanlar,
  periyotSonGunu,
  type CalisanRaporRow,
  type FirmaRaporRow,
  type KadroRaporRow,
  type PersonelHareketRaporRow,
  type RaporPeriyot,
} from '@/lib/rapor-statuye-gore-cinsiyet'
import { hazirlaStatuSirali } from '@/lib/statu-liste-siralama'
import { fetchMudurlukYerleskeTanimSatirlari } from '@/lib/yerleske-adresi'
import { yerleskePersonelSayiSnapshot } from '@/lib/rapor-yerleske-adresine-gore-personel-sayi'

const AYLAR_TR = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik']
const MIN_YIL = 2000
const MAX_YIL = 2035
const COL_LAST = 5

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
  return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const THIN_BORDER = {
  top: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  bottom: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  left: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
  right: { style: 'thin' as const, color: { rgb: 'D1D5DB' } },
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const yil = parseYil(searchParams.get('y'))
    const periyot = parsePeriyot(searchParams.get('p'))
    const D = periyotSonGunu(yil, periyot)
    const periyotLabel = periyot === 'yillik' ? 'YILLIK' : AYLAR_TR[(periyot as number) - 1]

    const [
      { data: tanimStatuRaw },
      { data: kadroRaw },
      { data: calisanRaw },
      { data: firmaRaw },
      { data: phAyrRaw },
      { data: phIseRaw },
      tanimSatirlar,
    ] = await Promise.all([
      supabase.from('tanim_statu').select('statu_adi, sira_no').eq('aktif', true),
      supabase
        .from('kadro_hareketleri')
        .select(
          'asil, statu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu, gorev_mudurlugu, kadro_mudurlugu, gorev_unvani',
        )
        .not('asil', 'is', null),
      supabase.from('calisan').select('sicil_no, ad_soyad, cinsiyet, yerleske_adresi_id'),
      supabase
        .from('firma_calisanlar')
        .select('id, ad_soyad, cinsiyet, kuruma_giris_tarihi, ayrilis_tarihi, gorev_mudurlugu'),
      supabase
        .from('personel_hareketleri')
        .select('sicil_no, ayrilis_tarihi, ise_baslama_tarihi')
        .not('ayrilis_tarihi', 'is', null)
        .gte('ayrilis_tarihi', `${yil}-01-01`)
        .lte('ayrilis_tarihi', `${yil}-12-31`),
      supabase
        .from('personel_hareketleri')
        .select('sicil_no, ayrilis_tarihi, ise_baslama_tarihi')
        .not('ise_baslama_tarihi', 'is', null)
        .gte('ise_baslama_tarihi', `${yil}-01-01`)
        .lte('ise_baslama_tarihi', `${yil}-12-31`),
      fetchMudurlukYerleskeTanimSatirlari(supabase),
    ])

    const phSeen = new Set<string>()
    const personelHareketleri: PersonelHareketRaporRow[] = []
    for (const r of [...(phAyrRaw ?? []), ...(phIseRaw ?? [])]) {
      const key = `${r.sicil_no}|${String(r.ayrilis_tarihi ?? '')}|${String(r.ise_baslama_tarihi ?? '')}`
      if (phSeen.has(key)) continue
      phSeen.add(key)
      personelHareketleri.push({
        sicil_no: r.sicil_no,
        ayrilis_tarihi: r.ayrilis_tarihi,
        ise_baslama_tarihi: r.ise_baslama_tarihi,
      })
    }

    const { etiketler } = hazirlaStatuSirali(tanimStatuRaw ?? [])
    const kadro = (kadroRaw ?? []) as KadroRaporRow[]
    const firma = (firmaRaw ?? []) as FirmaRaporRow[]
    const calisanBySicil = new Map<string, CalisanRaporRow>()
    for (const c of calisanRaw ?? []) {
      calisanBySicil.set(c.sicil_no, { sicil_no: c.sicil_no, ad_soyad: c.ad_soyad, cinsiyet: c.cinsiyet })
    }
    const calisanYerleske = (calisanRaw ?? []).map(c => ({
      sicil_no: c.sicil_no,
      yerleske_adresi_id: (c as { yerleske_adresi_id?: number | null }).yerleske_adresi_id ?? null,
    }))

    const snap = yerleskePersonelSayiSnapshot({ D, tanimSatirlar, kadro, firma, calisanYerleske, etiketler })
    const { gelenler, ayrilanlar } = gelenlerAyrilanlar({
      periyot,
      yil,
      kadro,
      calisanBySicil,
      firma,
      personelHareketleri,
    })

    let toplamAdabel = 0
    let toplamBelediye = 0
    let toplamGenel = 0
    for (const s of snap.satirlar) {
      toplamAdabel += s.adabel
      toplamBelediye += s.belediye
      toplamGenel += s.toplam
    }

    const rows: (string | number)[][] = [
      ['Yerleske Adresine Gore Personel Sayisi'],
      [`Yil: ${yil}`, `Donem: ${periyotLabel}`, `Anlik goruntu: ${sonGunuMetin(D)}`],
      [],
      ['Sira No', 'Mudurluk Adi', 'Yerleske Adi', 'ADABEL Personel Sayisi', 'Belediye Personel Sayisi', 'Toplam'],
    ]
    snap.satirlar.forEach((s, i) => {
      rows.push([i + 1, s.mudurlukAdi, s.yerleskeAdi, s.adabel, s.belediye, s.toplam])
    })
    rows.push(['', 'Toplam', '', toplamAdabel, toplamBelediye, toplamGenel])
    rows.push([])
    rows.push(['Gelenler:', gelenler.join(', ') || '—'])
    rows.push(['Ayrilanlar:', ayrilanlar.join(', ') || '—'])

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 24 }, { wch: 22 }, { wch: 24 }, { wch: 10 }]

    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c <= COL_LAST; c++) {
        const addr = XLSX.utils.encode_cell({ r, c })
        if (!ws[addr]) continue
        ws[addr].s = {
          border: THIN_BORDER,
          ...(r === 3 ? { font: { bold: true }, fill: { fgColor: { rgb: 'F1F5F9' } } } : {}),
        }
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, periyotLabel.slice(0, 31))
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const fname = `yerleske-adresine-gore-personel-sayi_${yil}_${periyotLabel}.xlsx`

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fname}"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Excel olusturulamadi'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
