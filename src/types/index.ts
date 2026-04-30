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

// ─── Food Item (from ingredients table) ──────────────────────────────────────

export interface FoodItem {
  id: string
  name: string
  nameUk: string | null
  category: IngredientCategory
  source: 'system' | 'user'
  userId: string | null
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
  fiberPer100g: number | null
  sugarPer100g: number | null
  imageUrl?: string | null
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
  // Nutrition per 100 g — populated when selected from Open Food Facts
  caloriesPer100g?: number
  proteinPer100g?: number
  carbsPer100g?: number
  fatPer100g?: number
  fiberPer100g?: number
  sugarPer100g?: number
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
  avgRating: number
  ratingsCount: number
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

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  displayName: string
  avatarUrl: string | null
  role: UserRole
  createdAt: string
  updatedAt: string
}

// ─── Friendship ───────────────────────────────────────────────────────────────

export interface Friendship {
  requesterId: string
  addresseeId: string
  status: 'pending' | 'accepted'
  createdAt: string
  // Joined profile of the other party (populated by store)
  profile?: UserProfile
}

// ─── Recipe Favorites ─────────────────────────────────────────────────────────

export interface RecipeFavorite {
  userId: string
  recipeId: string
  createdAt: string
}

// ─── Admin / Feedback ─────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin'
export type FeedbackType = 'bug' | 'feature'

export interface AdminUser {
  id: string
  displayName: string
  email: string
  role: UserRole
  avatarUrl: string | null
  createdAt: string
  recipeCount: number
  planCount: number
  lastLogin: string | null
  subscriptionTier: 'basic' | 'pro'
  tierExpiresAt: string | null
  isBlocked: boolean
}

export interface Feedback {
  id: string
  userId: string
  type: FeedbackType
  message: string
  rating: number | null
  createdAt: string
  userDisplayName: string
  isRead: boolean
}

// ─── Recipe Ratings ───────────────────────────────────────────────────────────

export interface RecipeRating {
  userId: string
  recipeId: string
  score: number  // 1–5
  createdAt: string
  updatedAt: string
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  userId: string
  displayName: string
  avatarUrl: string | null
  savedCount: number
  avgSavedRating: number
  ownRatingsCount: number
  ownAvgRating: number
  score: number
  rank: number
}
