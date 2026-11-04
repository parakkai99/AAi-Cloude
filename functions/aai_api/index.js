'use strict';
const express = require('express');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const catalyst = require('zcatalyst-sdk-node');
const app = express();
app.set('trust proxy', true);
const smallJson = express.json({ limit: '100kb' }); const photoJson = express.json({ limit: '3mb' });
app.use((req, res, next) => (req.path === '/grocery/ocr' ? photoJson : smallJson)(req, res, next));   // only the list-photo route may carry an image

// ---------- helpers ----------
const sdk = (req) => catalyst.initialize(req);
const zq = (req, q) => sdk(req).zcql().executeZCQLQuery(q);
const tbl = (req, t) => sdk(req).datastore().table(t);
const idStr = (v) => (/^\d{1,20}$/.test(String(v)) ? String(v) : null);   // ROWIDs exceed JS safe integers: keep as strings
const qtyOf = (v) => { const n = Number(v); return n > 0 && n <= 50 && Math.round(n * 2) === n * 2 ? n : null; };
const phoneOf = (v) => { const d = String(v || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''); return /^[6-9]\d{9}$/.test(d) ? d : null; };
const clean = (v, max) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const fail = (res, e, code = 500) => { if (code === 500) console.error(e); res.status(code).json({ error: { code: code === 500 ? 'SERVER_ERROR' : code === 429 ? 'RATE_LIMITED' : 'BAD_REQUEST', message: code === 500 ? 'Something went wrong. Please try again.' : String(e) } }); };
const hits = new Map();   // best-effort throttle (instances are ephemeral)
const limited = (key, max, ms) => { const now = Date.now(); const a = (hits.get(key) || []).filter((t) => now - t < ms); a.push(now); hits.set(key, a); if (hits.size > 5000) hits.clear(); return a.length > max; };
const tooMany = (res) => fail(res, 'Too many requests. Please wait a few minutes.', 429);
const ADMIN_PHONES = () => (process.env.ADMIN_PHONES || '').split(',').map(phoneOf).filter(Boolean);

// ---------- session tokens (HMAC-signed, HttpOnly cookie) ----------
let SECRET = process.env.AUTH_SECRET || null;
async function secret(req) {      // generated once and kept in the config table when AUTH_SECRET is not set
  if (SECRET) return SECRET;
  const r = await zq(req, "SELECT v FROM config WHERE k = 'auth_secret'");
  if (r.length) return (SECRET = r[0].config.v);
  const v = crypto.randomBytes(32).toString('hex');
  await tbl(req, 'config').insertRow({ k: 'auth_secret', v });
  return (SECRET = v);
}
const hmac = (s, t) => crypto.createHmac('sha256', s).update(t).digest('base64url');
const sign = (s, p) => { const b = Buffer.from(JSON.stringify(p)).toString('base64url'); return b + '.' + hmac(s, b); };
const unsign = (s, t) => {
  const [b, sig] = String(t || '').split('.'); if (!b || !sig) return null;
  const e = hmac(s, b); if (e.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(e), Buffer.from(sig))) return null;
  try { const p = JSON.parse(Buffer.from(b, 'base64url')); return p.exp > Date.now() / 1000 ? p : null; } catch (e2) { return null; }
};
const cookieOf = (req, n) => ((req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(n + '=')) || '').slice(n.length + 1);
const pub = (u) => ({ id: String(u.ROWID || u.id), name: u.name || '', phone: u.phone || '', role: u.role, storeId: u.store_id || u.storeId || '', skill: u.skill || '' });

async function me(req) {
  try {
    const p = unsign(await secret(req), cookieOf(req, 'aai_session'));
    if (p) {
      const r = await zq(req, `SELECT ROWID, phone, name, role, store_id, skill, status FROM users WHERE ROWID = ${idStr(p.uid) || 0}`);
      if (r.length && r[0].users.status !== 'DISABLED') return pub(r[0].users);
    }
  } catch (e) { console.error(e); }
  try {   // optional email sign-in (Catalyst hosted login) for admins only
    const c = await sdk(req).userManagement().getCurrentUser();
    const rn = c && c.role_details && c.role_details.role_name;
    if (c && (rn === 'App Administrator')) return { id: 'c' + c.user_id, name: c.first_name || 'Admin', phone: '', role: 'ADMIN', storeId: '' };
  } catch (e) { /* not signed in by email */ }
  return null;
}
const need = (roles) => async (req, res, next) => {
  const u = await me(req);
  if (!u) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in with your mobile number.' } });
  if (roles && !roles.includes(u.role)) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have access.' } });
  req.u = u; next();
};

// ---------- OTP ----------
function post(host, path) {
  return new Promise((ok, bad) => {
    const r = https.request({ host, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': 2 } }, (res) => {
      let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => (res.statusCode < 300 && !/"type"\s*:\s*"error"/.test(d) ? ok(d) : bad(new Error('SMS provider error ' + res.statusCode))));
    });
    r.on('error', bad); r.setTimeout(8000, () => r.destroy(new Error('SMS timeout'))); r.end('{}');
  });
}
function sendSms(phone, code) {   // SMS_PROVIDER=msg91 (+ MSG91_AUTH_KEY, MSG91_TEMPLATE_ID). Default "console" only logs the code.
  if ((process.env.SMS_PROVIDER || 'console').toLowerCase() === 'msg91') {
    return post('control.msg91.com', `/api/v5/otp?template_id=${encodeURIComponent(process.env.MSG91_TEMPLATE_ID)}&mobile=91${phone}&authkey=${encodeURIComponent(process.env.MSG91_AUTH_KEY)}&otp=${code}`);
  }
  console.log(`OTP (console mode) for ${phone}: ${code}`);
  return Promise.resolve();
}
const codeHash = (s, phone, code) => crypto.createHmac('sha256', s).update(phone + ':' + code).digest('hex');   // times below are epoch SECONDS

app.post('/auth/otp/send', async (req, res) => {
  const phone = phoneOf((req.body || {}).phone);
  if (!phone) return fail(res, 'Enter a valid 10-digit mobile number.', 400);
  if (limited('ip:otp:' + req.ip, Number(process.env.OTP_IP_LIMIT) || 120, 3600000)) return tooMany(res);   // per hour; many phones can share one carrier IP
  try {
    const now = Math.floor(Date.now() / 1000);
    const recent = await zq(req, `SELECT created_ms FROM otp_codes WHERE phone = '${phone}' AND created_ms > ${now - 3600} ORDER BY created_ms DESC`);
    if (recent.length >= 5) return tooMany(res);
    if (recent.length && now - Number(recent[0].otp_codes.created_ms) < 30) return fail(res, 'Please wait 30 seconds before asking for another code.', 429);
    const code = String(crypto.randomInt(100000, 1000000));
    await tbl(req, 'otp_codes').insertRow({ phone, code_hash: codeHash(await secret(req), phone, code), used: 'no', created_ms: now, expires_ms: now + 300, attempts: 0 });
    await sendSms(phone, code);
    res.json({ sent: true });
  } catch (e) { fail(res, e); }
});

async function upsertUser(req, phone, name) {
  const r = await zq(req, `SELECT ROWID, phone, name, role, store_id, status FROM users WHERE phone = '${phone}'`);
  const wantAdmin = ADMIN_PHONES().includes(phone);
  if (!r.length) {
    const row = await tbl(req, 'users').insertRow({ phone, name, role: wantAdmin ? 'ADMIN' : 'CUSTOMER', status: 'ACTIVE', store_id: '' });
    return { ROWID: row.ROWID, phone, name, role: wantAdmin ? 'ADMIN' : 'CUSTOMER', store_id: '', status: 'ACTIVE' };
  }
  const u = r[0].users; const patch = {};
  if (wantAdmin && u.role !== 'ADMIN') { patch.role = 'ADMIN'; u.role = 'ADMIN'; }
  if (name && !u.name) { patch.name = name; u.name = name; }
  if (Object.keys(patch).length) await tbl(req, 'users').updateRow({ ROWID: u.ROWID, ...patch });
  return u;
}

app.post('/auth/otp/verify', async (req, res) => {
  const b = req.body || {}; const phone = phoneOf(b.phone); const code = String(b.code || '').replace(/\D/g, '');
  if (!phone || code.length !== 6) return fail(res, 'Enter the 6-digit code.', 400);
  try {
    const now = Math.floor(Date.now() / 1000); const s = await secret(req);
    const r = await zq(req, `SELECT ROWID, code_hash, attempts, expires_ms FROM otp_codes WHERE phone = '${phone}' AND used = 'no' ORDER BY created_ms DESC LIMIT 1`);
    if (!r.length) return fail(res, 'Ask for a new code.', 400);
    const o = r[0].otp_codes; const t = tbl(req, 'otp_codes');
    if (now > Number(o.expires_ms) || Number(o.attempts) >= 5) { await t.updateRow({ ROWID: o.ROWID, used: 'yes' }); return fail(res, 'That code has expired. Ask for a new one.', 400); }
    const good = codeHash(s, phone, code);
    if (good.length !== o.code_hash.length || !crypto.timingSafeEqual(Buffer.from(good), Buffer.from(o.code_hash))) {
      await t.updateRow({ ROWID: o.ROWID, attempts: Number(o.attempts) + 1 }); return fail(res, 'Wrong code. Please try again.', 400);
    }
    await t.updateRow({ ROWID: o.ROWID, used: 'yes' });
    const u = await upsertUser(req, phone, clean(b.name, 80));
    if (u.status === 'DISABLED') return fail(res, 'This account is disabled.', 403);
    const age = 30 * 86400;
    res.setHeader('Set-Cookie', `aai_session=${sign(s, { uid: String(u.ROWID), exp: now + age })}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`);
    res.json({ user: pub(u) });
  } catch (e) { fail(res, e); }
});
app.post('/auth/logout', (req, res) => { res.setHeader('Set-Cookie', 'aai_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'); res.json({ ok: true }); });
app.get('/me', need(), (req, res) => res.json(req.u));
app.patch('/me', need(), async (req, res) => {
  const name = clean((req.body || {}).name, 80); if (name.length < 2 || req.u.id[0] === 'c') return fail(res, 'Enter your name.', 400);
  try { await tbl(req, 'users').updateRow({ ROWID: req.u.id, name }); res.json({ ok: true }); } catch (e) { fail(res, e); }
});

// ---------- money: client pass + vendor plan, manual UPI payments, free sample, gated listings ----------
const DEFAULTS = { price_client: '100', days_client: '15', price_vendor: '299', days_vendor: '30', free_sample: '5', gated: 'STORES,SELLERS,PROPERTY,DIRECTORY', upi_id: '', upi_name: 'AAi Hyper', gst_pct: '18' };
const GATE_MODULES = ['STORES', 'SELLERS', 'PROPERTY', 'DIRECTORY'];
let SETTINGS_CACHE = null;
async function settings(req) {
  if (SETTINGS_CACHE && Date.now() - SETTINGS_CACHE.t < 30000) return SETTINGS_CACHE.v;
  const m = { ...DEFAULTS };
  for (const r of await zq(req, 'SELECT k, v FROM config')) { const c = r.config; if (c.k in DEFAULTS && c.v !== null && c.v !== undefined) m[c.k] = String(c.v); }
  const v = { priceClient: Number(m.price_client), daysClient: Number(m.days_client), priceVendor: Number(m.price_vendor), daysVendor: Number(m.days_vendor), freeSample: Number(m.free_sample), gated: m.gated === 'NONE' ? [] : m.gated.split(',').filter((x) => GATE_MODULES.includes(x)), upiId: m.upi_id, upiName: m.upi_name, gstPct: Number(m.gst_pct) };
  SETTINGS_CACHE = { t: Date.now(), v }; return v;
}
const billingInfo = (S) => ({ gated: S.gated, client: { price: S.priceClient, days: S.daysClient }, vendor: { price: S.priceVendor, days: S.daysVendor, sample: S.freeSample }, upi: { id: S.upiId, name: S.upiName }, gstPct: S.gstPct });
const payRequired = (res, S, msg) => res.status(402).json({ error: { code: 'PAYMENT_REQUIRED', message: msg }, billing: billingInfo(S) });
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const dayDiff = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
const todayStr = () => new Date(Date.now() + 19800000).toISOString().slice(0, 10);   // India date
const r2 = (n) => Math.round(Number(n) * 100) / 100;
const subOf = async (req, uid, plan) => { const r = await zq(req, `SELECT ROWID, user_id, plan, valid_until, started_on FROM subscriptions WHERE skey = '${uid}:${plan}'`); return r.length ? r[0].subscriptions : null; };
const isActive = (s) => !!s && s.valid_until >= todayStr();
async function allRows(req, table, cols, where = '') {   // ZCQL returns at most 300 rows per query
  const out = []; for (let off = 0; off < 6000; off += 300) { const r = await zq(req, `SELECT ${cols} FROM ${table} ${where} LIMIT ${off}, 300`); out.push(...r.map((x) => x[table])); if (r.length < 300) break; } return out;
}
const gate = (mod) => async (req, res, next) => {   // customers must hold an active pass to see gated listings
  try { const S = await settings(req); if (!S.gated.includes(mod)) return next();
    const u = await me(req);
    if (!u) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in with your mobile number to see the listings.' }, billing: billingInfo(S) });
    if (u.role === 'ADMIN' || isActive(await subOf(req, u.id, 'CLIENT'))) { req.u = u; return next(); }
    return payRequired(res, S, `Pay ₹${S.priceClient} to see all listings for ${S.daysClient} days.`);
  } catch (e) { fail(res, e); }
};
// vendors: free sample of N customers, then a monthly plan
async function lockState(req, u) {
  const S = await settings(req); if (u.role === 'ADMIN') return { S, open: true, set: new Set(), left: 999, used: 0 };
  const open = isActive(await subOf(req, u.id, 'VENDOR'));
  const rows = (await zq(req, `SELECT kind, ref_id FROM unlocks WHERE user_id = '${u.id}' LIMIT 300`)).map((r) => r.unlocks);
  return { S, open, set: new Set(rows.map((r) => `${r.kind}:${r.ref_id}`)), used: rows.length, left: Math.max(0, S.freeSample - rows.length) };
}
const isOpen = (ls, kind, id) => ls.open || ls.set.has(`${kind}:${id}`);
async function useReferral(req, res, u, kind, id) {   // allowed? uses one free sample when needed; otherwise answers 402
  const ls = await lockState(req, u); if (isOpen(ls, kind, id)) return true;
  if (ls.left > 0) { try { await tbl(req, 'unlocks').insertRow({ ukey: `${u.id}:${kind}:${id}`, user_id: u.id, kind, ref_id: String(id) }); } catch (e) { /* already unlocked */ } return true; }
  payRequired(res, ls.S, `Your ${ls.S.freeSample} free customers are used. Pay ₹${ls.S.priceVendor} for ${ls.S.daysVendor} days to continue.`); return false;
}
async function maskFor(req, u, kind, rows, idKey, fields) {   // hide customer contact on locked items
  const ls = await lockState(req, u);
  return { items: rows.map((x) => { const locked = !isOpen(ls, kind, x[idKey]); if (locked) for (const f of fields) x[f] = ''; return { ...x, locked }; }), sample: { left: ls.left, total: ls.S.freeSample }, active: ls.open, billing: billingInfo(ls.S) };
}
async function activate(req, user, plan, amount, days, S) {   // start or extend a pass/plan
  const sub = await subOf(req, user.id, plan); const t = todayStr(); const start = sub && sub.valid_until >= t ? addDays(sub.valid_until, 1) : t; const end = addDays(start, days - 1);
  const data = { user_id: user.id, user_name: user.name || '', user_phone: user.phone || '', plan, valid_until: end, started_on: sub ? sub.started_on : t };
  if (sub) await tbl(req, 'subscriptions').updateRow({ ROWID: sub.ROWID, ...data }); else await tbl(req, 'subscriptions').insertRow({ skey: `${user.id}:${plan}`, ...data });
  const base = r2(amount / (1 + S.gstPct / 100)); return { start, end, base, gst: r2(amount - base) };
}
app.get('/billing/info', async (req, res) => { try { res.json(billingInfo(await settings(req))); } catch (e) { fail(res, e); } });
app.get('/billing/me', need(), async (req, res) => {
  try { const S = await settings(req); const t = todayStr();
    const subs = (await zq(req, `SELECT plan, valid_until FROM subscriptions WHERE user_id = '${req.u.id}'`)).map((r) => r.subscriptions).map((x) => ({ plan: x.plan, valid_until: x.valid_until, active: x.valid_until >= t, daysLeft: x.valid_until >= t ? dayDiff(t, x.valid_until) + 1 : 0 }));
    const payments = (await zq(req, `SELECT ROWID, plan, amount, utr, status, note, period_end FROM payments WHERE user_id = '${req.u.id}' ORDER BY CREATEDTIME DESC LIMIT 10`)).map((r) => r.payments);
    const ls = await lockState(req, req.u); res.json({ subs, payments, sample: { used: ls.used, total: S.freeSample, left: ls.left }, billing: billingInfo(S) }); } catch (e) { fail(res, e); }
});
app.post('/billing/pay', need(), async (req, res) => {   // the customer paid by UPI and sends the reference; the admin confirms it
  const b = req.body || {}; const plan = String(b.plan || '').toUpperCase(); const utr = String(b.utr || '').replace(/\s/g, '');
  if (!['CLIENT', 'VENDOR'].includes(plan)) return fail(res, 'Choose a plan.', 400);
  if (!/^\d{12}$/.test(utr)) return fail(res, 'Enter the 12-digit UPI reference number (UTR) from your payment.', 400);
  if (limited('pay:' + req.u.id, 5, 86400000)) return tooMany(res);
  try { const S = await settings(req);
    if ((await zq(req, `SELECT ROWID FROM payments WHERE user_id = '${req.u.id}' AND status = 'PENDING'`)).length >= 2) return fail(res, 'You already have payments waiting for confirmation.', 409);
    const amount = plan === 'CLIENT' ? S.priceClient : S.priceVendor; const days = plan === 'CLIENT' ? S.daysClient : S.daysVendor;
    try { const row = await tbl(req, 'payments').insertRow({ user_id: req.u.id, user_name: req.u.name, user_phone: req.u.phone, plan, utr, status: 'PENDING', method: 'UPI', note: '', period_start: '', period_end: '', confirmed_on: '', decided_by: '', amount, base_amount: 0, gst_amount: 0, days });
      res.status(201).json({ paymentId: String(row.ROWID), status: 'PENDING', amount }); } catch (e) { return fail(res, 'This reference number was already used.', 409); } } catch (e) { fail(res, e); }
});
app.post('/unlock', need(), async (req, res) => {   // vendor reveals a customer's contact: uses one free sample unless subscribed
  const b = req.body || {}; const kind = String(b.kind || ''); const id = idStr(b.refId); if (!['ORD', 'QUO', 'LEAD'].includes(kind) || !id) return fail(res, 'Bad request.', 400);
  try { const T = { ORD: ['orders', 'store_id'], QUO: ['quotes', 'store_id'], LEAD: ['seller_leads', 'seller_id'] }[kind];
    if (req.u.role !== 'ADMIN') { const r = await zq(req, `SELECT ROWID, ${T[1]} FROM ${T[0]} WHERE ROWID = ${id}`); if (!r.length || String(r[0][T[0]][T[1]]) !== String(req.u.storeId)) return fail(res, 'Not found.', 404); }
    if (!(await useReferral(req, res, req.u, kind, id))) return; const ls = await lockState(req, req.u); res.json({ ok: true, left: ls.left }); } catch (e) { fail(res, e); }
});

