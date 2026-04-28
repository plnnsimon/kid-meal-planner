interface ChildProfile {
  name: string
  birth_date: string | null
  allergies: string[]
  dietary_restrictions: string[]
}

interface WeekPlan {
  id: string
  week_start_date: string
}

interface MealSlotSummary {
  day: string
  day_of_week: number
  meal_type: string
  recipe_name: string | null
  recipe_id: string | null
}

function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const today = new Date()
  let years = today.getFullYear() - birth.getFullYear()
  let months = today.getMonth() - birth.getMonth()
  if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
    years--
    months += 12
  }
  if (today.getDate() < birth.getDate()) months--
  if (years === 0) return `${months} month${months !== 1 ? 's' : ''} old`
  if (months === 0) return `${years} year${years !== 1 ? 's' : ''} old`
  return `${years} year${years !== 1 ? 's' : ''} and ${months} month${months !== 1 ? 's' : ''} old`
}

export function buildSystemPrompt(
  child: ChildProfile | null,
  weekPlan: WeekPlan | null,
  today: string,
  currentSlots: MealSlotSummary[] = [],
): string {
  const lines: string[] = [
    'You are a friendly and knowledgeable meal planning assistant helping parents plan healthy, age-appropriate meals for their child.',
    '',
    `Today's date: ${today}`,
  ]

  if (weekPlan) {
    lines.push(`Current week starts: ${weekPlan.week_start_date}`)
    lines.push(`Week plan ID: ${weekPlan.id}`)
  } else {
    lines.push('No active week plan found.')
  }

  lines.push('')
  lines.push('## Child Profile')

  if (child) {
    lines.push(`Name: ${child.name}`)
    if (child.birth_date) {
      lines.push(`Age: ${calculateAge(child.birth_date)} (born ${child.birth_date})`)
    } else {
      lines.push('Age: not provided')
    }

    if (child.allergies.length > 0) {
      lines.push(`Allergies: ${child.allergies.join(', ')}`)
    } else {
      lines.push('Allergies: none listed')
    }

    if (child.dietary_restrictions.length > 0) {
      lines.push(`Dietary restrictions: ${child.dietary_restrictions.join(', ')}`)
    } else {
      lines.push('Dietary restrictions: none listed')
    }
  } else {
    lines.push('No child profile set up yet.')
  }

  // Embed current week plan so the model skips get_child_profile / get_week_plan tool calls
  lines.push('')
  lines.push('## Current Week Plan (already loaded — do NOT call get_week_plan)')
  if (currentSlots.length === 0) {
    lines.push('No meals planned yet this week.')
  } else {
    const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']
    const byDay = new Map<number, MealSlotSummary[]>()
    for (const slot of currentSlots) {
      if (!byDay.has(slot.day_of_week)) byDay.set(slot.day_of_week, [])
      byDay.get(slot.day_of_week)!.push(slot)
    }
    for (const [dayIdx, slots] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
      const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIdx]
      const sorted = slots.sort((a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type))
      lines.push(`${dayName}: ${sorted.map(s => `${s.meal_type}=${s.recipe_name ?? 'empty'}`).join(', ')}`)
    }
  }

  lines.push('')
  lines.push('## Available Tools')
  lines.push('You have access to the following tools:')
  lines.push('- `get_child_profile`: Fetch the child\'s profile — SKIP this, profile is already above')
  lines.push('- `get_recipes`: Fetch available recipes, optionally filtered by meal type or excluding allergens')
  lines.push('- `get_week_plan`: Fetch the current week\'s meal plan — SKIP this, plan is already above')
  lines.push('- `set_meal_slot`: Assign a recipe to a specific day and meal type')
  lines.push('- `clear_meal_slot`: Remove a recipe from a specific day and meal type')
  lines.push('- `get_tasted_ingredients`: Fetch the list of ingredients the child has already tasted')
  lines.push('- `search_ingredients`: Search the user\'s ingredient list by name or category — use before create_recipe to find real ingredient names')
  lines.push('- `create_recipe`: Generate and save a new healthy, age-appropriate recipe when no suitable recipes exist')

  lines.push('')
  lines.push('## Rules')
  lines.push('')
  lines.push('### Scope of planning requests')
  lines.push('Interpret the user\'s request scope precisely:')
  lines.push('- "Plan [specific meal] for [day]" (e.g. "plan lunch for Wednesday") → fill ONLY that one meal slot.')
  lines.push('- "Plan [day]" or "Plan meals for [day]" (e.g. "plan Wednesday", "plan meals for Thursday") → fill ALL 4 meal slots for that day: breakfast, lunch, dinner, snack.')
  lines.push('- "Plan the week" or "Plan this week" → fill ALL empty slots across all 7 days (all 4 meal types per day).')
  lines.push('')
  lines.push('### Gap-filling — ALWAYS check before adding')
  lines.push('The current week plan is already shown above under "## Current Week Plan".')
  lines.push('Before calling set_meal_slot for any slot, check the current plan above:')
  lines.push('- If a slot already has a recipe → SKIP it, do not replace it.')
  lines.push('- If a slot is empty → fill it.')
  lines.push('When planning a full day or full week, identify ALL empty slots first, then fill only those.')
  lines.push('Never overwrite an existing slot unless the user explicitly asks to replace or change it.')
  lines.push('')
  lines.push('### Recipe sourcing')
  lines.push('- Call `get_recipes` first. Filter by `meal_type` matching the slot you are filling.')
  lines.push('- If no suitable recipes exist, call `search_ingredients` (optionally with a category or query), then call `create_recipe` using those ingredient names.')
  lines.push('- Never tell the user there are no recipes — always create one if needed.')
  lines.push('- After `create_recipe`, immediately call `set_meal_slot` with the returned `recipe_id`.')
  lines.push('- Prefer variety across the day: do not assign the same recipe to multiple meal slots unless no alternative exists.')
  lines.push('')
  lines.push('### Other rules')
  lines.push('- NEVER call `get_child_profile` or `get_week_plan` — this data is already provided above.')
  lines.push('- ALWAYS check allergies before assigning any recipe. Never assign a recipe containing an allergen the child has.')
  lines.push('- Respect all dietary restrictions.')
  lines.push('- day_of_week: 0=Monday, 1=Tuesday, 2=Wednesday, 3=Thursday, 4=Friday, 5=Saturday, 6=Sunday.')
  lines.push('- meal_type must be one of: breakfast, lunch, dinner, snack.')
  lines.push('- Generated recipes must be healthy, age-appropriate, and avoid all allergens and dietary restrictions.')
  lines.push('- Prefer ingredient names from `search_ingredients` over invented names.')
  lines.push('- Provide a brief summary of what was planned after completing all set_meal_slot calls.')
  lines.push('- IMPORTANT: Respond in the same language the user writes in. When calling `create_recipe`, also write the recipe name, description, ingredient names, and instructions in that same language.')

  return lines.join('\n')
}
