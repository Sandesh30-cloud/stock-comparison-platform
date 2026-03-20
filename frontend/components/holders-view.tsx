'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LabelList } from 'recharts'
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
  mutualFundHolders: Array<{
    Holder: string
    Shares: number
    'Date Reported': string
    pctHeld?: number
    pctChange?: number
    Value: number
  }> | null
  error?: string
}

// High-contrast colors for dark mode visibility
const COLORS = [
  '#14b8a6', // Teal - Institutional
  '#f43f5e', // Rose - Insider
  '#f59e0b', // Amber - Retail & Other
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

  const instPercent = (data?.institutionalHolding ?? 0) * 100
  const insiderPercent = (data?.insiderHolding ?? 0) * 100
  const retailPercent = Math.max(0, 100 - instPercent - insiderPercent)

  const holdingData = [
    { name: 'Institutional', value: instPercent, color: COLORS[0] },
    { name: 'Insider', value: insiderPercent, color: COLORS[1] },
    { name: 'Retail & Other', value: retailPercent, color: COLORS[2] },
  ].filter((d) => d.value > 0.1) // Hide near-zero segments for clarity

  const hasHoldingData = holdingData.length > 0

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
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          {/* Pie Chart */}
          <div>
            <h4 className="font-medium mb-4">Ownership Distribution</h4>
            {hasHoldingData ? (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={holdingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      minAngle={5}
                    >
                      {holdingData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="#334155"
                          strokeWidth={2}
                        >
                          <LabelList
                            dataKey="value"
                            position="outside"
                            formatter={(v: number) => `${v.toFixed(1)}%`}
                            style={{ fill: '#f8fafc', fontSize: 13, fontWeight: 600 }}
                          />
                        </Cell>
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f8fafc',
                      }}
                      formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                      labelFormatter={(label) => ''}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={14}
                      wrapperStyle={{ paddingTop: 16 }}
                      formatter={(value, entry: { payload?: { value?: number } }) => (
                        <span className="text-foreground text-sm">
                          {value}: {(entry?.payload?.value ?? 0).toFixed(1)}%
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[320px] flex items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20">
                <p className="text-sm text-muted-foreground">No ownership data available</p>
              </div>
            )}

            {/* Summary breakdown */}
            {hasHoldingData && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {holdingData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <span className="text-muted-foreground">{d.name}:</span>
                    <span className="font-semibold tabular-nums">{d.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}

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
          <div className="space-y-6">
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

            <div>
              <h4 className="font-medium mb-4">Top Mutual Fund Holders</h4>
              {data?.mutualFundHolders && data.mutualFundHolders.length > 0 ? (
                <div className="max-h-[320px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fund</TableHead>
                        <TableHead className="text-right">% Held</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.mutualFundHolders.slice(0, 10).map((holder, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium truncate max-w-[200px]">
                            {holder.Holder}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {typeof holder.pctHeld === 'number'
                              ? `${(holder.pctHeld * 100).toFixed(2)}%`
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No mutual fund holder data available
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
