import { NextRequest } from "next/server"

import { userService } from "@/services/user.service"
import { authService } from "@/services/auth.service"
import { mailService } from "@/services/mail.service"
import { registerSchema } from "@/validations/auth.schema"
import { ApiResponse } from "@/utils/apiResponse"
import { withErrorHandler } from "@/middlewares/withErrorHandler"

export const POST = withErrorHandler(async (req: NextRequest) => {
    const data = registerSchema.parse(await req.json())

    const user = await userService.create(data)

    const token = await authService.createEmailToken(user.email)
    await mailService.sendVerificationEmail(user.email, token)

    return ApiResponse.created({
        message: "Account created. Please verify your email.",
    })
})
