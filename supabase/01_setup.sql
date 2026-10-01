-- ==========================================================================
-- Hoovu Studio: database setup (run once in Supabase > SQL Editor)
-- Creates: products, orders, order_items, admins
-- Customers place orders through place_order(), which recalculates
-- every price and total on the server. The browser's numbers are ignored.
-- ==========================================================================

-- 1. TABLES ---------------------------------------------------------------

create table public.products (
  id       text primary key,
  name     text not null,
  price    integer not null check (price >= 0),
  colours  text[] not null default '{}',
  active   boolean not null default true
);

create table public.orders (
  id               bigint generated always as identity primary key,
  order_id         text not null unique,
  user_id          uuid references auth.users (id) on delete set null,
  customer_name    text not null,
  phone            text not null,
  email            text not null,
  delivery_address text not null,
  notes            text not null default '',
  subtotal         integer not null,
  shipping         integer not null,
  total            integer not null,
  status           text not null default 'pending'
                   check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  invoice_url      text,
  created_at       timestamptz not null default now()
);

create table public.order_items (
  id           bigint generated always as identity primary key,
  order_id     text not null references public.orders (order_id) on delete cascade,
  product_id   text not null references public.products (id),
  product_name text not null,
  quantity     integer not null check (quantity between 1 and 20),
  price        integer not null,
  colour       text not null
);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create index orders_user_id_idx on public.orders (user_id);
create index order_items_order_id_idx on public.order_items (order_id);

-- 2. PRODUCTS (must match PRODUCTS in js/products.js) ---------------------

insert into public.products (id, name, price, colours) values
  ('sunny-sunflower',      'Sunny Sunflower Stem', 149, array['Sunshine Yellow', 'Marigold']),
  ('tulip-trio',           'Tulip Trio',           249, array['Blush Pink', 'Lilac', 'Cherry Red']),
  ('forever-rose',         'Forever Rose',         129, array['Cherry Red', 'Blush Pink', 'Snow White']),
  ('mini-meadow-bouquet',  'Mini Meadow Bouquet',  499, array['Pastel Mix', 'Sunset Mix']),
  ('pastel-dream-bouquet', 'Pastel Dream Bouquet', 799, array['Pastel Mix', 'Pink Mix']),
  ('bloom-gift-box',       'Bloom Gift Box',       649, array['Blush Pink', 'Teal']),
  ('bunny-keychain',       'Bunny Keychain',       179, array['Snow White', 'Blush Pink', 'Lilac']),
  ('heart-keychain',       'Heart Keychain',       149, array['Cherry Red', 'Teal', 'Sunshine Yellow']);

-- 3. SECURITY: row level security + who can see what ----------------------

alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.admins      enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Anyone can read active products
create policy "Products are public"
  on public.products for select
  to anon, authenticated
  using (active);

-- Customers see their own orders; admins see all
create policy "Own orders or admin"
  on public.orders for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Only admins can change an order (for example its status)
create policy "Admins update orders"
  on public.orders for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Items of own orders or admin"
  on public.order_items for select
  to authenticated
  using (exists (
    select 1 from public.orders o
    where o.order_id = order_items.order_id
      and (o.user_id = (select auth.uid()) or (select public.is_admin()))
  ));

-- A logged-in person can check whether they themselves are an admin
create policy "See own admin row"
  on public.admins for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Table access (new tables are not exposed automatically in this project)
grant select on public.products to anon, authenticated;
grant select, update (status) on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant select on public.admins to authenticated;

-- 4. PLACE ORDER ------------------------------------------------------------
-- The only way to create an order. Recalculates prices, shipping and total,
-- and generates the order ID on the server.

