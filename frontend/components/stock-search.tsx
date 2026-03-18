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
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
        setResults([])
      } else {
        setResults(data.results || [])
      }
    } catch (err) {
      setError('Failed to search stocks')
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

  const formatMarketCap = (cap: number | null) => {
    if (!cap) return 'N/A'
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`
    return `$${cap.toLocaleString()}`
  }

  return (
    <div className="space-y-4">
      {/* Selected Stocks */}
      {selectedStocks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedStocks.map((symbol) => (
            <Badge
              key={symbol}
              variant="secondary"
              className="gap-1.5 py-1.5 px-3 text-sm"
            >
              {symbol}
              <button
                onClick={() => onRemoveStock(symbol)}
                className="ml-1 hover:text-destructive transition-colors"
                aria-label={`Remove ${symbol}`}
              >
                <X className="size-3.5" />
              </button>
            </Badge>
          ))}
          {selectedStocks.length >= 2 && (
            <Badge variant="outline" className="py-1.5 px-3 text-sm text-muted-foreground">
              {selectedStocks.length}/{maxStocks} stocks selected
            </Badge>
          )}
        </div>
      )}

      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by stock symbol (e.g., AAPL, MSFT, GOOGL)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={isLoading || !query.trim()}>
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((stock) => (
            <Card key={stock.symbol} className="py-3">
              <CardContent className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{stock.symbol}</span>
                    <Badge variant="outline" className="text-xs">
                      {stock.sector || 'N/A'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {stock.name}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono font-medium">
                      ${stock.price?.toFixed(2) || 'N/A'}
                    </p>
                    {stock.change !== null && (
                      <p className={cn(
                        "text-sm flex items-center justify-end gap-1",
                        stock.change >= 0 ? "text-success" : "text-destructive"
                      )}>
                        {stock.change >= 0 ? (
                          <TrendingUp className="size-3" />
                        ) : (
                          <TrendingDown className="size-3" />
                        )}
                        {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Market Cap</p>
                    <p className="font-medium text-foreground">
                      {formatMarketCap(stock.marketCap)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={selectedStocks.includes(stock.symbol) ? "secondary" : "default"}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
