# $Funnel.ai

## Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- Pip

## Setup

### 1. Backend Setup
```bash
cd backend
# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Frontend Setup
```bash
cd frontend
# Install Node dependencies
npm install
```

## Running the App

### Start Backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```
*Backend runs on http://localhost:8000*

### Start Frontend
```bash
cd frontend
npm run dev
```
*Frontend runs on http://localhost:5173*

## Project Structure
- `frontend/`: React + Vite application.
- `backend/`: FastAPI application + SQLite (dev) / Postgres (prod).
