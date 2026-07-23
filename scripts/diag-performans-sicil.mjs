import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = readFileSync('.env.local', 'utf8')
const get = k => (env.match(new RegExp('^' + k + '=(.+)$', 'm')) || [])[1]?.trim()
const sb = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'))

const siciller = process.argv.slice(2).length ? process.argv.slice(2) : ['429', '430']

for (const s of siciller) {
  const [cal, kh, pko, perf, acikDonem] = await Promise.all([
    sb.from('calisan').select('sicil_no,ad_soyad,statu').eq('sicil_no', s).maybeSingle(),
    sb.from('kadro_hareketleri').select('id,asil,vekil,statu,durumu,gorev_mudurlugu,kadro_mudurlugu,ayrilis_tarihi').or(`asil.eq.${s},vekil.eq.${s}`),
    sb.from('personel_kadro_ozet').select('*').eq('sicil_no', s).maybeSingle(),
    sb.from('performans_degerlendirme').select('id,donem_id,sicil_no,mudurluk_adi,durum,amir1_sicil'),
    sb.from('performans_donem').select('id,donem_adi,durum').eq('durum', 'Açık').limit(1).maybeSingle(),
  ])
  console.log('\n=== sicil', s, '===')
  console.log('calisan:', cal.data)
  console.log('kadro_hareketleri:', kh.data)
  console.log('personel_kadro_ozet:', pko.data)
  console.log('performans_degerlendirme:', perf.data)
  console.log('acik_donem:', acikDonem.data)
}
