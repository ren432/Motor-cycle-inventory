import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/index.js';
import { money, dateTime, isToday } from '../utils/format.js';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.listProducts(), api.listSales()])
      .then(([p, s]) => {
        setProducts(p);
        setSales(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const todaySales = sales.filter((s) => isToday(s.createdAt));
    return {
      parts: products.length,
      units: products.reduce((s, p) => s + p.stock, 0),
      value: products.reduce((s, p) => s + p.stock * p.costPrice, 0),
      low: products.filter((p) => p.stock <= p.reorderLevel),
      todayTotal: todaySales.reduce((s, x) => s + x.total, 0),
      todayCount: todaySales.length,
    };
  }, [products, sales]);

  if (loading) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
        <Link to="/pos" className="btn primary">
          New sale
        </Link>
      </div>
      {error && <div className="alert error">{error}</div>}

      <div className="stats">
        <div className="card stat">
          <span>Today's sales</span>
          <strong>{money(stats.todayTotal)}</strong>
          <small>{stats.todayCount} transaction(s)</small>
        </div>
        <div className="card stat">
          <span>Part types</span>
          <strong>{stats.parts}</strong>
          <small>{stats.units} units on hand</small>
        </div>
        <div className="card stat">
          <span>Inventory value (cost)</span>
          <strong>{money(stats.value)}</strong>
          <small>stock × cost price</small>
        </div>
        <div className="card stat">
          <span>Needs restock</span>
          <strong className={stats.low.length ? 'danger-text' : ''}>{stats.low.length}</strong>
          <small>at or below reorder level</small>
        </div>
      </div>

      <div className="two-col">
        <section className="card">
          <h2>Low stock</h2>
          {stats.low.length === 0 ? (
            <p className="muted">Everything is above its reorder level.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Part</th><th>Location</th><th className="right">Stock</th></tr>
              </thead>
              <tbody>
                {stats.low.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}<br /><small className="muted">{p.sku}</small></td>
                    <td>{p.location || '—'}</td>
                    <td className="right">
                      <span className={p.stock === 0 ? 'badge danger' : 'badge warn'}>
                        {p.stock === 0 ? 'Out' : p.stock} / {p.reorderLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h2>Recent sales</h2>
          {sales.length === 0 ? (
            <p className="muted">No sales yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Receipt</th><th>When</th><th className="right">Total</th></tr>
              </thead>
              <tbody>
                {sales.slice(0, 8).map((s) => (
                  <tr key={s.id}>
                    <td>{s.receiptNo}</td>
                    <td>{dateTime(s.createdAt)}</td>
                    <td className="right">{money(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}