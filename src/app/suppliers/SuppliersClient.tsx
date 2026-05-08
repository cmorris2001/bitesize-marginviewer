'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Supplier } from '@/lib/supabase/types';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';

const AVATAR_CLASSES = ['av-rose', 'av-amber', 'av-sage', 'av-teal', 'av-lilac'];
const avatarFor = (name: string) => AVATAR_CLASSES[name.charCodeAt(0) % AVATAR_CLASSES.length];

export default function SuppliersClient() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<(Supplier & { ingredient_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*, ingredients(id)')
      .order('name', { ascending: true });
    if (error) {
      showToast(error.message, 'error');
      setSuppliers([]);
    } else {
      const suppliersWithCounts = (data ?? []).map((s: any) => ({
        ...s,
        ingredient_count: s.ingredients?.length ?? 0,
      }));
      setSuppliers(suppliersWithCounts);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setName('');
    setModalOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setName(s.name);
    setModalOpen(true);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('Name is required', 'error');
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from('suppliers')
        .update({ name: trimmed })
        .eq('id', editing.id);
      if (error) {
        showToast(error.message, 'error');
        setSaving(false);
        return;
      }
      showToast('Supplier updated', 'success');
    } else {
      const { error } = await supabase
        .from('suppliers')
        .insert({ name: trimmed });
      if (error) {
        showToast(error.message, 'error');
        setSaving(false);
        return;
      }
      showToast(`Added "${trimmed}"`, 'success');
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function remove(s: Supplier) {
    if (!confirm(`Remove "${s.name}"?`)) return;
    const { error } = await supabase.from('suppliers').delete().eq('id', s.id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Supplier removed', 'success');
    load();
  }

  const filtered = suppliers.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <div className="page-sub">Who you buy from</div>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openNew}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New supplier
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : suppliers.length === 0 ? (
        <EmptyState
          title="No suppliers yet"
          text="Add the suppliers you buy from. You'll link ingredients to them later."
          action={<button className="btn btn-primary" onClick={openNew}>Add your first supplier</button>}
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
                placeholder="Search suppliers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="result-count">{filtered.length} of {suppliers.length}</div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>Supplier</th>
                  <th style={{ width: '12%' }} className="num">Ingredients</th>
                  <th style={{ width: '18%' }}>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="item-cell">
                        <div className={`item-avatar ${avatarFor(s.name)}`}>
                          {s.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="item-name">{s.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num">{s.ingredient_count}</td>
                    <td className="num">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost" onClick={() => openEdit(s)}>Edit</button>
                      <button className="btn btn-ghost" onClick={() => remove(s)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit supplier' : 'New supplier'}
        subtitle={editing ? 'Update the supplier name' : 'Add a new supplier you buy from'}
        footer={
          <>
            <button className="btn" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add supplier'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Supplier name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Musgrave"
            autoFocus
          />
        </div>
      </Modal>
    </>
  );
}
