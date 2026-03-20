const DEFAULT_ARTICLE_LIMIT = 8

function buildNewsApiUrl(symbol, limit) {
  const params = new URLSearchParams({
    q: symbol,
    language: 'en',
    pageSize: String(limit),
    sortBy: 'publishedAt',
    apiKey: process.env.NEWS_API_KEY ?? '',
  })

  return `https://newsapi.org/v2/everything?${params.toString()}`
}

function buildFinnhubUrl(symbol) {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 14)

  const params = new URLSearchParams({
    symbol,
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    token: process.env.FINNHUB_API_KEY ?? '',
  })

  return `https://finnhub.io/api/v1/company-news?${params.toString()}`
}

function normalizeArticle(article) {
  if (!article?.title || !article?.url) {
    return null
  }

  return {
    title: article.title,
    description: article.description ?? '',
    url: article.url,
    publishedAt: article.publishedAt ?? new Date().toISOString(),
  }
}

async function fetchFromNewsApi(symbol, limit) {
  const response = await fetch(buildNewsApiUrl(symbol, limit), {
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`NewsAPI request failed with status ${response.status}`)
  }

  const payload = await response.json()
  const articles = Array.isArray(payload.articles) ? payload.articles : []

  return articles
    .map((article) =>
      normalizeArticle({
        title: article.title,
        description: article.description,
        url: article.url,
        publishedAt: article.publishedAt,
      }),
    )
    .filter(Boolean)
    .slice(0, limit)
}

async function fetchFromFinnhub(symbol, limit) {
  const response = await fetch(buildFinnhubUrl(symbol), {
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Finnhub request failed with status ${response.status}`)
  }

  const payload = await response.json()
  const articles = Array.isArray(payload) ? payload : []

  return articles
    .map((article) =>
      normalizeArticle({
        title: article.headline,
        description: article.summary,
        url: article.url,
        publishedAt: article.datetime
          ? new Date(article.datetime * 1000).toISOString()
          : undefined,
      }),
    )
    .filter(Boolean)
    .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime())
    .slice(0, limit)
}

export async function fetchStockNews(symbol, limit = DEFAULT_ARTICLE_LIMIT) {
  const normalizedSymbol = symbol.trim().toUpperCase()
  if (!normalizedSymbol) {
    throw new Error('Stock symbol is required')
  }

  if (process.env.FINNHUB_API_KEY) {
    return fetchFromFinnhub(normalizedSymbol, limit)
  }

  if (process.env.NEWS_API_KEY) {
    return fetchFromNewsApi(normalizedSymbol, limit)
  }

  throw new Error('Missing FINNHUB_API_KEY or NEWS_API_KEY')
}
