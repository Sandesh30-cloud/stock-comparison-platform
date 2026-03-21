import asyncio
import fastapi
import fastapi.middleware.cors
from typing import Optional
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json

app = fastapi.FastAPI(title="Stock Analysis API")

app.add_middleware(
    fastapi.middleware.cors.CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


STATEMENT_SCALE_LABEL = "B"
STATEMENT_SCALE_DIVISOR = 1e9


def safe_get(info: dict, key: str, default=None):
    """Safely get value from dict, handling None and NaN"""
    value = info.get(key, default)
    if value is None:
        return default
    if isinstance(value, float) and (np.isnan(value) or np.isinf(value)):
        return default
    return value


def format_number(value, decimals=2):
    """Format number for display"""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if abs(value) >= 1e12:
            return f"{value/1e12:.{decimals}f}T"
        elif abs(value) >= 1e9:
            return f"{value/1e9:.{decimals}f}B"
        elif abs(value) >= 1e6:
            return f"{value/1e6:.{decimals}f}M"
        elif abs(value) >= 1e3:
            return f"{value/1e3:.{decimals}f}K"
        return round(value, decimals)
    return value


def choose_statement_scale(df: pd.DataFrame) -> dict[str, float | str]:
    """Use a fixed millions scale for all financial statements."""
    return {"label": STATEMENT_SCALE_LABEL, "divisor": float(STATEMENT_SCALE_DIVISOR)}


def format_number_with_scale(value, scale_divisor=1.0, decimals=2):
    """Format a numeric value using a preselected common scale."""
    if value is None:
        return None

    if isinstance(value, (int, float)):
        return round(value / scale_divisor, decimals)

    return value


def get_currency_symbol(currency: Optional[str]) -> str:
    """Map common Yahoo currency codes to display symbols."""
    mapping = {
        "USD": "$",
        "INR": "₹",
        "EUR": "EUR",
        "GBP": "GBP",
        "JPY": "JPY",
        "CAD": "CAD",
        "AUD": "AUD",
    }
    return mapping.get((currency or "").upper(), currency or "")


def get_latest_statement_value(df: Optional[pd.DataFrame], row_names: list[str]):
    """Return the latest non-null value for the first matching financial statement row."""
    if df is None or df.empty:
        return None

    for row_name in row_names:
        if row_name in df.index:
            series = df.loc[row_name].dropna()
            if not series.empty:
                return float(series.iloc[0])

    return None


def get_debt_to_equity(info: dict, balance_sheet: Optional[pd.DataFrame] = None):
    """Return debt-to-equity as a ratio, not a percentage-scaled vendor value."""
    total_equity = get_latest_statement_value(
        balance_sheet,
        [
            "Stockholders Equity",
            "Total Equity Gross Minority Interest",
            "Common Stock Equity",
        ],
    )
    if total_equity is None:
        total_equity = safe_get(info, "totalStockholderEquity")

    total_debt = get_latest_statement_value(balance_sheet, ["Total Debt", "Net Debt"])
    if total_debt is None:
        total_debt = safe_get(info, "totalDebt")

    if total_debt is not None and total_equity and total_equity != 0:
        return round(total_debt / total_equity, 2)

    raw_debt_to_equity = safe_get(info, "debtToEquity")
    if raw_debt_to_equity is None:
        return None

    normalized = raw_debt_to_equity / 100 if raw_debt_to_equity > 10 else raw_debt_to_equity
    return round(normalized, 2)


def get_dividend_yield(info: dict):
    """Return dividend yield as a decimal fraction for consistent frontend formatting."""
    trailing_yield = safe_get(info, "trailingAnnualDividendYield")
    if trailing_yield is not None:
        normalized = trailing_yield / 100 if trailing_yield > 1 else trailing_yield
        return round(normalized, 4)

    dividend_rate = safe_get(info, "trailingAnnualDividendRate")
    if dividend_rate is None:
        dividend_rate = safe_get(info, "dividendRate")

    price = safe_get(info, "currentPrice")
    if price is None:
        price = safe_get(info, "regularMarketPrice")

    if dividend_rate is not None and price not in (None, 0):
        return round(dividend_rate / price, 4)

    dividend_yield = safe_get(info, "dividendYield")
    if dividend_yield is None:
        return None

    normalized = dividend_yield / 100
    return round(normalized, 4)


def get_roe(info: dict, balance_sheet: Optional[pd.DataFrame] = None):
    """Return ROE as a percentage, normalizing vendor values when needed."""
    net_income = safe_get(info, "netIncomeToCommon")
    total_equity = get_latest_statement_value(
        balance_sheet,
        [
            "Stockholders Equity",
            "Total Equity Gross Minority Interest",
            "Common Stock Equity",
        ],
    )
    if total_equity is None:
        total_equity = safe_get(info, "totalStockholderEquity")

    if net_income is not None and total_equity and total_equity != 0:
        return round((net_income / total_equity) * 100, 2)

    raw_roe = safe_get(info, "returnOnEquity")
    if raw_roe is None:
        return None

    normalized = raw_roe * 100 if abs(raw_roe) <= 1 else raw_roe
    return round(normalized, 2)


def get_one_year_history(ticker: yf.Ticker) -> pd.DataFrame:
    """Fetch one year of unadjusted OHLCV history."""
    return ticker.history(period="1y", auto_adjust=False)


def compute_52_week_range(hist: pd.DataFrame):
    """Compute 52-week range metrics from 1-year OHLC history only."""
    if hist.empty:
        return None

    required_columns = {"High", "Low", "Close"}
    if not required_columns.issubset(hist.columns):
        return None

    high_series = hist["High"].dropna()
    low_series = hist["Low"].dropna()
    close_series = hist["Close"].dropna()

    if high_series.empty or low_series.empty or close_series.empty:
        return None

    high_52w = float(high_series.max())
    low_52w = float(low_series.min())
    current = float(close_series.iloc[-1])

    if high_52w <= low_52w:
        return None
    if high_52w < current:
        return None
    if low_52w > current:
        return None

    range_position = (current - low_52w) / (high_52w - low_52w)
    drawdown = (current - high_52w) / high_52w

    return {
        "high_52w": round(high_52w, 2),
        "low_52w": round(low_52w, 2),
        "range_position_percent": round(range_position * 100, 2),
        "drawdown_percent": round(drawdown * 100, 2),
    }


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def _search_stock_sync(query: str) -> dict:
    """Synchronous stock search (runs in thread pool)"""
    ticker = yf.Ticker(query.upper())
    info = ticker.info

    if not info or info.get("regularMarketPrice") is None:
        suffixes = ["", ".NS", ".BO", ".L", ".TO"]
        results = []
        for suffix in suffixes:
            try:
                test_ticker = yf.Ticker(f"{query.upper()}{suffix}")
                test_info = test_ticker.info
                if test_info and test_info.get("regularMarketPrice"):
                    currency = safe_get(test_info, "currency", "USD")
                    results.append({
                        "symbol": f"{query.upper()}{suffix}",
                        "name": safe_get(test_info, "longName", query.upper()),
                        "sector": safe_get(test_info, "sector", "N/A"),
                        "industry": safe_get(test_info, "industry", "N/A"),
                        "marketCap": safe_get(test_info, "marketCap"),
                        "price": safe_get(test_info, "regularMarketPrice"),
                        "change": safe_get(test_info, "regularMarketChangePercent"),
                        "currency": currency,
                        "currencySymbol": get_currency_symbol(currency),
                    })
            except Exception:
                continue
        return {"results": results}

    currency = safe_get(info, "currency", "USD")
    return {
        "results": [{
            "symbol": query.upper(),
            "name": safe_get(info, "longName", query.upper()),
            "sector": safe_get(info, "sector", "N/A"),
            "industry": safe_get(info, "industry", "N/A"),
            "marketCap": safe_get(info, "marketCap"),
            "price": safe_get(info, "regularMarketPrice"),
            "change": safe_get(info, "regularMarketChangePercent"),
            "currency": currency,
            "currencySymbol": get_currency_symbol(currency),
        }]
    }


@app.get("/search-stock")
async def search_stock(query: str):
    """Search for stocks by name or symbol"""
    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(_search_stock_sync, query),
            timeout=15.0,
        )
        return result
    except asyncio.TimeoutError:
        return {"results": [], "error": "Search timed out. Try a different symbol."}
    except Exception as e:
        return {"results": [], "error": str(e)}


