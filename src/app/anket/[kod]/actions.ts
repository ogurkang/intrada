'use server'

import { createHash, randomUUID } from 'crypto'
import { cookies } from 'next/headers'
import { anketKodTemizle, type AnketSoruTipi } from '@/lib/anket'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

type CevapGirdi = {
  soruId: string
  secimler: string[]
  puan: number | null
  metin: string
}

type SoruSatir = {
  id: string
  tip: AnketSoruTipi
  secenekler: string[]
  metin: string
}

function cerezAdi(kod: string) {
  return `intrada_anket_${kod}`
}

function ozetle(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function anketCevapGonder(
  kodHam: string,
  cevaplar: CevapGirdi[],
): Promise<{ hata?: string }> {
  const kod = anketKodTemizle(kodHam)
  if (!kod) return { hata: 'Anket kodu geçersiz.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sb: any
  try {
    sb = createServiceRoleClient()
  } catch {
    return { hata: 'Anket şu anda kaydedilemiyor.' }
  }
  const { data: anket, error } = await sb
    .from('anketler')
    .select('id, durum')
    .eq('kod', kod)
    .maybeSingle()
  if (error || !anket) return { hata: 'Anket bulunamadı.' }
  if (anket.durum !== 'yayinda') return { hata: 'Bu anketin yayını durdurulmuş. Yeni cevap alınmıyor.' }

  const { data: soruData } = await sb
    .from('anket_sorulari')
    .select('id, tip, secenekler, metin')
    .eq('anket_id', anket.id)
  const sorular = ((soruData ?? []) as SoruSatir[]).map(s => ({
    ...s,
    secenekler: Array.isArray(s.secenekler) ? s.secenekler : [],
  }))
  if (sorular.length === 0) return { hata: 'Bu ankette soru yok.' }

  const hazir: { soru_id: string; secimler: string[]; puan: number | null; metin: string | null }[] = []
  for (const soru of sorular) {
    const gelen = cevaplar.find(c => c.soruId === soru.id)
    if (!gelen) return { hata: 'Tüm soruları cevaplayın.' }
    if (soru.tip === 'puan') {
      const puan = Number(gelen.puan)
      if (!Number.isInteger(puan) || puan < 1 || puan > 5) return { hata: 'Puan 1 ile 5 arasında olmalı.' }
      hazir.push({ soru_id: soru.id, secimler: [], puan, metin: null })
      continue
    }
    if (soru.tip === 'metin') {
      const metin = gelen.metin.trim()
      if (metin.length < 1) return { hata: 'Yazılı soruları boş bırakmayın.' }
      if (metin.length > 2000) return { hata: 'Yazılı cevap 2000 karakteri geçemez.' }
      hazir.push({ soru_id: soru.id, secimler: [], puan: null, metin })
      continue
    }
    const izinli = soru.tip === 'evet_hayir' ? ['Evet', 'Hayır'] : soru.secenekler
    const secimler = [...new Set(gelen.secimler.map(s => s.trim()).filter(s => izinli.includes(s)))]
    if (soru.tip === 'coklu_secim') {
      if (secimler.length < 1) return { hata: 'Çoklu seçim sorularında en az bir seçenek işaretleyin.' }
    } else if (secimler.length !== 1) {
      return { hata: 'Tek seçim sorularında bir seçenek işaretleyin.' }
    }
    hazir.push({ soru_id: soru.id, secimler, puan: null, metin: null })
  }

  const depo = await cookies()
  const varOlan = depo.get(cerezAdi(kod))?.value
  const token = varOlan && varOlan.length >= 16 ? varOlan : randomUUID()
  const ozet = ozetle(token)
  const { data: once } = await sb
    .from('anket_katilim')
    .select('id')
    .eq('anket_id', anket.id)
    .eq('tarayici_ozeti', ozet)
    .maybeSingle()
  if (once) return { hata: 'Bu anketi bu tarayıcıdan daha önce cevapladınız.' }

  const { data: katilim, error: katilimHata } = await sb
    .from('anket_katilim')
    .insert({ anket_id: anket.id, tarayici_ozeti: ozet })
    .select('id')
    .single()
  if (katilimHata || !katilim) return { hata: 'Cevap kaydedilemedi.' }

  const { error: cevapHata } = await sb.from('anket_cevaplar').insert(
    hazir.map(c => ({
      katilim_id: katilim.id,
      anket_id: anket.id,
      soru_id: c.soru_id,
      secimler: c.secimler,
      puan: c.puan,
      metin: c.metin,
    })),
  )
  if (cevapHata) {
    await sb.from('anket_katilim').delete().eq('id', katilim.id)
    return { hata: 'Cevap kaydedilemedi.' }
  }

  depo.set(cerezAdi(kod), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
  })
  return {}
}