// ---------- public catalogue ----------
app.get('/health', (q, r) => r.json({ ok: true, service: 'aai-hyper-api' }));
app.get('/stores', gate('STORES'), async (req, res) => {
  try { const rows = await zq(req, "SELECT ROWID, name_en, name_ta, delivery_fee, min_order, eta, whatsapp FROM stores WHERE status = 'ACTIVE'"); res.json({ items: rows.map((r) => r.stores) }); } catch (e) { fail(res, e); }
});
app.get('/stores/:id/products', gate('STORES'), async (req, res) => {
  const id = idStr(req.params.id); if (!id) return fail(res, 'Invalid store.', 400);
  try { const rows = await zq(req, `SELECT ROWID, name_en, name_ta, unit, price FROM products WHERE store_id = '${id}' AND status = 'ACTIVE'`); res.json({ items: rows.map((r) => r.products) }); } catch (e) { fail(res, e); }
});

async function priceBasket(req, storeId, items) {   // prices always come from the database
  if (!Array.isArray(items) || !items.length || items.length > 60) throw 'Add at least one item.';
  const ids = items.map((i) => idStr(i.productId)); if (ids.includes(null)) throw 'Invalid product.';
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
async function storeInfo(req, sid) { const st = await zq(req, `SELECT ROWID, delivery_fee, min_order FROM stores WHERE ROWID = ${sid} AND status = 'ACTIVE'`); return st.length ? st[0].stores : null; }
async function ensureName(req, b) {
  const name = clean(b.name || req.u.name, 80); if (name.length < 2) throw 'Enter your name.';
  if (name !== req.u.name && req.u.id[0] !== 'c') { await tbl(req, 'users').updateRow({ ROWID: req.u.id, name }); req.u.name = name; }
  return name;
}

// ---------- customer: order (sent to store) and get quote ----------
app.post('/orders', need(), async (req, res) => {
  const b = req.body || {}; const sid = idStr(b.storeId); const address = clean(b.address, 255);
  if (!sid) return fail(res, 'Choose a store.', 400);
  if (address.length < 5) return fail(res, 'Enter your delivery address.', 400);
  if (limited('o:' + req.u.id, 10, 600000)) return tooMany(res);
  try {
    const name = await ensureName(req, b);
    const st = await storeInfo(req, sid); if (!st) return fail(res, 'Store not found.', 404);
    const { subtotal, lines } = await priceBasket(req, sid, b.items);
    if (subtotal < Number(st.min_order)) return fail(res, `Minimum order for this store is Rs ${st.min_order}.`, 400);
    const fee = Number(st.delivery_fee);
    const row = await tbl(req, 'orders').insertRow({ customer_id: req.u.id, customer_name: name, customer_phone: req.u.phone, store_id: sid, address, slot: clean(b.slot, 60), payment: 'none', subtotal, delivery_fee: fee, total: subtotal + fee, status: 'PLACED' });
    await tbl(req, 'order_items').insertRows(lines.map((l) => ({ order_id: String(row.ROWID), ...l })));
    res.status(201).json({ orderId: String(row.ROWID), total: subtotal + fee, status: 'PLACED' });
  } catch (e) { typeof e === 'string' ? fail(res, e, 400) : fail(res, e); }
});
app.get('/orders/mine', need(), async (req, res) => {
  try {
    const rows = await zq(req, `SELECT ROWID, store_id, total, status, slot, CREATEDTIME FROM orders WHERE customer_id = '${req.u.id}' ORDER BY CREATEDTIME DESC LIMIT 30`);
    const items = rows.length ? await zq(req, `SELECT order_id, name, qty FROM order_items WHERE order_id IN (${rows.map((r) => `'${r.orders.ROWID}'`).join(',')})`) : [];
    res.json({ items: rows.map((r) => ({ ...r.orders, lines: items.filter((i) => i.order_items.order_id === String(r.orders.ROWID)).map((i) => i.order_items) })) });
  } catch (e) { fail(res, e); }
});
app.post('/quotes', need(), async (req, res) => {
  const b = req.body || {}; const text = clean(b.text, 255);
  if (!text && !(Array.isArray(b.items) && b.items.length)) return fail(res, 'Tell us what you need.', 400);
  if (limited('q:' + req.u.id, 10, 600000)) return tooMany(res);
  try {
    const name = await ensureName(req, b); const sid = idStr(b.storeId) || ''; let estimate = 0;
    if (sid && Array.isArray(b.items) && b.items.length) estimate = (await priceBasket(req, sid, b.items)).subtotal;
    const row = await tbl(req, 'quotes').insertRow({ name, phone: req.u.phone, store_id: sid, items_text: text, address: clean(b.address, 255), status: 'NEW', estimate });
    res.status(201).json({ quoteId: String(row.ROWID), estimate });
  } catch (e) { typeof e === 'string' ? fail(res, e, 400) : fail(res, e); }
});

// ---------- vendor ----------
const storeFor = (req) => (req.u.role === 'ADMIN' ? idStr(req.query.storeId) : idStr(req.u.storeId));
app.get('/vendor/orders', need(['VENDOR', 'ADMIN']), async (req, res) => {
  try { const sid = storeFor(req); if (req.u.role !== 'ADMIN' && !sid) return res.json({ items: [] });
    const rows = await zq(req, `SELECT ROWID, store_id, customer_name, customer_phone, total, status, slot, address, CREATEDTIME FROM orders ${sid ? `WHERE store_id = '${sid}'` : ''} ORDER BY CREATEDTIME DESC LIMIT 100`);
    res.json(await maskFor(req, req.u, 'ORD', rows.map((r) => r.orders), 'ROWID', ['customer_phone', 'address'])); } catch (e) { fail(res, e); }
});
app.patch('/vendor/orders/:id/status', need(['VENDOR', 'ADMIN']), async (req, res) => {
  const id = idStr(req.params.id); const next = (req.body || {}).status;
  if (!id || !['DELIVERED', 'REJECTED'].includes(next)) return fail(res, 'Status must be DELIVERED or REJECTED.', 400);
  try { const o = await zq(req, `SELECT ROWID, status, store_id FROM orders WHERE ROWID = ${id}`);
    if (!o.length || (req.u.role !== 'ADMIN' && String(o[0].orders.store_id) !== String(req.u.storeId))) return fail(res, 'Order not found.', 404);
    if (o[0].orders.status !== 'PLACED') return fail(res, 'This order is already closed.', 409);
    { const ls = await lockState(req, req.u); if (!isOpen(ls, 'ORD', id)) return payRequired(res, ls.S, 'Unlock this customer first (uses a free sample), or subscribe.'); }
    await tbl(req, 'orders').updateRow({ ROWID: id, status: next }); res.json({ orderId: id, status: next }); } catch (e) { fail(res, e); }
});
app.get('/vendor/quotes', need(['VENDOR', 'ADMIN']), async (req, res) => {
  try { const sid = storeFor(req); if (req.u.role !== 'ADMIN' && !sid) return res.json({ items: [] });
    const rows = await zq(req, `SELECT ROWID, store_id, name, phone, items_text, estimate, status, CREATEDTIME FROM quotes ${sid ? `WHERE store_id = '${sid}'` : ''} ORDER BY CREATEDTIME DESC LIMIT 100`);
    res.json(await maskFor(req, req.u, 'QUO', rows.map((r) => r.quotes), 'ROWID', ['phone'])); } catch (e) { fail(res, e); }
});
app.patch('/vendor/quotes/:id', need(['VENDOR', 'ADMIN']), async (req, res) => {
  const id = idStr(req.params.id); if (!id) return fail(res, 'Invalid quote.', 400);
  try { const q = await zq(req, `SELECT ROWID, store_id FROM quotes WHERE ROWID = ${id}`);
    if (!q.length || (req.u.role !== 'ADMIN' && String(q[0].quotes.store_id) !== String(req.u.storeId))) return fail(res, 'Quote not found.', 404);
    { const ls = await lockState(req, req.u); if (!isOpen(ls, 'QUO', id)) return payRequired(res, ls.S, 'Unlock this customer first (uses a free sample), or subscribe.'); }
    await tbl(req, 'quotes').updateRow({ ROWID: id, status: 'REPLIED' }); res.json({ ok: true }); } catch (e) { fail(res, e); }
});
app.post('/vendor/products', need(['VENDOR', 'ADMIN']), async (req, res) => {
  const b = req.body || {}; const sid = req.u.role === 'ADMIN' ? idStr(b.storeId) : idStr(req.u.storeId); const price = Number(b.price);
  if (!sid || clean(b.name_en, 120).length < 2 || !(price > 0)) return fail(res, 'Store, name and price are required.', 400);
  try { const row = await tbl(req, 'products').insertRow({ store_id: sid, name_en: clean(b.name_en, 120), name_ta: clean(b.name_ta, 120), unit: clean(b.unit, 30), price, status: 'ACTIVE' });
    res.status(201).json({ productId: String(row.ROWID) }); } catch (e) { fail(res, e); }
});

// ---------- home services: customer asks, a local worker quotes, customer accepts ----------
const CATS = ['PLUMBING', 'ELECTRICAL', 'CLEANING', 'APPLIANCE', 'PAINTING', 'CARPENTRY', 'OTHER'];
app.get('/services/categories', (q, r) => r.json({ items: CATS }));
app.post('/services/requests', need(), async (req, res) => {
  const b = req.body || {}; const category = String(b.category || '').toUpperCase(); const description = clean(b.description, 255); const address = clean(b.address, 255);
  if (!CATS.includes(category)) return fail(res, 'Choose a service.', 400);
  if (description.length < 5) return fail(res, 'Describe the problem.', 400);
  if (address.length < 5) return fail(res, 'Enter your address.', 400);
  if (limited('s:' + req.u.id, 10, 600000)) return tooMany(res);
  try { const name = await ensureName(req, b);
    const row = await tbl(req, 'service_requests').insertRow({ customer_id: req.u.id, customer_name: name, customer_phone: req.u.phone, category, description, address, preferred: clean(b.preferred, 60), status: 'NEW', worker_id: '', worker_name: '', worker_phone: '', note: '', quote_amount: 0 });
    res.status(201).json({ requestId: String(row.ROWID), status: 'NEW' }); } catch (e) { typeof e === 'string' ? fail(res, e, 400) : fail(res, e); }
});
app.get('/services/mine', need(), async (req, res) => {
  try { const rows = await zq(req, `SELECT ROWID, category, description, preferred, status, worker_name, worker_phone, note, quote_amount FROM service_requests WHERE customer_id = '${req.u.id}' ORDER BY CREATEDTIME DESC LIMIT 30`);
    res.json({ items: rows.map((r) => { const x = r.service_requests; if (!['ACCEPTED', 'DONE'].includes(x.status)) x.worker_phone = ''; return x; }) }); } catch (e) { fail(res, e); }
});
app.post('/services/requests/:id/respond', need(), async (req, res) => {   // customer accepts or declines the quote
  const id = idStr(req.params.id); const accept = (req.body || {}).accept === true; if (!id) return fail(res, 'Invalid request.', 400);
  try { const r = await zq(req, `SELECT ROWID, customer_id, status FROM service_requests WHERE ROWID = ${id}`);
    if (!r.length || r[0].service_requests.customer_id !== req.u.id) return fail(res, 'Request not found.', 404);
    if (r[0].service_requests.status !== 'QUOTED') return fail(res, 'There is no quote to answer.', 409);
    await tbl(req, 'service_requests').updateRow(accept ? { ROWID: id, status: 'ACCEPTED' } : { ROWID: id, status: 'NEW', worker_id: '', worker_name: '', worker_phone: '', note: '', quote_amount: 0 });   // declined: open to other workers
    res.json({ status: accept ? 'ACCEPTED' : 'NEW' }); } catch (e) { fail(res, e); }
});
app.get('/worker/requests', need(['WORKER', 'ADMIN']), async (req, res) => {
  try { const admin = req.u.role === 'ADMIN'; const skill = CATS.includes(req.u.skill) ? req.u.skill : '-';
    const where = admin ? '' : `WHERE (status = 'NEW' AND category = '${skill}') OR worker_id = '${req.u.id}'`;
    const rows = await zq(req, `SELECT ROWID, category, description, address, preferred, status, customer_name, customer_phone, worker_id, worker_name, note, quote_amount FROM service_requests ${where} ORDER BY CREATEDTIME DESC LIMIT 100`);
    res.json({ items: rows.map((r) => { const x = r.service_requests; const reveal = admin || (x.worker_id === req.u.id && ['ACCEPTED', 'DONE'].includes(x.status));
      if (!reveal) { x.customer_phone = ''; x.address = ''; } return x; }) }); } catch (e) { fail(res, e); }
});
app.post('/worker/requests/:id/quote', need(['WORKER']), async (req, res) => {
  const id = idStr(req.params.id); const b = req.body || {}; const amount = Number(b.amount);
  if (!id || !(amount > 0 && amount <= 1000000)) return fail(res, 'Enter the quote amount in rupees.', 400);
  try { const r = await zq(req, `SELECT ROWID, category, status FROM service_requests WHERE ROWID = ${id}`);
    const x = r.length && r[0].service_requests; if (!x || x.category !== req.u.skill) return fail(res, 'Request not found.', 404);
    if (x.status !== 'NEW') return fail(res, 'Another worker already quoted this job.', 409);
    if (!(await useReferral(req, res, req.u, 'SVC', id))) return;
    await tbl(req, 'service_requests').updateRow({ ROWID: id, status: 'QUOTED', worker_id: req.u.id, worker_name: req.u.name, worker_phone: req.u.phone, quote_amount: amount, note: clean(b.note, 255) });
    res.json({ status: 'QUOTED' }); } catch (e) { fail(res, e); }
});
app.post('/worker/requests/:id/done', need(['WORKER', 'ADMIN']), async (req, res) => {
  const id = idStr(req.params.id); if (!id) return fail(res, 'Invalid request.', 400);
  try { const r = await zq(req, `SELECT ROWID, worker_id, status FROM service_requests WHERE ROWID = ${id}`);
    const x = r.length && r[0].service_requests; if (!x || (req.u.role !== 'ADMIN' && x.worker_id !== req.u.id)) return fail(res, 'Request not found.', 404);
    if (x.status !== 'ACCEPTED') return fail(res, 'The customer has not accepted this quote yet.', 409);
    await tbl(req, 'service_requests').updateRow({ ROWID: id, status: 'DONE' }); res.json({ status: 'DONE' }); } catch (e) { fail(res, e); }
});

// ---------- events: enquiry -> artist quote -> customer accepts -> dates reserved (no double booking) ----------
const ECATS = ['NADASWARAM', 'SINGER', 'THAVIL', 'DJ_ORCHESTRA', 'CATERING', 'DECORATION', 'PHOTOGRAPHY', 'PANDIT', 'SOUND_LIGHT', 'OTHER'];
const ETYPES = ['TEMPLE_FESTIVAL', 'WEDDING', 'ENGAGEMENT', 'BIRTHDAY', 'HOUSEWARMING', 'COMMUNITY', 'RELIGIOUS', 'CORPORATE', 'OTHER'];
const todayIST = () => new Date(Date.now() + 19800000).toISOString().slice(0, 10);
const isDay = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
const daysBetween = (a, b) => { const o = []; for (let t = Date.parse(a + 'T00:00:00Z'), e = Date.parse(b + 'T00:00:00Z'); t <= e; t += 86400000) o.push(new Date(t).toISOString().slice(0, 10)); return o; };
function dayRange(from, to, maxSpan) {   // future dates only, up to one year ahead
  if (!isDay(from) || !isDay(to)) throw 'Enter valid dates.';
  const t = todayIST(); const limit = new Date(Date.parse(t + 'T00:00:00Z') + 366 * 86400000).toISOString().slice(0, 10);
  if (from < t) throw 'The date cannot be in the past.'; if (to < from) throw 'The end date is before the start date.'; if (to > limit) throw 'Events can be booked up to one year ahead.';
  const d = daysBetween(from, to); if (d.length > maxSpan) throw `Choose at most ${maxSpan} days.`; return d;
}
async function reserve(req, vendorId, days, requestId) {   // unique slot_key (vendor:day) makes double booking impossible, even under a race
  const made = [];
  try { for (const d of days) made.push((await tbl(req, 'vendor_busy').insertRow({ slot_key: `${vendorId}:${d}`, vendor_id: vendorId, day: d, request_id: requestId })).ROWID); return true; }
  catch (e) { for (const id of made) await tbl(req, 'vendor_busy').deleteRow(id).catch(() => {}); return false; }
}
async function freeRequest(req, requestId) { const r = await zq(req, `SELECT ROWID FROM vendor_busy WHERE request_id = '${requestId}'`); for (const x of r) await tbl(req, 'vendor_busy').deleteRow(x.vendor_busy.ROWID); }
const busyOf = async (req, vendorId) => (await zq(req, `SELECT ROWID, day, request_id FROM vendor_busy WHERE vendor_id = '${vendorId}' LIMIT 300`)).map((r) => r.vendor_busy);
const OPEN = { NEW: 1, QUOTED: 1, BOOKED: 1 };

app.get('/events/categories', (q, r) => r.json({ services: ECATS, types: ETYPES }));
app.post('/events/requests', need(), async (req, res) => {
  const b = req.body || {}; const category = String(b.category || '').toUpperCase(); const eventType = String(b.eventType || '').toUpperCase();
  const venue = clean(b.venue, 120); const guests = Number(b.guests) || 0; const budget = Number(b.budget) || 0;
  if (!ECATS.includes(category)) return fail(res, 'Choose the service you need.', 400);
  if (!ETYPES.includes(eventType)) return fail(res, 'Choose the event type.', 400);
  if (venue.length < 3) return fail(res, 'Enter the venue or village.', 400);
  if (guests < 0 || guests > 100000 || budget < 0 || budget > 100000000) return fail(res, 'Check the guests and budget.', 400);
  if (limited('e:' + req.u.id, 10, 600000)) return tooMany(res);
  try { dayRange(b.dateFrom, b.dateTo, 14); const name = await ensureName(req, b);
    const row = await tbl(req, 'event_requests').insertRow({ customer_id: req.u.id, customer_name: name, customer_phone: req.u.phone, category, event_type: eventType, date_from: b.dateFrom, date_to: b.dateTo, venue, description: clean(b.description, 255), status: 'NEW', vendor_id: '', vendor_name: '', vendor_phone: '', note: '', guests, budget, quote_amount: 0 });
    res.status(201).json({ requestId: String(row.ROWID), status: 'NEW' }); } catch (e) { typeof e === 'string' ? fail(res, e, 400) : fail(res, e); }
});
app.get('/events/mine', need(), async (req, res) => {
  try { const rows = await zq(req, `SELECT ROWID, category, event_type, date_from, date_to, venue, status, vendor_name, vendor_phone, note, quote_amount FROM event_requests WHERE customer_id = '${req.u.id}' ORDER BY CREATEDTIME DESC LIMIT 30`);
    res.json({ items: rows.map((r) => { const x = r.event_requests; if (!['BOOKED', 'DONE'].includes(x.status)) x.vendor_phone = ''; return x; }) }); } catch (e) { fail(res, e); }
});
async function myEvent(req, res) {
  const id = idStr(req.params.id); if (!id) { fail(res, 'Invalid request.', 400); return null; }
  const r = await zq(req, `SELECT ROWID, customer_id, status, vendor_id, date_from, date_to FROM event_requests WHERE ROWID = ${id}`);
  if (!r.length || r[0].event_requests.customer_id !== req.u.id) { fail(res, 'Request not found.', 404); return null; }
  return r[0].event_requests;
}
const REOPEN = { status: 'NEW', vendor_id: '', vendor_name: '', vendor_phone: '', note: '', quote_amount: 0 };
app.post('/events/requests/:id/respond', need(), async (req, res) => {
  try { const x = await myEvent(req, res); if (!x) return;
    if (x.status !== 'QUOTED') return fail(res, 'There is no quote to answer.', 409);
    if ((req.body || {}).accept === true) {
      if (!(await reserve(req, x.vendor_id, daysBetween(x.date_from, x.date_to), String(x.ROWID)))) {
        await tbl(req, 'event_requests').updateRow({ ROWID: x.ROWID, ...REOPEN }); return fail(res, 'Sorry, that artist is no longer free on those dates. Your request is open to others again.', 409);
      }
      await tbl(req, 'event_requests').updateRow({ ROWID: x.ROWID, status: 'BOOKED' }); return res.json({ status: 'BOOKED' });
    }
    await tbl(req, 'event_requests').updateRow({ ROWID: x.ROWID, ...REOPEN }); res.json({ status: 'NEW' }); } catch (e) { fail(res, e); }
});
app.post('/events/requests/:id/cancel', need(), async (req, res) => {
  try { const x = await myEvent(req, res); if (!x) return;
    if (!OPEN[x.status]) return fail(res, 'This request is already closed.', 409);
    await freeRequest(req, String(x.ROWID)); await tbl(req, 'event_requests').updateRow({ ROWID: x.ROWID, status: 'CANCELLED' }); res.json({ status: 'CANCELLED' }); } catch (e) { fail(res, e); }
});
// artists (event vendors)
app.get('/artist/requests', need(['ARTIST', 'ADMIN']), async (req, res) => {
  try { const admin = req.u.role === 'ADMIN'; const skill = ECATS.includes(req.u.skill) ? req.u.skill : '-';
    const rows = await zq(req, `SELECT ROWID, category, event_type, date_from, date_to, venue, guests, budget, description, status, customer_name, customer_phone, vendor_id, vendor_name, note, quote_amount FROM event_requests ${admin ? '' : `WHERE (status = 'NEW' AND category = '${skill}') OR vendor_id = '${req.u.id}'`} ORDER BY CREATEDTIME DESC LIMIT 100`);
    const busy = admin ? [] : await busyOf(req, req.u.id);
    res.json({ items: rows.map((r) => { const x = r.event_requests;
      x.conflict = x.status === 'NEW' && daysBetween(x.date_from, x.date_to).some((d) => busy.some((b) => b.day === d));
      if (!(admin || (x.vendor_id === req.u.id && ['BOOKED', 'DONE'].includes(x.status)))) x.customer_phone = ''; return x; }) }); } catch (e) { fail(res, e); }
});
app.post('/artist/requests/:id/quote', need(['ARTIST']), async (req, res) => {
  const id = idStr(req.params.id); const b = req.body || {}; const amount = Number(b.amount);
  if (!id || !(amount > 0 && amount <= 100000000)) return fail(res, 'Enter the quote amount in rupees.', 400);
  try { const r = await zq(req, `SELECT ROWID, category, status, date_from, date_to FROM event_requests WHERE ROWID = ${id}`);
    const x = r.length && r[0].event_requests; if (!x || x.category !== req.u.skill) return fail(res, 'Request not found.', 404);
    if (x.status !== 'NEW') return fail(res, 'Another artist already quoted this event.', 409);
    const days = daysBetween(x.date_from, x.date_to); if ((await busyOf(req, req.u.id)).some((bz) => days.includes(bz.day))) return fail(res, 'You are already booked or blocked on these dates.', 409);
    if (!(await useReferral(req, res, req.u, 'EVT', id))) return;
    await tbl(req, 'event_requests').updateRow({ ROWID: id, status: 'QUOTED', vendor_id: req.u.id, vendor_name: req.u.name, vendor_phone: req.u.phone, quote_amount: amount, note: clean(b.note, 255) }); res.json({ status: 'QUOTED' }); } catch (e) { fail(res, e); }
});
app.post('/artist/requests/:id/done', need(['ARTIST']), async (req, res) => {
  const id = idStr(req.params.id); if (!id) return fail(res, 'Invalid request.', 400);
  try { const r = await zq(req, `SELECT ROWID, vendor_id, status, date_to FROM event_requests WHERE ROWID = ${id}`);
    const x = r.length && r[0].event_requests; if (!x || x.vendor_id !== req.u.id) return fail(res, 'Request not found.', 404);
    if (x.status !== 'BOOKED') return fail(res, 'This event is not booked.', 409);
    if (x.date_to >= todayIST()) return fail(res, 'You can mark it done after the last event day.', 409);
    await tbl(req, 'event_requests').updateRow({ ROWID: id, status: 'DONE' }); res.json({ status: 'DONE' }); } catch (e) { fail(res, e); }
});
app.get('/artist/calendar', need(['ARTIST']), async (req, res) => {
  try { const t = todayIST(); res.json({ items: (await busyOf(req, req.u.id)).filter((b) => b.day >= t).sort((a, b) => (a.day < b.day ? -1 : 1)).map((b) => ({ day: b.day, kind: b.request_id === 'BLOCK' ? 'BLOCKED' : 'BOOKED' })) }); } catch (e) { fail(res, e); }
});
app.post('/artist/block', need(['ARTIST']), async (req, res) => {
  try { const days = dayRange((req.body || {}).from, (req.body || {}).to, 31);
    if (!(await reserve(req, req.u.id, days, 'BLOCK'))) return fail(res, 'Some of those days are already booked or blocked.', 409); res.json({ blocked: days.length }); } catch (e) { typeof e === 'string' ? fail(res, e, 400) : fail(res, e); }
});
app.post('/artist/unblock', need(['ARTIST']), async (req, res) => {
  try { const days = dayRange((req.body || {}).from, (req.body || {}).to, 31); let n = 0;
    for (const b of await busyOf(req, req.u.id)) if (b.request_id === 'BLOCK' && days.includes(b.day)) { await tbl(req, 'vendor_busy').deleteRow(b.ROWID); n++; } res.json({ unblocked: n }); } catch (e) { typeof e === 'string' ? fail(res, e, 400) : fail(res, e); }
});

// ---------- seller directory: reference listings + qualified quote leads (NOT e-commerce: no cart, payment or delivery) ----------
const SCATS = ['TEXTILES', 'COMPUTERS', 'MOBILES', 'HOME_KITCHEN', 'FURNITURE', 'BEAUTY', 'FOODS', 'POOJA', 'HANDICRAFTS', 'OTHER'];
const slugOf = (n) => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'seller';
const urlOk = (u, hosts) => { try { const x = new URL(String(u || '')); return x.protocol === 'https:' && hosts.some((h) => x.hostname === h || x.hostname.endsWith('.' + h)) ? x.href.slice(0, 200) : ''; } catch (e) { return ''; } };
const safeWord = (v) => clean(v, 40).replace(/[^\p{L}\p{N} -]/gu, '');
const PUBLIC = 'ROWID, slug, name, city, district, category, about, youtube_url, facebook_url, instagram_url, price_range, delivery_area, verified, min_order';   // seller phone is never public
const expired = (x) => (x.status === 'NEW' && x.valid_until < todayIST() ? { ...x, status: 'EXPIRED' } : x);

app.get('/sellers/categories', (q, r) => r.json({ items: SCATS }));
app.get('/sellers', gate('SELLERS'), async (req, res) => {
  try { const cat = String(req.query.category || '').toUpperCase(); const dist = safeWord(req.query.district);
    const w = ["status = 'LIVE'"]; if (SCATS.includes(cat)) w.push(`category = '${cat}'`); if (dist) w.push(`district = '${dist}'`);
    const rows = await zq(req, `SELECT ${PUBLIC} FROM sellers WHERE ${w.join(' AND ')} ORDER BY verified DESC LIMIT 100`); res.json({ items: rows.map((r) => r.sellers) }); } catch (e) { fail(res, e); }
});
app.get('/sellers/leads/mine', need(), async (req, res) => {
  try { const rows = await zq(req, `SELECT ROWID, seller_name, requirement, status, valid_until FROM seller_leads WHERE customer_id = '${req.u.id}' ORDER BY CREATEDTIME DESC LIMIT 30`); res.json({ items: rows.map((r) => expired(r.seller_leads)) }); } catch (e) { fail(res, e); }
});
app.get('/sellers/:slug', gate('SELLERS'), async (req, res) => {
  const slug = String(req.params.slug); if (!/^[a-z0-9-]{1,60}$/.test(slug)) return fail(res, 'Seller not found.', 404);
  try { const r = await zq(req, `SELECT ${PUBLIC} FROM sellers WHERE slug = '${slug}' AND status = 'LIVE'`); if (!r.length) return fail(res, 'Seller not found.', 404);
    const p = await zq(req, `SELECT ROWID, name, description, ref_price FROM seller_products WHERE seller_id = '${r[0].sellers.ROWID}' LIMIT 100`);
    res.json({ ...r[0].sellers, products: p.map((x) => x.seller_products), disclaimer: 'AAi Hyper only connects you with the seller. Price, quality, delivery, warranty and returns are the seller’s responsibility.' }); } catch (e) { fail(res, e); }
});
app.post('/sellers/leads', need(), async (req, res) => {
  const b = req.body || {}; const requirement = clean(b.requirement, 255); const location = clean(b.location, 80); const budget = Math.max(0, Number(b.budget) || 0);
  if (b.consent !== true) return fail(res, 'Please tick the box to let sellers contact you.', 400);
  if (requirement.length < 5) return fail(res, 'Tell the seller what you need.', 400);
  if (location.length < 2) return fail(res, 'Enter your town or district.', 400);
  if (limited('l:' + req.u.id, 10, 600000)) return tooMany(res);
  try { const name = await ensureName(req, b); let sellers;
    if (b.route === 'matching') {   // up to 5 live sellers in the category (and district, if given)
      const cat = String(b.category || '').toUpperCase(); if (!SCATS.includes(cat)) return fail(res, 'Choose a category.', 400); const dist = safeWord(b.district);
      sellers = (await zq(req, `SELECT ROWID, name FROM sellers WHERE status = 'LIVE' AND category = '${cat}' ${dist ? `AND district = '${dist}'` : ''} ORDER BY verified DESC LIMIT 5`)).map((r) => r.sellers);
    } else { const slug = String(b.sellerSlug || ''); if (!/^[a-z0-9-]{1,60}$/.test(slug)) return fail(res, 'Choose a seller.', 400);
      sellers = (await zq(req, `SELECT ROWID, name FROM sellers WHERE slug = '${slug}' AND status = 'LIVE'`)).map((r) => r.sellers); }
    if (!sellers.length) return fail(res, 'No sellers found for that request.', 404);
    const today = todayIST(); const until = new Date(Date.parse(today + 'T00:00:00Z') + 15 * 86400000).toISOString().slice(0, 10); let sent = 0; let skipped = 0;
    for (const sl of sellers) {   // one lead per customer, seller and day (duplicate protection)
      try { await tbl(req, 'seller_leads').insertRow({ seller_id: String(sl.ROWID), seller_name: sl.name, customer_id: req.u.id, customer_name: name, customer_phone: req.u.phone, requirement, location, product_name: clean(b.productName, 120), status: 'NEW', valid_until: until, dedupe_key: `${req.u.id}:${sl.ROWID}:${today}`, budget }); sent++; } catch (e) { skipped++; }
    }
    res.status(201).json({ sent, skipped, sellers: sellers.map((x) => x.name) }); } catch (e) { typeof e === 'string' ? fail(res, e, 400) : fail(res, e); }
});
// seller inbox
const sellerOf = (req) => (req.u.role === 'ADMIN' ? idStr(req.query.sellerId || (req.body || {}).sellerId) : idStr(req.u.storeId));
app.get('/seller/leads', need(['SELLER', 'ADMIN']), async (req, res) => {
  try { const sid = sellerOf(req); if (req.u.role !== 'ADMIN' && !sid) return res.json({ items: [] });
    const rows = await zq(req, `SELECT ROWID, seller_id, seller_name, customer_name, customer_phone, requirement, location, product_name, budget, status, valid_until FROM seller_leads ${sid ? `WHERE seller_id = '${sid}'` : ''} ORDER BY CREATEDTIME DESC LIMIT 100`);
    res.json(await maskFor(req, req.u, 'LEAD', rows.map((r) => expired(r.seller_leads)), 'ROWID', ['customer_phone'])); } catch (e) { fail(res, e); }
});
app.patch('/seller/leads/:id', need(['SELLER', 'ADMIN']), async (req, res) => {
  const id = idStr(req.params.id); const st = (req.body || {}).status; if (!id || !['CONTACTED', 'WON', 'LOST'].includes(st)) return fail(res, 'Status must be CONTACTED, WON or LOST.', 400);
  try { const r = await zq(req, `SELECT ROWID, seller_id, status, valid_until FROM seller_leads WHERE ROWID = ${id}`); const x = r.length && r[0].seller_leads;
    if (!x || (req.u.role !== 'ADMIN' && x.seller_id !== String(req.u.storeId))) return fail(res, 'Lead not found.', 404);
    if (expired(x).status === 'EXPIRED') return fail(res, 'This lead has expired.', 409);
    { const ls = await lockState(req, req.u); if (!isOpen(ls, 'LEAD', id)) return payRequired(res, ls.S, 'Unlock this customer first (uses a free sample), or subscribe.'); }
    await tbl(req, 'seller_leads').updateRow({ ROWID: id, status: st }); res.json({ status: st }); } catch (e) { fail(res, e); }
});
app.post('/seller/products', need(['SELLER', 'ADMIN']), async (req, res) => {
  const b = req.body || {}; const sid = sellerOf(req); const price = Number(b.refPrice) || 0;   // 0 means "ask price"
  if (!sid || clean(b.name, 120).length < 2 || price < 0) return fail(res, 'Seller, product name and a valid price are required.', 400);
  try { const row = await tbl(req, 'seller_products').insertRow({ seller_id: sid, name: clean(b.name, 120), description: clean(b.description, 255), ref_price: price }); res.status(201).json({ productId: String(row.ROWID) }); } catch (e) { fail(res, e); }
});

// ---------- real estate: admin-approved listings, enquiries and visits (no payments, no photos yet) ----------
const PTYPES = ['HOUSE', 'FLAT', 'ROOM', 'PLOT', 'LAND', 'SHOP', 'WAREHOUSE'];
const OWNER_STATUS = ['LIVE', 'UNDER_NEGOTIATION', 'CLOSED', 'INACTIVE'];   // what an owner may set once the admin approved the listing
const ALL_PSTATUS = ['PENDING', 'LIVE', 'UNDER_NEGOTIATION', 'CLOSED', 'INACTIVE', 'REJECTED'];
const PUB = 'ROWID, mode, ptype, title, locality, district, description, approval_info, video_url, status, broker, available_from, price, deposit, bhk, area_sqft';   // owner contact is never public
const OPEN_P = "status IN ('LIVE','UNDER_NEGOTIATION')";
const numIn = (v, max) => { if (v === undefined || v === '' || v === null) return null; const n = Number(v); return Number.isFinite(n) && n >= 0 && n <= max ? n : null; };

app.get('/properties', gate('PROPERTY'), async (req, res) => {
  try { const w = [OPEN_P]; const mode = String(req.query.mode || '').toUpperCase(); const pt = String(req.query.ptype || '').toUpperCase(); const dist = safeWord(req.query.district);
    if (['RENT', 'SALE'].includes(mode)) w.push(`mode = '${mode}'`); if (PTYPES.includes(pt)) w.push(`ptype = '${pt}'`); if (dist) w.push(`district = '${dist}'`);
    const lo = numIn(req.query.minPrice, 1e10); const hi = numIn(req.query.maxPrice, 1e10); const bhk = numIn(req.query.minBhk, 20);
    if (lo !== null) w.push(`price >= ${lo}`); if (hi !== null) w.push(`price <= ${hi}`); if (bhk !== null) w.push(`bhk >= ${bhk}`);
    const rows = await zq(req, `SELECT ${PUB} FROM properties WHERE ${w.join(' AND ')} ORDER BY CREATEDTIME DESC LIMIT 60`); res.json({ items: rows.map((r) => r.properties) }); } catch (e) { fail(res, e); }
});
app.get('/properties/mine', need(), async (req, res) => {
  try { const rows = await zq(req, `SELECT ${PUB}, approved, admin_note FROM properties WHERE owner_id = '${req.u.id}' ORDER BY CREATEDTIME DESC LIMIT 50`); res.json({ items: rows.map((r) => r.properties) }); } catch (e) { fail(res, e); }
});
app.get('/properties/enquiries/mine', need(), async (req, res) => {
  try { const rows = await zq(req, `SELECT ROWID, property_id, property_title, visit_date, status FROM property_enquiries WHERE customer_id = '${req.u.id}' ORDER BY CREATEDTIME DESC LIMIT 30`); res.json({ items: rows.map((r) => r.property_enquiries) }); } catch (e) { fail(res, e); }
});
app.get('/properties/enquiries/inbox', need(), async (req, res) => {   // enquiries on MY properties: the owner sees the customer's contact
  try { const rows = await zq(req, `SELECT ROWID, property_id, property_title, customer_name, customer_phone, message, visit_date, status FROM property_enquiries WHERE owner_id = '${req.u.id}' ORDER BY CREATEDTIME DESC LIMIT 100`); res.json({ items: rows.map((r) => r.property_enquiries) }); } catch (e) { fail(res, e); }
});
app.patch('/properties/enquiries/:id', need(), async (req, res) => {
  const id = idStr(req.params.id); const st = (req.body || {}).status; if (!id || !['CONTACTED', 'VISIT_SCHEDULED', 'CLOSED'].includes(st)) return fail(res, 'Status must be CONTACTED, VISIT_SCHEDULED or CLOSED.', 400);
  try { const r = await zq(req, `SELECT ROWID, owner_id FROM property_enquiries WHERE ROWID = ${id}`);
    if (!r.length || r[0].property_enquiries.owner_id !== req.u.id) return fail(res, 'Enquiry not found.', 404);
    await tbl(req, 'property_enquiries').updateRow({ ROWID: id, status: st }); res.json({ status: st }); } catch (e) { fail(res, e); }
});
app.get('/properties/:id', gate('PROPERTY'), async (req, res) => {
  const id = idStr(req.params.id); if (!id) return fail(res, 'Property not found.', 404);
  try { const r = await zq(req, `SELECT ${PUB} FROM properties WHERE ROWID = ${id} AND ${OPEN_P}`); if (!r.length) return fail(res, 'Property not found.', 404);
    res.json({ ...r[0].properties, notice: 'AAi Hyper only connects you with the owner or broker. Check documents and ownership yourself before paying anyone.' }); } catch (e) { fail(res, e); }
});
app.post('/properties', need(), async (req, res) => {   // goes to the admin first; never public until approved
  const b = req.body || {}; const mode = String(b.mode || '').toUpperCase(); const ptype = String(b.ptype || '').toUpperCase();
  const title = clean(b.title, 120); const locality = clean(b.locality, 80); const district = safeWord(b.district);
  const price = numIn(b.price, 1e10); const deposit = numIn(b.deposit, 1e10) || 0; const bhk = numIn(b.bhk, 20) || 0; const area = numIn(b.areaSqft, 1e7) || 0;
  if (!['RENT', 'SALE'].includes(mode)) return fail(res, 'Choose Rent or Sale.', 400);
  if (!PTYPES.includes(ptype)) return fail(res, 'Choose the property type.', 400);
  if (title.length < 5 || locality.length < 2 || !district) return fail(res, 'Enter a title, the locality and the district.', 400);
  if (!price || price <= 0) return fail(res, 'Enter the price (rent per month, or sale price) in rupees.', 400);
  const avail = String(b.availableFrom || ''); if (avail && !isDay(avail)) return fail(res, 'Enter a valid available-from date.', 400);
  if (limited('p:' + req.u.id, 5, 86400000)) return tooMany(res);
  try { const name = await ensureName(req, b);
    const fp = crypto.createHash('sha1').update([mode, ptype, locality.toLowerCase(), district.toLowerCase(), price, area, bhk].join('|')).digest('hex');
    if ((await zq(req, `SELECT ROWID FROM properties WHERE fp = '${fp}'`)).length) return fail(res, 'This property looks like it is already listed.', 409);   // duplicate detection
    const row = await tbl(req, 'properties').insertRow({ owner_id: req.u.id, owner_name: name, owner_phone: req.u.phone, mode, ptype, title, locality, district, description: clean(b.description, 255), approval_info: clean(b.approvalInfo, 120), video_url: urlOk(b.videoUrl, ['youtube.com', 'youtu.be']), status: 'PENDING', approved: 'no', broker: b.broker === true ? 'yes' : 'no', available_from: avail, admin_note: '', fp, price, deposit, bhk, area_sqft: area });
    res.status(201).json({ propertyId: String(row.ROWID), status: 'PENDING' }); } catch (e) { typeof e === 'string' ? fail(res, e, 400) : fail(res, e); }
});
app.patch('/properties/:id/status', need(), async (req, res) => {
  const id = idStr(req.params.id); const st = (req.body || {}).status; if (!id || !OWNER_STATUS.includes(st)) return fail(res, 'Status must be LIVE, UNDER_NEGOTIATION, CLOSED or INACTIVE.', 400);
  try { const r = await zq(req, `SELECT ROWID, owner_id, approved FROM properties WHERE ROWID = ${id}`);
    if (!r.length || r[0].properties.owner_id !== req.u.id) return fail(res, 'Property not found.', 404);
    if (r[0].properties.approved !== 'yes') return fail(res, 'Wait for the admin to approve this listing first.', 409);
    await tbl(req, 'properties').updateRow({ ROWID: id, status: st }); res.json({ status: st }); } catch (e) { fail(res, e); }
});
app.post('/properties/:id/enquiries', need(), async (req, res) => {
  const id = idStr(req.params.id); const b = req.body || {}; const message = clean(b.message, 255); const visit = String(b.visitDate || '');
  if (!id) return fail(res, 'Property not found.', 404);
  if (b.consent !== true) return fail(res, 'Please tick the box to let the owner contact you.', 400);
  if (message.length < 5) return fail(res, 'Write a short message to the owner.', 400);
  if (limited('pe:' + req.u.id, 10, 600000)) return tooMany(res);
  try { if (visit) dayRange(visit, visit, 1);
    const name = await ensureName(req, b); const r = await zq(req, `SELECT ROWID, owner_id, title FROM properties WHERE ROWID = ${id} AND ${OPEN_P}`);
    if (!r.length) return fail(res, 'Property not found.', 404); const p = r[0].properties; if (p.owner_id === req.u.id) return fail(res, 'This is your own listing.', 400);
    try { await tbl(req, 'property_enquiries').insertRow({ property_id: String(p.ROWID), property_title: p.title, owner_id: p.owner_id, customer_id: req.u.id, customer_name: name, customer_phone: req.u.phone, message, visit_date: visit, status: 'NEW', dedupe_key: `${req.u.id}:${p.ROWID}:${todayIST()}` }); }
    catch (e) { return fail(res, 'You already sent an enquiry for this property today.', 409); }
    res.status(201).json({ status: 'NEW' }); } catch (e) { typeof e === 'string' ? fail(res, e, 400) : fail(res, e); }
});
app.get('/admin/properties', need(['ADMIN']), async (req, res) => {
  try { const st = ALL_PSTATUS.includes(String(req.query.status)) ? req.query.status : 'PENDING';
    const rows = await zq(req, `SELECT ${PUB}, owner_name, owner_phone, approved, admin_note FROM properties WHERE status = '${st}' ORDER BY CREATEDTIME DESC LIMIT 100`); res.json({ items: rows.map((r) => r.properties) }); } catch (e) { fail(res, e); }
});
app.post('/admin/properties/:id/decision', need(['ADMIN']), async (req, res) => {
  const id = idStr(req.params.id); const b = req.body || {}; if (!id || typeof b.approve !== 'boolean') return fail(res, 'Say approve or reject.', 400);
  try { const r = await zq(req, `SELECT ROWID FROM properties WHERE ROWID = ${id}`); if (!r.length) return fail(res, 'Property not found.', 404);
    await tbl(req, 'properties').updateRow(b.approve ? { ROWID: id, approved: 'yes', status: 'LIVE', admin_note: '' } : { ROWID: id, approved: 'no', status: 'REJECTED', admin_note: clean(b.note, 120) });
    res.json({ status: b.approve ? 'LIVE' : 'REJECTED' }); } catch (e) { fail(res, e); }
});

// ---------- manpower: matching only (platform is NOT the employer; no wages are paid or held here) ----------
const LTRADES = ['MASON', 'CARPENTER', 'ELECTRICIAN', 'PLUMBER', 'PAINTER', 'TILE_WORKER', 'WELDER', 'HELPER', 'SUPERVISOR', 'GANG_LEADER'];
const LLEVELS = ['BEGINNER', 'SKILLED', 'EXPERT'];
const LNOTICE = 'AAi Hyper only helps workers and people who need work done find each other. It is not the employer and does not pay or hold wages. Agree the wage, hours and safety between yourselves.';
const titleCase = (v) => safeWord(v).toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
const endOf = (start, days) => new Date(Date.parse(start + 'T00:00:00Z') + (days - 1) * 86400000).toISOString().slice(0, 10);
const avgOf = (p) => (Number(p.rating_count) ? Math.round((Number(p.rating_sum) / Number(p.rating_count)) * 10) / 10 : 0);
const PCOLS = 'ROWID, user_id, name, phone, trade, level, district, verified, available, daily_rate, experience_yrs, team_size, languages, tools, rating_sum, rating_count';
const myProfile = async (req) => { const r = await zq(req, `SELECT ${PCOLS} FROM labour_profiles WHERE user_id = '${req.u.id}'`); return r.length ? r[0].labour_profiles : null; };
const shownProfile = (p) => { const x = { ...p, rating: avgOf(p) }; delete x.rating_sum; delete x.rating_count; return x; };
const seeContact = (st) => ['SELECTED', 'COMPLETED'].includes(st);

app.get('/labour/trades', (q, r) => r.json({ trades: LTRADES, levels: LLEVELS, notice: LNOTICE }));
app.get('/labour/profile', need(), async (req, res) => { try { const p = await myProfile(req); res.json({ profile: p ? shownProfile(p) : null }); } catch (e) { fail(res, e); } });
app.post('/labour/profile', need(), async (req, res) => {
  const b = req.body || {}; const trade = String(b.trade || '').toUpperCase(); const level = String(b.level || '').toUpperCase(); const district = titleCase(b.district);
  const rate = numIn(b.dailyRate, 100000); const exp = numIn(b.experienceYrs, 60) || 0; const team = numIn(b.teamSize, 500) || 1;
  if (!LTRADES.includes(trade)) return fail(res, 'Choose your trade.', 400); if (!LLEVELS.includes(level)) return fail(res, 'Choose your skill level.', 400);
  if (!district) return fail(res, 'Enter your district.', 400); if (!rate || rate <= 0) return fail(res, 'Enter your daily wage in rupees.', 400);
  try { const name = await ensureName(req, b); const old = await myProfile(req);
    const data = { name, phone: req.u.phone, trade, level, district, languages: clean(b.languages, 60), tools: clean(b.tools, 120), daily_rate: rate, experience_yrs: exp, team_size: team };
    if (old) { const keep = old.trade === trade && old.district === district;   // changing trade or district needs a fresh check
      await tbl(req, 'labour_profiles').updateRow({ ROWID: old.ROWID, ...data, verified: keep ? old.verified : 'no' }); return res.json({ verified: keep ? old.verified : 'no' }); }
    await tbl(req, 'labour_profiles').insertRow({ user_id: req.u.id, ...data, verified: 'no', available: 'yes', rating_sum: 0, rating_count: 0 }); res.status(201).json({ verified: 'no' }); } catch (e) { typeof e === 'string' ? fail(res, e, 400) : fail(res, e); }
});
app.patch('/labour/availability', need(), async (req, res) => {
  try { const p = await myProfile(req); if (!p) return fail(res, 'Create your worker profile first.', 404);
    await tbl(req, 'labour_profiles').updateRow({ ROWID: p.ROWID, available: (req.body || {}).available === false ? 'no' : 'yes' }); res.json({ ok: true }); } catch (e) { fail(res, e); }
});
// jobs: a poster (contractor, builder or house owner) asks for workers
app.post('/labour/jobs', need(), async (req, res) => {
  const b = req.body || {}; const trade = String(b.trade || '').toUpperCase(); const head = Math.round(Number(b.headcount)); const days = Math.round(Number(b.days)); const wage = numIn(b.wage, 100000);
  const locality = clean(b.locality, 80); const district = titleCase(b.district);
  if (!LTRADES.includes(trade)) return fail(res, 'Choose the trade you need.', 400); if (!(head >= 1 && head <= 50)) return fail(res, 'Workers needed: 1 to 50.', 400);
  if (!(days >= 1 && days <= 60)) return fail(res, 'Days of work: 1 to 60.', 400); if (!wage || wage <= 0) return fail(res, 'Enter the daily wage you offer.', 400);
  if (locality.length < 2 || !district) return fail(res, 'Enter the work location and district.', 400);
  if (limited('j:' + req.u.id, 5, 86400000)) return tooMany(res);
  try { const end = endOf(String(b.startDate || ''), days); dayRange(b.startDate, end, 60); const name = await ensureName(req, b);
    const row = await tbl(req, 'job_posts').insertRow({ poster_id: req.u.id, poster_name: name, poster_phone: req.u.phone, trade, locality, district, notes: clean(b.notes, 255), start_date: b.startDate, end_date: end, status: 'OPEN', headcount: head, days, wage, selected_count: 0 });
    res.status(201).json({ jobId: String(row.ROWID), endDate: end }); } catch (e) { typeof e === 'string' || e instanceof RangeError ? fail(res, typeof e === 'string' ? e : 'Enter a valid start date.', 400) : fail(res, e); }
});
const JCOLS = 'ROWID, trade, locality, district, notes, start_date, end_date, status, headcount, days, wage, selected_count';
app.get('/labour/jobs', need(), async (req, res) => {   // open jobs for a VERIFIED worker, same trade and district
  try { const p = await myProfile(req); if (!p) return fail(res, 'Create your worker profile first.', 404);
    if (p.verified !== 'yes') return fail(res, 'Wait for the admin to verify your profile.', 403);
    const rows = await zq(req, `SELECT ${JCOLS} FROM job_posts WHERE status = 'OPEN' AND trade = '${p.trade}' AND district = '${p.district}' ORDER BY CREATEDTIME DESC LIMIT 50`);
    const mine = (await zq(req, `SELECT job_id FROM job_applications WHERE worker_id = '${req.u.id}'`)).map((r) => r.job_applications.job_id); const busy = await busyOf(req, req.u.id);
    res.json({ notice: LNOTICE, items: rows.map((r) => { const j = r.job_posts; return { ...j, applied: mine.includes(String(j.ROWID)), busy: daysBetween(j.start_date, j.end_date).some((d) => busy.some((x) => x.day === d)) }; }) }); } catch (e) { fail(res, e); }
});
app.post('/labour/jobs/:id/apply', need(), async (req, res) => {
  const id = idStr(req.params.id); if (!id) return fail(res, 'Job not found.', 404);
  try { const p = await myProfile(req); if (!p || p.verified !== 'yes') return fail(res, 'Your worker profile must be verified first.', 403);
    if (p.available !== 'yes') return fail(res, 'Switch on “available for work” first.', 409);
    const r = await zq(req, `SELECT ROWID, poster_id, trade, locality, start_date, end_date, status FROM job_posts WHERE ROWID = ${id}`); const j = r.length && r[0].job_posts;
    if (!j || j.status !== 'OPEN') return fail(res, 'This job is no longer open.', 404); if (j.trade !== p.trade) return fail(res, 'This job is for a different trade.', 400);
    if (j.poster_id === req.u.id) return fail(res, 'This is your own job.', 400);
    if ((await busyOf(req, req.u.id)).some((x) => daysBetween(j.start_date, j.end_date).includes(x.day))) return fail(res, 'You are already booked on these dates.', 409);
    if (!(await useReferral(req, res, req.u, 'JOB', id))) return;
    try { await tbl(req, 'job_applications').insertRow({ job_id: String(j.ROWID), worker_id: req.u.id, worker_name: p.name, worker_phone: req.u.phone, poster_id: j.poster_id, trade: j.trade, locality: j.locality, start_date: j.start_date, end_date: j.end_date, status: 'APPLIED', dedupe_key: `${j.ROWID}:${req.u.id}`, rating_worker: 0, rating_poster: 0 }); }
    catch (e) { return fail(res, 'You already applied to this job.', 409); }
    res.status(201).json({ status: 'APPLIED' }); } catch (e) { fail(res, e); }
});
app.get('/labour/applications/mine', need(), async (req, res) => {
  try { const rows = (await zq(req, `SELECT ROWID, job_id, poster_id, trade, locality, start_date, end_date, status, rating_worker, rating_poster FROM job_applications WHERE worker_id = '${req.u.id}' ORDER BY CREATEDTIME DESC LIMIT 50`)).map((r) => r.job_applications);
    if (!rows.length) return res.json({ items: [] });
    const jobs = (await zq(req, `SELECT ROWID, poster_name, poster_phone, wage FROM job_posts WHERE ROWID IN (${rows.map((x) => `'${x.job_id}'`).join(',')})`)).map((r) => r.job_posts);
    const days = (await zq(req, `SELECT app_id, day, status, ot_hours FROM work_days WHERE app_id IN (${rows.map((x) => `'${x.ROWID}'`).join(',')})`)).map((r) => r.work_days);
    res.json({ items: rows.map((a) => { const j = jobs.find((x) => String(x.ROWID) === a.job_id) || {}; const c = seeContact(a.status);
      return { ...a, wage: j.wage, poster_name: c ? j.poster_name : '', poster_phone: c ? j.poster_phone : '', attendance: days.filter((d) => d.app_id === String(a.ROWID)) }; }) }); } catch (e) { fail(res, e); }
});
const myApp = async (req, res, who) => {   // who: 'poster' or 'worker'
  const id = idStr(req.params.id); if (!id) { fail(res, 'Not found.', 404); return null; }
  const r = await zq(req, `SELECT ROWID, job_id, worker_id, poster_id, status, start_date, end_date, rating_worker, rating_poster FROM job_applications WHERE ROWID = ${id}`); const a = r.length && r[0].job_applications;
  if (!a || (who === 'poster' ? a.poster_id : a.worker_id) !== req.u.id) { fail(res, 'Not found.', 404); return null; } return a;
};
app.post('/labour/applications/:id/withdraw', need(), async (req, res) => {
  try { const a = await myApp(req, res, 'worker'); if (!a) return; if (a.status !== 'APPLIED') return fail(res, 'Ask the person who hired you to release you.', 409);
    await tbl(req, 'job_applications').updateRow({ ROWID: a.ROWID, status: 'WITHDRAWN' }); res.json({ status: 'WITHDRAWN' }); } catch (e) { fail(res, e); }
});
// poster side
app.get('/labour/jobs/mine', need(), async (req, res) => {
  try { const rows = await zq(req, `SELECT ${JCOLS} FROM job_posts WHERE poster_id = '${req.u.id}' ORDER BY CREATEDTIME DESC LIMIT 50`); res.json({ notice: LNOTICE, items: rows.map((r) => r.job_posts) }); } catch (e) { fail(res, e); }
});
app.get('/labour/jobs/:id/applicants', need(), async (req, res) => {
  const id = idStr(req.params.id); if (!id) return fail(res, 'Job not found.', 404);
  try { const j = await zq(req, `SELECT ROWID, poster_id FROM job_posts WHERE ROWID = ${id}`); if (!j.length || j[0].job_posts.poster_id !== req.u.id) return fail(res, 'Job not found.', 404);
    const apps = (await zq(req, `SELECT ROWID, worker_id, worker_name, worker_phone, status, rating_worker, rating_poster FROM job_applications WHERE job_id = '${id}' ORDER BY CREATEDTIME DESC LIMIT 100`)).map((r) => r.job_applications);
    if (!apps.length) return res.json({ items: [] });
    const profs = (await zq(req, `SELECT ${PCOLS} FROM labour_profiles WHERE user_id IN (${apps.map((a) => `'${a.worker_id}'`).join(',')})`)).map((r) => r.labour_profiles);
    const days = (await zq(req, `SELECT app_id, day, status, ot_hours FROM work_days WHERE app_id IN (${apps.map((a) => `'${a.ROWID}'`).join(',')})`)).map((r) => r.work_days);
    res.json({ items: apps.map((a) => { const p = profs.find((x) => x.user_id === a.worker_id) || {};
      return { ROWID: a.ROWID, status: a.status, name: a.worker_name, phone: seeContact(a.status) ? a.worker_phone : '', level: p.level, experience_yrs: p.experience_yrs, daily_rate: p.daily_rate, team_size: p.team_size, languages: p.languages, tools: p.tools, rating: avgOf(p), rated: Number(a.rating_worker) > 0, attendance: days.filter((d) => d.app_id === String(a.ROWID)) }; }) }); } catch (e) { fail(res, e); }
});
app.post('/labour/jobs/:id/close', need(), async (req, res) => {
  const id = idStr(req.params.id); if (!id) return fail(res, 'Job not found.', 404);
  try { const j = await zq(req, `SELECT ROWID, poster_id FROM job_posts WHERE ROWID = ${id}`); if (!j.length || j[0].job_posts.poster_id !== req.u.id) return fail(res, 'Job not found.', 404);
    await tbl(req, 'job_posts').updateRow({ ROWID: id, status: 'CLOSED' }); res.json({ status: 'CLOSED' }); } catch (e) { fail(res, e); }
});
app.post('/labour/applications/:id/decision', need(), async (req, res) => {
  try { const a = await myApp(req, res, 'poster'); if (!a) return; if (a.status !== 'APPLIED') return fail(res, 'This application is already answered.', 409);
    if ((req.body || {}).select !== true) { await tbl(req, 'job_applications').updateRow({ ROWID: a.ROWID, status: 'REJECTED' }); return res.json({ status: 'REJECTED' }); }
    const jr = await zq(req, `SELECT ROWID, status, headcount, selected_count FROM job_posts WHERE ROWID = ${a.job_id}`); const j = jr[0].job_posts;
    if (j.status !== 'OPEN' || Number(j.selected_count) >= Number(j.headcount)) return fail(res, 'This job already has all the workers it needs.', 409);
    if (!(await reserve(req, a.worker_id, daysBetween(a.start_date, a.end_date), 'JOB:' + a.ROWID))) return fail(res, 'This worker is already booked on those dates.', 409);   // no double booking
    const n = Number(j.selected_count) + 1;
    await tbl(req, 'job_applications').updateRow({ ROWID: a.ROWID, status: 'SELECTED' }); await tbl(req, 'job_posts').updateRow({ ROWID: j.ROWID, selected_count: n, status: n >= Number(j.headcount) ? 'FILLED' : 'OPEN' });
    res.json({ status: 'SELECTED', jobStatus: n >= Number(j.headcount) ? 'FILLED' : 'OPEN' }); } catch (e) { fail(res, e); }
});
app.post('/labour/applications/:id/release', need(), async (req, res) => {   // poster cancels a selected worker: dates freed, job reopens
  try { const a = await myApp(req, res, 'poster'); if (!a) return; if (a.status !== 'SELECTED') return fail(res, 'Only a selected worker can be released.', 409);
    await freeRequest(req, 'JOB:' + a.ROWID); const j = (await zq(req, `SELECT ROWID, selected_count FROM job_posts WHERE ROWID = ${a.job_id}`))[0].job_posts;
    await tbl(req, 'job_applications').updateRow({ ROWID: a.ROWID, status: 'RELEASED' }); await tbl(req, 'job_posts').updateRow({ ROWID: j.ROWID, selected_count: Math.max(0, Number(j.selected_count) - 1), status: 'OPEN' }); res.json({ status: 'RELEASED' }); } catch (e) { fail(res, e); }
});
app.post('/labour/applications/:id/attendance', need(), async (req, res) => {   // marked by the person who hired; the worker can see it
  const b = req.body || {}; const status = String(b.status || '').toUpperCase(); const ot = numIn(b.otHours, 12) || 0;
  if (!['PRESENT', 'ABSENT'].includes(status)) return fail(res, 'Status must be PRESENT or ABSENT.', 400);
  try { const a = await myApp(req, res, 'poster'); if (!a) return; if (a.status !== 'SELECTED') return fail(res, 'Attendance is for selected workers.', 409);
    const day = String(b.day || ''); if (!isDay(day) || day < a.start_date || day > a.end_date) return fail(res, 'That day is outside the job dates.', 400); if (day > todayIST()) return fail(res, 'You cannot mark a future day.', 400);
    const key = `${a.ROWID}:${day}`; const ex = await zq(req, `SELECT ROWID FROM work_days WHERE wkey = '${key}'`);
    if (ex.length) await tbl(req, 'work_days').updateRow({ ROWID: ex[0].work_days.ROWID, status, ot_hours: ot }); else await tbl(req, 'work_days').insertRow({ app_id: String(a.ROWID), day, status, wkey: key, ot_hours: ot });
    res.json({ day, status, otHours: ot }); } catch (e) { fail(res, e); }
});
app.post('/labour/applications/:id/complete', need(), async (req, res) => {
  try { const a = await myApp(req, res, 'poster'); if (!a) return; if (a.status !== 'SELECTED') return fail(res, 'This worker is not selected.', 409);
    if (a.end_date >= todayIST()) return fail(res, 'You can complete the job after the last work day.', 409);
    await tbl(req, 'job_applications').updateRow({ ROWID: a.ROWID, status: 'COMPLETED' }); res.json({ status: 'COMPLETED' }); } catch (e) { fail(res, e); }
});
app.post('/labour/applications/:id/rate', need(), async (req, res) => {   // two-way: poster rates worker, worker rates poster, once each, after completion
  const stars = Math.round(Number((req.body || {}).stars)); if (!(stars >= 1 && stars <= 5)) return fail(res, 'Give 1 to 5 stars.', 400);
  const id = idStr(req.params.id); if (!id) return fail(res, 'Not found.', 404);
  try { const r = await zq(req, `SELECT ROWID, worker_id, poster_id, status, rating_worker, rating_poster FROM job_applications WHERE ROWID = ${id}`); const a = r.length && r[0].job_applications;
    const asPoster = a && a.poster_id === req.u.id; if (!a || (!asPoster && a.worker_id !== req.u.id)) return fail(res, 'Not found.', 404);
    if (a.status !== 'COMPLETED') return fail(res, 'You can rate after the job is completed.', 409);
    if (Number(asPoster ? a.rating_worker : a.rating_poster) > 0) return fail(res, 'You already rated this job.', 409);
    await tbl(req, 'job_applications').updateRow({ ROWID: a.ROWID, ...(asPoster ? { rating_worker: stars } : { rating_poster: stars }) });
    if (asPoster) { const p = (await zq(req, `SELECT ${PCOLS} FROM labour_profiles WHERE user_id = '${a.worker_id}'`))[0]; if (p) await tbl(req, 'labour_profiles').updateRow({ ROWID: p.labour_profiles.ROWID, rating_sum: Number(p.labour_profiles.rating_sum) + stars, rating_count: Number(p.labour_profiles.rating_count) + 1 }); }
    res.json({ stars }); } catch (e) { fail(res, e); }
});
app.get('/admin/labour', need(['ADMIN']), async (req, res) => {
  try { const v = req.query.verified === 'yes' ? 'yes' : 'no'; const rows = await zq(req, `SELECT ${PCOLS} FROM labour_profiles WHERE verified = '${v}' ORDER BY CREATEDTIME DESC LIMIT 100`); res.json({ items: rows.map((r) => shownProfile(r.labour_profiles)) }); } catch (e) { fail(res, e); }
});
app.post('/admin/labour/:id/verify', need(['ADMIN']), async (req, res) => {   // admin checks ID / references by phone before turning this on
  const id = idStr(req.params.id); if (!id || typeof (req.body || {}).verified !== 'boolean') return fail(res, 'Say verified true or false.', 400);
  try { await tbl(req, 'labour_profiles').updateRow({ ROWID: id, verified: req.body.verified ? 'yes' : 'no' }); res.json({ ok: true }); } catch (e) { fail(res, e); }
});

// ---------- local business directory (tailors, tuition, clinics...): approved by admin, listed while the owner holds a plan ----------
const BCATS = ['TAILOR', 'TUITION', 'CLINIC', 'TRANSPORT', 'BEAUTY', 'MOBILE_REPAIR', 'BAKERY', 'HARDWARE', 'AGRI', 'OTHER'];
const BCOLS = 'ROWID, owner_id, name, category, district, locality, about, timings, phone, offer, featured, listed_until';
const pubBiz = (b) => { const x = { ...b }; delete x.owner_id; delete x.listed_until; return x; };
async function activeOwners(req, rows) {   // owners with a running vendor plan
  const ids = [...new Set(rows.map((r) => r.owner_id))]; if (!ids.length) return new Set();
  const t = todayStr(); const subs = (await zq(req, `SELECT user_id, valid_until FROM subscriptions WHERE plan = 'VENDOR' AND user_id IN (${ids.map((i) => `'${i}'`).join(',')})`)).map((r) => r.subscriptions);
  return new Set(subs.filter((x) => x.valid_until >= t).map((x) => x.user_id));
}
app.get('/directory/categories', (q, r) => r.json({ items: BCATS }));
app.get('/directory', gate('DIRECTORY'), async (req, res) => {
  try { const w = ["status = 'LIVE'"]; const cat = String(req.query.category || '').toUpperCase(); const dist = titleCase(req.query.district);
    if (BCATS.includes(cat)) w.push(`category = '${cat}'`); if (dist) w.push(`district = '${dist}'`);
    const rows = (await zq(req, `SELECT ${BCOLS} FROM businesses WHERE ${w.join(' AND ')} ORDER BY featured DESC LIMIT 100`)).map((r) => r.businesses);
    const act = await activeOwners(req, rows); const t = todayStr(); res.json({ items: rows.filter((b) => b.listed_until >= t || act.has(b.owner_id)).sort((x, y) => (y.featured === 'yes') - (x.featured === 'yes')).map(pubBiz) }); } catch (e) { fail(res, e); }
});
app.post('/directory', need(), async (req, res) => {
  const b = req.body || {}; const name = clean(b.name, 120); const category = String(b.category || '').toUpperCase(); const district = titleCase(b.district); const locality = clean(b.locality, 80); const phone = phoneOf(b.phone || req.u.phone);
  if (name.length < 3) return fail(res, 'Enter the business name.', 400); if (!BCATS.includes(category)) return fail(res, 'Choose a category.', 400);
  if (!district || locality.length < 2) return fail(res, 'Enter the district and the locality.', 400); if (!phone) return fail(res, 'Enter a valid 10-digit contact number.', 400);
  if (limited('b:' + req.u.id, 3, 86400000)) return tooMany(res);
  try { const owner = await ensureName(req, { name: b.ownerName }); const fp = crypto.createHash('sha1').update([name.toLowerCase(), locality.toLowerCase(), phone, category].join('|')).digest('hex');
    if ((await zq(req, `SELECT ROWID FROM businesses WHERE fp = '${fp}'`)).length) return fail(res, 'This business is already listed.', 409);
    const row = await tbl(req, 'businesses').insertRow({ owner_id: req.u.id, owner_name: owner, name, category, district, locality, about: clean(b.about, 255), timings: clean(b.timings, 80), phone, offer: clean(b.offer, 120), status: 'PENDING', approved: 'no', featured: 'no', listed_until: '', admin_note: '', fp });
    res.status(201).json({ businessId: String(row.ROWID), status: 'PENDING' }); } catch (e) { typeof e === 'string' ? fail(res, e, 400) : fail(res, e); }
});
app.get('/directory/mine', need(), async (req, res) => {
  try { const rows = (await zq(req, `SELECT ${BCOLS}, status, approved, admin_note FROM businesses WHERE owner_id = '${req.u.id}' ORDER BY CREATEDTIME DESC LIMIT 20`)).map((r) => r.businesses);
    const act = (await activeOwners(req, rows)).has(req.u.id); const t = todayStr(); res.json({ planActive: act, items: rows.map((b) => ({ ...b, visible: b.status === 'LIVE' && (b.listed_until >= t || act) })) }); } catch (e) { fail(res, e); }
});
app.patch('/directory/:id', need(), async (req, res) => {   // the owner updates the offer, timings, phone, or hides/shows the listing
  const id = idStr(req.params.id); const b = req.body || {}; if (!id) return fail(res, 'Not found.', 404);
  try { const r = await zq(req, `SELECT ROWID, owner_id, approved FROM businesses WHERE ROWID = ${id}`); if (!r.length || r[0].businesses.owner_id !== req.u.id) return fail(res, 'Not found.', 404);
    const row = { ROWID: id };
    if ('offer' in b) row.offer = clean(b.offer, 120); if ('timings' in b) row.timings = clean(b.timings, 80); if ('about' in b) row.about = clean(b.about, 255);
    if ('phone' in b) { const ph = phoneOf(b.phone); if (!ph) return fail(res, 'Enter a valid 10-digit contact number.', 400); row.phone = ph; }
    if ('status' in b) { if (!['LIVE', 'HIDDEN'].includes(b.status)) return fail(res, 'Status must be LIVE or HIDDEN.', 400); if (r[0].businesses.approved !== 'yes') return fail(res, 'Wait for the admin to approve this listing first.', 409); row.status = b.status; }
    await tbl(req, 'businesses').updateRow(row); res.json({ ok: true }); } catch (e) { fail(res, e); }
});
app.get('/admin/directory', need(['ADMIN']), async (req, res) => {
  try { const st = ['PENDING', 'LIVE', 'HIDDEN', 'REJECTED'].includes(String(req.query.status)) ? req.query.status : 'PENDING';
    const rows = await zq(req, `SELECT ROWID, owner_id, owner_name, name, category, district, locality, about, timings, phone, offer, status, featured, listed_until, admin_note FROM businesses WHERE status = '${st}' ORDER BY CREATEDTIME DESC LIMIT 100`); res.json({ items: rows.map((r) => r.businesses) }); } catch (e) { fail(res, e); }
});
app.post('/admin/directory/:id/decision', need(['ADMIN']), async (req, res) => {
  const id = idStr(req.params.id); const b = req.body || {}; if (!id || typeof b.approve !== 'boolean') return fail(res, 'Say approve or reject.', 400);
  try { const S = await settings(req); if (!(await zq(req, `SELECT ROWID FROM businesses WHERE ROWID = ${id}`)).length) return fail(res, 'Not found.', 404);
    if (!b.approve) { await tbl(req, 'businesses').updateRow({ ROWID: id, approved: 'no', status: 'REJECTED', admin_note: clean(b.note, 120) }); return res.json({ status: 'REJECTED' }); }
    const until = addDays(todayStr(), S.daysVendor - 1); await tbl(req, 'businesses').updateRow({ ROWID: id, approved: 'yes', status: 'LIVE', listed_until: until, admin_note: '' }); res.json({ status: 'LIVE', listedUntil: until }); } catch (e) { fail(res, e); }
});
app.patch('/admin/directory/:id', need(['ADMIN']), async (req, res) => {   // feature (sponsored), hide, or extend the free period
  const id = idStr(req.params.id); const b = req.body || {}; if (!id) return fail(res, 'Invalid business.', 400); const row = { ROWID: id };
  if ('featured' in b) row.featured = b.featured === true ? 'yes' : 'no';
  if ('status' in b) { if (!['LIVE', 'HIDDEN'].includes(b.status)) return fail(res, 'Bad status.', 400); row.status = b.status; }
  if ('listedUntil' in b) { if (!isDay(String(b.listedUntil))) return fail(res, 'Enter a valid date.', 400); row.listed_until = b.listedUntil; }
  try { await tbl(req, 'businesses').updateRow(row); res.json({ ok: true }); } catch (e) { fail(res, e); }
});

// ---------- grocery list reading: typed text or a photo (Zia OCR) -> draft items matched to the catalogue. Always a draft: the customer confirms. ----------
const TDIG = { '௦': '0', '௧': '1', '௨': '2', '௩': '3', '௪': '4', '௫': '5', '௬': '6', '௭': '7', '௮': '8', '௯': '9' };
const UNITW = { kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', 'கிலோ': 'kg', g: 'g', gm: 'g', gms: 'g', gram: 'g', grams: 'g', 'கிராம்': 'g', l: 'L', lt: 'L', ltr: 'L', litre: 'L', litres: 'L', liter: 'L', liters: 'L', 'லிட்டர்': 'L', ml: 'ml', packet: 'packet', packets: 'packet', pkt: 'packet', 'பாக்கெட்': 'packet', dozen: 'dozen', doz: 'dozen', 'டஜன்': 'dozen', pcs: 'pcs', pc: 'pcs', nos: 'pcs', 'எண்': 'pcs' };
const FRACW = { 'அரை': 0.5, half: 0.5, 'கால்': 0.25, quarter: 0.25, 'ஒரு': 1, 'ஒன்று': 1, one: 1, 'இரண்டு': 2, two: 2, 'மூன்று': 3, three: 3 };
function parseLine(raw) {
  const s0 = String(raw).replace(/[௦-௯]/g, (c) => TDIG[c]).replace(/[•*\-–—:=()\[\]|]/g, ' ').replace(/\s+/g, ' ').trim(); if (!s0) return null;
  let qty = null; let unit = null; const keep = [];
  for (const tok of s0.split(' ')) { const w = tok.toLowerCase(); let m;
    if ((m = w.match(/^(\d+\/\d+)$/)) && qty !== null) { qty += Number(m[1].split('/')[0]) / Number(m[1].split('/')[1]); continue; }   // "1 1/2"
    if ((m = w.match(/^(\d+(?:\.\d+)?|\d+\/\d+)([\p{L}\p{M}]*)$/u)) && qty === null) { qty = m[1].includes('/') ? Number(m[1].split('/')[0]) / Number(m[1].split('/')[1]) : Number(m[1]); if (m[2] && UNITW[m[2]]) unit = UNITW[m[2]]; else if (m[2]) keep.push(m[2]); continue; }
    if (UNITW[w] && qty !== null && !unit) { unit = UNITW[w]; continue; }
    if (w in FRACW && qty === null) { qty = FRACW[w]; continue; }
    keep.push(tok); }
  const name = keep.join(' ').replace(/^(of|and)\s+/i, '').trim(); if (!name) return null;
  return { raw: String(raw).trim().slice(0, 80), name, qty: qty && qty > 0 && qty <= 1000 ? qty : 1, unit };
}
const nrm = (x) => String(x || '').toLowerCase().replace(/[^\p{L}\p{M}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
function matchProduct(name, products) {
  const n = nrm(name); if (!n) return null; let best = null;
  for (const p of products) for (const cand of [nrm(p.name_en), nrm(p.name_ta)]) { if (!cand) continue;
    let c = 0; if (cand === n) c = 0.95; else if (cand.includes(n) || n.includes(cand)) c = 0.7;   // partial name: the customer must check it else { const a = new Set(n.split(' ')); const hit = cand.split(' ').filter((t) => a.has(t)).length; if (hit) c = 0.55 + 0.1 * (hit / cand.split(' ').length); }
    if (c > 0 && (!best || c > best.c || (c === best.c && Number(p.price) < Number(best.p.price)))) best = { p, c }; }
  return best && best.c >= 0.55 ? best : null;
}
function readList(text, products) {
  const lines = String(text || '').slice(0, 3000).split(/[\n,;]+|\s\+\s/).map((x) => x.trim()).filter(Boolean).slice(0, 60);
  return lines.map(parseLine).filter(Boolean).map((it) => { const m = matchProduct(it.name, products);
    return { ...it, productId: m ? String(m.p.ROWID) : '', storeId: m ? String(m.p.store_id) : '', matchedName: m ? m.p.name_en : '', price: m ? Number(m.p.price) : 0, confidence: m ? m.c : 0, needsReview: !m || m.c < 0.8 }; });
}
const listProducts = async (req, sid) => (await zq(req, `SELECT ROWID, store_id, name_en, name_ta, unit, price FROM products WHERE status = 'ACTIVE' ${sid ? `AND store_id = '${sid}'` : ''} LIMIT 300`)).map((r) => r.products);
app.post('/grocery/parse', gate('STORES'), async (req, res) => {
  try { const items = readList((req.body || {}).text, await listProducts(req, idStr((req.body || {}).storeId))); if (!items.length) return fail(res, 'Write your list, one item per line (for example: rice 5 kg).', 400); res.json({ items }); } catch (e) { fail(res, e); }
});
app.post('/grocery/ocr', gate('STORES'), need(), async (req, res) => {   // the photo is read once and deleted at once; nothing is stored
  const b = req.body || {}; const m = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ''));
  if (b.consent !== true) return fail(res, 'Please agree to the photo being read by AI.', 400); if (!m) return fail(res, 'Send a JPEG or PNG photo.', 400);
  const buf = Buffer.from(m[2], 'base64'); const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff; const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (buf.length < 500 || buf.length > 2000000 || !(isJpg || isPng)) return fail(res, 'The photo is too small, too large or not a real image.', 400);
  if (limited('ocr:' + req.u.id, 20, 86400000)) return tooMany(res);
  const file = path.join(os.tmpdir(), `list-${crypto.randomBytes(8).toString('hex')}.${isJpg ? 'jpg' : 'png'}`); let text = ''; let stream = null;
  try { fs.writeFileSync(file, buf); stream = fs.createReadStream(file); stream.on('error', () => {}); const out = await sdk(req).zia().extractOpticalCharacters(stream, { language: 'eng' }); text = String((out && (out.text || out.ocr_text)) || ''); }
  catch (e) { console.error(e); return fail(res, 'We could not read the photo. Please type your list instead.', 502); }
  finally { if (stream) stream.destroy(); try { fs.unlinkSync(file); } catch (e) { /* never written */ } }   // gone before we answer
  try { const items = readList(text, await listProducts(req, null)); res.json({ text: text.slice(0, 1500), items }); } catch (e) { fail(res, e); }
});
app.get('/admin/attention', need(['ADMIN']), async (req, res) => {   // fixed-rule checks (no AI): what needs the admin's eyes
  try { const cnt = async (q, t) => Number(Object.values((await zq(req, q))[0][t])[0]);
    const [payments, properties, businesses, workers, quotes, sellerLeads] = await Promise.all([cnt("SELECT COUNT(ROWID) FROM payments WHERE status = 'PENDING'", 'payments'), cnt("SELECT COUNT(ROWID) FROM properties WHERE status = 'PENDING'", 'properties'), cnt("SELECT COUNT(ROWID) FROM businesses WHERE status = 'PENDING'", 'businesses'), cnt("SELECT COUNT(ROWID) FROM labour_profiles WHERE verified = 'no'", 'labour_profiles'), cnt("SELECT COUNT(ROWID) FROM quotes WHERE status = 'NEW'", 'quotes'), cnt("SELECT COUNT(ROWID) FROM seller_leads WHERE status = 'NEW'", 'seller_leads')]);
    const stores = await allRows(req, 'stores', 'ROWID, name_en', "WHERE status = 'ACTIVE'"); const have = new Set((await allRows(req, 'products', 'store_id', "WHERE status = 'ACTIVE'")).map((p) => p.store_id));
    const sellers = await allRows(req, 'sellers', 'ROWID, name, about', "WHERE status = 'LIVE'"); const sp = new Set((await allRows(req, 'seller_products', 'seller_id')).map((x) => x.seller_id));
    const biz = await allRows(req, 'businesses', 'ROWID, name, timings, about', "WHERE status = 'LIVE'");
    res.json({ toApprove: { payments, properties, businesses, workers }, waiting: { quotes, sellerLeads }, storesWithoutProducts: stores.filter((x) => !have.has(String(x.ROWID))).map((x) => x.name_en), sellersIncomplete: sellers.filter((x) => !sp.has(String(x.ROWID)) || !x.about).map((x) => x.name), businessesIncomplete: biz.filter((x) => !x.timings || !x.about).map((x) => x.name), note: 'These are fixed rules, not AI.' }); } catch (e) { fail(res, e); }
});

// ---------- admin ----------
app.get('/admin/summary', need(['ADMIN']), async (req, res) => {
  try { const [s, o, q, u] = await Promise.all(['stores', 'orders', 'quotes', 'users'].map((t) => zq(req, `SELECT COUNT(ROWID) FROM ${t}`)));
    res.json({ stores: Object.values(s[0].stores)[0], orders: Object.values(o[0].orders)[0], quotes: Object.values(q[0].quotes)[0], users: Object.values(u[0].users)[0] }); } catch (e) { fail(res, e); }
});
app.get('/admin/stores', need(['ADMIN']), async (req, res) => {
  try { const rows = await zq(req, 'SELECT ROWID, name_en, name_ta, eta, status, delivery_fee, min_order, whatsapp FROM stores'); res.json({ items: rows.map((r) => r.stores) }); } catch (e) { fail(res, e); }
});
app.post('/admin/stores', need(['ADMIN']), async (req, res) => {
  const b = req.body || {}; const name = clean(b.name_en, 120); if (name.length < 2) return fail(res, 'Store name is required.', 400);
  try { const row = await tbl(req, 'stores').insertRow({ name_en: name, name_ta: clean(b.name_ta, 120), whatsapp: phoneOf(b.whatsapp) ? '91' + phoneOf(b.whatsapp) : '', eta: clean(b.eta, 40), delivery_fee: Math.max(0, Number(b.delivery_fee) || 0), min_order: Math.max(0, Number(b.min_order) || 0), status: 'ACTIVE' });
    res.status(201).json({ storeId: String(row.ROWID) }); } catch (e) { fail(res, e); }
});
app.patch('/admin/stores/:id', need(['ADMIN']), async (req, res) => {
  const id = idStr(req.params.id); const b = req.body || {}; if (!id) return fail(res, 'Invalid store.', 400);
  const row = { ROWID: id };
  if ('status' in b) { if (!['ACTIVE', 'PAUSED'].includes(b.status)) return fail(res, 'Bad status.', 400); row.status = b.status; }
  if ('whatsapp' in b) row.whatsapp = phoneOf(b.whatsapp) ? '91' + phoneOf(b.whatsapp) : '';
  try { await tbl(req, 'stores').updateRow(row); res.json({ ok: true }); } catch (e) { fail(res, e); }
});
const csvCell = (v) => { let x = String(v ?? ''); if (/^[=+\-@]/.test(x)) x = "'" + x; return '"' + x.replace(/"/g, '""') + '"'; };   // also blocks spreadsheet formula injection
app.get('/admin/settings', need(['ADMIN']), async (req, res) => { try { SETTINGS_CACHE = null; res.json(await settings(req)); } catch (e) { fail(res, e); } });
app.put('/admin/settings', need(['ADMIN']), async (req, res) => {
  const b = req.body || {}; const out = {}; const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? String(n) : null; };
  const set = (k, v) => { if (v !== null && v !== undefined) out[k] = v; };
  if ('priceClient' in b) { const v = num(b.priceClient, 1, 100000); if (v === null) return fail(res, 'Client price must be 1 to 100000.', 400); set('price_client', v); }
  if ('daysClient' in b) { const v = num(b.daysClient, 1, 366); if (v === null) return fail(res, 'Client days must be 1 to 366.', 400); set('days_client', v); }
  if ('priceVendor' in b) { const v = num(b.priceVendor, 1, 100000); if (v === null) return fail(res, 'Vendor price must be 1 to 100000.', 400); set('price_vendor', v); }
  if ('daysVendor' in b) { const v = num(b.daysVendor, 1, 366); if (v === null) return fail(res, 'Vendor days must be 1 to 366.', 400); set('days_vendor', v); }
  if ('freeSample' in b) { const v = num(b.freeSample, 0, 1000); if (v === null) return fail(res, 'Free sample must be 0 to 1000.', 400); set('free_sample', v); }
  if ('gstPct' in b) { const v = num(b.gstPct, 0, 28); if (v === null) return fail(res, 'GST must be 0 to 28.', 400); set('gst_pct', v); }
  if ('gated' in b) { if (!Array.isArray(b.gated) || b.gated.some((x) => !GATE_MODULES.includes(x))) return fail(res, 'Gated modules must be STORES, SELLERS, PROPERTY or DIRECTORY.', 400); set('gated', b.gated.length ? b.gated.join(',') : 'NONE'); }
  if ('upiId' in b) { const v = clean(b.upiId, 60); if (v && !/^[\w.\-]{2,50}@[\w.\-]{2,30}$/.test(v)) return fail(res, 'Enter a valid UPI ID like name@bank.', 400); set('upi_id', v); }
  if ('upiName' in b) set('upi_name', clean(b.upiName, 40));
  try { for (const [k, v] of Object.entries(out)) { const r = await zq(req, `SELECT ROWID FROM config WHERE k = '${k}'`); if (r.length) await tbl(req, 'config').updateRow({ ROWID: r[0].config.ROWID, v }); else await tbl(req, 'config').insertRow({ k, v }); }
    SETTINGS_CACHE = null; res.json(await settings(req)); } catch (e) { fail(res, e); }
});
app.get('/admin/payments', need(['ADMIN']), async (req, res) => {
  try { const st = ['PENDING', 'CONFIRMED', 'REJECTED'].includes(req.query.status) ? req.query.status : 'PENDING';
    const rows = await zq(req, `SELECT ROWID, user_id, user_name, user_phone, plan, utr, status, method, note, amount, period_start, period_end, confirmed_on, CREATEDTIME FROM payments WHERE status = '${st}' ORDER BY CREATEDTIME DESC LIMIT 100`); res.json({ items: rows.map((r) => r.payments) }); } catch (e) { fail(res, e); }
});
app.get('/admin/payments.csv', need(['ADMIN']), async (req, res) => {   // for your accountant / CA
  try { const rows = await allRows(req, 'payments', 'confirmed_on, user_name, user_phone, plan, method, utr, amount, base_amount, gst_amount, period_start, period_end, status, note');
    const head = ['Date', 'Name', 'Phone', 'Plan', 'Method', 'Reference', 'Amount', 'Base', 'GST', 'From', 'To', 'Status', 'Note'];
    const body = rows.map((x) => [x.confirmed_on, x.user_name, x.user_phone, x.plan, x.method, x.utr, x.amount, x.base_amount, x.gst_amount, x.period_start, x.period_end, x.status, x.note].map(csvCell).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', 'attachment; filename="aai-hyper-payments.csv"'); res.send([head.map(csvCell).join(','), ...body].join('\n')); } catch (e) { fail(res, e); }
});
app.post('/admin/payments/:id/decision', need(['ADMIN']), async (req, res) => {   // confirm after checking the bank/UPI statement
  const id = idStr(req.params.id); const b = req.body || {}; if (!id || typeof b.confirm !== 'boolean') return fail(res, 'Say confirm true or false.', 400);
  try { const r = await zq(req, `SELECT ROWID, user_id, user_name, user_phone, plan, status, amount, days FROM payments WHERE ROWID = ${id}`); const p = r.length && r[0].payments; if (!p) return fail(res, 'Payment not found.', 404);
    if (p.status !== 'PENDING') return fail(res, 'This payment was already decided.', 409);
    if (!b.confirm) { await tbl(req, 'payments').updateRow({ ROWID: id, status: 'REJECTED', note: clean(b.note, 120), decided_by: req.u.id, confirmed_on: todayStr() }); return res.json({ status: 'REJECTED' }); }
    const S = await settings(req); const a = await activate(req, { id: p.user_id, name: p.user_name, phone: p.user_phone }, p.plan, Number(p.amount), Number(p.days), S);
    await tbl(req, 'payments').updateRow({ ROWID: id, status: 'CONFIRMED', note: clean(b.note, 120), decided_by: req.u.id, confirmed_on: todayStr(), period_start: a.start, period_end: a.end, base_amount: a.base, gst_amount: a.gst });
    res.json({ status: 'CONFIRMED', validUntil: a.end }); } catch (e) { fail(res, e); }
});
app.post('/admin/payments', need(['ADMIN']), async (req, res) => {   // cash or direct payment received outside the app
  const b = req.body || {}; const phone = phoneOf(b.phone); const plan = String(b.plan || '').toUpperCase(); if (!phone) return fail(res, 'Enter a valid 10-digit mobile number.', 400); if (!['CLIENT', 'VENDOR'].includes(plan)) return fail(res, 'Choose a plan.', 400);
  try { const S = await settings(req); const u = await zq(req, `SELECT ROWID, name, phone FROM users WHERE phone = '${phone}'`); if (!u.length) return fail(res, 'This number has not signed in yet. Ask them to sign in once.', 404);
    const amount = b.amount === undefined || b.amount === '' ? (plan === 'CLIENT' ? S.priceClient : S.priceVendor) : Number(b.amount); if (!(amount > 0 && amount <= 100000)) return fail(res, 'Enter a valid amount.', 400);
    const days = plan === 'CLIENT' ? S.daysClient : S.daysVendor; const user = { id: String(u[0].users.ROWID), name: u[0].users.name, phone };
    const a = await activate(req, user, plan, amount, days, S);
    await tbl(req, 'payments').insertRow({ user_id: user.id, user_name: user.name, user_phone: phone, plan, utr: `CASH-${Date.now()}`, status: 'CONFIRMED', method: 'CASH', note: clean(b.note, 120), period_start: a.start, period_end: a.end, confirmed_on: todayStr(), decided_by: req.u.id, amount, base_amount: a.base, gst_amount: a.gst, days });
    res.status(201).json({ validUntil: a.end }); } catch (e) { fail(res, e); }
});
app.get('/admin/subscriptions', need(['ADMIN']), async (req, res) => {   // who to follow up
  try { const S = await settings(req); const t = todayStr(); const f = ['active', 'expiring', 'expired', 'locked', 'all'].includes(req.query.filter) ? req.query.filter : 'expiring';
    if (f === 'locked') {   // vendors who used up the free sample and have no active plan
      const vend = await allRows(req, 'users', 'ROWID, name, phone, role', "WHERE role IN ('VENDOR','WORKER','ARTIST','SELLER')"); const uns = await allRows(req, 'unlocks', 'user_id'); const subs = await allRows(req, 'subscriptions', 'user_id, plan, valid_until', "WHERE plan = 'VENDOR'");
      const cnt = {}; for (const x of uns) cnt[x.user_id] = (cnt[x.user_id] || 0) + 1; const act = new Set(subs.filter((x) => x.valid_until >= t).map((x) => x.user_id));
      return res.json({ items: vend.filter((x) => (cnt[String(x.ROWID)] || 0) >= S.freeSample && !act.has(String(x.ROWID))).map((x) => ({ user_id: String(x.ROWID), name: x.name, phone: x.phone, plan: 'VENDOR', valid_until: '', status: 'LOCKED', daysLeft: 0, role: x.role, used: cnt[String(x.ROWID)] || 0 })) }); }
    const rows = await allRows(req, 'subscriptions', 'user_id, user_name, user_phone, plan, valid_until');
    const items = rows.map((x) => { const left = dayDiff(t, x.valid_until); return { user_id: x.user_id, name: x.user_name, phone: x.user_phone, plan: x.plan, valid_until: x.valid_until, daysLeft: left >= 0 ? left + 1 : 0, status: left < 0 ? 'EXPIRED' : left <= 2 ? 'EXPIRING' : 'ACTIVE' }; });
    res.json({ items: items.filter((x) => f === 'all' || (f === 'active' ? x.status !== 'EXPIRED' : f === 'expiring' ? x.status === 'EXPIRING' : x.status === 'EXPIRED')).sort((a, b) => (a.valid_until < b.valid_until ? -1 : 1)) }); } catch (e) { fail(res, e); }
});
app.get('/admin/revenue', need(['ADMIN']), async (req, res) => {
  try { const S = await settings(req); const t = todayStr(); const month = t.slice(0, 7);
    const pays = await allRows(req, 'payments', 'plan, amount, base_amount, gst_amount, confirmed_on, method', "WHERE status = 'CONFIRMED'"); const sum = (a, k) => r2(a.reduce((s, x) => s + Number(x[k] || 0), 0));
    const pack = (a) => ({ count: a.length, gross: sum(a, 'amount'), net: sum(a, 'base_amount'), gst: sum(a, 'gst_amount') });
    const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(Date.parse(t + 'T00:00:00Z')); d.setUTCMonth(d.getUTCMonth() - i, 1); const m = d.toISOString().slice(0, 7); months.push({ month: m, ...pack(pays.filter((x) => x.confirmed_on.slice(0, 7) === m)) }); }
    const subs = await allRows(req, 'subscriptions', 'plan, valid_until'); const act = (pl) => subs.filter((x) => x.plan === pl && x.valid_until >= t).length; const due = (n) => subs.filter((x) => x.valid_until >= t && dayDiff(t, x.valid_until) <= n);
    const pending = Object.values((await zq(req, "SELECT COUNT(ROWID) FROM payments WHERE status = 'PENDING'"))[0].payments)[0];
    res.json({ total: pack(pays), today: pack(pays.filter((x) => x.confirmed_on === t)), thisMonth: pack(pays.filter((x) => x.confirmed_on.slice(0, 7) === month)), byPlan: { CLIENT: pack(pays.filter((x) => x.plan === 'CLIENT')), VENDOR: pack(pays.filter((x) => x.plan === 'VENDOR')) }, byMethod: { UPI: pack(pays.filter((x) => x.method === 'UPI')), CASH: pack(pays.filter((x) => x.method === 'CASH')) }, months,
      active: { CLIENT: act('CLIENT'), VENDOR: act('VENDOR') }, expiringIn3: due(2).length, expiringIn7: due(6).length, expectedRenewals7: r2(due(6).reduce((s, x) => s + (x.plan === 'CLIENT' ? S.priceClient : S.priceVendor), 0)), pendingPayments: Number(pending), gstPct: S.gstPct,
      note: 'Amounts are treated as GST-inclusive. Confirm GST registration and the right rate with your CA.' }); } catch (e) { fail(res, e); }
});
app.post('/admin/followups', need(['ADMIN']), async (req, res) => {
  const b = req.body || {}; const uid = idStr(b.userId); const note = clean(b.note, 255); const due = String(b.dueDate || '');
  if (!uid || note.length < 3) return fail(res, 'Write a short note.', 400); if (due && !isDay(due)) return fail(res, 'Enter a valid due date.', 400);
  try { const u = await zq(req, `SELECT ROWID, name, phone FROM users WHERE ROWID = ${uid}`); if (!u.length) return fail(res, 'User not found.', 404);
    const row = await tbl(req, 'followups').insertRow({ user_id: uid, user_name: u[0].users.name, user_phone: u[0].users.phone, plan: ['CLIENT', 'VENDOR'].includes(b.plan) ? b.plan : '', note, due_date: due, status: 'OPEN', created_by: req.u.id }); res.status(201).json({ followupId: String(row.ROWID) }); } catch (e) { fail(res, e); }
});
app.get('/admin/followups', need(['ADMIN']), async (req, res) => {
  try { const rows = await zq(req, "SELECT ROWID, user_id, user_name, user_phone, plan, note, due_date, status FROM followups WHERE status = 'OPEN' ORDER BY CREATEDTIME DESC LIMIT 100"); const t = todayStr();
    res.json({ items: rows.map((r) => ({ ...r.followups, overdue: !!r.followups.due_date && r.followups.due_date < t })) }); } catch (e) { fail(res, e); }
});
app.patch('/admin/followups/:id', need(['ADMIN']), async (req, res) => {
  const id = idStr(req.params.id); if (!id) return fail(res, 'Invalid follow-up.', 400);
  try { await tbl(req, 'followups').updateRow({ ROWID: id, status: 'DONE' }); res.json({ ok: true }); } catch (e) { fail(res, e); }
});
app.get('/admin/sellers', need(['ADMIN']), async (req, res) => {
  try { const rows = await zq(req, 'SELECT ROWID, slug, name, city, district, category, verified, status FROM sellers LIMIT 200'); res.json({ items: rows.map((r) => r.sellers) }); } catch (e) { fail(res, e); }
});
app.post('/admin/sellers', need(['ADMIN']), async (req, res) => {
  const b = req.body || {}; const name = clean(b.name, 120); const category = String(b.category || '').toUpperCase();
  if (name.length < 2) return fail(res, 'Seller name is required.', 400); if (!SCATS.includes(category)) return fail(res, 'Choose a category.', 400);
  try { let slug = slugOf(name); if ((await zq(req, `SELECT ROWID FROM sellers WHERE slug = '${slug}'`)).length) slug = `${slug.slice(0, 44)}-${crypto.randomInt(1000, 10000)}`;
    const row = await tbl(req, 'sellers').insertRow({ slug, name, city: clean(b.city, 60), district: safeWord(b.district), category, about: clean(b.about, 255), youtube_url: urlOk(b.youtubeUrl, ['youtube.com', 'youtu.be']), facebook_url: urlOk(b.facebookUrl, ['facebook.com', 'fb.com']), instagram_url: urlOk(b.instagramUrl, ['instagram.com']), price_range: clean(b.priceRange, 60), delivery_area: clean(b.deliveryArea, 120), min_order: Math.max(0, Number(b.minOrder) || 0), verified: 'no', status: 'LIVE' });
    res.status(201).json({ sellerId: String(row.ROWID), slug }); } catch (e) { fail(res, e); }
});
app.patch('/admin/sellers/:id', need(['ADMIN']), async (req, res) => {
  const id = idStr(req.params.id); const b = req.body || {}; if (!id) return fail(res, 'Invalid seller.', 400); const row = { ROWID: id };
  if ('status' in b) { if (!['LIVE', 'HIDDEN'].includes(b.status)) return fail(res, 'Bad status.', 400); row.status = b.status; }
  if ('verified' in b) { if (!['yes', 'no'].includes(b.verified)) return fail(res, 'Bad value.', 400); row.verified = b.verified; }
  try { await tbl(req, 'sellers').updateRow(row); res.json({ ok: true }); } catch (e) { fail(res, e); }
});
app.get('/admin/users', need(['ADMIN']), async (req, res) => {
  try { const rows = await zq(req, "SELECT ROWID, phone, name, role, store_id, skill, status FROM users WHERE role != 'CUSTOMER' LIMIT 200"); res.json({ items: rows.map((r) => r.users) }); } catch (e) { fail(res, e); }
});
app.post('/admin/users', need(['ADMIN']), async (req, res) => {   // add or change a vendor / worker / admin by mobile number
  const b = req.body || {}; const phone = phoneOf(b.phone); const role = b.role; const sid = idStr(b.storeId) || '';
  if (!phone) return fail(res, 'Enter a valid 10-digit mobile number.', 400);
  if (!['VENDOR', 'WORKER', 'ARTIST', 'SELLER', 'ADMIN'].includes(role)) return fail(res, 'Role must be VENDOR, WORKER, ARTIST, SELLER or ADMIN.', 400);
  if ((role === 'VENDOR' || role === 'SELLER') && !sid) return fail(res, 'Choose the vendor’s store (or the seller for SELLER).', 400);
  const skill = String(b.skill || '').toUpperCase();
  if (role === 'WORKER' && !CATS.includes(skill)) return fail(res, 'Choose the worker’s trade.', 400);
  if (role === 'ARTIST' && !ECATS.includes(skill)) return fail(res, 'Choose the artist’s event service.', 400);
  try { const r = await zq(req, `SELECT ROWID FROM users WHERE phone = '${phone}'`);
    const data = { role, store_id: role === 'VENDOR' || role === 'SELLER' ? sid : '', skill: role === 'WORKER' || role === 'ARTIST' ? skill : '', status: 'ACTIVE' };
    if (clean(b.name, 80)) data.name = clean(b.name, 80);
    if (r.length) await tbl(req, 'users').updateRow({ ROWID: r[0].users.ROWID, ...data }); else await tbl(req, 'users').insertRow({ phone, name: data.name || '', ...data });
    res.status(201).json({ ok: true }); } catch (e) { fail(res, e); }
});
app.patch('/admin/users/:id', need(['ADMIN']), async (req, res) => {
  const id = idStr(req.params.id); const st = (req.body || {}).status;
  if (!id || !['ACTIVE', 'DISABLED'].includes(st)) return fail(res, 'Bad request.', 400);
  if (id === req.u.id) return fail(res, 'You cannot disable your own account.', 400);
  try { await tbl(req, 'users').updateRow({ ROWID: id, status: st }); res.json({ ok: true }); } catch (e) { fail(res, e); }
});

module.exports = app;
