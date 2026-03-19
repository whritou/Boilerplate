import { signIn } from "next-auth/react"

export async function fetchWithAuth(input: RequestInfo, init?: RequestInit) {
    const res = await fetch(input, init)

    if (res.status === 403 || res.status === 401) {
        if (typeof window !== "undefined") {
            window.location.href = `/signin?callbackUrl=${encodeURIComponent(window.location.href)}`
        }
        if (res.status === 401)
            return new Response(null, { status: 401 })
        return new Response(null, { status: 403})
    }

    return res
}