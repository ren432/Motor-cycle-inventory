import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/index.js';
import Modal from '../components/Modal.jsx';
import Receipt from '../components/Receipt.jsx';
import { money, dateTime } from '../utils/format.js';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api
      .listSales()
      .then(setSales)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sales.filter((s) => {
      if (q && !s.receiptNo.toLowerCase().includes(q)) return false;
      if (date) {
        const d = new Date(s.createdAt);
        const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (local !== date) return false;
      }
      return true;
    });
  }, [sales, query, date]);

  const revenue = visible.reduce((s, x) => s + x.total, 0);

  return (
    <>
      <div className="page-head">
        <h1>Sales History</h1>
      </div>
      {error && <div className="alert error">{error}</div>}

      <div className="toolbar">
        <input
          type="search"
          placeholder="Search receipt no. (e.g. R-000012)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {date && (
          <button className="btn sm" onClick={() => setDate('')}>
            Clear date
          </button>
        )}
        <span className="muted push-right">
          {visible.length} sale(s) · {money(revenue)}
        </span>
      </div>

      <div className="card table-wrap">
        {loading ? (
          <p className="muted pad">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="muted pad">No sales found.</p>
        ) : (
          <table className="table clickable">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Date</th>
                <th>Items</th>
                <th>Payment</th>
                <th className="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id} onClick={() => setSelected(s)}>
                  <td className="mono">{s.receiptNo}</td>
                  <td>{dateTime(s.createdAt)}</td>
                  <td>{s.items.reduce((n, i) => n + i.qty, 0)}</td>
                  <td>{s.paymentMethod}</td>
                  <td className="right">{money(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <Modal title={`Receipt ${selected.receiptNo}`} onClose={() => setSelected(null)}>
          <Receipt sale={selected} />
        </Modal>
      )}
    </>
  );
}