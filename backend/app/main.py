"""FastAPI app entry point.

`create_app(db_path=None)` builds an isolated app instance backed by a
specific database path. The module-level `app = create_app()` exposes a
default instance for `uvicorn app.main:app`. Importing this module does
not create the production DB — the table is built in the lifespan only.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse

from . import calculator, database
from .schemas import (
    CalculationRequest,
    CalculationResponse,
    HealthResponse,
    HistoryItem,
    HistoryResponse,
)


def _resolve_db_path(override: Optional[str]) -> str:
    if override is not None:
        return override
    return os.environ.get("CALC_DB_PATH", database.DEFAULT_DB_PATH)


def create_app(db_path: Optional[str] = None) -> FastAPI:
    """Build a FastAPI app bound to the given DB path."""
    resolved_db_path = _resolve_db_path(db_path)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        database.init_db(resolved_db_path)
        app.state.db_path = resolved_db_path
        yield

    app = FastAPI(title="Calculator API", lifespan=lifespan)

    def db_path(request: Request) -> str:
        return request.app.state.db_path

    @app.exception_handler(calculator.InvalidExpression)
    async def _invalid_expression_handler(
        request: Request, exc: calculator.InvalidExpression
    ) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": "Invalid expression"})

    @app.exception_handler(calculator.DivisionByZero)
    async def _div_by_zero_handler(
        request: Request, exc: calculator.DivisionByZero
    ) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": "Division by zero"})

    @app.get("/api/health", response_model=HealthResponse)
    def health() -> HealthResponse:
        return HealthResponse(status="ok")

    @app.post(
        "/api/calculations",
        response_model=CalculationResponse,
        status_code=201,
    )
    def create_calculation(
        payload: CalculationRequest, request: Request
    ) -> CalculationResponse:
        result = calculator.evaluate(payload.expression)
        record = database.insert_history(
            db_path(request), payload.expression, result
        )
        return CalculationResponse(**record)

    @app.get("/api/history", response_model=HistoryResponse)
    def list_history(
        request: Request,
        limit: int = Query(50, ge=1, le=200),
        offset: int = Query(0, ge=0),
    ) -> HistoryResponse:
        items, total = database.list_history(db_path(request), limit, offset)
        return HistoryResponse(
            items=[HistoryItem(**it) for it in items],
            total=total,
        )

    @app.delete("/api/history/{item_id}", status_code=204)
    def delete_history_item(item_id: int, request: Request) -> None:
        deleted = database.delete_history_item(db_path(request), item_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="History item not found")
        return None

    @app.delete("/api/history", status_code=204)
    def delete_all_history(request: Request) -> None:
        database.clear_history(db_path(request))
        return None

    return app


# Default app instance for `uvicorn app.main:app`. Importing this module
# does NOT create the production DB — only starting the server (which
# triggers the lifespan) does.
app = create_app()