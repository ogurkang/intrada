'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { revalidatePersonelDetayPaths } from '@/lib/revalidate-personel'
import {
  gunBasitHesapla,
  gunYillikIzinHesapla,
  gunHakAzalir,
  zabitaUnvaniMi,
  type IzinGunSonuc,
} from '@/lib/izin-gun'
import { writePersonelAuditLogSafe } from '@/lib/personel-audit'

type Durum = 'Taslak' | 'Onaylandı' | 'Değiştirildi' | 'İptal Edildi'

const HAKTAN_DUSEN_DURUMLAR: Durum[] = ['Onaylandı', 'Değiştirildi']
/** tanim_izin_tur.izin_hakki_kullanimi bu değerlerden biri ise izin hakkından düşer */
const HAKTAN_DUSEN_HAKKI_KULLANIMI = ['Evet', 'Yıllık İzin']

/** Belirtilen (sicil_no, yil) için izin_hareketleri'ndeki Onaylandı/Değiştirildi günlerini topla ve izin_haklari.kullanilan_gun güncelle.
 * Sadece izin_hakki_kullanımı=Evet (veya Yıllık İzin) olan izin türleri izin hakkından düşer. */
async function izinHaklariKullanilanGuncelle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sicil_no: string,
  yil: number
): Promise<void> {
  const { data: hakKullananTurler } = await supabase
    .from('tanim_izin_tur')
    .select('tur_adi')
    .in('izin_hakki_kullanimi', HAKTAN_DUSEN_HAKKI_KULLANIMI)
  const hakKullananTurSet = new Set((hakKullananTurler ?? []).map(t => t.tur_adi))

  const { data: hareketler } = await supabase
    .from('izin_hareketleri')
    .select('tur, gun')
    .eq('sicil_no', sicil_no)
    .eq('yil', yil)
    .in('durum', HAKTAN_DUSEN_DURUMLAR)
  const kullanilan = (hareketler ?? []).reduce((s, h) => {
    if (hakKullananTurSet.has(h.tur ?? '')) return s + (h.gun ?? 0)
    return s
  }, 0)
  await supabase
    .from('izin_haklari')
    // kalan_gun veritabanında hesaplanan / sadece DEFAULT ile güncellenebilen bir alan;
    // burada yalnızca kullanilan_gun'u güncelliyoruz.
    .update({ kullanilan_gun: kullanilan, updated_at: new Date().toISOString() })
    .eq('sicil_no', sicil_no)
    .eq('yil', yil)
}

function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? '').trim()
  return v || null
}

/** Süper yönetici için varsayılan görünen kullanıcı adı (profilde özel ad yoksa). */
const SUPER_ADMIN_ISLEM_ETIKETI = 'IKEM'

/** Oturum açan kullanıcının izin ekranında gösterilecek işlem etiketi (kullanıcı adı veya ad soyad). */
async function getIslemYapanEtiketi(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: prof } = await supabase
    .from('app_profiles')
    .select('kullanici_adi, sicil_no, rol')
    .eq('id', user.id)
    .maybeSingle()
  if (prof?.kullanici_adi?.trim()) return prof.kullanici_adi.trim()
  if (prof?.rol === 'admin') return SUPER_ADMIN_ISLEM_ETIKETI
  if (prof?.sicil_no) {
    const { data: c } = await supabase.from('calisan').select('ad_soyad').eq('sicil_no', prof.sicil_no).maybeSingle()
    if (c?.ad_soyad?.trim()) return c.ad_soyad.trim()
  }
  const mail = user.email?.split('@')[0]
  return mail || null
}

/** Yıl içinde bir sonraki sıra numarasını üretir: "001", "002" ... */
async function siradakiSiraNo(supabase: Awaited<ReturnType<typeof createClient>>, yil: number): Promise<string> {
  const { data } = await supabase
    .from('izin_hareketleri')
    .select('sira_no')
    .eq('yil', yil)
    .not('sira_no', 'is', null)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle()

  const son = data?.sira_no ? parseInt(data.sira_no, 10) : 0
  return String(son + 1).padStart(3, '0')
}

