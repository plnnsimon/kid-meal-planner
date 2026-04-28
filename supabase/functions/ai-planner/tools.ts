import { createClient } from 'npm:@supabase/supabase-js@2'

type SupabaseClient = ReturnType<typeof createClient>

// ── Tool Definitions (Anthropic JSON schema format) ───────────────────────────

export const toolDefinitions = [
  {
    name: 'get_child_profile',
    description: 'Fetch the child\'s profile including name, age, allergies, and dietary restrictions.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_recipes',
    description: 'Fetch the user\'s available recipes, optionally filtered by meal type and/or excluding recipes that contain specific allergens.',
    input_schema: {
      type: 'object',
      properties: {
        meal_type: {
          type: 'string',
          enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          description: 'Filter recipes to only those suitable for this meal type.',
        },
        exclude_allergens: {
          type: 'array',
          items: { type: 'string' },
          description: 'Exclude recipes containing any of these allergens.',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_week_plan',
    description: 'Fetch the current week\'s meal plan, including all assigned meal slots with recipe names.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'set_meal_slot',
    description: 'Assign a recipe to a specific day and meal type in the current week plan. If a recipe is already assigned to that slot, it will be replaced.',
    input_schema: {
      type: 'object',
      properties: {
        day_of_week: {
          type: 'number',
          description: '0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday',
        },
        meal_type: {
          type: 'string',
          enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          description: 'The meal type to assign the recipe to.',
        },
        recipe_id: {
          type: 'string',
          description: 'The UUID of the recipe to assign.',
        },
        servings: {
          type: 'number',
          description: 'Number of servings (defaults to 1).',
        },
      },
      required: ['day_of_week', 'meal_type', 'recipe_id'],
    },
  },
  {
    name: 'clear_meal_slot',
    description: 'Remove the recipe assigned to a specific day and meal type in the current week plan.',
    input_schema: {
      type: 'object',
      properties: {
        day_of_week: {
          type: 'number',
          description: '0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday',
        },
        meal_type: {
          type: 'string',
          enum: ['breakfast', 'lunch', 'dinner', 'snack'],
          description: 'The meal type to clear.',
        },
      },
      required: ['day_of_week', 'meal_type'],
    },
  },
  {
    name: 'get_tasted_ingredients',
    description: 'Fetch the list of ingredients the child has already tasted, which can help plan meals that introduce new ingredients.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'search_ingredients',
    description: 'Search the ingredient database by name or category. Returns system ingredients plus user\'s custom ones. Use before create_recipe to get real ingredient names with nutritional data.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Partial ingredient name to search (case-insensitive, searches English and Ukrainian names).',
        },
        category: {
          type: 'string',
          enum: ['produce', 'dairy', 'meat', 'pantry', 'bakery', 'frozen', 'beverages', 'other'],
          description: 'Filter by ingredient category.',
        },
      },
      required: [],
    },
  },
  {
    name: 'create_recipe',
    description: 'Create a new recipe and save it to the user\'s recipe library. Use this when no suitable recipes exist for a meal slot — generate a healthy, age-appropriate recipe from scratch.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Recipe name.' },
        description: { type: 'string', description: 'Short description of the recipe.' },
        meal_types: {
          type: 'array',
          items: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          description: 'Which meal types this recipe is suitable for.',
        },
        prep_time: { type: 'number', description: 'Preparation time in minutes.' },
        cook_time: { type: 'number', description: 'Cooking time in minutes.' },
        servings: { type: 'number', description: 'Number of servings.' },
        ingredients: {
          type: 'array',
          description: 'List of ingredients.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              amount: { type: 'number' },
              unit: { type: 'string', description: 'e.g. g, ml, tbsp, cup' },
              category: {
                type: 'string',
                enum: ['produce', 'dairy', 'meat', 'pantry', 'bakery', 'frozen', 'beverages', 'other'],
              },
            },
            required: ['name', 'amount', 'unit', 'category'],
          },
        },
        instructions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Step-by-step cooking instructions.',
        },
        allergens: {
          type: 'array',
          items: { type: 'string' },
          description: 'Allergens present in this recipe (e.g. gluten, dairy, eggs, nuts).',
        },
        nutrition: {
          type: 'object',
          description: 'Estimated nutrition per serving.',
          properties: {
            calories: { type: 'number' },
            protein: { type: 'number' },
            carbs: { type: 'number' },
            fat: { type: 'number' },
            fiber: { type: 'number' },
            sugar: { type: 'number' },
          },
          required: ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar'],
        },
      },
      required: ['name', 'meal_types', 'ingredients', 'instructions'],
    },
  },
]

// ── Tool Executor Factory ─────────────────────────────────────────────────────

