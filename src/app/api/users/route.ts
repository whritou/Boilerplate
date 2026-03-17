import { NextRequest } from 'next/server'

import { userService } from '@/services/user.service'
import { parseQueryParams } from '@/lib/query/parseQueryParams'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { ForbiddenError } from '@/utils/errors'

export const GET = withErrorHandler(async (req: NextRequest) => {
    const session = await requireAdmin()
    if (!session) throw new ForbiddenError()

    const params = parseQueryParams(req.nextUrl.searchParams)
    const result = await userService.getAll(params)

    return ApiResponse.paginated(result)
})
