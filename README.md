# Bank Statement Analyzer

A comprehensive system for extracting, validating, and analyzing transaction data from bank statement PDFs.

## Getting Started

### Installation

#### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python run.py
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Configuration
- Set up a `.env` file in the backend directory with your Google API key:
```
GOOGLE_API_KEY=your_api_key_here
```