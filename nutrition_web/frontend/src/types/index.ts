export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface Dish {
  id: number;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface MealPlan {
  id: number;
  date: string;
  diet_name: string;
  total_calories: number;
  dishes: Array<{
    dish: Dish;
    grams: number;
  }>;
}