'use client'

import { useState } from 'react'
import HareketTopluEkleForm from '@/components/tanimlar/HareketTopluEkleForm'
import { useTanimlarSaltOkunur } from '@/components/tanimlar/TanimlarSaltOkunurContext'

export default function HareketEkleYeniSekmeClient() {
  const saltOkunur = useTanimlarSaltOkunur()
  const [kaydedildi, setKaydedildi] = useState(false)

  return (
    <div>
      {kaydedildi && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm">
          Kayıtlar eklendi. Liste sekmesinde yenileyerek görebilirsiniz. Bu sekmeyi kapatabilirsiniz.
          <button
            type="button"
            className="ml-3 text-emerald-900 underline font-medium"
            onClick={() => {
              try {
                window.close()
              } catch {
                /* ignore */
              }
            }}
          >
            Sekmeyi kapat
          </button>
        </div>
      )}
      <HareketTopluEkleForm
        saltOkunur={saltOkunur}
        onBasarili={() => {
          setKaydedildi(true)
          try {
            window.opener?.location?.reload()
          } catch {
            /* ignore cross-origin */
          }
        }}
      />
    </div>
  )
}
