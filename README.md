# System Design Simulator

See [CLAUDE.md](CLAUDE.md) for stack, architecture rules, and phase plan.

## Phase 0: run the skeleton

### Backend (FastAPI)

```
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Verify: open http://localhost:8000/health — should return `{"status":"ok"}`.

### Frontend (React + Vite + React Flow)

```
cd frontend
npm install
npm run dev
```

Verify: open http://localhost:5173 — should show a canvas with one
draggable "Client" box.
