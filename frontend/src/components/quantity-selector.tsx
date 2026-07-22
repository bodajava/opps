"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Minus, Plus } from "lucide-react"

interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
  className?: string
}

function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  className,
}: QuantitySelectorProps) {
  const decrement = () => {
    if (value > min) onChange(value - 1)
  }

  const increment = () => {
    if (value < max) onChange(value + 1)
  }

  return (
    <div className={cn("flex items-center gap-0", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-r-none"
        onClick={decrement}
        disabled={disabled || value <= min}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <div className="flex h-8 w-10 items-center justify-center border-y border-input text-sm font-medium tabular-nums">
        {value}
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-l-none"
        onClick={increment}
        disabled={disabled || value >= max}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  )
}

export { QuantitySelector }
