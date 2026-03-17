import { NextRequest, NextResponse } from "next/server"

import { authService } from "@/services/auth.service"
import { verifyEmailQuerySchema } from "@/validations/auth.schema"
import { withErrorHandler } from "@/middlewares/withErrorHandler"

export const GET = withErrorHandler(async (req: NextRequest) => {
    const { origin, searchParams } = new URL(req.url)

    const { token: rawToken, callbackUrl } = verifyEmailQuerySchema.parse({
        token: searchParams.get("token"),
        callbackUrl: searchParams.get("callbackUrl") ?? "/",
    })

    const { user, hashedToken } = await authService.verifyEmailToken(rawToken)

    await authService.markEmailVerified(user.id)
    await authService.consumeToken(hashedToken)

    const { token, cookieOptions } = await authService.createSession(user)

    const res = NextResponse.redirect(new URL(callbackUrl, origin))
    res.cookies.set("next-auth.session-token", token, cookieOptions)

    return res
})
