import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface FilterOption {
  value: string
  label: string
}

interface FilterSelectProps {
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  placeholder?: string
  allLabel?: string
  className?: string
}

export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  allLabel = "All",
  className,
}: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-8 border-stone-200 bg-stone-50 text-xs text-stone-600 focus:ring-[#C41E3A]/15" +
            "focus:border-[#C41E3A]",
          className
        )}
      >
        <SelectValue placeholder={placeholder ?? allLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-xs">
          {allLabel}
        </SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
