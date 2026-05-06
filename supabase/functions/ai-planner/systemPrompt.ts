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
  if (years === 0) return `${months}mo`
  if (months === 0) return `${years}y`
  return `${years}y${months}mo`
}

const LOCALE_LANGUAGE: Record<string, string> = {
  en: 'English',
  uk: 'Ukrainian',
}

const RECIPE_LIBRARY_THRESHOLD = 30

const MEAL_ABBR: Record<string, string> = { breakfast: 'B', lunch: 'L', dinner: 'D', snack: 'S' }
const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function buildSystemPrompt(
  child: ChildProfile | null,
  weekPlan: WeekPlan | null,
  today: string,
  currentSlots: MealSlotSummary[] = [],
  mode = 'chat',
  locale = 'en',
  recipeCount = 0,
): string {
  const lines: string[] = [
    'Pediatric nutritionist AI. Prioritize allergen safety, age-appropriate nutrition, balanced variety.',
    '',
    `Today: ${today}`,
    weekPlan ? `Week: ${weekPlan.week_start_date} (ID: ${weekPlan.id})` : 'No active week plan.',
  ]

  // Child profile
  lines.push('', '## Child')
  if (child) {
    lines.push(`Name: ${child.name}`)
    lines.push(child.birth_date ? `Age: ${calculateAge(child.birth_date)}` : 'Age: unknown')
    lines.push(`Allergies: ${child.allergies.length ? child.allergies.join(', ') : 'none'}`)
    lines.push(`Diet: ${child.dietary_restrictions.length ? child.dietary_restrictions.join(', ') : 'none'}`)
  } else {
    lines.push('No child profile.')
  }

  // Week plan — compact format (do NOT call get_week_plan / get_child_profile)
  lines.push('', '## Week Plan (pre-loaded — skip get_week_plan, skip get_child_profile)')
  if (currentSlots.length === 0) {
    lines.push('All slots empty.')
  } else {
    const byDay = new Map<number, MealSlotSummary[]>()
    for (const slot of currentSlots) {
      if (!byDay.has(slot.day_of_week)) byDay.set(slot.day_of_week, [])
      byDay.get(slot.day_of_week)!.push(slot)
    }
    for (const [dayIdx, slots] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
      const sorted = slots.sort((a, b) => MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type))
      lines.push(`${DAY_SHORT[dayIdx]}: ${sorted.map(s => `${MEAL_ABBR[s.meal_type] ?? s.meal_type}=${s.recipe_name ?? '-'}`).join(' ')}`)
    }
  }

  // Rules
  lines.push('', '## Rules')
  lines.push('Scope: "plan [meal] for [day]" → 1 slot. "plan [day]" → 4 slots that day. "plan week" → all empty slots.')
  lines.push('Gap-fill: slots already filled above → skip. Fill only empty (-).')
  lines.push(`Library: ${recipeCount}/${RECIPE_LIBRARY_THRESHOLD} recipes.`)

  if (recipeCount < RECIPE_LIBRARY_THRESHOLD) {
    lines.push('LIBRARY BUILDING MODE: Always create new recipes. Never reuse existing — grow library with diverse options.')
  } else {
    lines.push('MATURE LIBRARY MODE: Prefer existing recipes from get_recipes. Create only if no suitable match.')
  }

  lines.push('', 'Recipe workflow (mandatory, exact order):')
  lines.push('1. get_recipes filtered by meal_type.')
  lines.push('   Building mode: always create new. Mature mode: if suitable exists → set_meal_slot.')
  lines.push('2. Before create_recipe, gather ingredients:')
  lines.push('   a. search_ingredients (no args) — base list.')
  lines.push('   b. search_ingredients by category (produce/dairy/meat/pantry) as needed.')
  lines.push('   c. search_ingredients by specific query terms.')
  lines.push('3. Use ONLY ingredient names from search results. NEVER invent names. Substitute if not found.')
  lines.push('4. create_recipe with exact ingredient names + full nutritional data.')
  lines.push('5. set_meal_slot with returned recipe_id.')

  lines.push('', 'Other rules:')
  lines.push('- Never use allergen ingredients. Check allergies before every slot.')
  lines.push('- Respect all dietary restrictions.')
  lines.push('- day_of_week: 0=Mon 1=Tue 2=Wed 3=Thu 4=Fri 5=Sat 6=Sun')
  lines.push('- meal_type: breakfast | lunch | dinner | snack')
  lines.push('- Vary recipes across day — different food group/flavour per slot.')
  lines.push('- Summarize what was planned after all set_meal_slot calls.')

  if (mode === 'chat') {
    lines.push('- Match user\'s language. create_recipe content in same language.')
  } else {
    const language = LOCALE_LANGUAGE[locale] ?? 'English'
    lines.push(`- Respond in ${language}. create_recipe content in ${language}.`)
  }

  return lines.join('\n')
}
