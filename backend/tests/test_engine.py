from datetime import date

import pytest

from app.engine import connectors
from app.engine.executor import ApiRequest, ParamError, run_api
from app.engine.params import resolve_params
from app.legacy import concat_to_template
from app.schemas import ApiDefinitionIn, Condition
from tests.conftest import FakeDataSource


def make_api(**overrides) -> ApiDefinitionIn:
    base = {
        "slug": "companies",
        "data_source_id": 1,
        "table": "companies",
        "default_order_field": "id",
        "default_limit": 10,
        "max_limit": 100,
        "conditions": [
            {
                "parameter": "year",
                "column": "founded_year",
                "data_type": "integer",
                "validation": {"min": 1900, "max": 2030},
                "ignore_if": "-1",
            },
            {"parameter": "category", "column": "category", "ignore_if": "All"},
            {"parameter": "categories", "column": "category", "operator": "IN"},
            {"parameter": "q", "column": "name", "operator": "CONTAINS"},
            {"parameter": "pattern", "column": "name", "operator": "LIKE"},
            {
                "parameter": "min_revenue",
                "column": "revenue",
                "operator": ">=",
                "data_type": "number",
            },
            {"parameter": "no_note", "column": "note", "operator": "IS NULL"},
        ],
        "response_fields": ["id", "name", "category"],
    }
    base.update(overrides)
    return ApiDefinitionIn.model_validate(base)


# --- Parameters ---------------------------------------------------------------------------


def test_resolve_params_coerces_and_skips_ignored():
    conds = make_api().conditions
    out = resolve_params(conds, {"year": "2010", "category": "All", "categories": "web, software"})
    assert out == {"year": 2010, "categories": ["web", "software"]}


def test_resolve_params_reports_all_errors():
    conds = make_api().conditions
    with pytest.raises(ParamError) as e:
        resolve_params(conds, {"year": "abc", "min_revenue": "x"})
    assert set(e.value.errors) == {"year", "min_revenue"}


def test_resolve_params_validation_rules():
    conds = make_api().conditions
    with pytest.raises(ParamError) as e:
        resolve_params(conds, {"year": 1800})
    assert "at least 1900" in e.value.errors["year"]


def test_required_and_date():
    conds = [
        Condition(parameter="d", column="c", data_type="date", required=True),
    ]
    with pytest.raises(ParamError):
        resolve_params(conds, {})
    assert resolve_params(conds, {"d": "2024-01-31"}) == {"d": date(2024, 1, 31)}


# --- SQL ----------------------------------------------------------------------------------


@pytest.fixture
def sql_ds(sqlite_db):
    yield FakeDataSource(1, "sqlite", {"path": sqlite_db})
    connectors.forget(1)


def run(api, ds, **params):
    paging = {
        k: params.pop(k) for k in ("limit", "offset", "order_by", "order_direction") if k in params
    }
    return run_api(api, ds, ApiRequest(params=params, include_query=True, **paging))


def names(result):
    return [r["name"] for r in result["data"]]


def test_sql_filters(sql_ds):
    api = make_api()
    assert names(run(api, sql_ds, year=2010)) == ["Initech", "O'Hare & Sons"]
    assert names(run(api, sql_ds, categories=["biotech", "web"])) == [
        "Acme",
        "Umbrella",
        "O'Hare & Sons",
    ]
    assert names(run(api, sql_ds, q="glo")) == ["Globex"]
    assert names(run(api, sql_ds, pattern="%ex")) == ["Globex"]
    assert names(run(api, sql_ds, min_revenue=100)) == ["Acme", "Umbrella"]
    assert names(run(api, sql_ds, no_note=True)) == ["Acme", "Initech", "O'Hare & Sons"]
    assert names(run(api, sql_ds, year=-1, category="All")) == [
        "Acme",
        "Globex",
        "Initech",
        "Umbrella",
        "O'Hare & Sons",
    ]


def test_sql_values_are_bound_not_interpolated(sql_ds):
    api = make_api()
    assert names(run(api, sql_ds, category="web' OR '1'='1")) == []
    assert names(run(api, sql_ds, q="'hare")) == ["O'Hare & Sons"]
    # CONTAINS escapes LIKE wildcards.
    assert names(run(api, sql_ds, q="%")) == []


def test_sql_order_by_must_be_a_response_field(sql_ds):
    api = make_api()
    with pytest.raises(ParamError):
        run(api, sql_ds, order_by="revenue; DROP TABLE companies")


def test_sql_pagination_and_ordering(sql_ds):
    api = make_api()
    result = run(api, sql_ds, limit=2, offset=2, order_by="name", order_direction="DESC")
    assert names(result) == ["Initech", "Globex"]
    assert result["pagination"] == {
        "limit": 2,
        "offset": 2,
        "total": 5,
        "page": 2,
        "total_pages": 3,
    }
    # limit is capped at max_limit
    assert run(api, sql_ds, limit=10_000)["pagination"]["limit"] == 100


