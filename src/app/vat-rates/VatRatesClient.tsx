'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { VatRate } from '@/lib/supabase/types';
import Modal from '@/components/Modal';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';

const AVATAR_CLASSES = ['av-rose', 'av-amber', 'av-sage', 'av-teal', 'av-lilac'];
const avatarFor = (name: string) => AVATAR_CLASSES[name.charCodeAt(0) % AVATAR_CLASSES.length];

export default function VatRatesClient() {
  const supabase = createClient();
  const { showToast } = useToast();

  const [vatRates, setVatRates] = useState<VatRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VatRate | null>(null);
  const [name, setName] = useState('');
  const [rate, setRate] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('vat_rates')
      .select('*')
      .order('rate', { ascending: true });
    if (error) {
      showToast(error.message, 'error');
      setVatRates([]);
    } else {
      setVatRates(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditing(null);
    setName('');
    setRate('');
    setModalOpen(true);
  }

  function openEdit(v: VatRate) {
    setEditing(v);
    setName(v.name);
    setRate(v.rate.toString());
    setModalOpen(true);
  }

  async function save() {
    const trimmedName = name.trim();
    const rateNum = parseFloat(rate);

    if (!trimmedName) {
      showToast('Name is required', 'error');
      return;
    }
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 1) {
      showToast('Rate must be between 0 and 1 (e.g., 0.135 for 13.5%)', 'error');
      return;
    }

    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from('vat_rates')
        .update({ name: trimmedName, rate: rateNum })
        .eq('id', editing.id);
      if (error) {
        showToast(error.message, 'error');
        setSaving(false);
        return;
      }
      showToast('VAT rate updated', 'success');
    } else {
      const { error } = await supabase
        .from('vat_rates')
        .insert({ name: trimmedName, rate: rateNum });
      if (error) {
        showToast(error.message, 'error');
        setSaving(false);
        return;
      }
      showToast(`Added "${trimmedName}"`, 'success');
    }
    setSaving(false);
    setModalOpen(false);
    load();
  }

  async function remove(v: VatRate) {
    if (!confirm(`Remove "${v.name}"?`)) return;
    const { error } = await supabase.from('vat_rates').delete().eq('id', v.id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('VAT rate removed', 'success');
    load();
  }

  const filtered = vatRates.filter((v) =>
    !search || v.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">VAT Rates</h1>
          <div className="page-sub">Manage your VAT rates for recipes</div>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={openNew}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New VAT rate
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : vatRates.length === 0 ? (
        <EmptyState
          title="No VAT rates yet"
          text="Add VAT rates for your different product categories or markets."
          action={<button className="btn btn-primary" onClick={openNew}>Add your first VAT rate</button>}
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
                placeholder="Search VAT rates…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="result-count">{filtered.length} of {vatRates.length}</div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>Name</th>
                  <th style={{ width: '30%' }} className="num">Rate</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <div className="item-cell">
                        <div className={`item-avatar ${avatarFor(v.name)}`}>
                          {v.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="item-name">{v.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num">{(v.rate * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost" onClick={() => openEdit(v)}>Edit</button>
                      <button className="btn btn-ghost" onClick={() => remove(v)}>Delete</button>
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
        title={editing ? 'Edit VAT rate' : 'New VAT rate'}
        subtitle={editing ? 'Update the VAT rate' : 'Add a new VAT rate'}
        footer={
          <>
            <button className="btn" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add VAT rate'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard, Reduced, Zero"
            autoFocus
          />
        </div>

        <div className="field">
          <label>Rate</label>
          <input
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="0.135"
          />
          <div className="field-hint">
            Enter as decimal: 0–1 (e.g., 0.135 for 13.5%)
          </div>
        </div>

        {rate && !isNaN(parseFloat(rate)) && (
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '0.375rem' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>
              Preview
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {(parseFloat(rate) * 100).toFixed(1)}%
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
