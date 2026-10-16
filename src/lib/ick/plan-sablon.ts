/** İKEP plan Word şablonundaki eylem tablolarını doldurur. Anlatı bölümlerine dokunmaz. */

export type IckSablonSatir = {
  /** null ise hücredeki mevcut durum metni korunur */
  mevcut: string | null
  eylemKod: string
  eylem: string
  sorumlu: string
  isbirligi: string
  cikti: string
  termin: string
  aciklama: string
}

const MAKUL = 'Mevcut düzenleme ve uygulamalar makul güvence sağlamaktadır; ayrıca eylem öngörülmemiştir.'

export function ickSablonAciklama(eylemVar: boolean, aciklama: string, guvence: string | null): string {
  const yazilan = aciklama.trim()
  if (eylemVar) return yazilan || 'Eylem öngörülmüştür.'
  if (yazilan) return yazilan
  return guvence === 'eylem_gerekli' ? 'Eylem bağlanmamış.' : MAKUL
}

function sonrakiAc(kaynak: string, tag: string, i: number): number {
  const a = kaynak.indexOf('<' + tag + '>', i)
  const b = kaynak.indexOf('<' + tag + ' ', i)
  if (a < 0) return b
  if (b < 0) return a
  return Math.min(a, b)
}

function bloklar(kaynak: string, tag: string): string[] {
  const close = '</' + tag + '>'
  const out: string[] = []
  let i = 0
  while (i < kaynak.length) {
    const s = sonrakiAc(kaynak, tag, i)
    if (s < 0) break
    let depth = 1
    let j = s + tag.length + 1
    while (j < kaynak.length) {
      const nOpen = sonrakiAc(kaynak, tag, j)
      const nClose = kaynak.indexOf(close, j)
      if (nClose < 0) break
      if (nOpen >= 0 && nOpen < nClose) {
        depth++
        j = nOpen + tag.length + 1
      } else {
        j = nClose + close.length
        depth--
        if (depth === 0) {
          out.push(kaynak.slice(s, j))
          break
        }
      }
    }
    i = j
  }
  return out
}

function hucreMetni(tc: string): string {
  return [...tc.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    .map(m => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
    .join('')
}

function xmlKac(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function hucreYaz(tc: string, metin: string): string {
  const open = tc.match(/^<w:tc[^>]*>/)?.[0] ?? '<w:tc>'
  const tcPr = tc.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/)?.[0] ?? ''
  const pPr = tc.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? ''
  const rPr = tc.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? ''
  const satirlar = metin.split('\n')
  const ps = (satirlar.length ? satirlar : ['']).map(satir => {
    const bosluk = satir.startsWith(' ') || satir.endsWith(' ') ? ' xml:space="preserve"' : ''
    return `<w:p>${pPr}<w:r>${rPr}<w:t${bosluk}>${xmlKac(satir)}</w:t></w:r></w:p>`
  })
  return `${open}${tcPr}${ps.join('')}</w:tc>`
}

function satirDoldur(row: string, veri: Map<string, IckSablonSatir>): string {
  const cells = bloklar(row, 'w:tc')
  if (cells.length !== 10) return row
  const kod = hucreMetni(cells[0]).trim()
  if (!/^\d+\.\d+$/.test(kod)) return row
  const d = veri.get(kod)
  if (!d) return row
  const yazilan = cells.map((c, i) => {
    if (i === 2 && d.mevcut != null) return hucreYaz(c, d.mevcut)
    if (i === 3) return hucreYaz(c, d.eylemKod)
    if (i === 4) return hucreYaz(c, d.eylem)
    if (i === 5) return hucreYaz(c, d.sorumlu)
    if (i === 6) return hucreYaz(c, d.isbirligi)
    if (i === 7) return hucreYaz(c, d.cikti)
    if (i === 8) return hucreYaz(c, d.termin)
    if (i === 9) return hucreYaz(c, d.aciklama)
    return c
  })
  const ilk = row.indexOf(cells[0])
  return row.slice(0, ilk) + yazilan.join('') + '</w:tr>'
}

function tabloDoldur(tbl: string, veri: Map<string, IckSablonSatir>): string {
  const rows = bloklar(tbl, 'w:tr')
  if (!rows.length) return tbl
  const ilk = tbl.indexOf(rows[0])
  const yeni = rows.map(r => satirDoldur(r, veri))
  if (yeni.every((r, i) => r === rows[i])) return tbl
  return tbl.slice(0, ilk) + yeni.join('') + '</w:tbl>'
}

/** Eylem tablolarındaki satırları genel şart koduna göre günceller. */
export function ickSablonXmlDoldur(xml: string, veri: Map<string, IckSablonSatir>): string {
  const tables = bloklar(xml, 'w:tbl')
  let sonuc = xml
  for (const tbl of tables) {
    const yeni = tabloDoldur(tbl, veri)
    if (yeni !== tbl) sonuc = sonuc.replace(tbl, yeni)
  }
  return sonuc
}