export async function izinEkle(formData: FormData): Promise<{ hata?: string }> {
  const sicil_no = String(formData.get('sicil_no') ?? '').trim()
  const tur      = String(formData.get('tur')      ?? '').trim()
  const ayrilis  = str(formData, 'ayrilis')
  const baslama  = str(formData, 'baslama')
  let gun        = parseInt(String(formData.get('gun') ?? '0'), 10)
  const yil      = parseInt(String(formData.get('yil') ?? new Date().getFullYear()), 10)

  if (!sicil_no) return { hata: 'Personel seçimi zorunludur.' }
  if (!tur)      return { hata: 'İzin türü seçimi zorunludur.' }
  if (!ayrilis)  return { hata: 'Ayrılış tarihi zorunludur.' }
  if (!baslama)  return { hata: 'Başlama tarihi zorunludur.' }
  if (baslama <= ayrilis) return { hata: 'Başlama tarihi ayrılış tarihinden sonra olmalıdır.' }

  let ayrilisKayit = ayrilis
  const isYillikIzin = tur === 'Yıllık İzin' || tur.includes('Yıllık')
  if (isYillikIzin) {
    const hesap = await izinGunHesapla(sicil_no, tur, ayrilis, baslama)
    gun = hesap.gun
    if (hesap.ayrilisGuncel) ayrilisKayit = hesap.ayrilisGuncel
  }
  if (gun <= 0) return { hata: 'Gün sayısı 0\'dan büyük olmalıdır.' }

  const supabase = await createClient()

  // Çalışan kontrolü
  const { data: calisan } = await supabase
    .from('calisan').select('sicil_no').eq('sicil_no', sicil_no).maybeSingle()
  if (!calisan) return { hata: `"${sicil_no}" sicil numaralı personel bulunamadı.` }

  const sira_no = await siradakiSiraNo(supabase, yil)

  let bilgiStr = str(formData, 'bilgi')
  if (isYillikIzin && !bilgiStr) {
    const hesap = await izinGunHesapla(sicil_no, tur, ayrilis, baslama)
    if (hesap.bilgiler && hesap.bilgiler.length) {
      bilgiStr = hesap.bilgiler.join('\n')
    }
  }

  const islemEtiketi = await getIslemYapanEtiketi()

  const { data: inserted, error } = await supabase.from('izin_hareketleri').insert({
    yil,
    sira_no,
    sicil_no,
    tur,
    ayrilis: ayrilisKayit,
    baslama,
    gun,
    vekalet:   str(formData, 'vekalet'),
    aciklama:  str(formData, 'aciklama'),
    bilgi:     bilgiStr,
    durum:     'Taslak' as Durum,
    kayit_tarihi: new Date().toISOString(),
    islem_yapan: islemEtiketi,
  }).select('id, public_id').single()

  if (error) return { hata: error.message }
  await writePersonelAuditLogSafe(supabase, {
    sicil_no,
    modul: 'izin',
    islem: 'Ekle',
    ozet: `${tur} izni eklendi (${gun} gün, ${yil}/${sira_no}).`,
    ref_table: 'izin_hareketleri',
    ref_id: String(inserted?.id ?? ''),
    sonraki: {
      yil,
      sira_no,
      tur,
      ayrilis: ayrilisKayit,
      baslama,
      gun,
      durum: 'Taslak',
    },
  })
  revalidatePath('/izin')
  revalidatePath('/izin/haklar')
  if (inserted?.public_id) revalidatePath(`/link/${inserted.public_id}`)
  return {}
}

