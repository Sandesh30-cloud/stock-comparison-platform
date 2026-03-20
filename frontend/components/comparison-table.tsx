'use client'

import useSWR from 'swr'
import { TrendingUp, TrendingDown, Minus, Trophy, Gauge } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ComparisonStock {
  symbol: string
  name: string
  sector: string
  price: number | null
  change: number | null
  marketCap: number | null
  marketCapFormatted: string | null
  revenue: number | null
  revenueFormatted: string | null
  netProfit: number | null
  netProfitFormatted: string | null
  roe: number | null
  pe: number | null
  forwardPE: number | null
  debtToEquity: number | null
  eps: number | null
  dividendYield: number | null
  beta: number | null
  error?: string
}

interface ComparisonTableProps {
  symbols: string[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function getComparisonScore(stock: ComparisonStock): number | null {
  if (stock.roe === null || stock.pe === null || stock.debtToEquity === null) {
    return null
  }

  return stock.roe - stock.pe * 0.2 - stock.debtToEquity * 10
}

export function ComparisonTable({ symbols }: ComparisonTableProps) {
  const { data, error, isLoading } = useSWR<{ comparison: ComparisonStock[] }>(
    symbols.length >= 2 ? `/api/compare?symbols=${symbols.join(',')}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  if (symbols.length < 2) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-muted-foreground">
              Select at least 2 stocks to compare
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Use the search above to add stocks
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Comparison</CardTitle>
          <CardDescription>Loading comparison data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-destructive">Failed to load comparison data</p>
        </CardContent>
      </Card>
    )
  }

  const stocks = data?.comparison || []

  const getChangeIndicator = (value: number | null) => {
    if (value === null) return <Minus className="size-4 text-muted-foreground" />
    if (value > 0) return <TrendingUp className="size-4 text-success" />
    if (value < 0) return <TrendingDown className="size-4 text-destructive" />
    return <Minus className="size-4 text-muted-foreground" />
  }

  const getBestValue = (
    stocks: ComparisonStock[], 
    key: keyof ComparisonStock, 
    higher = true
  ): number | null => {
    const values = stocks
      .map(s => s[key])
      .filter((v): v is number => typeof v === 'number')
    if (values.length === 0) return null
    return higher ? Math.max(...values) : Math.min(...values)
  }

  const bestROE = getBestValue(stocks, 'roe', true)
  const bestPE = getBestValue(stocks, 'pe', false)
  const bestDebtEquity = getBestValue(stocks, 'debtToEquity', false)
  const bestDividendYield = getBestValue(stocks, 'dividendYield', true)
  const bestChange = getBestValue(stocks, 'change', true)
  const bestScore = stocks
    .map((stock) => ({ symbol: stock.symbol, score: getComparisonScore(stock) }))
    .filter((item): item is { symbol: string; score: number } => item.score !== null)
    .reduce<{ symbol: string; score: number } | null>(
      (best, item) => (best === null || item.score > best.score ? item : best),
      null,
    )

  const metrics = [
    { label: 'Current Price', key: 'price' as const, format: (v: number) => `$${v.toFixed(2)}` },
    { label: 'Change %', key: 'change' as const, format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, isChange: true },
    { label: 'Market Cap', key: 'marketCapFormatted' as const, raw: true },
    { label: 'Revenue', key: 'revenueFormatted' as const, raw: true },
    { label: 'Net Profit', key: 'netProfitFormatted' as const, raw: true },
    { label: 'ROE', key: 'roe' as const, format: (v: number) => `${v.toFixed(2)}%`, best: bestROE, higherBetter: true },
    { label: 'P/E Ratio', key: 'pe' as const, format: (v: number) => v.toFixed(2), best: bestPE, higherBetter: false },
    { label: 'Forward P/E', key: 'forwardPE' as const, format: (v: number) => v.toFixed(2) },
    { label: 'Debt/Equity', key: 'debtToEquity' as const, format: (v: number) => v.toFixed(2), best: bestDebtEquity, higherBetter: false },
    { label: 'EPS', key: 'eps' as const, format: (v: number) => `$${v.toFixed(2)}` },
    { label: 'Dividend Yield', key: 'dividendYield' as const, format: (v: number) => `${(v * 100).toFixed(2)}%`, best: bestDividendYield, higherBetter: true },
    { label: 'Beta', key: 'beta' as const, format: (v: number) => v.toFixed(2) },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Comparison</CardTitle>
        <CardDescription>
          Side-by-side comparison of key financial metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 overflow-x-auto">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Trophy className="size-4 text-warning" />
              Best Overall Setup
            </div>
            <p className="mt-2 text-2xl font-semibold">
              {bestScore?.symbol ?? 'N/A'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Based on stronger ROE with lighter valuation and leverage.
            </p>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Gauge className="size-4 text-primary" />
              Strongest Momentum
            </div>
            <p className="mt-2 text-2xl font-semibold">
              {stocks.find((stock) => stock.change === bestChange)?.symbol ?? 'N/A'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Highest current session move among selected stocks.
            </p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-border/50">
              <TableHead className="w-[180px] text-muted-foreground font-medium">Metric</TableHead>
              {stocks.map((stock) => (
                <TableHead key={stock.symbol} className="text-center min-w-[140px]">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="font-bold text-base">{stock.symbol}</span>
                    <Badge variant="outline" className="text-xs font-normal rounded-md">
                      {stock.sector || 'N/A'}
                    </Badge>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Stock Name Row */}
            <TableRow>
              <TableCell className="font-medium">Company</TableCell>
              {stocks.map((stock) => (
                <TableCell key={stock.symbol} className="text-center">
                  <span className="text-sm text-muted-foreground line-clamp-2">
                    {stock.name || stock.symbol}
                  </span>
                </TableCell>
              ))}
            </TableRow>

            {/* Metrics Rows */}
            {metrics.map((metric) => (
              <TableRow key={metric.key}>
                <TableCell className="font-medium">{metric.label}</TableCell>
                {stocks.map((stock) => {
                  const value = stock[metric.key]
                  const isBest = metric.best !== undefined && 
                    typeof value === 'number' && 
                    value === metric.best

                  return (
                    <TableCell 
                      key={stock.symbol} 
                      className={cn(
                        "text-center font-mono tabular-nums",
                        isBest && "bg-success/10 rounded-lg"
                      )}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {metric.isChange && getChangeIndicator(value as number | null)}
                        <span className={cn(
                          metric.isChange && typeof value === 'number' && (
                            value > 0 ? "text-success" : value < 0 ? "text-destructive" : ""
                          ),
                          isBest && "font-bold text-success"
                        )}>
                          {metric.raw 
                            ? (value || 'N/A')
                            : typeof value === 'number' 
                              ? metric.format!(value)
                              : 'N/A'
                          }
                        </span>
                        {isBest && (
                          <Badge variant="success" className="text-[10px] px-1 py-0">
                            Best
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
