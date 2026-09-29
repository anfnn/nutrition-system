from typing import List, Dict, Any
import numpy as np
from scipy.optimize import linprog
from app.database import db


def solve_meal_optimization(
        dish_ids: List[int],
        targets: Dict[str, float],
        user_bmi: float,
        allergies: Dict[int, bool] = None,
        diet_name: str = "",
        diet_id: int = None  # ← ДОБАВИТЬ ЭТУ СТРОКУ
) -> Dict[str, Any]:
    """Оптимизация рациона: симплекс-метод + метод ветвей и границ (PuLP)"""
    
    if not dish_ids:
        return {"error": "Нет блюд"}

    placeholders = ",".join(["%s"] * len(dish_ids))
    dishes_raw = db.fetch_all(
        f"SELECT id, name, calories, protein, fat, carbs FROM dishes WHERE id IN ({placeholders})",
        tuple(dish_ids)
    )

    if len(dishes_raw) < 4:
        return {"error": "Мало блюд (минимум 4)"}

    dishes = []
    for d in dishes_raw:
        dishes.append({
            "id": d["id"], "name": d["name"],
            "calories": float(d["calories"]), "protein": float(d["protein"]),
            "fat": float(d["fat"]), "carbs": float(d["carbs"])
        })

    # Фильтрация по диете
    diet_lower = diet_name.lower()
    if "низкобелк" in diet_lower:
        dishes = [d for d in dishes if d["protein"] < 20]
    elif "высокобелк" in diet_lower:
        dishes = [d for d in dishes if d["protein"] > 10]
    elif "низкокалор" in diet_lower:
        dishes = [d for d in dishes if d["calories"] < 150]
    elif "высококалор" in diet_lower:
        dishes = [d for d in dishes if d["calories"] > 100]
    elif "щадящ" in diet_lower:
        dishes = [d for d in dishes if d["fat"] < 15 and d["protein"] < 25]
    
    if len(dishes) < 4:
        dishes = [{"id": d["id"], "name": d["name"],
                    "calories": float(d["calories"]), "protein": float(d["protein"]),
                    "fat": float(d["fat"]), "carbs": float(d["carbs"])} for d in dishes_raw]

    n = len(dishes)
    
    # Нормировка показателей (делим на максимальное значение)
    cal_values = [d["calories"] for d in dishes]
    prot_values = [d["protein"] for d in dishes]
    fat_values = [d["fat"] for d in dishes]
    carb_values = [d["carbs"] for d in dishes]
    
    max_cal = max(cal_values) if max(cal_values) > 0 else 1
    max_prot = max(prot_values) if max(prot_values) > 0 else 1
    max_fat = max(fat_values) if max(fat_values) > 0 else 1
    max_carb = max(carb_values) if max(carb_values) > 0 else 1
    
    a_cal = [v / max_cal for v in cal_values]
    a_prot = [v / max_prot for v in prot_values]
    a_fat = [v / max_fat for v in fat_values]
    a_carb = [v / max_carb for v in carb_values]

    # Нормированные целевые значения
    cal_lo = float(targets.get("calories_min", 0)) or 1500
    cal_hi = float(targets.get("calories_max", 0)) or 2500
    prot_lo = float(targets.get("protein_min", 0)) or 60
    prot_hi = float(targets.get("protein_max", 0)) or 120
    fat_lo = float(targets.get("fat_min", 0)) or 40
    fat_hi = float(targets.get("fat_max", 0)) or 100
    carb_lo = float(targets.get("carbs_min", 0)) or 200
    carb_hi = float(targets.get("carbs_max", 0)) or 400

    b_cal = ((cal_lo + cal_hi) / 2) / max_cal
    b_prot = ((prot_lo + prot_hi) / 2) / max_prot
    b_fat = ((fat_lo + fat_hi) / 2) / max_fat
    b_carb = ((carb_lo + carb_hi) / 2) / max_carb

    # ============================================
    # ЭТАП 1: Метод ветвей и границ (PuLP + CBC)
    # ============================================
    try:
        import pulp
        
        prob = pulp.LpProblem("DailyRation", pulp.LpMinimize)

        # Переменные
        x = [pulp.LpVariable(f"x{j}", lowBound=0, upBound=5) for j in range(n)]
        y = [pulp.LpVariable(f"y{j}", cat="Binary") for j in range(n)]
        
        # Вспомогательные переменные u_i и v_i для линеаризации модуля
        u_cal = pulp.LpVariable("u_cal", lowBound=0)
        v_cal = pulp.LpVariable("v_cal", lowBound=0)
        u_prot = pulp.LpVariable("u_prot", lowBound=0)
        v_prot = pulp.LpVariable("v_prot", lowBound=0)
        u_fat = pulp.LpVariable("u_fat", lowBound=0)
        v_fat = pulp.LpVariable("v_fat", lowBound=0)
        u_carb = pulp.LpVariable("u_carb", lowBound=0)
        v_carb = pulp.LpVariable("v_carb", lowBound=0)

        # Целевая функция: Z = Σ(u_i + 2v_i) → min
        prob += (u_cal + v_cal) + (u_prot + v_prot) + (u_fat + v_fat) + (u_carb + v_carb)

        # Ограничения: Σa_ij·x_j - b_i = u_i - 2v_i
        prob += pulp.lpSum([a_cal[j] * x[j] for j in range(n)]) - b_cal == u_cal - v_cal
        prob += pulp.lpSum([a_prot[j] * x[j] for j in range(n)]) - b_prot == u_prot - v_prot
        prob += pulp.lpSum([a_fat[j] * x[j] for j in range(n)]) - b_fat == u_fat - v_fat
        prob += pulp.lpSum([a_carb[j] * x[j] for j in range(n)]) - b_carb == u_carb - v_carb

        # Количество блюд: 4 ≤ Σy_j ≤ 6
        prob += pulp.lpSum([y[j] for j in range(n)]) >= 4
        prob += pulp.lpSum([y[j] for j in range(n)]) <= 6

        # Связь x_j и y_j: 0 ≤ x_j ≤ 5y_j
        for j in range(n):
            prob += x[j] <= 5 * y[j]

        # Медицинские ограничения
        if allergies:
            if allergies.get(106):
                prob += pulp.lpSum([a_carb[j] * x[j] for j in range(n)]) <= b_carb * 1.1
            if allergies.get(107):
                prob += pulp.lpSum([a_fat[j] * x[j] for j in range(n)]) <= b_fat * 1.1

        # Запуск решателя (Branch and Bound внутри CBC)
        prob.solve(pulp.PULP_CBC_CMD(msg=False, timeLimit=90))

        if pulp.LpStatus[prob.status] == 'Optimal':
            result_dishes = []
            total_cal = total_prot = total_fat = total_carbs = 0

            for j in range(n):
                xj = pulp.value(x[j]) or 0
                if xj > 0.01:
                    dish = dishes[j]
                    grams = round(xj * 100)
                    portions = xj
                    result_dishes.append({
                        "dish_id": dish["id"], "dish_name": dish["name"],
                        "grams": grams, "portions_100g": round(portions, 2),
                        "calories": round(float(dish["calories"]) * portions, 1),
                        "protein": round(float(dish["protein"]) * portions, 1),
                        "fat": round(float(dish["fat"]) * portions, 1),
                        "carbs": round(float(dish["carbs"]) * portions, 1)
                    })
                    total_cal += dish["calories"] * portions
                    total_prot += dish["protein"] * portions
                    total_fat += dish["fat"] * portions
                    total_carbs += dish["carbs"] * portions

            return {
                "dishes": result_dishes,
                "totals": {
                    "calories": round(float(total_cal), 1),
                    "protein": round(float(total_prot), 1),
                    "fat": round(float(total_fat), 1),
                    "carbs": round(float(total_carbs), 1)
                }
            }
    except:
        pass

    # ============================================
    # ЭТАП 2: Симплекс-метод (SciPy) — резервный
    # ============================================
    if user_bmi < 18.5:
        c_obj = [-x for x in cal_values]
    else:
        c_obj = cal_values

    A_ub = []
    b_ub = []
    
    A_ub.append(cal_values); b_ub.append(cal_hi)
    A_ub.append(prot_values); b_ub.append(prot_hi)
    A_ub.append(fat_values); b_ub.append(fat_hi)
    A_ub.append(carb_values); b_ub.append(carb_hi)
    A_ub.append([-x for x in cal_values]); b_ub.append(-cal_lo)
    A_ub.append([-x for x in prot_values]); b_ub.append(-prot_lo)
    A_ub.append([-x for x in fat_values]); b_ub.append(-fat_lo)
    A_ub.append([-x for x in carb_values]); b_ub.append(-carb_lo)

    if allergies:
        if allergies.get(106):
            A_ub.append(carb_values); b_ub.append(carb_hi)
        if allergies.get(107):
            A_ub.append(fat_values); b_ub.append(fat_hi)

    result = linprog(c_obj, A_ub=A_ub, b_ub=b_ub, bounds=[(0,5)]*n, method='highs')

    if not result.success:
        return {"error": f"Решение не найдено: {result.message}"}

    x_vals = result.x
    dish_scores = [(x_vals[j], dishes[j]) for j in range(n) if x_vals[j] > 0.01]
    dish_scores.sort(reverse=True, key=lambda x: x[0])
    
    num = min(6, max(4, len(dish_scores)))
    selected = dish_scores[:num]

    result_dishes = []
    total_cal = total_prot = total_fat = total_carbs = 0

    for portions, dish in selected:
        grams = round(portions * 100)
        result_dishes.append({
            "dish_id": dish["id"], "dish_name": dish["name"],
            "grams": grams, "portions_100g": round(portions, 2),
            "calories": round(float(dish["calories"]) * portions, 1),
            "protein": round(float(dish["protein"]) * portions, 1),
            "fat": round(float(dish["fat"]) * portions, 1),
            "carbs": round(float(dish["carbs"]) * portions, 1)
        })
        total_cal += dish["calories"] * portions
        total_prot += dish["protein"] * portions
        total_fat += dish["fat"] * portions
        total_carbs += dish["carbs"] * portions

    return {
        "dishes": result_dishes,
        "totals": {
            "calories": round(float(total_cal), 1),
            "protein": round(float(total_prot), 1),
            "fat": round(float(total_fat), 1),
            "carbs": round(float(total_carbs), 1)
        }
    }