from fastapi import FastAPI
from fastapi.responses import JSONResponse
import yaml
from pathlib import Path

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

SPEC_PATH = Path(__file__).resolve().parent.parent / "openapi.yaml"

def load_spec():
    return yaml.safe_load(SPEC_PATH.read_text(encoding="utf-8"))

@app.get("/api/health", include_in_schema=False)
def health():
    return {"status": "ok"}

@app.get("/api/openapi.json", include_in_schema=False)
def openapi_json():
    return JSONResponse(load_spec())
