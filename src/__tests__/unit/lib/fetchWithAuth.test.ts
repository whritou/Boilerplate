import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// fetchWithAuth imports next-auth/react (signIn), mock it to avoid resolution errors
vi.mock('next-auth/react', () => ({
    signIn: vi.fn(),
}))

import { fetchWithAuth } from '@/lib/api/fetchWithAuth'

const mockFetch = vi.fn()

beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    // Ensure window.location is writable so we can spy on href assignment
    Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
        configurable: true,
    })
})

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

describe('fetchWithAuth', () => {
    it('passes through a 200 response unchanged', async () => {
        const fakeResponse = new Response('{"ok":true}', { status: 200 })
        mockFetch.mockResolvedValue(fakeResponse)

        const result = await fetchWithAuth('https://example.com/api/data')

        expect(result).toBe(fakeResponse)
        expect(result.status).toBe(200)
    })

    it('sets window.location.href and returns 401 response on 401', async () => {
        mockFetch.mockResolvedValue(new Response(null, { status: 401 }))
        window.location.href = 'https://example.com/protected'

        const result = await fetchWithAuth('https://example.com/api/protected')

        expect(window.location.href).toContain('/signin?callbackUrl=')
        expect(result.status).toBe(401)
    })

    it('sets window.location.href and returns 403 response on 403', async () => {
        mockFetch.mockResolvedValue(new Response(null, { status: 403 }))
        window.location.href = 'https://example.com/protected'

        const result = await fetchWithAuth('https://example.com/api/admin')

        expect(window.location.href).toContain('/signin?callbackUrl=')
        expect(result.status).toBe(403)
    })

    it('returns 403 without redirect when window is undefined (SSR)', async () => {
        mockFetch.mockResolvedValue(new Response(null, { status: 403 }))

        const originalWindow = global.window
        // @ts-ignore
        delete global.window

        const result = await fetchWithAuth('https://example.com/api/admin')

        // Restore window before assertions so test env stays clean
        global.window = originalWindow

        expect(result.status).toBe(403)
    })

    it('passes through custom headers and body to fetch', async () => {
        const fakeResponse = new Response('{}', { status: 200 })
        mockFetch.mockResolvedValue(fakeResponse)

        const init: RequestInit = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Custom-Header': 'test' },
            body: JSON.stringify({ key: 'value' }),
        }

        await fetchWithAuth('https://example.com/api/create', init)

        expect(mockFetch).toHaveBeenCalledWith('https://example.com/api/create', init)
    })
})
