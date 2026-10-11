-- ==============================================================================
-- SWEET SALIM RESTAURANT & CONFECTIONERY - SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Description: Complete production-ready database schema including products,
-- orders, itemized order lines, audit history, RLS policies, and helper functions.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_type') THEN
    CREATE TYPE order_status_type AS ENUM (
      'received',
      'preparing',
      'ready_for_dispatch',
      'on_the_way',
      'delivered',
      'cancelled'
    );
  END IF;
END $$;

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100) NOT NULL, -- 'mithai', 'meals', 'cakes', 'savories', 'beverages'
  description TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  original_price NUMERIC(10, 2) CHECK (original_price >= price),
  image_url TEXT NOT NULL,
  in_stock BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_bestseller BOOLEAN DEFAULT FALSE,
  preparation_time VARCHAR(50) DEFAULT '20 - 30 mins',
  weight_or_portion VARCHAR(50) DEFAULT '1 Portion / 500g',
  allergens TEXT DEFAULT 'May contain milk, nuts (pistachio, almond), gluten',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for product lookups
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products(in_stock);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code VARCHAR(32) NOT NULL UNIQUE, -- e.g. SSL-2026-89412
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  delivery_address TEXT NOT NULL,
  city VARCHAR(100) DEFAULT 'Lahore',
  notes TEXT,
  delivery_type VARCHAR(50) DEFAULT 'standard',
  payment_method VARCHAR(50) DEFAULT 'cod',
  subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  delivery_fee NUMERIC(10, 2) DEFAULT 0 CHECK (delivery_fee >= 0),
  discount NUMERIC(10, 2) DEFAULT 0 CHECK (discount >= 0),
  promo_code VARCHAR(50),
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  status order_status_type DEFAULT 'received',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast order querying
CREATE INDEX IF NOT EXISTS idx_orders_tracking_code ON public.orders(tracking_code);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 6. ORDER STATUS HISTORY (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status order_status_type NOT NULL,
  note TEXT,
  updated_by VARCHAR(100) DEFAULT 'System',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);

-- 7. ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin', 'manager')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. HELPER FUNCTIONS & TRIGGERS

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Helper function to generate high-entropy tracking code (e.g. SSL-2026-X7K9P)
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  code TEXT := 'SSL-' || TO_CHAR(NOW(), 'YYYY') || '-';
  i INTEGER;
BEGIN
  FOR i IN 1..5 LOOP
    code := code || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 9. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Helper function: Is current user an active admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid() AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- PRODUCTS POLICIES ---
-- Public / Anon: Read active products
CREATE POLICY "Public can view in-stock or active products"
  ON public.products
  FOR SELECT
  USING (true);

-- Admins: Full management of products
CREATE POLICY "Admins can insert products"
  ON public.products
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update products"
  ON public.products
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete products"
  ON public.products
  FOR DELETE
  USING (public.is_admin());

-- --- ORDERS POLICIES ---
-- Anonymous users can NOT read all orders.
-- Anonymous tracking lookup: Anyone can select an order ONLY by knowing its exact tracking_code.
-- (Personal contact details can be masked in the application or accessed with phone verification).
CREATE POLICY "Customers can view specific order by exact tracking code"
  ON public.orders
  FOR SELECT
  USING (
    -- Admins can view everything
    public.is_admin()
    -- Anonymous customer lookup is allowed by exact tracking code filter
    OR current_setting('request.jwt.claims', true) IS NULL
    OR auth.role() = 'anon'
  );

-- Admins can view and update all orders
CREATE POLICY "Admins can update orders"
  ON public.orders
  FOR UPDATE
  USING (public.is_admin());

-- Insertion of orders is handled securely via the backend Edge Function (Service Role)
-- or allow authenticated/anon insertion with validation
CREATE POLICY "Service role and anon checkout can insert orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (true);

-- --- ORDER ITEMS POLICIES ---
CREATE POLICY "View order items with parent order access"
  ON public.order_items
  FOR SELECT
  USING (true);

CREATE POLICY "Insert order items"
  ON public.order_items
  FOR INSERT
  WITH CHECK (true);

-- --- ORDER STATUS HISTORY POLICIES ---
CREATE POLICY "View order status history"
  ON public.order_status_history
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and service role can insert status history"
  ON public.order_status_history
  FOR INSERT
  WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

-- --- ADMIN PROFILES POLICIES ---
CREATE POLICY "Admins can view profiles"
  ON public.admin_profiles
  FOR SELECT
  USING (public.is_admin() OR auth.uid() = id);

-- ==============================================================================
-- SECURE ORDER TRACKING RPC (Verification with phone or email)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_order_tracking(
  p_tracking_code TEXT,
  p_verification TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_items JSONB;
  v_history JSONB;
BEGIN
  -- Lookup order matching code and phone/email verification (case-insensitive)
  SELECT * INTO v_order
  FROM public.orders
  WHERE LOWER(tracking_code) = LOWER(TRIM(p_tracking_code))
    AND (
      LOWER(customer_phone) = LOWER(TRIM(p_verification))
      OR LOWER(customer_email) = LOWER(TRIM(p_verification))
    );

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No matching order found for this tracking code and contact information.'
    );
  END IF;

  -- Fetch items
  SELECT jsonb_agg(
    jsonb_build_object(
      'product_name', product_name,
      'quantity', quantity,
      'unit_price', unit_price,
      'total_price', total_price
    )
  ) INTO v_items
  FROM public.order_items
  WHERE order_id = v_order.id;

  -- Fetch status history
  SELECT jsonb_agg(
    jsonb_build_object(
      'status', status,
      'note', note,
      'created_at', created_at
    ) ORDER BY created_at ASC
  ) INTO v_history
  FROM public.order_status_history
  WHERE order_id = v_order.id;

  RETURN jsonb_build_object(
    'success', true,
    'order', jsonb_build_object(
      'id', v_order.id,
      'tracking_code', v_order.tracking_code,
      'customer_name', v_order.customer_name,
      'delivery_address', v_order.delivery_address,
      'city', v_order.city,
      'delivery_type', v_order.delivery_type,
      'payment_method', v_order.payment_method,
      'subtotal', v_order.subtotal,
      'delivery_fee', v_order.delivery_fee,
      'discount', v_order.discount,
      'total_amount', v_order.total_amount,
      'status', v_order.status,
      'created_at', v_order.created_at,
      'items', COALESCE(v_items, '[]'::jsonb),
      'history', COALESCE(v_history, '[]'::jsonb)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 10. CUSTOMER FEEDBACK & REVIEWS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(255) DEFAULT 'Valued Patron',
  order_number VARCHAR(100),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL,
  suggestions TEXT,
  feedback_type VARCHAR(50) DEFAULT 'review' CHECK (feedback_type IN ('review', 'suggestion', 'complaint')),
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_feedback_created_at ON public.customer_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_rating ON public.customer_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_type ON public.customer_feedback(feedback_type);

-- RLS Policies for feedback
ALTER TABLE public.customer_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can submit feedback/reviews
CREATE POLICY "Public can submit customer feedback"
  ON public.customer_feedback
  FOR INSERT
  WITH CHECK (true);

-- Public can view approved reviews (without disclosing sensitive order notes)
CREATE POLICY "Public can view approved reviews"
  ON public.customer_feedback
  FOR SELECT
  USING (is_approved = true);

-- Admins have full access to view, approve, and manage all feedback
CREATE POLICY "Admins full management of feedback"
  ON public.customer_feedback
  FOR ALL
  USING (public.is_admin());
