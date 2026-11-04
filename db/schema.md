# Data Store schema (AAiHyper, Development): ALREADY CREATED
ROWIDs are 17 digits: treat them as strings. Times in otp_codes are epoch SECONDS.

| Table | Columns |
|---|---|
| stores | name_en, name_ta, owner_user_id (unused), eta, whatsapp, status; delivery_fee, min_order |
| products | store_id, name_en, name_ta, unit, status; price |
| orders | customer_id, customer_name, customer_phone, store_id, address, slot, payment (always 'none'), status (PLACED, DELIVERED, REJECTED); subtotal, delivery_fee, total |
| order_items | order_id, product_id, name; qty, price |
| quotes | name, phone, store_id, items_text, address, status (NEW, REPLIED); estimate |
| users | phone (unique), name, role (CUSTOMER, VENDOR, WORKER, ADMIN), store_id, status (ACTIVE, DISABLED) |
| otp_codes | phone, code_hash, used; created_ms, expires_ms, attempts |
| config | k (unique), v: holds the generated session-signing secret |
| service_requests | customer_id, customer_name, customer_phone, category, description, address, preferred, status (NEW, QUOTED, ACCEPTED, DONE), worker_id, worker_name, worker_phone, note; quote_amount |
| users.skill | trade for WORKER users: PLUMBING, ELECTRICAL, CLEANING, APPLIANCE, PAINTING, CARPENTRY, OTHER |
| event_requests | customer_id, customer_name, customer_phone, category (ECATS), event_type, date_from, date_to (YYYY-MM-DD), venue, description, status (NEW, QUOTED, BOOKED, DONE, CANCELLED), vendor_id, vendor_name, vendor_phone, note; guests, budget, quote_amount |
| vendor_busy | slot_key (UNIQUE vendor:day, stops double booking), vendor_id, day, request_id ('BLOCK' for days the artist blocked) |
| sellers | slug (unique), name, city, district, category (TEXTILES, COMPUTERS, MOBILES, HOME_KITCHEN, FURNITURE, BEAUTY, FOODS, POOJA, HANDICRAFTS, OTHER), about, youtube_url, facebook_url, instagram_url, price_range, delivery_area, verified (yes/no), status (LIVE/HIDDEN); min_order |
| seller_products | seller_id, name, description; ref_price (0 = ask price) |
| seller_leads | seller_id, seller_name, customer_id, customer_name, customer_phone, requirement, location, product_name, status (NEW, CONTACTED, WON, LOST; EXPIRED is computed), valid_until (15 days), dedupe_key (UNIQUE customer:seller:day); budget |
| properties | owner_id, owner_name, owner_phone, mode (RENT/SALE), ptype (HOUSE, FLAT, ROOM, PLOT, LAND, SHOP, WAREHOUSE), title, locality, district, description, approval_info, video_url, status (PENDING, LIVE, UNDER_NEGOTIATION, CLOSED, INACTIVE, REJECTED), approved (yes/no), broker, available_from, admin_note, fp (UNIQUE fingerprint: duplicate detection); price, deposit, bhk, area_sqft |
| property_enquiries | property_id, property_title, owner_id, customer_id, customer_name, customer_phone, message, visit_date, status (NEW, CONTACTED, VISIT_SCHEDULED, CLOSED), dedupe_key (UNIQUE customer:property:day) |
| labour_profiles | user_id (UNIQUE), name, phone, trade (MASON, CARPENTER, ELECTRICIAN, PLUMBER, PAINTER, TILE_WORKER, WELDER, HELPER, SUPERVISOR, GANG_LEADER), level (BEGINNER, SKILLED, EXPERT), languages, tools, district (Title Case), verified (yes/no, set by admin), available (yes/no); experience_yrs, daily_rate, team_size, rating_sum, rating_count |
| job_posts | poster_id, poster_name, poster_phone, trade, locality, district, notes, start_date, end_date, status (OPEN, FILLED, CLOSED); headcount, days, wage, selected_count |
| job_applications | job_id, worker_id, worker_name, worker_phone, poster_id, trade, locality, start_date, end_date, status (APPLIED, SELECTED, REJECTED, WITHDRAWN, RELEASED, COMPLETED), dedupe_key (UNIQUE job:worker); rating_worker, rating_poster (0 = not rated) |
| work_days | app_id, day, status (PRESENT/ABSENT), wkey (UNIQUE app:day); ot_hours |
Worker calendar reuses vendor_busy (vendor_id = worker user id, request_id = 'JOB:<application id>'), so a worker cannot be double-booked.
| payments | user_id, user_name, user_phone, plan (CLIENT/VENDOR), utr (UNIQUE: UPI reference, or CASH-<time>), status (PENDING, CONFIRMED, REJECTED), method (UPI/CASH), note, period_start, period_end, confirmed_on, decided_by; amount, base_amount, gst_amount, days |
| subscriptions | skey (UNIQUE user:plan), user_id, user_name, user_phone, plan, valid_until (inclusive, YYYY-MM-DD), started_on |
| unlocks | ukey (UNIQUE user:kind:ref), user_id, kind (ORD, QUO, LEAD, SVC, EVT, JOB), ref_id: each row uses one free-sample customer |
| followups | user_id, user_name, user_phone, plan, note, due_date, status (OPEN/DONE), created_by |
config keys (table config, k/v): price_client, days_client, price_vendor, days_vendor, free_sample, gated (STORES,SELLERS,PROPERTY or NONE), upi_id, upi_name, gst_pct. Defaults in code: Rs100/15 days client, Rs299/30 days vendor, 5 free, 18% GST.
| businesses | owner_id, owner_name, name, category (TAILOR, TUITION, CLINIC, TRANSPORT, BEAUTY, MOBILE_REPAIR, BAKERY, HARDWARE, AGRI, OTHER), district (Title Case), locality, about, timings, phone, offer, status (PENDING, LIVE, HIDDEN, REJECTED), approved (yes/no), featured (yes/no = sponsored), listed_until (free first period after approval), admin_note, fp (UNIQUE: duplicate check) |
