from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class RoleRequest(BaseModel):
    role: str  # "patient" или "admin"

@router.post("/select-role")
async def select_role(data: RoleRequest):
    if data.role == "admin":
        return {"role": "admin", "message": "Вход как администратор"}
    else:
        return {"role": "patient", "message": "Вход как пациент"}