import Sentiment from 'sentiment'

const analyzer = new Sentiment()

function classifyScore(score) {
  if (score > 1) {
    return 'Positive'
  }

  if (score < -1) {
    return 'Negative'
  }

  return 'Neutral'
}

export function analyzeArticleSentiment(article) {
  const text = `${article.title ?? ''} ${article.description ?? ''}`.trim()
  const analysis = analyzer.analyze(text)
  const sentiment = classifyScore(analysis.score)

  return {
    ...article,
    sentiment,
    sentimentScore: analysis.score,
  }
}

export function analyzeArticles(articles) {
  return articles.map(analyzeArticleSentiment)
}

export function aggregateSentiment(articles) {
  const counts = {
    positive: 0,
    neutral: 0,
    negative: 0,
  }

  const sentimentScore = articles.reduce((score, article) => {
    if (article.sentiment === 'Positive') {
      counts.positive += 1
      return score + 1
    }

    if (article.sentiment === 'Negative') {
      counts.negative += 1
      return score - 1
    }

    counts.neutral += 1
    return score
  }, 0)

  const overallSentiment =
    sentimentScore > 0 ? 'Positive' : sentimentScore < 0 ? 'Negative' : 'Neutral'

  return {
    overallSentiment,
    sentimentScore,
    counts,
  }
}
