import { NextResponse } from 'next/server'
import { getDashboardStats } from '@/lib/queries'

export async function GET() {
  const stats = getDashboardStats()
  return NextResponse.json(stats)
}
