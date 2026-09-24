import Link from 'next/link'
import { ISG_YONLENDIRICI_BTN } from '@/components/isg/IsgYonlendiriciDugme'

export default function IsgYonetimiPage() {
  return (
    <div className="flex min-h-[60vh] justify-end">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-right">
          <h1 className="text-2xl font-bold text-slate-800">İSG Yönetimi</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            İş sağlığı ve güvenliği süreçleri, raporları ve tanımları bu modül altında toplanır.
          </p>
        </div>
        <ul className="mt-6 flex flex-col gap-3">
          <li>
            <Link href="/isg/islemler" className={`${ISG_YONLENDIRICI_BTN} w-full`}>
              İşlemler
            </Link>
          </li>
          <li>
            <Link href="/isg/raporlar" className={`${ISG_YONLENDIRICI_BTN} w-full`}>
              Raporlar
            </Link>
          </li>
          <li>
            <Link href="/isg/tanimlar" className={`${ISG_YONLENDIRICI_BTN} w-full`}>
              Tanımlar
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}
