export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <div className="w-10 h-10 rounded-full border-[3px] border-gray-200" />
        <div className="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-transparent border-t-cyan-500 animate-spin" />
      </div>
      <p className="text-sm text-gray-400 font-medium">Loading...</p>
    </div>
  )
}
