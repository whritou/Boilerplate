import { NextRequest } from "next/server"

import { userService } from "@/services/user.service"
import { authService } from "@/services/auth.service"
import { mailService } from "@/services/mail.service"
import { emailTokenSchema } from "@/validations/auth.schema"
import { ApiResponse } from "@/utils/apiResponse"
import { withErrorHandler } from "@/middlewares/withErrorHandler"

export const POST = withErrorHandler(async (req: NextRequest) => {
    const { email } = emailTokenSchema.parse(await req.json())

    const user = await userService.getByEmail(email).catch(() => null)

    if (user) {
        const token = await authService.createEmailToken(email)
        await mailService.sendResetPasswordEmail(email, token)
    }

    return ApiResponse.noContent()
})
