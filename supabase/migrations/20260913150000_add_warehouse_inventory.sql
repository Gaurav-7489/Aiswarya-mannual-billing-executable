alter table public.products
  add column if not exists stock_qty numeric(12,3) not null default 0,
  add column if not exists reorder_level numeric(12,3) not null default 0,
  add column if not exists stock_unit text not null default 'PCS',
  add column if not exists shelf_location text,
  add column if not exists cost_minor bigint not null default 0;

create index if not exists products_stock_idx on public.products(stock_qty, reorder_level);
create index if not exists products_shelf_location_idx on public.products(shelf_location);

create table if not exists public.inventory_movements (
  id uuid primary key,
  product_id text not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('RECEIPT','ADJUSTMENT','DAMAGE','RETURN','SALE')),
  quantity numeric(12,3) not null,
  reason text,
  reference_type text,
  reference_id text,
  actor_role text,
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_product_idx on public.inventory_movements(product_id, created_at desc);

alter table public.inventory_movements enable row level security;
revoke all on table public.inventory_movements from anon, authenticated;
grant all on table public.inventory_movements to service_role;

drop function if exists public.adjust_product_stock(text, numeric, text, text, text, text, text);
create or replace function public.adjust_product_stock(
  p_product_id text,
  p_quantity numeric,
  p_movement_type text,
  p_reason text default null,
  p_reference_type text default null,
  p_reference_id text default null,
  p_actor_role text default null
) returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare v_product public.products;
begin
  if p_quantity = 0 then raise exception 'Stock adjustment quantity cannot be zero'; end if;
  if p_movement_type not in ('RECEIPT','ADJUSTMENT','DAMAGE','RETURN','SALE') then raise exception 'Invalid stock movement type'; end if;
  select * into v_product from public.products where id = p_product_id and is_active for update;
  if not found then raise exception 'Product not found'; end if;
  if v_product.stock_qty + p_quantity < 0 then raise exception 'Insufficient stock'; end if;
  update public.products set stock_qty = stock_qty + p_quantity, updated_at = now() where id = p_product_id returning * into v_product;
  insert into public.inventory_movements(id,product_id,movement_type,quantity,reason,reference_type,reference_id,actor_role)
  values(gen_random_uuid(),p_product_id,p_movement_type,p_quantity,p_reason,p_reference_type,p_reference_id,p_actor_role);
  return v_product;
end;
$$;
revoke all on function public.adjust_product_stock(text,numeric,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.adjust_product_stock(text,numeric,text,text,text,text,text) to service_role;
