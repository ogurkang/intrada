'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Tekli Kayıt Ekle / Güncelle ────────────────────────────────────────────

export async function izinHakiKaydet(
  formData: FormData
): Promise<{ hata?: string }> {
  const sicil_no      = String(formData.get('sicil_no') ?? '').trim()
  const yil           = parseInt(String(formData.get('yil') ?? '0'), 10)
  const devreden_gun  = Math.max(0, parseInt(String(formData.get('devreden_gun')  ?? '0'), 10))
  const hak_edilen_gun = Math.max(0, parseInt(String(formData.get('hak_edilen_gun') ?? '0'), 10))

  if (!sicil_no)                         return { hata: 'Sicil no zorunludur.' }
  if (!yil || yil < 2000 || yil > 2100)  return { hata: 'Geçerli bir yıl giriniz.' }

  const supabase = await createClient()
  const { error } = await supabase.from('izin_haklari').upsert(
    { yil, sicil_no, devreden_gun, hak_edilen_gun },
    { onConflict: 'yil,sicil_no' }
  )

  if (error) return { hata: error.message }
  revalidatePath('/izin/haklar')
  return {}
}

// ─── Toplu Yıl Hakları Oluştur ───────────────────────────────────────────────
// Seçili yıl için henüz kaydı olmayan aktif personele otomatik hak tanımlar.
// Hak miktarı: tanim_izin_hak tablosundaki statü + kıdem yılı (en_az, en_cok) formülüne göre
// Devreden gün: bir önceki yılın kalan_gun değeri (negatif ise 0)

type HakKural = { statu: string; en_az: number | null; en_cok: number | null; hak_edilen_gun: number; sira_no: number | null }

/** Kıdem yılına göre uygun hak kuralını bul: statu eşleşmeli, kidem in [en_az, en_cok]
 * 0-1 yıl (en_az=0, en_cok=0 veya 1) dahil tüm aralıklar eşleşir.
 * En dar aralığı tercih et; eşitse sira_no ile sırala. */
function hakKuralBul(kurallar: HakKural[], statu: string, kidemYili: number): number {
  const aday = kurallar.filter(k => {
    if (k.statu !== statu) return false
    if (k.en_az != null && kidemYili < k.en_az) return false
    if (k.en_cok != null && kidemYili > k.en_cok) return false
    return true
  })
  if (aday.length === 0) return 0
  // En dar aralığı tercih et; eşitse sira_no (tanım sırası) ile
  aday.sort((a, b) => {
    const aralikA = (a.en_cok ?? 999) - (a.en_az ?? 0)
    const aralikB = (b.en_cok ?? 999) - (b.en_az ?? 0)
    if (aralikA !== aralikB) return aralikA - aralikB
    return (a.sira_no ?? 999) - (b.sira_no ?? 999)
  })
  return aday[0].hak_edilen_gun ?? 0
}

