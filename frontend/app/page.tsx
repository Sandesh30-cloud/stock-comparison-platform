'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { StockSearch } from '@/components/stock-search'
import { ComparisonTable } from '@/components/comparison-table'
import { PriceChart } from '@/components/price-chart'
import { FinancialsView } from '@/components/financials-view'
import { HoldersView } from '@/components/holders-view'
import { Recommendation } from '@/components/recommendation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { BarChart3, LineChart, FileText, Users, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'

export default function HomePage() {
  const [selectedStocks, setSelectedStocks] = useState<string[]>([])

  const handleAddStock = (symbol: string) => {
    if (selectedStocks.includes(symbol)) {
      toast.error('Stock already added')
      return
    }
    if (selectedStocks.length >= 5) {
      toast.error('Maximum 5 stocks can be compared')
      return
    }
    setSelectedStocks([...selectedStocks, symbol])
    toast.success(`${symbol} added to comparison`)
  }

  const handleRemoveStock = (symbol: string) => {
    setSelectedStocks(selectedStocks.filter((s) => s !== symbol))
    toast.info(`${symbol} removed from comparison`)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6 space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-2 py-6">
          <h2 className="text-3xl font-bold tracking-tight text-balance">
            Stock Comparison & Analysis Platform
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-balance">
            Compare stocks side-by-side, analyze financial data, and get intelligent 
            investment insights powered by real-time market data.
          </p>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Select Stocks</CardTitle>
            <CardDescription>
              Search for stocks by symbol and add up to 5 stocks for comparison
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StockSearch
              selectedStocks={selectedStocks}
              onAddStock={handleAddStock}
              onRemoveStock={handleRemoveStock}
              maxStocks={5}
            />
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        {selectedStocks.length > 0 && (
          <Tabs defaultValue="compare" className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="compare" className="gap-1.5">
                <BarChart3 className="size-4" />
                <span className="hidden sm:inline">Comparison</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-1.5">
                <LineChart className="size-4" />
                <span className="hidden sm:inline">Price Charts</span>
              </TabsTrigger>
              <TabsTrigger value="financials" className="gap-1.5">
                <FileText className="size-4" />
                <span className="hidden sm:inline">Financials</span>
              </TabsTrigger>
              <TabsTrigger value="holders" className="gap-1.5">
                <Users className="size-4" />
                <span className="hidden sm:inline">Holders</span>
              </TabsTrigger>
              <TabsTrigger value="recommendation" className="gap-1.5">
                <Lightbulb className="size-4" />
                <span className="hidden sm:inline">Insights</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compare" className="space-y-4">
              <ComparisonTable symbols={selectedStocks} />
            </TabsContent>

            <TabsContent value="charts" className="space-y-4">
              <PriceChart symbols={selectedStocks} />
            </TabsContent>

            <TabsContent value="financials" className="space-y-4">
              <FinancialsView symbols={selectedStocks} />
            </TabsContent>

            <TabsContent value="holders" className="space-y-4">
              <HoldersView symbols={selectedStocks} />
            </TabsContent>

            <TabsContent value="recommendation" className="space-y-4">
              <Recommendation symbols={selectedStocks} />
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {selectedStocks.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="size-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No stocks selected</h3>
              <p className="text-muted-foreground max-w-sm">
                Use the search above to find and add stocks. You can compare up to 5 stocks 
                at once with detailed financial analysis.
              </p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                <span className="text-sm text-muted-foreground">Try searching:</span>
                {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'].map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => handleAddStock(symbol)}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-12">
        <div className="container text-center text-sm text-muted-foreground">
          <p>
            Stock data provided by Yahoo Finance. This platform is for informational purposes only 
            and should not be considered financial advice.
          </p>
        </div>
      </footer>
    </div>
  )
}
