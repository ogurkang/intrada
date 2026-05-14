import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { applyGridBorders, mergeSatir } from '@/lib/kesintiler-excel'

const AY_TAM = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
]

function tarihFmt(t: string) {
  try { return new Date(t + 'T00:00:00').toLocaleDateString('tr-TR') } catch { return t }
}

function izinOrtusumu(ayrilis: string, baslama: string, yil: number, ay: number): boolean {
  const pad = String(ay).padStart(2, '0')
  return ayrilis <= `${yil}-${pad}-14` && baslama > `${yil}-${pad}-10`
}

type Satir = {
  sicil_no:       string
  ad_soyad:       string
  unvan:          string
  ayrilis:        string
  baslama:        string
  vekil_ad_soyad: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const parsedYil = parseInt(searchParams.get('y') ?? '', 10)
  const yil = Number.isFinite(parsedYil) ? parsedYil : new Date().getFullYear()
  const parsedAy = parseInt(searchParams.get('ay') ?? '0', 10)
  const ay = parsedAy >= 1 && parsedAy <= 12 ? parsedAy : 0 // 0 = yıllık

  const supabase = await createClient()

  // Aktif kadro
  const { data: kadroRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, vekil, kadro_unvani, gorev_unvani, ayrilis_tarihi')
    .is('ayrilis_tarihi', null)
    .not('asil', 'is', null)

  const mudurMap = new Map<string, { unvan: string; vekilSicil: string | null }>()
  for (const k of kadroRaw ?? []) {
    const sicil = String(k.asil ?? '').trim()
    if (!sicil) continue
    const ku = (k.kadro_unvani ?? '').toLocaleLowerCase('tr-TR')
    const gu = (k.gorev_unvani ?? '').toLocaleLowerCase('tr-TR')
    if (!ku.includes('müdürü') && !gu.includes('müdürü')) continue
    if (!mudurMap.has(sicil)) {
      mudurMap.set(sicil, {
        unvan: (k.gorev_unvani || k.kadro_unvani || '').trim(),
        vekilSicil: k.vekil ? String(k.vekil).trim() : null,
      })
    }
  }

  const mudurSicilList = [...mudurMap.keys()]
  if (mudurSicilList.length === 0) {
    return NextResponse.json({ error: 'Müdür kadrosu bulunamadı' }, { status: 404 })
  }

  const { data: izinRaw } = await supabase
    .from('izin_hareketleri')
    .select('sicil_no, tur, ayrilis, baslama, vekalet')
    .neq('durum', 'İptal Edildi')
    .in('sicil_no', mudurSicilList)
    .lte('ayrilis', `${yil}-12-31`)
    .gte('baslama', `${yil}-01-01`)

  const adMap: Record<string, string> = {}
  if (mudurSicilList.length > 0) {
    const { data: calisanlar } = await supabase
      .from('calisan')
      .select('sicil_no, ad_soyad')
      .in('sicil_no', mudurSicilList)
    ;(calisanlar ?? []).forEach(c => { if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no })
  }

  function satirlariHesapla(ayNo: number): Satir[] {
    return (izinRaw ?? [])
      .filter(i => i.sicil_no && i.ayrilis && i.baslama && izinOrtusumu(i.ayrilis, i.baslama, yil, ayNo))
      .map(i => {
        const mudur = mudurMap.get(i.sicil_no!)
        if (!mudur) return null
        return {
          sicil_no:       i.sicil_no!,
          ad_soyad:       adMap[i.sicil_no!] ?? i.sicil_no!,
          unvan:          mudur.unvan,
          ayrilis:        tarihFmt(i.ayrilis!),
          baslama:        tarihFmt(i.baslama!),
          vekil_ad_soyad: (i.vekalet ?? '').trim() || '—',
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const an = parseInt(a!.sicil_no, 10)
        const bn = parseInt(b!.sicil_no, 10)
        return isNaN(an) || isNaN(bn) ? a!.sicil_no.localeCompare(b!.sicil_no, 'tr') : an - bn
      }) as Satir[]
  }

  // Sütun başlıkları (Vekalet Eden Unvanı yok)
  const basliklar = ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Unvanı', 'Ayrılış', 'Başlama', 'Vekalet Eden Adı Soyadı']
  // Yıllık modda "Ay" sütunu da eklenir
  const yillikBasliklar = ['Sıra No', 'Ay', 'Sicil No', 'Adı Soyadı', 'Unvanı', 'Ayrılış', 'Başlama', 'Vekalet Eden Adı Soyadı']
  const headers = ay === 0 ? yillikBasliklar : basliklar
  const colCount = headers.length

  const rows: (string | number | XLSX.CellObject)[][] = []
  const mergeRows: number[] = []

  rows.push(mergeSatir('Maaş Öncesi İzinli Müdürler Raporu', colCount, { bold: true }))
  mergeRows.push(rows.length - 1)
  rows.push(mergeSatir(
    ay === 0
      ? `${yil} — Yıllık (her ayın 10–14 gün aralığı)`
      : `${AY_TAM[ay - 1]} ${yil} — 10–14 gün aralığı`,
    colCount
  ))
  mergeRows.push(rows.length - 1)

  if (ay === 0) {
    let herhangi = false
    for (let m = 1; m <= 12; m++) {
      const satirlar = satirlariHesapla(m)
      if (satirlar.length === 0) continue
      herhangi = true
      rows.push(mergeSatir(`${AY_TAM[m - 1]} ${yil}`, colCount, { italic: true }))
      mergeRows.push(rows.length - 1)
      rows.push(yillikBasliklar)
      satirlar.forEach((s, i) => {
        rows.push([i + 1, AY_TAM[m - 1], s.sicil_no, s.ad_soyad, s.unvan, s.ayrilis, s.baslama, s.vekil_ad_soyad])
      })
      rows.push(Array(colCount).fill(''))
    }
    if (!herhangi) {
      rows.push(headers)
      rows.push(Array(colCount).fill('').map((_, i) => (i === 3 ? 'Kayıt Yok' : '')))
    }
  } else {
    rows.push(headers)
    const satirlar = satirlariHesapla(ay)
    if (satirlar.length === 0) {
      rows.push(Array(colCount).fill('').map((_, i) => (i === 3 ? 'Kayıt Yok' : '')))
    } else {
      satirlar.forEach((s, i) => {
        rows.push([i + 1, s.sicil_no, s.ad_soyad, s.unvan, s.ayrilis, s.baslama, s.vekil_ad_soyad])
      })
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } }))
  ws['!cols'] = ay === 0
    ? [{ wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 28 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 28 }]
    : [{ wch: 8 }, { wch: 12 }, { wch: 28 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 28 }]
  applyGridBorders(ws, rows.length, colCount)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'İzinli Müdürler')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })

  const ayLabel = ay === 0 ? 'Yillik' : AY_TAM[ay - 1]
  const safeName = `Maas_Oncesi_Izinli_Mudurler_${yil}_${ayLabel}`

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeName}.xlsx"; filename*=UTF-8''${encodeURIComponent(`${safeName}.xlsx`)}`,
    },
  })
}
