'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

interface HoldersViewProps {
  symbols: string[]
}

interface HolderData {
  symbol: string
  institutionalHolding: number | null
  insiderHolding: number | null
  institutionalHolders: Array<{
    Holder: string
    Shares: number
    'Date Reported': string
    '% Out': number
    Value: number
  }> | null
  majorHolders: Array<{
    value: string
    description: string
  }> | null
  error?: string
}

const COLORS = [
  'hsl(var(--chart-3))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-4))',
]

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function HoldersView({ symbols }: HoldersViewProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(symbols[0] || '')

  const { data, isLoading } = useSWR<HolderData>(
    selectedSymbol ? `/api/holders/${selectedSymbol}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  if (symbols.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            Select stocks to view holder information
          </p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investor Holdings</CardTitle>
          <CardDescription>Loading holder data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const holdingData = [
    {
      name: 'Institutional',
      value: (data?.institutionalHolding || 0) * 100,
      color: COLORS[0],
    },
    {
      name: 'Insider',
      value: (data?.insiderHolding || 0) * 100,
      color: COLORS[1],
    },
    {
      name: 'Retail & Other',
      value: 100 - ((data?.institutionalHolding || 0) * 100) - ((data?.insiderHolding || 0) * 100),
      color: COLORS[2],
    },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Investor Holdings</CardTitle>
            <CardDescription>
              Ownership breakdown and institutional holders
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
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Pie Chart */}
          <div>
            <h4 className="font-medium mb-4">Ownership Distribution</h4>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={holdingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {holdingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Major Holders Summary */}
            {data?.majorHolders && data.majorHolders.length > 0 && (
              <div className="mt-4 space-y-2">
                {data.majorHolders.map((holder, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{holder.description}</span>
                    <Badge variant="secondary">{holder.value}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Institutional Holders Table */}
          <div>
            <h4 className="font-medium mb-4">Top Institutional Holders</h4>
            {data?.institutionalHolders && data.institutionalHolders.length > 0 ? (
              <div className="max-h-[350px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Holder</TableHead>
                      <TableHead className="text-right">% Held</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.institutionalHolders.slice(0, 10).map((holder, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium truncate max-w-[200px]">
                          {holder.Holder}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {holder['% Out'] 
                            ? `${(holder['% Out'] * 100).toFixed(2)}%`
                            : 'N/A'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No institutional holder data available
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
