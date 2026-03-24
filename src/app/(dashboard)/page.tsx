import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/dashboard/DashboardClient'
import KullaniciAnaSayfa from '@/components/dashboard/KullaniciAnaSayfa'
import { getAppAccess } from '@/lib/app-access'
import { izinDurumDegistir } from './izin/actions'
import type {
  KadroDoluluk, IzinIstatistik, BekleyenIzin,
  YaklaşanTatil, IzindekiPersonel,
} from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const access = await getAppAccess(supabase, user.id)
    if (access.mode === 'kullanici') {
      return (
        <KullaniciAnaSayfa
          sicilNo={access.sicilNo}
          menuIzinleri={access.menuIzinleri}
        />
      )
    }
  }

  const buYil    = new Date().getFullYear()
  const bugun    = new Date().toISOString().split('T')[0]

  const [
    { data: personelRaw },
    { data: kadroRaw },
    { data: izinYilRaw },
    { data: bekleyenRaw },
    { data: tatilRaw },
    { data: izindekiRaw },
  ] = await Promise.all([
    // 1) Aktif personel sayısı
    supabase.from('personel_kadro_ozet').select('sicil_no', { count: 'exact', head: false }),

    // 2) Kadro doluluk (ayrılmamış kayıtlar)
    supabase
      .from('kadro_hareketleri')
      .select('durumu')
      .is('ayrilis_tarihi', null),

    // 3) Bu yılın tüm izin hareketleri (durum dağılımı)
    supabase
      .from('izin_hareketleri')
      .select('durum')
      .eq('yil', buYil),

    // 4) Bekleyen (Taslak) izinler — en fazla 20
    supabase
      .from('izin_hareketleri')
      .select('id, sicil_no, tur, baslama, ayrilis, gun, kayit_tarihi')
      .eq('durum', 'Taslak')
      .order('kayit_tarihi', { ascending: true })
      .limit(20),

    // 5) Yaklaşan tatiller (bugün ve sonrası, en fazla 6)
    supabase
      .from('tanim_izin_tatil')
      .select('id, tatil_adi, tatil_turu, tatil_baslangici, tatil_bitisi')
      .gte('tatil_baslangici', bugun)
      .order('tatil_baslangici')
      .limit(6),

    // 6) Bugün izinde olanlar
    supabase
      .from('izin_hareketleri')
      .select('id, sicil_no, tur, ayrilis')
      .eq('durum', 'Onaylandı')
      .lte('baslama', bugun)
      .gte('ayrilis', bugun)
      .limit(10),
  ])

  // 7) Sadece panoda görünen siciller için çalışan adı / public_id (tüm tabloyu çekme — yavaşlık riski)
  const sicilSet = new Set<string>()
  ;(bekleyenRaw ?? []).forEach(iz => {
    if (iz.sicil_no) sicilSet.add(iz.sicil_no)
  })
  ;(izindekiRaw ?? []).forEach(i => {
    if (i.sicil_no) sicilSet.add(i.sicil_no)
  })
  const siciller = [...sicilSet]

  let calisanAdRaw: { sicil_no: string; public_id: string | null; ad_soyad: string | null }[] = []
  if (siciller.length > 0) {
    const { data } = await supabase
      .from('calisan')
      .select('sicil_no, public_id, ad_soyad')
      .in('sicil_no', siciller)
    calisanAdRaw = data ?? []
  }

  // Ad + canonical link (public_id) haritası
  const adMap: Record<string, string> = {}
  const publicIdMap: Record<string, string> = {}
  ;(calisanAdRaw ?? []).forEach(c => {
    if (c.sicil_no) {
      adMap[c.sicil_no] = c.ad_soyad ?? c.sicil_no
      if (c.public_id) publicIdMap[c.sicil_no] = c.public_id
    }
  })

  // Kadro doluluk
  const kadroDoluluk: KadroDoluluk = { dolu: 0, vekil: 0, bos: 0 }
  ;(kadroRaw ?? []).forEach(k => {
    if (k.durumu === 'Dolu')  kadroDoluluk.dolu++
    if (k.durumu === 'Vekil') kadroDoluluk.vekil++
    if (k.durumu === 'Boş')  kadroDoluluk.bos++
  })

  // İzin istatistik
  const izinIstatistik: IzinIstatistik = { taslak: 0, onaylandi: 0, iptal: 0, degistirildi: 0 }
  ;(izinYilRaw ?? []).forEach(i => {
    if (i.durum === 'Taslak')        izinIstatistik.taslak++
    if (i.durum === 'Onaylandı')     izinIstatistik.onaylandi++
    if (i.durum === 'İptal Edildi')  izinIstatistik.iptal++
    if (i.durum === 'Değiştirildi')  izinIstatistik.degistirildi++
  })

  // Bekleyen izinler
  const bekleyenIzinler: BekleyenIzin[] = (bekleyenRaw ?? []).map(iz => ({
    id:               iz.id,
    sicil_no:         iz.sicil_no ?? '',
    public_id:        publicIdMap[iz.sicil_no ?? ''],
    ad_soyad:         adMap[iz.sicil_no ?? ''] ?? iz.sicil_no ?? '',
    izin_turu:        iz.tur,
    baslangic:        iz.baslama,
    bitis:            iz.ayrilis,
    gun_sayisi:       iz.gun,
    olusturma_tarihi: iz.kayit_tarihi,
  }))

  // Yaklaşan tatiller
  const yaklaşanTatiller: YaklaşanTatil[] = (tatilRaw ?? []).map(t => ({
    id:               t.id,
    tatil_adi:        t.tatil_adi,
    tatil_turu:       t.tatil_turu,
    tatil_baslangici: t.tatil_baslangici,
    tatil_bitisi:     t.tatil_bitisi,
  }))

  // İzindekiler
  const izindekiler: IzindekiPersonel[] = (izindekiRaw ?? []).map(i => ({
    id:        i.id,
    sicil_no:  i.sicil_no ?? '',
    public_id: publicIdMap[i.sicil_no ?? ''],
    ad_soyad:  adMap[i.sicil_no ?? ''] ?? i.sicil_no ?? '',
    izin_turu: i.tur,
    bitis:     i.ayrilis,
  }))

  return (
    <DashboardClient
      aktifPersonelSayisi={personelRaw?.length ?? 0}
      kadroDoluluk={kadroDoluluk}
      izinIstatistik={izinIstatistik}
      bekleyenIzinler={bekleyenIzinler}
      yaklaşanTatiller={yaklaşanTatiller}
      izindekiler={izindekiler}
      buYil={buYil}
      onDurumDegistir={izinDurumDegistir}
    />
  )
}
