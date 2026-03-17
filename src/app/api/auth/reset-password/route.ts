import { NextRequest } from "next/server"

import { authService } from "@/services/auth.service"
import { resetPasswordSchema } from "@/validations/auth.schema"
import { ApiResponse } from "@/utils/apiResponse"
import { withErrorHandler } from "@/middlewares/withErrorHandler"

export const POST = withErrorHandler(async (req: NextRequest) => {
    const { token, password } = resetPasswordSchema.parse(await req.json())

    const user = await authService.resetPassword(token, password)

    const { token: sessionToken, cookieOptions } = await authService.createSession(user)

    const res = ApiResponse.success({ success: true })
    res.cookies.set("next-auth.session-token", sessionToken, cookieOptions)

    return res
})
