from typing import Annotated

from fastapi import APIRouter, Path

from app.core.dependencies import (
    AppSettingsDependency,
    DbSessionDependency,
    StudentOrTeacherPrincipalDependency,
    StudentPrincipalDependency,
)
from app.schemas.enums import ResourceCategory
from app.schemas.resources import (
    LearningMaterialsWire,
    ResourceListWire,
    ResourceProgramWire,
)
from app.services.resources import get_resource, list_learning_materials, list_resources

router = APIRouter(tags=["resources"])


@router.get("/resources", response_model=ResourceListWire)
def resources(
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
    settings: AppSettingsDependency,
    category: ResourceCategory | None = None,
    recommended_only: bool = False,
) -> ResourceListWire:
    return list_resources(
        db,
        current.user.id,
        category,
        recommended_only,
        settings.runtime_mode == "offline_demo",
    )


@router.get("/resources/{program_id}", response_model=ResourceProgramWire)
def resource_detail(
    program_id: Annotated[str, Path(min_length=1, max_length=128)],
    current: StudentPrincipalDependency,
    db: DbSessionDependency,
) -> ResourceProgramWire:
    return get_resource(db, current.user.id, program_id)


@router.get("/learning/materials", response_model=LearningMaterialsWire)
def learning_materials(
    _current: StudentOrTeacherPrincipalDependency,
    db: DbSessionDependency,
    settings: AppSettingsDependency,
) -> LearningMaterialsWire:
    return list_learning_materials(db, settings.runtime_mode == "offline_demo")
