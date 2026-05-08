-- Run this in your Supabase SQL editor.

-- =========================
-- INGREDIENTS
-- =========================
create table if not exists ingredients (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    purchase_unit text not null, -- kg, L, each
    recipe_unit text not null,   -- g, ml, each
    conversion_factor numeric not null, -- e.g. 1000 (kg -> g)
    current_price numeric not null default 0,
    yield_percent numeric not null default 100,
    created_at timestamp with time zone default now()
);

-- =========================
-- INGREDIENT PRICE HISTORY
-- =========================
create table if not exists ingredient_prices (
    id uuid primary key default gen_random_uuid(),
    ingredient_id uuid references ingredients(id) on delete cascade,
    price numeric not null,
    created_at timestamp with time zone default now()
);

-- =========================
-- VAT RATES
-- =========================
create table if not exists vat_rates (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    rate numeric not null, -- e.g. 0.135 for 13.5%
    created_at timestamp with time zone default now()
);

-- =========================
-- RECIPES
-- =========================
create table if not exists recipes (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    portions numeric not null,
    menu_price numeric not null,
    target_margin_percent numeric default 70,
    vat_rate_id uuid references vat_rates(id),
    shelf_life_days numeric,
    created_at timestamp with time zone default now()
);

-- =========================
-- RECIPE INGREDIENTS (JOIN TABLE)
-- =========================
create table if not exists recipe_ingredients (
    id uuid primary key default gen_random_uuid(),
    recipe_id uuid references recipes(id) on delete cascade,
    ingredient_id uuid references ingredients(id) on delete cascade,
    quantity numeric not null, -- in recipe_unit
    created_at timestamp with time zone default now()
);

-- =========================
-- SUPPLIERS
-- =========================
create table if not exists suppliers (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_at timestamp with time zone default now()
);

alter table ingredients
add column if not exists supplier_id uuid references suppliers(id);

-- =========================
-- INDEXES
-- =========================
create index if not exists idx_recipe_ingredients_recipe
on recipe_ingredients(recipe_id);

create index if not exists idx_recipe_ingredients_ingredient
on recipe_ingredients(ingredient_id);
