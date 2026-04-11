import { useState } from "react"
import { Search } from "lucide-react"

interface SearchFilterProps {
  placeholder?: string
  onSearch: (query: string) => void
  debounceMs?: number
}

export function SearchFilter({ placeholder = "Search...", onSearch, debounceMs = 300 }: SearchFilterProps) {
  const [value, setValue] = useState("")
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)

    if (timer) clearTimeout(timer)
    const newTimer = setTimeout(() => onSearch(newValue), debounceMs)
    setTimer(newTimer)
  }

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-8 pr-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
      />
    </div>
  )
}
