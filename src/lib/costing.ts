import type { Ingredient, RecipeIngredientWithDetail, Recipe, VatRate } from './supabase/types';

/**
 * Convention used throughout the app:
 *   - ingredients.current_price is in € PER purchase_unit  (e.g. €8.40 / kg)
 *   - ingredients.conversion_factor converts 1 purchase_unit -> N recipe_units
 *     (e.g. 1 kg -> 1000 g, so conversion_factor = 1000)
 *   - recipe_ingredients.quantity is in recipe_unit (e.g. 25 g)
 *   - yield_percent: 100 means no loss; 80 means you lose 20% prepping
 *
 * Cost of one recipe_ingredient line:
 *   pricePerRecipeUnit = current_price / conversion_factor
 *   effectivePricePerRecipeUnit = pricePerRecipeUnit / (yield_percent / 100)
 *   lineCost = quantity * effectivePricePerRecipeUnit
 */

export function pricePerRecipeUnit(ing: Pick<Ingredient, 'current_price' | 'conversion_factor' | 'yield_percent'>): number {
  if (!ing.conversion_factor) return 0;
  const base = ing.current_price / ing.conversion_factor;
  const yieldPct = ing.yield_percent || 100;
  return base / (yieldPct / 100);
}

export function lineCost(ri: RecipeIngredientWithDetail): number {
  return ri.quantity * pricePerRecipeUnit(ri.ingredient);
}

export function recipeBatchCost(ingredients: RecipeIngredientWithDetail[]): number {
  return ingredients.reduce((sum, ri) => sum + lineCost(ri), 0);
}

export function recipeCostPerPortion(recipe: Pick<Recipe, 'portions'>, ingredients: RecipeIngredientWithDetail[]): number {
  if (!recipe.portions) return 0;
  return recipeBatchCost(ingredients) / recipe.portions;
}

export interface RecipeCosting {
  sellingPriceIncVat: number;
  vatRate: number;
  sellingPriceExVat: number;
  vatAmount: number;
  ingredientBatchCost: number;
  ingredientCostPerPortion: number;
  grossProfitPerPortion: number;
  ingredientMarginPercent: number;
}

export function computeRecipeCosting(
  recipe: Pick<Recipe, 'menu_price' | 'portions'> & { vat_rate?: Pick<VatRate, 'rate'> | null },
  ingredients: RecipeIngredientWithDetail[]
): RecipeCosting {
  const vatRate = recipe.vat_rate?.rate ?? 0;
  const sellingPriceIncVat = recipe.menu_price;
  const sellingPriceExVat = sellingPriceIncVat / (1 + vatRate);
  const vatAmount = sellingPriceIncVat - sellingPriceExVat;
  const ingredientBatchCost = recipeBatchCost(ingredients);
  const ingredientCostPerPortion = recipe.portions > 0 ? ingredientBatchCost / recipe.portions : 0;
  const grossProfitPerPortion = sellingPriceExVat - ingredientCostPerPortion;
  const ingredientMarginPercent = sellingPriceExVat > 0
    ? (grossProfitPerPortion / sellingPriceExVat) * 100
    : 0;
  return { sellingPriceIncVat, vatRate, sellingPriceExVat, vatAmount, ingredientBatchCost, ingredientCostPerPortion, grossProfitPerPortion, ingredientMarginPercent };
}

/**
 * Margin assumes menu_price is INCLUSIVE of VAT.
 * If you change that convention later, update this single function.
 */
export function exVatPrice(menuPrice: number, vatRate: number): number {
  return menuPrice / (1 + vatRate);
}

export function marginPercent(costPerPortion: number, menuPriceExVat: number): number {
  if (menuPriceExVat <= 0) return 0;
  return ((menuPriceExVat - costPerPortion) / menuPriceExVat) * 100;
}

export function formatEuro(n: number): string {
  return '€' + n.toFixed(2);
}

export function marginColorClass(m: number): string {
  if (m >= 65) return 'margin-good';
  if (m >= 50) return 'margin-warn';
  return 'margin-bad';
}
