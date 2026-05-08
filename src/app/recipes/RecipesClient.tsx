'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Recipe, Ingredient, RecipeWithIngredients, VatRate } from '@/lib/supabase/types';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import {
  computeRecipeCosting,
  formatEuro,
  marginColorClass,
  lineCost,
} from '@/lib/costing';

const AVATAR_CLASSES = ['av-rose', 'av-amber', 'av-sage', 'av-teal', 'av-lilac'];
const avatarFor = (name: string) => AVATAR_CLASSES[name.charCodeAt(0) % AVATAR_CLASSES.length];

function CostRow({ label, value, muted, colorClass }: { label: string; value: string; muted?: boolean; colorClass?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.3rem 0' }}>
      <span style={{ fontSize: '0.875rem', color: muted ? 'var(--color-text-dim)' : undefined }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: '0.875rem' }} className={colorClass ?? ''}>{value}</span>
    </div>
  );
}

export default function RecipesClient() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [vatRates, setVatRates] = useState<VatRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Detail/Edit modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailRecipe, setDetailRecipe] = useState<RecipeWithIngredients | null>(null);
  const [isEditingDetail, setIsEditingDetail] = useState(false);

  // Edit form state
  const [editPortions, setEditPortions] = useState('');
  const [editMenuPrice, setEditMenuPrice] = useState('');
  const [editVatRateId, setEditVatRateId] = useState('');
  const [editShelfLife, setEditShelfLife] = useState('');
  const [editTargetMargin, setEditTargetMargin] = useState('');
  const [saving, setSaving] = useState(false);

  // New recipe modal state
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [formName, setFormName] = useState('');
  const [formPortions, setFormPortions] = useState('');
  const [formMenuPrice, setFormMenuPrice] = useState('');
  const [formVatRateId, setFormVatRateId] = useState('');
  const [formTargetMargin, setFormTargetMargin] = useState('65');
  const [formIngredients, setFormIngredients] = useState<{ ingredientId: string; quantity: number }[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [pickerQuantity, setPickerQuantity] = useState('');
  const [newSaving, setNewSaving] = useState(false);


  async function loadRecipes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('recipes')
      .select(
        `
        *,
        vat_rate:vat_rates(*),
        recipe_ingredients (
          *,
          ingredient:ingredients(*)
        )
      `
      )
      .order('name', { ascending: true });

    if (error) {
      showToast(error.message, 'error');
    } else {
      setRecipes((data as RecipeWithIngredients[]) ?? []);
    }
    setLoading(false);
  }

  async function loadIngredients() {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      showToast(error.message, 'error');
    } else {
      setIngredients(data ?? []);
    }
  }

  async function loadVatRates() {
    const { data, error } = await supabase
      .from('vat_rates')
      .select('*')
      .order('rate', { ascending: true });

    if (error) {
      showToast(error.message, 'error');
    } else {
      setVatRates(data ?? []);
    }
  }

  useEffect(() => {
    loadRecipes();
    loadIngredients();
    loadVatRates();
  }, []);

  function openDetail(r: RecipeWithIngredients) {
    setDetailRecipe(r);
    setIsEditingDetail(false);
    setEditPortions(r.portions.toString());
    setEditMenuPrice(r.menu_price.toString());
    setEditVatRateId(r.vat_rate_id || '');
    setEditShelfLife(r.shelf_life_days?.toString() || '');
    setEditTargetMargin(r.target_margin_percent.toString());
    setDetailModalOpen(true);
  }

  function startEditDetail() {
    setIsEditingDetail(true);
  }

  async function saveDetailChanges() {
    if (!detailRecipe) return;

    const portions = parseFloat(editPortions);
    const menuPrice = parseFloat(editMenuPrice);
    const shelfLife = editShelfLife ? parseFloat(editShelfLife) : null;
    const targetMargin = parseFloat(editTargetMargin);

    if (isNaN(portions) || portions <= 0) {
      showToast('Portions must be greater than 0', 'error');
      return;
    }
    if (isNaN(menuPrice) || menuPrice < 0) {
      showToast('Menu price must be a valid number', 'error');
      return;
    }
    if (isNaN(targetMargin) || targetMargin < 0) {
      showToast('Target margin must be a valid number', 'error');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('recipes')
        .update({
          portions,
          menu_price: menuPrice,
          vat_rate_id: editVatRateId || null,
          shelf_life_days: shelfLife,
          target_margin_percent: targetMargin,
        })
        .eq('id', detailRecipe.id);

      if (error) throw error;

      showToast('Recipe updated', 'success');
      setSaving(false);
      setIsEditingDetail(false);
      loadRecipes();
    } catch (err: any) {
      showToast(err.message, 'error');
      setSaving(false);
    }
  }

  function openNew() {
    setEditing(null);
    setFormName('');
    setFormPortions('');
    setFormMenuPrice('');
    setFormVatRateId('');
    setFormTargetMargin('65');
    setFormIngredients([]);
    setSelectedIngredientId('');
    setPickerQuantity('');
    setNewModalOpen(true);
  }

  function openEditRecipe(r: RecipeWithIngredients) {
    setEditing(r);
    setFormName(r.name);
    setFormPortions(r.portions.toString());
    setFormMenuPrice(r.menu_price.toString());
    setFormVatRateId(r.vat_rate_id || '');
    setFormTargetMargin(r.target_margin_percent.toString());
    setFormIngredients(
      r.recipe_ingredients.map((ri) => ({
        ingredientId: ri.ingredient_id,
        quantity: ri.quantity,
      }))
    );
    setSelectedIngredientId('');
    setPickerQuantity('');
    setNewModalOpen(true);
  }

  function addIngredientToForm() {
    const qty = parseFloat(pickerQuantity);
    if (!selectedIngredientId) {
      showToast('Select an ingredient', 'error');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      showToast('Quantity must be greater than 0', 'error');
      return;
    }

    if (formIngredients.some((fi) => fi.ingredientId === selectedIngredientId)) {
      showToast('Ingredient already added', 'error');
      return;
    }

    setFormIngredients([...formIngredients, { ingredientId: selectedIngredientId, quantity: qty }]);
    setSelectedIngredientId('');
    setPickerQuantity('');
  }

  function removeIngredientFromForm(ingredientId: string) {
    setFormIngredients(formIngredients.filter((fi) => fi.ingredientId !== ingredientId));
  }

  async function saveRecipe() {
    const name = formName.trim();
    const portions = parseFloat(formPortions);
    const menuPrice = parseFloat(formMenuPrice);
    const targetMargin = parseFloat(formTargetMargin);

    if (!name) {
      showToast('Recipe name is required', 'error');
      return;
    }
    if (isNaN(portions) || portions <= 0) {
      showToast('Portions must be greater than 0', 'error');
      return;
    }
    if (isNaN(menuPrice) || menuPrice < 0) {
      showToast('Menu price must be a valid number', 'error');
      return;
    }
    if (isNaN(targetMargin) || targetMargin < 0) {
      showToast('Target margin must be a valid number', 'error');
      return;
    }
    if (formIngredients.length === 0) {
      showToast('Add at least one ingredient', 'error');
      return;
    }

    setNewSaving(true);

    try {
      if (editing) {
        // Update recipe
        const { error: updateError } = await supabase
          .from('recipes')
          .update({
            name,
            portions,
            menu_price: menuPrice,
            vat_rate_id: formVatRateId || null,
            target_margin_percent: targetMargin,
          })
          .eq('id', editing.id);

        if (updateError) throw updateError;

        // Delete existing recipe_ingredients
        const { error: deleteError } = await supabase
          .from('recipe_ingredients')
          .delete()
          .eq('recipe_id', editing.id);

        if (deleteError) throw deleteError;

        // Insert new recipe_ingredients
        const recipeIngredientsToInsert = formIngredients.map((fi) => ({
          recipe_id: editing.id,
          ingredient_id: fi.ingredientId,
          quantity: fi.quantity,
        }));

        const { error: insertError } = await supabase
          .from('recipe_ingredients')
          .insert(recipeIngredientsToInsert);

        if (insertError) throw insertError;

        showToast('Recipe updated', 'success');
      } else {
        // Create recipe
        const { data: newRecipe, error: createError } = await supabase
          .from('recipes')
          .insert({
            name,
            portions,
            menu_price: menuPrice,
            vat_rate_id: formVatRateId || null,
            target_margin_percent: targetMargin,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Insert recipe_ingredients
        const recipeIngredientsToInsert = formIngredients.map((fi) => ({
          recipe_id: newRecipe.id,
          ingredient_id: fi.ingredientId,
          quantity: fi.quantity,
        }));

        const { error: insertError } = await supabase
          .from('recipe_ingredients')
          .insert(recipeIngredientsToInsert);

        if (insertError) throw insertError;

        showToast(`Added "${name}"`, 'success');
      }

      setNewSaving(false);
      setNewModalOpen(false);
      loadRecipes();
    } catch (err: any) {
      showToast(err.message, 'error');
      setNewSaving(false);
    }
  }

  async function remove(r: Recipe) {
    if (!confirm(`Remove "${r.name}"?`)) return;

    try {
      // Delete recipe_ingredients first (FK constraint)
      const { error: deleteIngrError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', r.id);

      if (deleteIngrError) throw deleteIngrError;

      // Delete recipe
      const { error: deleteRecipeError } = await supabase.from('recipes').delete().eq('id', r.id);

      if (deleteRecipeError) throw deleteRecipeError;

      showToast('Recipe removed', 'success');
      loadRecipes();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  }

  const filtered = recipes.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Recipes</h1>
          <div className="page-sub">Costed against current ingredient prices</div>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openNew}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New recipe
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : recipes.length === 0 ? (
        <EmptyState
          title="No recipes yet"
          text="Once you've added ingredients, build recipes from them. BitePrep will compute cost per portion and margin automatically."
          action={<button className="btn btn-primary" onClick={openNew}>Add your first recipe</button>}
        />
      ) : (
        <>
          <div className="search-bar">
            <div className="search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search recipes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="result-count">{filtered.length} of {recipes.length}</div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Recipe</th>
                  <th style={{ width: '12%' }} className="num">Portions</th>
                  <th style={{ width: '12%' }} className="num">Menu Price</th>
                  <th style={{ width: '12%' }} className="num">Cost/Portion</th>
                  <th style={{ width: '12%' }} className="num">Ingredient Margin %</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const costing = computeRecipeCosting(r, r.recipe_ingredients);
                  const marginClass = marginColorClass(costing.ingredientMarginPercent);

                  return (
                    <tr key={r.id}>
                      <td>
                        <div className="item-cell">
                          <div className={`item-avatar ${avatarFor(r.name)}`}>
                            {r.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="item-name">{r.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="num">{r.portions}</td>
                      <td className="num">{formatEuro(r.menu_price)}</td>
                      <td className="num">{formatEuro(costing.ingredientCostPerPortion)}</td>
                      <td className={`num ${marginClass}`}>{costing.ingredientMarginPercent.toFixed(1)}%</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-ghost" onClick={() => openDetail(r)}>
                          Details
                        </button>
                        <button className="btn btn-ghost" onClick={() => openEditRecipe(r)}>
                          Edit Recipe
                        </button>
                        <button className="btn btn-ghost" onClick={() => remove(r)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Detail Modal */}
      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={detailRecipe?.name ?? 'Recipe'}
      >
        {detailRecipe && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Pricing Summary */}
            {!isEditingDetail ? (
              <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                {(() => {
                  const costing = computeRecipeCosting(detailRecipe, detailRecipe.recipe_ingredients as any);
                  const vatRateName = detailRecipe.vat_rate?.name ?? '—';
                  const wastagePercent = detailRecipe.wastage_percent ?? 5;
                  const wastageAmount = costing.ingredientBatchCost * (wastagePercent / 100);
                  const adjustedBatchCost = costing.ingredientBatchCost + wastageAmount;
                  const marginClass = marginColorClass(costing.ingredientMarginPercent);
                  return (
                    <>
                      <CostRow label="Selling price (inc. VAT)" value={formatEuro(costing.sellingPriceIncVat)} />
                      <CostRow label={`VAT: ${vatRateName} (${(costing.vatRate * 100).toFixed(1)}%)`} value={formatEuro(costing.vatAmount)} muted />
                      <CostRow label="Selling price (ex. VAT)" value={formatEuro(costing.sellingPriceExVat)} />
                      <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />
                      <CostRow label="Ingredient batch cost" value={formatEuro(costing.ingredientBatchCost)} />
                      <CostRow label={`Wastage (${wastagePercent}%)`} value={formatEuro(wastageAmount)} muted />
                      <CostRow label="Adjusted batch cost" value={formatEuro(adjustedBatchCost)} />
                      <CostRow label="Ingredient cost / portion" value={formatEuro(costing.ingredientCostPerPortion)} />
                      <CostRow label="Gross profit / portion" value={formatEuro(costing.grossProfitPerPortion)} />
                      <CostRow label="Ingredient margin" value={`${costing.ingredientMarginPercent.toFixed(1)}%`} colorClass={marginClass} />
                      <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />
                      <CostRow label="Portions" value={String(detailRecipe.portions)} />
                      {detailRecipe.shelf_life_days != null && (
                        <CostRow label="Shelf life" value={`${detailRecipe.shelf_life_days} days`} />
                      )}
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', margin: '0.75rem 0' }}>
                        Margin is based on ingredient costs only. Overheads are not included.
                      </p>
                      <button className="btn btn-primary" onClick={startEditDetail} style={{ width: '100%' }}>
                        Edit
                      </button>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="field">
                    <label>Portions (Yield)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={editPortions}
                      onChange={(e) => setEditPortions(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="field">
                    <label>Menu Price (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editMenuPrice}
                      onChange={(e) => setEditMenuPrice(e.target.value)}
                      disabled={saving}
                    />
                  </div>
                  <div className="field">
                    <label>VAT Rate</label>
                    <select
                      value={editVatRateId}
                      onChange={(e) => setEditVatRateId(e.target.value)}
                      disabled={saving}
                    >
                      <option value="">— Not specified —</option>
                      {vatRates.map((vr) => (
                        <option key={vr.id} value={vr.id}>
                          {vr.name} ({(vr.rate * 100).toFixed(1)}%)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Shelf Life (days)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={editShelfLife}
                      onChange={(e) => setEditShelfLife(e.target.value)}
                      disabled={saving}
                      placeholder="e.g. 3"
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Target Margin %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editTargetMargin}
                    onChange={(e) => setEditTargetMargin(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    className="btn"
                    onClick={() => setIsEditingDetail(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={saveDetailChanges}
                    disabled={saving}
                    style={{ flex: 1 }}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Ingredients Breakdown */}
            <div>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-dim)' }}>
                Ingredients
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {detailRecipe.recipe_ingredients.length === 0 ? (
                  <div style={{ color: 'var(--color-text-dim)', fontSize: '0.875rem' }}>No ingredients added</div>
                ) : (
                  <>
                    {detailRecipe.recipe_ingredients.map((ri) => {
                      const cost = lineCost(ri as any);
                      return (
                        <div
                          key={ri.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.75rem',
                            backgroundColor: 'var(--color-bg-secondary)',
                            borderRadius: '0.375rem',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 500 }}>{ri.ingredient.name}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}>
                              {ri.quantity} {ri.ingredient.recipe_unit}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 500 }}>{formatEuro(cost)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* New/Edit Recipe Modal */}
      <Modal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        title={editing ? 'Edit recipe' : 'New recipe'}
        subtitle={editing ? 'Update the recipe details' : 'Create a new recipe'}
        footer={
          <>
            <button className="btn" onClick={() => setNewModalOpen(false)} disabled={newSaving}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={saveRecipe} disabled={newSaving}>
              {newSaving ? 'Saving…' : editing ? 'Save changes' : 'Add recipe'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="field">
            <label>Recipe name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Chocolate Cake"
              autoFocus
              disabled={newSaving}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label>Portions</label>
              <input
                type="number"
                step="0.1"
                value={formPortions}
                onChange={(e) => setFormPortions(e.target.value)}
                placeholder="8"
                disabled={newSaving}
              />
            </div>
            <div className="field">
              <label>Menu price (€, incl. VAT)</label>
              <input
                type="number"
                step="0.01"
                value={formMenuPrice}
                onChange={(e) => setFormMenuPrice(e.target.value)}
                placeholder="12.50"
                disabled={newSaving}
              />
            </div>
          </div>

          <div className="field">
            <label>Target margin %</label>
            <input
              type="number"
              step="0.1"
              value={formTargetMargin}
              onChange={(e) => setFormTargetMargin(e.target.value)}
              placeholder="65"
              disabled={newSaving}
            />
          </div>

          <div className="field">
            <label>VAT Rate</label>
            <select
              value={formVatRateId}
              onChange={(e) => setFormVatRateId(e.target.value)}
              disabled={newSaving}
            >
              <option value="">— Not specified —</option>
              {vatRates.map((vr) => (
                <option key={vr.id} value={vr.id}>
                  {vr.name} ({(vr.rate * 100).toFixed(1)}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Ingredients</label>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                }}
              >
                <select
                  value={selectedIngredientId}
                  onChange={(e) => setSelectedIngredientId(e.target.value)}
                  disabled={newSaving}
                  style={{ flex: 1 }}
                >
                  <option value="">Select an ingredient…</option>
                  {ingredients
                    .filter((ing) => !formIngredients.some((fi) => fi.ingredientId === ing.id))
                    .map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name} ({ing.recipe_unit})
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  step="0.1"
                  placeholder="qty"
                  value={pickerQuantity}
                  onChange={(e) => setPickerQuantity(e.target.value)}
                  disabled={newSaving}
                  style={{ width: '80px' }}
                />
                <button
                  className="btn"
                  onClick={addIngredientToForm}
                  disabled={newSaving || !selectedIngredientId || !pickerQuantity}
                >
                  Add
                </button>
              </div>
            </div>

            {formIngredients.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {formIngredients.map((fi) => {
                  const ing = ingredients.find((i) => i.id === fi.ingredientId);
                  return (
                    <div
                      key={fi.ingredientId}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem',
                        backgroundColor: 'var(--color-bg-secondary)',
                        borderRadius: '0.375rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{ing?.name}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}>
                          {fi.quantity} {ing?.recipe_unit}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost"
                        onClick={() => removeIngredientFromForm(fi.ingredientId)}
                        disabled={newSaving}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
