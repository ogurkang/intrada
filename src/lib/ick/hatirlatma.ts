import type { SupabaseClient } from '@supabase/supabase-js'
import { ickBugun } from '@/lib/ick/tanim'
import { gsmNormalize, smsGonderTekMetin } from '@/lib/sms-mesajpaketi'
import { fetchSmsAyar, smsAyarHazirMi, smsAyarToConfig } from '@/lib/sms-ayar'
import { smsLogTekKayit } from '@/lib/sms-log-kayit'

function gunEkle(iso: string, gun: number): string {
  const [y, a, g] = iso.split('-').map(Number)
  const d = new Date(Date.UTC(y, a - 1, g))
  d.setUTCDate(d.getUTCDate() + gun)
  return d.toISOString().slice(0, 10)
}

type Eylem = { id: number; kod_norm: string; termin_guncel: string }
type Kisi = { eylem_id: number; sicil_no: string; ad_soyad: string }

/** Tamamlanma tarihine 10 gün kalan tek tarihli eylemin müdürlük koordinatörüne ve işlemcisine bir kez SMS gider. */
export async function ickHatirlatmaCalistir(db: SupabaseClient): Promise<{ gonderilen: number; atlanan: number; hata?: string }> {
  const ayar = await fetchSmsAyar(db)
  if (!smsAyarHazirMi(ayar)) return { gonderilen: 0, atlanan: 0, hata: 'SMS ayarı hazır değil.' }
  const hedef = gunEkle(ickBugun(), 10)
  const { data: eylemData, error } = await db
    .from('ick_eylem')
    .select('id, kod_norm, termin_guncel, durum, termin_tipi')
    .eq('termin_tipi', 'tek')
    .eq('termin_guncel', hedef)
    .not('durum', 'in', '(tamamlandi,iptal,devredildi)')
  if (error) return { gonderilen: 0, atlanan: 0, hata: error.message }
  const eylemler = ((eylemData ?? []) as Eylem[]).filter(e => e.termin_guncel)
  if (!eylemler.length) return { gonderilen: 0, atlanan: 0 }

  const idler = eylemler.map(e => e.id)
  const { data: kisiData, error: kErr } = await db.from('ick_eylem_kisi').select('eylem_id, sicil_no, ad_soyad').in('eylem_id', idler)
  if (kErr) return { gonderilen: 0, atlanan: 0, hata: kErr.message }
  const kisiler = (kisiData ?? []) as Kisi[]
  const siciller = [...new Set(kisiler.map(k => k.sicil_no).filter(Boolean))]
  const telefon = new Map<string, string>()
  if (siciller.length) {
    const [calisan, firma] = await Promise.all([
      db.from('calisan').select('sicil_no, telefon').in('sicil_no', siciller),
      db.from('firma_calisanlar').select('sicil_no, telefon').in('sicil_no', siciller),
    ])
    for (const r of (calisan.data ?? []) as { sicil_no: string; telefon: string | null }[]) {
      const n = gsmNormalize(r.telefon)
      if (n) telefon.set(r.sicil_no, n)
    }
    for (const r of (firma.data ?? []) as { sicil_no: string | null; telefon: string | null }[]) {
      if (!r.sicil_no || telefon.has(r.sicil_no)) continue
      const n = gsmNormalize(r.telefon)
      if (n) telefon.set(r.sicil_no, n)
    }
  }

  const kod = new Map(eylemler.map(e => [e.id, e.kod_norm]))
  const grup = new Map<string, { ad: string; tel: string; kodlar: string[]; eylemler: number[] }>()
  let atlanan = 0
  for (const k of kisiler) {
    const tel = telefon.get(k.sicil_no)
    if (!tel) {
      atlanan++
      continue
    }
    const { data: varMi } = await db
      .from('ick_hatirlatma')
      .select('id')
      .eq('eylem_id', k.eylem_id)
      .eq('sicil_no', k.sicil_no)
      .eq('gun', hedef)
      .maybeSingle()
    if (varMi) continue
    const anahtar = `${k.sicil_no}|${tel}`
    const mevcut = grup.get(anahtar) ?? { ad: k.ad_soyad, tel, kodlar: [] as string[], eylemler: [] as number[] }
    const eylemKod = kod.get(k.eylem_id)
    if (eylemKod && !mevcut.eylemler.includes(k.eylem_id)) {
      mevcut.kodlar.push(eylemKod)
      mevcut.eylemler.push(k.eylem_id)
    }
    grup.set(anahtar, mevcut)
  }

  const config = smsAyarToConfig(ayar)
  let gonderilen = 0
  for (const [anahtar, alici] of grup) {
    const sicil = anahtar.split('|')[0]
    const metin = 'İKEP kapsamında Müdürlüğünüz sorumluluğunda tamamlanma tarihi yaklaşan eylemler bulunmaktadır. Bilgilerinize.'
    const sonuc = await smsGonderTekMetin(config, metin, [alici.tel])
    if (!sonuc.ok) {
      atlanan++
      continue
    }
    await db.from('ick_hatirlatma').insert(alici.eylemler.map(eylem_id => ({ eylem_id, sicil_no: sicil, gun: hedef })))
    await smsLogTekKayit(db, {
      actorId: null as unknown as string,
      actorEmail: null,
      aliciAd: alici.ad,
      aliciSicil: sicil,
      telefon: alici.tel,
      mesaj: metin,
      originator: config.originator,
      baglam: 'ick_hatirlatma',
      sonuc,
    })
    gonderilen++
  }
  return { gonderilen, atlanan }
}
