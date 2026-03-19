'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  MinusCircle,
  BarChart3
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface RecommendationProps {
  symbols: string[]
}

interface Signal {
  type: 'positive' | 'negative' | 'neutral' | 'warning'
  message: string
}

interface RecommendationData {
  symbol: string
  name: string
  longTerm: {
    recommendation: string
    score: number
    signals: Signal[]
  }
  shortTerm: {
    recommendation: string
    score: number
    signals: Signal[]
  }
  metrics: {
    pe: number | null
    forwardPE: number | null
    roe: number | null
    debtToEquity: number | null
    dividendYield: number | null
    beta: number | null
    priceChange1m: number | null
    priceChange3m: number | null
    volumeTrend: number | null
  }
  error?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const getRecommendationColor = (recommendation: string) => {
  switch (recommendation) {
    case 'Strong Buy':
      return 'bg-success text-success-foreground'
    case 'Buy':
      return 'bg-success/80 text-success-foreground'
    case 'Hold':
      return 'bg-warning text-warning-foreground'
    case 'Sell':
      return 'bg-destructive/80 text-destructive-foreground'
    case 'Strong Sell':
      return 'bg-destructive text-destructive-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

const getSignalIcon = (type: string) => {
  switch (type) {
    case 'positive':
      return <CheckCircle className="size-4 text-success" />
    case 'negative':
      return <XCircle className="size-4 text-destructive" />
    case 'warning':
      return <AlertTriangle className="size-4 text-warning" />
    default:
      return <MinusCircle className="size-4 text-muted-foreground" />
  }
}

function MetricCard({ label, value, format }: { label: string; value: number | null; format?: (v: number) => string }) {
  const formatValue = format || ((v: number) => v.toFixed(2))
  
  return (
    <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="font-mono font-semibold mt-1 tabular-nums">
        {value !== null ? formatValue(value) : 'N/A'}
      </p>
    </div>
  )
}

export function Recommendation({ symbols }: RecommendationProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(symbols[0] || '')

  const { data, isLoading } = useSWR<RecommendationData>(
    selectedSymbol ? `/api/recommendation/${selectedSymbol}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  if (symbols.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            Select stocks to view recommendations
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Smart Recommendations</CardTitle>
          <CardDescription>Loading analysis...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data?.error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-destructive">{data.error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5" />
              Smart Recommendations
            </CardTitle>
            <CardDescription>
              AI-powered investment insights for {data?.name || selectedSymbol}
            </CardDescription>
          </div>
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select stock" />
            </SelectTrigger>
            <SelectContent>
              {symbols.map((symbol) => (
                <SelectItem key={symbol} value={symbol}>
                  {symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recommendation Badges */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Long Term */}
          <div className="border border-border/50 rounded-xl p-5 bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-5 text-muted-foreground" />
                <h4 className="font-medium">Long-Term Outlook</h4>
              </div>
              <Badge className={cn("text-sm px-3 py-1", getRecommendationColor(data?.longTerm?.recommendation || ''))}>
                {data?.longTerm?.recommendation || 'N/A'}
              </Badge>
            </div>
            <div className="space-y-2">
              {data?.longTerm?.signals?.map((signal, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  {getSignalIcon(signal.type)}
                  <span className="text-muted-foreground">{signal.message}</span>
                </div>
              ))}
              {(!data?.longTerm?.signals || data.longTerm.signals.length === 0) && (
                <p className="text-sm text-muted-foreground">No signals available</p>
              )}
            </div>
          </div>

          {/* Short Term */}
          <div className="border border-border/50 rounded-xl p-5 bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="size-5 text-muted-foreground" />
                <h4 className="font-medium">Short-Term Outlook</h4>
              </div>
              <Badge className={cn("text-sm px-3 py-1", getRecommendationColor(data?.shortTerm?.recommendation || ''))}>
                {data?.shortTerm?.recommendation || 'N/A'}
              </Badge>
            </div>
            <div className="space-y-2">
              {data?.shortTerm?.signals?.map((signal, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  {getSignalIcon(signal.type)}
                  <span className="text-muted-foreground">{signal.message}</span>
                </div>
              ))}
              {(!data?.shortTerm?.signals || data.shortTerm.signals.length === 0) && (
                <p className="text-sm text-muted-foreground">No signals available</p>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div>
          <h4 className="font-medium mb-3">Key Metrics</h4>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
            <MetricCard label="P/E Ratio" value={data?.metrics?.pe || null} />
            <MetricCard label="Forward P/E" value={data?.metrics?.forwardPE || null} />
            <MetricCard label="ROE" value={data?.metrics?.roe || null} format={(v) => `${v.toFixed(1)}%`} />
            <MetricCard label="D/E Ratio" value={data?.metrics?.debtToEquity || null} />
            <MetricCard label="Beta" value={data?.metrics?.beta || null} />
            <MetricCard 
              label="1M Change" 
              value={data?.metrics?.priceChange1m || null} 
              format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} 
            />
            <MetricCard 
              label="3M Change" 
              value={data?.metrics?.priceChange3m || null} 
              format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} 
            />
            <MetricCard 
              label="Vol Trend" 
              value={data?.metrics?.volumeTrend || null} 
              format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} 
            />
            <MetricCard 
              label="Div Yield" 
              value={data?.metrics?.dividendYield || null} 
              format={(v) => `${(v * 100).toFixed(2)}%`} 
            />
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground border-t pt-4">
          Disclaimer: These recommendations are based on algorithmic analysis of financial metrics and historical data. 
          They should not be considered as financial advice. Always conduct your own research before making investment decisions.
        </p>
      </CardContent>
    </Card>
  )
}
