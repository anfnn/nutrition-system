import math
from typing import Dict, Any, List
from app.database import db


class DietSelectorService:
    """Байесовская классификация диет"""
    
    def __init__(self):
        self.diets = self._load_diets()
        self.likelihood_matrix = {
            1: {
                True: [0.1, 0.8, 0.2, 0.05, 0.1, 0.2],
                False: [0.9, 0.2, 0.8, 0.95, 0.9, 0.8]
            },
            2: {
                True: [0.3, 0.4, 0.9, 0.1, 0.4, 0.5],
                False: [0.7, 0.6, 0.1, 0.9, 0.6, 0.5]
            },
            3: {
                True: [0.9, 0.1, 0.6, 0.8, 0.7, 0.6],
                False: [0.1, 0.9, 0.4, 0.2, 0.3, 0.4]
            },
            4: {
                "underweight": [0.2, 0.1, 0.3, 0.3, 0.8, 0.1],
                "normal": [0.7, 0.6, 0.6, 0.5, 0.1, 0.3],
                "overweight": [0.5, 0.4, 0.4, 0.4, 0.05, 0.7],
                "obese": [0.3, 0.2, 0.2, 0.3, 0.02, 0.9]
            }
        }
        
    def _load_diets(self):
        try:
            rows = db.fetch_all("SELECT * FROM diets ORDER BY id")
            if rows:
                for row in rows:
                    row["prior_probability"] = 1.0 / len(rows)
                return rows
        except:
            pass
        
        # Резервные значения с _min/_max
        return[
            {
                "id": 1, "name": "Общая диета",
                "target_calories": 2000, "target_protein": 80, "target_fat": 65, "target_carbs": 250,
                "prior_probability": 1/6,
                "description": "Стандартное сбалансированное питание.",
                "recommendation": "Разнообразное питание: овощи, крупы, мясо, рыба, фрукты."
            },
            {
                "id": 2, "name": "Щадящая диета",
                "target_calories": 1800, "target_protein": 60, "target_fat": 50, "target_carbs": 260,
                "prior_probability": 1/6,
                "description": "Лёгкое питание при заболеваниях ЖКТ.",
                "recommendation": "Каши, супы, отварные овощи, кисели. Избегать: острое, жареное."
            },
            {
                "id": 3, "name": "Низкобелковая диета",
                "target_calories": 1800, "target_protein": 40, "target_fat": 60, "target_carbs": 270,
                "prior_probability": 1/6,
                "description": "Ограничение белка при заболеваниях почек.",
                "recommendation": "Овощи, фрукты, крупы. Ограничить: мясо, рыба, яйца."
            },
            {
                "id": 4, "name": "Высокобелковая диета",
                "target_calories": 2000, "target_protein": 150, "target_fat": 60, "target_carbs": 200,
                "prior_probability": 1/6,
                "description": "Повышенное потребление белка для набора мышечной массы.",
                "recommendation": "Курица, рыба, яйца, творог, бобовые."
            },
            {
                "id": 5, "name": "Высококалорийная диета",
                "target_calories": 2800, "target_protein": 100, "target_fat": 100, "target_carbs": 350,
                "prior_probability": 1/6,
                "description": "Повышенная калорийность для набора массы.",
                "recommendation": "Крупы, мясо, рыба, орехи, сухофрукты, молочные продукты."
            },
            {
                "id": 6, "name": "Низкокалорийная диета",
                "target_calories": 1500, "target_protein": 70, "target_fat": 45, "target_carbs": 180,
                "prior_probability": 1/6,
                "description": "Ограничение калорий для снижения веса.",
                "recommendation": "Овощи, нежирное мясо, рыба на пару. Избегать: жирное, сладкое."
            }
        ]
    
    def calculate_probabilities(self, answers: Dict[int, Any]) -> List[Dict]:
        """Расчёт вероятностей по формуле Байеса"""
        probs = [diet.get("prior_probability", 1/6) for diet in self.diets]
        
        likelihoods_per_question = []
        for q_id, answer in answers.items():
            q_id = int(q_id)
            if q_id in self.likelihood_matrix:
                if q_id == 4:
                    bmi = float(answer)
                    if bmi < 18.5:
                        category = "underweight"
                    elif bmi <= 24.9:
                        category = "normal"
                    elif bmi <= 29.9:
                        category = "overweight"
                    else:
                        category = "obese"
                    likelihoods = self.likelihood_matrix[q_id][category]
                else:
                    likelihoods = self.likelihood_matrix[q_id][bool(answer)]
                likelihoods_per_question.append(likelihoods)
        
        unnormalized = []
        for i in range(len(self.diets)):
            posterior = probs[i]
            for lh in likelihoods_per_question:
                posterior *= lh[i]
            unnormalized.append(posterior)
        
        total = sum(unnormalized)
        normalized = [p / total for p in unnormalized] if total > 0 else [0] * len(self.diets)
        
        return [
            {"diet": self.diets[i], "probability": normalized[i]}
            for i in range(len(self.diets))
        ]
    
    def filter_dishes_by_allergies(self, dish_ids: List[int], answers: Dict[int, bool]) -> List[int]:
        """Фильтрация блюд по аллергиям"""
        if not dish_ids:
            return []
        
        placeholders = ",".join(["%s"] * len(dish_ids))
        dishes = db.fetch_all(
            f"SELECT id, name, description FROM dishes WHERE id IN ({placeholders})",
            tuple(dish_ids)
        )
        
        filtered = []
        for dish in dishes:
            include = True
            dish_allergens = self._get_allergens(dish["id"])
            
            if answers.get(101) and "морепродукты" in dish_allergens:
                include = False
            if answers.get(102) and "орехи" in dish_allergens:
                include = False
            if answers.get(103) and "лактоза" in dish_allergens:
                include = False
            if answers.get(104) and "глютен" in dish_allergens:
                include = False
            if answers.get(105) and "яйцо" in dish_allergens:
                include = False
            
            if include:
                filtered.append(int(dish["id"]))
        
        return filtered
    
    def _get_allergens(self, dish_id: int) -> List[str]:
        """Получить аллергены блюда из поля allergens"""
        try:
            row = db.fetch_one(
                "SELECT allergens FROM dishes WHERE id = %s",
                (dish_id,)
            )
            if row and row["allergens"]:
                return [a.strip().lower() for a in row["allergens"].split(",") if a.strip()]
            return []
        except:
            return []
    
    def filter_by_disliked(self, dishes: List[Dict], disliked: List[str]) -> List[Dict]:
        """Фильтрация по нелюбимым ингредиентам"""
        return [d for d in dishes if not any(
            ing in str(d.get("name", "")).lower() or ing in str(d.get("description", "")).lower()
            for ing in disliked
        )]