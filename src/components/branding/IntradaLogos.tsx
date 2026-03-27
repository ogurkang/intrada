'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const KURUMSAL = '/branding/intrada-kurumsal-logo.jpg'
const AMBLEM_PATH = '/branding/belediye-amblem.jpg'

/** Giriş kartı: kurumsal logo; koyu kutu yok — beyaz zemindeki JPG ile kart rengi uyumlu, letterbox gri/siyah görünmez */
export function LoginKurumsalLogo() {
  return (
    <div className="mx-auto mb-2 w-full">
      <div className="relative h-30 w-full sm:h-40 rounded-lg bg-white">
        <Image
          src={KURUMSAL}
          alt="INTRADA · Adapazarı Belediyesi"
          fill
          className="object-contain object-center"
          sizes="(max-width: 384px) calc(100vw - 4rem), 320px"
          priority
        />
      </div>
    </div>
  )
}

/**
 * Sol üst mühür: `public/branding/belediye-amblem.jpg` (3. görsel) varsa o dosya kullanılır;
 * yoksa kurumsal logonun sol tarafı daire içinde kırpılır.
 */
export function SidebarAmblem() {
  const [ozelAmblem, setOzelAmblem] = useState(false)

  useEffect(() => {
    fetch(AMBLEM_PATH, { method: 'HEAD', cache: 'no-store' })
      .then((r) => {
        if (r.ok) setOzelAmblem(true)
      })
      .catch(() => {})
  }, [])

  const src = ozelAmblem ? AMBLEM_PATH : KURUMSAL
  const cropClass = ozelAmblem
    ? 'object-cover object-center'
    : 'object-cover object-[18%_50%] scale-[1.28]'

  return (
    <div className="mb-3 flex justify-center">
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-black ring-1 ring-slate-600/90">
        <Image key={src} src={src} alt="" fill sizes="44px" className={cropClass} aria-hidden />
      </div>
    </div>
  )
}
