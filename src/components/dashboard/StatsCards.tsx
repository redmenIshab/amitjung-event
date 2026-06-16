import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  totalTickets: number
  usedTickets: number
  unusedTickets: number
}

export function StatsCards({ totalTickets, usedTickets, unusedTickets }: Props) {
  const checkInRate = totalTickets > 0 ? Math.round((usedTickets / totalTickets) * 100) : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-gray-500">Total Issued</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{totalTickets}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-gray-500">Checked In</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-600">{usedTickets}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-gray-500">Remaining</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-gray-400">{unusedTickets}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-sm font-medium text-gray-500">Check-in Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-blue-600">{checkInRate}%</p>
        </CardContent>
      </Card>
    </div>
  )
}
