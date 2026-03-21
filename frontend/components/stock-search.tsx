'use client'

import { useState, useCallback } from 'react'
import { Search, Plus, X, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StockResult {
  symbol: string
  name: string
  sector: string
  industry: string
  marketCap: number | null
  price: number | null
  change: number | null
  currency?: string
  currencySymbol?: string
}

interface StockSearchProps {
  selectedStocks: string[]
  onAddStock: (symbol: string) => void
  onRemoveStock: (symbol: string) => void
  maxStocks?: number
}

export function StockSearch({
  selectedStocks,
  onAddStock,
  onRemoveStock,
  maxStocks = 5
}: StockSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchStock = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/search-stock?query=${encodeURIComponent(searchQuery)}`)
      let data: { error?: string; results?: StockResult[] }
      try {
        data = await response.json()
      } catch {
        if (!response.ok) {
          setError('Backend unavailable. Run: cd backend && python3 -m uvicorn main:app --reload --port 8000')
          setResults([])
          return
        }
        setError('Invalid response from server')
        setResults([])
        return
      }

      if (!response.ok) {
        setError('Backend unavailable. Run: cd backend && python3 -m uvicorn main:app --reload --port 8000')
        setResults([])
        return
      }

      if (data.error) {
        setError(data.error)
        setResults([])
      } else {
        setResults(data.results || [])
      }
    } catch (err) {
      setError('Backend unavailable. Run: cd backend && python3 -m uvicorn main:app --reload --port 8000')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSearch = () => {
    searchStock(query)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const formatMarketCap = (cap: number | null, currencySymbol = '$') => {
    if (!cap) return 'N/A'
    if (cap >= 1e12) return `${currencySymbol}${(cap / 1e12).toFixed(2)}T`
    if (cap >= 1e9) return `${currencySymbol}${(cap / 1e9).toFixed(2)}B`
    if (cap >= 1e6) return `${currencySymbol}${(cap / 1e6).toFixed(2)}M`
    return `${currencySymbol}${cap.toLocaleString()}`
  }

  return (
    <div className="space-y-5">
      {/* Selected Stocks */}
      {selectedStocks.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {selectedStocks.map((symbol) => (
            <Badge
              key={symbol}
              variant="secondary"
              className="gap-2 py-2 px-4 text-sm font-medium rounded-lg bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
            >
              {symbol}
              <button
                onClick={() => onRemoveStock(symbol)}
                className="ml-0.5 hover:text-destructive transition-colors rounded p-0.5"
                aria-label={`Remove ${symbol}`}
              >
                <X className="size-3.5" />
              </button>
            </Badge>
          ))}
          {selectedStocks.length >= 2 && (
            <Badge variant="outline" className="py-2 px-4 text-sm text-muted-foreground rounded-lg">
              {selectedStocks.length}/{maxStocks} selected
            </Badge>
          )}
        </div>
      )}

      {/* Search Input - Glass style */}
      <div className="flex gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search by symbol (e.g., AAPL, MSFT, GOOGL)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-12 h-12 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors text-base font-medium"
          />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          className="h-12 px-6 rounded-xl font-semibold shadow-lg shadow-primary/20"
        >
          {isLoading ? <Loader2 className="size-5 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-destructive flex items-center justify-center gap-2">
          {error}
        </p>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((stock) => (
            <Card
              key={stock.symbol}
              className="py-4 rounded-xl border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-all"
            >
              <CardContent className="flex items-center justify-between gap-4">
                {(() => {
                  const currencySymbol = stock.currencySymbol || '$'
                  return (
                    <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-lg tabular-nums">{stock.symbol}</span>
                    <Badge variant="outline" className="text-xs rounded-md">
                      {stock.sector || 'N/A'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {stock.name}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-mono font-semibold text-lg tabular-nums">
                      {stock.price !== null && stock.price !== undefined ? `${currencySymbol}${stock.price.toFixed(2)}` : 'N/A'}
                    </p>
                    {stock.change !== null && (
                      <p
                        className={cn(
                          'text-sm flex items-center justify-end gap-1 font-medium tabular-nums',
                          stock.change >= 0 ? 'text-success' : 'text-destructive'
                        )}
                      >
                        {stock.change >= 0 ? (
                          <TrendingUp className="size-4" />
                        ) : (
                          <TrendingDown className="size-4" />
                        )}
                        {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">Market Cap</p>
                    <p className="font-semibold tabular-nums">
                      {formatMarketCap(stock.marketCap, currencySymbol)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={selectedStocks.includes(stock.symbol) ? 'secondary' : 'default'}
                    className="rounded-lg font-medium"
                    onClick={() => {
                      if (selectedStocks.includes(stock.symbol)) {
                        onRemoveStock(stock.symbol)
                      } else {
                        onAddStock(stock.symbol)
                      }
                    }}
                    disabled={
                      !selectedStocks.includes(stock.symbol) &&
                      selectedStocks.length >= maxStocks
                    }
                  >
                    {selectedStocks.includes(stock.symbol) ? (
                      <>
                        <X className="size-4" />
                        Remove
                      </>
                    ) : (
                      <>
                        <Plus className="size-4" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
                    </>
                  )
                })()}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
