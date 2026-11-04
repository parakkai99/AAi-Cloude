# AAi Hyper (Phase 1: Daily Essentials)
Hyperlocal marketplace for Tamil Nadu villages. Tamil/English, mobile-first.

```
client/index.html     Customer storefront: live catalog, guest checkout, Get Quote on WhatsApp, order tracking
client/portal.html    Vendor and admin portal (orders, quotes, products, stores/branches)
functions/aai_api/    Advanced I/O function (Node 18, Express) + tests
db/                   Schema notes (tables already exist in the AAiHyper project)
```

## Sign-in (mobile OTP by default)
- Everyone (customers, vendors, workers, admins) signs in with a **mobile number + 6-digit OTP**. No email needed.
- **Email sign-in is optional** and only for admins: a Catalyst user with the *App Administrator* role can use `/__catalyst/auth/login`. Use it once to open the portal, then add your own mobile number under *Team* as ADMIN.
- Admins add vendors/workers by mobile number in the portal (*Team*). A vendor is tied to one store.
- Orders: customer sends order -> store marks **Delivered** or **Rejected**. No payments in the app. Quotes: NEW -> REPLIED (reply on WhatsApp).

## Home services (phase 2)
Customer picks a trade and describes the job (Services tab) -> a worker of that trade sends a quote -> customer accepts or declines (decline reopens the job) -> worker marks done. The customer's phone and address stay hidden from workers until the quote is accepted. Add workers in the portal under *Team* (role WORKER + trade). No payments.

## Events (phase 3)
Customer sends an enquiry for one service (Nadaswaram, singer, thavil, DJ, catering, decoration, photography, pandit, sound/lights) with dates (up to 14 days, up to a year ahead) -> an artist of that service sends a quote -> customer accepts: the dates are reserved for that artist and nobody else can book them (unique vendor:day key) -> artist marks done after the last event day. An enquiry or quote never blocks dates; only an accepted booking does. Artists can block their own days. Add artists in the portal under *Team* (role ARTIST + service). For several services at one event, send one enquiry per service. No payments. Not built yet: tentative holds with expiry, milestone payments, committee accounts, reminders.

## Seller directory (phase 4): reference listing, NOT e-commerce
Admin adds a seller (portal > Seller directory): name, category, city/district, about, YouTube/Facebook/Instagram links (https links on those sites only), price range, delivery area. Customers browse by category, open the seller page (video, reference products, disclaimer) and tap **Get quote**. No cart, no checkout, no delivery or warranty. A quote request needs: OTP sign-in, consent tick, requirement and location. It goes to the chosen seller, or to up to 5 matching sellers (same category/district). One lead per customer, seller and day (duplicate protection); leads are valid for 15 days. The seller's phone is never shown to customers; the seller sees the customer's contact and replies directly (WhatsApp link in the portal). Give a seller a login: Team > role SELLER > pick the seller. Not built yet: AI-assisted onboarding from YouTube/Facebook/OCR, lead fees and subscriptions, featured listings and verified-badge billing, reviews, SEO pages per seller URL, seller notifications (sellers check the portal).

## Real estate (phase 5)
Any signed-in user can list a property for rent or sale (house, flat, room, plot, agricultural land, shop, warehouse): title, locality, district, price, BHK, area, approval documents (for sales, e.g. DTCP/patta), optional YouTube video, broker tick. It stays hidden (PENDING) until the admin approves it in the portal (Property listings). Duplicates are rejected (same mode, type, place, price, area, BHK). The public sees listings without the owner's phone; a customer sends an enquiry (OTP sign-in, consent, message, optional visit date; one per property per day). The owner sees the customer's contact and sets CONTACTED / VISIT_SCHEDULED / CLOSED, and sets the listing LIVE, UNDER_NEGOTIATION, rented/sold (CLOSED) or hidden. Admin can reject any listing. No payments, no token or advance handling, no agreements. Not built yet: photo upload (needs Catalyst Stratus), map pin, document vault (patta/EC/ID, private files), owner edit of a listing, featured listings or listing fees, call masking.

## Manpower (phase 6): MATCHING ONLY, not an employer
Workers create a profile (trade, level, district, daily wage, experience, team size, languages, tools). They cannot see jobs or apply until the admin verifies them (portal > Worker verification: check ID/references by phone first). Anyone (contractor, builder, house owner) posts a job: trade, workers needed (1-50), start date (up to a year ahead), days (1-60), daily wage, place. Verified workers of that trade and district see it and apply; the poster selects workers (up to the headcount). Selecting reserves the worker's dates, so a worker cannot be booked twice; the poster can release a worker (dates freed, job reopens). Contact numbers are shown to both sides only after selection. The poster marks daily attendance (present/absent, overtime hours; no future days), then marks the job done after the last day, and both sides rate each other 1-5 once. The platform never pays, holds or tracks wages, supervises work or provides insurance. LEGAL: before real use take advice from a labour-law professional (contract labour, minimum wages, EPF/ESI, social security, TDS) and keep the positioning as a listing/matching service. Not built yet: GPS/OTP attendance, ID document upload, payment records, direct "request this worker" flow, workers' availability calendar view.

