"""Shared pytest fixtures.

Every test gets an isolated DB at a tmp_path. The conftest also asserts that
the production DB directory is never touched.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure no stray env var leaks a real DB path into test runs.
os.environ.pop("CALC_DB_PATH", None)

from app.main import create_app  # noqa: E402  (after env reset)

PROD_DB = Path("/opt/data/projects/calculator-app/backend/data/calculator.db")


@pytest.fixture
def db_path(tmp_path: Path) -> Path:
    return tmp_path / "calculator.db"


@pytest.fixture
def app(db_path: Path):
    application = create_app(db_path=str(db_path))
    with TestClient(application) as client:
        # Sanity: lifespan must have created the test DB, and the production
        # data directory must NOT have been created.
        assert db_path.exists()
        assert not PROD_DB.exists(), (
            f"Tests must not create the production DB at {PROD_DB}"
        )
        yield client
    # Post-test: still no production DB.
    assert not PROD_DB.exists(), (
        f"Tests must not create the production DB at {PROD_DB}"
    )


@pytest.fixture
def ensure_prod_db_untouched():
    """A standalone fixture tests can use when they don't need `app`."""
    assert not PROD_DB.exists(), (
        f"Production DB must not exist before test: {PROD_DB}"
    )
    yield
    assert not PROD_DB.exists(), (
        f"Production DB must not exist after test: {PROD_DB}"
    )