create or replace function public.place_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name     text := btrim(coalesce(payload->>'customer_name', ''));
  v_phone    text := btrim(coalesce(payload->>'phone', ''));
  v_email    text := btrim(coalesce(payload->>'email', ''));
  v_address  text := btrim(coalesce(payload->>'delivery_address', ''));
  v_notes    text := btrim(coalesce(payload->>'notes', ''));
  v_items    jsonb := payload->'items';
  v_item     jsonb;
  v_product  public.products%rowtype;
  v_qty      integer;
  v_colour   text;
  v_subtotal integer := 0;
  v_shipping integer;
  v_lines    jsonb := '[]'::jsonb;
  v_order_id text;
  v_created  timestamptz := now();
begin
  -- Customer details
  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    raise exception 'Enter your full name.';
  end if;
  if v_phone !~ '^\+?[0-9 -]{7,16}$' then
    raise exception 'Enter a valid phone number.';
  end if;
  if char_length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'Enter a valid email address.';
  end if;
  if char_length(v_address) < 10 or char_length(v_address) > 500 then
    raise exception 'Enter your full delivery address, including PIN code.';
  end if;
  if char_length(v_notes) > 500 then
    raise exception 'Order notes can be up to 500 characters.';
  end if;

  -- Items: prices always come from the products table
  if v_items is null or jsonb_typeof(v_items) <> 'array'
     or jsonb_array_length(v_items) = 0 or jsonb_array_length(v_items) > 50 then
    raise exception 'Your cart is empty.';
  end if;

  for v_item in select * from jsonb_array_elements(v_items) loop
    select * into v_product
    from public.products
    where id = v_item->>'product_id' and active;
    if not found then
      raise exception 'A product in your cart is no longer available. Remove it and try again.';
    end if;

    if coalesce(v_item->>'quantity', '') !~ '^[0-9]{1,2}$' then
      raise exception 'Choose a quantity from 1 to 20 for %.', v_product.name;
    end if;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 20 then
      raise exception 'Choose a quantity from 1 to 20 for %.', v_product.name;
    end if;

    v_colour := v_item->>'colour';
    if v_colour is null or not (v_colour = any (v_product.colours)) then
      raise exception 'Choose a valid colour for %.', v_product.name;
    end if;

    v_subtotal := v_subtotal + v_product.price * v_qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id',   v_product.id,
      'product_name', v_product.name,
      'quantity',     v_qty,
      'price',        v_product.price,
      'colour',       v_colour
    ));
  end loop;

  -- Shipping: Rs. 60, free at Rs. 999 and above
  v_shipping := case when v_subtotal >= 999 then 0 else 60 end;

  -- Order ID like HS-20261001-K7QX (date in India time)
  loop
    v_order_id := 'HS-' || to_char(v_created at time zone 'Asia/Kolkata', 'YYYYMMDD')
                  || '-' || upper(substr(md5(random()::text), 1, 4));
    exit when not exists (select 1 from public.orders where order_id = v_order_id);
  end loop;

  insert into public.orders (
    order_id, user_id, customer_name, phone, email, delivery_address, notes,
    subtotal, shipping, total, status, created_at
  ) values (
    v_order_id, auth.uid(), v_name, v_phone, v_email, v_address, v_notes,
    v_subtotal, v_shipping, v_subtotal + v_shipping, 'pending', v_created
  );

  insert into public.order_items (order_id, product_id, product_name, quantity, price, colour)
  select v_order_id, l->>'product_id', l->>'product_name',
         (l->>'quantity')::integer, (l->>'price')::integer, l->>'colour'
  from jsonb_array_elements(v_lines) as l;

  return jsonb_build_object(
    'order_id',         v_order_id,
    'customer_name',    v_name,
    'phone',            v_phone,
    'email',            v_email,
    'delivery_address', v_address,
    'notes',            v_notes,
    'subtotal',         v_subtotal,
    'shipping',         v_shipping,
    'total',            v_subtotal + v_shipping,
    'status',           'pending',
    'invoice_url',      null,
    'created_at',       v_created,
    'items',            v_lines
  );
end;
$$;

-- Functions are callable by everyone by default; limit them
revoke execute on function public.place_order(jsonb) from public;
revoke execute on function public.is_admin() from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
