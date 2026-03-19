import { describe, it, expect } from 'vitest'
import {
    AppError,
    NotFoundError,
    ConflictError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    TooManyRequestsError,
    BadRequestError,
} from '@/utils/errors'

describe('AppError', () => {
    it('has correct message, statusCode, code, and name', () => {
        const err = new AppError('Something failed', 500, 'INTERNAL')
        expect(err.message).toBe('Something failed')
        expect(err.statusCode).toBe(500)
        expect(err.code).toBe('INTERNAL')
        expect(err.name).toBe('AppError')
    })

    it('is an instance of Error', () => {
        const err = new AppError('fail', 500)
        expect(err).toBeInstanceOf(Error)
    })

    it('works without a code', () => {
        const err = new AppError('fail', 500)
        expect(err.code).toBeUndefined()
    })
})

describe('NotFoundError', () => {
    it('has correct defaults', () => {
        const err = new NotFoundError()
        expect(err.message).toBe('Resource not found')
        expect(err.statusCode).toBe(404)
        expect(err.code).toBe('NOT_FOUND')
        expect(err.name).toBe('NotFoundError')
    })

    it('accepts a custom message', () => {
        const err = new NotFoundError('User not found')
        expect(err.message).toBe('User not found')
    })

    it('is instanceof AppError and Error', () => {
        const err = new NotFoundError()
        expect(err).toBeInstanceOf(AppError)
        expect(err).toBeInstanceOf(Error)
    })
})

describe('ConflictError', () => {
    it('has correct defaults', () => {
        const err = new ConflictError()
        expect(err.message).toBe('Resource already exists')
        expect(err.statusCode).toBe(409)
        expect(err.code).toBe('CONFLICT')
        expect(err.name).toBe('ConflictError')
    })

    it('accepts a custom message', () => {
        const err = new ConflictError('Email already taken')
        expect(err.message).toBe('Email already taken')
    })

    it('is instanceof AppError and Error', () => {
        const err = new ConflictError()
        expect(err).toBeInstanceOf(AppError)
        expect(err).toBeInstanceOf(Error)
    })
})

describe('ValidationError', () => {
    it('has correct defaults', () => {
        const err = new ValidationError()
        expect(err.message).toBe('Validation failed')
        expect(err.statusCode).toBe(422)
        expect(err.code).toBe('VALIDATION_ERROR')
        expect(err.name).toBe('ValidationError')
    })

    it('accepts a custom message and errors', () => {
        const errors = { email: ['Invalid email'] }
        const err = new ValidationError('Custom validation', errors)
        expect(err.message).toBe('Custom validation')
        expect(err.errors).toEqual(errors)
    })

    it('is instanceof AppError and Error', () => {
        const err = new ValidationError()
        expect(err).toBeInstanceOf(AppError)
        expect(err).toBeInstanceOf(Error)
    })
})

describe('UnauthorizedError', () => {
    it('has correct defaults', () => {
        const err = new UnauthorizedError()
        expect(err.message).toBe('Unauthorized')
        expect(err.statusCode).toBe(401)
        expect(err.code).toBe('UNAUTHORIZED')
        expect(err.name).toBe('UnauthorizedError')
    })

    it('accepts a custom message', () => {
        const err = new UnauthorizedError('Token expired')
        expect(err.message).toBe('Token expired')
    })

    it('is instanceof AppError and Error', () => {
        const err = new UnauthorizedError()
        expect(err).toBeInstanceOf(AppError)
        expect(err).toBeInstanceOf(Error)
    })
})

describe('ForbiddenError', () => {
    it('has correct defaults', () => {
        const err = new ForbiddenError()
        expect(err.message).toBe('Forbidden')
        expect(err.statusCode).toBe(403)
        expect(err.code).toBe('FORBIDDEN')
        expect(err.name).toBe('ForbiddenError')
    })

    it('accepts a custom message', () => {
        const err = new ForbiddenError('Access denied')
        expect(err.message).toBe('Access denied')
    })

    it('is instanceof AppError and Error', () => {
        const err = new ForbiddenError()
        expect(err).toBeInstanceOf(AppError)
        expect(err).toBeInstanceOf(Error)
    })
})

describe('TooManyRequestsError', () => {
    it('has correct defaults', () => {
        const err = new TooManyRequestsError()
        expect(err.message).toBe('Too many requests')
        expect(err.statusCode).toBe(429)
        expect(err.code).toBe('TOO_MANY_REQUESTS')
        expect(err.name).toBe('TooManyRequestsError')
    })

    it('accepts a custom message', () => {
        const err = new TooManyRequestsError('Slow down')
        expect(err.message).toBe('Slow down')
    })

    it('is instanceof AppError and Error', () => {
        const err = new TooManyRequestsError()
        expect(err).toBeInstanceOf(AppError)
        expect(err).toBeInstanceOf(Error)
    })
})

describe('BadRequestError', () => {
    it('has correct defaults', () => {
        const err = new BadRequestError()
        expect(err.message).toBe('Bad request')
        expect(err.statusCode).toBe(422)
        expect(err.code).toBe('BAD_REQUEST')
        expect(err.name).toBe('BadRequestError')
    })

    it('accepts a custom message', () => {
        const err = new BadRequestError('Invalid payload')
        expect(err.message).toBe('Invalid payload')
    })

    it('is instanceof AppError and Error', () => {
        const err = new BadRequestError()
        expect(err).toBeInstanceOf(AppError)
        expect(err).toBeInstanceOf(Error)
    })
})
