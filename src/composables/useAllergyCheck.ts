import { useChildStore } from '@/stores/child.store'
import type { Recipe } from '@/types'

export function useAllergyCheck() {
  const child = useChildStore()

  function hasAllergyConflict(recipe: Recipe): boolean {
    const childAllergies = child.profile?.allergies ?? []
    if (!childAllergies.length || !recipe.allergens.length) return false
    return recipe.allergens.some(a => childAllergies.includes(a))
  }

  function conflictingAllergens(recipe: Recipe): string[] {
    const childAllergies = child.profile?.allergies ?? []
    return recipe.allergens.filter(a => childAllergies.includes(a))
  }

  return { hasAllergyConflict, conflictingAllergens }
}
