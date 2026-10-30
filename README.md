# AAi Hyper (Phase 1: Daily Essentials)
Hyperlocal marketplace for Tamil Nadu villages. Tamil/English, mobile-first.

```
client/index.html     Customer storefront: live catalog, guest checkout, Get Quote on WhatsApp, order tracking
client/portal.html    Vendor and admin portal (orders, quotes, products, stores/branches)
functions/aai_api/    Advanced I/O function (Node 18, Express) + tests
db/                   Schema notes (tables already exist in the AAiHyper project)
```

## Deploy (Catalyst CLI), about 10 minutes
1. `npm i -g zcatalyst-cli && catalyst login`
2. In this folder: `catalyst init`. Pick the **AAiHyper** project (Development), enable **Functions** (Advanced I/O, Node 18) and **Client**, and keep the existing files.
3. `cd functions/aai_api && npm install && npm test && cd ../..` (4 tests should pass)
4. `catalyst deploy`. The CLI prints the web URL (`https://aaihyper-60092070503.development.catalystserverless.in/app/`) and the function is served at `/server/aai_api/`. Check `/server/aai_api/health`.
5. **Roles and sign-in** (console > Authentication): create roles `Vendor` and `Admin`; enable Hosted Authentication and set the redirect to `/app/portal.html`. Sign up yourself, then assign yourself `Admin`.
6. **Vendors:** in the portal (Admin) paste the vendor's Catalyst user id as the store owner and set the store WhatsApp number; give that user the `Vendor` role.
7. **WhatsApp:** each store's number is used for "Get quote on WhatsApp". For a company-wide fallback set `WA` near the top of `client/index.html` (format 91XXXXXXXXXX). This uses WhatsApp click-to-chat links. WhatsApp Business API (automatic messages) is a later phase and needs a provider.

## Git
```
git remote add origin https://github.com/parakkai99/AAi-Cloude.git
git push -u origin main
```

## Before real launch (Production)
- Add OTP verification for checkout (orders and quotes are currently guest name + phone, with no rate limit).
- Deploy to the Production environment and recreate tables/roles there.
- Add a payment gateway (UPI and COD are recorded only).
- Review the portal sign-in redirect and sign-out link in your Catalyst auth settings.

## Status
Tested: API logic against a mocked Catalyst SDK (4 tests). Not yet tested against the live project or in a browser on a phone.
