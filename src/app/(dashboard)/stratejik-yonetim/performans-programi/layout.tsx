import { IntradaLoader } from '@/components/ui/IntradaLoader'

export default function PerformansProgramiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-30">
        <IntradaLoader dekor compact label="" />
      </div>
    </>
  )
}
