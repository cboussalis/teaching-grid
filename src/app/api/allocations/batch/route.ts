import { NextRequest, NextResponse } from 'next/server'
import { batchUpsertAllocations, batchDeleteAllocations } from '@/lib/queries'
import type { BatchAllocationOperation } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { operations } = body as { operations: BatchAllocationOperation[] }

    if (!operations || !Array.isArray(operations)) {
      return NextResponse.json(
        { error: 'Operations array is required' },
        { status: 400 }
      )
    }

    // Separate upserts and deletes
    const upserts = operations.filter(op => op.operation === 'upsert')
    const deletes = operations.filter(op => op.operation === 'delete')

    // Process deletes first (to handle move operations where we delete from source)
    if (deletes.length > 0) {
      batchDeleteAllocations(
        deletes.map(op => ({ moduleId: op.moduleId, staffId: op.staffId }))
      )
    }

    // Then process upserts
    if (upserts.length > 0) {
      batchUpsertAllocations(
        upserts.map(op => ({
          moduleId: op.moduleId,
          staffId: op.staffId,
          hours: op.hours || 0
        }))
      )
    }

    return NextResponse.json({
      success: true,
      processed: {
        upserts: upserts.length,
        deletes: deletes.length
      }
    })
  } catch (error) {
    console.error('Batch allocation error:', error)
    return NextResponse.json(
      { error: 'Failed to process batch operations' },
      { status: 500 }
    )
  }
}
