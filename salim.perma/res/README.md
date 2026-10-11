# Sweet Salim — Royal Confections & Authentic Cuisine

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Edge%20Functions-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com)
[![Resend](https://img.shields.io/badge/Resend-Transactional%20Email-black?style=flat)](https://resend.com)

A complete, production-ready, professional e-commerce restaurant website crafted for **Sweet Salim**. Established in 1984 in Lahore, Sweet Salim represents the pinnacle of handcrafted royal mithai, 100% pure desi ghee confections, and authentic Pakistani Mughlai dining.

---

## 🌟 Key Highlights

- **Bespoke Royal Aesthetic:** Custom design system built with deep burgundy (`#4E0D17`, `#38070E`), metallic gold (`#D4AF37`, `#C5A059`), and rich warm ivory cream (`#FDFBF7`), paired with typography from *Playfair Display* and *Plus Jakarta Sans*.
- **Realistic Food Photography:** Authentic, high-resolution imagery featuring pure khoya Gulab Jamun, motichoor ladoo, dum mutton biryanis, and Belgian chocolate truffle cakes.
- **Strict Clean Architecture:** Separate semantic HTML5 pages, modular CSS stylesheets, and distinct JavaScript controllers. Zero bloated frameworks or bundlers required.
- **Robust E-Commerce Cart:** Persistent slide-out cart drawer, dynamic item stepper, free express delivery progress bar (threshold: Rs. 2,500), and instant badge synchronization across all pages.
- **Server-Validated Checkout:** Untrusted client prices are strictly recalculated against backend catalog prices in Supabase Edge Functions before orders are accepted.
- **Real-Time Order Tracking:** 5-step visual tracking timeline (`Received` &rarr; `Preparing` &rarr; `Ready for Dispatch` &rarr; `On The Way` &rarr; `Delivered`) protected by tracking code and phone/email verification.
- **Transactional Notifications via Resend:** Itemized HTML email receipts automatically dispatched to customers and instant order alerts to kitchen staff.
- **Operations & Kitchen Dashboard:** Protected admin portal for managing incoming live orders, changing order statuses, updating pricing, and toggling in-stock inventory.

---

## 📁 Project Directory Structure

```text
sweetsalim-restaurant/
├── index.html                  # Homepage with hero, categories, bestsellers & reviews
├── menu.html                   # Royal Menu with category filters, live search & sorting
├── about.html                  # Brand story, 40-year legacy & 4 quality pillars
├── contact.html                # Location, concierge form, FAQs & direct WhatsApp link
├── checkout.html               # Multi-step checkout with coupon code & verification
├── track-order.html            # 5-stage interactive order timeline & status lookup
├── admin.html                  # Kitchen administration, orders & inventory portal
├── css/
│   ├── style.css               # Core design system, components, modals & typography
│   ├── responsive.css          # Responsive breakpoints (desktop, tablet, mobile)
│   └── admin.css               # Admin dashboard layout, metrics & status pills
├── js/
│   ├── config.js               # Frontend-safe configuration (Supabase URL, anon key, brand)
│   ├── products.js             # Catalog engine, sample dishes in PKR & search logic
│   ├── cart.js                 # Cart state management, drawer UI & localStorage sync
│   ├── checkout.js             # Form validation, promo codes & order placement
│   ├── order-tracking.js       # Live tracking timeline & verification controller
│   ├── contact.js              # Contact form handling & WhatsApp integration
│   ├── admin.js                # Admin authentication, metrics & order status updates
│   └── script.js               # Global UI scripts, Quick View modal & toast alerts
├── assets/
│   ├── logo/
│   │   ├── logo.svg            # Royal crest & typography logo
│   │   └── logo-mark.svg       # Favicon and compact app mark
│   ├── icons/                  # Visual SVG icons
│   └── images/                 # Curated photography assets
├── supabase/
│   ├── schema.sql              # Database tables, RLS policies, indexes & RPCs
│   ├── seed.sql                # Initial products seed data in PKR
│   └── functions/
│       ├── place-order/        # Edge function: Server price verification & order insert
│       ├── update-order-status/# Edge function: Status change & customer email alert
│       └── send-order-email/   # Edge function: Resend HTML transactional emails
├── .env.example                # Backend secrets template
├── .gitignore                  # Git ignore rules for secrets and caches
├── README.md                   # Project overview & documentation
└── SETUP.md                    # Step-by-step Supabase & Resend deployment guide
```

---

## 🚀 Quick Start (Running Locally)

1. Open the project folder `sweetsalim-restaurant` in **VS Code**.
2. If you have the **Live Server** extension installed:
   - Right-click `index.html` &rarr; click **Open with Live Server**.
   - The website will launch at `http://127.0.0.1:5500`.
3. **Demo Preview Mode:**
   - The application is equipped with a smooth built-in demo simulation. You can browse dishes, use coupons (`SWEET10`), place orders, receive an `SSL-2026-` tracking number, and update orders in `admin.html` without needing to configure cloud credentials immediately.
4. **Connecting to Production:**
   - Refer to [`SETUP.md`](SETUP.md) for detailed instructions on creating a Supabase project, running `schema.sql`, deploying Edge Functions, and connecting Resend API keys.

---

## 🔒 Security Best Practices

- **Zero Service-Role Leakage:** The `service_role` key and `RESEND_API_KEY` are strictly confined to backend Edge Functions.
- **Untrusted Browser Totals:** The `place-order` Edge Function queries the authoritative database product table, recalculating unit prices and totals on the server.
- **Protected Tracking:** Order lookups require matching tracking codes with customer phone numbers or email addresses to prevent enumeration attacks.
- **Row Level Security (RLS):** Orders and internal tables are protected by PostgreSQL RLS policies in `supabase/schema.sql`.

---

## 📜 License & Ownership

Designed for **Sweet Salim Restaurant & Confectionery**. All rights reserved.
