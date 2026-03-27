-- ============================================================================
-- Row Level Security (RLS) Policies for Supabase
-- ============================================================================
-- Your Next.js app connects via Prisma using the service_role / DB owner,
-- which BYPASSES RLS. These policies protect against direct access through
-- the Supabase client (anon key, PostgREST, Dashboard, etc.).
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).
-- ============================================================================

-- ─── HELPER: extract user id from the JWT ───────────────────────────────────
-- NextAuth stores the user id in the JWT `sub` claim.
-- Supabase exposes the JWT via auth.jwt().
-- Using `public` schema because hosted Supabase does not allow writes to `auth`.
CREATE OR REPLACE FUNCTION public.requesting_user_id() RETURNS text AS $$
  SELECT coalesce(
    (current_setting('request.jwt.claims', true)::json ->> 'sub'),
    (current_setting('request.jwt.claims', true)::json ->> 'id')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
  SELECT coalesce(
    (current_setting('request.jwt.claims', true)::json ->> 'role') = 'ADMIN',
    false
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ─── USERS ──────────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = public.requesting_user_id());

-- Users can update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = public.requesting_user_id());

-- Admins can read all users
CREATE POLICY "users_select_admin" ON users
  FOR SELECT USING (public.is_admin());

-- No direct INSERT/DELETE from client — handled by NextAuth server-side


-- ─── ACCOUNTS (OAuth) ──────────────────────────────────────────────────────
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Users can read their own linked accounts
CREATE POLICY "accounts_select_own" ON accounts
  FOR SELECT USING (user_id = public.requesting_user_id());

-- No direct INSERT/UPDATE/DELETE — managed by NextAuth server-side


-- ─── SESSIONS ───────────────────────────────────────────────────────────────
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own sessions
CREATE POLICY "sessions_select_own" ON sessions
  FOR SELECT USING (user_id = public.requesting_user_id());

-- No direct INSERT/UPDATE/DELETE — managed by NextAuth server-side


-- ─── VERIFICATION TOKENS ────────────────────────────────────────────────────
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

-- No client access at all — tokens are created/consumed server-side only
-- RLS enabled with no policies = deny all via client


-- ─── PRODUCTS ───────────────────────────────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read non-archived, non-deleted products
CREATE POLICY "products_select_public" ON products
  FOR SELECT USING (
    "isArchived" = false
    AND "deletedAt" IS NULL
  );

-- Admins can read ALL products (including archived/deleted)
CREATE POLICY "products_select_admin" ON products
  FOR SELECT USING (public.is_admin());

-- Admins can insert products
CREATE POLICY "products_insert_admin" ON products
  FOR INSERT WITH CHECK (public.is_admin());

-- Admins can update products
CREATE POLICY "products_update_admin" ON products
  FOR UPDATE USING (public.is_admin());

-- Admins can delete products
CREATE POLICY "products_delete_admin" ON products
  FOR DELETE USING (public.is_admin());


-- ─── CARTS ──────────────────────────────────────────────────────────────────
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- Users can read their own cart
CREATE POLICY "carts_select_own" ON carts
  FOR SELECT USING ("userId" = public.requesting_user_id());

-- Users can insert their own cart
CREATE POLICY "carts_insert_own" ON carts
  FOR INSERT WITH CHECK ("userId" = public.requesting_user_id());

-- Users can update their own cart
CREATE POLICY "carts_update_own" ON carts
  FOR UPDATE USING ("userId" = public.requesting_user_id());

-- Users can delete their own cart
CREATE POLICY "carts_delete_own" ON carts
  FOR DELETE USING ("userId" = public.requesting_user_id());

-- Admins can manage all carts
CREATE POLICY "carts_all_admin" ON carts
  FOR ALL USING (public.is_admin());


-- ─── CART ITEMS ─────────────────────────────────────────────────────────────
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Users can read items in their own cart
CREATE POLICY "cart_items_select_own" ON cart_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM carts WHERE carts.id = cart_items."cartId"
        AND carts."userId" = public.requesting_user_id()
    )
  );

-- Users can insert items into their own cart
CREATE POLICY "cart_items_insert_own" ON cart_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts WHERE carts.id = cart_items."cartId"
        AND carts."userId" = public.requesting_user_id()
    )
  );

-- Users can update items in their own cart
CREATE POLICY "cart_items_update_own" ON cart_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM carts WHERE carts.id = cart_items."cartId"
        AND carts."userId" = public.requesting_user_id()
    )
  );

-- Users can delete items from their own cart
CREATE POLICY "cart_items_delete_own" ON cart_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM carts WHERE carts.id = cart_items."cartId"
        AND carts."userId" = public.requesting_user_id()
    )
  );

-- Admins can manage all cart items
CREATE POLICY "cart_items_all_admin" ON cart_items
  FOR ALL USING (public.is_admin());


-- ─── ORDERS ─────────────────────────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can read their own orders
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING ("userId" = public.requesting_user_id());

-- Users can insert their own orders
CREATE POLICY "orders_insert_own" ON orders
  FOR INSERT WITH CHECK ("userId" = public.requesting_user_id());

-- Users can update their own pending orders (shipping address)
CREATE POLICY "orders_update_own" ON orders
  FOR UPDATE USING (
    "userId" = public.requesting_user_id()
    AND status = 'pending'
    AND "paymentStatus" != 'succeeded'
  );

-- Admins can manage all orders
CREATE POLICY "orders_all_admin" ON orders
  FOR ALL USING (public.is_admin());


-- ─── ORDER ITEMS ────────────────────────────────────────────────────────────
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Users can read items from their own orders
CREATE POLICY "order_items_select_own" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_items."orderId"
        AND orders."userId" = public.requesting_user_id()
    )
  );

-- No direct INSERT/UPDATE/DELETE — order items are created atomically with orders server-side

-- Admins can read all order items
CREATE POLICY "order_items_select_admin" ON order_items
  FOR SELECT USING (public.is_admin());


-- ─── PAYMENTS ───────────────────────────────────────────────────────────────
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can read payments for their own orders
CREATE POLICY "payments_select_own" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = payments."orderId"
        AND orders."userId" = public.requesting_user_id()
    )
  );

-- No direct INSERT/UPDATE/DELETE — payments are managed server-side (Stripe webhooks)

-- Admins can read all payments
CREATE POLICY "payments_select_admin" ON payments
  FOR SELECT USING (public.is_admin());


-- ============================================================================
-- GRANT minimal permissions to the anon and authenticated roles
-- ============================================================================
-- These restrict what PostgREST can even attempt before RLS kicks in.

-- Anon: can only read public products
GRANT SELECT ON products TO anon;

-- Authenticated: read/write on their own data
GRANT SELECT, INSERT, UPDATE, DELETE ON carts, cart_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON orders TO authenticated;
GRANT SELECT ON order_items, payments, products TO authenticated;
GRANT SELECT, UPDATE ON users TO authenticated;
GRANT SELECT ON accounts, sessions TO authenticated;