export async function izinGuncelle(id: number, formData: FormData): Promise<{ hata?: string }> {
  const tur     = String(formData.get('tur')     ?? '').trim()
  const ayrilis = str(formData, 'ayrilis')
  const baslama = str(formData, 'baslama')
  let gun       = parseInt(String(formData.get('gun') ?? '0'), 10)
  const durumVal = String(formData.get('durum') ?? '').trim() as Durum

  if (!tur)     return { hata: 'İzin türü seçimi zorunludur.' }
  if (!ayrilis) return { hata: 'Ayrılış tarihi zorunludur.' }
  if (!baslama) return { hata: 'Başlama tarihi zorunludur.' }

  const supabase = await createClient()
  const { data: mevcut } = await supabase
    .from('izin_hareketleri')
    .select('id, sicil_no, yil, public_id, tur, ayrilis, baslama, gun, vekalet, aciklama, durum, bilgi')
    .eq('id', id)
    .single()

  let ayrilisKayit = ayrilis
  const isYillikIzin = tur === 'Yıllık İzin' || tur.includes('Yıllık')
  if (isYillikIzin && mevcut?.sicil_no && ayrilis && baslama) {
    const hesap = await izinGunHesapla(mevcut.sicil_no, tur, ayrilis, baslama, mevcut.id)
    gun = hesap.gun
    if (hesap.ayrilisGuncel) ayrilisKayit = hesap.ayrilisGuncel
  }
  if (gun <= 0) return { hata: 'Gün sayısı 0\'dan büyük olmalıdır.' }

  const yeniDurum = (durumVal || 'Değiştirildi') as Durum
  const vekaletStr = str(formData, 'vekalet')
  const aciklamaStr = str(formData, 'aciklama')

  if (mevcut?.durum === 'Onaylandı') {
    const eskiAyrilis = mevcut.ayrilis ?? ''
    const eskiBaslama = mevcut.baslama ?? ''
    const eskiVekalet = (mevcut.vekalet ?? '').trim()
    const degisti =
      tur !== (mevcut.tur ?? '') ||
      (ayrilisKayit ?? '') !== eskiAyrilis ||
      baslama !== eskiBaslama ||
      gun !== (mevcut.gun ?? 0) ||
      (vekaletStr ?? '') !== eskiVekalet ||
      yeniDurum !== mevcut.durum
    if (degisti && !aciklamaStr) {
      return { hata: 'Onaylanmış izinde değişiklik için açıklama zorunludur.' }
    }
  }

  const islemEtiketi = await getIslemYapanEtiketi()

  const { data: updated, error } = await supabase.from('izin_hareketleri').update({
    tur,
    ayrilis: ayrilisKayit,
    baslama,
    gun,
    vekalet:     vekaletStr,
    aciklama:    aciklamaStr,
    bilgi:       str(formData, 'bilgi'),
    islem_yapan: islemEtiketi,
    durum:       yeniDurum,
  }).eq('id', id).select('public_id').single()

  if (error) return { hata: error.message }
  await writePersonelAuditLogSafe(supabase, {
    sicil_no: mevcut?.sicil_no ?? '',
    modul: 'izin',
    islem: 'Güncelle',
    ozet: `${tur} izni güncellendi (${gun} gün, durum: ${yeniDurum}).`,
    ref_table: 'izin_hareketleri',
    ref_id: String(id),
    onceki: {
      tur: mevcut?.tur,
      ayrilis: mevcut?.ayrilis,
      baslama: mevcut?.baslama,
      gun: mevcut?.gun,
      vekalet: mevcut?.vekalet,
      aciklama: mevcut?.aciklama,
      durum: mevcut?.durum,
      bilgi: mevcut?.bilgi,
    },
    sonraki: {
      tur,
      ayrilis: ayrilisKayit,
      baslama,
      gun,
      vekalet: vekaletStr,
      aciklama: aciklamaStr,
      durum: yeniDurum,
      bilgi: str(formData, 'bilgi'),
    },
  })
  const linkPid = updated?.public_id ?? mevcut?.public_id
  if (linkPid) revalidatePath(`/link/${linkPid}`)
  if (mevcut?.sicil_no && mevcut?.yil) {
    await izinHaklariKullanilanGuncelle(supabase, mevcut.sicil_no, mevcut.yil)
    // İlgili personelin detay ekranını da güncelle
    revalidatePath(`/personel/${mevcut.sicil_no}`)
  }
  revalidatePath('/izin')
  revalidatePath('/izin/haklar')
  return {}
}

