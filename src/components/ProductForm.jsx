import { useState } from 'react';

const EMPTY = {
  sku: '',
  name: '',
  brand: '',
  category: '',
  compatibleModels: '',
  costPrice: '',
  price: '',
  stock: '0',
  reorderLevel: '5',
  location: '',
};

function initialValues(p) {
  if (!p) return EMPTY;
  return {
    sku: p.sku ?? '',
    name: p.name ?? '',
    brand: p.brand ?? '',
    category: p.category ?? '',
    compatibleModels: p.compatibleModels ?? '',
    costPrice: String(p.costPrice ?? ''),
    price: String(p.price ?? ''),
    stock: String(p.stock ?? 0),
    reorderLevel: String(p.reorderLevel ?? 5),
    location: p.location ?? '',
  };
}

export default function ProductForm({ initial, categories = [], onSubmit, onCancel }) {
  const [values, setValues] = useState(() => initialValues(initial));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!values.sku.trim() || !values.name.trim()) {
      return setError('SKU and name are required.');
    }
    const numericKeys = ['costPrice', 'price', 'stock', 'reorderLevel'];
    const bad = numericKeys.some(
      (k) => values[k] === '' || Number.isNaN(Number(values[k])) || Number(values[k]) < 0
    );
    if (bad) return setError('Prices and quantities must be numbers, zero or more.');
    if (!Number.isInteger(Number(values.stock)) || !Number.isInteger(Number(values.reorderLevel))) {
      return setError('Stock and reorder level must be whole numbers.');
    }

    setSaving(true);
    try {
      await onSubmit({
        sku: values.sku.trim(),
        name: values.name.trim(),
        brand: values.brand.trim(),
        category: values.category.trim() || 'Uncategorized',
        compatibleModels: values.compatibleModels.trim(),
        costPrice: Number(values.costPrice),
        price: Number(values.price),
        stock: Number(values.stock),
        reorderLevel: Number(values.reorderLevel),
        location: values.location.trim(),
      });
      // parent closes the modal on success
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      {error && <div className="alert error full">{error}</div>}

      <label>
        SKU / Part No.*
        <input value={values.sku} onChange={set('sku')} autoFocus />
      </label>
      <label>
        Part name*
        <input value={values.name} onChange={set('name')} />
      </label>
      <label>
        Brand
        <input value={values.brand} onChange={set('brand')} />
      </label>
      <label>
        Category
        <input value={values.category} onChange={set('category')} list="category-options" />
        <datalist id="category-options">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <label className="full">
        Compatible motorcycle models
        <input
          value={values.compatibleModels}
          onChange={set('compatibleModels')}
          placeholder="e.g. Honda Click 125i, Yamaha Mio i 125"
        />
      </label>
      <label>
        Cost price (₱)
        <input type="number" min="0" step="0.01" value={values.costPrice} onChange={set('costPrice')} />
      </label>
      <label>
        Selling price (₱)
        <input type="number" min="0" step="0.01" value={values.price} onChange={set('price')} />
      </label>
      <label>
        Stock on hand
        <input type="number" min="0" step="1" value={values.stock} onChange={set('stock')} />
      </label>
      <label>
        Reorder level
        <input type="number" min="0" step="1" value={values.reorderLevel} onChange={set('reorderLevel')} />
      </label>
      <label className="full">
        Shelf / bin location
        <input value={values.location} onChange={set('location')} placeholder="e.g. B2" />
      </label>

      <div className="form-actions full">
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save part'}
        </button>
      </div>
    </form>
  );
}