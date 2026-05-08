import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  let recipeCount = 0;
  let ingredientCount = 0;
  let supplierCount = 0;
  let configError: string | null = null;
  let priceChanges: any[] = [];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    configError = 'Supabase environment variables are not set. Copy .env.local.example to .env.local and fill in your project URL and key.';
  } else {
    try {
      const supabase = createClient();
      const [r, i, s, p] = await Promise.all([
        supabase.from('recipes').select('*', { count: 'exact', head: true }),
        supabase.from('ingredients').select('*', { count: 'exact', head: true }),
        supabase.from('suppliers').select('*', { count: 'exact', head: true }),
        supabase
          .from('ingredient_prices')
          .select('id, old_price, new_price, change_percent, note, changed_at, ingredient:ingredients(name, purchase_unit, recipe_ingredients(recipe:recipes(name))), supplier:suppliers(name)')
          .not('new_price', 'is', null)
          .order('changed_at', { ascending: false })
          .limit(5),
      ]);
      recipeCount = r.count ?? 0;
      ingredientCount = i.count ?? 0;
      supplierCount = s.count ?? 0;
      priceChanges = p.data ?? [];
    } catch (e: any) {
      configError = e?.message ?? 'Could not connect to Supabase.';
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-sub">A quick read on your kitchen</div>
        </div>
      </div>

      {configError && (
        <div className="setup-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4a45a" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{configError}</span>
        </div>
      )}

      <div className="stats">
        <Stat label="Recipes" value={recipeCount} tone="default" />
        <Stat label="Ingredients" value={ingredientCount} tone="amber" />
        <Stat label="Suppliers" value={supplierCount} tone="sage" />
        <Stat label="Below margin" value={0} tone="rose" hint="Compute me" />
      </div>

      {priceChanges.length > 0 && (
        <>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: '28px 0 12px' }}>Recent Price Changes</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Supplier</th>
                  <th>Price</th>
                  <th>Movement</th>
                  <th>Note</th>
                  <th>When</th>
                  <th>Affects</th>
                </tr>
              </thead>
              <tbody>
                {priceChanges.map((row) => (
                  <tr key={row.id}>
                    <td>{row.ingredient?.name ?? '—'}</td>
                    <td>{row.supplier?.name ?? '—'}</td>
                    <td className="num">€{Number(row.old_price).toFixed(2)} → €{Number(row.new_price).toFixed(2)} / {row.ingredient?.purchase_unit}</td>
                    <td><PriceDirection pct={row.change_percent} /></td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{row.note ?? '—'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 13 }}>{formatChangedAt(row.changed_at)}</td>
                    <td style={{ fontSize: 13 }}>
                      {(() => {
                        const recipes: string[] = (row.ingredient?.recipe_ingredients ?? [])
                          .map((ri: any) => ri.recipe?.name)
                          .filter(Boolean);
                        return recipes.length > 0
                          ? recipes.join(', ')
                          : <span style={{ color: 'var(--muted)' }}>No recipes yet</span>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="empty">
        <div className="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div className="empty-title">Welcome to BitePrep</div>
        <div className="empty-text">
          Start by adding a supplier, then ingredients, then recipes. Each screen is in the sidebar.
        </div>
      </div>
    </>
  );
}

function formatChangedAt(iso: string | null) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

function PriceDirection({ pct }: { pct: number | null }) {
  if (pct === null || pct === 0) return <span style={{ color: 'var(--muted)' }}>No change</span>;
  if (pct > 0) return <span className="margin-bad">Up {Math.abs(pct).toFixed(1)}%</span>;
  return <span className="margin-good">Down {Math.abs(pct).toFixed(1)}%</span>;
}

function Stat({ label, value, tone, hint }: { label: string; value: number; tone: 'default' | 'rose' | 'amber' | 'sage'; hint?: string }) {
  return (
    <div className="stat">
      <div className="stat-head">
        <div className={`stat-icon ${tone === 'default' ? '' : tone}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        {label}
      </div>
      <div className={`stat-value ${tone === 'default' ? '' : tone}`}>{value}</div>
      {hint && <div className="page-sub" style={{ marginTop: 6, fontSize: 11 }}>{hint}</div>}
    </div>
  );
}
