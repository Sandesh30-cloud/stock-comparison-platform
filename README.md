# StockAnalyzer

StockAnalyzer is a full-stack stock analysis dashboard built with a FastAPI backend and a Next.js frontend. It supports multi-stock comparison, normalized financial statement views, price charts, holder analysis, sentiment-powered news analysis, and rule-based investment insights.

## Features

- Multi-stock comparison for up to 5 symbols
- Stock search with exchange suffix discovery such as `.NS`, `.BO`, `.L`, and `.TO`
- Historical price charts
- Financial statements with standardized display scale
- Institutional, insider, and mutual fund holder views
- News fetching with sentiment analysis
- Rule-based recommendation panel using metrics, trend, and news sentiment
- Currency-aware display for non-US stocks

## Tech Stack

- Frontend: Next.js 16, React 19, Tailwind CSS, Radix UI, SWR, Recharts
- Backend: FastAPI, yfinance, pandas, numpy
- News sentiment: Axios + `sentiment`

## Demo Video

Watch the project demo here:

[StockAnalyzer Demo Video](https://youtu.be/5ghnGrWl-SA?si=wDY5NcEY-S8k7ASw)

## Project Structure

```text
StockAnalyzer/
├── backend/
│   ├── main.py
│   └── pyproject.toml
├── frontend/
│   ├── app/
│   ├── components/
│   ├── services/
│   ├── utils/
│   └── package.json
├── vercel.json
└── README.md
```

## Setup

### 1. Backend

```bash
cd backend
pip install -e .
python3 -m uvicorn main:app --reload --port 8000
```

Backend requirements:

- Python 3.12+

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

The news tab and sentiment analysis route require one of the following API keys in the frontend environment:

```bash
FINNHUB_API_KEY=your_key_here
```

or

```bash
NEWS_API_KEY=your_key_here
```

If no key is provided, the app stays functional and shows a graceful message for the news section.

## Available UI Tabs

- `Comparison`
- `Price Charts`
- `Financials`
- `Holders`
- `Insights`
- `News & Sentiment`

## Backend API Overview

Core routes in `backend/main.py`:

- `GET /health`
- `GET /search-stock?query=AAPL`
- `GET /stock-info/{symbol}`
- `GET /compare?symbols=AAPL,MSFT`
- `GET /financials/{symbol}?statement=income`
- `GET /holders/{symbol}`
- `GET /price-history/{symbol}?period=1y`
- `GET /range-analysis/{symbol}`
- `GET /recommendation/{symbol}`
- `GET /screener`

Frontend server route:

- `GET /api/news-analysis?stock=AAPL`

## Data Normalization Notes

Several normalization fixes are built into the current version:

- Dividend yield is normalized before display
- Debt-to-equity and ROE use balance-sheet fallbacks when Yahoo summary fields are incomplete
- 52-week range metrics are computed from 1-year OHLC history instead of Yahoo summary fields
- Financial statements are standardized to a fixed display scale of `B`
- Currency symbols are attached per stock, including `₹` for INR symbols

## News and Sentiment

The news pipeline works like this:

1. Fetch recent news from Finnhub or NewsAPI
2. Run article text through the `sentiment` package
3. Classify each article as `Positive`, `Neutral`, or `Negative`
4. Aggregate sentiment into an overall news signal
5. Blend that signal into the recommendation view

Current decision rule in the dashboard:

- Positive sentiment + Uptrend => `BUY`
- Negative sentiment + Downtrend => `SELL`
- Otherwise => `HOLD`

## Notes on Accuracy

This project improves data accuracy as much as possible while still using `yfinance`, but some limitations remain:

- Yahoo summary fields can be incomplete or inconsistent for some stocks
- Some metrics are better sourced from financial statements than from `info`
- News availability depends on the configured provider and API limits

Where accuracy mattered most, the app now prefers:

- historical OHLC data for 52-week calculations
- balance-sheet rows for equity and debt-driven metrics
- normalized financial statement scaling

## Build Verification

Frontend production build:

```bash
cd frontend
npm run build
```

Backend syntax check:

```bash
python3 -m py_compile backend/main.py
```

## Deployment

The repository includes a `vercel.json` that maps:

- `frontend/` to `/`
- `backend/main.py` to `/api`

## Future Improvements

- Backtesting engine
- Real-time streaming pipeline
- LLM-based stock summaries
- Export and reporting
- Sector and factor-based screening
