'use strict';
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');
const app = express();
app.set('trust proxy', true);
app.use(express.json({ limit: '100kb' }));
// Best-effort throttle for public endpoints (instances are ephemeral; real OTP is still recommended).
const hits = new Map();
const limited = (key, max, ms) => { const now = Date.now(); const a = (hits.get(key) || []).filter((t) => now - t < ms); a.push(now); hits.set(key, a); if (hits.size > 5000) hits.clear(); return a.length > max; };
const tooMany = (res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a few minutes.' } });

const sdk = (req) => catalyst.initialize(req);
const zq = (req, q) => sdk(req).zcql().executeZCQLQuery(q);
const idStr = (v) => (/^\d{1,20}$/.test(String(v)) ? String(v) : null);   // Catalyst ROWIDs exceed JS safe integers: keep as strings
const qtyOf = (v) => { const n = Number(v); return n > 0 && n <= 50 && Math.round(n * 2) === n * 2 ? n : null; };
const phoneOf = (v) => { const d = String(v || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''); return /^[6-9]\d{9}$/.test(d) ? d : null; };
const clean = (v, max) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const fail = (res, e, code = 500) => { if (code === 500) console.error(e); res.status(code).json({ error: { code: code === 500 ? 'SERVER_ERROR' : 'BAD_REQUEST', message: code === 500 ? 'Something went wrong. Please try again.' : String(e) } }); };

async function me(req) {
  try { const u = await sdk(req).userManagement().getCurrentUser();
    if (!u) return null;
    const rn = (u.role_details && u.role_details.role_name) || '';
    return { id: String(u.user_id), name: u.first_name || '', role: rn === 'App Administrator' || rn === 'Admin' ? 'Admin' : rn === 'Vendor' ? 'Vendor' : 'Customer' }; }
  catch (e) { return null; }
}
async function ownsStore(req, id) { const r = await zq(req, `SELECT ROWID FROM stores WHERE owner_user_id = '${String(id).replace(/\D/g, '')}'`); return r.length > 0; }
const need = (roles) => async (req, res, next) => {
  const u = await me(req);
  if (!u) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });
  if (u.role === 'Customer') { try { if (await ownsStore(req, u.id)) u.role = 'Vendor'; } catch (e) { /* stay Customer */ } }
  if (roles && !roles.includes(u.role)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have access.' } });
  req.u = u; next();
};

// Price a basket from the database (never trust client prices).
async function priceBasket(req, storeId, items) {
  if (!Array.isArray(items) || !items.length || items.length > 60) throw 'Add at least one item.';
  const ids = items.map((i) => idStr(i.productId));
  if (ids.includes(null)) throw 'Invalid product.';
  const rows = await zq(req, `SELECT ROWID, name_en, price FROM products WHERE store_id = '${storeId}' AND ROWID IN (${ids.join(',')}) AND status = 'ACTIVE'`);
  const map = new Map(rows.map((r) => [String(r.products.ROWID), r.products]));
  let subtotal = 0; const lines = [];
  for (const i of items) {
    const p = map.get(String(i.productId)); const q = qtyOf(i.qty);
    if (!p || !q) throw 'An item is unavailable or has a bad quantity.';
    subtotal += Number(p.price) * q; lines.push({ product_id: String(p.ROWID), name: p.name_en, qty: q, price: Number(p.price) });
  }
  return { subtotal, lines };
}
async function storeInfo(req, sid) {
  const st = await zq(req, `SELECT ROWID, delivery_fee, min_order, whatsapp FROM stores WHERE ROWID = ${sid} AND status = 'ACTIVE'`);
  return st.length ? st[0].stores : null;
}

app.get('/health', (q, r) => r.json({ ok: true, service: 'aai-hyper-api' }));
app.get('/me', need(), (req, res) => res.json(req.u));

app.get('/stores', async (req, res) => {
  try { const rows = await zq(req, "SELECT ROWID, name_en, name_ta, delivery_fee, min_order, eta, whatsapp FROM stores WHERE status = 'ACTIVE'");
    res.json({ items: rows.map((r) => r.stores) }); } catch (e) { fail(res, e); }
});
app.get('/stores/:id/products', async (req, res) => {
  const id = idStr(req.params.id); if (!id) return fail(res, 'Invalid store.', 400);
  try { const rows = await zq(req, `SELECT ROWID, name_en, name_ta, unit, price FROM products WHERE store_id = '${id}' AND status = 'ACTIVE'`);
    res.json({ items: rows.map((r) => r.products) }); } catch (e) { fail(res, e); }
});

