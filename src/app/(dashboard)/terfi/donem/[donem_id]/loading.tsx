import { IntradaLoader } from '@/components/ui/IntradaLoader'

export default function TerfiDonemLoading() {
  return (
    <div className="flex min-h-[min(420px,55vh)] items-center justify-center py-12">
      <IntradaLoader label="Terfi dönemi hazırlanıyor…" />
    </div>
  )
}
