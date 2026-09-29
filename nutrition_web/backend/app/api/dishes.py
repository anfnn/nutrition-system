from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.database import db

router = APIRouter(tags=["Dishes"])


class DishCreate(BaseModel):
    name: str
    description: Optional[str] = None
    recipe: Optional[str] = None
    calories: float
    protein: float
    fat: float
    carbs: float
    category: str = "Основное"
    allergens: str = ""  # ← добавить



class DishUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    recipe: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    fat: Optional[float] = None
    carbs: Optional[float] = None
    category: Optional[str] = None
    allergens: Optional[str] = None  # ← добавить



@router.get("/")
async def get_dishes():
    dishes = db.fetch_all("SELECT * FROM dishes ORDER BY id")
    return dishes


@router.get("/{dish_id}")
async def get_dish(dish_id: int):
    dish = db.fetch_one("SELECT * FROM dishes WHERE id = %s", (dish_id,))
    if not dish:
        raise HTTPException(status_code=404, detail="Блюдо не найдено")
    return dish


@router.post("/")
async def create_dish(data: DishCreate):
    dish_id = db.execute(
        "INSERT INTO dishes (name, description, recipe, calories, protein, fat, carbs, category, allergens) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        (data.name, data.description, data.recipe, data.calories, data.protein, data.fat, data.carbs, data.category)
    )
    return {"id": dish_id, "message": "Блюдо создано"}


@router.put("/{dish_id}")
async def update_dish(dish_id: int, data: DishUpdate):
    existing = db.fetch_one("SELECT id FROM dishes WHERE id = %s", (dish_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Блюдо не найдено")

    updates = []
    params = []
    for field in ['name', 'description', 'recipe', 'calories', 'protein', 'fat', 'carbs', 'category', 'allergens']:
        val = getattr(data, field)
        if val is not None:
            updates.append(f"{field} = %s")
            params.append(val)

    if updates:
        params.append(dish_id)
        db.execute(f"UPDATE dishes SET {', '.join(updates)} WHERE id = %s", tuple(params))

    return {"message": "Блюдо обновлено"}


@router.delete("/{dish_id}")
async def delete_dish(dish_id: int):
    existing = db.fetch_one("SELECT id FROM dishes WHERE id = %s", (dish_id,))
    if not existing:
        raise HTTPException(status_code=404, detail="Блюдо не найдено")

    db.execute("DELETE FROM dishes WHERE id = %s", (dish_id,))
    return {"message": f"Блюдо #{dish_id} удалено"}


@router.get("/diets/")
async def get_diets():
    return db.fetch_all("SELECT id, name FROM diets ORDER BY id")