export async function izinDurumDegistir(id: number, yeniDurum: Durum): Promise<{ hata?: string }> {
  const supabase = await createClient()
  const islemEtiketi = await getIslemYapanEtiketi()
  const { data: mevcut } = await supabase
    .from('izin_hareketleri')
    .select('sicil_no, yil, public_id, tur, durum')
    .eq('id', id)
    .single()
  const { error } = await supabase
    .from('izin_hareketleri')
    .update({ durum: yeniDurum, islem_yapan: islemEtiketi })
    .eq('id', id)

  if (error) return { hata: error.message }
  if (mevcut?.sicil_no) {
    await writePersonelAuditLogSafe(supabase, {
      sicil_no: mevcut.sicil_no,
      modul: 'izin',
      islem: 'Durum Değiştir',
      ozet: `${mevcut.tur ?? 'İzin'} durumu ${mevcut.durum ?? '—'} -> ${yeniDurum} olarak güncellendi.`,
      ref_table: 'izin_hareketleri',
      ref_id: String(id),
      onceki: { durum: mevcut.durum },
      sonraki: { durum: yeniDurum },
    })
  }
  if (mevcut?.public_id) revalidatePath(`/link/${mevcut.public_id}`)
  if (mevcut?.sicil_no && mevcut?.yil) {
    await izinHaklariKullanilanGuncelle(supabase, mevcut.sicil_no, mevcut.yil)
    // İlgili personelin detay ekranını da güncelle
    await revalidatePersonelDetayPaths(mevcut.sicil_no)
  }
  revalidatePath('/izin')
  revalidatePath('/izin/haklar')
  return {}
}

