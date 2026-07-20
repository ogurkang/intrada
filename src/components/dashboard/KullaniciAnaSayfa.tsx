import Link from 'next/link'
import { menuModulAcik } from '@/lib/menu-yetki'

type MenuIzin = Record<string, boolean | undefined>

export default function KullaniciAnaSayfa({
  sicilNo,
  menuIzinleri,
}: {
  sicilNo: string
  menuIzinleri: MenuIzin
}) {
  const sn = encodeURIComponent(sicilNo.trim())

  const kartlar: { baslik: string; aciklama: string; href: string; emoji: string }[] = []

  /** Personel kartı: her kullanıcıda (modül kutusu kapalı olsa da) */
  kartlar.push({
    baslik: 'Personel Kartım',
    aciklama: 'Kendi sicil özetiniz ve bilgileriniz.',
    href: `/personel/${sn}`,
    emoji: '👤',
  })

  if (menuModulAcik('bildirim', menuIzinleri)) {
    kartlar.push(
      {
        baslik: 'Aile Bildirimi',
        aciklama: 'Medeni hal, eş ve çocuk bildirimleriniz.',
        href: '/bildirim/aile',
        emoji: '👨‍👩‍👧',
      },
      {
        baslik: 'Mal Bildirimi',
        aciklama: 'Servet beyanlarınız ve kayıtlarınız.',
        href: '/bildirim/mal',
        emoji: '🏠',
      },
      {
        baslik: 'Pasaport İşlemleri',
        aciklama: 'Yeşil pasaport başvuru formu oluşturma ve Word çıktısı.',
        href: '/bildirim/pasaport',
        emoji: '🛂',
      },
      {
        baslik: 'Hizmet Birleştirme İşlemleri',
        aciklama: 'SGK hizmet birleştirme dilekçesi oluşturma ve Word çıktısı.',
        href: '/bildirim/hizmet-birlestirme',
        emoji: '📄',
      },
      {
        baslik: 'Mehil İzni Bildirimi',
        aciklama: 'Mehil izni bildirimi oluşturma ve Word çıktısı.',
        href: '/bildirim/mehil-izni',
        emoji: '📅',
      },
      {
        baslik: 'Harcırah Talep Bildirimi',
        aciklama: 'Harcırah talep bildirimi oluşturma ve Word çıktısı.',
        href: '/bildirim/harcirah-talep',
        emoji: '💰',
      },
    )
  }

  if (menuModulAcik('kesintiler', menuIzinleri)) {
    kartlar.push(
      {
        baslik: 'Yevmiye Puantajı',
        aciklama: 'Dönem seçerek puantaj görüntüleme.',
        href: '/kesintiler/yevmiye',
        emoji: '📅',
      },
      {
        baslik: 'Arazi Puantajı',
        aciklama: 'Arazi dönemi puantajı.',
        href: '/kesintiler/arazi',
        emoji: '✂️',
      },
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Yetkiniz olan modüllere aşağıdaki kutulardan hızlıca gidebilirsiniz.
      </p>

      {kartlar.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-500">
          Henüz atanmış modül kısayolu yok. Yöneticinizden menü yetkilerinizi açmasını isteyebilirsiniz.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {kartlar.map(k => (
            <li key={k.href + k.baslik}>
              <Link
                href={k.href}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md"
              >
                <span className="text-2xl" aria-hidden>
                  {k.emoji}
                </span>
                <span className="mt-3 text-base font-semibold text-slate-900">{k.baslik}</span>
                <span className="mt-1 flex-1 text-sm text-slate-500">{k.aciklama}</span>
                <span className="mt-4 text-sm font-medium text-blue-700">Git →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
