from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Query
from sqlalchemy import case, func, select

from app.deps import DB, CurrentUser
from app.models import ApiCall, ApiDefinition
from app.schemas import DailyPoint, MetricsOverview, NamedCount, RecentError

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/overview", response_model=MetricsOverview)
def overview(db: DB, _: CurrentUser, days: int = Query(30, ge=1, le=365)):
    since = datetime.now(UTC) - timedelta(days=days)
    in_range = ApiCall.timestamp >= since
    success = ApiCall.status_code < 400

    total, ok, avg_ms = db.execute(
        select(
            func.count(ApiCall.id),
            func.coalesce(func.sum(case((success, 1), else_=0)), 0),
            func.coalesce(func.avg(ApiCall.response_time_ms), 0),
        ).where(in_range)
    ).one()

    day = func.date(ApiCall.timestamp)
    daily_rows = db.execute(
        select(day, func.sum(case((success, 1), else_=0)), func.count(ApiCall.id))
        .where(in_range)
        .group_by(day)
        .order_by(day)
    ).all()
    by_day = {str(d): (int(s), int(t)) for d, s, t in daily_rows}
    today = datetime.now(UTC).date()
    daily = []
    for i in range(days - 1, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        s, t = by_day.get(d, (0, 0))
        daily.append(DailyPoint(date=d, success=s, failed=t - s))

    top = db.execute(
        select(ApiCall.api_slug, func.count(ApiCall.id).label("n"))
        .where(in_range)
        .group_by(ApiCall.api_slug)
        .order_by(func.count(ApiCall.id).desc())
        .limit(5)
    ).all()

    status_rows = db.execute(
        select(ApiCall.status_code, func.count(ApiCall.id))
        .where(in_range)
        .group_by(ApiCall.status_code)
    ).all()
    groups: dict[str, int] = {}
    for code, n in status_rows:
        key = f"{code // 100}xx"
        groups[key] = groups.get(key, 0) + n

    slow = db.execute(
        select(ApiCall.api_slug, func.avg(ApiCall.response_time_ms).label("ms"))
        .where(in_range)
        .group_by(ApiCall.api_slug)
        .order_by(func.avg(ApiCall.response_time_ms).desc())
        .limit(5)
    ).all()

    errors = db.scalars(
        select(ApiCall)
        .where(in_range, ApiCall.status_code >= 400)
        .order_by(ApiCall.timestamp.desc())
        .limit(10)
    ).all()

    api_count, active_count = db.execute(
        select(func.count(ApiDefinition.id), func.sum(case((ApiDefinition.is_active, 1), else_=0)))
    ).one()

    return MetricsOverview(
        total_calls=total,
        success_rate=round(ok / total * 100, 1) if total else 0.0,
        avg_response_ms=round(float(avg_ms), 1),
        api_count=api_count,
        active_api_count=active_count or 0,
        daily=daily,
        top_apis=[NamedCount(name=s, value=n) for s, n in top],
        status_codes=[NamedCount(name=k, value=v) for k, v in sorted(groups.items())],
        slowest_apis=[NamedCount(name=s, value=round(float(ms), 1)) for s, ms in slow],
        recent_errors=[
            RecentError(
                api=e.api_slug,
                status_code=e.status_code,
                message=e.error_message,
                timestamp=e.timestamp,
            )
            for e in errors
        ],
    )
