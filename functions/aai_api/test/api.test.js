'use strict';
const test = require('node:test'); const fs = require('fs'); const os = require('os'); const assert = require('node:assert'); const Module = require('module');
process.env.ADMIN_PHONES = '9000000009'; process.env.OTP_IP_LIMIT = '5000';
const db = { config: [{ ROWID: 'c1', k: 'gated', v: 'NONE' }, { ROWID: 'c2', k: 'free_sample', v: '999' }], payments: [], businesses: [], subscriptions: [], unlocks: [], followups: [], otp_codes: [], users: [], orders: [], service_requests: [], event_requests: [], vendor_busy: [], sellers: [], seller_products: [], seller_leads: [], properties: [], property_enquiries: [], labour_profiles: [], job_posts: [], job_applications: [], work_days: [], order_items: [], quotes: [], stores: [{ ROWID: '9', delivery_fee: 20, min_order: 100, status: 'ACTIVE', name_en: 'S' }], products: [{ ROWID: '111', name_en: 'Rice', price: 62 }, { ROWID: '112', name_en: 'Sugar', price: 46 }] };
const UNIQ = { vendor_busy: 'slot_key', seller_leads: 'dedupe_key', sellers: 'slug', property_enquiries: 'dedupe_key', properties: 'fp', job_applications: 'dedupe_key', work_days: 'wkey', labour_profiles: 'user_id', payments: 'utr', businesses: 'fp', subscriptions: 'skey', unlocks: 'ukey' };
let seq = 100; const logs = [];
const m = (q, re) => (q.match(re) || [])[1];
function generic(tn, q) {   // AND-ed equality / IN / >= / <= conditions
  const where = (q.match(/WHERE (.+?)(?: ORDER BY| LIMIT|$)/) || [])[1] || ''; const conds = where.split(' AND ').filter(Boolean);
  return db[tn].filter((r) => conds.every((c) => { let x;
    if ((x = c.match(/^(\w+) = '([^']*)'$/))) return String(r[x[1]]) === x[2];
    if ((x = c.match(/^(\w+) = (\d+)$/))) return String(r[x[1]]) === x[2];
    if ((x = c.match(/^(\w+) IN \((.*)\)$/))) return x[2].split(',').map((v) => v.trim().replace(/'/g, '')).includes(String(r[x[1]]));
    if ((x = c.match(/^(\w+) >= (\d+)$/))) return Number(r[x[1]]) >= Number(x[2]);
    if ((x = c.match(/^(\w+) <= (\d+)$/))) return Number(r[x[1]]) <= Number(x[2]);
    return true; }));
}
function query(q) {
  if (/COUNT\(ROWID\) FROM (\w+)/.test(q)) { const tn = m(q, /FROM (\w+)/); return [{ [tn]: { 'COUNT(ROWID)': generic(tn, q).length } }]; }
  const wrap = (t, rows) => rows.map((r) => ({ [t]: { ...r } }));
  if (/FROM otp_codes WHERE phone = '(\d+)' AND created_ms/.test(q)) return wrap('otp_codes', db.otp_codes.filter((r) => r.phone === m(q, /phone = '(\d+)'/)).sort((a, b) => b.created_ms - a.created_ms));
  if (/FROM otp_codes WHERE phone = '(\d+)' AND used = 'no'/.test(q)) return wrap('otp_codes', db.otp_codes.filter((r) => r.phone === m(q, /phone = '(\d+)'/) && r.used === 'no').sort((a, b) => b.created_ms - a.created_ms).slice(0, 1));
  if (/FROM users WHERE ROWID = (\d+)/.test(q)) return wrap('users', db.users.filter((r) => r.ROWID === m(q, /ROWID = (\d+)/)));
  if (/FROM users WHERE phone = '(\d+)'/.test(q)) return wrap('users', db.users.filter((r) => r.phone === m(q, /phone = '(\d+)'/)));
  if (/FROM products/.test(q)) return wrap('products', db.products);
  if (/FROM stores WHERE ROWID/.test(q)) return wrap('stores', db.stores);
  if (/FROM orders WHERE ROWID = (\d+)/.test(q)) return wrap('orders', db.orders.filter((r) => r.ROWID === m(q, /ROWID = (\d+)/)));
  if (/FROM orders WHERE store_id/.test(q)) return wrap('orders', db.orders.filter((r) => r.store_id === m(q, /store_id = '(\d+)'/)));
  if (/FROM orders WHERE customer_id/.test(q)) return wrap('orders', db.orders.filter((r) => r.customer_id === m(q, /customer_id = '(\w+)'/)));
  if (/FROM service_requests WHERE ROWID = (\d+)/.test(q)) return wrap('service_requests', db.service_requests.filter((r) => r.ROWID === m(q, /ROWID = (\d+)/)));
  if (/FROM service_requests WHERE customer_id/.test(q)) return wrap('service_requests', db.service_requests.filter((r) => r.customer_id === m(q, /customer_id = '(\w+)'/)));
  if (/FROM service_requests/.test(q)) return wrap('service_requests', db.service_requests);
  if (/FROM event_requests WHERE ROWID = (\d+)/.test(q)) return wrap('event_requests', db.event_requests.filter((r) => r.ROWID === m(q, /ROWID = (\d+)/)));
  if (/FROM event_requests WHERE customer_id/.test(q)) return wrap('event_requests', db.event_requests.filter((r) => r.customer_id === m(q, /customer_id = '(\w+)'/)));
  if (/FROM event_requests/.test(q)) return wrap('event_requests', db.event_requests);
  if (/FROM vendor_busy WHERE vendor_id = '(\w+)'/.test(q)) return wrap('vendor_busy', db.vendor_busy.filter((r) => r.vendor_id === m(q, /vendor_id = '(\w+)'/)));
  if (/FROM vendor_busy WHERE request_id = '(\w+)'/.test(q)) return wrap('vendor_busy', db.vendor_busy.filter((r) => r.request_id === m(q, /request_id = '(\w+)'/)));
  if (/FROM sellers WHERE slug = '([\w-]+)'/.test(q)) return wrap('sellers', db.sellers.filter((r) => r.slug === m(q, /slug = '([\w-]+)'/) && (!/status = 'LIVE'/.test(q) || r.status === 'LIVE')));
  if (/FROM sellers WHERE status = 'LIVE'/.test(q)) return wrap('sellers', db.sellers.filter((r) => r.status === 'LIVE' && (!/category = '(\w+)'/.test(q) || r.category === m(q, /category = '(\w+)'/)) && (!/district = '([^']+)'/.test(q) || r.district === m(q, /district = '([^']+)'/))).slice(0, /LIMIT 5/.test(q) ? 5 : 100));
  if (/FROM sellers/.test(q)) return wrap('sellers', db.sellers);
  if (/FROM seller_products WHERE seller_id = '(\d+)'/.test(q)) return wrap('seller_products', db.seller_products.filter((r) => r.seller_id === m(q, /seller_id = '(\d+)'/)));
  if (/FROM seller_leads WHERE ROWID = (\d+)/.test(q)) return wrap('seller_leads', db.seller_leads.filter((r) => r.ROWID === m(q, /ROWID = (\d+)/)));
  if (/FROM seller_leads WHERE customer_id = '(\w+)'/.test(q)) return wrap('seller_leads', db.seller_leads.filter((r) => r.customer_id === m(q, /customer_id = '(\w+)'/)));
  if (/FROM seller_leads WHERE seller_id = '(\d+)'/.test(q)) return wrap('seller_leads', db.seller_leads.filter((r) => r.seller_id === m(q, /seller_id = '(\d+)'/)));
  if (/FROM seller_leads/.test(q)) return wrap('seller_leads', db.seller_leads);
  if (/FROM properties WHERE fp = '(\w+)'/.test(q)) return wrap('properties', db.properties.filter((r) => r.fp === m(q, /fp = '(\w+)'/)));
  if (/FROM properties WHERE ROWID = (\d+)/.test(q)) return wrap('properties', db.properties.filter((r) => r.ROWID === m(q, /ROWID = (\d+)/) && (!/status IN/.test(q) || ['LIVE', 'UNDER_NEGOTIATION'].includes(r.status))));
  if (/FROM properties WHERE owner_id = '(\w+)'/.test(q)) return wrap('properties', db.properties.filter((r) => r.owner_id === m(q, /owner_id = '(\w+)'/)));
  if (/FROM properties WHERE status IN/.test(q)) return wrap('properties', db.properties.filter((r) => ['LIVE', 'UNDER_NEGOTIATION'].includes(r.status) && (!/mode = '(\w+)'/.test(q) || r.mode === m(q, /mode = '(\w+)'/)) && (!/ptype = '(\w+)'/.test(q) || r.ptype === m(q, /ptype = '(\w+)'/)) && (!/price <= (\d+)/.test(q) || r.price <= Number(m(q, /price <= (\d+)/))) && (!/price >= (\d+)/.test(q) || r.price >= Number(m(q, /price >= (\d+)/)))));
  if (/FROM properties WHERE status = '(\w+)'/.test(q)) return wrap('properties', db.properties.filter((r) => r.status === m(q, /status = '(\w+)'/)));
  if (/FROM property_enquiries WHERE ROWID = (\d+)/.test(q)) return wrap('property_enquiries', db.property_enquiries.filter((r) => r.ROWID === m(q, /ROWID = (\d+)/)));
  if (/FROM property_enquiries WHERE customer_id = '(\w+)'/.test(q)) return wrap('property_enquiries', db.property_enquiries.filter((r) => r.customer_id === m(q, /customer_id = '(\w+)'/)));
  if (/FROM property_enquiries WHERE owner_id = '(\w+)'/.test(q)) return wrap('property_enquiries', db.property_enquiries.filter((r) => r.owner_id === m(q, /owner_id = '(\w+)'/)));
  if (/FROM order_items/.test(q)) return wrap('order_items', db.order_items);
  { const tn = (q.match(/FROM (\w+)/) || [])[1]; if (db[tn]) return wrap(tn, generic(tn, q)); }
  return [];
}
const mock = { initialize: () => ({
  zcql: () => ({ executeZCQLQuery: async (q) => {   // like the real database, return only the selected columns
    const rows = query(q); const sel = (q.match(/^SELECT (.+?) FROM /) || [])[1];
    if (!sel || sel === '*' || /COUNT\(/.test(sel)) return rows;
    const cols = sel.split(',').map((c) => c.trim());
    return rows.map((r) => { const [tn, row] = Object.entries(r)[0]; return { [tn]: Object.fromEntries(cols.filter((c) => c in row).map((c) => [c, row[c]])) }; });
  } }),
  datastore: () => ({ table: (t) => ({
    deleteRow: async (id) => { const i = db[t].findIndex((x) => x.ROWID === String(id)); if (i >= 0) db[t].splice(i, 1); },
    insertRow: async (r) => { if (UNIQ[t] && db[t].some((x) => x[UNIQ[t]] === r[UNIQ[t]])) throw new Error('duplicate'); const row = { ROWID: String(++seq), ...r }; db[t].push(row); return row; },
    insertRows: async (rs) => { rs.forEach((r) => db[t].push({ ROWID: String(++seq), ...r })); },
    updateRow: async (r) => { Object.assign(db[t].find((x) => x.ROWID === String(r.ROWID)), r); return r; } }) }),
  zia: () => ({ extractOpticalCharacters: async () => { if (globalThis.ZIA_FAIL) throw new Error('zia down'); return { text: globalThis.ZIA_TEXT || '' }; } }),
  userManagement: () => ({ getCurrentUser: async () => { throw new Error('no email session'); } }) }) };
const orig = Module._load; Module._load = function (r, ...a) { return r === 'zcatalyst-sdk-node' ? mock : orig.call(this, r, ...a); };
const log = console.log; console.log = (...a) => { logs.push(a.join(' ')); };
const app = require('../index.js');
let srv, base; test.before(async () => { await new Promise((ok) => { srv = app.listen(0, ok); }); base = 'http://127.0.0.1:' + srv.address().port; });
test.after(() => { srv.close(); console.log = log; });
const call = (p, method = 'GET', body, cookie) => fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
async function login(phone, name) {
  const s = await call('/auth/otp/send', 'POST', { phone }); assert.equal(s.status, 200);
  const code = logs.filter((l) => l.includes(`for ${phone}:`)).pop().split(': ').pop();
  const v = await call('/auth/otp/verify', 'POST', { phone, code, name }); assert.equal(v.status, 200);
  return v.headers.get('set-cookie').split(';')[0];
}
let ADMIN, WK;
const order = (cookie, extra) => call('/orders', 'POST', { storeId: '9', address: '12 Temple St, Anna Nagar', slot: 'Today', items: [{ productId: '111', qty: 2 }, { productId: '112', qty: 1 }], ...extra }, cookie);

test('OTP: wrong code fails, right code signs in, cookie is HttpOnly', async () => {
  await call('/auth/otp/send', 'POST', { phone: '9876500001' });
  assert.equal((await call('/auth/otp/verify', 'POST', { phone: '9876500001', code: '000000' })).status, 400);
  const c = await login('9876500002', 'Lakshmi');
  const me = await (await call('/me', 'GET', null, c)).json(); assert.equal(me.role, 'CUSTOMER'); assert.equal(me.name, 'Lakshmi');
});
test('OTP: bad phone, resend cooldown, code is single use', async () => {
  assert.equal((await call('/auth/otp/send', 'POST', { phone: '12345' })).status, 400);
  await call('/auth/otp/send', 'POST', { phone: '9876500003' });
  assert.equal((await call('/auth/otp/send', 'POST', { phone: '9876500003' })).status, 429);
  const code = logs.filter((l) => l.includes('for 9876500003:')).pop().split(': ').pop();
  assert.equal((await call('/auth/otp/verify', 'POST', { phone: '9876500003', code })).status, 200);
  assert.equal((await call('/auth/otp/verify', 'POST', { phone: '9876500003', code })).status, 400);
});
test('orders need sign-in; priced server-side; bad input rejected', async () => {
  assert.equal((await order(null)).status, 401);
  const c = await login('9876500004', 'Ravi');
  const r = await order(c, { total: 1 }); assert.equal(r.status, 201); assert.equal((await r.json()).total, 62 * 2 + 46 + 20);
  assert.equal(db.orders.at(-1).payment, 'none'); assert.equal(db.orders.at(-1).customer_phone, '9876500004');
  assert.equal((await order(c, { address: 'x' })).status, 400);
  assert.equal((await order(c, { items: [{ productId: '111', qty: 0.3 }] })).status, 400);
  const mine = await (await call('/orders/mine', 'GET', null, c)).json(); assert.equal(mine.items.length, 1); assert.equal(mine.items[0].lines.length, 2);
});
test('quote saved for signed-in customer with estimate', async () => {
  const c = await login('9876500005', 'Meena');
  const r = await call('/quotes', 'POST', { storeId: '9', text: 'need rice', items: [{ productId: '111', qty: 3 }] }, c);
  assert.equal(r.status, 201); assert.equal((await r.json()).estimate, 186);
});
test('customer cannot use vendor or admin routes', async () => {
  const c = await login('9876500006', 'Cust');
  assert.equal((await call('/vendor/orders', 'GET', null, c)).status, 403); assert.equal((await call('/admin/summary', 'GET', null, c)).status, 403);
  assert.equal((await call('/vendor/orders')).status, 401);
});
test('admin phone becomes ADMIN, adds a vendor by mobile; vendor delivers or rejects', async () => {
  const a = (ADMIN = await login('9000000009', 'Boss')); assert.equal((await (await call('/me', 'GET', null, a)).json()).role, 'ADMIN');
  assert.equal((await call('/admin/users', 'POST', { phone: '9876500007', role: 'VENDOR' }, a)).status, 400);   // vendor needs a store
  assert.equal((await call('/admin/users', 'POST', { phone: '9876500007', name: 'Murugan', role: 'VENDOR', storeId: '9' }, a)).status, 201);
  const v = await login('9876500007'); assert.equal((await (await call('/me', 'GET', null, v)).json()).role, 'VENDOR');
  const c = await login('9876500008', 'Buyer'); const o1 = (await (await order(c)).json()).orderId; const o2 = (await (await order(c)).json()).orderId;
  assert.ok((await (await call('/vendor/orders', 'GET', null, v)).json()).items.length >= 2);
  for (const o of [o1, o2]) assert.equal((await call('/unlock', 'POST', { kind: 'ORD', refId: o }, v)).status, 200);   // vendor unlocks the customer first
  assert.equal((await call(`/vendor/orders/${o1}/status`, 'PATCH', { status: 'PACKED' }, v)).status, 400);
  assert.equal((await call(`/vendor/orders/${o1}/status`, 'PATCH', { status: 'DELIVERED' }, v)).status, 200);
  assert.equal((await call(`/vendor/orders/${o1}/status`, 'PATCH', { status: 'REJECTED' }, v)).status, 409);
  assert.equal((await call(`/vendor/orders/${o2}/status`, 'PATCH', { status: 'REJECTED' }, v)).status, 200);
  assert.equal((await call('/admin/summary', 'GET', null, a)).status, 200);
  assert.equal((await call('/admin/users/' + db.users.find((u) => u.phone === '9000000009').ROWID, 'PATCH', { status: 'DISABLED' }, a)).status, 400);
});
test('vendor of another store cannot touch this order', async () => {
  const a = ADMIN; await call('/admin/users', 'POST', { phone: '9876500009', role: 'VENDOR', storeId: '55' }, a);
  const v2 = await login('9876500009'); const c = await login('9876500010', 'Buyer Two'); const o = (await (await order(c)).json()).orderId;
  assert.equal((await call(`/vendor/orders/${o}/status`, 'PATCH', { status: 'DELIVERED' }, v2)).status, 404);
});

test('home services: request -> worker quote -> customer accepts -> done; privacy and rules', async () => {
  const a = ADMIN; const c = await login('9876500020', 'Customer Svc');
  assert.equal((await call('/services/requests', 'POST', { category: 'PLUMBING', description: 'x', address: 'Temple St, Anna Nagar' }, c)).status, 400);
  const r = await call('/services/requests', 'POST', { category: 'PLUMBING', description: 'Kitchen tap leaking badly', address: '12 Temple St, Anna Nagar', preferred: 'Tomorrow morning' }, c);
  assert.equal(r.status, 201); const id = (await r.json()).requestId;
  assert.equal((await call('/admin/users', 'POST', { phone: '9876500021', name: 'Karthik', role: 'WORKER' }, a)).status, 400);   // worker needs a trade
  assert.equal((await call('/admin/users', 'POST', { phone: '9876500021', name: 'Karthik', role: 'WORKER', skill: 'PLUMBING' }, a)).status, 201);
  await call('/admin/users', 'POST', { phone: '9876500022', name: 'Elec', role: 'WORKER', skill: 'ELECTRICAL' }, a);
  const w = (WK = await login('9876500021')); const w2 = await login('9876500022');
  const list = (await (await call('/worker/requests', 'GET', null, w)).json()).items.find((x) => x.ROWID === id);
  assert.equal(list.customer_phone, ''); assert.equal(list.address, '');                                  // hidden before acceptance
  assert.equal((await call(`/worker/requests/${id}/quote`, 'POST', { amount: 350 }, w2)).status, 404);     // wrong trade
  assert.equal((await call(`/worker/requests/${id}/quote`, 'POST', { amount: 0 }, w)).status, 400);
  assert.equal((await call(`/worker/requests/${id}/quote`, 'POST', { amount: 350, note: 'incl. washer' }, w)).status, 200);
  assert.equal((await call(`/worker/requests/${id}/quote`, 'POST', { amount: 300 }, w)).status, 409);       // already quoted
  assert.equal((await call(`/worker/requests/${id}/done`, 'POST', {}, w)).status, 409);                     // not accepted yet
  const mine = (await (await call('/services/mine', 'GET', null, c)).json()).items[0]; assert.equal(mine.status, 'QUOTED'); assert.equal(mine.quote_amount, 350); assert.equal(mine.worker_phone, '');
  assert.equal((await call(`/services/requests/${id}/respond`, 'POST', { accept: true }, w)).status, 404);  // not the owner
  assert.equal((await call(`/services/requests/${id}/respond`, 'POST', { accept: true }, c)).status, 200);
  assert.equal((await (await call('/services/mine', 'GET', null, c)).json()).items[0].worker_phone, '9876500021');
  const shown = (await (await call('/worker/requests', 'GET', null, w)).json()).items.find((x) => x.ROWID === id); assert.equal(shown.customer_phone, '9876500020');
  assert.equal((await call(`/worker/requests/${id}/done`, 'POST', {}, w2)).status, 404);
  assert.equal((await call(`/worker/requests/${id}/done`, 'POST', {}, w)).status, 200);
  assert.equal((await (await call('/services/mine', 'GET', null, c)).json()).items[0].status, 'DONE');
});
test('declined quote reopens the job for other workers', async () => {
  const c = await login('9876500023', 'Cust Three'); const id = (await (await call('/services/requests', 'POST', { category: 'PLUMBING', description: 'Bathroom pipe burst', address: '5 Gandhi Rd, Anna Nagar' }, c)).json()).requestId;
  assert.equal((await call(`/worker/requests/${id}/quote`, 'POST', { amount: 500 }, WK)).status, 200);
  assert.equal((await call(`/services/requests/${id}/respond`, 'POST', { accept: false }, c)).status, 200);
  const mine = (await (await call('/services/mine', 'GET', null, c)).json()).items[0]; assert.equal(mine.status, 'NEW'); assert.equal(mine.worker_name, '');
  assert.equal((await call(`/worker/requests/${id}/quote`, 'POST', { amount: 450 }, WK)).status, 200);   // can be quoted again
});

const day = (n) => new Date(Date.now() + 19800000 + n * 86400000).toISOString().slice(0, 10);
const ev = (c, over) => call('/events/requests', 'POST', { category: 'NADASWARAM', eventType: 'TEMPLE_FESTIVAL', dateFrom: day(40), dateTo: day(42), venue: 'Anna Nagar temple', guests: 500, budget: 60000, name: 'Committee', ...over }, c);
let ART;
test('events: validation, quote, accept books the dates, double booking is blocked', async () => {
  const a = ADMIN; const c1 = await login('9876500030', 'Selvi Temple'); const c2 = await login('9876500031', 'Second Family');
  assert.equal((await ev(c1, { dateFrom: day(-2), dateTo: day(-1) })).status, 400);        // past
  assert.equal((await ev(c1, { dateFrom: day(400), dateTo: day(401) })).status, 400);      // over a year
  assert.equal((await ev(c1, { dateFrom: day(50), dateTo: day(49) })).status, 400);        // end before start
  assert.equal((await ev(c1, { dateFrom: day(50), dateTo: day(70) })).status, 400);        // more than 14 days
  assert.equal((await ev(c1, { category: 'MAGIC' })).status, 400);
  assert.equal((await call('/admin/users', 'POST', { phone: '9876500032', name: 'Nadaswaram Team', role: 'ARTIST' }, a)).status, 400);   // needs a service
  assert.equal((await call('/admin/users', 'POST', { phone: '9876500032', name: 'Nadaswaram Team', role: 'ARTIST', skill: 'NADASWARAM' }, a)).status, 201);
  const art = (ART = await login('9876500032'));
  const id1 = (await (await ev(c1)).json()).requestId; const id2 = (await (await ev(c2, { dateFrom: day(41), dateTo: day(41) })).json()).requestId;   // overlapping dates
  assert.equal((await call(`/artist/requests/${id1}/quote`, 'POST', { amount: 45000, note: '4 members' }, art)).status, 200);
  assert.equal((await call(`/artist/requests/${id2}/quote`, 'POST', { amount: 15000 }, art)).status, 200);   // both quoted: an enquiry does not block dates
  assert.equal((await call(`/events/requests/${id1}/respond`, 'POST', { accept: true }, c2)).status, 404);
  assert.equal((await call(`/events/requests/${id1}/respond`, 'POST', { accept: true }, c1)).status, 200);
  assert.equal((await call('/artist/calendar', 'GET', null, art).then((r) => r.json())).items.length, 3);
  const r2 = await call(`/events/requests/${id2}/respond`, 'POST', { accept: true }, c2); assert.equal(r2.status, 409);   // date taken
  assert.equal((await (await call('/events/mine', 'GET', null, c2)).json()).items[0].status, 'NEW');                      // reopened
  const mine = (await (await call('/events/mine', 'GET', null, c1)).json()).items[0]; assert.equal(mine.status, 'BOOKED'); assert.equal(mine.vendor_phone, '9876500032');
  const shown = (await (await call('/artist/requests', 'GET', null, art)).json()).items.find((x) => x.ROWID === id1); assert.equal(shown.customer_phone, '9876500030');
  assert.equal((await call(`/artist/requests/${id1}/done`, 'POST', {}, art)).status, 409);                                // event has not happened
  assert.equal((await call(`/events/requests/${id1}/cancel`, 'POST', {}, c1)).status, 200);                               // cancel frees the dates
  assert.equal((await (await call('/artist/calendar', 'GET', null, art)).json()).items.length, 0);
});
test('events: artist blocks and unblocks own days; cannot quote on blocked dates', async () => {
  const c = await login('9876500033', 'Family Four');
  assert.equal((await call('/artist/block', 'POST', { from: day(60), to: day(61) }, ART)).status, 200);
  assert.equal((await call('/artist/block', 'POST', { from: day(61), to: day(62) }, ART)).status, 409);                    // overlaps
  const id = (await (await ev(c, { dateFrom: day(60), dateTo: day(60) })).json()).requestId;
  assert.equal((await (await call('/artist/requests', 'GET', null, ART)).json()).items.find((x) => x.ROWID === id).conflict, true);
  assert.equal((await call(`/artist/requests/${id}/quote`, 'POST', { amount: 9000 }, ART)).status, 409);
  assert.equal((await (await call('/artist/unblock', 'POST', { from: day(60), to: day(61) }, ART)).json()).unblocked, 2);
  assert.equal((await call(`/artist/requests/${id}/quote`, 'POST', { amount: 9000 }, ART)).status, 200);
  assert.equal((await call('/artist/calendar', 'GET', null, c)).status, 403);                      // customers cannot use it
});

const sel = (over) => ({ name: 'Meena Sarees', city: 'Madurai', district: 'Madurai', category: 'TEXTILES', about: 'Wedding sarees', youtubeUrl: 'https://www.youtube.com/@meena', facebookUrl: 'javascript:alert(1)', priceRange: '₹800 - ₹15,000', ...over });
let SELLER_ID, SLUG, SLC;
test('seller directory: admin onboards, public browse hides contact and hidden sellers', async () => {
  const a = ADMIN;
  assert.equal((await call('/admin/sellers', 'POST', sel({ category: 'GOLD' }), a)).status, 400);
  const r = await call('/admin/sellers', 'POST', sel(), a); assert.equal(r.status, 201); const j = await r.json(); SELLER_ID = j.sellerId; SLUG = j.slug; assert.equal(SLUG, 'meena-sarees');
  assert.equal(db.sellers.at(-1).facebook_url, ''); assert.ok(db.sellers.at(-1).youtube_url.startsWith('https://www.youtube.com'));       // bad link dropped
  assert.equal((await call('/admin/sellers', 'POST', sel(), a).then((x) => x.json())).slug.startsWith('meena-sarees-'), true);                // unique slug
  await call('/admin/sellers', 'POST', sel({ name: 'Hidden Mobiles', category: 'MOBILES' }), a);
  await call('/admin/sellers/' + db.sellers.at(-1).ROWID, 'PATCH', { status: 'HIDDEN' }, a);
  const list = await (await call('/sellers?category=TEXTILES')).json(); assert.equal(list.items.length, 2); assert.equal('whatsapp' in list.items[0], false);
  assert.equal((await (await call('/sellers?category=MOBILES')).json()).items.length, 0);
  assert.equal((await call('/sellers/hidden-mobiles')).status, 404);
  const sc = (await call('/admin/users', 'POST', { phone: '9876500040', name: 'Meena', role: 'SELLER' }, a)).status; assert.equal(sc, 400);   // needs a seller
  assert.equal((await call('/admin/users', 'POST', { phone: '9876500040', name: 'Meena', role: 'SELLER', storeId: SELLER_ID }, a)).status, 201);
  const sl = (SLC = await login('9876500040')); assert.equal((await call('/seller/products', 'POST', { name: 'Kanchipuram silk saree', refPrice: 4500, description: 'Pure zari' }, sl)).status, 201);
  assert.equal((await call('/seller/products', 'POST', { name: 'Saree', refPrice: -1 }, sl)).status, 400);
  const prof = await (await call('/sellers/' + SLUG)).json(); assert.equal(prof.products.length, 1); assert.ok(/responsib/.test(prof.disclaimer));
});
test('seller leads: sign-in, consent, dedupe, matching, seller inbox, expiry', async () => {
  const c = await login('9876500041', 'Anand Kumar'); const sl = SLC;
  const lead = (over) => call('/sellers/leads', 'POST', { sellerSlug: SLUG, requirement: '10 pattu sarees for a wedding', location: 'Madurai', budget: 50000, consent: true, ...over }, c);
  assert.equal((await call('/sellers/leads', 'POST', { sellerSlug: SLUG, requirement: 'x', consent: true })).status, 401);
  assert.equal((await lead({ consent: false })).status, 400); assert.equal((await lead({ requirement: 'hi' })).status, 400);
  const r1 = await (await lead()).json(); assert.equal(r1.sent, 1);
  const r2 = await (await lead()).json(); assert.equal(r2.sent, 0); assert.equal(r2.skipped, 1);                                         // same customer + seller + day
  for (let i = 0; i < 6; i++) await call('/admin/sellers', 'POST', sel({ name: 'Textile Shop ' + i }), ADMIN);
  const m1 = await (await lead({ route: 'matching', category: 'TEXTILES', sellerSlug: undefined })).json(); assert.ok(m1.sent >= 1 && m1.sent <= 5);
  const locked = (await (await call('/seller/leads', 'GET', null, sl)).json()).items; assert.equal(locked[0].customer_phone, ''); assert.equal(locked[0].locked, true);
  assert.equal((await call('/unlock', 'POST', { kind: 'LEAD', refId: locked[0].ROWID }, sl)).status, 200);
  const inbox = (await (await call('/seller/leads', 'GET', null, sl)).json()).items; assert.equal(inbox.length, 1); assert.equal(inbox[0].customer_phone, '9876500041');
  assert.equal((await call(`/seller/leads/${inbox[0].ROWID}`, 'PATCH', { status: 'PAID' }, sl)).status, 400);
  assert.equal((await call(`/seller/leads/${inbox[0].ROWID}`, 'PATCH', { status: 'CONTACTED' }, sl)).status, 200);
  assert.equal((await (await call('/sellers/leads/mine', 'GET', null, c)).json()).items.find((x) => x.seller_name === 'Meena Sarees').status, 'CONTACTED');
  assert.equal((await call('/seller/leads', 'GET', null, c)).status, 403);
  db.seller_leads.find((x) => x.seller_id !== SELLER_ID).valid_until = '2020-01-01'; const old = db.seller_leads.find((x) => x.valid_until === '2020-01-01');
  assert.equal((await (await call('/sellers/leads/mine', 'GET', null, c)).json()).items.some((x) => x.status === 'EXPIRED'), true);
  assert.equal((await call('/admin/sellers/' + SELLER_ID, 'PATCH', { verified: 'yes' }, ADMIN)).status, 200);
});

const home = (over) => ({ mode: 'RENT', ptype: 'HOUSE', title: '2 BHK house near temple', locality: 'Anna Nagar', district: 'Madurai', price: 8000, deposit: 40000, bhk: 2, areaSqft: 900, description: 'Ground floor, water supply', videoUrl: 'https://youtu.be/dQw4w9WgXcQ', broker: false, name: 'Owner One', ...over });
let OWN, PID;
test('real estate: listing is hidden until admin approves; duplicates and bad input rejected', async () => {
  OWN = await login('9876500050', 'Owner One');
  assert.equal((await call('/properties', 'POST', home({ mode: 'LEASE' }), OWN)).status, 400);
  assert.equal((await call('/properties', 'POST', home({ price: 0 }), OWN)).status, 400);
  assert.equal((await call('/properties', 'POST', home())).status, 401);
  const r = await call('/properties', 'POST', home(), OWN); assert.equal(r.status, 201); PID = (await r.json()).propertyId;
  assert.equal((await call('/properties', 'POST', home({ title: 'Same house again' }), OWN)).status, 409);          // duplicate detection
  assert.equal((await (await call('/properties?mode=RENT')).json()).items.length, 0);                              // not public yet
  assert.equal((await call('/properties/' + PID)).status, 404);
  assert.equal((await call(`/properties/${PID}/status`, 'PATCH', { status: 'INACTIVE' }, OWN)).status, 409);        // needs approval first
  assert.equal((await (await call('/properties/mine', 'GET', null, OWN)).json()).items[0].status, 'PENDING');
  assert.equal((await call('/admin/properties')).status, 401); assert.equal((await call('/admin/properties', 'GET', null, OWN)).status, 403);
  assert.equal((await (await call('/admin/properties', 'GET', null, ADMIN)).json()).items.length, 1);
  assert.equal((await call(`/admin/properties/${PID}/decision`, 'POST', { approve: true }, OWN)).status, 403);
  assert.equal((await call(`/admin/properties/${PID}/decision`, 'POST', { approve: true }, ADMIN)).status, 200);
});
test('real estate: public search hides owner contact; filters work', async () => {
  await call('/properties', 'POST', home({ mode: 'SALE', ptype: 'PLOT', title: '1200 sqft plot DTCP approved', price: 2500000, bhk: 0, areaSqft: 1200, approvalInfo: 'DTCP approved' }), OWN);
  const sale = db.properties.at(-1); await call(`/admin/properties/${sale.ROWID}/decision`, 'POST', { approve: true }, ADMIN);
  const rent = (await (await call('/properties?mode=RENT')).json()).items; assert.equal(rent.length, 1); assert.equal('owner_phone' in rent[0], false); assert.equal('fp' in rent[0], false);
  assert.equal((await (await call('/properties?mode=SALE&ptype=PLOT')).json()).items.length, 1);
  assert.equal((await (await call('/properties?maxPrice=5000')).json()).items.length, 0);
  assert.equal((await (await call('/properties?minPrice=5000&maxPrice=9000')).json()).items.length, 1);
  const d = await (await call('/properties/' + PID)).json(); assert.equal(d.title, '2 BHK house near temple'); assert.ok(/connects you/.test(d.notice));
});
let CUST;
test('real estate: enquiry with visit date reaches the owner; owner manages it', async () => {
  CUST = await login('9876500051', 'Tenant Two'); const day = (n) => new Date(Date.now() + 19800000 + n * 86400000).toISOString().slice(0, 10);
  const enq = (over) => call(`/properties/${PID}/enquiries`, 'POST', { message: 'Is it available from next month?', visitDate: day(5), consent: true, ...over }, CUST);
  assert.equal((await enq({ consent: false })).status, 400); assert.equal((await enq({ message: 'hi' })).status, 400); assert.equal((await enq({ visitDate: day(-3) })).status, 400);
  assert.equal((await call(`/properties/${PID}/enquiries`, 'POST', { message: 'my own house', consent: true }, OWN)).status, 400);
  assert.equal((await enq()).status, 201); assert.equal((await enq()).status, 409);                                // one per day
  const inbox = (await (await call('/properties/enquiries/inbox', 'GET', null, OWN)).json()).items; assert.equal(inbox.length, 1); assert.equal(inbox[0].customer_phone, '9876500051'); assert.equal(inbox[0].visit_date, day(5));
  assert.equal((await call('/properties/enquiries/inbox', 'GET', null, CUST).then((r) => r.json())).items.length, 0);   // a tenant sees none of the owner's
  assert.equal((await call(`/properties/enquiries/${inbox[0].ROWID}`, 'PATCH', { status: 'VISIT_SCHEDULED' }, CUST)).status, 404);
  assert.equal((await call(`/properties/enquiries/${inbox[0].ROWID}`, 'PATCH', { status: 'PAID' }, OWN)).status, 400);
  assert.equal((await call(`/properties/enquiries/${inbox[0].ROWID}`, 'PATCH', { status: 'VISIT_SCHEDULED' }, OWN)).status, 200);
  assert.equal((await (await call('/properties/enquiries/mine', 'GET', null, CUST)).json()).items[0].status, 'VISIT_SCHEDULED');
});
test('real estate: negotiation, rented/sold and admin reject remove or flag the listing', async () => {
  assert.equal((await call(`/properties/${PID}/status`, 'PATCH', { status: 'UNDER_NEGOTIATION' }, CUST)).status, 404);   // not the owner
  assert.equal((await call(`/properties/${PID}/status`, 'PATCH', { status: 'UNDER_NEGOTIATION' }, OWN)).status, 200);
  assert.equal((await (await call('/properties?mode=RENT')).json()).items[0].status, 'UNDER_NEGOTIATION');         // still visible, flagged
  assert.equal((await call(`/properties/${PID}/status`, 'PATCH', { status: 'CLOSED' }, OWN)).status, 200);          // rented
  assert.equal((await (await call('/properties?mode=RENT')).json()).items.length, 0);
  assert.equal((await call(`/properties/${PID}/enquiries`, 'POST', { message: 'still free?', consent: true }, await login('9876500052', 'Third Person'))).status, 404);
  const sale = db.properties.find((x) => x.mode === 'SALE'); assert.equal((await call(`/admin/properties/${sale.ROWID}/decision`, 'POST', { approve: false, note: 'Missing approval proof' }, ADMIN)).status, 200);
  assert.equal((await (await call('/properties?mode=SALE')).json()).items.length, 0); assert.equal(db.properties.find((x) => x.ROWID === sale.ROWID).status, 'REJECTED');
});

const wp = (over) => ({ trade: 'MASON', level: 'SKILLED', district: 'madurai', dailyRate: 900, experienceYrs: 6, teamSize: 1, languages: 'Tamil', tools: 'Own tools', ...over });
const job = (over) => ({ trade: 'MASON', headcount: 1, days: 3, wage: 950, startDate: day(20), locality: 'Anna Nagar', district: 'Madurai', notes: 'Compound wall', name: 'Builder Bala', ...over });
let POSTER, W1, W2, W3, W1ID;
test('manpower: worker profile needs admin verification before seeing or applying to jobs', async () => {
  POSTER = await login('9876500060', 'Builder Bala'); W1 = await login('9876500061', 'Mason One'); W2 = await login('9876500062', 'Painter Two'); W3 = await login('9876500063', 'Mason Three');
  assert.equal((await call('/labour/profile', 'POST', wp({ trade: 'ASTRONAUT' }), W1)).status, 400); assert.equal((await call('/labour/profile', 'POST', wp({ dailyRate: 0 }), W1)).status, 400);
  assert.equal((await call('/labour/profile', 'POST', wp(), W1)).status, 201); await call('/labour/profile', 'POST', wp({ trade: 'PAINTER' }), W2); await call('/labour/profile', 'POST', wp(), W3);
  assert.equal(db.labour_profiles[0].district, 'Madurai');                                                          // normalised
  assert.equal((await call('/labour/jobs', 'GET', null, W1)).status, 403);
  const pend = (await (await call('/admin/labour?verified=no', 'GET', null, ADMIN)).json()).items; assert.equal(pend.length, 3); assert.equal((await call('/admin/labour', 'GET', null, W1)).status, 403);
  W1ID = db.labour_profiles[0].ROWID; for (const p of db.labour_profiles) assert.equal((await call(`/admin/labour/${p.ROWID}/verify`, 'POST', { verified: true }, ADMIN)).status, 200);
  assert.equal((await call('/labour/profile', 'POST', wp({ dailyRate: 1000 }), W1)).status, 200); assert.equal(db.labour_profiles[0].verified, 'yes');   // same trade+district: stays verified
});
let JOB1, APP1;
test('manpower: job post, matching, apply, select reserves dates, no double booking', async () => {
  assert.equal((await call('/labour/jobs', 'POST', job({ startDate: day(-3) }), POSTER)).status, 400); assert.equal((await call('/labour/jobs', 'POST', job({ days: 90 }), POSTER)).status, 400);
  assert.equal((await call('/labour/jobs', 'POST', job({ trade: 'CLOWN' }), POSTER)).status, 400); assert.equal((await call('/labour/jobs', 'POST', job())).status, 401);
  const r = await call('/labour/jobs', 'POST', job(), POSTER); assert.equal(r.status, 201); JOB1 = (await r.json()).jobId; assert.equal(db.job_posts.at(-1).end_date, day(22));
  const seen = (await (await call('/labour/jobs', 'GET', null, W1)).json()); assert.equal(seen.items.length, 1); assert.equal('poster_phone' in seen.items[0], false); assert.ok(/not the employer/.test(seen.notice));
  assert.equal((await (await call('/labour/jobs', 'GET', null, W2)).json()).items.length, 0);                       // painter does not see a mason job
  assert.equal((await call(`/labour/jobs/${JOB1}/apply`, 'POST', {}, W2)).status, 400);
  assert.equal((await call(`/labour/jobs/${JOB1}/apply`, 'POST', {}, W1)).status, 201); assert.equal((await call(`/labour/jobs/${JOB1}/apply`, 'POST', {}, W1)).status, 409);
  assert.equal((await call(`/labour/jobs/${JOB1}/apply`, 'POST', {}, W3)).status, 201);
  const ap = (await (await call(`/labour/jobs/${JOB1}/applicants`, 'GET', null, POSTER)).json()).items; assert.equal(ap.length, 2); assert.equal(ap[0].phone, '');   // phone hidden until selected
  assert.equal((await call(`/labour/jobs/${JOB1}/applicants`, 'GET', null, W1)).status, 404);
  APP1 = ap.find((x) => x.name === 'Mason One').ROWID; const app3 = ap.find((x) => x.name === 'Mason Three').ROWID;
  assert.equal((await call(`/labour/applications/${APP1}/decision`, 'POST', { select: true }, W1)).status, 404);        // only the poster decides
  const sel = await call(`/labour/applications/${APP1}/decision`, 'POST', { select: true }, POSTER); assert.equal((await sel.json()).jobStatus, 'FILLED');
  assert.equal((await call(`/labour/applications/${app3}/decision`, 'POST', { select: true }, POSTER)).status, 409);    // headcount reached
  const mine = (await (await call('/labour/applications/mine', 'GET', null, W1)).json()).items[0]; assert.equal(mine.status, 'SELECTED'); assert.equal(mine.poster_phone, '9876500060');
  assert.equal((await (await call('/labour/applications/mine', 'GET', null, W3)).json()).items[0].poster_phone, '');
  assert.equal((await (await call(`/labour/jobs/${JOB1}/applicants`, 'GET', null, POSTER)).json()).items.find((x) => x.ROWID === APP1).phone, '9876500061');
  const j2 = (await (await call('/labour/jobs', 'POST', job({ startDate: day(21), days: 2, notes: 'second site' }), POSTER)).json()).jobId;
  assert.equal((await call(`/labour/jobs/${j2}/apply`, 'POST', {}, W1)).status, 409);                                    // W1 is booked on day 21
  assert.equal((await (await call('/labour/jobs', 'GET', null, W1)).json()).items.find((x) => x.ROWID === j2).busy, true);
});
test('manpower: release frees the dates and reopens the job', async () => {
  assert.equal((await call(`/labour/applications/${APP1}/release`, 'POST', {}, W1)).status, 404);
  assert.equal((await call(`/labour/applications/${APP1}/release`, 'POST', {}, POSTER)).status, 200);
  assert.equal(db.job_posts.find((x) => x.ROWID === JOB1).status, 'OPEN'); assert.equal(db.vendor_busy.filter((x) => x.request_id === 'JOB:' + APP1).length, 0);
  const j3 = (await (await call('/labour/jobs', 'POST', job({ startDate: day(21), days: 2, notes: 'overlap again' }), POSTER)).json()).jobId;
  assert.equal((await call(`/labour/jobs/${j3}/apply`, 'POST', {}, W1)).status, 201);                                    // W1 is free again
  await call(`/labour/jobs/${JOB1}/close`, 'POST', {}, POSTER); assert.equal((await call(`/labour/jobs/${JOB1}/close`, 'POST', {}, W1)).status, 404);
});
test('manpower: attendance, completion and two-way ratings', async () => {
  const jid = (await (await call('/labour/jobs', 'POST', job({ startDate: day(40), days: 2, notes: 'past job test' }), POSTER)).json()).jobId;
  assert.equal((await call(`/labour/jobs/${jid}/apply`, 'POST', {}, W3)).status, 201);
  const aid = (await (await call(`/labour/jobs/${jid}/applicants`, 'GET', null, POSTER)).json()).items[0].ROWID;
  assert.equal((await call(`/labour/applications/${aid}/attendance`, 'POST', { day: day(40), status: 'PRESENT' }, POSTER)).status, 409);   // not selected yet
  assert.equal((await call(`/labour/applications/${aid}/decision`, 'POST', { select: true }, POSTER)).status, 200);
  assert.equal((await call(`/labour/applications/${aid}/attendance`, 'POST', { day: day(40), status: 'PRESENT' }, POSTER)).status, 400);   // future day
  assert.equal((await call(`/labour/applications/${aid}/complete`, 'POST', {}, POSTER)).status, 409);                                       // job not over
  assert.equal((await call(`/labour/applications/${aid}/rate`, 'POST', { stars: 5 }, POSTER)).status, 409);                                // not completed
  const a = db.job_applications.find((x) => x.ROWID === aid); a.start_date = day(-3); a.end_date = day(-2);                                    // pretend the job happened
  assert.equal((await call(`/labour/applications/${aid}/attendance`, 'POST', { day: day(-4), status: 'PRESENT' }, POSTER)).status, 400);     // outside job dates
  assert.equal((await call(`/labour/applications/${aid}/attendance`, 'POST', { day: day(-3), status: 'PRESENT', otHours: 2 }, POSTER)).status, 200);
  assert.equal((await call(`/labour/applications/${aid}/attendance`, 'POST', { day: day(-3), status: 'ABSENT' }, POSTER)).status, 200); assert.equal(db.work_days.length, 1);   // updated, not duplicated
  assert.equal((await call(`/labour/applications/${aid}/attendance`, 'POST', { day: day(-2), status: 'PRESENT' }, W3)).status, 404);
  assert.equal((await (await call('/labour/applications/mine', 'GET', null, W3)).json()).items.find((x) => x.ROWID === aid).attendance[0].status, 'ABSENT');
  assert.equal((await call(`/labour/applications/${aid}/complete`, 'POST', {}, POSTER)).status, 200);
  assert.equal((await call(`/labour/applications/${aid}/rate`, 'POST', { stars: 9 }, POSTER)).status, 400);
  assert.equal((await call(`/labour/applications/${aid}/rate`, 'POST', { stars: 5 }, POSTER)).status, 200); assert.equal((await call(`/labour/applications/${aid}/rate`, 'POST', { stars: 4 }, POSTER)).status, 409);
  assert.equal((await call(`/labour/applications/${aid}/rate`, 'POST', { stars: 4 }, W3)).status, 200); assert.equal((await call(`/labour/applications/${aid}/rate`, 'POST', { stars: 4 }, W1)).status, 404);
  assert.equal((await (await call('/labour/profile', 'GET', null, W3)).json()).profile.rating, 5);
  assert.equal((await (await call('/labour/profile', 'GET', null, W3)).json()).profile.rating_sum, undefined);
});

// ---------------- money: passes, plans, gating, accounts ----------------
const setS = (b) => call('/admin/settings', 'PUT', b, ADMIN);
let PAYC, PAYV;
test('money: settings validated; gated listings need sign-in and an active client pass', async () => {
  assert.equal((await setS({ priceClient: 0 })).status, 400); assert.equal((await setS({ gated: ['MOON'] })).status, 400); assert.equal((await setS({ upiId: 'not a upi' })).status, 400);
  assert.equal((await call('/admin/settings', 'PUT', { priceClient: 5 }, await login('9876500070', 'Plain User'))).status, 403);
  const S = await (await setS({ gated: ['STORES', 'SELLERS', 'PROPERTY'], upiId: 'aaihyper@upi', upiName: 'AAi Hyper', freeSample: 2, priceClient: 100, daysClient: 15, priceVendor: 299, daysVendor: 30, gstPct: 18 })).json();
  assert.deepEqual(S.gated, ['STORES', 'SELLERS', 'PROPERTY']); assert.equal(S.freeSample, 2);
  const info = await (await call('/billing/info')).json(); assert.equal(info.client.price, 100); assert.equal(info.upi.id, 'aaihyper@upi'); assert.equal(info.vendor.sample, 2);
  const r = await call('/sellers'); assert.equal(r.status, 401); assert.equal((await r.json()).billing.client.days, 15);
  PAYC = await login('9876500071', 'Pay Client');
  for (const p of ['/stores', '/sellers', '/properties']) { const x = await call(p, 'GET', null, PAYC); assert.equal(x.status, 402, p); assert.equal((await x.json()).error.code, 'PAYMENT_REQUIRED'); }
  assert.equal((await call('/sellers/categories')).status, 200);                                                         // categories stay open
  for (const p of ['/stores', '/sellers', '/properties']) assert.equal((await call(p, 'GET', null, ADMIN)).status, 200, p);   // admin always sees
});
test('money: customer pays by UPI, admin confirms against the statement, pass starts; renewal extends; reject changes nothing', async () => {
  assert.equal((await call('/billing/pay', 'POST', { plan: 'CLIENT', utr: '123' }, PAYC)).status, 400);
  assert.equal((await call('/billing/pay', 'POST', { plan: 'GOLD', utr: '123456789012' }, PAYC)).status, 400);
  const p1 = await call('/billing/pay', 'POST', { plan: 'CLIENT', utr: '123456789012', amount: 1 }, PAYC); assert.equal(p1.status, 201); const pid = (await p1.json()).paymentId; assert.equal(db.payments.at(-1).amount, 100);   // amount comes from settings
  assert.equal((await call('/billing/pay', 'POST', { plan: 'CLIENT', utr: '123456789012' }, await login('9876500072', 'Copycat'))).status, 409);   // same reference cannot be reused
  assert.equal((await call('/sellers', 'GET', null, PAYC)).status, 402);                                               // pending is not enough
  assert.equal((await call(`/admin/payments/${pid}/decision`, 'POST', { confirm: true }, PAYC)).status, 403);
  assert.equal((await (await call('/admin/payments', 'GET', null, ADMIN)).json()).items.length, 1);
  const ok = await (await call(`/admin/payments/${pid}/decision`, 'POST', { confirm: true, note: 'checked in bank' }, ADMIN)).json(); const today = new Date(Date.now() + 19800000).toISOString().slice(0, 10);
  const add = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10); assert.equal(ok.validUntil, add(today, 14));      // 15 days including today
  assert.equal((await call(`/admin/payments/${pid}/decision`, 'POST', { confirm: true }, ADMIN)).status, 409);          // decided once
  const pay = db.payments.find((x) => x.ROWID === pid); assert.equal(pay.status, 'CONFIRMED'); assert.equal(pay.base_amount, 84.75); assert.equal(pay.gst_amount, 15.25);
  for (const p of ['/stores', '/sellers', '/properties']) assert.equal((await call(p, 'GET', null, PAYC)).status, 200, p);
  const me = await (await call('/billing/me', 'GET', null, PAYC)).json(); assert.equal(me.subs[0].daysLeft, 15); assert.equal(me.payments[0].status, 'CONFIRMED');
  await call('/billing/pay', 'POST', { plan: 'CLIENT', utr: '222222222222' }, PAYC); const pid2 = db.payments.at(-1).ROWID;       // renew while still active
  assert.equal((await (await call(`/admin/payments/${pid2}/decision`, 'POST', { confirm: true }, ADMIN)).json()).validUntil, add(today, 29));   // extends, no days lost
  await call('/billing/pay', 'POST', { plan: 'CLIENT', utr: '333333333333' }, PAYC); const pid3 = db.payments.at(-1).ROWID;
  assert.equal((await call(`/admin/payments/${pid3}/decision`, 'POST', { confirm: false, note: 'not in statement' }, ADMIN)).status, 200); assert.equal(db.payments.find((x) => x.ROWID === pid3).status, 'REJECTED');
  assert.equal(db.subscriptions.find((x) => x.user_id === db.users.find((u) => u.phone === '9876500071').ROWID).valid_until, add(today, 29));
  db.subscriptions.find((x) => x.plan === 'CLIENT').valid_until = add(today, -1);                                            // the pass runs out
  assert.equal((await call('/sellers', 'GET', null, PAYC)).status, 402);
  assert.equal((await call('/billing/me', 'GET', null, PAYC).then((r) => r.json())).subs[0].active, false);
});
test('money: vendor gets a free sample, then must subscribe; contact stays hidden while locked', async () => {
  assert.equal((await call('/admin/users', 'POST', { phone: '9876500073', name: 'Shop Vendor', role: 'VENDOR', storeId: '9' }, ADMIN)).status, 201);
  const v = await login('9876500073'); const cust = await login('9876500074', 'Shopper');
  const ord = async () => (await (await call('/orders', 'POST', { storeId: '9', address: '12 Temple St, Anna Nagar', slot: 'Today', items: [{ productId: '111', qty: 2 }, { productId: '112', qty: 1 }] }, cust)).json()).orderId;
  const o1 = await ord(), o2 = await ord(), o3 = await ord();
  const list = await (await call('/vendor/orders', 'GET', null, v)).json(); const row = list.items.find((x) => x.ROWID === o1);
  assert.equal(row.locked, true); assert.equal(row.customer_phone, ''); assert.equal(row.address, ''); assert.equal(list.sample.left, 2); assert.equal(list.active, false);
  assert.equal((await call(`/vendor/orders/${o1}/status`, 'PATCH', { status: 'DELIVERED' }, v)).status, 402);                     // must unlock first
  assert.equal((await call('/unlock', 'POST', { kind: 'ORD', refId: o1 }, cust)).status, 404);                                       // not their order
  assert.equal((await (await call('/unlock', 'POST', { kind: 'ORD', refId: o1 }, v)).json()).left, 1);
  assert.equal((await (await call('/unlock', 'POST', { kind: 'ORD', refId: o1 }, v)).json()).left, 1);                              // unlocking again is free
  const open = (await (await call('/vendor/orders', 'GET', null, v)).json()).items.find((x) => x.ROWID === o1); assert.equal(open.locked, false); assert.equal(open.customer_phone, '9876500074');
  assert.equal((await call(`/vendor/orders/${o1}/status`, 'PATCH', { status: 'DELIVERED' }, v)).status, 200);
  assert.equal((await (await call('/unlock', 'POST', { kind: 'ORD', refId: o2 }, v)).json()).left, 0);
  const lock = await call('/unlock', 'POST', { kind: 'ORD', refId: o3 }, v); assert.equal(lock.status, 402); const lj = await lock.json(); assert.equal(lj.billing.vendor.price, 299); assert.ok(/free customers are used/.test(lj.error.message));
  PAYV = v; assert.equal((await call('/billing/pay', 'POST', { plan: 'VENDOR', utr: '444444444444' }, v)).status, 201);
  assert.equal((await call('/unlock', 'POST', { kind: 'ORD', refId: o3 }, v)).status, 402);                                         // paying alone does not unlock
  const pid = db.payments.at(-1).ROWID; assert.equal(db.payments.at(-1).amount, 299);
  await call(`/admin/payments/${pid}/decision`, 'POST', { confirm: true }, ADMIN);
  assert.equal((await call('/unlock', 'POST', { kind: 'ORD', refId: o3 }, v)).status, 200);                                         // subscribed: everything opens
  assert.equal((await (await call('/vendor/orders', 'GET', null, v)).json()).items.every((x) => x.locked === false), true);
});
test('money: workers and artists also use up the free sample when they quote or apply', async () => {
  await call('/admin/users', 'POST', { phone: '9876500075', name: 'Plumber P', role: 'WORKER', skill: 'PLUMBING' }, ADMIN); const w = await login('9876500075'); const c = await login('9876500076', 'Home Owner');
  const ids = []; for (let i = 0; i < 3; i++) ids.push((await (await call('/services/requests', 'POST', { category: 'PLUMBING', description: 'Tap leaking ' + i + ' badly', address: '5 Gandhi Rd, Anna Nagar' }, c)).json()).requestId);
  assert.equal((await call(`/worker/requests/${ids[0]}/quote`, 'POST', { amount: 300 }, w)).status, 200); assert.equal((await call(`/worker/requests/${ids[1]}/quote`, 'POST', { amount: 300 }, w)).status, 200);
  const third = await call(`/worker/requests/${ids[2]}/quote`, 'POST', { amount: 300 }, w); assert.equal(third.status, 402); assert.equal((await third.json()).error.code, 'PAYMENT_REQUIRED');
  assert.equal(db.service_requests.find((x) => x.ROWID === ids[2]).status, 'NEW');                                                  // nothing was changed
});
test('money: accounts, revenue, offline payment, follow-ups and CSV for the admin', async () => {
  const today = new Date(Date.now() + 19800000).toISOString().slice(0, 10);
  assert.equal((await call('/admin/payments', 'POST', { phone: '9000011111', plan: 'CLIENT' }, ADMIN)).status, 404);                 // never signed in
  assert.equal((await call('/admin/payments', 'POST', { phone: '9876500074', plan: 'CLIENT' }, ADMIN)).status, 201); assert.equal(db.payments.at(-1).method, 'CASH');
  const rev = await (await call('/admin/revenue', 'GET', null, ADMIN)).json();
  assert.equal(rev.total.gross, 100 + 100 + 299 + 100); assert.equal(rev.byPlan.VENDOR.gross, 299); assert.equal(rev.byPlan.CLIENT.count, 3); assert.equal(rev.byMethod.CASH.gross, 100);
  assert.equal(rev.thisMonth.gross, rev.total.gross); assert.equal(rev.months.length, 6); assert.equal(rev.months.at(-1).gross, rev.total.gross); assert.equal(Math.round((rev.total.net + rev.total.gst) * 100) / 100, rev.total.gross);
  assert.equal(rev.active.VENDOR, 1); assert.equal(rev.active.CLIENT, 1); assert.equal(rev.pendingPayments, 0); assert.ok(/CA/.test(rev.note));
  assert.equal((await call('/admin/revenue', 'GET', null, PAYC)).status, 403);
  const exp = (await (await call('/admin/subscriptions?filter=expired', 'GET', null, ADMIN)).json()).items; assert.equal(exp.length, 1); assert.equal(exp[0].phone, '9876500071'); assert.equal(exp[0].status, 'EXPIRED');
  const sub = db.subscriptions.find((x) => x.plan === 'VENDOR'); sub.valid_until = new Date(Date.parse(today + 'T00:00:00Z') + 2 * 86400000).toISOString().slice(0, 10);
  assert.equal((await (await call('/admin/subscriptions?filter=expiring', 'GET', null, ADMIN)).json()).items[0].phone, '9876500073');
  const locked = (await (await call('/admin/subscriptions?filter=locked', 'GET', null, ADMIN)).json()).items; assert.ok(locked.some((x) => x.phone === '9876500075'));   // the plumber used both free customers
  assert.equal((await call('/admin/followups', 'POST', { userId: db.users.find((u) => u.phone === '9876500075').ROWID, plan: 'VENDOR', note: 'Called: will pay on Friday', dueDate: today }, ADMIN)).status, 201);
  assert.equal((await call('/admin/followups', 'POST', { userId: 'x', note: 'hi' }, ADMIN)).status, 400);
  const fu = (await (await call('/admin/followups', 'GET', null, ADMIN)).json()).items; assert.equal(fu.length, 1); assert.equal(fu[0].user_phone, '9876500075');
  assert.equal((await call(`/admin/followups/${fu[0].ROWID}`, 'PATCH', {}, ADMIN)).status, 200); assert.equal((await (await call('/admin/followups', 'GET', null, ADMIN)).json()).items.length, 0);
  db.payments.at(-1).user_name = '=HYPERLINK("http://evil")';
  const csv = await call('/admin/payments.csv', 'GET', null, ADMIN); assert.equal(csv.status, 200); assert.ok(/text\/csv/.test(csv.headers.get('content-type'))); const txt = await csv.text();
  assert.ok(txt.startsWith('"Date","Name"')); assert.ok(txt.includes('123456789012')); assert.ok(txt.includes('"\'=HYPERLINK'));                  // formula injection neutralised
  assert.equal((await call('/admin/payments.csv', 'GET', null, PAYC)).status, 403);
});

let SHOP, BUYER;
test('directory: gated listing, owner submits, admin approves; visibility follows the owner plan', async () => {
  await setS({ gated: ['STORES', 'SELLERS', 'PROPERTY', 'DIRECTORY'] });
  const today = new Date(Date.now() + 19800000).toISOString().slice(0, 10); const add = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  SHOP = await login('9876500080', 'Tailor Raja'); BUYER = await login('9876500081', 'Buyer Meena');
  const biz = (o) => ({ name: 'Raja Tailors', category: 'TAILOR', district: 'madurai', locality: 'Anna Nagar', about: 'Blouse and kurta stitching', timings: '9am - 8pm', offer: '10% off for new customers', ...o });
  assert.equal((await call('/directory', 'POST', biz({ category: 'WIZARD' }), SHOP)).status, 400); assert.equal((await call('/directory', 'POST', biz({ phone: '123' }), SHOP)).status, 400); assert.equal((await call('/directory', 'POST', biz())).status, 401);
  const r = await call('/directory', 'POST', biz(), SHOP); assert.equal(r.status, 201); const id = (await r.json()).businessId; assert.equal(db.businesses.at(-1).district, 'Madurai'); assert.equal(db.businesses.at(-1).phone, '9876500080'); assert.equal(db.users.find((u) => u.phone === '9876500080').name, 'Tailor Raja');   // the business name must not overwrite the owner's name
  assert.equal((await call('/directory', 'POST', biz(), SHOP)).status, 409);                                                    // duplicate
  assert.equal((await call('/directory', 'GET', null, BUYER)).status, 402);                                                    // buyer has no pass
  assert.equal((await call('/admin/payments', 'POST', { phone: '9876500081', plan: 'CLIENT' }, ADMIN)).status, 201);          // buyer gets a pass
  assert.equal((await (await call('/directory', 'GET', null, BUYER)).json()).items.length, 0);                                // pending: not listed
  assert.equal((await call(`/directory/${id}`, 'PATCH', { status: 'HIDDEN' }, SHOP)).status, 409);                             // needs approval first
  assert.equal((await call(`/admin/directory/${id}/decision`, 'POST', { approve: true }, SHOP)).status, 403);
  assert.equal((await (await call('/admin/directory', 'GET', null, ADMIN)).json()).items.length, 1);
  const ok = await (await call(`/admin/directory/${id}/decision`, 'POST', { approve: true }, ADMIN)).json(); assert.equal(ok.listedUntil, add(today, 29));   // free first period
  const list = (await (await call('/directory?category=TAILOR&district=madurai', 'GET', null, BUYER)).json()).items; assert.equal(list.length, 1); assert.equal(list[0].phone, '9876500080'); assert.equal('owner_id' in list[0], false); assert.equal('listed_until' in list[0], false);
  await call('/directory', 'POST', biz({ name: 'Star Bakery', category: 'BAKERY', locality: 'Gandhi Road' }), SHOP); const star = db.businesses.at(-1);
  await call(`/admin/directory/${star.ROWID}/decision`, 'POST', { approve: true }, ADMIN); await call(`/admin/directory/${star.ROWID}`, 'PATCH', { featured: true }, ADMIN);
  assert.equal((await (await call('/directory', 'GET', null, BUYER)).json()).items[0].name, 'Star Bakery');                   // featured (sponsored) first
  assert.equal((await (await call('/directory?category=TAILOR', 'GET', null, BUYER)).json()).items.length, 1);
  db.businesses.forEach((b) => { b.listed_until = add(today, -1); });                                                           // free period over, no plan
  assert.equal((await (await call('/directory', 'GET', null, BUYER)).json()).items.length, 0);
  const mine = await (await call('/directory/mine', 'GET', null, SHOP)).json(); assert.equal(mine.planActive, false); assert.equal(mine.items.every((x) => x.visible === false), true);
  assert.equal((await call('/admin/payments', 'POST', { phone: '9876500080', plan: 'VENDOR' }, ADMIN)).status, 201);          // owner pays the monthly plan
  assert.equal((await (await call('/directory', 'GET', null, BUYER)).json()).items.length, 2);
  assert.equal((await call(`/directory/${id}`, 'PATCH', { offer: '20% off this week', timings: '10am - 9pm', status: 'HIDDEN' }, BUYER)).status, 404);   // not the owner
  assert.equal((await call(`/directory/${id}`, 'PATCH', { offer: '20% off this week', timings: '10am - 9pm', status: 'HIDDEN' }, SHOP)).status, 200);
  assert.equal(db.businesses.find((x) => x.ROWID === id).offer, '20% off this week'); assert.equal((await (await call('/directory', 'GET', null, BUYER)).json()).items.length, 1);
  assert.equal((await call(`/admin/directory/${id}/decision`, 'POST', { approve: false, note: 'Wrong category' }, ADMIN)).status, 200); assert.equal(db.businesses.find((x) => x.ROWID === id).status, 'REJECTED');
});

// ---------------- grocery list reading and admin attention ----------------
const CAT = [{ ROWID: '501', store_id: '9', name_en: 'Rice', name_ta: 'அரிசி', unit: 'kg', price: 62, status: 'ACTIVE' }, { ROWID: '502', store_id: '9', name_en: 'Toor dal', name_ta: 'துவரம் பருப்பு', unit: 'kg', price: 165, status: 'ACTIVE' }, { ROWID: '503', store_id: '9', name_en: 'Sugar', name_ta: 'சர்க்கரை', unit: 'kg', price: 46, status: 'ACTIVE' }, { ROWID: '504', store_id: '9', name_en: 'Milk', name_ta: 'பால்', unit: '500 ml', price: 30, status: 'ACTIVE' }, { ROWID: '505', store_id: '9', name_en: 'Coconut oil', name_ta: 'தேங்காய் எண்ணெய்', unit: 'L', price: 210, status: 'ACTIVE' }];
test('list reading: typed list in English and Tamil is parsed and matched; unknown items need review', async () => {
  db.products.length = 0; db.products.push(...CAT); await setS({ gated: [] }); const c = await login('9876500090', 'List Maker');
  assert.equal((await call('/grocery/parse', 'POST', { text: '   ' }, c)).status, 400);
  const r = await (await call('/grocery/parse', 'POST', { text: 'rice 5 kg\n2kg sugar, milk 3\ntoor dal 1/2 kg; 1 1/2 kg coconut oil\nஅரிசி 5 கிலோ\n௩ பால்\nunicorn food 2' }, c)).json();
  const by = (raw) => r.items.find((x) => x.raw === raw);
  assert.equal(by('rice 5 kg').qty, 5); assert.equal(by('rice 5 kg').unit, 'kg'); assert.equal(by('rice 5 kg').productId, '501'); assert.equal(by('rice 5 kg').confidence, 0.95); assert.equal(by('rice 5 kg').needsReview, false);
  assert.equal(by('2kg sugar').qty, 2); assert.equal(by('2kg sugar').productId, '503'); assert.equal(by('milk 3').qty, 3); assert.equal(by('milk 3').unit, null);
  assert.equal(by('toor dal 1/2 kg').qty, 0.5); assert.equal(by('1 1/2 kg coconut oil').qty, 1.5); assert.equal(by('1 1/2 kg coconut oil').productId, '505');
  assert.equal(by('அரிசி 5 கிலோ').productId, '501'); assert.equal(by('அரிசி 5 கிலோ').unit, 'kg'); assert.equal(by('௩ பால்').qty, 3); assert.equal(by('௩ பால்').productId, '504');
  const u = by('unicorn food 2'); assert.equal(u.productId, ''); assert.equal(u.needsReview, true); assert.equal(u.confidence, 0);
  assert.equal(r.items.length, 8); assert.equal(by('rice 5 kg').price, 62);
  const near = (await (await call('/grocery/parse', 'POST', { text: 'tur dal\nsugar powder' }, c)).json()).items; assert.equal(near[1].productId, '503'); assert.equal(near[1].needsReview, true);   // partial match is flagged for review
});
test('list reading: photo is read by Zia OCR, parsed, never stored; bad input rejected', async () => {
  const c = await login('9876500091', 'Photo User'); const jpg = (n) => 'data:image/jpeg;base64,' + Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(n, 7)]).toString('base64');
  globalThis.ZIA_TEXT = 'Rice 5 kg\nSugar 2 kg\nSalt 1 kg';
  assert.equal((await call('/grocery/ocr', 'POST', { image: jpg(900) })).status, 401);
  assert.equal((await call('/grocery/ocr', 'POST', { image: jpg(900) }, c)).status, 400);                                          // no consent
  assert.equal((await call('/grocery/ocr', 'POST', { image: jpg(900), consent: true, }, c).then((r) => r.status)), 200);
  assert.equal((await call('/grocery/ocr', 'POST', { image: 'data:image/gif;base64,AAAA', consent: true }, c)).status, 400);
  assert.equal((await call('/grocery/ocr', 'POST', { image: 'data:image/jpeg;base64,' + Buffer.alloc(900, 1).toString('base64'), consent: true }, c)).status, 400);   // not a real JPEG
  assert.equal((await call('/grocery/ocr', 'POST', { image: jpg(10), consent: true }, c)).status, 400);                              // too small
  assert.equal((await call('/grocery/ocr', 'POST', { image: jpg(2100000), consent: true }, c)).status, 400);                         // too big
  const out = await (await call('/grocery/ocr', 'POST', { image: jpg(900), consent: true }, c)).json(); assert.equal(out.items.length, 3); assert.equal(out.items[0].productId, '501'); assert.equal(out.items[2].productId, ''); assert.ok(out.text.includes('Sugar'));
  assert.equal(fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith('list-')).length, 0);                                         // temp photo deleted
  globalThis.ZIA_FAIL = true; const bad = await call('/grocery/ocr', 'POST', { image: jpg(900), consent: true }, c); assert.equal(bad.status, 502); assert.ok(/type your list/.test((await bad.json()).error.message)); globalThis.ZIA_FAIL = false;
  assert.equal(fs.readdirSync(os.tmpdir()).filter((f) => f.startsWith('list-')).length, 0);
});
test('admin attention report counts pending work and flags incomplete listings', async () => {
  assert.equal((await call('/admin/attention', 'GET', null, await login('9876500092', 'Not Admin'))).status, 403);
  const a = await (await call('/admin/attention', 'GET', null, ADMIN)).json();
  for (const k of ['payments', 'properties', 'businesses', 'workers']) assert.equal(typeof a.toApprove[k], 'number');
  assert.equal(typeof a.waiting.quotes, 'number'); assert.ok(Array.isArray(a.storesWithoutProducts)); assert.ok(a.sellersIncomplete.length >= 1); assert.ok(/not AI/.test(a.note));
});
