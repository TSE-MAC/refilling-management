# RefillOps Execution Guide

This guide explains how to run the full-stack RefillOps application locally. The project consists of a Python FastAPI backend and a React frontend.

## 1. Backend Setup & Execution
The backend is built with FastAPI and requires Python. 

### Prerequisites
- Python 3.8+
- MongoDB instance (URL configured in `.env`)

### Steps to Run
1. Open a new terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. (Optional but recommended) Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Ensure your `.env` file is properly configured with `MONGO_URL` and `DB_NAME`.
5. Start the FastAPI server:
   ```bash
   uvicorn server:app --reload
   ```
   The backend API will run on `http://127.0.0.1:8000`.

## 2. Frontend Setup & Execution
The frontend is built with React and uses Vite or Craco.

### Prerequisites
- Node.js
- Yarn package manager

### Steps to Run
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies (if you haven't already):
   ```bash
   yarn install
   ```
3. Start the frontend development server:
   ```bash
   yarn dev
   ```
   *Note: Do not use `yarn start` as it is not configured in the `package.json`. The correct script is `yarn dev`.*

The frontend will typically be accessible at `http://localhost:3000`.

## Access Details
- **Frontend App:** `http://localhost:3000`
- **Backend API Docs:** `http://127.0.0.1:8000/docs`
- **Default Login Credentials:** (See `.env` or defaults in `server.py`)
  - Username: `suresafe`
  - Password: `suresafe123`
