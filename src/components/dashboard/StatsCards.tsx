import { Card, CardContent } from '@/components/ui/card'
import { Ticket, CheckCircle2, Clock, TrendingUp } from 'lucide-react'

type Props = {
  totalTickets: number
  usedTickets: number
  unusedTickets: number
}

export function StatsCards({ totalTickets, usedTickets, unusedTickets }: Props) {
  const checkInRate = totalTickets > 0 ? Math.round((usedTickets / totalTickets) * 100) : 0

  const stats = [
    { label: 'Total Issued', value: totalTickets, icon: Ticket, accent: 'text-gold bg-gold/10' },
    { label: 'Checked In', value: usedTickets, icon: CheckCircle2, accent: 'text-emerald-600 bg-emerald-50' },
    { label: 'Remaining', value: unusedTickets, icon: Clock, accent: 'text-gray-500 bg-gray-100' },
    { label: 'Check-in Rate', value: `${checkInRate}%`, icon: TrendingUp, accent: 'text-blue-600 bg-blue-50' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, accent }) => (
        <Card key={label} className="border-black/5 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
