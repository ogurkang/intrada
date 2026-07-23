'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { hayaletProfilBitir } from '@/app/(dashboard)/yetkilendirme/hayalet-profil/actions'

export default function HayaletProfilBanner({
  hedefAdSoyad,
  hedefSicil,
}: {
  hedefAdSoyad: string
  hedefSicil: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function cikis() {
    startTransition(async () => {
      await hayaletProfilBitir()
      router.push('/yetkilendirme/hayalet-profil')
      router.refresh()
    })
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-950">
      <div>
        <p className="font-semibold">Hayalet profil modu</p>
        <p className="mt-0.5 text-violet-900/90">
          Performans ekranları <span className="font-medium">{hedefAdSoyad}</span> (sicil {hedefSicil}) olarak
          görüntüleniyor. Yalnızca performans modülüne erişebilirsiniz.
        </p>
      </div>
      <button
        type="button"
        onClick={cikis}
        disabled={pending}
        className="shrink-0 rounded-lg border border-violet-400 bg-white px-3 py-1.5 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-60"
      >
        {pending ? 'Çıkılıyor…' : 'Hayalet moddan çık'}
      </button>
    </div>
  )
}
