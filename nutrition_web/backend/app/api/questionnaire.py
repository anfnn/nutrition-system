from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from app.database import db
from app.services.diet_selector import DietSelectorService
from app.services.optimizer import solve_meal_optimization

router = APIRouter()
selector = DietSelectorService()


class Stage1Answers(BaseModel):
    answers: Dict[str, Any]


class Stage2Answers(BaseModel):
    answers: Dict[int, bool]


class OptimizationRequest(BaseModel):
    stage1: Dict[str, Any]
    stage2: Dict[int, bool]
    disliked_ingredients: List[str] = []


class RefreshRequest(BaseModel):
    stage1: Dict[str, Any]
    stage2: Dict[int, bool]
    diet_name: str
    diet_id: int  # ← ДОБАВЛЕНО
    diet_targets: Dict[str, float]
    disliked_ingredients: List[str] = []
    exclude_dish_ids: List[int] = []


@router.post("/stage1")
async def submit_stage1(data: Stage1Answers):
    try:
        clean_answers = {}
        for k, v in data.answers.items():
            try:
                key = int(k)
                clean_answers[key] = v
            except (ValueError, TypeError):
                pass

        if not clean_answers:
            return {"probabilities": [], "status": "error", "message": "Нет данных для расчёта"}

        probabilities = selector.calculate_probabilities(clean_answers)
        return {"probabilities": probabilities, "status": "ok"}
    except Exception as e:
        return {"probabilities": [], "status": "error", "message": str(e)}


@router.post("/optimize")
async def optimize_ration(data: OptimizationRequest):
    try:
        clean_stage1 = {}
        for k, v in data.stage1.items():
            try:
                key = int(k)
                clean_stage1[key] = v
            except (ValueError, TypeError):
                pass

        probs = selector.calculate_probabilities(clean_stage1)
        sorted_probs = sorted(probs, key=lambda x: x["probability"], reverse=True)
        selected = sorted_probs[0]["diet"]

        selected_diet = {
            "id": selected.get("id", 1),
            "name": selected.get("name", "Общая диета"),
            "description": selected.get("description", ""),
            "recommendation": selected.get("recommendation", ""),
            "calories_min": float(selected.get("calories_min", 0)),
            "calories_max": float(selected.get("calories_max", 0)),
            "protein_min": float(selected.get("protein_min", 0)),
            "protein_max": float(selected.get("protein_max", 0)),
            "fat_min": float(selected.get("fat_min", 0)),
            "fat_max": float(selected.get("fat_max", 0)),
            "carbs_min": float(selected.get("carbs_min", 0)),
            "carbs_max": float(selected.get("carbs_max", 0)),
        }

        all_dishes = db.fetch_all("SELECT id FROM dishes")
        dish_ids = [d["id"] for d in all_dishes]
        filtered_ids = selector.filter_dishes_by_allergies(dish_ids, data.stage2)

        if len(filtered_ids) < 4:
            filtered_ids = dish_ids[:min(len(dish_ids), 20)]

        bmi = float(clean_stage1.get(4, 22.0))

        targets = {
            "calories_min": selected_diet["calories_min"],
            "calories_max": selected_diet["calories_max"],
            "protein_min": selected_diet["protein_min"],
            "protein_max": selected_diet["protein_max"],
            "fat_min": selected_diet["fat_min"],
            "fat_max": selected_diet["fat_max"],
            "carbs_min": selected_diet["carbs_min"],
            "carbs_max": selected_diet["carbs_max"],
        }

        result = solve_meal_optimization(
            dish_ids=filtered_ids,
            targets=targets,
            user_bmi=bmi,
            allergies=data.stage2,
            diet_name=selected_diet.get("name", ""),
            diet_id=selected_diet.get("id")  # ← ДОБАВЛЕНО
        )

        if "error" in result:
            return {
                "diet": selected_diet,
                "ration": {"totals": {"calories": 0, "protein": 0, "fat": 0, "carbs": 0}, "dishes": []},
                "error": result["error"]
            }

        return {"diet": selected_diet, "ration": result}

    except Exception as e:
        return {
            "diet": {"name": "Ошибка"},
            "ration": {"totals": {"calories": 0, "protein": 0, "fat": 0, "carbs": 0}, "dishes": []},
            "error": str(e)
        }


@router.post("/refresh")
async def refresh_ration(data: RefreshRequest):
    """Генерация альтернативного набора блюд"""
    try:
        all_dishes = db.fetch_all("SELECT id FROM dishes")
        dish_ids = [d["id"] for d in all_dishes]
        filtered_ids = selector.filter_dishes_by_allergies(dish_ids, data.stage2)

        if data.exclude_dish_ids:
            filtered_ids = [d for d in filtered_ids if d not in data.exclude_dish_ids]

        if len(filtered_ids) < 4:
            filtered_ids = [d for d in dish_ids if d not in data.exclude_dish_ids]

        clean_stage1 = {}
        for k, v in data.stage1.items():
            try:
                key = int(k)
                clean_stage1[key] = v
            except (ValueError, TypeError):
                pass

        bmi = float(clean_stage1.get(4, 22.0))

        result = solve_meal_optimization(
            dish_ids=filtered_ids,
            targets=data.diet_targets,
            user_bmi=bmi,
            allergies=data.stage2,
            diet_name=data.diet_name,
            diet_id=data.diet_id  # ← ДОБАВЛЕНО
        )

        return {"ration": result}
    except Exception as e:
        return {
            "ration": {"totals": {"calories": 0, "protein": 0, "fat": 0, "carbs": 0}, "dishes": []},
            "error": str(e)
        }