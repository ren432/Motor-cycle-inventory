import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/index.js';
import Modal from '../components/Modal.jsx';
import Receipt from '../components/Receipt.jsx';
import { money } from '../utils/format.js';

export default function POS() {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState([]); // [{ productId, qty }]
  const [discount, setDiscount] = useState('');
  const [method, setMethod] = useState('cash');
  const [paid, setPaid] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const load = useCallback(async () => {
    try {
      setProducts(await api.listProducts());
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const lines = useMemo(
    () =>
      cart
        .map((c) => ({ ...c, product: byId.get(c.productId) }))
        .filter((l) => l.product),
    [cart, byId]
  );

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const total = subtotal - disc;
  const amountPaid = method === 'cash' ? Number(paid) || 0 : total;
  const change = amountPaid - total;
  const canPay = lines.length > 0 && amountPaid >= total && !busy;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? products.filter((p) =>
          [p.sku, p.name, p.brand, p.compatibleModels].join(' ').toLowerCase().includes(q)
        )
      : products;
    return list.slice().sort((a, b) => a.name.localeCompare(b.name)).slice(0, 60);
  }, [products, query]);

  function addToCart(p) {
    const existing = cart.find((c) => c.productId === p.id);
    const next = (existing?.qty || 0) + 1;
    if (next > p.stock) {
      setError(`Only ${p.stock} in stock for ${p.name}.`);
      return;
    }
    setError('');
    setCart(
      existing
        ? cart.map((c) => (c.productId === p.id ? { ...c, qty: next } : c))
        : [...cart, { productId: p.id, qty: 1 }]
    );
  }

  function setQty(productId, qty) {
    const p = byId.get(productId);
    if (qty <= 0) {
      setCart(cart.filter((c) => c.productId !== productId));
      return;
    }
    if (p && qty > p.stock) {
      setError(`Only ${p.stock} in stock for ${p.name}.`);
      qty = p.stock;
    } else {
      setError('');
    }
    setCart(cart.map((c) => (c.productId === productId ? { ...c, qty } : c)));
  }

  // Barcode scanners type the code and press Enter, so Enter adds the matching part.
  function onSearchKeyDown(e) {
    if (e.key !== 'Enter') return;
    const q = query.trim().toLowerCase();
    if (!q) return;
    const exact = products.find((p) => p.sku.toLowerCase() === q);
    const target = exact || (results.length === 1 ? results[0] : null);
    if (target) {
      if (target.stock > 0) addToCart(target);
      else setError(`${target.name} is out of stock.`);
      setQuery('');
    }
  }

  function clearSale() {
    setCart([]);
    setDiscount('');
    setPaid('');
    setError('');
  }

  async function checkout() {
    setBusy(true);
    setError('');
    try {
      const sale = await api.createSale({
        items: lines.map((l) => ({ productId: l.productId, qty: l.qty })),
        discount: disc,
        paymentMethod: method,
        amountPaid,
      });
      setReceipt(sale);
      clearSale();
      await load(); // refresh stock counts
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Point of Sale</h1>
      </div>
      {error && <div className="alert error">{error}</div>}

      <div className="pos">
        <section className="pos-products">
          <input
            type="search"
            className="big-input"
            placeholder="Search or scan SKU / name / motorcycle model…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            autoFocus
          />
          <div className="product-grid">
            {results.map((p) => {
              const out = p.stock <= 0;
              return (
                <button
                  key={p.id}
                  className="product-card"
                  disabled={out}
                  onClick={() => addToCart(p)}
                >
                  <span className="pc-name">{p.name}</span>
                  <span className="pc-sub">{p.sku} · {p.brand || p.category}</span>
                  <span className="pc-row">
                    <strong>{money(p.price)}</strong>
                    <span className={out ? 'badge danger' : p.stock <= p.reorderLevel ? 'badge warn' : 'badge ok'}>
                      {out ? 'Out' : `${p.stock} left`}
                    </span>
                  </span>
                </button>
              );
            })}
            {results.length === 0 && <p className="muted">No parts found.</p>}
          </div>
        </section>

        <aside className="card cart">
          <h2>Current sale</h2>

          {lines.length === 0 ? (
            <p className="muted">Tap a part to add it to the sale.</p>
          ) : (
            <ul className="cart-lines">
              {lines.map((l) => (
                <li key={l.productId}>
                  <div className="cl-main">
                    <span>{l.product.name}</span>
                    <small className="muted">{money(l.product.price)} each</small>
                  </div>
                  <div className="qty">
                    <button className="btn sm" onClick={() => setQty(l.productId, l.qty - 1)}>−</button>
                    <input
                      type="number"
                      min="1"
                      value={l.qty}
                      onChange={(e) => setQty(l.productId, parseInt(e.target.value, 10) || 0)}
                    />
                    <button className="btn sm" onClick={() => setQty(l.productId, l.qty + 1)}>+</button>
                  </div>
                  <strong className="cl-total">{money(l.product.price * l.qty)}</strong>
                </li>
              ))}
            </ul>
          )}

          <div className="totals">
            <div className="row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <label className="row">
              <span>Discount (₱)</span>
              <input
                type="number"
                min="0"
                className="small-input"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </label>
            <div className="row grand"><span>Total</span><span>{money(total)}</span></div>
          </div>

          <div className="pay">
            <div className="seg">
              {['cash', 'gcash', 'card'].map((m) => (
                <button
                  key={m}
                  className={method === m ? 'seg-btn active' : 'seg-btn'}
                  onClick={() => setMethod(m)}
                >
                  {m === 'gcash' ? 'GCash' : m[0].toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            {method === 'cash' && (
              <>
                <label className="row">
                  <span>Cash received</span>
                  <input
                    type="number"
                    min="0"
                    className="small-input"
                    value={paid}
                    onChange={(e) => setPaid(e.target.value)}
                  />
                </label>
                <div className="quick">
                  <button className="btn sm" onClick={() => setPaid(String(total))} disabled={!total}>
                    Exact
                  </button>
                  {[100, 500, 1000].map((n) => (
                    <button key={n} className="btn sm" onClick={() => setPaid(String(n))}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="row">
                  <span>Change</span>
                  <strong className={change < 0 ? 'danger-text' : ''}>{money(Math.max(change, 0))}</strong>
                </div>
              </>
            )}
          </div>

          <div className="cart-actions">
            <button className="btn" onClick={clearSale} disabled={!cart.length || busy}>
              Clear
            </button>
            <button className="btn primary lg" onClick={checkout} disabled={!canPay}>
              {busy ? 'Processing…' : `Charge ${money(total)}`}
            </button>
          </div>
        </aside>
      </div>

      {receipt && (
        <Modal title="Sale complete" onClose={() => setReceipt(null)}>
          <Receipt sale={receipt} />
        </Modal>
      )}
    </>
  );
}