/** İzin günü hesapla: Yıllık İzin + Zabıta → takvim; Yıllık İzin + diğer → kural/tatil + devam; diğer türler → takvim. haricId: düzenlemede mevcut kaydı devam kontrolünden hariç tutar. */
export async function izinGunHesapla(
  sicil_no: string,
  tur: string,
  ayrilis: string,
  baslama: string,
  haricId?: number
): Promise<IzinGunSonuc> {
  if (!ayrilis || !baslama) return { gun: 0, bilgiler: [] }
  const baslangic = new Date(ayrilis)
  const bitis = new Date(baslama)
  if (isNaN(baslangic.getTime()) || isNaN(bitis.getTime()) || bitis.getTime() <= baslangic.getTime()) {
    return { gun: 0, bilgiler: [] }
  }

  const isYillikIzin = tur === 'Yıllık İzin' || (tur && tur.includes('Yıllık'))

  if (!isYillikIzin) {
    return gunBasitHesapla(ayrilis, baslama)
  }

  const supabase = await createClient()

  // Personelin görev unvanı (kadro_hareketleri'nden - asil veya vekil)
  let gorevUnvani: string | null = null
  const { data: khRows } = await supabase
    .from('kadro_hareketleri')
    .select('gorev_unvani, statu, asil, vekil')
    .or(`asil.eq.${sicil_no},vekil.eq.${sicil_no}`)
  const kh = (khRows ?? []).find(
    (r: { asil?: string | null; vekil?: string | null }) =>
      (r.asil ?? '').trim() === sicil_no || (r.vekil ?? '').trim() === sicil_no
  ) ?? (khRows ?? [])[0]
  if (kh) gorevUnvani = (kh as { gorev_unvani?: string }).gorev_unvani ?? null

  if (zabitaUnvaniMi(gorevUnvani)) {
    const sonuc = gunBasitHesapla(ayrilis, baslama)
    return { gun: sonuc.gun, bilgiler: ['Zabıta unvanı: takvim günü uygulanır.'] }
  }

  // Statü (kadro statüsü)
  const statu = (kh as { statu?: string })?.statu ?? ''
  const { data: kurallar } = await supabase
    .from('tanim_izin_kural')
    .select('statu, cumartesi, pazar, haftaici_tatil, tatil_haftasonu')
    .eq('durum', true)
  const kuralRow = (kurallar ?? []).find((r: { statu?: string }) => (r.statu ?? '').trim() === statu.trim())
  const kural = kuralRow
    ? {
        statu: (kuralRow as { statu?: string }).statu ?? '',
        cumartesi: (kuralRow as { cumartesi?: boolean }).cumartesi ?? null,
        pazar: (kuralRow as { pazar?: boolean }).pazar ?? null,
        haftaici_tatil: (kuralRow as { haftaici_tatil?: boolean }).haftaici_tatil ?? null,
        tatil_haftasonu: (kuralRow as { tatil_haftasonu?: boolean }).tatil_haftasonu ?? null,
      }
    : null

  const { ggAayyyyToIso } = await import('@/lib/tarih')
  const { data: tatiller } = await supabase
    .from('tanim_izin_tatil')
    .select('tatil_adi, tatil_baslangici, tatil_bitisi')
    .eq('durum', true)
  const tatilRanges = (tatiller ?? []).map((t: { tatil_adi?: string; tatil_baslangici?: string; tatil_bitisi?: string }) => {
    const bStr = (t.tatil_baslangici ?? '').trim()
    const eStr = (t.tatil_bitisi ?? '').trim()
    const bIso = bStr.includes('.') ? ggAayyyyToIso(bStr) : bStr
    const eIso = eStr.includes('.') ? ggAayyyyToIso(eStr) : eStr
    const b = new Date(bIso ?? bStr)
    const e = new Date(eIso ?? eStr)
    return {
      baslangic: b,
      bitis: e,
      tatilAdi: (t.tatil_adi ?? '').trim(),
    }
  }).filter((r: { baslangic: Date; bitis: Date }) => !isNaN(r.baslangic.getTime()) && !isNaN(r.bitis.getTime()))

  // Devam niteliğindeki izin: eski iznin başlama (işe dönüş) = yeni iznin ayrılış (izne çıkış)
  let ayrilisGuncel = ayrilis
  let devamBilgi = ''
  let oncekiSorgu = supabase
    .from('izin_hareketleri')
    .select('baslama')
    .eq('sicil_no', sicil_no)
    .in('durum', ['Taslak', ...HAKTAN_DUSEN_DURUMLAR])
    .or('tur.ilike.%Yıllık%')
    .order('baslama', { ascending: false })
  if (haricId != null) oncekiSorgu = oncekiSorgu.neq('id', haricId)
  const { data: oncekiIzinler } = await oncekiSorgu
  const ayrilisDate = new Date(ayrilis)
  const baslamaDate = new Date(baslama)
  if (!isNaN(ayrilisDate.getTime()) && !isNaN(baslamaDate.getTime()) && oncekiIzinler?.length) {
    // Önceki izin: baslama (işe dönüş) < mevcut baslama — eski iznin başlama = yeni iznin ayrılış
    const prevBaslamalar = (oncekiIzinler ?? [])
      .map((r: { baslama?: string | null }) => r.baslama ? new Date(r.baslama) : null)
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()) && d.getTime() < baslamaDate.getTime())
    const prevBaslama = prevBaslamalar.length
      ? prevBaslamalar.reduce((a, b) => (a.getTime() > b.getTime() ? a : b))
      : null
    if (prevBaslama) {
      const prevBaslamaNorm = new Date(prevBaslama.getFullYear(), prevBaslama.getMonth(), prevBaslama.getDate())
      const ayrilisNorm = new Date(ayrilisDate.getFullYear(), ayrilisDate.getMonth(), ayrilisDate.getDate())
      const gapIlkGun = new Date(prevBaslamaNorm.getTime())
      const gapSonGun = new Date(ayrilisNorm.getTime())
      gapSonGun.setDate(gapSonGun.getDate() - 1) // ayrılıştan 1 gün öncesi
      if (gapIlkGun.getTime() <= gapSonGun.getTime()) {
        let hepsiHakAzalir = true
        const walkCheck = new Date(gapIlkGun.getTime())
        while (walkCheck.getTime() <= gapSonGun.getTime()) {
          if (!gunHakAzalir(walkCheck, kural, tatilRanges)) {
            hepsiHakAzalir = false
            break
          }
          walkCheck.setDate(walkCheck.getDate() + 1)
        }
        if (hepsiHakAzalir) {
          ayrilisGuncel = prevBaslamaNorm.toISOString().slice(0, 10)
          devamBilgi = 'Devam niteliğindeki izin'
        }
      }
    }
  }

  const sonuc = gunYillikIzinHesapla(ayrilisGuncel, baslama, kural, tatilRanges)
  if (devamBilgi) {
    sonuc.bilgiler = [...(sonuc.bilgiler ?? []), devamBilgi]
    sonuc.ayrilisGuncel = ayrilisGuncel
  }
  return sonuc
}

