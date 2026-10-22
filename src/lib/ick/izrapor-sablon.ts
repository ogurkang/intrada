import type { IckRaporSatir, IckRaporVerisi } from '@/lib/ick/rapor'

type Blok = { tur: 'p' | 'tbl'; xml: string; metin: string }

function sonrakiAc(kaynak: string, tag: string, i: number): number {
  const a = kaynak.indexOf('<' + tag + '>', i)
  const b = kaynak.indexOf('<' + tag + ' ', i)
  return [a, b].filter(x => x >= 0).sort((x, y) => x - y)[0] ?? -1
}

function parcala(body: string): Blok[] {
  const out: Blok[] = []
  let i = 0
  while (i < body.length) {
    const p = sonrakiAc(body, 'w:p', i)
    const t = sonrakiAc(body, 'w:tbl', i)
    const sec = [
      { tur: 'p' as const, s: p },
      { tur: 'tbl' as const, s: t },
    ]
      .filter(x => x.s >= 0)
      .sort((a, b) => a.s - b.s)[0]
    if (!sec) break
    const gt = body.indexOf('>', sec.s)
    if (body[gt - 1] === '/') {
      out.push({ tur: sec.tur, xml: body.slice(sec.s, gt + 1), metin: '' })
      i = gt + 1
      continue
    }
    const close = `</w:${sec.tur === 'p' ? 'p' : 'tbl'}>`
    const tag = sec.tur === 'p' ? 'w:p' : 'w:tbl'
    let depth = 1
    let j = gt + 1
    while (j < body.length) {
      const ac = sonrakiAc(body, tag, j)
      const kapa = body.indexOf(close, j)
      if (kapa < 0) break
      if (ac >= 0 && ac < kapa) {
        const gt2 = body.indexOf('>', ac)
        if (body[gt2 - 1] === '/') {
          j = gt2 + 1
          continue
        }
        depth++
        j = gt2 + 1
      } else {
        j = kapa + close.length
        depth--
        if (depth === 0) break
      }
    }
    const xml = body.slice(sec.s, j)
    out.push({ tur: sec.tur, xml, metin: hucreMetni(xml).replace(/\s+/g, ' ').trim() })
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

function pYaz(p: string, metin: string): string {
  const open = p.match(/^<w:p[^>]*>/)?.[0] ?? '<w:p>'
  const pPr = p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? ''
  const rPr = p.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? ''
  const parcalar = metin.split('\n')
  const ic = parcalar
    .map((satir, i) => {
      const bos = satir.startsWith(' ') || satir.endsWith(' ') ? ' xml:space="preserve"' : ''
      const kir = i > 0 ? '<w:br/>' : ''
      return `<w:r>${rPr}${kir}<w:t${bos}>${xmlKac(satir)}</w:t></w:r>`
    })
    .join('')
  return `${open}${pPr}${ic}</w:p>`
}

function hucreler(satir: string): string[] {
  const close = '</w:tc>'
  const out: string[] = []
  let i = 0
  while (i < satir.length) {
    const s = sonrakiAc(satir, 'w:tc', i)
    if (s < 0) break
    const gt = satir.indexOf('>', s)
    let depth = 1
    let j = gt + 1
    while (j < satir.length) {
      const ac = sonrakiAc(satir, 'w:tc', j)
      const kapa = satir.indexOf(close, j)
      if (kapa < 0) break
      if (ac >= 0 && ac < kapa) {
        depth++
        j = satir.indexOf('>', ac) + 1
      } else {
        j = kapa + close.length
        depth--
        if (depth === 0) {
          out.push(satir.slice(s, j))
          break
        }
      }
    }
    i = j
  }
  return out
}

function satirlar(tbl: string): string[] {
  const close = '</w:tr>'
  const out: string[] = []
  let i = 0
  while (i < tbl.length) {
    const s = sonrakiAc(tbl, 'w:tr', i)
    if (s < 0) break
    const gt = tbl.indexOf('>', s)
    let depth = 1
    let j = gt + 1
    while (j < tbl.length) {
      const ac = sonrakiAc(tbl, 'w:tr', j)
      const kapa = tbl.indexOf(close, j)
      if (kapa < 0) break
      if (ac >= 0 && ac < kapa) {
        depth++
        j = tbl.indexOf('>', ac) + 1
      } else {
        j = kapa + close.length
        depth--
        if (depth === 0) {
          out.push(tbl.slice(s, j))
          break
        }
      }
    }
    i = j
  }
  return out
}

function hucreYaz(tc: string, metin: string): string {
  const open = tc.match(/^<w:tc[^>]*>/)?.[0] ?? '<w:tc>'
  const tcPr = tc.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/)?.[0] ?? ''
  const pPr = tc.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? ''
  const rPr = tc.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? ''
  const satir = (metin || '—').split('\n')
  const ps = satir
    .map(s => {
      const bos = s.startsWith(' ') || s.endsWith(' ') ? ' xml:space="preserve"' : ''
      return `<w:p>${pPr}<w:r>${rPr}<w:t${bos}>${xmlKac(s)}</w:t></w:r></w:p>`
    })
    .join('')
  return `${open}${tcPr}${ps}</w:tc>`
}

function satirYaz(tr: string, degerler: string[]): string {
  const hucre = hucreler(tr)
  let n = 0
  return tr.replace(/<w:tc[\s>][\s\S]*?<\/w:tc>/g, () => hucreYaz(hucre[n], degerler[n++] ?? ''))
}

function ozetTablo(tbl: string, v: IckRaporVerisi): string {
  const o = v.donemOzet
  const rows = satirlar(tbl)
  if (rows.length < 2) return tbl
  const yeni = satirYaz(rows[1], [String(o.eylem), String(o.tamamlanan), String(o.devam + o.baslanmadi), `%${o.oran}`])
  return tbl.replace(rows[1], yeni)
}

function listeTablo(tbl: string, satirlarVeri: IckRaporSatir[]): string {
  const rows = satirlar(tbl)
  if (rows.length < 2) return tbl
  const ornek = rows[1]
  const govde = (satirlarVeri.length ? satirlarVeri : [null]).map(s =>
    satirYaz(ornek, s ? [s.genelSartKod, s.kod, s.ongorulenEylem, s.sorumlu, s.cikti, s.termin] : ['—', '—', 'Bu dönemde kapsama giren eylem yok.', '—', '—', '—']),
  )
  const bas = tbl.indexOf(rows[1])
  const son = tbl.lastIndexOf('</w:tbl>')
  return tbl.slice(0, bas) + govde.join('') + tbl.slice(son)
}

function detayTablo(ornek: string, s: IckRaporSatir): string {
  const deger = [
    `${s.kod} / ${s.durumEtiket}`,
    s.ongorulenEylem,
    s.calisma || 'Kesinleşmiş bildirim yok.',
    [s.kanit || s.cikti || '—', s.kanitSayisi ? `Sistemde ${s.kanitSayisi} belge kayıtlı.` : ''].filter(Boolean).join('\n'),
    s.degerlendirme || '—',
    s.sonuc || '—',
  ]
  const rows = satirlar(ornek)
  let xml = ornek
  rows.forEach((row, i) => {
    const hucre = hucreler(row)
    if (hucre.length < 2) return
    xml = xml.replace(row, satirYaz(row, [hucreMetni(hucre[0]), deger[i] ?? '—']))
  })
  return xml
}

function paragraf(b: Blok, v: IckRaporVerisi, yil: string): string | null {
  const t = b.metin
  const o = v.donemOzet
  if (t.includes('KAMU İÇ KONTROL STANDARTLARINA UYUM') && t.includes('İZLEME')) {
    return pYaz(b.xml, `${yil} YILI\nKAMU İÇ KONTROL STANDARTLARINA UYUM\nEYLEM PLANI\nİZLEME VE DEĞERLENDİRME RAPORU`)
  }
  if (t.includes('Adapazarı / Sakarya')) return pYaz(b.xml, `Adapazarı / Sakarya\n${yil}`)
  if (t.includes('Adapazarı Belediyesi') && t.includes('Eylem Planı kapsamında')) {
    return pYaz(
      b.xml,
      `${v.planAd} kapsamında ${v.donemBaslik} döneminde izlenen eylemlerin gerçekleşme durumunun değerlendirilmesi amacıyla bu İzleme ve Değerlendirme Raporu hazırlanmıştır. İzleme dönemi ${v.donemAralik} tarihlerini kapsar. Rapor, İç Kontrol İzleme ve Yönlendirme Kurulunun değerlendirmesine sunulmak üzere İnsan Kaynakları ve Eğitim Müdürlüğü koordinasyonunda düzenlenmiştir.${v.kilitli ? '' : ' Dönem henüz kapatılmadığı için sayılar değişebilir.'}`,
    )
  }
  if (t.startsWith('Raporun amacı')) {
    const kodlar = v.satirlar.map(s => s.kod).filter(Boolean)
    const kapsam = kodlar.length ? kodlar.join(', ') : 'dönem kapsamına giren eylem bulunmamaktadır'
    return pYaz(
      b.xml,
      `Raporun amacı, ${v.donemBaslik} döneminde izlenen iç kontrol eylemlerinin gerçekleşme düzeyini ortaya koymak ve sonraki döneme kalan işleri göstermektir. Bu dönemde kapsamdaki eylemler: ${kapsam}.`,
    )
  }
  if (t.startsWith('İzleme çalışmasında')) {
    return pYaz(
      b.xml,
      'İzleme çalışmasında her eylem; eylem kodu, öngörülen faaliyet, tamamlanma tarihi, gerçekleşme durumu, gerçekleştirilen çalışma, kanıt ve izleme değerlendirmesi başlıkları altında incelenmiştir. Durum, koordinatörün kesinleştirdiği son bildirimden gelir. Sürekli eylemler listelenir, gerçekleşme oranına katılmaz.',
    )
  }
  if (t.startsWith('4. ')) return pYaz(b.xml, `4. ${yil} YILI EYLEMLERİ GENEL GERÇEKLEŞME DURUMU`)
  if (t.includes('öngörülen üç eylem') || t.includes('yıllık eylem gerçekleşme')) {
    return pYaz(
      b.xml,
      `${v.donemBaslik} kapsamında ${o.eylem} eylem izlenmiştir. ${o.tamamlanan} eylem tamamlanmış, ${o.devam} eylem devam etmekte, ${o.baslanmadi} eyleme başlanmamıştır. Gerçekleşme oranı %${o.oran}'dir. Oran, tamamlanan eylem sayısının kapsamdaki eylem sayısına bölünmesiyle bulunur. Sürekli eylemler bu orana katılmaz.`,
    )
  }
  if (t.startsWith('5. ')) return pYaz(b.xml, '5. DÖNEM KAPSAMINDAKİ EYLEMLER')
  if (t.includes('izleme çalışması sonucunda')) {
    return pYaz(
      b.xml,
      `${v.donemBaslik} izleme sonucunda gerçekleşme oranı %${o.oran} olarak hesaplanmıştır. Tamamlanan ${o.tamamlanan}, devam eden ${o.devam} ve başlanmayan ${o.baslanmadi} eylem bu dönemin kapsamındadır.`,
    )
  }
  if (t.includes('tamamlanan eylemlerin yalnızca şeklen')) {
    return pYaz(
      b.xml,
      'İzleyen dönemde tamamlanan eylemlerin güncelliği, devam eden eylemlerin kanıtları ve tamamlanma tarihi geçen eylemlerin kapanışı izlenmelidir.',
    )
  }
  if (t.includes('eylemlerinin gerçekleşme durumu ve raporda')) {
    return pYaz(
      b.xml,
      `${v.donemBaslik} dönemindeki eylemlerin gerçekleşme durumu ve raporda yer verilen değerlendirmeler İç Kontrol İzleme ve Yönlendirme Kurulunun değerlendirmesine sunulur. Kurul, gerekli görürse sürdürülebilirlik, kanıt veya sonraki dönem uygulamaları için ilave yönlendirme kararı alabilir.`,
    )
  }
  return null
}

export function ickIzraporXmlDoldur(xml: string, v: IckRaporVerisi): string {
  const bodyBas = xml.indexOf('<w:body>')
  const bodySon = xml.lastIndexOf('</w:body>')
  const bas = bodyBas + '<w:body>'.length
  const body = xml.slice(bas, bodySon)
  const blok = parcala(body)
  const kapsam = v.satirlar.filter(s => s.donemdeTerminli || s.kumulatifKapsam)
  const yil = (v.donemBaslik.match(/\d{4}/)?.[0] ?? v.planDonem.slice(0, 4)) || ''
  const detayOrnek = blok.find(b => b.tur === 'tbl' && b.metin.includes('Eylem Kodu / Durumu'))?.xml
  const baslikOrnek = blok.find(b => b.metin.startsWith('6.1.'))?.xml
  let detayYazildi = false
  const parca: string[] = []
  let atla = false
  for (const b of blok) {
    if (b.metin.startsWith('6.1.')) atla = true
    if (atla) {
      if (b.metin.startsWith('7.')) {
        atla = false
        if (!detayYazildi && detayOrnek && baslikOrnek) {
          detayYazildi = true
          if (!kapsam.length) parca.push(pYaz(baslikOrnek, 'Bu dönemde kapsama giren eylem yoktur.'))
          kapsam.forEach((s, i) => {
            parca.push(pYaz(baslikOrnek, `6.${i + 1}. ${s.kod} Kodlu Eylem`))
            parca.push(detayTablo(detayOrnek, s))
          })
        }
      } else {
        continue
      }
    }
    if (b.tur === 'tbl' && b.metin.includes('Eylem Sayısı') && b.metin.includes('Gerçekleşme Oranı')) {
      parca.push(ozetTablo(b.xml, v))
      continue
    }
    if (b.tur === 'tbl' && b.metin.includes('Genel Şart') && b.metin.includes('Termin')) {
      parca.push(listeTablo(b.xml, kapsam))
      continue
    }
    parca.push(paragraf(b, v, yil) ?? b.xml)
  }
  return xml.slice(0, bas) + parca.join('') + xml.slice(bodySon)
}
