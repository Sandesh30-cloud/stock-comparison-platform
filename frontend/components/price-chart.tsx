'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface PriceChartProps {
  symbols: string[]
}

const PERIODS = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '2Y', value: '2y' },
  { label: '5Y', value: '5y' },
]

// High-contrast colors for dark mode visibility
const COLORS = [
  '#14b8a6', // Teal
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
]

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function PriceChart({ symbols }: PriceChartProps) {
  const [period, setPeriod] = useState('1y')

  // Fetch data for all symbols
  const { data: priceData, isLoading } = useSWR(
    symbols.length > 0 
      ? symbols.map(s => `/api/price-history/${s}?period=${period}`)
      : null,
    async (urls) => {
      const results = await Promise.all(urls.map((url: string) => fetcher(url)))
      return results
    },
    { revalidateOnFocus: false }
  )

  if (symbols.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            Select stocks to view price chart
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Price Comparison</CardTitle>
          <CardDescription>Loading price data...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  // Merge data from all symbols
  const mergedData: Record<string, Record<string, number | string>> = {}
  
  priceData?.forEach((stockData: { symbol: string; data: Array<{ date: string; close: number }> }, index: number) => {
    if (stockData?.data) {
      const symbol = symbols[index]
      stockData.data.forEach((point: { date: string; close: number }) => {
        if (!mergedData[point.date]) {
          mergedData[point.date] = { date: point.date }
        }
        mergedData[point.date][symbol] = point.close
      })
    }
  })

  const chartData = Object.values(mergedData).sort((a, b) => 
    new Date(a.date as string).getTime() - new Date(b.date as string).getTime()
  )

  // Normalize data to percentage change for comparison
  const normalizedData = chartData.map((point, index) => {
    const normalized: Record<string, number | string> = { date: point.date }
    symbols.forEach((symbol) => {
      if (chartData[0][symbol] && point[symbol]) {
        const firstValue = chartData[0][symbol] as number
        const currentValue = point[symbol] as number
        normalized[symbol] = ((currentValue - firstValue) / firstValue) * 100
      }
    })
    return normalized
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Price Comparison</CardTitle>
            <CardDescription>
              Normalized price change over time (%)
            </CardDescription>
          </div>
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border/50 w-fit">
            {PERIODS.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={period === p.value ? 'default' : 'ghost'}
                className="rounded-md"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[420px] w-full -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={normalizedData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(var(--popover))',
                  border: '1px solid oklch(var(--border))',
                  borderRadius: '12px',
                }}
                labelStyle={{ color: 'oklch(var(--foreground))' }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              />
              <Legend wrapperStyle={{ paddingTop: 16 }} iconType="circle" iconSize={10} />
              {symbols.map((symbol, index) => (
                <Line
                  key={symbol}
                  type="monotone"
                  dataKey={symbol}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={3}
                  dot={{ r: 3, fill: COLORS[index % COLORS.length], strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