export async function topluHakOlustur(
  yil: number
): Promise<{ hata?: string; olusturulan: number; guncellenen?: number }> {
  if (!yil || yil < 2000 || yil > 2100) return { hata: 'Geçersiz yıl.', olusturulan: 0 }

  const supabase = await createClient()

  // 1) Aktif personel + mevcut statüsü + kıdem fallback için tarihler
  const { data: personeller, error: pErr } = await supabase
    .from('personel_kadro_ozet')
    .select('sicil_no, statu, memuriyet_tarihi, kuruma_giris_tarihi')

  if (pErr || !personeller) return { hata: pErr?.message ?? 'Personel listesi alınamadı.', olusturulan: 0 }

  const personelMap = new Map((personeller ?? []).filter(p => p.sicil_no).map(p => [p.sicil_no!, p]))

  // 2) Bu yıl için mevcut kayıtlar (atlamak için)
  const { data: mevcutlar } = await supabase
    .from('izin_haklari')
    .select('id, sicil_no, hak_edilen_gun')
    .eq('yil', yil)

  const mevcutSiciller = new Set((mevcutlar ?? []).map(m => m.sicil_no))

  // 3) İzin hak kuralları (statü + en_az, en_cok kıdem aralığı; 0-1 yıl dahil)
  const { data: hakKurallari } = await supabase
    .from('tanim_izin_hak')
    .select('statu, en_az, en_cok, hak_edilen_gun, sira_no, gecerlilik_suresi_yil')
    .eq('durum', true)
    .order('sira_no', { nullsFirst: false })

  const kurallar: HakKural[] = (hakKurallari ?? []).map(h => ({
    statu: h.statu ?? '',
    en_az: h.en_az != null ? Number(h.en_az) : null,
    en_cok: h.en_cok != null ? Number(h.en_cok) : null,
    hak_edilen_gun: h.hak_edilen_gun ?? 0,
    sira_no: h.sira_no != null ? Number(h.sira_no) : null,
  }))

  // 4) Personel kıdem yılları: terfi_hareketleri (en son kayıt) → yoksa memuriyet_tarihi/kuruma_giris_tarihi
  const siciller = [...new Set((personeller ?? []).map(p => p.sicil_no).filter(Boolean))] as string[]
  const kidemMap: Record<string, number> = {}
  const refTarih = new Date(yil, 11, 31) // 31 Aralık hedef yıl

  function tarihtenKidemYil(tarihStr: string | null | undefined): number {
    if (!tarihStr) return 0
    const d = new Date(tarihStr)
    if (isNaN(d.getTime())) return 0
    const yilFark = refTarih.getFullYear() - d.getFullYear()
    const ayFark = refTarih.getMonth() - d.getMonth()
    const gunFark = refTarih.getDate() - d.getDate()
    let yil = yilFark
    if (ayFark < 0 || (ayFark === 0 && gunFark < 0)) yil--
    return Math.max(0, yil)
  }

  if (siciller.length > 0) {
    const { data: terfiRaw } = await supabase
      .from('terfi_hareketleri')
      .select('sicil_no, kidem_yili, kayit_zamani')
      .in('sicil_no', siciller)
      .order('kayit_zamani', { ascending: false })
    const seen = new Set<string>()
    for (const t of terfiRaw ?? []) {
      if (!t.sicil_no || seen.has(t.sicil_no)) continue
      seen.add(t.sicil_no)
      const kidem = parseInt(String(t.kidem_yili ?? '0'), 10)
      kidemMap[t.sicil_no] = isNaN(kidem) ? 0 : kidem
    }
  }

  // Terfi kaydı yoksa memuriyet_tarihi veya kuruma_giris_tarihi ile hesapla
  for (const p of personeller ?? []) {
    if (!p.sicil_no || kidemMap[p.sicil_no] !== undefined) continue
    const kidem = tarihtenKidemYil(p.memuriyet_tarihi ?? p.kuruma_giris_tarihi)
    kidemMap[p.sicil_no] = kidem
  }

  // 5) Önceki yılın kalan günleri
  const { data: oncekiYilHaklar } = await supabase
    .from('izin_haklari')
    .select('sicil_no, kalan_gun')
    .eq('yil', yil - 1)

  const devrMap: Record<string, number> = {}
  ;(oncekiYilHaklar ?? []).forEach(h => {
    if (h.sicil_no) devrMap[h.sicil_no] = Math.max(0, h.kalan_gun ?? 0)
  })

  // 6) Toplu insert için kayıtları hazırla (formüle göre hak_edilen_gun)
  const eklenecekler = personeller
    .filter(p => p.sicil_no && !mevcutSiciller.has(p.sicil_no))
    .map(p => {
      const kidem = kidemMap[p.sicil_no!] ?? 0
      const hak = hakKuralBul(kurallar, p.statu ?? '', kidem)
      return {
        yil,
        sicil_no: p.sicil_no!,
        devreden_gun: devrMap[p.sicil_no!] ?? 0,
        hak_edilen_gun: hak,
      }
    })

  let olusturulan = 0
  if (eklenecekler.length > 0) {
    const { error: insErr } = await supabase.from('izin_haklari').insert(eklenecekler)
    if (insErr) return { hata: insErr.message, olusturulan: 0 }
    olusturulan = eklenecekler.length
  }

  // 7) Mevcut kayıtları formüle göre yeniden hesapla (yanlış 30 olanlar dahil)
  const guncellenecekler = (mevcutlar ?? []).filter(m => m.sicil_no).map(kayit => {
    const p = personelMap.get(kayit.sicil_no ?? '')
    if (!p?.sicil_no) return null
    const kidem = kidemMap[kayit.sicil_no!] ?? 0
    const yeniHak = hakKuralBul(kurallar, p.statu ?? '', kidem)
    return { id: kayit.id, yeniHak }
  }).filter((x): x is { id: number; yeniHak: number } => x != null)

  let guncellenen = 0
  for (const { id, yeniHak } of guncellenecekler) {
    const { error: updErr } = await supabase
      .from('izin_haklari')
      .update({ hak_edilen_gun: yeniHak, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (!updErr) guncellenen++
  }

  if (olusturulan === 0 && guncellenen === 0) return { olusturulan: 0 }

  revalidatePath('/izin/haklar')
  return { olusturulan, guncellenen }
}
