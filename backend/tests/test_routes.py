import json
from pathlib import Path

from app.legacy import convert_api

LEGACY_CONFIG = Path(__file__).parent / "fixtures" / "legacy_ApiDoc.json"


def create_source(client, headers, path):
    r = client.post(
        "/admin-api/data-sources",
        json={"name": "local", "type": "sqlite", "config": {"path": path, "password": "secret"}},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()


def api_body(ds_id, **overrides):
    body = {
        "slug": "companies",
        "name": "Companies",
        "data_source_id": ds_id,
        "table": "companies",
        "default_order_field": "id",
        "conditions": [
            {
                "parameter": "year",
                "column": "founded_year",
                "data_type": "integer",
                "required": False,
            },
        ],
        "response_fields": ["id", "name"],
    }
    body.update(overrides)
    return body


def test_login_and_me(client, admin_headers):
    r = client.get("/admin-api/auth/me", headers=admin_headers)
    assert r.json()["username"] == "admin"
    assert r.json()["role"] == "admin"
    assert client.get("/admin-api/auth/me").status_code == 401
    bad = client.post("/admin-api/auth/login", json={"username": "admin", "password": "nope"})
    assert bad.status_code == 401


def test_registration_disabled_by_default(client):
    r = client.post("/admin-api/auth/register", json={"username": "bob", "password": "password123"})
    assert r.status_code == 403


def test_user_management_requires_admin(client, admin_headers):
    r = client.post(
        "/admin-api/users",
        json={"username": "bob", "password": "password123"},
        headers=admin_headers,
    )
    assert r.status_code == 201
    login = client.post(
        "/admin-api/auth/login", json={"username": "bob", "password": "password123"}
    )
    bob = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.get("/admin-api/users", headers=bob).status_code == 403
    # The last admin cannot be demoted.
    admin_id = client.get("/admin-api/auth/me", headers=admin_headers).json()["id"]
    r = client.patch(f"/admin-api/users/{admin_id}", json={"role": "user"}, headers=admin_headers)
    assert r.status_code == 400


def test_data_source_password_is_write_only(client, admin_headers, sqlite_db):
    ds = create_source(client, admin_headers, sqlite_db)
    assert ds["config"]["password"] is None
    assert ds["has_password"] is True
    # Saving without a password keeps the stored one.
    r = client.put(
        f"/admin-api/data-sources/{ds['id']}",
        json={"name": "local", "type": "sqlite", "config": {"path": sqlite_db}},
        headers=admin_headers,
    )
    assert r.json()["has_password"] is True
    assert client.post(f"/admin-api/data-sources/{ds['id']}/test", headers=admin_headers).json()[
        "ok"
    ]


def test_introspection(client, admin_headers, sqlite_db):
    ds = create_source(client, admin_headers, sqlite_db)
    tables = client.get(f"/admin-api/data-sources/{ds['id']}/tables", headers=admin_headers).json()
    assert tables == ["companies"]
    cols = client.get(
        f"/admin-api/data-sources/{ds['id']}/columns",
        params={"table": "companies"},
        headers=admin_headers,
    ).json()
    assert [c["name"] for c in cols][:2] == ["id", "name"]


def test_generated_api_end_to_end(client, admin_headers, sqlite_db):
    ds = create_source(client, admin_headers, sqlite_db)
    r = client.post("/admin-api/apis", json=api_body(ds["id"]), headers=admin_headers)
    assert r.status_code == 201, r.text

    # API key required
    assert client.post("/api/companies", json={}).status_code == 401
    assert client.post("/api/companies", headers={"X-API-Key": "sag_wrong"}).status_code == 401

    key = client.post("/admin-api/api-keys", json={"name": "test"}, headers=admin_headers).json()
    assert key["key"].startswith("sag_")
    listed = client.get("/admin-api/api-keys", headers=admin_headers).json()
    assert "key" not in listed[0]

    h = {"X-API-Key": key["key"]}
    r = client.post("/api/companies", json={"year": 2010}, headers=h)
    assert r.status_code == 200, r.text
    assert [row["name"] for row in r.json()["data"]] == ["Initech", "O'Hare & Sons"]
    assert "query" not in r.json()

    # GET with query parameters, paging in the query string
    r = client.get("/api/companies", params={"limit": 1, "offset": 1}, headers=h)
    assert r.json()["data"] == [{"id": 2, "name": "Globex"}]

    # Bad parameter
    r = client.post("/api/companies", json={"year": "abc"}, headers=h)
    assert r.status_code == 400
    assert r.json()["errors"] == {"year": "must be an integer"}

    # Panel users may see the generated query
    r = client.post("/api/companies?debug=1", json={"year": 2010}, headers=admin_headers)
    assert "SELECT" in r.json()["query"]

    # Unknown API
    assert client.post("/api/missing", headers=h).status_code == 404

    m = client.get("/admin-api/metrics/overview", headers=admin_headers).json()
    assert m["total_calls"] == 6
    assert m["top_apis"][0] == {"name": "companies", "value": 6.0}
    assert {s["name"] for s in m["status_codes"]} == {"2xx", "4xx"}
    assert m["daily"][-1]["success"] == 3


def test_public_api_and_inactive_api(client, admin_headers, sqlite_db):
    ds = create_source(client, admin_headers, sqlite_db)
    api = client.post(
        "/admin-api/apis",
        json=api_body(ds["id"], require_api_key=False, cache_ttl=60),
        headers=admin_headers,
    ).json()
    r = client.post("/api/companies", json={})
    assert r.status_code == 200
    assert r.headers["cache-control"] == "public, max-age=60"

    client.put(
        f"/admin-api/apis/{api['id']}",
        json=api_body(ds["id"], is_active=False),
        headers=admin_headers,
    )
    assert client.post("/api/companies").status_code == 404


def test_api_validation(client, admin_headers, sqlite_db):
    ds = create_source(client, admin_headers, sqlite_db)
    client.post("/admin-api/apis", json=api_body(ds["id"]), headers=admin_headers)
    dup = client.post("/admin-api/apis", json=api_body(ds["id"]), headers=admin_headers)
    assert dup.status_code == 409
    bad = api_body(ds["id"], slug="bad slug!")
    assert client.post("/admin-api/apis", json=bad, headers=admin_headers).status_code == 422
    reserved = api_body(ds["id"], slug="x", conditions=[{"parameter": "limit", "column": "id"}])
    assert client.post("/admin-api/apis", json=reserved, headers=admin_headers).status_code == 422
    # Data source in use cannot be deleted
    assert (
        client.delete(f"/admin-api/data-sources/{ds['id']}", headers=admin_headers).status_code
        == 400
    )


def test_preview_unsaved_definition(client, admin_headers, sqlite_db):
    ds = create_source(client, admin_headers, sqlite_db)
    r = client.post(
        "/admin-api/apis/preview",
        json={"definition": api_body(ds["id"]), "request": {"params": {"year": 1999}}},
        headers=admin_headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["result"]["data"] == [{"id": 2, "name": "Globex"}]
    assert "WHERE" in r.json()["result"]["query"]


def test_export_import_roundtrip(client, admin_headers, sqlite_db):
    ds = create_source(client, admin_headers, sqlite_db)
    client.post("/admin-api/apis", json=api_body(ds["id"]), headers=admin_headers)
    exported = client.get("/admin-api/apis/export", headers=admin_headers).json()
    assert exported[0]["data_source"] == "local"

    r = client.post("/admin-api/apis/import", json=exported, headers=admin_headers)
    assert r.json() == {"created": [], "updated": [], "skipped": ["companies"]}
    exported[0]["api"]["name"] = "Renamed"
    r = client.post("/admin-api/apis/import?overwrite=true", json=exported, headers=admin_headers)
    assert r.json()["updated"] == ["companies"]
    apis = client.get("/admin-api/apis", headers=admin_headers).json()
    assert apis[0]["name"] == "Renamed"


def test_openapi_includes_generated_apis(client, admin_headers, sqlite_db):
    ds = create_source(client, admin_headers, sqlite_db)
    client.post("/admin-api/apis", json=api_body(ds["id"]), headers=admin_headers)
    spec = client.get("/openapi.json").json()
    op = spec["paths"]["/api/companies"]["post"]
    assert op["security"] == [{"ApiKeyHeader": []}]
    assert "year" in op["requestBody"]["content"]["application/json"]["schema"]["properties"]


def test_legacy_config_converts():
    legacy = json.loads(LEGACY_CONFIG.read_text())
    loan, warnings = convert_api("API_LON_Loan", legacy["API_LON_Loan"], 1)
    assert [c.parameter for c in loan.conditions] == ["Founded_year", "month", "category_code"]
    assert loan.conditions[0].ignore_if == "-3"
    assert loan.conditions[0].validation.max == 2023
    assert loan.response_transforms[0].template == "{founded_year}-{founded_month}-01"
    assert loan.database == "testReza"
    assert any("last update" in w for w in warnings)
    for slug, cfg in legacy.items():
        convert_api(slug, cfg, 1)
