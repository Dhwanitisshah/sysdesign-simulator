# System Design Simulator

A web app where users drag infrastructure boxes (Client, Load Balancer, API
Service, Cache, Database) onto a canvas, connect them, and the app estimates
latency, throughput, availability, and cost of that architecture.

## Stack

- **Backend**: FastAPI (Python 3.12). Lives in `backend/`.
- **Frontend**: React + Vite + React Flow for the canvas. Lives in `frontend/`.
- **Database**: MongoDB, for saving/loading designs (`backend/db.py`, `/designs` routes).
- **LLM**: Groq, for critiquing the architecture (`backend/critique.py`, `/critique` route).

## Hard rule: all math lives in the backend engine

All simulation math (latency, throughput, availability, cost estimation)
lives in `backend/engine/simulator.py` as pure functions, covered by pytest
tests in `backend/engine/tests/`.

The frontend does **no math**. It only:
- Renders the graph (nodes/edges) via React Flow.
- Sends the current graph to the backend.
- Displays whatever results the backend returns.

If you ever find yourself writing a latency/throughput/cost formula in
TypeScript/JavaScript, stop — that logic belongs in
`backend/engine/simulator.py` instead.

## Phases

Built incrementally, one phase at a time. Completed so far:

- **Phase 0**: minimal skeleton — FastAPI `/health` endpoint, React+Vite+React
  Flow frontend showing one draggable box.
- **Phase 1**: draggable canvas with node palette and params panel.
- **Phase 2**: simulation engine (`backend/engine/simulator.py`) validated
  end to end with pytest.
- **Phase 3**: saturation highlighting, system results panel, load-sweep
  chart.
- **Phase 4**: save/load architectures via MongoDB (`backend/db.py`,
  `/designs` routes, `SaveLoadPanel.jsx`).
- **Phase 5**: LLM architecture critique via Groq (`backend/critique.py`,
  `/critique` route, `CritiquePanel.jsx`).

Preset architectures (`frontend/src/presets.js`, `PresetsPanel.jsx`) have
also been added.

When adding new functionality, keep changes scoped to what's asked — don't
jump ahead to unrequested future work.