export function createToolExecutor(
  supabase: SupabaseClient,
  userId: string,
  weekPlanId: string,
) {
  return async function executeTool(
    name: string,
    // deno-lint-ignore no-explicit-any
    input: Record<string, any>,
  ): Promise<unknown> {
    switch (name) {
      case 'get_child_profile': {
        const { data, error } = await supabase
          .from('child_profiles')
          .select('user_id, name, birth_date, allergies, dietary_restrictions')
          .eq('user_id', userId)
          .maybeSingle()

        if (error) throw new Error(`get_child_profile failed: ${error.message}`)
        if (!data) return { error: 'No child profile found.' }
        return data
      }

      case 'get_recipes': {
        const { data, error } = await supabase
          .from('recipes')
          .select('id, name, meal_types, allergens, ingredients, nutrition')
          .eq('user_id', userId)

        if (error) throw new Error(`get_recipes failed: ${error.message}`)

        let recipes = data ?? []

        // Filter by meal_type (array contains)
        if (input.meal_type) {
          recipes = recipes.filter((r) =>
            Array.isArray(r.meal_types) && r.meal_types.includes(input.meal_type)
          )
        }

        // Exclude recipes with matching allergens
        if (Array.isArray(input.exclude_allergens) && input.exclude_allergens.length > 0) {
          const excluded: string[] = input.exclude_allergens.map((a: string) => a.toLowerCase())
          recipes = recipes.filter((r) => {
            const recipeAllergens: string[] = (r.allergens ?? []).map((a: string) => a.toLowerCase())
            return !recipeAllergens.some((a) => excluded.includes(a))
          })
        }

        return recipes
      }

      case 'get_week_plan': {
        const { data: slots, error } = await supabase
          .from('meal_slots')
          .select(`
            id,
            day_of_week,
            meal_type,
            recipe_id,
            servings,
            recipe:recipes(id, name)
          `)
          .eq('week_plan_id', weekPlanId)

        if (error) throw new Error(`get_week_plan failed: ${error.message}`)

        const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        const formatted = (slots ?? []).map((s) => ({
          day_of_week: s.day_of_week,
          day_name: DAY_NAMES[s.day_of_week] ?? `Day ${s.day_of_week}`,
          meal_type: s.meal_type,
          recipe_id: s.recipe_id,
          // deno-lint-ignore no-explicit-any
          recipe_name: (s.recipe as any)?.name ?? null,
          servings: s.servings,
        }))

        return { week_plan_id: weekPlanId, slots: formatted }
      }

      case 'set_meal_slot': {
        const { day_of_week, meal_type, recipe_id, servings = 1 } = input

        // Check if slot already exists
        const { data: existing, error: fetchError } = await supabase
          .from('meal_slots')
          .select('id')
          .eq('week_plan_id', weekPlanId)
          .eq('day_of_week', day_of_week)
          .eq('meal_type', meal_type)
          .maybeSingle()

        if (fetchError) throw new Error(`set_meal_slot fetch failed: ${fetchError.message}`)

        if (existing) {
          const { error: updateError } = await supabase
            .from('meal_slots')
            .update({ recipe_id, servings })
            .eq('id', existing.id)

          if (updateError) throw new Error(`set_meal_slot update failed: ${updateError.message}`)
          return { success: true, action: 'updated', slot_id: existing.id }
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from('meal_slots')
            .insert({
              week_plan_id: weekPlanId,
              day_of_week,
              meal_type,
              recipe_id,
              servings,
            })
            .select('id')
            .single()

          if (insertError) throw new Error(`set_meal_slot insert failed: ${insertError.message}`)
          return { success: true, action: 'inserted', slot_id: inserted.id }
        }
      }

      case 'clear_meal_slot': {
        const { day_of_week, meal_type } = input

        const { error } = await supabase
          .from('meal_slots')
          .delete()
          .eq('week_plan_id', weekPlanId)
          .eq('day_of_week', day_of_week)
          .eq('meal_type', meal_type)

        if (error) throw new Error(`clear_meal_slot failed: ${error.message}`)
        return { success: true }
      }

      case 'get_tasted_ingredients': {
        // Get child profile id for this user first
        const { data: childRow, error: childErr } = await supabase
          .from('child_profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()

        if (childErr) throw new Error(`get_tasted_ingredients: child lookup failed: ${childErr.message}`)
        if (!childRow) return { error: 'No child profile found.' }

        const { data, error } = await supabase
          .from('child_tasted_ingredients')
          .select('ingredients(name, name_uk, category)')
          .eq('child_profile_id', childRow.id)

        if (error) throw new Error(`get_tasted_ingredients failed: ${error.message}`)
        // deno-lint-ignore no-explicit-any
        return (data ?? []).map((r: any) => r.ingredients).filter(Boolean)
      }

      case 'search_ingredients': {
        let dbQuery = supabase
          .from('ingredients')
          .select('name, name_uk, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g')
          .or(`source.eq.system,user_id.eq.${userId}`)

        if (input.query) {
          dbQuery = dbQuery.or(`name.ilike.%${input.query}%,name_uk.ilike.%${input.query}%`)
        }
        if (input.category) {
          dbQuery = dbQuery.eq('category', input.category)
        }

        const { data, error } = await dbQuery.order('name').limit(30)
        if (error) throw new Error(`search_ingredients failed: ${error.message}`)
        return data ?? []
      }

      case 'create_recipe': {
        const { data: inserted, error } = await supabase
          .from('recipes')
          .insert({
            user_id: userId,
            name: input.name,
            description: input.description ?? '',
            meal_types: input.meal_types ?? [],
            prep_time: input.prep_time ?? 0,
            cook_time: input.cook_time ?? 0,
            servings: input.servings ?? 1,
            ingredients: input.ingredients ?? [],
            instructions: input.instructions ?? [],
            allergens: input.allergens ?? [],
            tags: [],
            is_favorite: false,
            nutrition: input.nutrition ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 },
          })
          .select('id, name')
          .single()

        if (error) throw new Error(`create_recipe failed: ${error.message}`)
        return { success: true, recipe_id: inserted.id, name: inserted.name }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  }
}
