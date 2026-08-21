'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import type { AppAccess } from '@/lib/app-access'
import { hayaletProfilYetkisiVar, type HayaletProfilDurum } from '@/lib/hayalet-profil'
import { SidebarAmblem } from '@/components/branding/IntradaLogos'
import { menuModulAcik, sidebarGrupGoster, sidebarTerfiGoster } from '@/lib/menu-yetki'
import type { DenetimSidebarDonem, DenetimSidebarMenu } from '@/lib/denetim-menu'
import type { KysSidebarMenu } from '@/lib/kys-menu'
import { trNormalize } from '@/lib/turkce-search'

type MenuItem = {
  href: string
  label: string
  newTab?: boolean
  children?: MenuItem[]
}
type MenuGroup = { grup: string; icon: string; items: MenuItem[]; accordion?: boolean }

function childPathActive(pathname: string, href: string) {
  if (href === '/yetkilendirme' || href === '/kys') return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

/** Alt rota eşleşiyorsa üst (Çalışanlar) vurgusu kapalı (children varsa). */
function itemPathActive(pathname: string, item: MenuItem): boolean {
  if (item.children?.length) {
    if (item.children.some(c => itemOrSubtreeActive(pathname, c))) return false
  }
  // Denetim: Genel Bakış derin rotalarda yanlış vurgulanmasın
  if (item.href === '/denetim' || item.href === '/denetim/donemler' || item.href === '/kys') {
    return pathname === item.href
  }
  // Dönem özeti: yalnızca tam dönem kökü (alt menüler ayrı vurgulanır)
  if (/^\/denetim\/donemler\/\d+$/.test(item.href)) {
    return pathname === item.href
  }
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

function itemOrSubtreeActive(pathname: string, item: MenuItem): boolean {
  if (item.children?.length && item.children.some(c => itemOrSubtreeActive(pathname, c))) return true
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

function filterMenuItem(item: MenuItem, q: string): MenuItem | null {
  const trimmed = q.trim()
  if (!trimmed) return item
  const nq = trNormalize(trimmed)
  if (item.children?.length) {
    const parentMatch = trNormalize(item.label).includes(nq)
    if (parentMatch) return item
    const children = item.children
      .map(ch => filterMenuItem(ch, trimmed))
      .filter((ch): ch is MenuItem => ch != null)
    if (children.length) return { ...item, children }
    return null
  }
  return trNormalize(item.label).includes(nq) ? item : null
}

function filterMenuGroup(grup: MenuGroup, q: string): MenuGroup | null {
  const trimmed = q.trim()
  if (!trimmed) return grup
  const nq = trNormalize(trimmed)
  if (trNormalize(grup.grup).includes(nq)) return grup
  const items = grup.items
    .map(i => filterMenuItem(i, trimmed))
    .filter((i): i is MenuItem => i != null)
  return items.length ? { ...grup, items } : null
}

function collectAltAciklar(items: MenuItem[], pathname: string, into: Record<string, boolean>) {
  for (const i of items) {
    if (i.children?.length) {
      into[i.href] = itemOrSubtreeActive(pathname, i)
      collectAltAciklar(i.children, pathname, into)
    }
  }
}

function padClass(depth: number) {
  if (depth <= 0) return 'pl-12 pr-2'
  if (depth === 1) return 'pl-16 pr-2'
  return 'pl-20 pr-2'
}

function leafPadClass(depth: number) {
  if (depth <= 0) return 'pl-12 pr-4'
  if (depth === 1) return 'pl-16 pr-4'
  return 'pl-20 pr-4'
}

function toDenetimMenuItem(menu: DenetimSidebarMenu): MenuItem {
  return {
    href: menu.href,
    label: menu.label,
    children: menu.children?.map(toDenetimMenuItem),
  }
}

function toKysMenuItem(menu: KysSidebarMenu): MenuItem {
  return {
    href: menu.href,
    label: menu.label,
    children: menu.children?.map(toKysMenuItem),
  }
}

function renderMenuTree(
  items: MenuItem[],
  opts: {
    pathname: string
    altAciklar: Record<string, boolean>
    toggleAlt: (href: string) => void
    onNavigate?: () => void
    depth: number
  },
) {
  const { pathname, altAciklar, toggleAlt, onNavigate, depth } = opts
  return items.map(item => {
    const aktif = itemPathActive(pathname, item)
    if (item.children?.length) {
      const altAcik = !!altAciklar[item.href]
      const altAktif = itemOrSubtreeActive(pathname, item)
      return (
        <div key={item.href}>
          <div className="flex min-w-0 items-stretch">
            <Link
              href={item.href}
              onClick={onNavigate}
              className={`flex min-w-0 flex-1 items-center gap-2 py-2 text-sm transition-colors ${padClass(depth)} ${
                aktif || altAktif
                  ? 'bg-slate-700 font-medium text-white'
                  : depth > 0
                    ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <span className={`${depth > 0 ? 'h-1 w-1' : 'h-1.5 w-1.5'} shrink-0 rounded-full bg-current opacity-60`} />
              <span className="truncate">{item.label}</span>
            </Link>
            <button
              type="button"
              onClick={() => toggleAlt(item.href)}
              aria-expanded={altAcik}
              aria-label={`${item.label} alt menüsünü aç veya kapat`}
              className={`shrink-0 border-l border-slate-700/80 px-2 py-2 text-sm transition-colors ${
                altAktif
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-200 ${altAcik ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          {altAcik ? renderMenuTree(item.children, { ...opts, depth: depth + 1 }) : null}
        </div>
      )
    }
    const chAktif = childPathActive(pathname, item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        target={item.newTab ? '_blank' : undefined}
        rel={item.newTab ? 'noopener noreferrer' : undefined}
        onClick={onNavigate}
        className={`flex items-center gap-2 py-1.5 text-sm transition-colors ${leafPadClass(depth)} ${
          chAktif
            ? 'bg-slate-700/80 font-medium text-white'
            : depth > 0
              ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-200'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
        }`}
      >
        <span className={`${depth > 0 ? 'h-1 w-1' : 'h-1.5 w-1.5'} rounded-full bg-current opacity-50`} />
        <span className="truncate">{item.label}</span>
      </Link>
    )
  })
}

function buildDenetimItems(agac: DenetimSidebarDonem[]): MenuItem[] {
  return [
    { href: '/denetim', label: 'Genel Bakış' },
    ...agac.map(d => ({
      href: `/denetim/donemler/${d.id}`,
      label: d.donem_adi,
      children: d.menus.map(toDenetimMenuItem),
    })),
  ]
}

function buildKysItems(agac: KysSidebarMenu[]): MenuItem[] {
  return [
    { href: '/kys', label: 'Genel Bakış' },
    ...agac.map(toKysMenuItem),
  ]
}

function buildMenuGroups(
  terfiMenuHref: string,
  calisanlarHref: string,
  denetimAgac: DenetimSidebarDonem[],
  kysAgac: KysSidebarMenu[],
  tasinirGorevlendirmeMenuAcik = false,
): MenuGroup[] {
  const calisanlarItem: MenuItem =
    calisanlarHref === '/personel'
      ? tasinirGorevlendirmeMenuAcik
        ? {
            href: '/personel',
            label: 'Çalışanlar',
            children: [
              { href: '/personel', label: 'Personel Listesi' },
              { href: '/personel/tasinir-gorevlendirme', label: 'Taşınır Görevlendirme' },
            ],
          }
        : { href: '/personel', label: 'Çalışanlar' }
      : { href: calisanlarHref, label: 'Personel Kartım' }

  const denetimItems = buildDenetimItems(denetimAgac)
  const kysItems = buildKysItems(kysAgac)

  return [
  {
    grup: 'Personel Yönetimi',
    icon: '👤',
    accordion: true,
    items: [
      calisanlarItem,
      { href: '/personel/ayrilanlar', label: 'Ayrılanlar'          },
      { href: '/firma-calisanlar',    label: 'ADABEL Personeli'      },
      { href: '/personel-hareketleri', label: 'Personel Hareketleri'},
      { href: terfiMenuHref,          label: 'Terfi Hareketleri'   },
      { href: '/kadro',               label: 'Kadro Hareketleri'   },
    ],
  },
  {
    grup: 'Rapor Yönetimi',
    icon: '📊',
    accordion: true,
    items: [
      { href: '/rapor', label: 'Genel Bakış' },
      { href: '/rapor/izin-hareketleri', label: 'İzin Hareketleri Raporu' },
      { href: '/rapor/memur-izinleri', label: 'Memur İzinleri Raporu' },
      { href: '/rapor/isci-izinleri', label: 'İşçi İzinleri Raporu' },
      { href: '/rapor/statuye-gore-cinsiyet', label: 'Statüye Göre Cinsiyet Raporu' },
      { href: '/rapor/statuye-gore-sayi', label: 'Statüye Göre Sayı Durumu Raporu' },
      { href: '/rapor/statuye-gore-yas', label: 'Statüye Göre Yaş Raporu' },
      { href: '/rapor/statuye-gore-hizmet', label: 'Statüye Göre Hizmet Raporu' },
      { href: '/rapor/konuma-gore-cinsiyet', label: 'Konuma Göre Cinsiyet Raporu' },
      { href: '/rapor/yerleske-adresine-gore-personel-sayi', label: 'Yerleşke Adresine Göre Personel Sayısı' },
      { href: '/rapor/sendika-bilgilerine-gore-personel-liste', label: 'Sendika Bilgilerine Göre Personel Listesi' },
      { href: '/rapor/sendika-bilgilerine-gore-personel-sayi', label: 'Sendika Bilgilerine Göre Personel Sayısı' },
      { href: '/rapor/statuye-gore-ogrenim', label: 'Statüye Göre Öğrenim Durumu Raporu' },
      { href: '/rapor/statuye-gore-meslek', label: 'Statüye Göre Meslek Raporu' },
      { href: '/rapor/meslek-sahibi-liste', label: 'Meslek Sahibi Personel Listesi' },
      { href: '/rapor/gorev-yerine-gore-liste', label: 'Görev Yerine Göre Personel Listesi' },
      { href: '/rapor/gorev-yerine-gore-iletisim-bilgileri', label: 'Görev Yerine Göre İletişim Bilgileri' },
      { href: '/rapor/mudurluge-gore-personel-liste', label: 'Müdürlüğe Göre Personel Listesi' },
      { href: '/rapor/tehlike-siniflarina-gore-mudurluk', label: 'Tehlike Sınıflarına Göre Müdürlük Raporu' },
      { href: '/rapor/tehlikeli-sinif-mudurluk-listesi', label: 'Tehlike Sınıfına Göre Müdürlük Listesi' },
      { href: '/rapor/tehlikeli-sinif-personel-listesi', label: 'Tehlike Sınıfına Göre Personel Listesi' },
      { href: '/rapor/kan-grubuna-gore-personel-liste', label: 'Kan Grubuna Göre Personel Listesi' },
      { href: '/rapor/dogum-gunune-gore-personel-liste', label: 'Doğum Gününe Göre Personel Listesi' },
      { href: '/rapor/belediye-geneli-personel-liste', label: 'Belediye Geneli Personel Listesi' },
      { href: '/rapor/adabel-personel-bilgileri-liste', label: 'ADABEL Personel Bilgileri Listesi' },
      { href: '/rapor/yonetici-iletisim-bilgileri-liste', label: 'Yönetici İletişim Bilgileri Listesi' },
      { href: '/rapor/yonetici-ogrenim-durum-liste', label: 'Yönetici Öğrenim Durum Listesi' },
      { href: '/rapor/ogrenim-durumuna-gore-personel-liste', label: 'Öğrenim Durumuna Göre Personel Listesi' },
      { href: '/rapor/ogrenim-durumuna-gore-iletisim-bilgileri-liste', label: 'Öğrenim Durumuna Göre İletişim Bilgileri Listesi' },
      { href: '/rapor/izin-limitine-takilan-personel-liste', label: 'İzin Limitine Takılan Personel Listesi' },
      { href: '/rapor/personele-gore-kullanilan-izin-listesi', label: 'Personele Göre Kullanılan İzin Listesi' },
      { href: '/rapor/adrese-gore-personel-liste', label: 'Adrese Göre Personel Listesi' },
      { href: '/rapor/belirli-gunde-izinli-personel', label: 'Belirli Günde İzinli Olan Personel Listesi' },
      { href: '/rapor/maas-oncesi-izinli-mudurler', label: 'Maaş Öncesi İzinli Müdürler Raporu' },
      { href: '/rapor/gorev-turune-gore-calisan', label: 'Görev Türüne Göre Çalışan Bilgisi' },
    ],
  },
  {
    grup: 'İzin Yönetimi',
    icon: '📅',
    accordion: true,
    items: [
      { href: '/izin',        label: 'İzin Hareketleri' },
      { href: '/izin/haklar', label: 'İzin Hakları'      },
      { href: '/izin/gecmis-izinler', label: 'Geçmiş İzinler' },
    ],
  },
  {
    grup: 'Bildirim Yönetimi',
    icon: '📋',
    accordion: true,
    items: [
      { href: '/bildirim',         label: 'Genel Bakış'      },
      { href: '/bildirim/ogrenim', label: 'Öğrenim Bildirimi'},
      { href: '/bildirim/sendika', label: 'Sendika Bildirimi'},
      { href: '/bildirim/aile',    label: 'Aile Bildirimi'   },
      { href: '/bildirim/mal',     label: 'Mal Bildirimi'    },
      { href: '/bildirim/pasaport',label: 'Pasaport İşlemleri'},
      { href: '/bildirim/hizmet-birlestirme', label: 'Hizmet Birleştirme İşlemleri' },
      { href: '/bildirim/mehil-izni', label: 'Mehil İzni Bildirimi' },
      { href: '/bildirim/aylik-izin', label: 'Aylıksız İşlemleri' },
      { href: '/bildirim/yari-zamanli-calisma', label: 'Yarı Zamanlı Çalışma İşlemleri' },
      { href: '/bildirim/harcirah-talep', label: 'Harcırah Talep Bildirimi' },
      { href: '/bildirim/calisma-belgesi', label: 'Çalışma Belgesi İşlemleri' },
      { href: '/bildirim/bes-iptal', label: 'BES İptal İşlemleri' },
      { href: '/bildirim/sendika-istifa', label: 'Sendika İstifa İşlemleri' },
    ],
  },
  {
    grup: 'İletişim Yönetimi',
    icon: '💬',
    accordion: true,
    items: [
      { href: '/iletisim-yonetimi/sms-islemleri', label: 'SMS İşlemleri' },
      { href: '/iletisim-yonetimi/e-posta-islemleri', label: 'E-posta İşlemleri' },
      { href: '/iletisim-yonetimi/tanimlar', label: 'Tanımlar' },
      { href: '/iletisim-yonetimi/gecmis-gonderimler', label: 'Geçmiş Gönderimler' },
    ],
  },
  {
    grup: 'Kesintiler Yönetimi',
    icon: '✂️',
    accordion: true,
    items: [
      { href: '/kesintiler',             label: 'Genel Bakış'              },
      { href: '/kesintiler/yevmiye',     label: 'Yevmiye Puantajı'         },
      { href: '/kesintiler/arazi',       label: 'Arazi Puantajı'           },
      { href: '/kesintiler/ayy',          label: 'Aylık Yemek (AYY)'          },
      { href: '/kesintiler/zabita-havuz', label: 'Zabıta Havuzu'              },
      { href: '/kesintiler/sosyal-hak',  label: 'Sosyal Hak Kesintileri'    },
      { href: '/kesintiler/toplam-raporlu', label: 'Toplam Raporlu Zabıtalar' },
    ],
  },
  {
    grup: 'Eğitim Yönetimi',
    icon: '🎓',
    accordion: true,
    items: [
      { href: '/egitim',             label: 'Eğitim Takvimi'   },
      { href: '/egitim/istatistik',  label: 'Eğitim İstatistiği'},
    ],
  },
  {
    grup: 'Performans Yönetimi',
    icon: '⭐',
    accordion: true,
    items: [
      { href: '/performans',                 label: 'Genel Bakış'   },
      { href: '/performans/degerlendirme',   label: 'Değerlendirme' },
      { href: '/performans/raporlama',       label: 'Raporlama'     },
      { href: '/performans/tanimlar',        label: 'Tanımlar'      },
    ],
  },
  {
    grup: 'Yerel Bilgi Yönetimi',
    icon: '📍',
    accordion: true,
    items: [
      {
        href: '/yerel-bilgi/islemler',
        label: 'İşlemler',
        children: [
          { href: '/yerel-bilgi/islemler/belediye-kimlik-formu', label: 'Belediye Kimlik Formu' },
          { href: '/yerel-bilgi/islemler/arac-bilgileri', label: 'Araç Bilgileri Girişi' },
          { href: '/yerel-bilgi/islemler/butce-tahminleri', label: 'Bütçe Tahminleri Girişi' },
          { href: '/yerel-bilgi/islemler/butce-gerceklesmeleri', label: 'Bütçe Gerçekleşmeleri Girişi' },
        ],
      },
      {
        href: '/yerel-bilgi/raporlar',
        label: 'Raporlar',
        children: [
          { href: '/yerel-bilgi/raporlar/yerel-bilgi-yas-dagilimi', label: 'Yerel Bilgi İçin Yaş Raporu' },
          { href: '/yerel-bilgi/raporlar/arac-bilgileri', label: 'Araç Bilgileri Raporu' },
          { href: '/yerel-bilgi/raporlar/butce-tahminleri', label: 'Bütçe Tahminleri Raporu' },
          { href: '/yerel-bilgi/raporlar/butce-gerceklesmeleri', label: 'Bütçe Gerçekleşmeleri Raporu' },
          { href: '/yerel-bilgi/raporlar/kimlik-form-raporu', label: 'Kimlik Form Raporu' },
        ],
      },
      {
        href: '/yerel-bilgi/tanimlar',
        label: 'Tanımlar',
        children: [
          { href: '/yerel-bilgi/tanimlar/arac-sahiplik-durum', label: 'Araç Sahiplik Durumu Tanımı' },
          { href: '/yerel-bilgi/tanimlar/arac-durum', label: 'Araç Durum Tanımı' },
          { href: '/yerel-bilgi/tanimlar/arac-turu', label: 'Araç Türü — Alt Tür Tanımı' },
          { href: '/yerel-bilgi/tanimlar/butce-gider', label: 'Bütçe Gider Tanımı' },
          { href: '/yerel-bilgi/tanimlar/butce-gelir', label: 'Bütçe Gelir Tanımı' },
        ],
      },
    ],
  },
  {
    grup: 'İSG Yönetimi',
    icon: '🦺',
    accordion: true,
    items: [
      { href: '/isg/islemler', label: 'İşlemler' },
      { href: '/isg/raporlar', label: 'Raporlar' },
      { href: '/isg/tanimlar', label: 'Tanımlar' },
    ],
  },
  {
    grup: 'Denetim Yönetimi',
    icon: '📑',
    accordion: true,
    items: denetimItems,
  },
  {
    grup: 'KYS Yönetimi',
    icon: '📘',
    accordion: true,
    items: kysItems,
  },
  {
    grup: 'Stratejik Yönetim',
    icon: '🎯',
    accordion: true,
    items: [
      {
        href: '/stratejik-yonetim/stratejik-plan',
        label: 'Stratejik Plan',
        children: [
          { href: '/stratejik-yonetim/stratejik-plan/islemler', label: 'İşlemler' },
          { href: '/stratejik-yonetim/stratejik-plan/raporlar', label: 'Raporlar' },
          { href: '/stratejik-yonetim/stratejik-plan/tanimlar', label: 'Tanımlar' },
        ],
      },
      {
        href: '/stratejik-yonetim/performans-programi',
        label: 'Performans Programı',
        children: [
          { href: '/stratejik-yonetim/performans-programi/islemler', label: 'İşlemler' },
          { href: '/stratejik-yonetim/performans-programi/raporlar', label: 'Raporlar' },
          { href: '/stratejik-yonetim/performans-programi/tanimlar', label: 'Tanımlar' },
        ],
      },
      {
        href: '/stratejik-yonetim/faaliyet-raporu',
        label: 'Faaliyet Raporu',
        children: [
          { href: '/stratejik-yonetim/faaliyet-raporu/islemler', label: 'İşlemler' },
          { href: '/stratejik-yonetim/faaliyet-raporu/raporlar', label: 'Raporlar' },
          { href: '/stratejik-yonetim/faaliyet-raporu/tanimlar', label: 'Tanımlar' },
        ],
      },
    ],
  },
  {
    grup: 'Tanımlar Yönetimi',
    icon: '⚙️',
    accordion: true,
    items: [
      { href: '/tanimlar/ogrenim',    label: 'Öğrenim'       },
      { href: '/tanimlar/kazanc-bilgi', label: 'Kazanç Bilgileri' },
      { href: '/tanimlar/unvan',      label: 'Unvan'         },
      { href: '/tanimlar/mudurluk',   label: 'Müdürlük'      },
      { href: '/tanimlar/yerleske-adresi', label: 'Yerleşke Adresleri' },
      { href: '/tanimlar/sendika-bilgileri', label: 'Sendika Bilgileri' },
      { href: '/tanimlar/adres', label: 'Adres' },
      { href: '/tanimlar/statu',      label: 'Statü'         },
      { href: '/tanimlar/hareket-tanimlari', label: 'Hareket Tanımları' },
      { href: '/tanimlar/izin-turu',  label: 'İzin Türleri'  },
      { href: '/tanimlar/izin-hak',   label: 'İzin Tanımları' },
      { href: '/tanimlar/tatil',      label: 'Tatiller'      },
      { href: '/tanimlar/tatil-tur-tanimlari', label: 'Tatil Tür Tanımları' },
      { href: '/tanimlar/izin-kural', label: 'Yıllık İzin Kuralları' },
      { href: '/tanimlar/gosterge',  label: 'Gösterge Tanımları' },
      { href: '/tanimlar/sirket',    label: 'Şirket'             },
      { href: '/tanimlar/organizasyon', label: 'Organizasyon'    },
    ],
  },
  {
    grup: 'Yetkilendirme Yönetimi',
    icon: '🔐',
    accordion: true,
    items: [
      { href: '/yetkilendirme', label: 'Çalışan Yetkilendirme' },
      { href: '/yetkilendirme/dis-denetciler', label: 'Dış Denetçiler' },
    ],
  },
  ]
}

interface SidebarProps {
  onNavigate?: () => void
  /** Dashboard layout’tan (sunucu) gelir. */
  terfiMenuHref?: string
  access: AppAccess
  hayaletDurum?: HayaletProfilDurum | null
  denetimAgac?: DenetimSidebarDonem[]
  kysAgac?: KysSidebarMenu[]
  /** Geçici: Taşınır Görevlendirme alt menüsü */
  tasinirGorevlendirmeMenuAcik?: boolean
  /** Amir/hayalet: güncel dönem; admin: dönem listesi */
  performansDegerlendirmeHref?: string
}

function accessSidebarMode(access: AppAccess): 'full' | 'admin' | 'kullanici' | 'dis_denetci' {
  if (access.mode === 'full' || access.mode === 'admin') return access.mode
  if (access.mode === 'dis_denetci') return 'dis_denetci'
  if (access.mode === 'blocked') return 'kullanici'
  return 'kullanici'
}

export default function Sidebar({
  onNavigate,
  terfiMenuHref = '/terfi',
  access,
  hayaletDurum,
  denetimAgac = [],
  kysAgac = [],
  tasinirGorevlendirmeMenuAcik = false,
  performansDegerlendirmeHref = '/performans/degerlendirme',
}: SidebarProps) {
  const pathname = usePathname()

  const calisanlarHref = useMemo(() => {
    if (hayaletDurum?.aktif) return performansDegerlendirmeHref
    if (access.mode === 'kullanici') {
      const sn = access.sicilNo.trim()
      if (sn) return `/personel/${encodeURIComponent(sn)}`
    }
    return '/personel'
  }, [access, hayaletDurum, performansDegerlendirmeHref])

  const menuGroups = useMemo(
    () => buildMenuGroups(terfiMenuHref, calisanlarHref, denetimAgac, kysAgac, tasinirGorevlendirmeMenuAcik),
    [terfiMenuHref, calisanlarHref, denetimAgac, kysAgac, tasinirGorevlendirmeMenuAcik],
  )

  const menuIzinleri = access.mode === 'kullanici' ? access.menuIzinleri : {}
  const mode = accessSidebarMode(access)

  const filteredGroups = useMemo(() => {
    if (hayaletDurum?.aktif) {
      return [
        {
          grup: 'Performans Yönetimi',
          icon: '⭐',
          accordion: true,
          items: [
            { href: performansDegerlendirmeHref, label: 'Değerlendirme' },
            { href: '/performans/raporlama', label: 'Raporlama' },
          ],
        },
      ] satisfies MenuGroup[]
    }

    const mapped = menuGroups
      .map(g => {
        if (!sidebarGrupGoster(g.grup, mode, menuIzinleri)) return null
        if (g.grup === 'Yetkilendirme Yönetimi' && hayaletProfilYetkisiVar(access)) {
          const items = [...g.items, { href: '/yetkilendirme/hayalet-profil', label: 'Hayalet Profil' }]
          if (mode === 'kullanici') {
            return { ...g, items: items.filter(i => i.href === '/yetkilendirme/hayalet-profil') }
          }
          return { ...g, items }
        }
        if (g.grup === 'Performans Yönetimi' && performansDegerlendirmeHref !== '/performans/degerlendirme') {
          return {
            ...g,
            items: g.items.map(i =>
              i.href === '/performans/degerlendirme'
                ? { ...i, href: performansDegerlendirmeHref }
                : i,
            ),
          }
        }
        if (g.grup !== 'Personel Yönetimi') return g
        /** Modül kapalıysa yalnızca kendi personel kartı */
        if (mode === 'kullanici' && !menuModulAcik('personel', menuIzinleri)) {
          const tek = { href: calisanlarHref, label: 'Personel Kartım' }
          return { ...g, items: [tek] }
        }
        const terfiAcik = sidebarTerfiGoster(mode, menuIzinleri)
        const items = terfiAcik ? g.items : g.items.filter(i => i.href !== terfiMenuHref)
        return items.length ? { ...g, items } : null
      })
      .filter((g): g is MenuGroup => g != null)

    return mapped
  }, [menuGroups, mode, menuIzinleri, terfiMenuHref, calisanlarHref, access, hayaletDurum, performansDegerlendirmeHref])

  // Her accordion'ın açık/kapalı durumu grubun adına göre tutulur
  const [aciklar, setAciklar] = useState<Record<string, boolean>>(() => {
    const ilk: Record<string, boolean> = {}
    for (const g of menuGroups) {
      if (g.accordion) {
        ilk[g.grup] = g.items.some(i => itemOrSubtreeActive(pathname, i))
      }
    }
    return ilk
  })
  const [altAciklar, setAltAciklar] = useState<Record<string, boolean>>(() => {
    const ilk: Record<string, boolean> = {}
    for (const g of menuGroups) collectAltAciklar(g.items, pathname, ilk)
    return ilk
  })
  const [menuAramaQuery, setMenuAramaQuery] = useState('')

  const menuArama = menuAramaQuery.trim()
  const aramaAktif = menuArama.length > 0
  const raporModulunde = pathname === '/rapor' || pathname.startsWith('/rapor/')

  const aramaliGrupList = useMemo(() => {
    if (!aramaAktif) return filteredGroups
    return filteredGroups
      .map(g => filterMenuGroup(g, menuArama))
      .filter((g): g is MenuGroup => g != null)
  }, [filteredGroups, menuArama, aramaAktif])

  function toggle(grup: string) {
    setAciklar(prev => ({ ...prev, [grup]: !prev[grup] }))
  }
  function toggleAlt(href: string) {
    setAltAciklar(prev => ({ ...prev, [href]: !prev[href] }))
  }

  useEffect(() => {
    if (pathname === '/denetim' || pathname.startsWith('/denetim/')) {
      setAciklar(prev => (prev['Denetim Yönetimi'] ? prev : { ...prev, 'Denetim Yönetimi': true }))
    }
    if (pathname === '/kys' || pathname.startsWith('/kys/')) {
      setAciklar(prev => (prev['KYS Yönetimi'] ? prev : { ...prev, 'KYS Yönetimi': true }))
    }
  }, [pathname])

  useEffect(() => {
    setAltAciklar(prev => {
      let degisti = false
      const next = { ...prev }
      function walk(items: MenuItem[]) {
        for (const i of items) {
          if (i.children?.length) {
            if (itemOrSubtreeActive(pathname, i) && !next[i.href]) {
              next[i.href] = true
              degisti = true
            }
            walk(i.children)
          }
        }
      }
      for (const g of menuGroups) walk(g.items)
      return degisti ? next : prev
    })
  }, [pathname, menuGroups])

  useEffect(() => {
    if (!aramaAktif) return
    setAciklar(prev => {
      let degisti = false
      const next = { ...prev }
      for (const g of aramaliGrupList) {
        if (g.accordion && !next[g.grup]) {
          next[g.grup] = true
          degisti = true
        }
      }
      return degisti ? next : prev
    })
    setAltAciklar(prev => {
      let degisti = false
      const next = { ...prev }
      function walk(items: MenuItem[]) {
        for (const i of items) {
          if (i.children?.length && !next[i.href]) {
            next[i.href] = true
            degisti = true
            walk(i.children)
          } else if (i.children?.length) {
            walk(i.children)
          }
        }
      }
      for (const g of aramaliGrupList) walk(g.items)
      return degisti ? next : prev
    })
  }, [aramaAktif, menuArama, aramaliGrupList])

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <SidebarAmblem />
        <Link href="/" onClick={onNavigate} className="text-xl font-bold tracking-wide text-white hover:text-slate-200 transition-colors block text-center">
          INTRADA
        </Link>
        <span className="block text-xs text-slate-400 mt-0.5 text-center">v4 · Personel Yönetimi</span>
      </div>

      <div className="px-4 py-3 border-b border-slate-700">
        <label htmlFor="sidebar-menu-arama" className="sr-only">
          Menüde ara
        </label>
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
          </svg>
          <input
            id="sidebar-menu-arama"
            type="search"
            value={menuAramaQuery}
            onChange={e => setMenuAramaQuery(e.target.value)}
            placeholder={raporModulunde ? 'Rapor ara…' : 'Menüde ara…'}
            className="w-full rounded-md border border-slate-600 bg-slate-800 py-2 pl-9 pr-8 text-sm text-slate-100 placeholder:text-slate-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            autoComplete="off"
            spellCheck={false}
          />
          {menuAramaQuery.length > 0 && (
            <button
              type="button"
              onClick={() => setMenuAramaQuery('')}
              aria-label="Aramayı temizle"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {aramaAktif && (
          <p className="mt-1.5 text-[10px] text-slate-500">
            {aramaliGrupList.length === 0
              ? 'Eşleşen menü bulunamadı'
              : `${aramaliGrupList.reduce((n, g) => n + g.items.length, 0)} sonuç`}
          </p>
        )}
      </div>

      {/* Navigasyon */}
      <nav className="flex-1 overflow-y-auto py-4">
        {aramaliGrupList.map((grup) => {
          const grupAktif = grup.items.some((item) => itemOrSubtreeActive(pathname, item))

          if (grup.accordion) {
            const acik = aramaAktif || !!aciklar[grup.grup]

            return (
              <div key={grup.grup} className="mb-2">
                <button
                  onClick={() => toggle(grup.grup)}
                  className={`w-full flex items-center justify-between px-6 py-2.5 text-sm transition-colors ${
                    grupAktif ? 'text-white' : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-base leading-none">{grup.icon}</span>
                    <span className="font-semibold uppercase tracking-widest text-[10px]">
                      {grup.grup}
                    </span>
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${acik ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {acik && (
                  <div className="mt-1">
                    {renderMenuTree(grup.items, {
                      pathname,
                      altAciklar,
                      toggleAlt,
                      onNavigate,
                      depth: 0,
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <div key={grup.grup} className="mb-4">
              <p className="px-6 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {grup.grup}
              </p>
              {grup.items.map((item) => {
                const aktif = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={item.newTab ? '_blank' : undefined}
                    rel={item.newTab ? 'noopener noreferrer' : undefined}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                      aktif
                        ? 'bg-slate-700 text-white font-medium'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`}
                  >
                    <span className="text-base leading-none">{grup.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Alt bilgi */}
      <div className="px-6 py-4 border-t border-slate-700 text-xs text-slate-500">
        Supabase + Vercel
      </div>
    </aside>
  )
}
