import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { getCariYilAraligi } from '@/lib/tarih'
import { applyGridBorders, mergeSatir } from '@/lib/kesintiler-excel'

/** Zabıta Müdürlüğü adı */
const ZABITA_MUDURLUGU = 'Zabıta Müdürlüğü'

function tarih(t: string | null) {
  if (!t) return '—'
  return new Date(t).toLocaleDateString('tr-TR')
}

export async function GET() {
  const supabase = await createClient()
  const cariYil = getCariYilAraligi()
  const { yil, baslangic: yilBas, bitis: yilSon } = cariYil
  const yilBasMs = yilBas.getTime()
  const yilSonMs = yilSon.getTime()

  const { data: kadroRaw } = await supabase
    .from('kadro_hareketleri')
    .select('asil, vekil, gorev_mudurlugu, kadro_mudurlugu, ayrilis_tarihi')
    .is('ayrilis_tarihi', null)

  const zabitaSiciller = new Set<string>()
  for (const k of kadroRaw ?? []) {
    const mud = (k.gorev_mudurlugu ?? k.kadro_mudurlugu ?? '').trim()
    if (mud !== ZABITA_MUDURLUGU) continue
    const sicil = (k.asil ?? k.vekil ?? '').trim()
    if (sicil) zabitaSiciller.add(sicil)
  }

  const raporGunBySicil: Record<string, number> = {}
  if (zabitaSiciller.size > 0) {
    const { data: izinRaw } = await supabase
      .from('izin_hareketleri')
      .select('sicil_no, ayrilis, baslama, gun')
      .in('sicil_no', Array.from(zabitaSiciller))
      .neq('durum', 'İptal Edildi')
      .in('tur', ['Rapor', 'Heyet Raporu'])

    const MS_PER_DAY = 24 * 60 * 60 * 1000
    for (const iz of izinRaw ?? []) {
      const ayrilisDate = iz.ayrilis ? new Date(iz.ayrilis) : null
      const baslamaDate = iz.baslama ? new Date(iz.baslama) : null
      if (!ayrilisDate || !baslamaDate || isNaN(ayrilisDate.getTime()) || isNaN(baslamaDate.getTime())) continue
      ayrilisDate.setHours(0, 0, 0, 0)
      baslamaDate.setHours(0, 0, 0, 0)
      const leaveStartMs = ayrilisDate.getTime()
      const leaveEndExMs = baslamaDate.getTime()
      const lastDayOfLeave = new Date(leaveEndExMs - MS_PER_DAY)
      lastDayOfLeave.setHours(0, 0, 0, 0)
      const s = Math.max(leaveStartMs, yilBasMs)
      const e = Math.min(lastDayOfLeave.getTime(), yilSonMs)
      if (e < s) continue
      let gun = Math.floor((e - s) / MS_PER_DAY) + 1
      if (iz.gun && iz.gun > 0) gun = Math.min(gun, iz.gun)
      raporGunBySicil[iz.sicil_no] = (raporGunBySicil[iz.sicil_no] ?? 0) + Math.max(0, gun)
    }
  }

  const siciller = Array.from(zabitaSiciller).filter(s => (raporGunBySicil[s] ?? 0) >= 1)
  siciller.sort((a, b) => (raporGunBySicil[b] ?? 0) - (raporGunBySicil[a] ?? 0))

  const adMap: Record<string, string> = {}
  if (siciller.length > 0) {
    const { data: calisanRaw } = await supabase
      .from('calisan')
      .select('sicil_no, ad_soyad')
      .in('sicil_no', siciller)
    for (const c of calisanRaw ?? []) {
      if (c.sicil_no) adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
    }
  }

  const headers = ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Toplam Rapor/Heyet Günü']
  const colCount = headers.length
  const rows: (string | number | XLSX.CellObject)[][] = []
  const mergeRows: number[] = []

  rows.push(mergeSatir('Toplam Raporlu Memurlar', colCount))
  mergeRows.push(rows.length - 1)
  rows.push(mergeSatir(`Cari yıl: ${yil} (${tarih(cariYil.baslangicStr)} - ${tarih(cariYil.bitisStr)})`, colCount))
  mergeRows.push(rows.length - 1)
  rows.push(headers)

  if (siciller.length === 0) {
    rows.push(['', '', 'Kayıt Yok', ''])
  } else {
    siciller.forEach((sicil, i) => {
      rows.push([i + 1, sicil, adMap[sicil] ?? sicil, raporGunBySicil[sicil] ?? 0])
    })
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } }))
  applyGridBorders(ws, rows.length, colCount)
  ws['!cols'] = [{ width: 7 }, { width: 7 }, { width: 35 }, { width: 30 }]

  // A, B ve D sütunları ortalanır.
  for (let r = 0; r < rows.length; r++) {
    for (const c of [0, 1, 3]) {
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = ws[addr]
      if (!cell) continue
      const mevcutStyle = cell.s ?? {}
      const mevcutAlign = (mevcutStyle.alignment ?? {}) as Record<string, unknown>
      cell.s = {
        ...mevcutStyle,
        alignment: {
          ...mevcutAlign,
          horizontal: 'center',
          vertical: 'center',
        },
      }
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Toplam Raporlu')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })

  const safeName = `Toplam_Raporlu_Memurlar_${yil}`
  const fallbackName = safeName.replace(/[^\x20-\x7E]/g, '_')
  const encodedFilename = encodeURIComponent(`${safeName}.xlsx`)

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fallbackName}.xlsx"; filename*=UTF-8''${encodedFilename}`,
    },
  })
}
