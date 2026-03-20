'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

type MenuItem  = { href: string; label: string }
type MenuGroup = { grup: string; icon: string; items: MenuItem[]; accordion?: boolean }

const menuGroups: MenuGroup[] = [
  {
    grup: 'Personel',
    icon: '👤',
    accordion: true,
    items: [
      { href: '/personel',            label: 'Çalışanlar'          },
      { href: '/personel/ayrilanlar', label: 'Ayrılanlar'          },
      { href: '/firma-calisanlar',    label: 'Firma Personel'      },
      { href: '/kadro',               label: 'Kadro Hareketleri'   },
      { href: '/personel-hareketleri', label: 'Personel Hareketleri'},
      { href: '/terfi',               label: 'Terfi Hareketleri'   },
    ],
  },
  {
    grup: 'İzin Yönetimi',
    icon: '📅',
    accordion: true,
    items: [
      { href: '/izin',        label: 'İzin Hareketleri' },
      { href: '/izin/haklar', label: 'İzin Hakları'      },
    ],
  },
  {
    grup: 'Bildirim',
    icon: '📋',
    accordion: true,
    items: [
      { href: '/bildirim',         label: 'Genel Bakış'      },
      { href: '/bildirim/ogrenim', label: 'Öğrenim Bildirimi'},
      { href: '/bildirim/aile',    label: 'Aile Bildirimi'   },
      { href: '/bildirim/mal',     label: 'Mal Bildirimi'    },
    ],
  },
  {
    grup: 'Kesintiler',
    icon: '✂️',
    accordion: true,
    items: [
      { href: '/kesintiler',             label: 'Genel Bakış'              },
      { href: '/kesintiler/yevmiye',     label: 'Yevmiye Puantajı'         },
      { href: '/kesintiler/arazi',       label: 'Arazi Puantajı'           },
      { href: '/kesintiler/ayy',         label: 'Aylık Yemek (AYY)'        },
      { href: '/kesintiler/rmy',         label: 'Raporlu Memurlar'         },
      { href: '/kesintiler/ivy',         label: 'İzinli Vekiller'          },
      { href: '/kesintiler/izy',         label: 'İzinli Zabıtalar'        },
      { href: '/kesintiler/toplam-raporlu', label: 'Toplam Raporlu Zabıtalar' },
    ],
  },
  {
    grup: 'Eğitim',
    icon: '🎓',
    accordion: true,
    items: [
      { href: '/egitim',             label: 'Eğitim Takvimi'   },
      { href: '/egitim/istatistik',  label: 'Eğitim İstatistiği'},
    ],
  },
  {
    grup: 'Tanımlar',
    icon: '⚙️',
    accordion: true,
    items: [
      { href: '/tanimlar/ogrenim',    label: 'Öğrenim'       },
      { href: '/tanimlar/unvan',      label: 'Unvan'         },
      { href: '/tanimlar/mudurluk',   label: 'Müdürlük'      },
      { href: '/tanimlar/statu',      label: 'Statü'         },
      { href: '/tanimlar/izin-turu',  label: 'İzin Türleri'  },
      { href: '/tanimlar/izin-hak',   label: 'İzin Hakları'  },
      { href: '/tanimlar/tatil',      label: 'Tatiller'      },
      { href: '/tanimlar/izin-kural', label: 'İzin Kuralları'},
    ],
  },
]

function grupAktifPrefixleri(grup: MenuGroup) {
  return grup.items.map(i => i.href)
}

interface SidebarProps {
  onNavigate?: () => void
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname()

  // Her accordion'ın açık/kapalı durumu grubun adına göre tutulur
  const [aciklar, setAciklar] = useState<Record<string, boolean>>(() => {
    const ilk: Record<string, boolean> = {}
    for (const g of menuGroups) {
      if (g.accordion) {
        ilk[g.grup] = g.items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'))
      }
    }
    return ilk
  })

  function toggle(grup: string) {
    setAciklar(prev => ({ ...prev, [grup]: !prev[grup] }))
  }

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <span className="text-xl font-bold tracking-wide text-white">INTRADA</span>
        <span className="block text-xs text-slate-400 mt-0.5">v4 · Personel Yönetimi</span>
      </div>

      {/* Navigasyon */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuGroups.map((grup) => {
          const grupAktif = grup.items.some(
            (item) => pathname === item.href || pathname.startsWith(item.href + '/')
          )

          if (grup.accordion) {
            const acik = !!aciklar[grup.grup]

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
                    {grup.items.map((item) => {
                      const aktif = pathname === item.href || pathname.startsWith(item.href + '/')
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onNavigate}
                          className={`flex items-center gap-2 pl-12 pr-4 py-2 text-sm transition-colors ${
                            aktif
                              ? 'bg-slate-700 text-white font-medium'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                          {item.label}
                        </Link>
                      )
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
