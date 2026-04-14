#!/usr/bin/env node
/**
 * Fetch ingredients from USDA FoodData Central and merge them into
 * src/data/common-ingredients.json.
 *
 * Requirements: Node 18+ (built-in fetch, fs/promises)
 *
 * Usage:
 *   node scripts/fetch-usda-ingredients.mjs "broccoli" "carrot" "oats"
 *   node scripts/fetch-usda-ingredients.mjs --list          # fetch built-in expansion list
 *
 * Optional env var:
 *   USDA_API_KEY=<your key>   Get a free key at https://fdc.nal.usda.gov/api-key-signup.html
 *   Falls back to DEMO_KEY (rate-limited to ~30 req/hour).
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_FILE = resolve(__dirname, '../src/data/common-ingredients.json')
const API_BASE = 'https://api.nal.usda.gov/fdc/v1'
const API_KEY = process.env.USDA_API_KEY ?? 'DEMO_KEY'

// ─── Category mapping ────────────────────────────────────────────────────────

const CATEGORY_MAP = {
  'Vegetables and Vegetable Products': 'produce',
  'Fruits and Fruit Juices': 'produce',
  'Beef Products': 'meat',
  'Poultry Products': 'meat',
  'Pork Products': 'meat',
  'Lamb, Veal, and Game Products': 'meat',
  'Finfish and Shellfish Products': 'meat',
  'Dairy and Egg Products': 'dairy',
  'Cereal Grains and Pasta': 'pantry',
  'Legumes and Legume Products': 'pantry',
  'Baked Products': 'bakery',
  'Fats and Oils': 'pantry',
  'Spices and Herbs': 'pantry',
  'Soups, Sauces, and Gravies': 'pantry',
  'Sweets': 'pantry',
  'Beverages': 'beverages',
  'Nut and Seed Products': 'pantry',
  'Frozen Foods': 'frozen',
}

function mapCategory(foodCategory) {
  if (!foodCategory) return 'other'
  return CATEGORY_MAP[foodCategory] ?? 'other'
}

// ─── Nutrient ID constants (USDA) ────────────────────────────────────────────

const NID = {
  calories: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
  fiber: 1079,
  sugar: 2000,
}

function getNutrient(nutrients, id) {
  const found = nutrients.find((n) => n.nutrientId === id)
  return found ? Math.round(found.value * 100) / 100 : undefined
}

// ─── USDA API call ───────────────────────────────────────────────────────────

async function searchUSDA(query) {
  const url = new URL(`${API_BASE}/foods/search`)
  url.searchParams.set('query', query)
  url.searchParams.set('api_key', API_KEY)
  // Prefer Foundation Foods and SR Legacy — these have the most complete nutrient data
  url.searchParams.set('dataType', 'Foundation,SR Legacy')
  url.searchParams.set('pageSize', '5')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`USDA API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.foods ?? []
}

// ─── Pick best result ─────────────────────────────────────────────────────────
// Prefer raw/uncooked items and Foundation data type.

function pickBest(foods, query) {
  if (!foods.length) return null

  const q = query.toLowerCase()

  // Score: Foundation > SR Legacy, prefer descriptions that include "raw"
  const scored = foods.map((f) => {
    let score = 0
    if (f.dataType === 'Foundation') score += 10
    const desc = (f.description ?? '').toLowerCase()
    if (desc.includes('raw')) score += 5
    if (desc.startsWith(q)) score += 3
    if (desc.includes(q)) score += 1
    return { food: f, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0].food
}

// ─── Map a USDA food item to our IngredientSuggestion shape ──────────────────

function mapFood(food, displayName) {
  const nutrients = food.foodNutrients ?? []
  return {
    name: displayName,
    category: mapCategory(food.foodCategory),
    caloriesPer100g: getNutrient(nutrients, NID.calories),
    proteinPer100g: getNutrient(nutrients, NID.protein),
    carbsPer100g: getNutrient(nutrients, NID.carbs),
    fatPer100g: getNutrient(nutrients, NID.fat),
    fiberPer100g: getNutrient(nutrients, NID.fiber),
    sugarPer100g: getNutrient(nutrients, NID.sugar),
    translations: {},   // add Ukrainian manually after fetching
  }
}

// ─── Expansion list (used with --list flag) ───────────────────────────────────
// Add ingredient names here to bulk-expand the dataset.

const EXPANSION_LIST = [
  'fennel',
  'bok choy',
  'swiss chard',
  'collard greens',
  'arugula',
  'endive',
  'kohlrabi',
  'butternut squash',
  'acorn squash',
  'okra',
  'snap peas',
  'water chestnut',
  'bamboo shoots',
  'napa cabbage',
  'daikon radish',
  'fig',
  'guava',
  'lychee',
  'passion fruit',
  'dragon fruit',
  'jackfruit',
  'durian',
  'starfruit',
  'persimmon',
  'quince',
  'tamarind',
  'halibut',
  'sardine',
  'mackerel',
  'anchovy',
  'lobster',
  'crab',
  'scallop',
  'clam',
  'mussel',
  'duck breast',
  'venison',
  'bison',
  'tofu',
  'tempeh',
  'edamame',
  'seitan',
  'miso',
  'natto',
  'feta cheese',
  'ricotta',
  'gouda',
  'blue cheese',
  'brie',
  'kefir',
  'almond milk',
  'oat milk',
  'coconut milk',
  'soy milk',
  'millet',
  'sorghum',
  'amaranth',
  'teff',
  'spelt',
  'buckwheat',
  'farro',
  'freekeh',
  'split peas',
  'navy beans',
  'pinto beans',
  'cannellini beans',
  'adzuki beans',
  'mung beans',
  'tahini',
  'hummus',
  'almond butter',
  'sunflower butter',
  'hazelnut',
  'pistachio',
  'macadamia nut',
  'brazil nut',
  'pecan',
  'pine nut',
  'hemp seeds',
  'poppy seeds',
  'psyllium husk',
  'nutritional yeast',
  'cocoa powder',
  'dark chocolate',
  'balsamic vinegar',
  'rice vinegar',
  'fish sauce',
  'oyster sauce',
  'hoisin sauce',
  'coconut cream',
  'condensed milk',
  'evaporated milk',
  'powdered milk',
  'whey protein',
  'collagen peptides',
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const useList = args.includes('--list')
  const queries = useList ? EXPANSION_LIST : args.filter((a) => !a.startsWith('--'))

  if (!queries.length) {
    console.error('Usage: node scripts/fetch-usda-ingredients.mjs "ingredient" ...')
    console.error('       node scripts/fetch-usda-ingredients.mjs --list')
    process.exit(1)
  }

  // Load existing dataset
  const existing = JSON.parse(readFileSync(DATA_FILE, 'utf8'))
  const existingNames = new Set(existing.map((i) => i.name.toLowerCase()))

  const added = []
  const skipped = []
  const failed = []

  for (const query of queries) {
    const displayName = query
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

    if (existingNames.has(displayName.toLowerCase())) {
      skipped.push(displayName)
      continue
    }

    try {
      process.stdout.write(`Fetching "${displayName}"… `)
      const foods = await searchUSDA(query)
      const best = pickBest(foods, query)

      if (!best) {
        console.log('not found')
        failed.push(displayName)
        continue
      }

      const item = mapFood(best, displayName)
      existing.push(item)
      existingNames.add(displayName.toLowerCase())
      added.push(displayName)
      console.log(
        `ok (${item.caloriesPer100g ?? '?'} kcal, source: ${best.dataType})`,
      )

      // Small delay to stay within DEMO_KEY rate limit
      await new Promise((r) => setTimeout(r, 500))
    } catch (err) {
      console.log(`error: ${err.message}`)
      failed.push(displayName)
    }
  }

  // Write updated dataset
  writeFileSync(DATA_FILE, JSON.stringify(existing, null, 2) + '\n', 'utf8')

  // Summary
  console.log('\n─── Summary ───────────────────────────────────────')
  console.log(`Added:   ${added.length} (${added.join(', ') || 'none'})`)
  console.log(`Skipped: ${skipped.length} (already present)`)
  console.log(`Failed:  ${failed.length} (${failed.join(', ') || 'none'})`)
  console.log(`Total entries: ${existing.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
