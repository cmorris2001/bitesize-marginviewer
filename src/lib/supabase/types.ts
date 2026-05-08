// Types matching the Supabase schema in supabase/schema.sql
// Regenerate with: npx supabase gen types typescript --project-id YOUR_ID > src/lib/supabase/types.ts

export type PurchaseUnit = 'kg' | 'L' | 'each';
export type RecipeUnit = 'g' | 'ml' | 'each';

export interface Supplier {
  id: string;
  name: string;
  created_at: string;
}

export interface VatRate {
  id: string;
  name: string;
  rate: number;
  created_at: string;
}

export interface Ingredient {
  id: string;
  name: string;
  purchase_unit: string;
  recipe_unit: string;
  conversion_factor: number;
  current_price: number;
  yield_percent: number;
  supplier_id: string | null;
  created_at: string;
}

export interface IngredientPrice {
  id: string;
  ingredient_id: string;
  price: number;
  created_at: string;
}

export interface Recipe {
  id: string;
  name: string;
  portions: number;
  menu_price: number;
  target_margin_percent: number;
  vat_rate_id: string | null;
  shelf_life_days: number | null;
  wastage_percent?: number | null;
  created_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number;
  created_at: string;
}

// Joined view used in recipe detail screens
export interface RecipeIngredientWithDetail extends RecipeIngredient {
  ingredient: Ingredient;
}

export interface RecipeWithIngredients extends Recipe {
  vat_rate?: VatRate;
  recipe_ingredients: RecipeIngredientWithDetail[];
}
