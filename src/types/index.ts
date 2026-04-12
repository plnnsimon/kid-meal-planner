export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type IngredientCategory =
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'pantry'
  | 'bakery'
  | 'frozen'
  | 'beverages'
  | 'other'

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  'produce',
  'dairy',
  'meat',
  'pantry',
  'bakery',
  'frozen',
  'beverages',
  'other',
]

export const COMMON_ALLERGENS = [
  'gluten',
  'dairy',
  'eggs',
  'nuts',
  'peanuts',
  'soy',
  'fish',
  'shellfish',
  'sesame',
] as const

export type Allergen = (typeof COMMON_ALLERGENS)[number]

export const DIETARY_RESTRICTION_PRESETS = [
  'vegetarian',
  'vegan',
  'halal',
  'kosher',
  'no pork',
  'no seafood',
  'no red meat',
] as const

// ─── Child Profile ────────────────────────────────────────────────────────────

export interface ChildProfile {
  id: string
  userId: string
  name: string
  birthDate: string | null
  avatarUrl: string | null
  allergies: string[]
  dietaryRestrictions: string[]
  createdAt: string
}

// ─── Recipe ───────────────────────────────────────────────────────────────────

export interface NutritionInfo {
  calories: number
  protein: number  // grams
  carbs: number    // grams
  fat: number      // grams
  fiber: number
  sugar: number
}

export interface Ingredient {
  name: string
  amount: number
  unit: string
  category: IngredientCategory
}

export interface Recipe {
  id: string
  userId: string
  name: string
  description: string
  imageUrl: string | null
  mealTypes: MealType[]
  prepTime: number   // minutes
  cookTime: number   // minutes
  servings: number
  nutrition: NutritionInfo
  ingredients: Ingredient[]
  instructions: string[]
  allergens: string[]
  tags: string[]
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

// ─── Week Plan ────────────────────────────────────────────────────────────────

export interface MealSlot {
  id: string
  weekPlanId: string
  dayOfWeek: number  // 0 = Mon … 6 = Sun
  mealType: MealType
  recipeId: string | null
  recipe?: Recipe
  servings: number
  notes: string
}

export interface WeekPlan {
  id: string
  userId: string
  weekStartDate: string  // ISO date — always a Monday
  slots: MealSlot[]
  createdAt: string
}

// ─── Shopping List ────────────────────────────────────────────────────────────

export interface ShoppingListItem {
  ingredientName: string
  totalAmount: number
  unit: string
  category: IngredientCategory
  checked: boolean
  recipeNames: string[]
}
