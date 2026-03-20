'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { ExternalLink, Newspaper } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

interface NewsArticle {
  title: string
  description: string
  url: string
  publishedAt: string
  sentiment: 'Positive' | 'Neutral' | 'Negative'
  sentimentScore: number
}

interface NewsAnalysisResponse {
  stock: string
  overallSentiment: 'Positive' | 'Neutral' | 'Negative'
  sentimentScore: number
  counts: {
    positive: number
    neutral: number
    negative: number
  }
  articles: NewsArticle[]
  error?: string
}

interface NewsSentimentProps {
  symbols: string[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function getSentimentVariant(sentiment: 'Positive' | 'Neutral' | 'Negative') {
  if (sentiment === 'Positive') return 'success'
  if (sentiment === 'Negative') return 'destructive'
  return 'warning'
}

export function NewsSentiment({ symbols }: NewsSentimentProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(symbols[0] || '')

  useEffect(() => {
    if (symbols.length > 0 && !symbols.includes(selectedSymbol)) {
      setSelectedSymbol(symbols[0])
    }
  }, [selectedSymbol, symbols])

  const { data, isLoading } = useSWR<NewsAnalysisResponse>(
    selectedSymbol ? `/api/news-analysis?stock=${selectedSymbol}` : null,
    fetcher,
    { revalidateOnFocus: false },
  )

  const articles = data?.articles ?? []
  const summaryBadges = useMemo(
    () => [
      { label: 'Overall', value: data?.overallSentiment ?? 'Neutral', variant: getSentimentVariant(data?.overallSentiment ?? 'Neutral') },
      { label: 'Positive', value: String(data?.counts?.positive ?? 0), variant: 'success' as const },
      { label: 'Neutral', value: String(data?.counts?.neutral ?? 0), variant: 'warning' as const },
      { label: 'Negative', value: String(data?.counts?.negative ?? 0), variant: 'destructive' as const },
    ],
    [data],
  )

  if (symbols.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Select stocks to view news sentiment</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>News & Sentiment</CardTitle>
          <CardDescription>Loading recent headlines...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
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
              <Newspaper className="size-5" />
              News & Sentiment
            </CardTitle>
            <CardDescription>
              Recent headlines and sentiment analysis for {selectedSymbol}
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
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {summaryBadges.map((badge) => (
            <Badge key={badge.label} variant={badge.variant}>
              {badge.label}: {badge.value}
            </Badge>
          ))}
        </div>

        {data?.error && (
          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground">
            {data.error}. Add `FINNHUB_API_KEY` or `NEWS_API_KEY` in the frontend environment to enable live news.
          </div>
        )}

        <div className="space-y-3">
          {articles.map((article) => (
            <a
              key={`${article.url}-${article.publishedAt}`}
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-2xl border border-border/50 bg-muted/20 p-4 transition-colors hover:border-primary/30 hover:bg-muted/30"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getSentimentVariant(article.sentiment)}>{article.sentiment}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {dateFormatter.format(new Date(article.publishedAt))}
                    </span>
                  </div>
                  <h4 className="font-medium leading-snug">{article.title}</h4>
                  {article.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{article.description}</p>
                  )}
                </div>
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
              </div>
            </a>
          ))}

          {articles.length === 0 && !data?.error && (
            <div className="rounded-xl border border-dashed border-border/60 py-10 text-center text-sm text-muted-foreground">
              No recent news articles found for this stock.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