@app.get("/stock-info/{symbol}")
async def get_stock_info(symbol: str):
    """Get detailed stock information"""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        hist = get_one_year_history(ticker)
        range_metrics = compute_52_week_range(hist)
        
        return {
            "symbol": symbol,
            "name": safe_get(info, "longName", symbol),
            "currency": safe_get(info, "currency", "USD"),
            "currencySymbol": get_currency_symbol(safe_get(info, "currency", "USD")),
            "sector": safe_get(info, "sector", "N/A"),
            "industry": safe_get(info, "industry", "N/A"),
            "description": safe_get(info, "longBusinessSummary", ""),
            "website": safe_get(info, "website", ""),
            "marketCap": safe_get(info, "marketCap"),
            "marketCapFormatted": format_number(safe_get(info, "marketCap")),
            "price": safe_get(info, "regularMarketPrice"),
            "previousClose": safe_get(info, "previousClose"),
            "open": safe_get(info, "open"),
            "dayHigh": safe_get(info, "dayHigh"),
            "dayLow": safe_get(info, "dayLow"),
            "fiftyTwoWeekHigh": range_metrics["high_52w"] if range_metrics else None,
            "fiftyTwoWeekLow": range_metrics["low_52w"] if range_metrics else None,
            "rangePositionPercent": range_metrics["range_position_percent"] if range_metrics else None,
            "drawdownPercent": range_metrics["drawdown_percent"] if range_metrics else None,
            "volume": safe_get(info, "volume"),
            "avgVolume": safe_get(info, "averageVolume"),
            "pe": safe_get(info, "trailingPE"),
            "forwardPE": safe_get(info, "forwardPE"),
            "eps": safe_get(info, "trailingEps"),
            "dividend": get_dividend_yield(info),
            "beta": safe_get(info, "beta"),
            "change": safe_get(info, "regularMarketChangePercent"),
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/compare")
async def compare_stocks(symbols: str):
    """Compare multiple stocks (comma-separated)"""
    try:
        symbol_list = [s.strip().upper() for s in symbols.split(",")][:5]  # Max 5 stocks
        comparison = []
        
        for symbol in symbol_list:
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                hist = get_one_year_history(ticker)
                range_metrics = compute_52_week_range(hist)
                balance_sheet = ticker.balance_sheet
                
                # Get financial data
                revenue = safe_get(info, "totalRevenue")
                net_income = safe_get(info, "netIncomeToCommon")
                total_equity = safe_get(info, "totalStockholderEquity")
                
                roe = get_roe(info, balance_sheet)
                debt_to_equity = get_debt_to_equity(info, balance_sheet)
                dividend_yield = get_dividend_yield(info)
                
                comparison.append({
                    "symbol": symbol,
                    "name": safe_get(info, "longName", symbol),
                    "currency": safe_get(info, "currency", "USD"),
                    "currencySymbol": get_currency_symbol(safe_get(info, "currency", "USD")),
                    "sector": safe_get(info, "sector", "N/A"),
                    "price": safe_get(info, "regularMarketPrice"),
                    "change": safe_get(info, "regularMarketChangePercent"),
                    "marketCap": safe_get(info, "marketCap"),
                    "marketCapFormatted": format_number(safe_get(info, "marketCap")),
                    "revenue": revenue,
                    "revenueFormatted": format_number(revenue),
                    "netProfit": net_income,
                    "netProfitFormatted": format_number(net_income),
                    "roe": roe,
                    "pe": safe_get(info, "trailingPE"),
                    "forwardPE": safe_get(info, "forwardPE"),
                    "debtToEquity": debt_to_equity,
                    "eps": safe_get(info, "trailingEps"),
                    "dividendYield": dividend_yield,
                    "beta": safe_get(info, "beta"),
                    "fiftyTwoWeekHigh": range_metrics["high_52w"] if range_metrics else None,
                    "fiftyTwoWeekLow": range_metrics["low_52w"] if range_metrics else None,
                    "rangePositionPercent": range_metrics["range_position_percent"] if range_metrics else None,
                    "drawdownPercent": range_metrics["drawdown_percent"] if range_metrics else None,
                })
            except Exception as e:
                comparison.append({
                    "symbol": symbol,
                    "error": str(e)
                })
        
        return {"comparison": comparison}
    except Exception as e:
        return {"error": str(e)}


@app.get("/financials/{symbol}")
async def get_financials(symbol: str, statement: str = "income"):
    """Get financial statements (income, balance, cashflow)"""
    try:
        ticker = yf.Ticker(symbol)
        
        if statement == "income":
            df = ticker.income_stmt
            title = "Income Statement"
        elif statement == "balance":
            df = ticker.balance_sheet
            title = "Balance Sheet"
        elif statement == "cashflow":
            df = ticker.cashflow
            title = "Cash Flow Statement"
        else:
            return {"error": "Invalid statement type. Use: income, balance, or cashflow"}
        
        if df is None or df.empty:
            return {"error": "No financial data available"}

        scale = choose_statement_scale(df)
        currency = safe_get(ticker.info, "currency", "USD")
        
        # Convert DataFrame to dict
        data = []
        for idx in df.index:
            row = {"item": str(idx)}
            for col in df.columns:
                value = df.loc[idx, col]
                if pd.notna(value):
                    row[str(col.date())] = float(value)
                    row[f"{str(col.date())}Formatted"] = format_number_with_scale(float(value), scale["divisor"])
                else:
                    row[str(col.date())] = None
                    row[f"{str(col.date())}Formatted"] = None
            data.append(row)
        
        periods = [str(col.date()) for col in df.columns]
        
        return {
            "symbol": symbol,
            "title": title,
            "currency": currency,
            "currencySymbol": get_currency_symbol(currency),
            "scaleLabel": scale["label"],
            "scaleDivisor": scale["divisor"],
            "periods": periods,
            "data": data
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/holders/{symbol}")
async def get_holders(symbol: str):
    """Get institutional and insider holdings"""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        balance_sheet = ticker.balance_sheet
        
        # Get holder information
        institutional_holders = None
        major_holders = None
        mutual_fund_holders = None
        institutional_holding = safe_get(info, "heldPercentInstitutions")
        insider_holding = safe_get(info, "heldPercentInsiders")
        
        try:
            ih = ticker.institutional_holders
            if ih is not None and not ih.empty:
                institutional_holders = ih.head(10).to_dict('records')
                for holder in institutional_holders:
                    for key, value in holder.items():
                        if pd.isna(value):
                            holder[key] = None
                        elif isinstance(value, (pd.Timestamp, datetime)):
                            holder[key] = str(value)
        except:
            pass
        
        try:
            mh = ticker.major_holders
            if mh is not None and not mh.empty:
                major_holders = []
                for idx, row in mh.iterrows():
                    value = row.iloc[0] if len(row) > 0 and pd.notna(row.iloc[0]) else None
                    description = str(idx)
                    major_holders.append({
                        "value": str(value) if value is not None else None,
                        "description": description
                    })

                if "institutionsPercentHeld" in mh.index and pd.notna(mh.loc["institutionsPercentHeld"].iloc[0]):
                    institutional_holding = float(mh.loc["institutionsPercentHeld"].iloc[0])
                if "insidersPercentHeld" in mh.index and pd.notna(mh.loc["insidersPercentHeld"].iloc[0]):
                    insider_holding = float(mh.loc["insidersPercentHeld"].iloc[0])
        except:
            pass

        try:
            mf = ticker.mutualfund_holders
            if mf is not None and not mf.empty:
                mutual_fund_holders = mf.head(10).to_dict('records')
                for holder in mutual_fund_holders:
                    for key, value in holder.items():
                        if pd.isna(value):
                            holder[key] = None
                        elif isinstance(value, (pd.Timestamp, datetime)):
                            holder[key] = str(value)
        except:
            pass
        
        return {
            "symbol": symbol,
            "institutionalHolding": institutional_holding,
            "insiderHolding": insider_holding,
            "institutionalHolders": institutional_holders,
            "majorHolders": major_holders,
            "mutualFundHolders": mutual_fund_holders,
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/price-history/{symbol}")
async def get_price_history(symbol: str, period: str = "1y"):
    """Get historical price data"""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        
        if hist.empty:
            return {"error": "No historical data available"}
        
        data = []
        for idx, row in hist.iterrows():
            data.append({
                "date": str(idx.date()),
                "open": round(row["Open"], 2) if pd.notna(row["Open"]) else None,
                "high": round(row["High"], 2) if pd.notna(row["High"]) else None,
                "low": round(row["Low"], 2) if pd.notna(row["Low"]) else None,
                "close": round(row["Close"], 2) if pd.notna(row["Close"]) else None,
                "volume": int(row["Volume"]) if pd.notna(row["Volume"]) else None,
            })
        
        return {
            "symbol": symbol,
            "period": period,
            "data": data
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/range-analysis/{symbol}")
async def get_range_analysis(symbol: str):
    """Return computed 52-week range metrics from 1-year OHLC history."""
    try:
        ticker = yf.Ticker(symbol)
        hist = get_one_year_history(ticker)
        range_metrics = compute_52_week_range(hist)

        if range_metrics is None:
            return {"error": "Unable to compute 52-week range from 1-year history"}

        return {
            "symbol": symbol,
            **range_metrics,
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/recommendation/{symbol}")
async def get_recommendation(symbol: str):
    """Get AI-driven stock recommendations"""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        balance_sheet = ticker.balance_sheet
        hist = ticker.history(period="1y")
        
        # Gather metrics for analysis
        pe = safe_get(info, "trailingPE")
        forward_pe = safe_get(info, "forwardPE")
        eps = safe_get(info, "trailingEps")
        roe = get_roe(info, balance_sheet)
        debt_to_equity = get_debt_to_equity(info, balance_sheet)
        dividend_yield = get_dividend_yield(info)
        beta = safe_get(info, "beta")
        
        # Calculate price momentum (short-term)
        price_change_1m = None
        price_change_3m = None
        volume_trend = None
        
        if not hist.empty and len(hist) > 20:
            current_price = hist["Close"].iloc[-1]
            
            if len(hist) >= 22:
                price_1m_ago = hist["Close"].iloc[-22]
                price_change_1m = ((current_price - price_1m_ago) / price_1m_ago) * 100
            
            if len(hist) >= 66:
                price_3m_ago = hist["Close"].iloc[-66]
                price_change_3m = ((current_price - price_3m_ago) / price_3m_ago) * 100
            
            # Volume trend
            recent_vol = hist["Volume"].iloc[-5:].mean()
            older_vol = hist["Volume"].iloc[-22:-5].mean()
            if older_vol > 0:
                volume_trend = ((recent_vol - older_vol) / older_vol) * 100
        
        # Generate recommendations
        long_term_signals = []
        short_term_signals = []
        long_term_score = 0
        short_term_score = 0
        
        # Long-term analysis
        if roe is not None:
            if roe > 15:
                long_term_signals.append({"type": "positive", "message": f"Strong ROE of {roe:.1f}% indicates efficient use of equity"})
                long_term_score += 2
            elif roe > 10:
                long_term_signals.append({"type": "neutral", "message": f"Moderate ROE of {roe:.1f}%"})
                long_term_score += 1
            else:
                long_term_signals.append({"type": "negative", "message": f"Low ROE of {roe:.1f}% may indicate inefficiency"})
                long_term_score -= 1
        
        if debt_to_equity is not None:
            if debt_to_equity < 0.5:
                long_term_signals.append({"type": "positive", "message": f"Low debt-to-equity ratio of {debt_to_equity:.2f} indicates financial stability"})
                long_term_score += 2
            elif debt_to_equity < 1:
                long_term_signals.append({"type": "neutral", "message": f"Moderate debt-to-equity ratio of {debt_to_equity:.2f}"})
                long_term_score += 1
            else:
                long_term_signals.append({"type": "negative", "message": f"High debt-to-equity ratio of {debt_to_equity:.2f} may pose risks"})
                long_term_score -= 1
        
        if pe is not None and forward_pe is not None:
            if forward_pe < pe:
                long_term_signals.append({"type": "positive", "message": f"Forward P/E ({forward_pe:.1f}) lower than trailing P/E ({pe:.1f}) suggests expected earnings growth"})
                long_term_score += 1
            elif forward_pe > pe * 1.2:
                long_term_signals.append({"type": "negative", "message": f"Forward P/E ({forward_pe:.1f}) higher than trailing P/E ({pe:.1f}) suggests expected earnings decline"})
                long_term_score -= 1
        
        if dividend_yield is not None and dividend_yield > 0.02:
            long_term_signals.append({"type": "positive", "message": f"Dividend yield of {dividend_yield*100:.2f}% provides income"})
            long_term_score += 1
        
        # Short-term analysis
        if price_change_1m is not None:
            if price_change_1m > 5:
                short_term_signals.append({"type": "positive", "message": f"Strong 1-month momentum: +{price_change_1m:.1f}%"})
                short_term_score += 2
            elif price_change_1m < -5:
                short_term_signals.append({"type": "negative", "message": f"Weak 1-month momentum: {price_change_1m:.1f}%"})
                short_term_score -= 1
            else:
                short_term_signals.append({"type": "neutral", "message": f"Flat 1-month price movement: {price_change_1m:.1f}%"})
        
        if volume_trend is not None:
            if volume_trend > 20:
                short_term_signals.append({"type": "positive", "message": f"Volume spike: +{volume_trend:.1f}% above average (increased interest)"})
                short_term_score += 1
            elif volume_trend < -20:
                short_term_signals.append({"type": "negative", "message": f"Declining volume: {volume_trend:.1f}% (reduced interest)"})
                short_term_score -= 1
        
        if beta is not None:
            if beta > 1.5:
                short_term_signals.append({"type": "warning", "message": f"High beta of {beta:.2f} indicates high volatility"})
            elif beta < 0.8:
                short_term_signals.append({"type": "neutral", "message": f"Low beta of {beta:.2f} indicates lower volatility than market"})
        
        # Generate overall recommendation
        def get_recommendation_text(score):
            if score >= 4:
                return "Strong Buy"
            elif score >= 2:
                return "Buy"
            elif score >= 0:
                return "Hold"
            elif score >= -2:
                return "Sell"
            else:
                return "Strong Sell"
        
        return {
            "symbol": symbol,
            "name": safe_get(info, "longName", symbol),
            "longTerm": {
                "recommendation": get_recommendation_text(long_term_score),
                "score": long_term_score,
                "signals": long_term_signals,
            },
            "shortTerm": {
                "recommendation": get_recommendation_text(short_term_score),
                "score": short_term_score,
                "signals": short_term_signals,
            },
            "metrics": {
                "pe": pe,
                "forwardPE": forward_pe,
                "roe": roe,
                "debtToEquity": debt_to_equity,
                "dividendYield": dividend_yield,
                "beta": beta,
                "priceChange1m": round(price_change_1m, 2) if price_change_1m is not None else None,
                "priceChange3m": round(price_change_3m, 2) if price_change_3m is not None else None,
                "volumeTrend": round(volume_trend, 2) if volume_trend is not None else None,
            }
        }
    except Exception as e:
        return {"error": str(e)}


@app.get("/screener")
async def stock_screener(
    sector: Optional[str] = None,
    min_market_cap: Optional[float] = None,
    max_pe: Optional[float] = None,
    min_roe: Optional[float] = None,
):
    """Screen stocks based on criteria"""
    # Sample popular stocks to screen
    sample_stocks = [
        "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA", "JPM", 
        "V", "JNJ", "WMT", "PG", "UNH", "HD", "BAC", "XOM", "CVX",
        "KO", "PEP", "ABBV", "MRK", "COST", "AVGO", "TMO", "CSCO"
    ]
    
    results = []
    
    for symbol in sample_stocks:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            balance_sheet = ticker.balance_sheet
            
            stock_sector = safe_get(info, "sector")
            market_cap = safe_get(info, "marketCap")
            pe = safe_get(info, "trailingPE")
            
            roe = get_roe(info, balance_sheet)
            
            # Apply filters
            if sector and stock_sector and sector.lower() not in stock_sector.lower():
                continue
            if min_market_cap and (not market_cap or market_cap < min_market_cap):
                continue
            if max_pe and (not pe or pe > max_pe):
                continue
            if min_roe and (not roe or roe < min_roe):
                continue
            
            results.append({
                "symbol": symbol,
                "name": safe_get(info, "longName", symbol),
                "sector": stock_sector,
                "price": safe_get(info, "regularMarketPrice"),
                "change": safe_get(info, "regularMarketChangePercent"),
                "marketCap": market_cap,
                "marketCapFormatted": format_number(market_cap),
                "pe": pe,
                "roe": roe,
            })
            
            if len(results) >= 10:
                break
                
        except:
            continue
    
    return {"results": results}
