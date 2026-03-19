"use client"

import { Clock } from "lucide-react"

interface Props {
    minutes: number
    seconds: number
}

export function ExpirationBanner({ minutes, seconds }: Props) {
    return (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
                Time remaining to pay: <strong>{minutes}:{String(seconds).padStart(2, "0")}</strong>
            </span>
        </div>
    )
}
