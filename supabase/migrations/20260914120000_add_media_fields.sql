alter table public.products
  add column if not exists image_url text;

alter table public.customers
  add column if not exists photo_url text;

create index if not exists products_image_url_idx on public.products(id) where image_url is not null;
create index if not exists customers_photo_url_idx on public.customers(id) where photo_url is not null;
