# Data Store schema (Catalyst, Development first)
Create each table in the console (Cloud Scale > Data Store). ROWID, CREATORID, CREATEDTIME, MODIFIEDTIME are automatic.
Types: text = Var Char, number = Double, int = Big Int.

| Table | Columns |
|---|---|
| companies | name (text), status (text) |
| stores | name_en, name_ta, company_id, owner_user_id, eta, status (text); delivery_fee, min_order (number) |
| products | store_id (text), name_en, name_ta, unit, status (text); price (number) |
| orders | customer_id, store_id, address, slot, payment, status (text); subtotal, delivery_fee, total (number) |
| order_items | order_id, product_id, name (text); qty, price (number) |

Roles (Authentication > Roles): Customer (default), Vendor, Admin.
Seed: see db/seed.zcql (run in the ZCQL console after creating tables).
