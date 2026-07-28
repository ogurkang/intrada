import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = readFileSync('.env.local', 'utf8')
const get = k => (env.match(new RegExp('^' + k + '=(.+)$', 'm')) || [])[1]?.trim()
const url = get('NEXT_PUBLIC_SUPABASE_URL')
const key = get('SUPABASE_SERVICE_ROLE_KEY')
if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY bulunamadi.')
  process.exit(1)
}

const sb = createClient(url, key)

const { data: mevcut, error: selErr } = await sb
  .from('rapor_gorev_yeri_liste_ayar')
  .select('id, kayit_key')
  .order('sira_no', { ascending: true })
if (selErr) {
  console.error('Okuma hatasi:', selErr.message)
  process.exit(1)
}

const adet = mevcut?.length ?? 0
console.log(`Mevcut kayit sayisi: ${adet}`)

const { error: delErr } = await sb.from('rapor_gorev_yeri_liste_ayar').delete().neq('id', 0)
if (delErr) {
  console.error('Silme hatasi:', delErr.message)
  process.exit(1)
}

console.log(`Kayit listesi sifirlandi (${adet} kayit silindi).`)
