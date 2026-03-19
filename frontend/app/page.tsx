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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, LineChart, FileText, Users, Lightbulb, Sparkles } from 'lucide-react'
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
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-2">
            <Sparkles className="size-4" />
            Smart Investment Insights
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-balance bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text">
            Stock Comparison & Analysis
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-balance text-lg">
            Compare stocks side-by-side, analyze financial data, and get intelligent
            investment insights powered by real-time market data.
          </p>
        </div>

        {/* Search Section */}
        <Card className="border-border/50 shadow-xl shadow-black/5 dark:shadow-black/20 max-w-3xl mx-auto">
          <CardHeader className="pb-4 text-center">
            <CardTitle>Search & Select Stocks</CardTitle>
            <CardDescription className="mx-auto">
              Search by symbol and add up to 5 stocks for comparison
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
          <Tabs defaultValue="compare" className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-1 p-1.5 rounded-xl bg-muted/50 border border-border/50 justify-center mx-auto w-fit">
              <TabsTrigger value="compare" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
                <BarChart3 className="size-4" />
                <span className="hidden sm:inline">Comparison</span>
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
                <LineChart className="size-4" />
                <span className="hidden sm:inline">Price Charts</span>
              </TabsTrigger>
              <TabsTrigger value="financials" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
                <FileText className="size-4" />
                <span className="hidden sm:inline">Financials</span>
              </TabsTrigger>
              <TabsTrigger value="holders" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
                <Users className="size-4" />
                <span className="hidden sm:inline">Holders</span>
              </TabsTrigger>
              <TabsTrigger value="recommendation" className="gap-2 rounded-lg data-[state=active]:shadow-sm">
                <Lightbulb className="size-4" />
                <span className="hidden sm:inline">Insights</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compare" className="space-y-4 mt-0">
              <ComparisonTable symbols={selectedStocks} />
            </TabsContent>

            <TabsContent value="charts" className="space-y-4 mt-0">
              <PriceChart symbols={selectedStocks} />
            </TabsContent>

            <TabsContent value="financials" className="space-y-4 mt-0">
              <FinancialsView symbols={selectedStocks} />
            </TabsContent>

            <TabsContent value="holders" className="space-y-4 mt-0">
              <HoldersView symbols={selectedStocks} />
            </TabsContent>

            <TabsContent value="recommendation" className="space-y-4 mt-0">
              <Recommendation symbols={selectedStocks} />
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {selectedStocks.length === 0 && (
          <Card className="border-dashed border-2 border-border/50 bg-muted/20 max-w-2xl mx-auto">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <BarChart3 className="size-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">No stocks selected</h3>
              <p className="text-muted-foreground max-w-md mt-2">
                Use the search above to find and add stocks. Compare up to 5 stocks
                at once with detailed financial analysis and AI-powered insights.
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                <span className="text-sm text-muted-foreground">Try:</span>
                {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'].map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => handleAddStock(symbol)}
                    className="text-sm font-medium px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
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
      <footer className="border-t border-border/50 py-8 mt-16">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Stock data provided by Yahoo Finance. This platform is for informational purposes only
            and should not be considered financial advice.
          </p>
        </div>
      </footer>
    </div>
  )
}
