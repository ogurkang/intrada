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

const { data: ayar, error: ayarSelErr } = await sb
  .from('rapor_gorev_yeri_liste_ayar')
  .select('id')
if (ayarSelErr) {
  console.error('Ayar okuma hatasi:', ayarSelErr.message)
  process.exit(1)
}
const ayarAdet = ayar?.length ?? 0

const { error: ayarDelErr } = await sb.from('rapor_gorev_yeri_liste_ayar').delete().neq('id', 0)
if (ayarDelErr) {
  console.error('Ayar silme hatasi:', ayarDelErr.message)
  process.exit(1)
}
console.log(`Kayit listesi sifirlandi (${ayarAdet} kayit).`)

const { data: audit, error: auditSelErr } = await sb
  .from('personel_audit_log')
  .select('id')
  .eq('ref_table', 'rapor_tanim')
  .eq('ref_id', 'GYL')
if (auditSelErr) {
  console.error('Denetim okuma hatasi:', auditSelErr.message)
  process.exit(1)
}
const auditIds = (audit ?? []).map(r => r.id)
if (auditIds.length) {
  const { error: auditDelErr } = await sb.from('personel_audit_log').delete().in('id', auditIds)
  if (auditDelErr) {
    console.error('Denetim silme hatasi:', auditDelErr.message)
    process.exit(1)
  }
}
console.log(`Denetim gecmisi sifirlandi (${auditIds.length} kayit).`)
