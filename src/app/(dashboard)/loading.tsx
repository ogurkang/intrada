import { IntradaLoader } from '@/components/ui/IntradaLoader'

/** Dashboard sayfa geçişlerinde ana içerik alanı yüklenirken gösterilir. */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[min(420px,55vh)] items-center justify-center py-12">
      <IntradaLoader />
    </div>
  )
}
