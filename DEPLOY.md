# AAi Hyper: deploy checklist (Catalyst, Development)

## 1. Copy and deploy (about 10 minutes)
1. Extract AAi-Cloude-overwrite.zip into your Catalyst project folder (the one with catalyst.json). Choose Replace.
2. Check `dir functions\aai_api\index.js` shows about 109,000 bytes (not 964).
3. In a terminal:
   cd functions\aai_api
   npm install
   npm test            (30 tests must pass)
   cd ..\..
   catalyst deploy
4. Open https://aaihyper-60092070503.development.catalystserverless.in/server/aai_api/health  -> {"ok":true,...}
5. git add -A ; git commit -m "all phases" ; git push

## 2. First-time setup on the live site (in this order)
1. Open /app/portal.html -> "sign in with email" link (your Catalyst admin).
2. Team -> add YOUR mobile number as ADMIN. From now on sign in by OTP.
3. Money and follow-up -> Prices and settings: set your UPI ID, vendor price (default 299 / 30 days), customer pass (100 / 15 days), free customers (5), GST %, and which listings customers pay for. Save.
4. Team -> add vendors (store), workers (trade), artists (service), sellers by mobile number.
5. Add stores/products/sellers/businesses as needed (portal).

## 3. Test once with your own phone
Sign in (OTP) -> paywall -> pay by UPI and enter the 12-digit reference -> admin Confirm -> listings open -> place an order -> vendor unlocks and delivers -> type a list in List photo.

## 4. Before real customers
- SMS provider for OTP: set SMS_PROVIDER=msg91, MSG91_AUTH_KEY, MSG91_TEMPLATE_ID in the function configuration (India needs DLT). Until then OTP codes appear only in the function logs.
- Test the photo list reader (Zia OCR) live; typing a list always works.
- Take advice from a CA / lawyer: GST on passes and plans, labour law (Manpower), privacy (DPDP), FSSAI, RERA.
- Production environment needs its own deploy, tables and users.

## What is built
Daily essentials, mobile OTP login, home services, events (no double booking), seller directory, real estate, manpower matching, money (client pass, vendor plan, free sample, manual UPI, accounts, follow-ups), local business directory, list reading, admin attention report. See README.md and CLAUDE.md.
