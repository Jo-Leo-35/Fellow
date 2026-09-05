from __future__ import annotations

import re
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings, get_settings
from app.core.errors import error_response, install_exception_handlers
from app.core.rate_limit import SlidingWindowRateLimiter
from app.db.database import Database
from app.routers.agent import router as agent_router
from app.routers.alerts import router as alerts_router
from app.routers.auth import router as auth_router
from app.routers.conversations import router as conversations_router
from app.routers.dashboards import router as dashboards_router
from app.routers.profiles import router as profiles_router
from app.routers.resources import router as resources_router
from app.routers.system import router as system_router
from app.routers.uploads import router as uploads_router
from app.services.quota import recover_reservations
from app.services.startup import validate_startup_readiness
from app.services.uploads import cleanup_expired_unattached_uploads


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        resolved_settings.prepare_directories()
        database = Database(resolved_settings)
        try:
            database.create_schema()
            with database.session_factory() as session:
                validate_startup_readiness(session, resolved_settings)
            with database.session_factory() as session:
                cleanup_expired_unattached_uploads(session, resolved_settings)
            with database.session_factory() as session:
                recover_reservations(session)
            app.state.database = database
            yield
        finally:
            database.dispose()

    app = FastAPI(
        title=resolved_settings.app_name,
        version="0.1.0",
        description="FutureAI modular-monolith core API.",
        lifespan=lifespan,
    )
    app.state.settings = resolved_settings
    app.state.rate_limiter = SlidingWindowRateLimiter()

    @app.middleware("http")
    async def request_boundary_middleware(request: Request, call_next):
        supplied_request_id = request.headers.get("X-Request-ID", "")
        request.state.request_id = (
            supplied_request_id
            if re.fullmatch(r"[A-Za-z0-9._-]{1,128}", supplied_request_id)
            else uuid.uuid4().hex
        )

        def secure_response(response):
            response.headers["X-Request-ID"] = request.state.request_id
            response.headers.setdefault("X-Content-Type-Options", "nosniff")
            response.headers.setdefault("Referrer-Policy", "no-referrer")
            if request.url.path.startswith(resolved_settings.api_prefix):
                response.headers.setdefault("Cache-Control", "no-store")
            return response

        if request.method in {"POST", "PUT", "PATCH"}:
            upload_path = request.url.path == f"{resolved_settings.api_prefix}/uploads"
            limit = (
                resolved_settings.max_multipart_body_bytes
                if upload_path
                else resolved_settings.max_json_body_bytes
            )
            content_length = request.headers.get("Content-Length")
            if content_length is not None:
                try:
                    declared_length = int(content_length)
                except ValueError:
                    declared_length = -1
                if declared_length < 0:
                    response = error_response(
                        request,
                        status_code=400,
                        code="VALIDATION_ERROR",
                        message="Content-Length 格式不正確。",
                    )
                    return secure_response(response)
                if declared_length > limit:
                    response = error_response(
                        request,
                        status_code=413,
                        code="FILE_TOO_LARGE" if upload_path else "VALIDATION_ERROR",
                        message=(
                            "上傳請求超過 Demo 允許大小。"
                            if upload_path
                            else "JSON 請求內容超過 Demo 允許大小。"
                        ),
                    )
                    return secure_response(response)

            body = bytearray()
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body) > limit:
                    response = error_response(
                        request,
                        status_code=413,
                        code="FILE_TOO_LARGE" if upload_path else "VALIDATION_ERROR",
                        message=(
                            "上傳請求超過 Demo 允許大小。"
                            if upload_path
                            else "JSON 請求內容超過 Demo 允許大小。"
                        ),
                    )
                    return secure_response(response)
            request._body = bytes(body)

        response = await call_next(request)
        return secure_response(response)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.allowed_frontend_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Accept",
            "Authorization",
            "Content-Type",
            "Idempotency-Key",
            "X-Request-ID",
        ],
        expose_headers=[
            "Content-Length",
            "Content-Type",
            "Retry-After",
            "X-Request-ID",
        ],
    )

    install_exception_handlers(app)
    app.include_router(system_router)
    for router in (
        auth_router,
        agent_router,
        profiles_router,
        conversations_router,
        resources_router,
        alerts_router,
        uploads_router,
        dashboards_router,
    ):
        app.include_router(router, prefix=resolved_settings.api_prefix)

    return app


app = create_app()
