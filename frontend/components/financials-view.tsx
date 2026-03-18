'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'

interface FinancialsViewProps {
  symbols: string[]
}

interface FinancialData {
  symbol: string
  title: string
  periods: string[]
  data: Array<{
    item: string
    [key: string]: string | number | null
  }>
  error?: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const formatNumber = (value: number | string | null): string => {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string') return value
  
  const absValue = Math.abs(value)
  if (absValue >= 1e12) return `${(value / 1e12).toFixed(2)}T`
  if (absValue >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (absValue >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (absValue >= 1e3) return `${(value / 1e3).toFixed(2)}K`
  return value.toFixed(2)
}

function FinancialTable({ data }: { data: FinancialData }) {
  if (data.error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {data.error}
      </div>
    )
  }

  if (!data.data || data.data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <ScrollArea className="h-[500px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-card min-w-[200px]">Item</TableHead>
            {data.periods.map((period) => (
              <TableHead key={period} className="text-right min-w-[120px]">
                {period}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((row, index) => (
            <TableRow key={index}>
              <TableCell className="sticky left-0 bg-card font-medium">
                {row.item}
              </TableCell>
              {data.periods.map((period) => (
                <TableCell key={period} className="text-right font-mono">
                  {formatNumber(row[period] as number | null)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  )
}

export function FinancialsView({ symbols }: FinancialsViewProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(symbols[0] || '')
  const [statementType, setStatementType] = useState<'income' | 'balance' | 'cashflow'>('income')

  const { data, isLoading } = useSWR<FinancialData>(
    selectedSymbol 
      ? `/api/financials/${selectedSymbol}?statement=${statementType}`
      : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  if (symbols.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            Select stocks to view financial statements
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Financial Statements</CardTitle>
            <CardDescription>
              View detailed financial data
            </CardDescription>
          </div>
          <div className="flex gap-2">
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
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={statementType} onValueChange={(v) => setStatementType(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="income">Income Statement</TabsTrigger>
            <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              <TabsContent value="income">
                {data && <FinancialTable data={data} />}
              </TabsContent>
              <TabsContent value="balance">
                {data && <FinancialTable data={data} />}
              </TabsContent>
              <TabsContent value="cashflow">
                {data && <FinancialTable data={data} />}
              </TabsContent>
            </>
          )}
        </Tabs>
      </CardContent>
    </Card>
  )
}