## Money (phase 7): passes, vendor plans, accounts (manual UPI, no gateway)
- **Customers** see the gated listings (default: stores, sellers, property) only with an active **pass**: Rs100 for 15 days (admin can change price, days and which listings are gated).
- **Vendors, workers, artists, sellers** get a **free sample** of 5 customers (each customer they open or quote uses one), then must pay a **monthly plan** (default Rs299/30 days). Locked customers show a lock; contact details stay hidden until unlocked or subscribed.
- **How payment works:** the person pays your UPI ID (set in portal > Money > settings), enters the 12-digit UPI reference (UTR) in the app; the payment shows as PENDING. You check your bank/UPI statement and press Confirm (or Reject with a reason). Confirming starts or extends the pass (renewing early does not lose days). Cash or direct payments: use Record payment. A payment gateway (Razorpay etc.) could confirm automatically later.
- **Accounts:** portal > Money shows this month / total / today, net and GST split (amounts are treated as GST-inclusive; confirm with your CA), by month, by plan and by UPI vs cash, active clients and vendors, renewals due, and a CSV download of every payment for your accountant.
- **Follow-up:** lists of people whose pass/plan is ending soon or ended, and vendors who used their free customers and have not paid; one tap opens a WhatsApp reminder; log follow-up notes with a due date (overdue shown in red) and mark them done.
- Safety: a UPI reference can be used once; amounts always come from your settings, never from the app; max 2 pending payments per person; CSV is protected against spreadsheet formula injection.
- Not built: automatic payment checks, invoices/GST bills, refunds, automatic reminders (reminders are sent by you via WhatsApp), gating for property-owner enquiry contacts.

## Local business directory (phase 8)
Any signed-in user can add a local business (tailor, tuition, clinic, transport, beauty, mobile repair, bakery, hardware, agri services, other) with locality, timings, contact number, offer and a short description. It stays PENDING until the admin approves it (portal > Local business listings); approval gives a free first period (as many days as the vendor plan). After that the business stays visible only while the owner has an active vendor plan (the owner sees "Not visible, pay the plan" with a Pay button). Customers need an active pass to browse (DIRECTORY is a gated listing; switch it off in Money settings). Each business shows Call and WhatsApp buttons. Admin can mark a business Featured (sponsored, shown first), hide or reject it. The owner can edit offer/timings and hide/show. Not built: photos, customer reviews, enquiry forms (customers call or WhatsApp directly).

## Grocery list reading and admin attention (phase 9)
- **List reading:** the List photo screen takes a photo (shrunk on the phone to 1280px) or a typed/pasted list. A photo is read by Catalyst Zia OCR on the server and deleted at once (never stored; needs the customer's AI-reading consent); a typed list needs no OCR. The parser understands English and Tamil (units: kg/kilo/கிலோ, g, L, ml, packet, dozen, pcs; fractions 1/2, 1 1/2, அரை, கால்; Tamil digits) and matches each line to the catalogue by English or Tamil name. Exact match is confident; partial matches are highlighted "check this"; unknown items are shown as "not found" and can be removed. The customer must confirm before anything goes to the cart: it is always a draft.
- **Limits you must test live:** Zia OCR is called with English; handwritten Tamil may read poorly, which is why typing is always offered. The OCR call itself was only tested against a mock.
- **Admin attention card** (top of the admin portal): payments, properties, businesses and workers waiting for approval; shop quotes and seller leads waiting; stores with no products; sellers and businesses with missing details. These are fixed rules, not AI.

## Still outside this project (needs you or an outside service)
SMS provider for OTP (MSG91 + DLT); WhatsApp Business API for automatic messages (today WhatsApp opens as a link); payment gateway (today manual UPI + admin confirm); photo uploads (needs Catalyst Stratus set up); an LLM for smarter reading of messy lists; legal/CA advice (GST, labour law, DPDP, FSSAI, RERA); Production environment; custom domain.

## SMS (OTP delivery)
Default `SMS_PROVIDER` is `console`: codes are only written to the function logs (testing only!). For real SMS set these function environment variables in the Catalyst console (Functions > aai_api > Configuration):
`SMS_PROVIDER=msg91`, `MSG91_AUTH_KEY=...`, `MSG91_TEMPLATE_ID=...` (India needs DLT registration and an approved OTP template). Optional: `ADMIN_PHONES=98XXXXXXXX,...` to force admin numbers. Never commit keys.

## Deploy (Catalyst CLI)
`cd functions/aai_api && npm install && npm test && cd ../.. && catalyst deploy`
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
Tested: API logic against a mocked Catalyst SDK (5 tests, incl. rate limit); storefront and portal run without errors in a simulated browser (jsdom). Not yet tested on the live Catalyst project or a real phone.

## Automatic deploy (GitHub Actions)
1. On your computer, once: `catalyst login`, `catalyst init` (link AAiHyper), then `catalyst token:generate` and copy the token.
2. Commit the files `catalyst init` created (`catalyst.json`, `.catalystrc`), then push.
3. GitHub repo > Settings > Secrets and variables > Actions > New secret: name `CATALYST_TOKEN`, value = the token.
4. Every push to `main` now runs the tests and deploys. Never put the token in the code or in chat. Regenerate it if it leaks.