// Public checkout: guest orders with name + Indian mobile. (Add OTP before real launch: see README.)
app.post('/orders', async (req, res) => {
  const b = req.body || {}; const sid = idStr(b.storeId); const phone = phoneOf(b.phone);
  const name = clean(b.name, 80), address = clean(b.address, 255);
  if (!sid) return fail(res, 'Choose a store.', 400);
  if (name.length < 2) return fail(res, 'Enter your name.', 400);
  if (!phone) return fail(res, 'Enter a valid 10-digit mobile number.', 400);
  if (address.length < 5) return fail(res, 'Enter your delivery address.', 400);
  if (limited('o:' + phone, 5, 600000) || limited('ip:' + req.ip, 60, 600000)) return tooMany(res);
  if (!['cod', 'upi'].includes(b.payment)) return fail(res, 'Choose a payment method.', 400);
  try {
    const st = await storeInfo(req, sid); if (!st) return fail(res, 'Store not found.', 404);
    const { subtotal, lines } = await priceBasket(req, sid, b.items);
    if (subtotal < Number(st.min_order)) return fail(res, `Minimum order for this store is Rs ${st.min_order}.`, 400);
    const fee = Number(st.delivery_fee);
    const ds = sdk(req).datastore();
    const row = await ds.table('orders').insertRow({ customer_id: phone, customer_name: name, customer_phone: phone, store_id: sid, address, slot: clean(b.slot, 60), payment: b.payment, subtotal, delivery_fee: fee, total: subtotal + fee, status: 'PLACED' });
    await ds.table('order_items').insertRows(lines.map((l) => ({ order_id: String(row.ROWID), ...l })));
    res.status(201).json({ orderId: String(row.ROWID), total: subtotal + fee, status: 'PLACED' });
  } catch (e) { typeof e === 'string' ? fail(res, e, 400) : fail(res, e); }
});
app.get('/orders/:id', async (req, res) => {           // customer tracking: needs order id + phone
  const id = idStr(req.params.id), phone = phoneOf(req.query.phone);
  if (!id || !phone) return fail(res, 'Order id and phone are required.', 400);
  try { const r = await zq(req, `SELECT status, total FROM orders WHERE ROWID = ${id} AND customer_phone = '${phone}'`);
    if (!r.length) return fail(res, 'Order not found.', 404); res.json(r[0].orders); } catch (e) { fail(res, e); }
});

// Get Quote: lead capture (store + estimate), customer is then contacted on WhatsApp.
app.post('/quotes', async (req, res) => {
  const b = req.body || {}; const phone = phoneOf(b.phone); const name = clean(b.name, 80);
  const text = clean(b.text, 255), address = clean(b.address, 255);
  if (name.length < 2 || !phone) return fail(res, 'Enter your name and a valid mobile number.', 400);
  if (!text && !(Array.isArray(b.items) && b.items.length)) return fail(res, 'Tell us what you need.', 400);
  if (limited('q:' + phone, 5, 600000) || limited('ip:' + req.ip, 60, 600000)) return tooMany(res);
  try {
    const sid = idStr(b.storeId) || ''; let estimate = 0;
    if (sid && Array.isArray(b.items) && b.items.length) estimate = (await priceBasket(req, sid, b.items)).subtotal;
    const row = await sdk(req).datastore().table('quotes').insertRow({ name, phone, store_id: sid, items_text: text, address, status: 'NEW', estimate });
    res.status(201).json({ quoteId: String(row.ROWID), estimate });
  } catch (e) { typeof e === 'string' ? fail(res, e, 400) : fail(res, e); }
});

