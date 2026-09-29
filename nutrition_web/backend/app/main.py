import app.patch_pydantic
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.database import db
from app.api import questionnaire, dishes, role  # ← убрать auth, добавить role

app = FastAPI(title="IntelliDiet API", version="1.0.0")

@app.on_event("startup")
def startup():
    db.connect()

@app.on_event("shutdown")
def shutdown():
    db.disconnect()

@app.middleware("http")
async def cors_handler(request: Request, call_next):
    if request.method == "OPTIONS":
        response = Response(status_code=200)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

# Роутеры
app.include_router(role.router, prefix="/api")  # ← добавить
app.include_router(questionnaire.router, prefix="/api/questionnaire")
app.include_router(dishes.router, prefix="/api/dishes")
# Удалить: app.include_router(auth.router, prefix="/api/auth")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "API works"}