#!/usr/bin/env node
/**
 * Generates and uploads SVG icons for ingredients that have no image_url.
 *
 * Usage:
 *   node scripts/generate-ingredient-icons.mjs            # all missing
 *   node scripts/generate-ingredient-icons.mjs --limit 15
 *   node scripts/generate-ingredient-icons.mjs --dry-run --limit 5
 *   node scripts/generate-ingredient-icons.mjs --force --name "Carrot"
 *
 * Requires SUPABASE_SERVICE_KEY in .env.local (Settings → API → service_role in Supabase dashboard).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// ─── Load .env then .env.local (local overrides base) ────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
for (const name of ['.env', '.env.local']) {
  const p = resolve(__dirname, '..', name)
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) process.env[m[1].trim()] = m[2].trim()
    }
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY.')
  console.error('Add SUPABASE_SERVICE_KEY=<service_role_key> to .env.local')
  console.error('(Supabase dashboard → Settings → API → service_role)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ─── Slug helper ──────────────────────────────────────────────────────────────
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[()]/g, '')          // remove parens
    .replace(/[^a-z0-9]+/g, '-')  // spaces / specials → dash
    .replace(/^-+|-+$/g, '')       // trim edges
}

// ─── SVG library ─────────────────────────────────────────────────────────────
// Keys are lowercase ingredient names. Add more here to extend the library.
const SVG_LIBRARY = {
  'apple': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <path d="M24 38 C14 38,9 30,9 24 C9 18,13 14,18 13 C20 12,22 13,24 13 C26 13,28 12,30 13 C35 14,39 18,39 24 C39 30,34 38,24 38 Z" fill="#E8503A"/>
  <path d="M37 14 C35 15,32 14,28 14 C26 13,28 12,30 13 C33 13,36 13,37 14 Z" fill="#FF7A5C" opacity="0.5"/>
  <path d="M24 12 C23 10,23 9,24 8 C25 9,25 10,24 12 Z" fill="#B8843A"/>
  <path d="M24 12 C26 8,32 7,32 10 C29 10,26 11,24 12 Z" fill="#5BA84A"/>
  <ellipse cx="17" cy="21" rx="4" ry="3" fill="#FF7A5C" opacity="0.45"/>
</svg>`,

  'avocado': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <path d="M24 8 C20 8,12 16,12 26 C12 34,17 40,24 40 C31 40,36 34,36 26 C36 16,28 8,24 8 Z" fill="#5BA84A"/>
  <path d="M24 14 C21 14,16 20,16 27 C16 33,19 37,24 37 C29 37,32 33,32 27 C32 20,27 14,24 14 Z" fill="#6BBC58"/>
  <circle cx="24" cy="28" r="6" fill="#B8843A"/>
  <circle cx="22" cy="26" r="2" fill="#D9A65B" opacity="0.6"/>
</svg>`,

  'banana': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <path d="M9 30 C8 22,13 13,21 9 C29 5,38 8,40 13 L38 14 C35 12,29 11,23 14 C17 17,13 24,12 32 Z" fill="#F5C242"/>
  <path d="M12 32 C13 24,17 17,23 14 C29 11,35 12,38 14 C39 19,37 27,32 32 C27 37,19 40,14 39 Z" fill="#F5C242"/>
  <path d="M21 10 C27 8,33 9,37 13" stroke="#FFD970" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.65"/>
  <path d="M40 13 C42 11,43 10,42 9 C40 10,39 12,40 13 Z" fill="#B8843A"/>
  <path d="M14 39 C13 41,12 42,11 41 C12 40,13 39,14 39 Z" fill="#B8843A"/>
</svg>`,

  'broccoli': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <rect x="21" y="30" width="6" height="12" rx="2" fill="#5BA84A"/>
  <circle cx="24" cy="23" r="9" fill="#5BA84A"/>
  <circle cx="16" cy="25" r="7" fill="#5BA84A"/>
  <circle cx="32" cy="25" r="7" fill="#5BA84A"/>
  <circle cx="20" cy="17" r="6" fill="#5BA84A"/>
  <circle cx="28" cy="17" r="6" fill="#5BA84A"/>
  <circle cx="20" cy="14" r="3" fill="#6BBC58" opacity="0.7"/>
  <circle cx="28" cy="14" r="3" fill="#6BBC58" opacity="0.7"/>
  <circle cx="24" cy="21" r="3" fill="#6BBC58" opacity="0.5"/>
</svg>`,

  'carrot': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <path d="M24 14 L18 40 C18 41,19 42,20 42 L28 42 C29 42,30 41,30 40 L24 14 Z" fill="#F08537"/>
  <path d="M24 14 L20 32 L21 32.5 L24 18 L27 32.5 L28 32 Z" fill="#FF9D52" opacity="0.6"/>
  <path d="M24 14 C20 10,16 9,14 11 C16 13,18 13,20 14 Z" fill="#5BA84A"/>
  <path d="M24 14 C24 8,26 6,28 6 C28 10,27 12,26 14 Z" fill="#6BBC58"/>
  <path d="M24 14 C28 10,32 9,34 11 C32 13,30 13,28 14 Z" fill="#5BA84A"/>
</svg>`,

  'cherry': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <path d="M19 28 C19 22,24 16,24 12" stroke="#5BA84A" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M29 26 C29 20,24 16,24 12" stroke="#5BA84A" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M24 12 C26 9,30 10,28 13 C26 12,24 12,24 12 Z" fill="#5BA84A"/>
  <circle cx="19" cy="33" r="7" fill="#E8503A"/>
  <circle cx="17" cy="30" r="2" fill="#FF7A5C" opacity="0.6"/>
  <circle cx="29" cy="33" r="7" fill="#E8503A"/>
  <circle cx="27" cy="30" r="2" fill="#FF7A5C" opacity="0.6"/>
</svg>`,

  'corn': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <path d="M18 40 C14 35,11 25,14 15 C16 20,16 30,18 40 Z" fill="#5BA84A"/>
  <path d="M30 40 C34 35,37 25,34 15 C32 20,32 30,30 40 Z" fill="#5BA84A"/>
  <rect x="18" y="13" width="12" height="26" rx="6" fill="#F5C242"/>
  <path d="M18 19 Q24 18 30 19" stroke="#B8843A" stroke-width="1" fill="none" opacity="0.6"/>
  <path d="M18 23 Q24 22 30 23" stroke="#B8843A" stroke-width="1" fill="none" opacity="0.6"/>
  <path d="M18 27 Q24 26 30 27" stroke="#B8843A" stroke-width="1" fill="none" opacity="0.6"/>
  <path d="M18 31 Q24 30 30 31" stroke="#B8843A" stroke-width="1" fill="none" opacity="0.6"/>
  <ellipse cx="22" cy="18" rx="2" ry="4" fill="#FFD970" opacity="0.5"/>
</svg>`,

  'cucumber': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <rect x="16" y="9" width="16" height="30" rx="8" fill="#5BA84A"/>
  <rect x="20" y="10" width="8" height="28" rx="4" fill="#6BBC58" opacity="0.45"/>
  <circle cx="19" cy="18" r="1.8" fill="#6BBC58"/>
  <circle cx="29" cy="23" r="1.8" fill="#6BBC58"/>
  <circle cx="19" cy="28" r="1.8" fill="#6BBC58"/>
  <circle cx="29" cy="33" r="1.8" fill="#6BBC58"/>
  <ellipse cx="24" cy="8" rx="4" ry="2.5" fill="#6BBC58"/>
  <ellipse cx="24" cy="40" rx="4" ry="2.5" fill="#4A8A3A"/>
</svg>`,

  'lemon': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <path d="M10 24 C10 17,16 11,24 11 C32 11,38 17,38 24 C38 31,32 37,24 37 C16 37,10 31,10 24 Z" fill="#F5C242"/>
  <path d="M38 24 C40 21,43 21,43 24 C43 27,40 27,38 24 Z" fill="#F5C242"/>
  <path d="M38 23 C40 20,42 21,42 23" stroke="#D9A65B" stroke-width="0.8" fill="none"/>
  <path d="M9 23 C8 21,7 22,8 24 C8 22,9 23,10 23" fill="#5BA84A"/>
  <path d="M10 22 C8 19,9 17,11 18 C10 20,10 22,10 22 Z" fill="#5BA84A"/>
  <ellipse cx="18" cy="18" rx="5" ry="3" fill="#FFD970" opacity="0.7"/>
</svg>`,

  'mushrooms': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <rect x="19" y="30" width="10" height="11" rx="3" fill="#F5D5A8"/>
  <path d="M10 28 C10 18,16 11,24 11 C32 11,38 18,38 28 Z" fill="#D9A65B"/>
  <path d="M10 28 C10 30,14 32,19 32 L29 32 C34 32,38 30,38 28 Z" fill="#E8B870"/>
  <ellipse cx="19" cy="18" rx="5" ry="4" fill="#E8B870" opacity="0.5"/>
</svg>`,

  'onion': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <path d="M24 38 C15 38,9 32,9 25 C9 17,15 13,24 13 C33 13,39 17,39 25 C39 32,33 38,24 38 Z" fill="#F5C242"/>
  <path d="M12 21 C14 17,18 14,24 14 C30 14,34 17,36 21 C33 18,28 16,24 16 C20 16,15 18,12 21 Z" fill="#FFD970" opacity="0.6"/>
  <path d="M20 13 C20 11,22 10,24 10 C26 10,28 11,28 13 C26 12,22 12,20 13 Z" fill="#D9A65B"/>
  <path d="M21 10 C20 7,20 5,21 4 C22 6,22 8,21 10 Z" fill="#5BA84A"/>
  <path d="M27 10 C28 7,28 5,27 4 C26 6,26 8,27 10 Z" fill="#5BA84A"/>
  <path d="M19 38 L18 41" stroke="#B8843A" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M24 38 L24 42" stroke="#B8843A" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M29 38 L30 41" stroke="#B8843A" stroke-width="1.2" stroke-linecap="round"/>
  <ellipse cx="17" cy="23" rx="3" ry="4" fill="#FFD970" opacity="0.4"/>
</svg>`,

  'orange': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <circle cx="24" cy="26" r="16" fill="#F08537"/>
  <path d="M24 10 C26 6,32 6,30 10 C28 10,26 10,24 10 Z" fill="#5BA84A"/>
  <rect x="22" y="8" width="4" height="4" rx="1" fill="#B8843A"/>
  <ellipse cx="18" cy="21" rx="4" ry="3" fill="#FF9D52" opacity="0.6"/>
</svg>`,

  'pineapple': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <path d="M18 16 C16 10,14 6,15 5 C17 8,18 12,18 16 Z" fill="#5BA84A"/>
  <path d="M24 14 C24 8,23 4,24 3 C25 4,24 8,24 14 Z" fill="#6BBC58"/>
  <path d="M30 16 C32 10,34 6,33 5 C31 8,30 12,30 16 Z" fill="#5BA84A"/>
  <path d="M21 15 C20 9,19 6,20 5 C21 7,21 11,21 15 Z" fill="#6BBC58" opacity="0.8"/>
  <path d="M27 15 C28 9,29 6,28 5 C27 7,27 11,27 15 Z" fill="#6BBC58" opacity="0.8"/>
  <rect x="15" y="15" width="18" height="26" rx="7" fill="#F5C242"/>
  <path d="M16 22 C19 20,22 19,24 19 C26 19,29 20,32 22" stroke="#D9A65B" stroke-width="1" fill="none" stroke-linecap="round"/>
  <path d="M16 28 C19 26,22 25,24 25 C26 25,29 26,32 28" stroke="#D9A65B" stroke-width="1" fill="none" stroke-linecap="round"/>
  <path d="M16 34 C19 32,22 31,24 31 C26 31,29 32,32 34" stroke="#D9A65B" stroke-width="1" fill="none" stroke-linecap="round"/>
  <ellipse cx="20" cy="21" rx="3" ry="4" fill="#FFD970" opacity="0.4"/>
</svg>`,

  'potato': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <path d="M12 24 C12 16,17 11,24 11 C31 11,37 15,37 22 C37 30,34 37,26 38 C18 39,12 32,12 24 Z" fill="#D9A65B"/>
  <path d="M15 18 C17 14,20 13,24 13 C27 13,30 15,31 18 C28 16,24 15,20 16 Z" fill="#E8B870" opacity="0.7"/>
  <circle cx="18" cy="27" r="1.5" fill="#B8843A"/>
  <circle cx="28" cy="20" r="1.5" fill="#B8843A"/>
  <circle cx="30" cy="30" r="1.5" fill="#B8843A"/>
</svg>`,

  'garlic': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" fill="none">
  <path d="M24 37 C16 37,11 31,11 25 C11 18,16 13,24 13 C32 13,37 18,37 25 C37 31,32 37,24 37 Z" fill="#F0EDD8" stroke="#C8C0A0" stroke-width="1.2"/>
  <path d="M24 13 C23 18,21 22,19 26" stroke="#C8C0A0" stroke-width="1.2" fill="none"/>
  <path d="M24 13 C25 18,27 22,29 26" stroke="#C8C0A0" stroke-width="1.2" fill="none"/>
  <path d="M13 24 C16 21,20 19,24 19 C28 19,32 21,35 24" stroke="#C8C0A0" stroke-width="1" fill="none"/>
  <ellipse cx="24" cy="37" rx="3" ry="2" fill="#C8C0A0"/>
  <path d="M22 13 C21 9,21 6,22 5 C23 7,23 10,22 13 Z" fill="#5BA84A"/>
  <path d="M26 13 C27 9,27 6,26 5 C25 7,25 10,26 13 Z" fill="#5BA84A"/>
</svg>`,
}

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const dryRun  = args.includes('--dry-run')
const force   = args.includes('--force')
const limitIdx = args.indexOf('--limit')
const limit   = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity
const nameIdx = args.indexOf('--name')
const nameFilter = nameIdx !== -1 ? args[nameIdx + 1].toLowerCase() : null

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Fetch ingredients
  let query = supabase.from('ingredients').select('id, name').order('name')
  if (!force) query = query.is('image_url', null)

  const { data: ingredients, error: fetchErr } = await query
  if (fetchErr) { console.error('DB fetch error:', fetchErr.message); process.exit(1) }

  let targets = ingredients
  if (nameFilter) targets = targets.filter(i => i.name.toLowerCase().includes(nameFilter))
  if (limit !== Infinity) targets = targets.slice(0, limit)

  console.log(`\nTargets: ${targets.length} ingredient(s)${dryRun ? ' [DRY RUN]' : ''}\n`)

  const results = []

  for (const ing of targets) {
    const slug   = toSlug(ing.name)
    const svgKey = ing.name.toLowerCase()
    const svg    = SVG_LIBRARY[svgKey] ?? SVG_LIBRARY[slug] ?? null

    if (!svg) {
      results.push({ name: ing.name, slug, status: 'SKIPPED', reason: 'no SVG in library' })
      continue
    }

    // Validate
    if (!svg.includes('viewBox="0 0 48 48"')) {
      results.push({ name: ing.name, slug, status: 'SKIPPED', reason: 'invalid SVG: missing viewBox' })
      continue
    }
    if (svg.includes('<script') || svg.includes('<text') || svg.includes('<foreignObject')) {
      results.push({ name: ing.name, slug, status: 'SKIPPED', reason: 'invalid SVG: forbidden element' })
      continue
    }
    const bytes = Buffer.byteLength(svg, 'utf8')
    if (bytes > 3072) {
      results.push({ name: ing.name, slug, status: 'SKIPPED', reason: `SVG too large: ${bytes} bytes` })
      continue
    }

    const path = `${ing.id}/${slug}.svg`
    const kb   = (bytes / 1024).toFixed(1)

    if (dryRun) {
      results.push({ name: ing.name, slug, status: 'DRY RUN', path, kb })
      continue
    }

    // Upload
    const { error: upErr } = await supabase.storage
      .from('ingredient-images')
      .upload(path, Buffer.from(svg), {
        contentType: 'image/svg+xml',
        upsert: force,
      })

    if (upErr && !upErr.message.includes('already exists')) {
      results.push({ name: ing.name, slug, status: 'ERROR', reason: upErr.message })
      continue
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('ingredient-images').getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    // Update DB
    const { error: dbErr } = await supabase
      .from('ingredients')
      .update({ image_url: publicUrl })
      .eq('id', ing.id)

    if (dbErr) {
      results.push({ name: ing.name, slug, status: 'ERROR', reason: dbErr.message })
      continue
    }

    results.push({ name: ing.name, slug, status: 'OK', path, kb })
  }

  // Report
  console.log('─'.repeat(60))
  for (const r of results) {
    if (r.status === 'OK')       console.log(`✅ ${r.name.padEnd(24)} → ${r.path} (${r.kb} KB)`)
    else if (r.status === 'DRY RUN') console.log(`🔍 ${r.name.padEnd(24)} → ${r.path} (${r.kb} KB) [dry run]`)
    else if (r.status === 'SKIPPED') console.log(`⏭  ${r.name.padEnd(24)} SKIPPED: ${r.reason}`)
    else                         console.log(`❌ ${r.name.padEnd(24)} ERROR: ${r.reason}`)
  }
  console.log('─'.repeat(60))
  const ok      = results.filter(r => r.status === 'OK').length
  const skipped = results.filter(r => r.status === 'SKIPPED').length
  const errors  = results.filter(r => r.status === 'ERROR').length
  console.log(`\nDone: ${ok} uploaded, ${skipped} skipped, ${errors} errors`)
}

main().catch(e => { console.error(e); process.exit(1) })
