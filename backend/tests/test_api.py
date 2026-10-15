"""HTTP-level tests for the FastAPI calculator app."""

from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


def _row_count(db_path: Path) -> int:
    with sqlite3.connect(db_path) as conn:
        return int(conn.execute("SELECT COUNT(*) FROM history").fetchone()[0])


def test_health(app: TestClient) -> None:
    resp = app.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_post_success_persists_one_row(app: TestClient, db_path: Path) -> None:
    resp = app.post("/api/calculations", json={"expression": "12 * (3 + 4)"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["id"] >= 1
    assert body["expression"] == "12 * (3 + 4)"
    assert body["result"] == "84"
    assert isinstance(body["created_at"], str) and body["created_at"]
    assert _row_count(db_path) == 1


def test_post_invalid_expression_returns_400(app: TestClient, db_path: Path) -> None:
    resp = app.post("/api/calculations", json={"expression": "abc"})
    assert resp.status_code == 400
    assert resp.json() == {"detail": "Invalid expression"}
    assert _row_count(db_path) == 0


def test_post_division_by_zero_returns_400(app: TestClient, db_path: Path) -> None:
    resp = app.post("/api/calculations", json={"expression": "1/0"})
    assert resp.status_code == 400
    assert resp.json() == {"detail": "Division by zero"}
    assert _row_count(db_path) == 0


def test_post_malformed_body_returns_422(app: TestClient, db_path: Path) -> None:
    resp = app.post("/api/calculations", json={"expression": ""})
    assert resp.status_code == 422
    assert _row_count(db_path) == 0


@pytest.mark.parametrize(
    "expression",
    ["abc", "2+", "(1+2", "1;2", "__import__('os')", "1e5"],
)
def test_post_various_invalid_inputs_400(app: TestClient, db_path: Path, expression: str) -> None:
    resp = app.post("/api/calculations", json={"expression": expression})
    assert resp.status_code == 400
    assert resp.json() == {"detail": "Invalid expression"}
    assert _row_count(db_path) == 0


def test_post_201_char_expression_returns_422(app: TestClient, db_path: Path) -> None:
    # 201 chars exceeds the schema max_length=200, so the request is rejected
    # by FastAPI's body validation (422) before the evaluator ever sees it.
    expr = "1" + "+1" * 100  # length 201
    resp = app.post("/api/calculations", json={"expression": expr})
    assert resp.status_code == 422
    assert _row_count(db_path) == 0


def test_history_newest_first(app: TestClient) -> None:
    for expr in ["1+1", "2+2", "3+3"]:
        r = app.post("/api/calculations", json={"expression": expr})
        assert r.status_code == 201
    resp = app.get("/api/history")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    expressions = [it["expression"] for it in body["items"]]
    assert expressions == ["3+3", "2+2", "1+1"]


def test_history_pagination(app: TestClient) -> None:
    for i in range(5):
        app.post("/api/calculations", json={"expression": f"{i}+{i}"})
    r1 = app.get("/api/history", params={"limit": 2, "offset": 0})
    r2 = app.get("/api/history", params={"limit": 2, "offset": 2})
    r3 = app.get("/api/history", params={"limit": 2, "offset": 4})
    assert r1.status_code == r2.status_code == r3.status_code == 200
    b1, b2, b3 = r1.json(), r2.json(), r3.json()
    # Newest first across the whole history.
    assert [it["expression"] for it in b1["items"]] == ["4+4", "3+3"]
    assert [it["expression"] for it in b2["items"]] == ["2+2", "1+1"]
    # offset=4 with limit=2 over 5 rows returns the oldest single row.
    assert [it["expression"] for it in b3["items"]] == ["0+0"]
    # offset past the end is empty.
    r4 = app.get("/api/history", params={"limit": 2, "offset": 100})
    assert r4.json()["items"] == []
    assert b1["total"] == b2["total"] == b3["total"] == r4.json()["total"] == 5


@pytest.mark.parametrize("limit", [0, 201, -1])
def test_history_limit_validation_422(app: TestClient, limit: int) -> None:
    resp = app.get("/api/history", params={"limit": limit})
    assert resp.status_code == 422


def test_history_offset_negative_422(app: TestClient) -> None:
    resp = app.get("/api/history", params={"offset": -1})
    assert resp.status_code == 422


def test_delete_existing_then_absent(app: TestClient) -> None:
    r = app.post("/api/calculations", json={"expression": "7+8"})
    assert r.status_code == 201
    item_id = r.json()["id"]
    d = app.delete(f"/api/history/{item_id}")
    assert d.status_code == 204
    assert d.content == b""
    listing = app.get("/api/history").json()
    assert listing["total"] == 0
    second = app.delete(f"/api/history/{item_id}")
    assert second.status_code == 404
    assert second.json() == {"detail": "History item not found"}


def test_delete_missing_returns_404(app: TestClient) -> None:
    resp = app.delete("/api/history/99999")
    assert resp.status_code == 404
    assert resp.json() == {"detail": "History item not found"}


def test_delete_all_history(app: TestClient) -> None:
    for expr in ["1+1", "2+2", "3+3"]:
        app.post("/api/calculations", json={"expression": expr})
    listing = app.get("/api/history").json()
    assert listing["total"] == 3
    d = app.delete("/api/history")
    assert d.status_code == 204
    assert d.content == b""
    after = app.get("/api/history").json()
    assert after["total"] == 0
    assert after["items"] == []


def test_tests_never_touch_production_db() -> None:
    """The conftest already enforces this for every test using `app`.
    This standalone test just asserts the production DB has not been
    created during this run (and is also recreated every pytest run because
    tmp_path is per-test, so any DB created during a test would not survive)."""
    production = Path("/opt/data/projects/calculator-app/backend/data/calculator.db")
    assert not production.exists()
    # If the previous assertion somehow failed (i.e. the production DB was
    # touched), the test catches it. The tmp_path-isolated DBs are per-test
    # and cleaned up by pytest; we don't need to assert against them here.