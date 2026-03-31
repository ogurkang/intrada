/**
 * calisan + aktif firma_calisanlar kayıtlarındaki e-posta + TCKN + doğum tarihine göre
 * toplu Supabase Auth kullanıcısı oluşturur.
 * Varsayılan şifre: TCKN ilk 3 rakam + nokta + doğum yılı (4 hane), örn. 252.1987
 *
 * Kullanım (proje kökünden):
 *   node --env-file=.env.local scripts/bulk-create-auth-users.mjs
 *   node --env-file=.env.local scripts/bulk-create-auth-users.mjs --reset-existing
 *
 * Sadece ne yapılacağını görmek (Auth’a yazmaz):
 *   npm run bulk-auth-users:dry
 *   veya: DRY_RUN=1 node --env-file=.env.local scripts/bulk-create-auth-users.mjs
 *
 * Gereksinim: .env.local içinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

function loadEnvFallback() {
  if (process.env.NODE_ENV === 'test') return
  const p = join(process.cwd(), '.env.local')
  if (!existsSync(p)) return
  const raw = readFileSync(p, 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (process.env[k] === undefined) process.env[k] = v
  }
}

loadEnvFallback()

/** .env ile aynı: APP_GODMODE_SICIL_LIST=IK001,IK002 — bu siciller Auth’a eklenmez */
function godmodeSicilSet() {
  const raw = process.env.APP_GODMODE_SICIL_LIST ?? ''
  const set = new Set()
  for (const s of raw.split(',')) {
    const t = s.trim()
    if (t) set.add(t)
  }
  return set
}

function isGodmodeSicil(sicilNo, godSet) {
  const s = String(sicilNo ?? '').trim()
  if (!s) return false
  if (godSet.has(s)) return true
  for (const g of godSet) {
    if (g.toLowerCase() === s.toLowerCase()) return true
  }
  return false
}

function dogumYiliAl(dogumTarihi) {
  if (!dogumTarihi || typeof dogumTarihi !== 'string') return null
  const s = dogumTarihi.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const y = new Date(s).getFullYear()
    return Number.isFinite(y) ? y : null
  }
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})/.exec(s)
  if (m) return parseInt(m[3], 10)
  const m2 = /^(\d{4})/.exec(s)
  if (m2) return parseInt(m2[1], 10)
  return null
}

function varsayilanSifre(tckn, dogumTarihi) {
  if (!tckn) return null
  const digits = String(tckn).replace(/\D/g, '')
  if (digits.length < 3) return null
  const ilk3 = digits.slice(0, 3)
  const yil = dogumYiliAl(dogumTarihi)
  if (yil == null || yil < 1900 || yil > 2100) return null
  return `${ilk3}.${yil}`
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const dryRun =
  process.env.DRY_RUN === '1' ||
  process.env.DRY_RUN === 'true' ||
  process.argv.includes('--dry')
const resetExisting =
  process.env.RESET_EXISTING === '1' ||
  process.env.RESET_EXISTING === 'true' ||
  process.argv.includes('--reset-existing')

if (!url || !key) {
  console.error('Eksik: NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY (.env.local)')
  process.exit(1)
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function authUserIdByEmail(email) {
  const target = String(email ?? '').trim().toLowerCase()
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) return null
    const u = (data?.users ?? []).find((x) => (x.email ?? '').trim().toLowerCase() === target)
    if (u) return u.id
    if (!(data?.users ?? []).length) break
  }
  return null
}

async function main() {
  const godSet = godmodeSicilSet()
  const [{ data: calisanRows, error: calErr }, { data: firmaRows, error: firmaErr }] = await Promise.all([
    admin.from('calisan').select('sicil_no, ad_soyad, tckn, dogum_tarihi, e_posta'),
    admin
      .from('firma_calisanlar')
      .select('sicil_no, ad_soyad, tckn, dogum_tarihi, e_posta, ayrilis_tarihi')
      .is('ayrilis_tarihi', null),
  ])
  if (calErr) {
    console.error('calisan okunamadı:', calErr.message)
    process.exit(1)
  }
  if (firmaErr) {
    console.error('firma_calisanlar okunamadı:', firmaErr.message)
    process.exit(1)
  }

  const rows = [...(calisanRows ?? [])]
  const seenSicil = new Set(rows.map((r) => String(r.sicil_no ?? '').trim()).filter(Boolean))
  for (const f of firmaRows ?? []) {
    const sicil = String(f.sicil_no ?? '').trim()
    if (!sicil || seenSicil.has(sicil)) continue
    rows.push({
      sicil_no: sicil,
      ad_soyad: f.ad_soyad,
      tckn: f.tckn,
      dogum_tarihi: f.dogum_tarihi,
      e_posta: f.e_posta,
    })
  }

  let ok = 0
  let skip = 0
  let skipDup = 0
  let skipBad = 0
  let skipGod = 0
  let resetOk = 0
  let resetErr = 0

  for (const r of rows ?? []) {
    if (isGodmodeSicil(r.sicil_no, godSet)) {
      skipGod++
      console.log(`[atla] sicil ${r.sicil_no}: godmode listesinde (APP_GODMODE_SICIL_LIST)`)
      continue
    }

    const email = (r.e_posta ?? '').trim().toLowerCase()
    if (!email) {
      skipBad++
      console.log(`[atla] sicil ${r.sicil_no}: e_posta yok`)
      continue
    }

    const pwd = varsayilanSifre(r.tckn, r.dogum_tarihi)
    if (!pwd) {
      skipBad++
      console.log(`[atla] sicil ${r.sicil_no}: TCKN/doğum yılından şifre üretilemedi`)
      continue
    }

    if (dryRun) {
      console.log(`[dry-run] ${email} → şifre "${pwd}"`)
      ok++
      continue
    }

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password: pwd,
      email_confirm: true,
    })

    if (cErr) {
      const msg = cErr.message ?? ''
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        if (resetExisting) {
          const uid = await authUserIdByEmail(email)
          if (!uid) {
            skipDup++
            console.log(`[zaten var] ${email} (id bulunamadı, reset atlandı)`)
            continue
          }
          const { error: updErr } = await admin.auth.admin.updateUserById(uid, {
            password: pwd,
            email_confirm: true,
          })
          if (updErr) {
            resetErr++
            console.error(`[reset hata] ${email}:`, updErr.message ?? updErr)
            continue
          }
          resetOk++
          console.log(`[şifre güncellendi] ${email}`)
          continue
        }
        skipDup++
        console.log(`[zaten var] ${email}`)
        continue
      }
      console.error(`[hata] ${email}:`, msg)
      skip++
      continue
    }

    ok++
    console.log(`[oluşturuldu] ${email}${created?.user?.id ? ` (${created.user.id})` : ''}`)
  }

  console.log('\n--- Özet ---')
  console.log(dryRun ? 'DRY RUN (hiçbir kullanıcı oluşturulmadı)' : 'Tamamlandı')
  console.log(`Başarılı / dry-run satırı: ${ok}`)
  console.log(`Zaten kayıtlı: ${skipDup}`)
  console.log(`Şifresi güncellenen (reset-existing): ${resetOk}`)
  console.log(`Şifre güncelleme hatası: ${resetErr}`)
  console.log(`Godmode (atlandı): ${skipGod}`)
  console.log(`Eksik veri / hata: ${skipBad + skip}`)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
