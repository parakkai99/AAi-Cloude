'use strict';
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const app = express();
app.use(express.json({ limit: '100kb' }));

const sdk = (req) => catalyst.initialize(req);
const zq = (req, q) => sdk(req).zcql().executeZCQLQuery(q);
const num = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
const fail = (res, e, code = 500) => { console.error(e); res.status(code).json({ error: { code: code === 500 ? 'SERVER_ERROR' : 'REQUEST_FAILED', message: code === 500 ? 'Something went wrong. Try again.' : String(e.message || e) } }); };

async function user(req) {
  try { const u = await sdk(req).userManagement().getCurrentUser(); return u && { id: u.user_id, name: u.first_name, role: (u.role_details && u.role_details.role_name) || 'Customer' }; }
  catch (e) { return null; }
}
const need = (roles) => async (req, res, next) => {
  const u = await user(req);
  if (!u) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Sign in to continue.' } });
  if (roles && !roles.includes(u.role)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have access.' } });
  req.u = u; next();
};

app.get('/health', (q, r) => r.json({ ok: true, service: 'aai-hyper-api' }));

app.get('/stores', async (req, res) => {
  try { const rows = await zq(req, "SELECT ROWID, name_en, name_ta, delivery_fee, min_order, eta FROM stores WHERE status = 'ACTIVE'");
    res.json({ items: rows.map((r) => r.stores) }); } catch (e) { fail(res, e); }
});

app.get('/stores/:id/products', async (req, res) => {
  const id = num(req.params.id); if (!id) return fail(res, 'Invalid store id', 400);
  try { const rows = await zq(req, `SELECT ROWID, name_en, name_ta, unit, price FROM products WHERE store_id = ${id} AND status = 'ACTIVE'`);
    res.json({ items: rows.map((r) => r.products) }); } catch (e) { fail(res, e); }
});

// Customer places an order. Prices come from the database, never from the client.
app.post('/orders', need(), async (req, res) => {
  const { storeId, items, address, slot, payment } = req.body || {};
  const sid = num(storeId);
  if (!sid || !Array.isArray(items) || !items.length || items.length > 60) return fail(res, 'Store and items are required.', 400);
  if (typeof address !== 'string' || address.trim().length < 5 || address.length > 300) return fail(res, 'Enter a delivery address.', 400);
  if (!['cod', 'upi'].includes(payment)) return fail(res, 'Choose a payment method.', 400);
  try {
    const ids = items.map((i) => num(i.productId)); if (ids.includes(null)) return fail(res, 'Invalid product.', 400);
    const prods = await zq(req, `SELECT ROWID, name_en, price FROM products WHERE store_id = ${sid} AND ROWID IN (${ids.join(',')}) AND status = 'ACTIVE'`);
    const map = new Map(prods.map((r) => [String(r.products.ROWID), r.products]));
    let subtotal = 0; const lines = [];
    for (const i of items) { const p = map.get(String(i.productId)); const q = num(i.qty);
      if (!p || !q || q > 50) return fail(res, 'An item is unavailable or has a bad quantity.', 400);
      subtotal += Number(p.price) * q; lines.push({ product_id: p.ROWID, name: p.name_en, qty: q, price: Number(p.price) }); }
    const st = await zq(req, `SELECT delivery_fee, min_order FROM stores WHERE ROWID = ${sid} AND status = 'ACTIVE'`);
    if (!st.length) return fail(res, 'Store not found.', 404);
    const fee = Number(st[0].stores.delivery_fee);
    if (subtotal < Number(st[0].stores.min_order)) return fail(res, `Minimum order is Rs ${st[0].stores.min_order}.`, 400);
    const table = sdk(req).datastore().table('orders');
    const row = await table.insertRow({ customer_id: String(req.u.id), store_id: String(sid), address: address.trim(), slot: String(slot || ''), payment, subtotal, delivery_fee: fee, total: subtotal + fee, status: 'PLACED' });
    await sdk(req).datastore().table('order_items').insertRows(lines.map((l) => ({ order_id: String(row.ROWID), ...l })));
    res.status(201).json({ orderId: row.ROWID, total: subtotal + fee, status: 'PLACED' });
  } catch (e) { fail(res, e); }
});

app.get('/orders/mine', need(), async (req, res) => {
  try { const rows = await zq(req, `SELECT ROWID, store_id, total, status, slot, CREATEDTIME FROM orders WHERE customer_id = '${String(req.u.id).replace(/\D/g, '')}' ORDER BY CREATEDTIME DESC LIMIT 50`);
    res.json({ items: rows.map((r) => r.orders) }); } catch (e) { fail(res, e); }
});

// Vendor: orders for the store the vendor owns.
const FLOW = ['PLACED', 'ACCEPTED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
async function vendorStore(req) { const r = await zq(req, `SELECT ROWID FROM stores WHERE owner_user_id = '${String(req.u.id).replace(/\D/g, '')}'`); return r.length ? r[0].stores.ROWID : null; }
app.get('/vendor/orders', need(['Vendor', 'Admin']), async (req, res) => {
  try { const sid = await vendorStore(req); if (!sid) return res.json({ items: [] });
    const rows = await zq(req, `SELECT ROWID, total, status, slot, address, CREATEDTIME FROM orders WHERE store_id = '${sid}' ORDER BY CREATEDTIME DESC LIMIT 100`);
    res.json({ items: rows.map((r) => r.orders) }); } catch (e) { fail(res, e); }
});
app.patch('/vendor/orders/:id/status', need(['Vendor', 'Admin']), async (req, res) => {
  const id = num(req.params.id); const next = (req.body || {}).status;
  if (!id || !FLOW.concat('REJECTED').includes(next)) return fail(res, 'Invalid status.', 400);
  try { const sid = await vendorStore(req); const o = await zq(req, `SELECT ROWID, status, store_id FROM orders WHERE ROWID = ${id}`);
    if (!o.length || (req.u.role !== 'Admin' && String(o[0].orders.store_id) !== String(sid))) return fail(res, 'Order not found.', 404);
    const cur = FLOW.indexOf(o[0].orders.status);
    if (next !== 'REJECTED' && FLOW.indexOf(next) !== cur + 1) return fail(res, 'That status change is not allowed.', 409);
    await sdk(req).datastore().table('orders').updateRow({ ROWID: id, status: next });
    res.json({ orderId: id, status: next }); } catch (e) { fail(res, e); }
});

// Admin: company and branch (store) administration.
app.get('/admin/summary', need(['Admin']), async (req, res) => {
  try { const [s, o] = await Promise.all([zq(req, 'SELECT COUNT(ROWID) FROM stores'), zq(req, 'SELECT COUNT(ROWID) FROM orders')]);
    res.json({ stores: Object.values(s[0].stores)[0], orders: Object.values(o[0].orders)[0] }); } catch (e) { fail(res, e); }
});
app.post('/admin/stores', need(['Admin']), async (req, res) => {
  const b = req.body || {};
  if (!b.name_en || String(b.name_en).length > 80) return fail(res, 'Store name is required.', 400);
  try { const row = await sdk(req).datastore().table('stores').insertRow({ name_en: String(b.name_en), name_ta: String(b.name_ta || ''), company_id: String(b.company_id || ''), owner_user_id: String(b.owner_user_id || ''), delivery_fee: Number(b.delivery_fee) || 0, min_order: Number(b.min_order) || 0, eta: String(b.eta || ''), status: 'ACTIVE' });
    res.status(201).json({ storeId: row.ROWID }); } catch (e) { fail(res, e); }
});

module.exports = app;
