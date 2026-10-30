# AAi Hyper (Phase 1: Daily Essentials)
Hyperlocal marketplace for Tamil Nadu villages. Tamil/English, mobile-first.

```
client/               Web client (static site, hosted by Catalyst Web Client Hosting)
functions/aai_api/    Advanced I/O function (Node 18, Express): stores, products, orders, vendor, admin
db/                   Data Store schema and seed
```

## Deploy (Catalyst CLI)
1. In the Catalyst console create a project named **AAi Hyper**.
2. `npm i -g zcatalyst-cli && catalyst login`
3. In this folder: `catalyst init` (choose Functions + Client, link the AAi Hyper project, keep existing files).
4. `cd functions/aai_api && npm install && cd ../..`
5. Create tables and roles per `db/schema.md`, run `db/seed.zcql`.
6. `catalyst deploy` then open the Web Client URL printed by the CLI.
7. API base: `<project-domain>/server/aai_api/` (health: `/server/aai_api/health`).

## Git
```
git remote add origin https://github.com/parakkai99/AAi-Cloude.git
git push -u origin main
```

## Status
- Client: branded storefront (demo data, local cart and orders). Next: call the API, add Catalyst sign-in, vendor and admin portals.
- API: written, not yet run against a live project.
