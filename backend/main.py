import math
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from engine.simulator import Graph, GraphCycleError, GraphValidationError, simulate

app = FastAPI(title="System Design Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _finite_or_null(value: float | None) -> float | None:
    """inf/-inf/nan aren't valid JSON; represent them as null."""
    if value is None or math.isinf(value) or math.isnan(value):
        return None
    return value


@app.exception_handler(GraphCycleError)
@app.exception_handler(GraphValidationError)
def _graph_error_handler(request: Request, exc: GraphCycleError | GraphValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.post("/simulate")
def simulate_endpoint(graph: Graph) -> dict[str, Any]:
    result = simulate(graph)

    nodes = {}
    for node_id, r in result.nodes.items():
        queue = None
        if r.queue is not None:
            queue = {
                "wait_time": _finite_or_null(r.queue.wait_time),
                "rho": _finite_or_null(r.queue.rho),
                "saturated": r.queue.saturated,
            }
        nodes[node_id] = {
            "wait_time": queue["wait_time"] if queue else 0.0,
            "rho": queue["rho"] if queue else None,
            "saturated": queue["saturated"] if queue else False,
        }

    return {
        "nodes": nodes,
        "end_to_end_latency": _finite_or_null(result.end_to_end_latency),
        "system_availability": result.system_availability,
        "total_cost": result.total_cost,
        "bottleneck_node_id": result.bottleneck_node_id,
        "saturated": result.saturated,
    }