/** Tüm izin_haklari kayıtları için kullanilan_gun değerini izin_hareketleri'nden hesapla (Taslak/İptal hariç).
 * Sadece izin_hakki_kullanımı=Evet (veya Yıllık İzin) olan izin türleri izin hakkından düşer. */
export async function izinHaklariKullanilanTopluGuncelle(): Promise<{ hata?: string; guncellenen?: number; toplam?: number }> {
  const supabase = await createClient()
  const { data: hakKullananTurler } = await supabase
    .from('tanim_izin_tur')
    .select('tur_adi')
    .in('izin_hakki_kullanimi', HAKTAN_DUSEN_HAKKI_KULLANIMI)
  const hakKullananTurSet = new Set((hakKullananTurler ?? []).map(t => t.tur_adi))

  const { data: haklar } = await supabase.from('izin_haklari').select('id, sicil_no, yil')
  const toplam = haklar?.length ?? 0
  if (!haklar?.length) return { guncellenen: 0, toplam: 0 }
  let guncellenen = 0
  for (const h of haklar) {
    const { data: hareketler } = await supabase
      .from('izin_hareketleri')
      .select('tur, gun')
      .eq('sicil_no', h.sicil_no)
      .eq('yil', h.yil)
      .in('durum', HAKTAN_DUSEN_DURUMLAR)
    const kullanilan = (hareketler ?? []).reduce((s, x) => {
      if (hakKullananTurSet.has(x.tur ?? '')) return s + (x.gun ?? 0)
      return s
    }, 0)
    const { error } = await supabase
      .from('izin_haklari')
      .update({ kullanilan_gun: kullanilan, updated_at: new Date().toISOString() })
      .eq('id', h.id)
    if (error) {
      // İlk hatada döndür; hangi kayıt patlamış görmek için sicil + yıl bilgisini de iletelim
      return {
        hata: `Güncelleme hatası (sicil: ${h.sicil_no}, yıl: ${h.yil}): ${error.message}`,
        guncellenen,
        toplam,
      }
    }
    guncellenen++
  }
  revalidatePath('/izin')
  revalidatePath('/izin/haklar')
  return { guncellenen, toplam }
}

/** Devam niteliğindeki izin kayıtlarının ayrılış tarihini önceki izinin başlama tarihine günceller. */
export async function izinDevamAyrilisTopluGuncelle(): Promise<{ hata?: string; guncellenen: number }> {
  const supabase = await createClient()
  const { data: kayitlar } = await supabase
    .from('izin_hareketleri')
    .select('id, sicil_no, tur, ayrilis, baslama')
    .in('durum', HAKTAN_DUSEN_DURUMLAR)
    .or('tur.ilike.%Yıllık%')
  if (!kayitlar?.length) return { guncellenen: 0 }
  let guncellenen = 0
  for (const k of kayitlar) {
    if (!k.sicil_no || !k.ayrilis || !k.baslama) continue
    const hesap = await izinGunHesapla(k.sicil_no, k.tur ?? '', k.ayrilis, k.baslama, k.id)
    if (hesap.ayrilisGuncel && hesap.ayrilisGuncel !== k.ayrilis) {
      const { error } = await supabase
        .from('izin_hareketleri')
        .update({ ayrilis: hesap.ayrilisGuncel })
        .eq('id', k.id)
      if (!error) guncellenen++
    }
  }
  revalidatePath('/izin')
  return { guncellenen }
}
