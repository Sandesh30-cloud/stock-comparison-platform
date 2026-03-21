# Stock Analyzer 

Compare stocks side-by-side with financial data and AI-powered insights.

## Setup

**Backend** (required for search and data):
```bash
cd backend
pip install -e .
python3 -m uvicorn main:app --reload --port 8000
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000
