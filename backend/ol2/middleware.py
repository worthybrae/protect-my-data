from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import secure

secure_headers = secure.Secure.with_default_headers()

class SecureHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        await secure_headers.set_headers_async(response)
        return response

def setup_middlewares(app: FastAPI):
    app.add_middleware(SecureHeadersMiddleware)

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        # You can add request logging here if needed
        response = await call_next(request)
        return response