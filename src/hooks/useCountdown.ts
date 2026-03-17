import {useEffect, useState} from "react";

export function useCountdown(expiresAt?: Date) {
    const [remaining, setRemaining] = useState<number | null>(null)

    useEffect(() => {
        if (!expiresAt) { setRemaining(null); return }

        const update = () => {
            const diff = expiresAt.getTime() - Date.now()
            setRemaining(diff > 0 ? diff : 0)
        }
        update()
        const interval = setInterval(update, 1000)
        return () => clearInterval(interval)
    }, [expiresAt])

    if (remaining === null) return null

    const totalSeconds = Math.floor(remaining / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    return { remaining, minutes, seconds, expired: remaining <= 0 }
}
