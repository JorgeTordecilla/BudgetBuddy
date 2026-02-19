from pathlib import Path
from contextlib import asynccontextmanager
import uuid

import yaml
from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.constants import API_PREFIX, PROBLEM_JSON
from app.core.errors import APIError, ProblemDetails, register_exception_handlers
from app.db import Base, engine
from app.dependencies import enforce_accept_header, enforce_content_type
from app.routers.accounts import router as accounts_router
from app.routers.analytics import router as analytics_router
from app.routers.auth import router as auth_router
from app.routers.categories import router as categories_router
from app.routers.transactions import router as transactions_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)

SPEC_PATH = Path(__file__).resolve().parent.parent / "openapi.yaml"
REQUEST_ID_HEADER = "X-Request-Id"


def load_spec():
    return yaml.safe_load(SPEC_PATH.read_text(encoding="utf-8"))


@app.middleware("http")
async def contract_guards(request: Request, call_next):
    incoming_request_id = request.headers.get(REQUEST_ID_HEADER, "").strip()
    request_id = incoming_request_id or str(uuid.uuid4())
    request.state.request_id = request_id
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
        return JSONResponse(
            status_code=exc.status,
            content=body,
            media_type=PROBLEM_JSON,
            headers={REQUEST_ID_HEADER: request_id},
        )
    response = await call_next(request)
    response.headers[REQUEST_ID_HEADER] = request_id
    return response

register_exception_handlers(app)

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(accounts_router)
api_router.include_router(categories_router)
api_router.include_router(transactions_router)
api_router.include_router(analytics_router)
app.include_router(api_router, prefix=API_PREFIX)


@app.get(f"{API_PREFIX}/health", include_in_schema=False)
def health():
    return {"status": "ok"}


@app.get(f"{API_PREFIX}/openapi.json", include_in_schema=False)
def openapi_json():
    return JSONResponse(load_spec())
