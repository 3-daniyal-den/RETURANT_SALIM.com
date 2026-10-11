# Sweet Salim Restaurant - Complete Setup & Deployment Guide

This guide provides end-to-end instructions for deploying and running the **Sweet Salim** restaurant application, connecting the Supabase database, configuring Edge Functions, setting up transactional email via Resend, and launching the admin dashboard.

---

## 1. Prerequisites

- A free account at [Supabase](https://supabase.com).
- A free account at [Resend](https://resend.com) (for transactional emails).
- [VS Code](https://code.visualstudio.com) with the **Live Server** extension (or any static HTTP server).
- Optional: [Supabase CLI](https://supabase.com/docs/guides/cli) installed if deploying functions via terminal.

---

## 2. Step 1: Create a Supabase Project

1. Log in to the [Supabase Dashboard](https://app.supabase.com).
2. Click **New Project**.
3. Choose your organization, set the project name (e.g. `sweetsalim-restaurant`), and pick a strong database password.
4. Select a region close to your primary customers (e.g., *Singapore* or *Frankfurt*).
5. Wait ~2 minutes for the database instance to initialize.

---

## 3. Step 2: Apply Database Schema & Seed Data

1. In the Supabase Dashboard, click the **SQL Editor** icon in the left navigation.
2. Click **New query**.
3. Open `supabase/schema.sql` from this project, copy its entire contents, paste it into the SQL editor, and click **Run**.
   - This creates tables (`products`, `orders`, `order_items`, `order_status_history`, `admin_profiles`), custom ENUM types, helper triggers, and strict Row Level Security (RLS) policies.
4. Open `supabase/seed.sql`, paste it into a new query tab, and click **Run**.
   - This populates the catalog with traditional mithai, royal savories, celebration cakes, and beverages with realistic PKR prices.

---

## 4. Step 3: Configure Frontend-Safe Supabase Credentials

1. In your Supabase Dashboard, go to **Project Settings** -> **API**.
2. Copy:
   - **Project URL** (e.g., `https://xyzcompany.supabase.co`)
   - **Project API Keys** -> `anon` / `public` key (e.g., `eyJhbGciOi...`)
3. Open `js/config.js` in your code editor.
4. Replace the placeholders in `CONFIG.SUPABASE`:
   ```javascript
   SUPABASE: {
     url: 'https://xyzcompany.supabase.co',
     anonKey: 'eyJhbGciOi...',
     // ...
   }
   ```
> [!IMPORTANT]
> **NEVER** place your `service_role` key in `js/config.js`. The frontend code is publicly readable by anyone inspecting browser source. The `service_role` key must only reside in Supabase Edge Functions.

---

## 5. Step 4: Configure Resend for Transactional Emails

1. Sign in to [Resend Dashboard](https://resend.com).
2. Go to **API Keys** -> click **Create API Key**.
3. Name it `Sweet Salim Orders` and copy the key (`re_...`).
4. **Sender Verification:**
   - For rapid testing, Resend allows sending emails using their sandbox address: `Sweet Salim <onboarding@resend.dev>`.
   - In production, add your custom domain (e.g. `sweetsalim.com`) under **Domains** and add the required DNS records (DKIM, SPF, MX) to your DNS registrar.

---

## 6. Step 5: Deploy Supabase Edge Functions & Secrets

### Option A: Via Supabase CLI (Recommended)

1. Log in to the CLI:
   ```bash
   npx supabase login
   ```
2. Link your local project:
   ```bash
   npx supabase link --project-ref your-project-id
   ```
3. Set the Edge Function secrets in the cloud:
   ```bash
   npx supabase secrets set RESEND_API_KEY="re_your_api_key_here"
   npx supabase secrets set SENDER_EMAIL="Sweet Salim <onboarding@resend.dev>"
   npx supabase secrets set OWNER_EMAIL="orders@sweetsalim.com"
   ```
4. Deploy all three Edge Functions:
   ```bash
   npx supabase functions deploy place-order
   npx supabase functions deploy update-order-status
   npx supabase functions deploy send-order-email
   ```

### Option B: Via Supabase Dashboard (Web Interface)
1. Go to **Edge Functions** in your Supabase Dashboard.
2. Add secrets under **Function Secrets**:
   - `RESEND_API_KEY`
   - `SENDER_EMAIL`
   - `OWNER_EMAIL`
3. Create each function with the code located in `supabase/functions/<name>/index.ts`.

---

## 7. Step 6: Create the First Admin Account

1. In Supabase Dashboard, go to **Authentication** -> **Users**.
2. Click **Add user** -> **Create user**.
3. Enter:
   - Email: `admin@sweetsalim.com`
   - Password: Choose a secure password
   - Auto Confirm User: Checked
4. In the **SQL Editor**, register this user as an authorized admin in the `admin_profiles` table:
   ```sql
   INSERT INTO public.admin_profiles (id, email, full_name, role)
   VALUES (
     (SELECT id FROM auth.users WHERE email = 'admin@sweetsalim.com'),
     'admin@sweetsalim.com',
     'Master Chef Salim',
     'superadmin'
   );
   ```

---

## 8. Step 7: Run Locally with VS Code Live Server

1. Open the project folder `sweetsalim-restaurant` in VS Code.
2. Right-click on `index.html` and select **Open with Live Server**.
3. The site opens at `http://127.0.0.1:5500/index.html`.

> [!NOTE]
> **Built-in Demo Simulation:**
> If you have not yet set up Supabase cloud credentials, the website automatically runs in **Seamless Demo Mode**. You can browse dishes, add to cart, check out with coupons (`SWEET10`), receive a realistic tracking code (`SSL-2026-XXXXX`), track the order, and update order statuses in `admin.html` (demo login: `admin@sweetsalim.com` / `salim1984`).

---

## 9. Step 8: Quality Assurance & Testing Checklist

- [ ] **Menu Navigation:** Verify filtering by category (Mithai, Meals, Cakes, Savories, Beverages) and live search.
- [ ] **Quick View Modal:** Click the eye/quick-view icon on any product card, adjust quantities, and add to cart.
- [ ] **Cart Operations:** Check opening drawer, updating quantities, observing the free delivery progress bar (threshold Rs. 2,500), and removing items.
- [ ] **Checkout Validation:**
  - Enter customer name, phone number, and street address.
  - Apply promo code `SWEET10` and verify the 10% discount.
  - Click **Confirm & Place Royal Order**.
- [ ] **Order Confirmation:** Verify generation of the unique tracking code (`SSL-2026-XXXXX`).
- [ ] **Live Tracking:** Navigate to `track-order.html?track=SSL-...` and test the 5-step progress timeline.
- [ ] **Admin Operations:**
  - Log in to `admin.html`.
  - Check that the new order appears with customer details and line items.
  - Update status to `Preparing`, `Ready for Dispatch`, and `Delivered`.
  - Toggle stock availability and edit product prices in the Inventory tab.

---

## 10. Step 9: Deploying to Production

This frontend is 100% static HTML5/CSS/JavaScript. It can be hosted for free on:
- **Netlify:** Drag and drop the `sweetsalim-restaurant` folder to [app.netlify.com/drop](https://app.netlify.com/drop).
- **Vercel:** Run `vercel deploy` or import your GitHub repository.
- **GitHub Pages:** Push to a repository and enable GitHub Pages on the `main` branch.
- **Cloudflare Pages:** Connect repository and select `/` as the build output directory.
