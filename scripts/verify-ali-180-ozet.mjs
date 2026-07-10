/**
 * Ali Kazancı (180) — Sosyal Hak özet yolu (devir satırları dahil)
 */
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import {
  applyShakIzyKsdToSonuc,
  buildIzyAnnualBakiyeBeforeMap,
  buildShakWindowsForYear,
  isIzyRhTur,
  izyRhToplamGun,
  shakChainDonemIdsUpTo,
} from '../src/lib/kesinym-hesap.ts'

const env = readFileSync('.env.local', 'utf8')
const get = (k) => (env.match(new RegExp('^' + k + '=(.+)$', 'm')) || [])[1]?.trim()
const sb = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'))
const sicil = '180'
const beklenen = { Mayıs: 64, HAZİRAN: 34, TEMMUZ: 35 }

const { data: donemler } = await sb
  .from('sosyal_hak_donem')
  .select('id,donem_adi,baslangic_tarihi,bitis_tarihi')
  .order('baslangic_tarihi')

const { data: rhRaw } = await sb
  .from('izin_hareketleri')
  .select('sira_no,sicil_no,tur,ayrilis,baslama,gun')
  .eq('sicil_no', sicil)
  .in('tur', ['Rapor', 'Heyet Raporu'])
  .neq('durum', 'İptal Edildi')

const annualRh = (rhRaw ?? []).map((r) => ({
  sira_no: r.sira_no,
  sicil_no: r.sicil_no ?? '',
  ad_soyad: 'Ali Kazancı',
  unvan: '',
  tur: r.tur ?? '',
  ayrilis: r.ayrilis,
  baslama: r.baslama,
  gun: r.gun ?? 0,
}))

async function buildAnnualRhForDonem(d) {
  const shakBitMs = new Date(d.bitis_tarihi + 'T23:59:59').getTime()
  const shakYil = new Date(d.baslangic_tarihi).getFullYear()
  const chainIds = shakChainDonemIdsUpTo(donemler ?? [], shakYil, d.bitis_tarihi)
  const { data: secim } = await sb
    .from('sosyal_hak_secim')
    .select('izin_sira_no')
    .in('donem_id', chainIds)
    .eq('tip', 'izy')
    .eq('dahil', true)
  const chainSiraNos = [...new Set((secim ?? []).map((s) => s.izin_sira_no))]
  const { data: chainIzin } = await sb
    .from('izin_hareketleri')
    .select('sicil_no')
    .in('sira_no', chainSiraNos)
    .neq('durum', 'İptal Edildi')
  const chainSiciller = [...new Set((chainIzin ?? []).map((i) => i.sicil_no).filter(Boolean))]
  const { data: allRh } = await sb
    .from('izin_hareketleri')
    .select('sira_no,sicil_no,tur,ayrilis,baslama,gun')
    .in('sicil_no', chainSiciller.length ? chainSiciller : [sicil])
    .in('tur', ['Rapor', 'Heyet Raporu'])
    .neq('durum', 'İptal Edildi')
  return (allRh ?? []).map((r) => ({
    sira_no: r.sira_no,
    sicil_no: r.sicil_no ?? '',
    ad_soyad: r.sicil_no === sicil ? 'Ali Kazancı' : r.sicil_no,
    unvan: '',
    tur: r.tur ?? '',
    ayrilis: r.ayrilis,
    baslama: r.baslama,
    gun: r.gun ?? 0,
  }))
}

console.log('=== Ali 180 — özet yolu (devir dahil) ===\n')
let fail = 0

for (const d of (donemler ?? []).filter((x) => ['Mayıs', 'HAZİRAN', 'TEMMUZ'].includes(x.donem_adi))) {
  const { data: secim } = await sb
    .from('sosyal_hak_secim')
    .select('izin_sira_no')
    .eq('donem_id', d.id)
    .eq('dahil', true)
    .eq('tip', 'izy')
  const siraNos = [...new Set((secim ?? []).map((s) => s.izin_sira_no))]
  const chainAnnualRh = await buildAnnualRhForDonem(d)
  const izinler = chainAnnualRh.filter((i) => siraNos.includes(i.sira_no) && i.sicil_no === sicil)

  const satirlar = izinler.map((iv) => {
    const toplam = iv.gun > 0 ? iv.gun : izyRhToplamGun(iv)
    const bakiye = buildIzyAnnualBakiyeBeforeMap(chainAnnualRh).get(iv.sira_no) ?? 0
    return {
      sira_no: iv.sira_no,
      sicil_no: iv.sicil_no,
      ad_soyad: iv.ad_soyad,
      unvan: iv.unvan,
      tur: iv.tur,
      OD: 0,
      R: iv.tur === 'Rapor' ? toplam : 0,
      RR: 0,
      HR: iv.tur === 'Heyet Raporu' ? toplam : 0,
      K: 0,
      SD: 0,
      RB: bakiye + toplam,
      kategori: 'Dönemdeki İzinler',
    }
  })

  const shakBitMs = new Date(d.bitis_tarihi + 'T23:59:59').getTime()
  const shakYil = new Date(d.baslangic_tarihi).getFullYear()
  const shakWindows = buildShakWindowsForYear(donemler ?? [], shakYil, shakBitMs)

  const currentDonemRhDays = new Map()
  for (const iz of izinler) {
    const gun = iz.gun > 0 ? iz.gun : izyRhToplamGun(iz)
    currentDonemRhDays.set(iz.sicil_no, (currentDonemRhDays.get(iz.sicil_no) ?? 0) + gun)
  }

  const sonuc = applyShakIzyKsdToSonuc(
    { satirlar, personeller: [], takipteki: [], donemdeki: [], askidaki: [] },
    chainAnnualRh,
    shakWindows,
    currentDonemRhDays,
  )

  const p = sonuc.personeller.find((x) => x.sicil_no === sicil)
  const exp = beklenen[d.donem_adi]
  const ok = p?.SD === exp
  if (!ok) fail++

  console.log(`${ok ? '✓' : '✗'} ${d.donem_adi}`)
  console.log(`   bu dönem Ali izin seçimi: ${izinler.length ? izinler.map((i) => i.sira_no).join(', ') : '(yok)'}`)
  console.log(`   personel SD: ${p?.SD ?? '(yok)'}  beklenen: ${exp}`)
  if (p) console.log(`   OD=${p.OD} K=${p.K} RB=${p.RB}`)
  console.log()
}

console.log(fail === 0 ? 'Tüm aylar uyumlu.' : `${fail} ay farklı.`)
process.exit(fail > 0 ? 1 : 0)
