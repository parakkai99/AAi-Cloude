# AAi Hyper: project memory (read this first)
Hyperlocal marketplace for Tamil Nadu villages. Tamil + English, mobile-first, low bandwidth. Owner: parakkai99. Repo: github.com/parakkai99/AAi-Cloude.

## Hard decisions (do not change without asking the owner)
- NO payment gateway. Money is collected by MANUAL UPI: person pays the owner's UPI ID and enters the UTR; admin confirms against the bank statement (portal > Money). Customers pay Rs100/15-day pass to see gated listings; vendors get 5 free customers then a monthly plan (Rs299/30 days). All prices/gating are admin settings.
- ALL sign-in is mobile number + 6-digit OTP (shopkeepers/workers have no email). Email login (Catalyst "App Administrator") is optional, admins only.
- Platform is a connector: it is not the seller, employer or warranty provider. Seller directory is reference-only (no cart/checkout/delivery).
- Customer phone/address stays hidden from vendors/workers/artists until the customer accepts a quote or the booking is made. Seller phones are never public.
- AI output (when added) is always a draft; nothing is published or routed without human confirmation.

## Stack / ids
Zoho Catalyst, Development env only so far. org 60092070503, project AAiHyper id 83863000000023002.
Function `functions/aai_api` (Advanced I/O, Node 18, Express, one file index.js). Web client `client/` (plain HTML/JS, no build): index.html (customers), portal.html (vendors, workers, artists, sellers, admin).
Live URL base: https://aaihyper-60092070503.development.catalystserverless.in/ (site `/app/`, API `/server/aai_api/`).
ROWIDs are 17 digits: ALWAYS strings, never numbers. Money in rupees (double). Times in otp_codes are epoch seconds.

## Roles (users.role)
CUSTOMER, VENDOR (store_id=store), WORKER (skill=trade), ARTIST (skill=event service), SELLER (store_id=seller id), ADMIN. Admin adds team by mobile number in portal > Team. First admin: sign in with Catalyst email (App Administrator), then add own mobile as ADMIN.

## Built and tested (30 API tests, jsdom UI tests; NOT yet verified on the live project after phase 1)
1. Daily essentials: stores, products, orders PLACED -> DELIVERED/REJECTED, WhatsApp Get Quote, order tracking.
2. Home services: NEW -> QUOTED -> ACCEPTED -> DONE (decline reopens).
3. Events: enquiry -> artist quote -> accept books dates; vendor_busy UNIQUE(vendor:day) prevents double booking; artists can block days; cancel frees dates.
4. Seller directory: sellers, products, quote leads (consent, dedupe per customer+seller+day, 15-day validity, up to 5 matching sellers).
5. Real estate: properties (admin-approved before public, duplicate fingerprint), enquiries with visit dates, owner status control. No photos yet (needs Stratus).
6. Manpower (matching only): verified worker profiles, job posts, apply/select/release, worker dates reserved in vendor_busy (no double booking), poster-marked attendance, completion, two-way ratings. Admin must verify workers. Needs labour-law advice before real use.
7. Money: client pass + vendor plan, free sample unlocks, gated listings (STORES, SELLERS, PROPERTY), payments ledger with GST split, revenue report, CSV, follow-ups with WhatsApp reminders.
8. Local business directory: admin-approved listings, free first period then visible only while the owner has a vendor plan, featured/sponsored first, gated by the customer pass (DIRECTORY).
9. List reading: POST /grocery/parse (typed) and /grocery/ocr (Zia OCR photo, deleted at once), Tamil+English parser, catalogue matching, always a draft. Admin attention report (/admin/attention, fixed rules).
Tables: businesses, payments, subscriptions, unlocks, followups, labour_profiles, job_posts, job_applications, work_days, properties, property_enquiries, stores, products, orders, order_items, quotes, users, otp_codes, config, service_requests, event_requests, vendor_busy, sellers, seller_products, seller_leads (see db/schema.md).

## Status of deployment
Phase 1 + role mapping were deployed and checked live (orders saved, delivered). Everything after (OTP auth, services, events, sellers, real estate, manpower, money, directory, list reading) is committed but NOT yet deployed. Deploy: unzip overwrite zip into project folder, `cd functions/aai_api && npm install && npm test && cd ../.. && catalyst deploy`. Check `/server/aai_api/health`.
OTP SMS is in console mode (code only in function logs) until SMS_PROVIDER=msg91 + MSG91_AUTH_KEY + MSG91_TEMPLATE_ID are set in Catalyst function config (India needs DLT). Never commit keys.

## Not built yet / next
Real Estate extras (photos via Stratus, document vault, edit listing, map), LLM-based reading, automatic WhatsApp/SMS notifications, photos (Stratus), reviews, payment gateway, Manpower extras, Production deploy (GPS/OTP attendance, ID upload, direct worker requests), AI helpers (list-photo OCR is a demo stub), notifications to vendors/sellers, SEO URLs, lead fees/subscriptions, event holds/reminders/committee accounts, Production environment.

## Working rules
Keep replies short and token-cheap. Test before packaging (`node --test`). Edit files in place; give the owner ONE overwrite zip only when asked. Changes to the live database: create tables/columns via the Catalyst connector, then update db/schema.md.
