import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/index.js';
import Modal from '../components/Modal.jsx';
import ProductForm from '../components/ProductForm.jsx';
import { money, toCSV, downloadText } from '../utils/format.js';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | product object

  const load = useCallback(async () => {
    try {
      setProducts(await api.listProducts());
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort(),
    [products]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => category === 'all' || p.category === category)
      .filter((p) => !lowOnly || p.stock <= p.reorderLevel)
      .filter(
        (p) =>
          !q ||
          [p.sku, p.name, p.brand, p.compatibleModels, p.location]
            .join(' ')
            .toLowerCase()
            .includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, query, category, lowOnly]);

  async function handleSave(values) {
    if (editing && editing !== 'new') await api.updateProduct(editing.id, values);
    else await api.createProduct(values);
    setEditing(null);
    await load();
  }

  async function handleDelete(p) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteProduct(p.id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function exportCSV() {
    const csv = toCSV(visible, [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Name' },
      { key: 'brand', label: 'Brand' },
      { key: 'category', label: 'Category' },
      { key: 'compatibleModels', label: 'Compatible Models' },
      { key: 'costPrice', label: 'Cost Price' },
      { key: 'price', label: 'Selling Price' },
      { key: 'stock', label: 'Stock' },
      { key: 'reorderLevel', label: 'Reorder Level' },
      { key: 'location', label: 'Location' },
    ]);
    downloadText(`inventory-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <>
      <div className="page-head">
        <h1>Inventory</h1>
        <div className="actions">
          <button className="btn" onClick={exportCSV} disabled={!visible.length}>
            Export CSV
          </button>
          <button className="btn primary" onClick={() => setEditing('new')}>
            + Add part
          </button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search SKU, name, brand, model, location…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
      </div>

      <div className="card table-wrap">
        {loading ? (
          <p className="muted pad">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="muted pad">No parts match. Try changing the filters or add a new part.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Part</th>
                <th>Category</th>
                <th>Loc.</th>
                <th className="right">Cost</th>
                <th className="right">Price</th>
                <th className="right">Stock</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const out = p.stock === 0;
                const low = !out && p.stock <= p.reorderLevel;
                return (
                  <tr key={p.id}>
                    <td className="mono">{p.sku}</td>
                    <td>
                      {p.name}
                      <br />
                      <small className="muted">
                        {[p.brand, p.compatibleModels].filter(Boolean).join(' · ')}
                      </small>
                    </td>
                    <td>{p.category}</td>
                    <td>{p.location || '—'}</td>
                    <td className="right">{money(p.costPrice)}</td>
                    <td className="right">{money(p.price)}</td>
                    <td className="right">
                      <span className={out ? 'badge danger' : low ? 'badge warn' : 'badge ok'}>
                        {out ? 'Out' : p.stock}
                      </span>
                    </td>
                    <td className="right nowrap">
                      <button className="btn sm" onClick={() => setEditing(p)}>Edit</button>{' '}
                      <button className="btn sm danger" onClick={() => handleDelete(p)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal
          title={editing === 'new' ? 'Add part' : 'Edit part'}
          onClose={() => setEditing(null)}
          wide
        >
          <ProductForm
            initial={editing === 'new' ? null : editing}
            categories={categories}
            onSubmit={handleSave}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </>
  );
}