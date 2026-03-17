import { NextRequest, NextResponse } from 'next/server'

import { orderService } from '@/services/order.service'

/**
 * POST /api/orders/cleanup-expired
 * Cancels all expired unpaid orders and restores their stock.
 * Protected by CRON_SECRET — meant to be called by a scheduled task.
 */
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization')

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const canceledCount = await orderService.cancelAllExpired()
        return NextResponse.json({ success: true, canceledCount })
    } catch (err) {
        console.error('[Cleanup Expired Orders] Error:', err)
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
    }
}
