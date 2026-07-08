# System Design Simulator

A web app where users drag infrastructure boxes (Client, Load Balancer, API
Service, Cache, Database) onto a canvas, connect them, and the app estimates
latency, throughput, availability, and cost of that architecture.

## Stack

- **Backend**: FastAPI (Python 3.12). Lives in `backend/`.
- **Frontend**: React + Vite + React Flow for the canvas. Lives in `frontend/`.
- **Database**: MongoDB (added later, for saving designs).
- **LLM**: Groq (added later, for critiquing the architecture).

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

Build incrementally. Do not jump ahead to later phases without an explicit
request:

- **Phase 0** (current): minimal skeleton — FastAPI `/health` endpoint,
  React+Vite+React Flow frontend showing one draggable box, run instructions.
- Later phases: full node/edge graph, simulation engine, results panel,
  MongoDB persistence, Groq-based critique. Not yet defined in detail.
