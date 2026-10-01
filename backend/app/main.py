import logging
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import FileResponse
from sqlalchemy import func, select

from app.core.config import Settings, get_settings
from app.core.db import Base, SessionLocal, init_engine
from app.core.security import hash_password
from app.engine import connectors
from app.engine.openapi import COMPONENTS, api_paths
from app.models import ApiDefinition, User
from app.routers import api_keys, apis, auth, datasources, generated, metrics, users

logger = logging.getLogger(__name__)

PANEL_PREFIX = "/admin-api"


def ensure_admin(settings: Settings) -> None:
    """Create the first admin account when there are no users yet."""
    db = SessionLocal()
    try:
        if db.scalar(select(func.count()).select_from(User)):
            return
        password = settings.admin_password or secrets.token_urlsafe(12)
        db.add(
            User(
                username=settings.admin_username,
                password_hash=hash_password(password),
                role="admin",
            )
        )
        db.commit()
        if settings.admin_password:
            logger.info("Created admin user '%s'", settings.admin_username)
        else:
            logger.warning(
                "Created admin user '%s' with generated password %s (set ADMIN_PASSWORD to choose)",
                settings.admin_username,
                password,
            )
    finally:
        db.close()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        engine = init_engine(settings.database_url)
        Base.metadata.create_all(engine)
        ensure_admin(settings)
        yield
        connectors.close_all()

    app = FastAPI(
        title="Simple API Generator",
        version="2.0.0",
        description="Build REST APIs on top of your databases without writing code.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    panel = APIRouter(prefix=PANEL_PREFIX)
    for module in (auth, users, api_keys, datasources, apis, metrics):
        panel.include_router(module.router)
    app.include_router(panel)
    app.include_router(generated.router)

    @app.get("/health", tags=["health"])
    def health():
        return {"status": "ok"}

    _install_openapi(app)
    _install_frontend(app, Path(settings.frontend_dist))
    return app


def _install_openapi(app: FastAPI) -> None:
    """Document the generated APIs next to the panel API; rebuilt on every request."""

    def openapi():
        spec = get_openapi(
            title=app.title, version=app.version, description=app.description, routes=app.routes
        )
        db = SessionLocal()
        try:
            rows = db.scalars(select(ApiDefinition).where(ApiDefinition.is_active)).all()
            definitions = [apis.definition_of(r) for r in rows]
        finally:
            db.close()
        spec["paths"].update(api_paths(definitions))
        components = spec.setdefault("components", {})
        components.setdefault("schemas", {}).update(COMPONENTS["schemas"])
        components.setdefault("securitySchemes", {}).update(COMPONENTS["securitySchemes"])
        return spec

    app.openapi = openapi


def _install_frontend(app: FastAPI, dist: Path) -> None:
    """Serve the built React app, falling back to index.html for client-side routes."""
    index = dist / "index.html"
    if not index.is_file():
        return
    root = dist.resolve()

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith(("api/", PANEL_PREFIX.lstrip("/") + "/")):
            raise HTTPException(404, "Not found")
        candidate = (root / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(root):
            return FileResponse(candidate)
        return FileResponse(index)


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
app = create_app()
