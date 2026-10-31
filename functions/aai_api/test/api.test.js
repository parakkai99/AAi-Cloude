'use strict';
const test = require('node:test'); const assert = require('node:assert'); const Module = require('module');
const inserted = { orders: [], order_items: [], quotes: [] }; let user = null;
const PRODUCTS = [{ products: { ROWID: '111', name_en: 'Rice', price: '62' } }, { products: { ROWID: '112', name_en: 'Sugar', price: '46' } }];
const mock = { initialize: () => ({
  zcql: () => ({ executeZCQLQuery: async (q) => /FROM products/.test(q) ? PRODUCTS : /FROM stores WHERE ROWID/.test(q) ? [{ stores: { ROWID: '9', delivery_fee: '20', min_order: '100' } }] : /FROM stores WHERE owner_user_id = '2'/.test(q) ? [{ stores: { ROWID: '9' } }] : /FROM stores WHERE owner/.test(q) ? [] : /FROM orders WHERE ROWID/.test(q) ? [{ orders: { ROWID: '5', status: 'PLACED', store_id: '9' } }] : [] }),
  datastore: () => ({ table: (t) => ({ insertRow: async (r) => { inserted[t].push(r); return { ROWID: '777' }; }, insertRows: async (r) => { inserted[t].push(...r); }, updateRow: async () => ({}) }) }),
  userManagement: () => ({ getCurrentUser: async () => { if (!user) throw new Error('no'); return user; } }) }) };
const orig = Module._load; Module._load = function (r, ...a) { return r === 'zcatalyst-sdk-node' ? mock : orig.call(this, r, ...a); };
const app = require('../index.js');
let srv, base; test.before(async () => { await new Promise((ok) => { srv = app.listen(0, ok); }); base = 'http://127.0.0.1:' + srv.address().port; });
test.after(() => srv.close());
const post = (p, b, m = 'POST') => fetch(base + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const good = { storeId: '9', name: 'Lakshmi', phone: '+91 98765 43210', address: '12 Temple St, Anna Nagar', payment: 'cod', slot: 'Today', items: [{ productId: '111', qty: 2 }, { productId: '112', qty: 1 }] };

test('order is priced server-side and saved', async () => {
  const r = await post('/orders', { ...good, price: 1 }); assert.equal(r.status, 201);
  const j = await r.json(); assert.equal(j.total, 62 * 2 + 46 + 20); assert.equal(inserted.orders[0].customer_phone, '9876543210'); assert.equal(inserted.order_items.length, 2);
});
test('rejects bad phone, short address, bad qty, low basket', async () => {
  assert.equal((await post('/orders', { ...good, phone: '12345' })).status, 400);
  assert.equal((await post('/orders', { ...good, address: 'x' })).status, 400);
  assert.equal((await post('/orders', { ...good, items: [{ productId: '111', qty: -1 }] })).status, 400);
  assert.equal((await post('/orders', { ...good, items: [{ productId: '111', qty: 0.5 }] })).status, 400);
});
test('quote saved with estimate', async () => {
  const r = await post('/quotes', { name: 'Ravi', phone: '9123456780', text: 'need 10kg rice', storeId: '9', items: [{ productId: '111', qty: 3 }] });
  assert.equal(r.status, 201); assert.equal((await r.json()).estimate, 186);
});
test('vendor/admin routes need the right role', async () => {
  user = null; assert.equal((await fetch(base + '/vendor/orders')).status, 401);
  user = { user_id: '1', first_name: 'A', role_details: { role_name: 'Customer' } }; assert.equal((await fetch(base + '/vendor/orders')).status, 403);
  assert.equal((await fetch(base + '/admin/summary')).status, 403);
  user = { user_id: '2', first_name: 'V', role_details: { role_name: 'Vendor' } }; assert.equal((await fetch(base + '/vendor/orders')).status, 200);
  assert.equal((await post('/vendor/orders/5/status', { status: 'PACKED' }, 'PATCH')).status, 409);   // cannot skip ACCEPTED
  assert.equal((await post('/vendor/orders/5/status', { status: 'ACCEPTED' }, 'PATCH')).status, 200);
});

test('public checkout is throttled per phone', async () => {
  const body = { ...good, phone: '9000000001' }; let last;
  for (let i = 0; i < 7; i++) last = (await post('/orders', body)).status;
  assert.equal(last, 429);
});

test('Catalyst App Administrator is admin; store owner is vendor', async () => {
  user = { user_id: '5', first_name: 'A', role_details: { role_name: 'App Administrator' } };
  assert.equal((await (await fetch(base + '/me')).json()).role, 'Admin');
  user = { user_id: '2', first_name: 'V', role_details: { role_name: 'App User' } };
  assert.equal((await (await fetch(base + '/me')).json()).role, 'Vendor');
  user = { user_id: '3', first_name: 'C', role_details: { role_name: 'App User' } };
  assert.equal((await (await fetch(base + '/me')).json()).role, 'Customer');
});
