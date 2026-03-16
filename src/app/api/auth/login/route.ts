import { NextRequest } from "next/server"

import { userService } from "@/services/user.service"
import { authService } from "@/services/auth.service"
import { loginSchema } from "@/validations/auth.schema"
import { ApiResponse } from "@/utils/apiResponse"
import { withErrorHandler } from "@/middlewares/withErrorHandler"
import { UnauthorizedError, ForbiddenError } from "@/utils/errors"

export const POST = withErrorHandler(async (req: NextRequest) => {
    const { email, password } = loginSchema.parse(await req.json())

    const user = await userService.verifyPassword(email, password)
    if (!user) throw new UnauthorizedError("Invalid credentials")
    if (!user.emailVerified) throw new ForbiddenError("Email not verified")

    const { token, cookieOptions } = await authService.createSession(user)

    const res = ApiResponse.success({ success: true })
    res.cookies.set("next-auth.session-token", token, cookieOptions)

    return res
})
