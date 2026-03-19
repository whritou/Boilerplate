import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountdown } from '@/hooks/useCountdown'

beforeEach(() => {
    vi.useFakeTimers()
})

afterEach(() => {
    vi.useRealTimers()
})

describe('useCountdown', () => {
    it('returns null when no expiresAt is provided', () => {
        const { result } = renderHook(() => useCountdown())
        expect(result.current).toBeNull()
    })

    it('returns null when expiresAt is undefined', () => {
        const { result } = renderHook(() => useCountdown(undefined))
        expect(result.current).toBeNull()
    })

    it('returns minutes and seconds when expiresAt is in the future', () => {
        const future = new Date(Date.now() + 90_000) // 1m 30s
        const { result } = renderHook(() => useCountdown(future))

        expect(result.current).not.toBeNull()
        expect(result.current?.minutes).toBe(1)
        expect(result.current?.seconds).toBe(30)
        expect(result.current?.expired).toBe(false)
    })

    it('expired is true when expiresAt is in the past', () => {
        const past = new Date(Date.now() - 5000)
        const { result } = renderHook(() => useCountdown(past))

        expect(result.current).not.toBeNull()
        expect(result.current?.expired).toBe(true)
        expect(result.current?.remaining).toBe(0)
    })

    it('updates every second as the timer advances', () => {
        const future = new Date(Date.now() + 5000) // 5 seconds
        const { result } = renderHook(() => useCountdown(future))

        expect(result.current?.seconds).toBe(5)

        act(() => {
            vi.advanceTimersByTime(1000)
        })
        expect(result.current?.seconds).toBe(4)

        act(() => {
            vi.advanceTimersByTime(1000)
        })
        expect(result.current?.seconds).toBe(3)
    })

    it('remaining reaches 0 and expired becomes true after time passes', () => {
        const future = new Date(Date.now() + 2000)
        const { result } = renderHook(() => useCountdown(future))

        expect(result.current?.expired).toBe(false)

        act(() => {
            vi.advanceTimersByTime(3000)
        })

        expect(result.current?.expired).toBe(true)
        expect(result.current?.remaining).toBe(0)
    })

    it('cleans up interval on unmount', () => {
        const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
        const future = new Date(Date.now() + 60_000)

        const { unmount } = renderHook(() => useCountdown(future))

        unmount()

        expect(clearIntervalSpy).toHaveBeenCalled()
    })
})
