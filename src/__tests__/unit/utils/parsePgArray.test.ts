import { describe, it, expect } from 'vitest'
import { parsePgArray } from '@/utils/parsePgArray'

describe('parsePgArray', () => {
    it('parses a normal postgres array string {a,b,c}', () => {
        expect(parsePgArray('{a,b,c}')).toEqual(['a', 'b', 'c'])
    })

    it('parses a single-element array', () => {
        expect(parsePgArray('{hello}')).toEqual(['hello'])
    })

    it('trims whitespace around elements', () => {
        expect(parsePgArray('{ foo , bar , baz }')).toEqual(['foo', 'bar', 'baz'])
    })

    it('returns empty array for empty string', () => {
        expect(parsePgArray('')).toEqual([])
    })

    it('returns empty array for null', () => {
        expect(parsePgArray(null)).toEqual([])
    })

    it('returns empty array for undefined', () => {
        expect(parsePgArray(undefined)).toEqual([])
    })

    it('handles an empty postgres array {}', () => {
        expect(parsePgArray('{}')).toEqual([])
    })

    it('parses numeric strings', () => {
        expect(parsePgArray('{1,2,3}')).toEqual(['1', '2', '3'])
    })

    it('filters out empty segments from malformed input', () => {
        const result = parsePgArray('{a,,b}')
        expect(result).toEqual(['a', 'b'])
    })
})
