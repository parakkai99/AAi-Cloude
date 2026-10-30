# Data Store schema (AAiHyper project, Development) - ALREADY CREATED
Created and seeded through the Catalyst connection. Catalyst adds ROWID, CREATORID, CREATEDTIME, MODIFIEDTIME automatically.
ROWIDs are 17 digits (larger than JS safe integers): always treat them as strings.

| Table | Columns |
|---|---|
| stores | name_en, name_ta, owner_user_id, eta, whatsapp, status (varchar); delivery_fee, min_order (double) |
| products | store_id, name_en, name_ta, unit, status (varchar); price (double) |
| orders | customer_id, customer_name, customer_phone, store_id, address (255), slot, payment, status (varchar); subtotal, delivery_fee, total (double) |
| order_items | order_id, product_id, name (varchar); qty, price (double) |
| quotes | name, phone, store_id, items_text (255), address (255), status (varchar); estimate (double) |

Seeded: 3 stores, 12 products. Roles to create in Authentication: **Vendor**, **Admin** (everyone else is a customer).
