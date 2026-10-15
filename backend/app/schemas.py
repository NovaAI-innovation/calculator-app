"""Pydantic v2 request/response models."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class CalculationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expression: str = Field(min_length=1, max_length=200)


class CalculationResponse(BaseModel):
    id: int
    expression: str
    result: str
    created_at: str


class HistoryItem(BaseModel):
    id: int
    expression: str
    result: str
    created_at: str


class HistoryResponse(BaseModel):
    items: list[HistoryItem]
    total: int


class HealthResponse(BaseModel):
    status: str