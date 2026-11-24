// A tiny fake backend stored in localStorage so the UI works before the
// Node.js server exists. It follows the same contract as the real API.

const KEYS = { products: 'mpos_products', sales: 'mpos_sales' };

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const uid = () =>
  globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const SEED = [
  ['MP-0001', 'Spark Plug CR7HSA', 'NGK', 'Engine', 'Honda TMX 155, XRM 125', 95, 140, 40, 10, 'A1'],
  ['MP-0002', 'Drive Chain 428H-120L', 'DID', 'Drivetrain', 'Most 110-125cc underbones', 520, 780, 12, 5, 'B2'],
  ['MP-0003', 'Front Sprocket 14T', 'JT', 'Drivetrain', 'Yamaha Sniper 150', 120, 195, 8, 5, 'B2'],
  ['MP-0004', 'Brake Pad Front', 'Brembo', 'Brakes', 'Honda Click 125i', 210, 340, 3, 6, 'C1'],
  ['MP-0005', 'Brake Shoe Rear', 'TRW', 'Brakes', 'Suzuki Raider 150', 140, 230, 15, 6, 'C1'],
  ['MP-0006', 'Engine Oil 10W-40 1L', 'Motul', 'Oils & Fluids', 'Universal 4-stroke', 380, 520, 25, 10, 'D1'],
  ['MP-0007', 'Air Filter', 'Honda Genuine', 'Filters', 'Honda Click 125i', 180, 290, 0, 5, 'D2'],
  ['MP-0008', 'Battery 12V 5Ah', 'Motolite', 'Electrical', 'Most 110-150cc', 650, 890, 6, 4, 'E1'],
  ['MP-0009', 'Rear Shock Absorber', 'YSS', 'Suspension', 'Yamaha Mio i 125', 1450, 1950, 4, 2, 'F1'],
  ['MP-0010', 'Clutch Cable', 'Daytona', 'Cables', 'Honda TMX 155', 85, 140, 20, 8, 'G1'],
];

function ensureSeeded() {
  if (localStorage.getItem(KEYS.products) === null) {
    write(
      KEYS.products,
      SEED.map(([sku, name, brand, category, compatibleModels, costPrice, price, stock, reorderLevel, location]) => ({
        id: uid(), sku, name, brand, category, compatibleModels, costPrice, price, stock, reorderLevel, location,
      }))
    );
  }
}

const sleep = (ms = 120) => new Promise((r) => setTimeout(r, ms));

function assertUniqueSku(products, sku, ignoreId) {
  const clash = products.some(
    (p) => p.sku.toLowerCase() === sku.toLowerCase() && p.id !== ignoreId
  );
  if (clash) throw new Error(`SKU "${sku}" already exists.`);
}

export const mockApi = {
  async listProducts() {
    await sleep();
    ensureSeeded();
    return read(KEYS.products, []);
  },

  async createProduct(data) {
    await sleep();
    ensureSeeded();
    const products = read(KEYS.products, []);
    assertUniqueSku(products, data.sku);
    const product = { ...data, id: uid() };
    write(KEYS.products, [...products, product]);
    return product;
  },

  async updateProduct(id, data) {
    await sleep();
    const products = read(KEYS.products, []);
    if (!products.some((p) => p.id === id)) throw new Error('Product not found.');
    assertUniqueSku(products, data.sku, id);
    const updated = { ...data, id };
    write(KEYS.products, products.map((p) => (p.id === id ? updated : p)));
    return updated;
  },

  async deleteProduct(id) {
    await sleep();
    write(KEYS.products, read(KEYS.products, []).filter((p) => p.id !== id));
    return null;
  },

  async listSales() {
    await sleep();
    return read(KEYS.sales, []);
  },

  // Body: { items: [{ productId, qty }], discount, paymentMethod, amountPaid }
  // Prices are always taken from the product record, never from the client.
  async createSale({ items, discount = 0, paymentMethod, amountPaid }) {
    await sleep();
    const products = read(KEYS.products, []);
    const sales = read(KEYS.sales, []);

    if (!items?.length) throw new Error('Cart is empty.');

    const lines = items.map(({ productId, qty }) => {
      const p = products.find((x) => x.id === productId);
      if (!p) throw new Error('A product in the cart no longer exists.');
      if (!Number.isInteger(qty) || qty <= 0) throw new Error(`Invalid quantity for ${p.name}.`);
      if (p.stock < qty) throw new Error(`Not enough stock for ${p.name} (only ${p.stock} left).`);
      return { productId: p.id, sku: p.sku, name: p.name, price: p.price, costPrice: p.costPrice, qty };
    });

    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
    const total = subtotal - disc;
    const paid = Number(amountPaid) || 0;
    if (paid < total) throw new Error('Amount paid is less than the total.');

    const sale = {
      id: uid(),
      receiptNo: `R-${String(sales.length + 1).padStart(6, '0')}`,
      items: lines,
      subtotal,
      discount: disc,
      total,
      paymentMethod,
      amountPaid: paid,
      change: paid - total,
      createdAt: new Date().toISOString(),
    };

    write(
      KEYS.products,
      products.map((p) => {
        const line = lines.find((l) => l.productId === p.id);
        return line ? { ...p, stock: p.stock - line.qty } : p;
      })
    );
    write(KEYS.sales, [sale, ...sales]); // newest first
    return sale;
  },
};