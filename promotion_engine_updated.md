PROMOTION ENGINE – SPRINT BREAKDOWN
🧩 Struktur Sprint (Recommended)
Sprint duration: 1–2 minggu
Total: 5 Sprint (MVP → Advanced)
Fokus: dari basic → marketplace-level
🟢 SPRINT 1 – FOUNDATION (CORE ENGINE)
🎯 Goal:

Bisa bikin promo sederhana + apply ke cart

🧠 User Stories
1. Create Promotion (Basic)

As a admin
I want membuat promo diskon
So that bisa dipakai di transaksi

Acceptance Criteria:

Bisa pilih:
% discount / flat discount
Bisa set:
min transaksi
Bisa aktif/nonaktif
🛠️ Tasks
Backend
 Create table promotions
 Create table promotion_conditions
 Create table promotion_actions
 API:
POST /promotions
GET /promotions
 Basic calculation engine:
apply discount ke cart
Frontend
 Promotion list page
 Create promo form (simple)
 Input:
discount type
value
min transaction
QA
 Test create promo
 Test apply discount di cart
 Edge:
min transaksi tidak terpenuhi
🟡 SPRINT 2 – CONDITION ENGINE
🎯 Goal:

Support multi-condition + logic

🧠 User Stories
2. Advanced Conditions

As a admin
I want membuat kondisi kompleks
So that promo lebih fleksibel

Acceptance Criteria:

Bisa:
AND / OR
Support:
product
category
qty
platform
🛠️ Tasks
Backend
 Extend promotion_conditions
 Add:
operator (AND/OR)
group_id (untuk nested logic)
 Build condition evaluator
Frontend
 Condition builder UI:
Add condition button
Select type (product, qty, dll)
 Grouping logic UI (basic)
QA
 Test multi-condition
 Test AND vs OR logic
🟠 SPRINT 3 – ACTION & BUNDLING
🎯 Goal:

Support promo kompleks (bundle, buy X get Y)

🧠 User Stories
3. Bundle Promo

As a admin
I want membuat paket bundling
So that bisa upsell produk

4. Buy X Get Y

As a admin
I want promo beli X gratis Y

🛠️ Tasks
Backend
 Create bundles table
 Create bundle_items
 Extend action engine:
free item
bundle price
 Lock item system (biar ga double promo)
Frontend
 Bundle builder UI
 Select multiple products
 Free item selector
QA
 Test bundle pricing
 Test buy X get Y
 Test item locking
🔵 SPRINT 4 – STACKING + MARKETPLACE MODE
🎯 Goal:

Promo bisa digabung + simulasi Grab/Shopee

🧠 User Stories
5. Stacking Rules

As a admin
I want kontrol promo overlap

6. Marketplace Simulation

As a owner
I want lihat profit setelah fee & subsidi

🛠️ Tasks
Backend
 Add:
stacking_mode
priority
 Build stacking resolver:
stack
best price
exclusive
 Create promotion_funding
 Add:
merchant %
platform %
 Add commission logic
Frontend
 Stacking settings UI
 Marketplace toggle
 Input:
commission
subsidy
QA
 Test multiple promo
 Test best price logic
 Test funding split
🔴 SPRINT 5 – UI, ANALYTICS & OPTIMIZATION
🎯 Goal:

Production-ready + powerful UI

🧠 User Stories
7. Real-time Preview

As a user
I want lihat hasil promo langsung

8. Analytics

As a owner
I want lihat performa promo

🛠️ Tasks
Backend
 Create promotion_usage
 Tracking usage
 API analytics
Frontend
 Cart preview panel:
subtotal
discount
net
 Savings highlight
 Analytics dashboard
QA
 Test real-time calculation
 Test performance (no lag)
⚙️ CROSS-SPRINT TECH TASKS
🔥 Performance
 Cache promotions
 Optimize query
 Debounce cart update
🔐 Validation
 Prevent negative price
 Prevent double discount
 Prevent infinite loop
🧪 Testing
 Unit test:
condition engine
action engine
 Integration test:
full flow
📦 FINAL DELIVERABLE (MVP → ADVANCED)
Level	Feature
MVP	Basic discount
Mid	Condition + bundling
Advanced	Stacking + marketplace
Pro	Analytics + optimization
🔥 RECOMMENDATION (JUJUR)

Kalau resource terbatas:

👉 Prioritas:

Condition Engine
Bundling
Stacking

👉 Marketplace simulation bisa nyusul