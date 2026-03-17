import { NextResponse } from 'next/server'
import { AppError } from './errors'
import { ZodError } from 'zod'

export class ApiResponse {
  static success<T>(data: T, status = 200) {
    return NextResponse.json(
      { success: true, data },
      { status }
    )
  }

  static created<T>(data: T) {
    return ApiResponse.success(data, 201)
  }

  static noContent() {
    return new NextResponse(null, { status: 204 })
  }

  static paginated<T>(result: {
    data: T[]
    meta: object
  }) {
    return NextResponse.json(
      { success: true, ...result },
      { status: 200 }
    )
  }

  static error(message: string, status = 500, code?: string, errors?: unknown) {
    return NextResponse.json(
      { success: false, error: { message, code, errors } },
      { status }
    )
  }

  static fromError(err: unknown) {
    console.error('[API Error]', err)

    if (err instanceof AppError) {
      return ApiResponse.error(err.message, err.statusCode, err.code)
    }

    if (err instanceof ZodError) {
      return ApiResponse.error(
        'Validation failed',
        422,
        'VALIDATION_ERROR',
        err.flatten().fieldErrors
      )
    }

    return ApiResponse.error('Internal server error', 500, 'INTERNAL_ERROR')
  }
}
