alter table public.products add column if not exists image_url text;
alter table public.customers add column if not exists photo_url text;

comment on column public.products.image_url is 'Optional product catalogue photo URL';
comment on column public.customers.photo_url is 'Optional customer profile photo URL';
