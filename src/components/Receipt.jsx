import { money, dateTime } from '../utils/format.js';

export default function Receipt({ sale }) {
  const methodLabel = { cash: 'Cash', gcash: 'GCash', card: 'Card' }[sale.paymentMethod] || sale.paymentMethod;

  return (
    <div>
      <div className="receipt receipt-print">
        <h3>MotoParts Shop</h3>
        <p className="muted center">Official Receipt</p>
        <div className="receipt-meta">
          <span>{sale.receiptNo}</span>
          <span>{dateTime(sale.createdAt)}</span>
        </div>
        <hr />
        <table>
          <tbody>
            {sale.items.map((i) => (
              <tr key={i.productId}>
                <td>
                  {i.name}
                  <br />
                  <small className="muted">
                    {i.qty} × {money(i.price)}
                  </small>
                </td>
                <td className="right">{money(i.qty * i.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr />
        <div className="row"><span>Subtotal</span><span>{money(sale.subtotal)}</span></div>
        {sale.discount > 0 && (
          <div className="row"><span>Discount</span><span>-{money(sale.discount)}</span></div>
        )}
        <div className="row total"><span>TOTAL</span><span>{money(sale.total)}</span></div>
        <div className="row"><span>{methodLabel}</span><span>{money(sale.amountPaid)}</span></div>
        <div className="row"><span>Change</span><span>{money(sale.change)}</span></div>
        <p className="muted center">Thank you! Keep this receipt for returns.</p>
      </div>
      <div className="form-actions no-print">
        <button className="btn primary" onClick={() => window.print()}>
          Print receipt
        </button>
      </div>
    </div>
  );
}