def test_sql_response_transforms_and_hidden_sources(sql_ds):
    api = make_api(
        response_fields=["name"],
        response_transforms=[
            {
                "target": "founded",
                "type": "template",
                "template": "{founded_year}-{founded_month}-01",
            },
            {
                "target": "label",
                "type": "concat",
                "sources": ["name", "category"],
                "separator": " / ",
            },
            {"target": "short", "type": "substring", "sources": ["name"], "start": 1, "length": 3},
            {"target": "upper", "type": "upper", "sources": ["category"]},
        ],
    )
    row = run(api, sql_ds, year=2005)["data"][0]
    assert row == {
        "name": "Acme",
        "founded": "2005-3-01",
        "label": "Acme / web",
        "short": "Acm",
        "upper": "WEB",
    }


def test_sql_column_transform(sql_ds):
    api = make_api(
        conditions=[
            {"parameter": "prefix", "column": "name", "column_transform": {"substring": [1, 3]}},
        ]
    )
    assert names(run(api, sql_ds, prefix="Glo")) == ["Globex"]


def test_sql_select_star_when_no_fields(sql_ds):
    api = make_api(response_fields=[])
    row = run(api, sql_ds, year=2005)["data"][0]
    assert set(row) == {
        "id",
        "name",
        "category",
        "founded_year",
        "founded_month",
        "revenue",
        "note",
    }


# --- MongoDB ------------------------------------------------------------------------------


@pytest.fixture
def mongo_ds(mongo):
    yield FakeDataSource(2, "mongodb", {})
    connectors.forget(2)


def mongo_api(**overrides):
    return make_api(
        database="testdb",
        default_order_field="name",
        conditions=[
            {
                "parameter": "Founded_year",
                "column": "founded_year",
                "data_type": "integer",
                "ignore_if": "-3",
            },
            {"parameter": "category_code", "column": "category_code", "ignore_if": "All"},
            {"parameter": "q", "column": "name", "operator": "CONTAINS"},
            {"parameter": "pattern", "column": "name", "operator": "LIKE"},
            {"parameter": "cats", "column": "category_code", "operator": "NOT IN"},
            {
                "parameter": "min_revenue",
                "column": "revenue",
                "operator": ">",
                "data_type": "number",
            },
        ],
        response_fields=["name", "category_code"],
        **overrides,
    )


def test_mongo_filters_are_applied(mongo_ds):
    # Regression: the Flask version ignored every MongoDB condition.
    api = mongo_api()
    assert names(run(api, mongo_ds, Founded_year=2010)) == ["Initech", "O'Hare & Sons"]
    assert names(run(api, mongo_ds, Founded_year="-3", category_code="software")) == [
        "Globex",
        "Initech",
    ]
    assert names(run(api, mongo_ds, q="GLO")) == ["Globex"]
    assert names(run(api, mongo_ds, q=".*")) == []
    assert names(run(api, mongo_ds, pattern="%ch")) == ["Initech"]
    assert names(run(api, mongo_ds, cats="web,software")) == ["Umbrella"]
    assert names(run(api, mongo_ds, min_revenue=100, category_code="web")) == ["Acme"]


def test_mongo_projection_paging_and_count(mongo_ds):
    result = run(mongo_api(), mongo_ds, limit=2, offset=1)
    assert result["data"] == [
        {"name": "Globex", "category_code": "software"},
        {"name": "Initech", "category_code": "software"},
    ]
    assert result["pagination"]["total"] == 5
    assert result["query"] == {"filter": {}, "sort": {"name": "ASC"}}


# --- Legacy -------------------------------------------------------------------------------


def test_concat_to_template():
    assert concat_to_template("CONCAT(founded_year, '-', founded_month, '-01')") == (
        "{founded_year}-{founded_month}-01"
    )
    assert concat_to_template("UPPER(x)") is None


def test_sql_compiles_for_every_dialect():
    from sqlalchemy.dialects import mysql, postgresql
    from trino.sqlalchemy.dialect import TrinoDialect

    from app.engine import sql_builder

    api = make_api(
        conditions=[
            {
                "parameter": "y",
                "column": "founded year",
                "data_type": "integer",
                "column_transform": {"cast": "string", "trim": True},
            },
            {"parameter": "i", "column": "cat", "operator": "IN"},
        ]
    )
    params = resolve_params(api.conditions, {"y": "2010", "i": "x,y"})
    data, _ = sql_builder.build_queries(
        schema="dw",
        table="my table",
        fields=["id"],
        conditions=api.conditions,
        params=params,
        order_by="id",
        order_direction="DESC",
        limit=10,
        offset=20,
    )
    expected = {
        "mysql": "FROM dw.`my table`",
        "postgresql": 'FROM dw."my table"',
        "trino": 'FROM dw."my table"',
    }
    for name, dialect in (
        ("mysql", mysql.dialect()),
        ("postgresql", postgresql.dialect()),
        ("trino", TrinoDialect()),
    ):
        sql = str(data.compile(dialect=dialect, compile_kwargs={"literal_binds": True}))
        assert expected[name] in sql
        # The value is compared as a string because the column is cast to one.
        assert "= '2010'" in sql
