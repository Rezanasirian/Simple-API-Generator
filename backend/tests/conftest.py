import sqlite3

import mongomock
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.engine import connectors

ADMIN_PASSWORD = "admin-pass-123"

COMPANIES = [
    (1, "Acme", "web", 2005, 3, 120.5, None),
    (2, "Globex", "software", 1999, 7, 80.0, "big"),
    (3, "Initech", "software", 2010, 12, 15.25, None),
    (4, "Umbrella", "biotech", 1995, 1, 300.0, "x"),
    (5, "O'Hare & Sons", "web", 2010, 5, 5.0, None),
]


@pytest.fixture
def settings(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite://")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key-that-is-long-enough-for-hs256")
    monkeypatch.setenv("ADMIN_PASSWORD", ADMIN_PASSWORD)
    monkeypatch.setenv("FRONTEND_DIST", str(tmp_path / "no-frontend"))
    get_settings.cache_clear()
    yield get_settings()
    get_settings.cache_clear()


@pytest.fixture
def client(settings):
    from app.main import create_app

    with TestClient(create_app(settings)) as c:
        yield c
    connectors.close_all()


@pytest.fixture
def admin_headers(client):
    r = client.post("/admin-api/auth/login", json={"username": "admin", "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def sqlite_db(tmp_path):
    path = tmp_path / "target.db"
    con = sqlite3.connect(path)
    con.execute(
        "CREATE TABLE companies (id INTEGER, name TEXT, category TEXT, founded_year INTEGER,"
        " founded_month INTEGER, revenue REAL, note TEXT)"
    )
    con.executemany("INSERT INTO companies VALUES (?,?,?,?,?,?,?)", COMPANIES)
    con.commit()
    con.close()
    return str(path)


@pytest.fixture
def mongo(monkeypatch):
    client = mongomock.MongoClient()
    docs = [
        {"name": n, "category_code": c, "founded_year": y, "founded_month": m, "revenue": r}
        for _, n, c, y, m, r, _ in COMPANIES
    ]
    client["testdb"]["companies"].insert_many(docs)
    monkeypatch.setattr(connectors, "create_mongo_client", lambda cfg: client)
    return client


class FakeDataSource:
    def __init__(self, id, type, config):
        self.id = id
        self.type = type
        self.config = config
        self.updated_at = None
