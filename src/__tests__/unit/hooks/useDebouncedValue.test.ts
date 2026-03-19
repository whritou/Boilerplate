import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

beforeEach(() => {
    vi.useFakeTimers()
})

afterEach(() => {
    vi.useRealTimers()
})

describe('useDebouncedValue', () => {
    it('returns the initial value immediately', () => {
        const { result } = renderHook(() => useDebouncedValue('hello'))
        expect(result.current).toBe('hello')
    })

    it('does not update before the delay has passed', () => {
        let value = 'initial'
        const { result, rerender } = renderHook(() => useDebouncedValue(value))

        value = 'updated'
        rerender()

        act(() => {
            vi.advanceTimersByTime(299)
        })

        expect(result.current).toBe('initial')
    })

    it('updates after the delay has passed', () => {
        let value = 'initial'
        const { result, rerender } = renderHook(() => useDebouncedValue(value))

        value = 'updated'
        rerender()

        act(() => {
            vi.advanceTimersByTime(300)
        })

        expect(result.current).toBe('updated')
    })

    it('resets the timer if value changes before the delay', () => {
        let value = 'initial'
        const { result, rerender } = renderHook(() => useDebouncedValue(value))

        value = 'first-change'
        rerender()

        act(() => {
            vi.advanceTimersByTime(200)
        })

        // Change again before 300ms has elapsed since first change
        value = 'second-change'
        rerender()

        act(() => {
            vi.advanceTimersByTime(200)
        })

        // Only 200ms since last change, should still be initial
        expect(result.current).toBe('initial')

        act(() => {
            vi.advanceTimersByTime(100)
        })

        // Now 300ms since last change
        expect(result.current).toBe('second-change')
    })

    it('works with a custom delay', () => {
        let value = 'start'
        const { result, rerender } = renderHook(() => useDebouncedValue(value, 1000))

        value = 'end'
        rerender()

        act(() => {
            vi.advanceTimersByTime(999)
        })
        expect(result.current).toBe('start')

        act(() => {
            vi.advanceTimersByTime(1)
        })
        expect(result.current).toBe('end')
    })

    it('works with non-string types', () => {
        let value = 42
        const { result, rerender } = renderHook(() => useDebouncedValue(value))

        value = 100
        rerender()

        act(() => {
            vi.advanceTimersByTime(300)
        })

        expect(result.current).toBe(100)
    })
})
