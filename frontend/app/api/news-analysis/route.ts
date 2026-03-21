import { NextResponse } from 'next/server'

import { fetchStockNews } from '@/services/newsService.js'
import { aggregateSentiment, analyzeArticles } from '@/utils/sentiment.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const stock = searchParams.get('stock')?.trim().toUpperCase()

  if (!stock) {
    return NextResponse.json({ error: 'Missing stock query parameter' }, { status: 400 })
  }

  try {
    const newsResult = await fetchStockNews(stock, 8)
    if (!Array.isArray(newsResult)) {
      return NextResponse.json({
        stock,
        overallSentiment: 'Neutral',
        sentimentScore: 0,
        counts: { positive: 0, neutral: 0, negative: 0 },
        articles: [],
        error: newsResult.error,
      })
    }

    const articles = analyzeArticles(newsResult)
    const aggregate = aggregateSentiment(articles)

    return NextResponse.json({
      stock,
      overallSentiment: aggregate.overallSentiment,
      sentimentScore: aggregate.sentimentScore,
      counts: aggregate.counts,
      articles,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load news analysis'

    return NextResponse.json(
      {
        stock,
        overallSentiment: 'Neutral',
        sentimentScore: 0,
        counts: { positive: 0, neutral: 0, negative: 0 },
        articles: [],
        error: message,
      },
      { status: 200 },
    )
  }
}
