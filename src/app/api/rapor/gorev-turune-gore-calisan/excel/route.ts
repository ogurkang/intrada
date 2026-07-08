import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx-js-style'
import { createClient } from '@/lib/supabase/server'
import { applyGridBorders, mergeSatir } from '@/lib/kesintiler-excel'
import { GOREV_TURU_RAPOR_TURLERI } from '@/lib/gorev-bilgileri'
import {
  kadroBaslangic,
  kadroSatirAktifMi,
  type KadroRaporRow,
} from '@/lib/rapor-statuye-gore-cinsiyet'

function formatTarih(s: string | null | undefined): string {
  if (!s) return '—'
  const d = String(s).slice(0, 10)
  const [y, m, g] = d.split('-')
  if (!y || !m || !g) return d
  return `${g}.${m}.${y}`
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const turFiltre = searchParams.get('t') ?? ''
  const mudFiltreler = (searchParams.get('m') ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const sicilFiltre = (searchParams.get('s') ?? '').trim().toLocaleLowerCase('tr-TR')

  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const [{ data: calisanRaw }, { data: kadroRaw }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('calisan')
      .select('sicil_no, ad_soyad, gorev_turu, gorev_turu_tarihi, gorev_turu_bitis_tarihi, gorev_turu_aciklama')
      .in('gorev_turu', [...GOREV_TURU_RAPOR_TURLERI]),
    supabase
      .from('kadro_hareketleri')
      .select('asil, statu, kadro_mudurlugu, gorev_mudurlugu, kuruma_giris_tarihi, memuriyet_tarihi, ayrilis_tarihi, durumu')
      .not('asil', 'is', null),
  ])

  const byAsil = new Map<string, KadroRaporRow[]>()
  for (const r of kadroRaw ?? []) {
    const asil = String(r.asil ?? '').trim()
    if (!asil) continue
    const list = byAsil.get(asil) ?? []
    list.push(r as KadroRaporRow)
    byAsil.set(asil, list)
  }
  const mudurlukBySicil = new Map<string, string>()
  const statuBySicil = new Map<string, string>()
  for (const [sicil, rows] of byAsil) {
    const aktif = rows.filter(r => kadroSatirAktifMi(r, today))
    const hedef =
      aktif.length > 0
        ? aktif.reduce((a, b) => (kadroBaslangic(a) >= kadroBaslangic(b) ? a : b))
        : [...rows].sort((a, b) => kadroBaslangic(b).localeCompare(kadroBaslangic(a)))[0]
    if (hedef) {
      mudurlukBySicil.set(sicil, String(hedef.kadro_mudurlugu ?? hedef.gorev_mudurlugu ?? '').trim())
      statuBySicil.set(sicil, String((hedef as any).statu ?? '').trim())
    }
  }

  type Satir = {
    sicil_no: string; ad_soyad: string; statu: string
    mudurluk: string; gorev_turu: string; aciklama: string
    baslangic: string; bitis: string
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let satirlar: Satir[] = ((calisanRaw ?? []) as any[]).map((c: any) => {
    const sicil = String(c.sicil_no ?? '').trim()
    return {
      sicil_no:   sicil,
      ad_soyad:   c.ad_soyad ?? sicil,
      statu:      statuBySicil.get(sicil) ?? '',
      mudurluk:   mudurlukBySicil.get(sicil) ?? '',
      gorev_turu: c.gorev_turu ?? '',
      aciklama:   c.gorev_turu_aciklama ?? '',
      baslangic:  formatTarih(c.gorev_turu_tarihi ?? null),
      bitis:      formatTarih(c.gorev_turu_bitis_tarihi ?? null),
    }
  })

  if (turFiltre) satirlar = satirlar.filter(r => r.gorev_turu === turFiltre)
  if (mudFiltreler.length > 0) {
    const set = new Set(mudFiltreler)
    satirlar = satirlar.filter(r => set.has(r.mudurluk))
  }
  if (sicilFiltre) {
    satirlar = satirlar.filter(r =>
      r.sicil_no.toLocaleLowerCase('tr-TR').includes(sicilFiltre) ||
      r.ad_soyad.toLocaleLowerCase('tr-TR').includes(sicilFiltre) ||
      r.mudurluk.toLocaleLowerCase('tr-TR').includes(sicilFiltre),
    )
  }
  satirlar.sort((a, b) => a.sicil_no.localeCompare(b.sicil_no, 'tr', { numeric: true }))

  const baslik = turFiltre ? `Görev Türüne Göre Çalışan — ${turFiltre}` : 'Görev Türüne Göre Çalışan Bilgisi'
  const headers = ['Sıra No', 'Sicil No', 'Adı Soyadı', 'Statü', 'Müdürlük', 'Görev Türü', 'Görevlendirildiği Kurum', 'Başlangıç', 'Bitiş']
  const colCount = headers.length

  const rows: (string | number | XLSX.CellObject)[][] = []
  const mergeRows: number[] = []

  rows.push(mergeSatir(baslik, colCount, { bold: true }))
  mergeRows.push(rows.length - 1)
  rows.push(headers)

  if (satirlar.length === 0) {
    rows.push(Array(colCount).fill('').map((_, i) => i === 2 ? 'Kayıt Yok' : ''))
  } else {
    satirlar.forEach((s, i) => {
      rows.push([i + 1, s.sicil_no, s.ad_soyad, s.statu || '—', s.mudurluk || '—', s.gorev_turu, s.aciklama || '—', s.baslangic, s.bitis])
    })
    rows.push(['Toplam', '', `${satirlar.length} kayıt`, '', '', '', '', '', ''])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = mergeRows.map(r => ({ s: { r, c: 0 }, e: { r, c: colCount - 1 } }))
  ws['!cols'] = [
    { wch: 8 }, { wch: 12 }, { wch: 28 }, { wch: 14 },
    { wch: 28 }, { wch: 22 }, { wch: 24 }, { wch: 12 }, { wch: 12 },
  ]
  applyGridBorders(ws, rows.length, colCount)

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Görevlendirmeler')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true })

  const safeName = 'Gorev_Turune_Gore_Calisan'
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeName}.xlsx"; filename*=UTF-8''${encodeURIComponent(`${safeName}.xlsx`)}`,
    },
  })
}
