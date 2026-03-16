import { NextRequest } from 'next/server'

import { productService } from '@/services/product.service'
import { productCreateSchema } from '@/validations/product.schema'
import { parseQueryParams } from '@/lib/query/parseQueryParams'
import { ApiResponse } from '@/utils/apiResponse'
import { withErrorHandler } from '@/middlewares/withErrorHandler'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { ForbiddenError } from '@/utils/errors'

export const GET = withErrorHandler(async (req: NextRequest) => {
    const params = parseQueryParams(req.nextUrl.searchParams)
    const result = await productService.getAll(params)

    return ApiResponse.paginated(result)
})

export const POST = withErrorHandler(async (req: NextRequest) => {
    const session = await requireAdmin()
    if (!session) throw new ForbiddenError()

    const { price, ...rest } = productCreateSchema.parse(await req.json())
    const product = await productService.create({ ...rest, price})

    return ApiResponse.created(product)
})
