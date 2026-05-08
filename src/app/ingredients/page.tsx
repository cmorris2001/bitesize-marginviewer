'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Ingredient, Supplier } from '@/lib/supabase/types';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';

const AVATAR_CLASSES = ['av-rose', 'av-amber', 'av-sage', 'av-teal', 'av-lilac'];
const avatarFor = (name: string) => AVATAR_CLASSES[name.charCodeAt(0) % AVATAR_CLASSES.length];

const UNIT_PAIRS: Record<string, { recipeUnit: string; factor: number }> = {
  'kg':   { recipeUnit: 'g',    factor: 1000 },
  'L':    { recipeUnit: 'ml',   factor: 1000 },
  'each': { recipeUnit: 'each', factor: 1    },
};

export default function IngredientsPage() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [saving, setSaving] = useState(false);

  // Price update modal
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceTarget, setPriceTarget] = useState<Ingredient | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [priceNote, setPriceNote] = useState('');
  const [priceSaving, setPriceSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [purchaseUnit, setPurchaseUnit] = useState('kg');
  const [currentPrice, setCurrentPrice] = useState('');
  const [yieldPercent, setYieldPercent] = useState('100');

  // Derived from purchaseUnit — never shown as editable fields
  const pair = UNIT_PAIRS[purchaseUnit] ?? UNIT_PAIRS['kg'];
  const recipeUnit = pair.recipeUnit;
  const conversionFactor = pair.factor;

  async function load() {
    setLoading(true);
    const [ingredientsRes, suppliersRes] = await Promise.all([
      supabase.from('ingredients').select('*').order('name', { ascending: true }),
      supabase.from('suppliers').select('*').order('name', { ascending: true }),
    ]);
    if (ingredientsRes.error) showToast(ingredientsRes.error.message, 'error');
    if (suppliersRes.error) showToast(suppliersRes.error.message, 'error');
    setIngredients(ingredientsRes.data ?? []);
    setSuppliers(suppliersRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setName('');
    setSupplierId('');
    setPurchaseUnit('kg');
    setCurrentPrice('');
    setYieldPercent('100');
    setModalOpen(true);
  }

  function openEdit(ing: Ingredient) {
    setEditing(ing);
    setName(ing.name);
    setSupplierId(ing.supplier_id || '');
    setPurchaseUnit(ing.purchase_unit);
    setCurrentPrice(ing.current_price.toString());
    setYieldPercent(ing.yield_percent.toString());
    setModalOpen(true);
  }

  async function save() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Name is required', 'error');
      return;
    }
    if (!currentPrice || isNaN(Number(currentPrice)) || Number(currentPrice) < 0) {
      showToast('Current price must be a non-negative number', 'error');
      return;
    }
    const yieldNum = Number(yieldPercent);
    if (!yieldPercent || isNaN(yieldNum) || yieldNum <= 0 || yieldNum > 100) {
      showToast('Yield must be between 1 and 100', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const { error: updateError } = await supabase
          .from('ingredients')
          .update({
            name: trimmedName,
            supplier_id: supplierId || null,
            purchase_unit: purchaseUnit,
            recipe_unit: recipeUnit,
            conversion_factor: conversionFactor,
            current_price: Number(currentPrice),
            yield_percent: yieldNum,
          })
          .eq('id', editing.id);

        if (updateError) throw updateError;

        if (Number(currentPrice) !== editing.current_price) {
          const { error: priceError } = await supabase
            .from('ingredient_prices')
            .insert({ ingredient_id: editing.id, price: Number(currentPrice) });
          if (priceError) throw priceError;
        }

        showToast('Ingredient updated', 'success');
      } else {
        const { error: insertError } = await supabase
          .from('ingredients')
          .insert({
            name: trimmedName,
            supplier_id: supplierId || null,
            purchase_unit: purchaseUnit,
            recipe_unit: recipeUnit,
            conversion_factor: conversionFactor,
            current_price: Number(currentPrice),
            yield_percent: yieldNum,
          });

        if (insertError) throw insertError;
        showToast(`Added "${trimmedName}"`, 'success');
      }

      setSaving(false);
      setModalOpen(false);
      load();
    } catch (error: any) {
      showToast(error.message || 'An error occurred', 'error');
      setSaving(false);
    }
  }

  function openPriceUpdate(ing: Ingredient) {
    setPriceTarget(ing);
    setNewPrice('');
    setPriceNote('');
    setPriceModalOpen(true);
  }

  async function savePrice() {
    if (!priceTarget) return;
    const newPriceNum = Number(newPrice);
    if (!newPrice || isNaN(newPriceNum) || newPriceNum < 0) {
      showToast('New price must be a non-negative number', 'error');
      return;
    }
    const oldPrice = priceTarget.current_price;
    const changePct = oldPrice === 0 ? null : ((newPriceNum - oldPrice) / oldPrice) * 100;

    setPriceSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('ingredients')
        .update({ current_price: newPriceNum })
        .eq('id', priceTarget.id);
      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('ingredient_prices')
        .insert({
          ingredient_id: priceTarget.id,
          price: newPriceNum,
          old_price: oldPrice,
          new_price: newPriceNum,
          change_percent: changePct !== null ? Math.round(changePct * 100) / 100 : null,
          supplier_id: priceTarget.supplier_id ?? null,
          note: priceNote.trim() || null,
          changed_at: new Date().toISOString(),
        });
      if (historyError) throw historyError;

      showToast('Price updated', 'success');
      setPriceModalOpen(false);
      load();
    } catch (error: any) {
      showToast(error.message || 'An error occurred', 'error');
    } finally {
      setPriceSaving(false);
    }
  }

  async function remove(ing: Ingredient) {
    if (!confirm(`Remove "${ing.name}"?`)) return;
    const { error } = await supabase.from('ingredients').delete().eq('id', ing.id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Ingredient removed', 'success');
    load();
  }

  const filtered = ingredients.filter((ing) => {
    const matchesSearch = !search || ing.name.toLowerCase().includes(search.toLowerCase());
    const matchesSupplier =
      !supplierFilter ||
      (supplierFilter === '__none__' ? !ing.supplier_id : ing.supplier_id === supplierFilter);
    return matchesSearch && matchesSupplier;
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ingredients</h1>
          <div className="page-sub">What goes into your recipes</div>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openNew}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New ingredient
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : ingredients.length === 0 ? (
        <EmptyState
          title="No ingredients yet"
          text="Add ingredients with how you buy them (kg, L, each) and your current price. Recipes will pull cost from here."
          action={<button className="btn btn-primary" onClick={openNew}>Add your first ingredient</button>}
        />
      ) : (
        <>
          <div className="search-bar">
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div className="search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search ingredients…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                style={{ width: 'auto', flexShrink: 0 }}
              >
                <option value="">All suppliers</option>
                <option value="__none__">No supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="result-count">{filtered.length} of {ingredients.length}</div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>Ingredient</th>
                  <th>Supplier</th>
                  <th>Bought as → Used as</th>
                  <th className="num">Price</th>
                  <th className="num">Yield</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ing) => (
                  <tr key={ing.id}>
                    <td>
                      <div className="item-cell">
                        <div className={`item-avatar ${avatarFor(ing.name)}`}>
                          {ing.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="item-name">{ing.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {ing.supplier_id
                        ? suppliers.find((s) => s.id === ing.supplier_id)?.name || '—'
                        : '—'}
                    </td>
                    <td>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {ing.purchase_unit} → {ing.recipe_unit}
                      </span>
                    </td>
                    <td className="num">€{ing.current_price.toFixed(2)} / {ing.purchase_unit}</td>
                    <td className="num">{ing.yield_percent}%</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost" onClick={() => openPriceUpdate(ing)}>Update Price</button>
                      <button className="btn btn-ghost" onClick={() => openEdit(ing)}>Edit</button>
                      <button className="btn btn-ghost" onClick={() => remove(ing)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={priceModalOpen}
        onClose={() => setPriceModalOpen(false)}
        title="Update price"
        subtitle={priceTarget?.name}
        footer={
          <>
            <button className="btn" onClick={() => setPriceModalOpen(false)} disabled={priceSaving}>Cancel</button>
            <button className="btn btn-primary" onClick={savePrice} disabled={priceSaving}>
              {priceSaving ? 'Saving…' : 'Update price'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Current price</label>
          <input type="text" value={`€${priceTarget?.current_price.toFixed(2)} / ${priceTarget?.purchase_unit}`} disabled />
        </div>
        <div className="field">
          <label>New price</label>
          <input
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            placeholder="e.g. 4.50"
            min="0"
            step="0.01"
            autoFocus
          />
          <div className="field-hint">Per {priceTarget?.purchase_unit}</div>
        </div>
        <div className="field">
          <label>Note <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
          <input
            type="text"
            value={priceNote}
            onChange={(e) => setPriceNote(e.target.value)}
            placeholder="e.g. Supplier invoice Aug 2025"
          />
        </div>
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit ingredient' : 'New ingredient'}
        subtitle={editing ? 'Update ingredient details' : 'Add a new ingredient'}
        footer={
          <>
            <button className="btn" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add ingredient'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Ingredient name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Butter"
            autoFocus
          />
        </div>

        <div className="field">
          <label>Supplier</label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">— Not specified —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Bought as</label>
          <select
            value={purchaseUnit}
            onChange={(e) => setPurchaseUnit(e.target.value)}
          >
            {Object.keys(UNIT_PAIRS).map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
          <div className="field-hint">
            Used in recipes as: <strong>{recipeUnit}</strong>
          </div>
        </div>

        <div className="field">
          <label>Current price</label>
          <input
            type="number"
            value={currentPrice}
            onChange={(e) => setCurrentPrice(e.target.value)}
            placeholder="e.g. 4.50"
            min="0"
            step="0.01"
          />
          <div className="field-hint">Per {purchaseUnit}</div>
        </div>

        <div className="field">
          <label>Usable yield</label>
          <input
            type="number"
            value={yieldPercent}
            onChange={(e) => setYieldPercent(e.target.value)}
            placeholder="100"
            min="1"
            max="100"
            step="1"
          />
          <div className="field-hint">
            % of purchased {purchaseUnit} that is usable after prep (100 = no waste)
          </div>
        </div>
      </Modal>
    </>
  );
}
