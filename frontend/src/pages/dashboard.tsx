import { useState, type ReactNode } from "react"
import { Link } from "react-router"
import { ActivityIcon, BoxesIcon, CheckCircle2Icon, GaugeIcon, PlusIcon } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { EmptyState, PageHeader, timeAgo } from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useMetrics } from "@/lib/queries"

function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon: ReactNode }) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="flex flex-row items-center justify-between px-5">
        <CardDescription>{label}</CardDescription>
        <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
      </CardHeader>
      <CardContent className="px-5">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--popover-foreground)",
  },
  labelStyle: { color: "var(--muted-foreground)" },
}

const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false }

export function DashboardPage() {
  const [days, setDays] = useState(30)
  const { data, isLoading } = useMetrics(days)

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Traffic to your generated APIs"
        actions={
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
          <Skeleton className="h-72 sm:col-span-2 lg:col-span-4" />
        </div>
      ) : data.api_count === 0 ? (
        <EmptyState
          icon={<BoxesIcon />}
          title="No APIs yet"
          description="Connect a data source and create your first API — it takes about a minute."
          action={
            <Button asChild>
              <Link to="/apis/new">
                <PlusIcon /> Create an API
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total calls" value={data.total_calls.toLocaleString()} icon={<ActivityIcon />} sub={`last ${days} days`} />
            <Stat label="Success rate" value={`${data.success_rate}%`} icon={<CheckCircle2Icon />} sub="responses below 400" />
            <Stat label="Avg response" value={`${data.avg_response_ms} ms`} icon={<GaugeIcon />} sub="including database time" />
            <Stat
              label="APIs"
              value={data.api_count}
              icon={<BoxesIcon />}
              sub={`${data.active_api_count} active`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Calls per day</CardTitle>
              <CardDescription>Successful and failed requests</CardDescription>
            </CardHeader>
            <CardContent className="h-72 px-2 sm:px-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily} margin={{ left: -20, right: 8 }}>
                  <defs>
                    <linearGradient id="g-success" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g-failed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" {...axis} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
                  <YAxis {...axis} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Area type="monotone" dataKey="success" name="Success" stroke="var(--chart-1)" fill="url(#g-success)" strokeWidth={2} />
                  <Area type="monotone" dataKey="failed" name="Failed" stroke="var(--chart-2)" fill="url(#g-failed)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Most used APIs</CardTitle>
              </CardHeader>
              <CardContent className="h-56 px-2 sm:px-6">
                {data.top_apis.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No calls in this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.top_apis} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" {...axis} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" {...axis} width={120} />
                      <Tooltip {...tooltipStyle} cursor={{ fill: "var(--accent)" }} />
                      <Bar dataKey="value" name="Calls" fill="var(--chart-3)" radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Status codes</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {data.status_codes.length === 0 && <p className="text-sm text-muted-foreground">No calls in this period.</p>}
                {data.status_codes.map((s) => {
                  const pct = data.total_calls ? (s.value / data.total_calls) * 100 : 0
                  const color = s.name.startsWith("2") ? "bg-success" : s.name.startsWith("4") ? "bg-warning" : "bg-destructive"
                  return (
                    <div key={s.name} className="grid gap-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-mono">{s.name}</span>
                        <span className="text-muted-foreground tabular-nums">{s.value.toLocaleString()}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                {data.slowest_apis.length > 0 && (
                  <div className="mt-3 border-t pt-4">
                    <div className="mb-2 text-sm font-medium">Slowest APIs</div>
                    {data.slowest_apis.map((s) => (
                      <div key={s.name} className="flex justify-between py-1 text-sm">
                        <span className="truncate">{s.name}</span>
                        <span className="text-muted-foreground tabular-nums">{s.value} ms</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent errors</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recent_errors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No errors in this period. 🎉</p>
              ) : (
                <div className="divide-y">
                  {data.recent_errors.map((e, i) => (
                    <div key={i} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                      <Badge variant={e.status_code >= 500 ? "destructive" : "warning"} className="font-mono">
                        {e.status_code}
                      </Badge>
                      <span className="font-medium">{e.api}</span>
                      <span className="flex-1 truncate text-sm text-muted-foreground">{e.message}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(e.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
