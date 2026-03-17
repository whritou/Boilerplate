"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"

export function CellStack({
                              primary,
                              secondary,
                              primaryClassName,
                          }: {
    primary: ReactNode
    secondary?: ReactNode
    primaryClassName?: string
}) {
    return (
        <div className="flex flex-col gap-0.5">
      <span
          className={cn(
              "text-[13px] font-medium text-stone-800 leading-snug",
              primaryClassName
          )}
      >
        {primary}
      </span>

            {secondary && (
                <span className="text-[11px] text-muted-foreground leading-snug">
          {secondary}
        </span>
            )}
        </div>
    )
}

export function CellAmount({ value }: { value: string }) {
    return (
        <span className="text-[13px] font-semibold text-destructive tabular-nums">
      {value}
    </span>
    )
}

export function CellRef({ value }: { value: string }) {
    return (
        <span className="font-mono text-[12px] font-medium text-destructive">
      {value}
    </span>
    )
}

export function CellProgress({
                                 sold,
                                 total,
                             }: {
    sold: number
    total: number
}) {
    const pct = total > 0 ? Math.round((sold / total) * 100) : 0

    return (
        <div className="flex flex-col gap-1">
      <span className="text-[12px] text-muted-foreground tabular-nums">
        {sold}/{total}
      </span>

            <Progress value={pct} className="h-1 w-14" />
        </div>
    )
}

export function CellMuted({ children }: { children: ReactNode }) {
    return (
        <span className="text-[12px] text-muted-foreground">
      {children}
    </span>
    )
}

export function CellTruncate({
                                 children,
                                 className,
                             }: {
    children: ReactNode
    className?: string
}) {
    return (
        <span
            className={cn(
                "block max-w-[180px] truncate text-[12px] text-muted-foreground",
                className
            )}
        >
      {children}
    </span>
    )
}

export function CellAvatar({
                               name,
                               sub,
                           }: {
    name: string
    sub?: string
}) {
    const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()

    return (
        <div className="flex items-center gap-2.5">
            <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px] font-semibold">
                    {initials}
                </AvatarFallback>
            </Avatar>

            <CellStack primary={name} secondary={sub} />
        </div>
    )
}