// Vendor portal
const FLOW = ['PLACED', 'ACCEPTED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
async function myStore(req) { const r = await zq(req, `SELECT ROWID FROM stores WHERE owner_user_id = '${req.u.id}'`); return r.length ? String(r[0].stores.ROWID) : null; }
app.get('/vendor/orders', need(['Vendor', 'Admin']), async (req, res) => {
  try { const sid = req.u.role === 'Admin' ? idStr(req.query.storeId) : await myStore(req);   // admin without storeId sees all stores
    if (req.u.role !== 'Admin' && !sid) return res.json({ items: [] });
    const where = sid ? `WHERE store_id = '${sid}'` : '';
    const rows = await zq(req, `SELECT ROWID, store_id, customer_name, customer_phone, total, status, slot, address, payment, CREATEDTIME FROM orders ${where} ORDER BY CREATEDTIME DESC LIMIT 100`);
    res.json({ items: rows.map((r) => r.orders) }); } catch (e) { fail(res, e); }
});
app.patch('/vendor/orders/:id/status', need(['Vendor', 'Admin']), async (req, res) => {
  const id = idStr(req.params.id); const next = (req.body || {}).status;
  if (!id || ![...FLOW, 'REJECTED'].includes(next)) return fail(res, 'Invalid status.', 400);
  try { const o = await zq(req, `SELECT ROWID, status, store_id FROM orders WHERE ROWID = ${id}`);
    if (!o.length) return fail(res, 'Order not found.', 404);
    if (req.u.role !== 'Admin' && String(o[0].orders.store_id) !== await myStore(req)) return fail(res, 'Order not found.', 404);
    const cur = FLOW.indexOf(o[0].orders.status);
    if (next === 'REJECTED' ? cur !== 0 : FLOW.indexOf(next) !== cur + 1) return fail(res, 'That status change is not allowed.', 409);
    await sdk(req).datastore().table('orders').updateRow({ ROWID: id, status: next });
    res.json({ orderId: id, status: next }); } catch (e) { fail(res, e); }
});
app.get('/vendor/quotes', need(['Vendor', 'Admin']), async (req, res) => {
  try { const sid = req.u.role === 'Admin' ? null : await myStore(req);
    const where = sid ? `WHERE store_id = '${sid}'` : '';
    const rows = await zq(req, `SELECT ROWID, name, phone, items_text, estimate, status, CREATEDTIME FROM quotes ${where} ORDER BY CREATEDTIME DESC LIMIT 100`);
    res.json({ items: rows.map((r) => r.quotes) }); } catch (e) { fail(res, e); }
});

// Admin portal: company and branch (store) administration
app.get('/admin/summary', need(['Admin']), async (req, res) => {
  try { const [s, o, q] = await Promise.all([zq(req, 'SELECT COUNT(ROWID) FROM stores'), zq(req, 'SELECT COUNT(ROWID) FROM orders'), zq(req, 'SELECT COUNT(ROWID) FROM quotes')]);
    res.json({ stores: Object.values(s[0].stores)[0], orders: Object.values(o[0].orders)[0], quotes: Object.values(q[0].quotes)[0] }); } catch (e) { fail(res, e); }
});
app.get('/admin/stores', need(['Admin']), async (req, res) => {
  try { const rows = await zq(req, 'SELECT ROWID, name_en, name_ta, eta, status, delivery_fee, min_order, owner_user_id, whatsapp FROM stores');
    res.json({ items: rows.map((r) => r.stores) }); } catch (e) { fail(res, e); }
});
app.post('/admin/stores', need(['Admin']), async (req, res) => {
  const b = req.body || {}; const name = clean(b.name_en, 120);
  if (name.length < 2) return fail(res, 'Store name is required.', 400);
  try { const row = await sdk(req).datastore().table('stores').insertRow({ name_en: name, name_ta: clean(b.name_ta, 120), owner_user_id: clean(b.owner_user_id, 40), whatsapp: phoneOf(b.whatsapp) ? '91' + phoneOf(b.whatsapp) : '', eta: clean(b.eta, 40), delivery_fee: Math.max(0, Number(b.delivery_fee) || 0), min_order: Math.max(0, Number(b.min_order) || 0), status: 'ACTIVE' });
    res.status(201).json({ storeId: String(row.ROWID) }); } catch (e) { fail(res, e); }
});
app.patch('/admin/stores/:id', need(['Admin']), async (req, res) => {
  const id = idStr(req.params.id); const b = req.body || {}; if (!id) return fail(res, 'Invalid store.', 400);
  const row = { ROWID: id };
  if ('status' in b) { if (!['ACTIVE', 'PAUSED'].includes(b.status)) return fail(res, 'Bad status.', 400); row.status = b.status; }
  if ('owner_user_id' in b) row.owner_user_id = clean(b.owner_user_id, 40);
  if ('whatsapp' in b) row.whatsapp = phoneOf(b.whatsapp) ? '91' + phoneOf(b.whatsapp) : '';
  try { await sdk(req).datastore().table('stores').updateRow(row); res.json({ ok: true }); } catch (e) { fail(res, e); }
});
app.post('/admin/products', need(['Admin', 'Vendor']), async (req, res) => {
  const b = req.body || {}; const sid = idStr(b.storeId); const price = Number(b.price);
  if (!sid || clean(b.name_en, 120).length < 2 || !(price > 0)) return fail(res, 'Store, name and price are required.', 400);
  try { if (req.u.role === 'Vendor' && sid !== await myStore(req)) return fail(res, 'Not your store.', 403);
    const row = await sdk(req).datastore().table('products').insertRow({ store_id: sid, name_en: clean(b.name_en, 120), name_ta: clean(b.name_ta, 120), unit: clean(b.unit, 30), price, status: 'ACTIVE' });
    res.status(201).json({ productId: String(row.ROWID) }); } catch (e) { fail(res, e); }
});

module.exports = app;
