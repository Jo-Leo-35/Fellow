from fastapi import APIRouter, Request
from sqlalchemy import text

from app.db.database import Database
from app.schemas.health import HealthWire

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthWire)
def health(request: Request) -> HealthWire:
    database: Database = request.app.state.database
    with database.session_factory() as session:
        session.execute(text("SELECT 1"))
    return HealthWire(
        status="ok",
        database="ok",
        runtime_mode=request.app.state.settings.runtime_mode,
    )
