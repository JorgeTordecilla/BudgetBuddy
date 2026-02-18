from fastapi.responses import JSONResponse

from app.core.constants import VENDOR_JSON


def vendor_response(content: dict | list, status_code: int = 200) -> JSONResponse:
    return JSONResponse(status_code=status_code, content=content, media_type=VENDOR_JSON)
