import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  ShoppingCart,
  ChefHat,
  TrendingUp,
  BarChart3,
  UserCog,
  Menu,
  Crown,
  Clock,
  CheckCircle2,
  ArrowRight,
  Star,
  Package,
} from 'lucide-react'
import type { Order } from '@/types'

interface IncomeBreakdownItem {
  period: string
  orders: number
  gross: number
  tax: number
  net: number
}

export function AdminDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today')

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => apiClient.getDashboardStats().then(res => res.data),
    refetchInterval: 30000,
  })

  const { data: income, isLoading: incomeLoading } = useQuery({
    queryKey: ['incomeReport', selectedPeriod],
    queryFn: () => apiClient.getIncomeReport(selectedPeriod).then(res => res.data),
  })

  const { data: recentOrdersRes } = useQuery({
    queryKey: ['recentOrders'],
    queryFn: () => apiClient.getOrders({ per_page: 8 }).then(res => res.data),
    refetchInterval: 15000,
  })
  const recentOrders: Order[] = Array.isArray(recentOrdersRes) ? recentOrdersRes : []

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(n)

  const statusBadge: Record<string, { label: string; className: string }> = {
    pending:   { label: 'New',       className: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'Accepted',  className: 'bg-blue-100 text-blue-800' },
    preparing: { label: 'Cooking',   className: 'bg-orange-100 text-orange-800' },
    ready:     { label: 'Ready',     className: 'bg-green-100 text-green-800' },
    completed: { label: 'Done',      className: 'bg-gray-100 text-gray-700' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
  }

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const pipeline = [
    { label: 'New Orders',  count: stats?.pending_orders ?? 0,   icon: <Clock className="w-4 h-4" />,        color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Cooking',     count: stats?.preparing_orders ?? 0,  icon: <ChefHat className="w-4 h-4" />,      color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Ready',       count: stats?.ready_orders ?? 0,      icon: <Package className="w-4 h-4" />,      color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'Done Today',  count: stats?.completed_today ?? 0,   icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-blue-600',   bg: 'bg-blue-50' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Dominos Restaurant — live overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.today_orders ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.completed_today ?? 0} completed · {stats?.active_orders ?? 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{fmt(stats?.today_revenue ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg {fmt(stats?.avg_order_value ?? 0)} per order
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kitchen Queue</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.active_orders ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.pending_orders ?? 0} new · {stats?.preparing_orders ?? 0} cooking · {stats?.ready_orders ?? 0} ready
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Loyalty Members</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.loyalty_members ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{stats?.new_loyalty_today ?? 0} joined today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Live Order Pipeline
          </CardTitle>
          <CardDescription>Real-time flow from new order to handover</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {pipeline.map((stage, i) => (
              <div key={stage.label} className="flex items-center gap-2 flex-1">
                <div className={`flex-1 rounded-xl p-4 text-center ${stage.bg}`}>
                  <div className={`flex items-center justify-center gap-1 ${stage.color} mb-1`}>
                    {stage.icon}
                    <span className="text-xs font-medium">{stage.label}</span>
                  </div>
                  <div className={`text-3xl font-bold ${stage.color}`}>{stage.count}</div>
                </div>
                {i < pipeline.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom grid: Recent Orders + Top Products + Income */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentOrders.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">No orders yet today</div>
              ) : recentOrders.map((order: Order) => {
                const sb = statusBadge[order.status] ?? { label: order.status, className: 'bg-gray-100 text-gray-700' }
                const mins = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)
                return (
                  <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-sm font-semibold">#{order.order_number}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.customer_phone || 'Guest'}
                        {order.items && order.items.length > 0 && (
                          <span className="ml-1 text-xs">· {order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{fmt(order.total_amount)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sb.className}`}>{sb.label}</span>
                      <span className="text-xs text-muted-foreground w-10 text-right">{mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h`}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4" />Top Items Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(stats?.top_products ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>
              ) : (stats?.top_products ?? []).map((p, i) => {
                const maxQty = Math.max(...(stats?.top_products ?? []).map(x => x.quantity), 1)
                return (
                  <div key={p.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate flex-1">{p.name}</span>
                      <span className="text-muted-foreground ml-2 shrink-0">{p.quantity}× · {fmt(p.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(p.quantity / maxQty) * 100}%`, opacity: 1 - i * 0.15 }}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Access</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { label: 'Menu',     icon: <Menu className="w-4 h-4" />,    color: 'text-blue-600' },
                { label: 'Staff',    icon: <UserCog className="w-4 h-4" />, color: 'text-purple-600' },
                { label: 'Reports',  icon: <BarChart3 className="w-4 h-4" />, color: 'text-orange-600' },
                { label: 'Loyalty',  icon: <Crown className="w-4 h-4" />,   color: 'text-yellow-600' },
              ].map(item => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <span className={item.color}>{item.icon}</span>
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Income Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />Income Report
              </CardTitle>
              <CardDescription>Revenue breakdown by period</CardDescription>
            </div>
            <div className="flex gap-2">
              {(['today', 'week', 'month'] as const).map(p => (
                <Button
                  key={p}
                  variant={selectedPeriod === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(p)}
                  className="capitalize"
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {incomeLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : income ? (
            <div className="space-y-4">
              {/* Summary row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Orders', value: income.summary.total_orders, color: 'text-blue-600', isNum: true },
                  { label: 'Gross Income',  value: fmt(income.summary.gross_income),  color: 'text-green-600' },
                  { label: 'Tax Collected', value: fmt(income.summary.tax_collected),  color: 'text-orange-600' },
                  { label: 'Net Income',    value: fmt(income.summary.net_income),     color: 'text-purple-600' },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              {income.breakdown && income.breakdown.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-5 gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                    <div>Period</div>
                    <div className="text-center">Orders</div>
                    <div className="text-right">Gross</div>
                    <div className="text-right">Tax</div>
                    <div className="text-right">Net</div>
                  </div>
                  {income.breakdown.slice(0, 10).map((item: IncomeBreakdownItem, idx: number) => (
                    <div key={idx} className="grid grid-cols-5 gap-2 px-4 py-2.5 border-t text-sm hover:bg-muted/20">
                      <div className="font-medium text-xs">{new Date(item.period).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: selectedPeriod === 'today' ? '2-digit' : undefined, minute: selectedPeriod === 'today' ? '2-digit' : undefined })}</div>
                      <div className="text-center">{item.orders}</div>
                      <div className="text-right">{fmt(item.gross)}</div>
                      <div className="text-right text-muted-foreground">{fmt(item.tax)}</div>
                      <div className="text-right font-medium">{fmt(item.net)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">No income data available</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
