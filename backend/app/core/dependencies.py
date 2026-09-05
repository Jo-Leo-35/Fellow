from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError
from app.db.database import get_db
from app.db.models import AuthSession, DemoPrincipal, User
from app.schemas.enums import Role
from app.services.auth import authenticate_bearer_token


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings


AppSettingsDependency = Annotated[Settings, Depends(get_app_settings)]
DbSessionDependency = Annotated[Session, Depends(get_db)]
demo_bearer = HTTPBearer(
    auto_error=False,
    scheme_name="DemoBearer",
    description="Use the access_token returned by POST /api/v1/auth/demo/session.",
)


@dataclass(frozen=True, slots=True)
class AuthenticatedPrincipal:
    auth_session: AuthSession
    principal: DemoPrincipal
    user: User


def get_current_principal(
    request: Request,
    db: DbSessionDependency,
    _credentials: Annotated[HTTPAuthorizationCredentials | None, Security(demo_bearer)],
) -> AuthenticatedPrincipal:
    # The optional parser advertises Bearer auth; the existing validator owns errors.
    auth_session, principal, user = authenticate_bearer_token(request, db)
    return AuthenticatedPrincipal(
        auth_session=auth_session,
        principal=principal,
        user=user,
    )


CurrentPrincipalDependency = Annotated[
    AuthenticatedPrincipal, Depends(get_current_principal)
]


def require_student(current: CurrentPrincipalDependency) -> AuthenticatedPrincipal:
    return _require_role(current, Role.STUDENT)


def require_teacher(current: CurrentPrincipalDependency) -> AuthenticatedPrincipal:
    return _require_role(current, Role.TEACHER)


def require_government(current: CurrentPrincipalDependency) -> AuthenticatedPrincipal:
    return _require_role(current, Role.GOVERNMENT)


def require_student_or_teacher(
    current: CurrentPrincipalDependency,
) -> AuthenticatedPrincipal:
    if current.user.role not in {Role.STUDENT, Role.TEACHER}:
        raise AppError(
            status_code=403,
            code="FORBIDDEN",
            message="目前身份沒有此功能的使用權限。",
        )
    return current


def _require_role(
    current: AuthenticatedPrincipal, role: Role
) -> AuthenticatedPrincipal:
    if current.user.role != role:
        raise AppError(
            status_code=403,
            code="FORBIDDEN",
            message="目前身份沒有此功能的使用權限。",
        )
    return current


def require_self(user_id: str, current: AuthenticatedPrincipal) -> None:
    if current.user.id != user_id:
        raise AppError(
            status_code=403,
            code="USER_SCOPE_FORBIDDEN",
            message="不能存取其他使用者的資料。",
        )


StudentPrincipalDependency = Annotated[AuthenticatedPrincipal, Depends(require_student)]
TeacherPrincipalDependency = Annotated[AuthenticatedPrincipal, Depends(require_teacher)]
GovernmentPrincipalDependency = Annotated[
    AuthenticatedPrincipal, Depends(require_government)
]
StudentOrTeacherPrincipalDependency = Annotated[
    AuthenticatedPrincipal, Depends(require_student_or_teacher)
]
