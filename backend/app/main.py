from pathlib import Path
import logging
import time
import uuid
from contextlib import asynccontextmanager

import yaml
from fastapi import APIRouter, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.constants import API_PREFIX, PROBLEM_JSON, VENDOR_JSON
from app.core.config import settings
from app.core.errors import APIError, ProblemDetails, register_exception_handlers
from app.core.http_security import apply_security_headers
from app.db import get_migration_revision_state, is_database_ready
from app.dependencies import enforce_accept_header, enforce_content_type
from app.routers.accounts import router as accounts_router
from app.routers.analytics import router as analytics_router
from app.routers.audit import router as audit_router
from app.routers.auth import router as auth_router
from app.routers.auth import session_router as auth_session_router
from app.routers.budgets import router as budgets_router
from app.routers.categories import router as categories_router
from app.routers.transactions import router as transactions_router

logger = logging.getLogger("app.startup")
readiness_logger = logging.getLogger("app.readiness")
access_logger = logging.getLogger("app.access")

logging.getLogger().setLevel(getattr(logging, settings.log_level, logging.INFO))


@asynccontextmanager
async def lifespan(_app: FastAPI):
    safe = settings.safe_log_fields()
    logger.info(
        "config loaded env=%s debug=%s db_scheme=%s cors_origins=%s refresh_cookie_secure=%s refresh_cookie_samesite=%s refresh_cookie_domain_configured=%s migrations_strict=%s",
        safe["env"],
        safe["debug"],
        safe["database_scheme"],
        safe["cors_origins_count"],
        safe["refresh_cookie_secure"],
        safe["refresh_cookie_samesite"],
        safe["refresh_cookie_domain_configured"],
        safe["migrations_strict"],
    )
    yield


app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-Id"],
    expose_headers=["X-Request-Id", "Retry-After"],
)

SPEC_PATH = Path(__file__).resolve().parent.parent / "openapi.yaml"
REQUEST_ID_HEADER = "X-Request-Id"


def load_spec():
    return yaml.safe_load(SPEC_PATH.read_text(encoding="utf-8"))


API_VERSION = str(load_spec().get("info", {}).get("version", "unknown"))


@app.middleware("http")
async def contract_guards(request: Request, call_next):
    started_at = time.perf_counter()
    incoming_request_id = request.headers.get(REQUEST_ID_HEADER, "").strip()
    request_id = incoming_request_id or str(uuid.uuid4())
    request.state.request_id = request_id

    def _log_access(status_code: int) -> None:
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        user_id = getattr(request.state, "user_id", None)
        access_logger.info(
            "request_id=%s method=%s path=%s status_code=%s duration_ms=%s user_id=%s",
            request_id,
            request.method,
            request.url.path,
            status_code,
            duration_ms,
            user_id or "-",
        )

    try:
        enforce_accept_header(request)
        enforce_content_type(request)
    except APIError as exc:
        body = ProblemDetails.payload(
            status=exc.status,
            title=exc.title,
            detail=exc.detail,
            type_=exc.type_,
            instance=str(request.url),
        )
        headers = {REQUEST_ID_HEADER: request_id}
        headers.update(exc.headers)
        response = JSONResponse(
            status_code=exc.status,
            content=body,
            media_type=PROBLEM_JSON,
            headers=headers,
        )
        apply_security_headers(response)
        _log_access(exc.status)
        return response
    try:
        response = await call_next(request)
    except Exception:
        _log_access(500)
        raise
    response.headers[REQUEST_ID_HEADER] = request_id
    apply_security_headers(response)
    _log_access(response.status_code)
    return response

register_exception_handlers(app)

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(auth_session_router)
api_router.include_router(accounts_router)
api_router.include_router(categories_router)
api_router.include_router(transactions_router)
api_router.include_router(budgets_router)
api_router.include_router(audit_router)
api_router.include_router(analytics_router)
app.include_router(api_router, prefix=API_PREFIX)


@app.get(f"{API_PREFIX}/health", include_in_schema=False)
def health():
    return {"status": "ok"}


@app.get(f"{API_PREFIX}/healthz")
def healthz():
    return JSONResponse(
        content={"status": "ok", "version": API_VERSION},
        media_type=VENDOR_JSON,
    )


@app.get(f"{API_PREFIX}/readyz")
def readyz():
    checks = {"db": "ok", "schema": "skip"}
    if not is_database_ready():
        checks["db"] = "fail"
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "version": API_VERSION, "checks": checks},
            media_type=VENDOR_JSON,
        )
    schema_state, db_revision, head_revision = get_migration_revision_state()
    if schema_state == "ok":
        checks["schema"] = "ok"
    elif settings.migrations_strict:
        checks["schema"] = "fail"
    else:
        checks["schema"] = "fail" if schema_state == "fail" else "skip"

    readiness_logger.info(
        "readyz migration_check db_revision=%s head_revision=%s migrations_strict=%s schema_status=%s",
        db_revision or "unknown",
        head_revision or "unknown",
        settings.migrations_strict,
        checks["schema"],
    )
    if settings.migrations_strict and checks["schema"] != "ok":
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "version": API_VERSION, "checks": checks},
            media_type=VENDOR_JSON,
        )
    return JSONResponse(
        content={"status": "ready", "version": API_VERSION, "checks": checks},
        media_type=VENDOR_JSON,
    )


@app.get(f"{API_PREFIX}/openapi.json", include_in_schema=False)
def openapi_json():
    return JSONResponse(load_spec())
