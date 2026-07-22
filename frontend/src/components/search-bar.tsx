"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSubmit?: (value: string) => void
  className?: string
}

function SearchBar({
  value,
  onChange,
  placeholder = "Search products...",
  onSubmit,
  className,
}: SearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSubmit) {
      onSubmit(value)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  )
}

export { SearchBar }
