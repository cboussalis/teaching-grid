"use client"

interface StaffLoadBarProps {
  actualLoad: number
  expectedLoad: number
  loadStatus: 'under' | 'balanced' | 'over'
}

export function StaffLoadBar({ actualLoad, expectedLoad, loadStatus }: StaffLoadBarProps) {
  if (expectedLoad === 0) return null

  const percentage = Math.min((actualLoad / expectedLoad) * 100, 150)

  const barColor = loadStatus === 'over'
    ? 'bg-red-400'
    : loadStatus === 'under'
    ? 'bg-yellow-400'
    : 'bg-green-400'

  return (
    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${barColor}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  )
}
