# PrepDesk

Recipe & cost manager for a café — built on **Next.js 14 (App Router) + Supabase**.

The visual design is the cream/teal/sage palette from the BiteSize inventory app. Typography is **Fraunces** (display) + **Manrope** (body).

## What's wired up

- ✅ **Sidebar nav** — Dashboard, Recipes, Ingredients, Suppliers
- ✅ **Suppliers screen** — fully functional CRUD against Supabase (`suppliers` table)
- ✅ **Dashboard** — live row counts from all three tables
- ⚠️ **Ingredients screen** — empty state + reads from Supabase, but no add/edit form yet
- ⚠️ **Recipes screen** — empty state + reads from Supabase, but no add/edit form yet

The Suppliers screen is the reference implementation — copy its pattern when building Ingredients and Recipes.

## Setup

### 1. Install

```bash
npm install
```

### 2. Apply the schema

In your Supabase project's **SQL editor**, run the contents of [`supabase/schema.sql`](./supabase/schema.sql). (You've already done this — it's included for reference and for fresh environments.)

### 3. Environment variables

```bash
cp .env.local.example .env.local
```

Then fill in `.env.local` with values from your Supabase project's **Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key
```

> Supabase recently renamed `anon key` to `publishable key`. Either works — same value, new variable name.

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000.

## Costing convention

This is the single most important thing to keep consistent across the app. It lives in `src/lib/costing.ts`.

- `ingredients.current_price` is **per `purchase_unit`** (e.g. €8.40 / kg)
- `ingredients.conversion_factor` converts 1 purchase unit → N recipe units (e.g. `1000` for kg → g)
- `ingredients.yield_percent` accounts for prep loss (100 = no loss; 80 = 20% loss)
- `recipe_ingredients.quantity` is **in `recipe_unit`** (e.g. 25 g)

Cost of one ingredient line in a recipe:

```
pricePerRecipeUnit = current_price / conversion_factor
effectivePrice = pricePerRecipeUnit / (yield_percent / 100)
lineCost = quantity * effectivePrice
```

Use the helpers in `src/lib/costing.ts` — never recompute by hand.

## VAT note

`menu_price` on `recipes` is treated as **VAT-inclusive** (the price the customer pays at the till). The schema doesn't store a VAT rate per recipe yet — when you need it, add a `vat_rate numeric default 0.135` column or a `vat_rate_id` FK to a new `vat_rates` table. Irish hospitality is currently 13.5%, but verify on revenue.ie before going live.

## Project structure

```
src/
  app/
    layout.tsx              ← Root layout with sidebar + toast provider
    page.tsx                ← Dashboard (server component)
    globals.css             ← All styles, with CSS-variable theme
    suppliers/
      page.tsx              ← Server component shell
      SuppliersClient.tsx   ← Full CRUD (reference implementation)
    ingredients/page.tsx    ← Stub — needs build-out
    recipes/page.tsx        ← Stub — needs build-out
  components/
    Sidebar.tsx
    Modal.tsx
    Toast.tsx
    EmptyState.tsx
  lib/
    costing.ts              ← All cost / margin calculations
    supabase/
      client.ts             ← Browser client
      server.ts             ← Server component client
      types.ts              ← TypeScript types matching schema
supabase/
  schema.sql                ← Run this in Supabase SQL editor
```

## Working with Claude Code

Open this folder in your editor and run `claude` (or use the VS Code / JetBrains extension). Some prompts that work well:

**Build the Ingredients screen:**

> Build out `src/app/ingredients/page.tsx` to match the pattern in `src/app/suppliers/SuppliersClient.tsx`. The form needs fields for: name, supplier_id (dropdown from suppliers table), purchase_unit (kg/L/each), recipe_unit (g/ml/each), conversion_factor, current_price, yield_percent. When current_price changes on an existing ingredient, also insert a row into `ingredient_prices` so we keep history.

**Build the Recipes screen:**

> Build out `src/app/recipes/page.tsx` following the Suppliers pattern. List view should show name, portions, menu_price, computed cost/portion, computed margin %. Use the helpers in `@/lib/costing` for computations. Need a detail modal that lists recipe_ingredients with quantity + per-line cost. Add a "New recipe" form with an inline ingredient picker that lets you pick from existing ingredients and set a quantity.

**Add the price-change impact preview:**

> Add a "Simulate price change" button on the Ingredients screen. Opens a modal where the user picks an ingredient and enters a new price. Show all recipes that use that ingredient with old cost/portion, new cost/portion, old margin, new margin — colour-code margins below `target_margin_percent` in rose. On Apply, update `ingredients.current_price` AND insert a row into `ingredient_prices`.

**Add Row Level Security:**

> The Supabase tables don't have RLS policies. Add policies that let any authenticated user read and write all four tables (single-tenant café app). Output the SQL.

## Roadmap (from the spec discussion)

- [ ] Ingredients CRUD with price history insertion on update
- [ ] Recipes CRUD with inline ingredient picker
- [ ] Recipe detail with cost breakdown
- [ ] **Price change impact preview** — the differentiator
- [ ] Margins view (sortable, filterable by category — needs a `category` column on recipes)
- [ ] Price history view per ingredient
- [ ] **v2:** PDF invoice ingestion (LLM extraction → fuzzy match → confirm → bulk price update)
- [ ] Auth (Supabase Auth, single shared café login is fine)
- [ ] RLS policies

## Tech notes

- **Next.js 14 App Router** — server components for data fetching where possible, client components for interactive screens
- **`@supabase/ssr`** — current recommended pattern (the older `@supabase/auth-helpers-nextjs` is deprecated)
- **No Tailwind, no shadcn** — kept it intentionally light. Plain CSS with variables. Add Tailwind later if you want, but the current styling is small enough that you don't need a framework.
- **No auth yet** — every screen reads/writes openly. Add Supabase Auth + RLS before deploying anywhere public.
