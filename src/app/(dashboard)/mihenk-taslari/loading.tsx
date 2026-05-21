export default function MihenkTaslariLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 rounded" />
      <div className="h-4 w-96 max-w-full bg-slate-100 rounded" />
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded" />
        ))}
      </div>
    </div>
  )
}
