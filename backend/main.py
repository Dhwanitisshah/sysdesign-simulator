import math
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from critique import get_critique
from db import MongoNotConfiguredError, get_designs_collection
from engine.simulator import Graph, GraphCycleError, GraphValidationError, simulate

load_dotenv()

app = FastAPI(title="System Design Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


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


class SweepRequest(BaseModel):
    graph: Graph
    steps: int = Field(default=30, ge=2, le=200)
    max_multiplier: float = Field(default=1.5, gt=0)


def _with_client_rate(graph: Graph, client_id: str, lam: float) -> Graph:
    """Returns a copy of graph with the given client node's request_rate set to lam."""
    g = graph.model_copy(deep=True)
    next(n for n in g.nodes if n.id == client_id).params.request_rate = lam
    return g


def _bottleneck_rho_at(graph: Graph, client_id: str, bottleneck_id: str, lam: float) -> float:
    result = simulate(_with_client_rate(graph, client_id, lam))
    r = result.nodes[bottleneck_id]
    return r.queue.rho if r.queue is not None else 0.0


def _find_saturation_lambda(graph: Graph, client_id: str, bottleneck_id: str) -> float:
    """Bisects on client request_rate to find where the bottleneck node's rho crosses 1.

    Pure orchestration over simulate() — no queueing math of its own.
    """
    hi = 1.0
    while _bottleneck_rho_at(graph, client_id, bottleneck_id, hi) < 1 and hi < 1e12:
        hi *= 2
    lo = 0.0
    for _ in range(50):
        mid = (lo + hi) / 2
        if _bottleneck_rho_at(graph, client_id, bottleneck_id, mid) >= 1:
            hi = mid
        else:
            lo = mid
    return hi


@app.post("/sweep")
def sweep_endpoint(req: SweepRequest) -> dict[str, Any]:
    graph = req.graph
    client = next((n for n in graph.nodes if n.type == "client"), None)
    if client is None:
        return JSONResponse(status_code=422, content={"detail": "Graph has no client node to sweep."})

    baseline_bottleneck = simulate(_with_client_rate(graph, client.id, 1.0)).bottleneck_node_id
    if baseline_bottleneck is None:
        return JSONResponse(status_code=422, content={"detail": "Graph has no queueing node to sweep against."})

    saturation_lambda = _find_saturation_lambda(graph, client.id, baseline_bottleneck)
    max_lambda = req.max_multiplier * saturation_lambda

    points = []
    for i in range(req.steps):
        lam = max_lambda * i / (req.steps - 1)
        result = simulate(_with_client_rate(graph, client.id, lam))
        r = result.nodes.get(baseline_bottleneck)
        rho = r.queue.rho if r and r.queue is not None else None
        points.append(
            {
                "lambda": lam,
                "end_to_end_latency": _finite_or_null(result.end_to_end_latency),
                "bottleneck_rho": _finite_or_null(rho),
                "saturated": result.saturated,
            }
        )

    return {
        "points": points,
        "bottleneck_node_id": baseline_bottleneck,
        "saturation_lambda": saturation_lambda,
    }


# Sane upper bound on graph size before we spend Groq tokens on it.
MAX_CRITIQUE_NODES = 40
MAX_CRITIQUE_EDGES = 80


@app.post("/critique")
@limiter.limit("5/minute")
def critique_endpoint(request: Request, graph: Graph) -> dict[str, Any]:
    if len(graph.nodes) > MAX_CRITIQUE_NODES or len(graph.edges) > MAX_CRITIQUE_EDGES:
        return JSONResponse(
            status_code=422,
            content={
                "detail": f"Graph too large for critique (max {MAX_CRITIQUE_NODES} nodes, "
                f"{MAX_CRITIQUE_EDGES} edges)."
            },
        )

    result = simulate(graph)

    try:
        text = get_critique(graph, result)
    except RuntimeError as exc:
        return JSONResponse(status_code=503, content={"detail": str(exc)})
    except Exception:
        return JSONResponse(
            status_code=502, content={"detail": "Could not reach the critique service. Try again."}
        )

    return {"critique": text}


@app.exception_handler(MongoNotConfiguredError)
def _mongo_not_configured_handler(request: Request, exc: MongoNotConfiguredError) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": str(exc)})


class SaveDesignRequest(BaseModel):
    name: str
    graph: Graph


def _object_id_or_404(design_id: str) -> ObjectId:
    try:
        return ObjectId(design_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Design not found.")


@app.post("/designs")
async def save_design(req: SaveDesignRequest) -> dict[str, Any]:
    doc = {
        "name": req.name,
        "graph": req.graph.model_dump(),
        "created_at": datetime.now(timezone.utc),
    }
    result = await get_designs_collection().insert_one(doc)
    return {"id": str(result.inserted_id), "created_at": doc["created_at"]}


@app.get("/designs")
async def list_designs() -> list[dict[str, Any]]:
    cursor = get_designs_collection().find({}, {"name": 1, "created_at": 1})
    return [
        {"id": str(doc["_id"]), "name": doc["name"], "created_at": doc["created_at"]}
        async for doc in cursor
    ]


@app.get("/designs/{design_id}")
async def get_design(design_id: str) -> dict[str, Any]:
    doc = await get_designs_collection().find_one({"_id": _object_id_or_404(design_id)})
    if doc is None:
        raise HTTPException(status_code=404, detail="Design not found.")
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "created_at": doc["created_at"],
        "graph": doc["graph"],
    }


@app.delete("/designs/{design_id}")
async def delete_design(design_id: str) -> dict[str, Any]:
    result = await get_designs_collection().delete_one({"_id": _object_id_or_404(design_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Design not found.")
    return {"deleted": True}
