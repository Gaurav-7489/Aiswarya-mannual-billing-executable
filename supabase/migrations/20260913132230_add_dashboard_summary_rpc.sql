create or replace function public.dashboard_summary(p_today date)
returns jsonb
language sql
security definer
set search_path = public
as $$
with today_stats as (
  select
    coalesce(sum(grand_total_minor) filter (where status = 'FINALIZED'), 0)::bigint as today_sales_minor,
    count(*) filter (where status = 'FINALIZED')::bigint as today_invoice_count,
    count(*) filter (where status = 'DRAFT')::bigint as draft_count,
    count(*) filter (where status = 'CANCELLED')::bigint as cancelled_count
  from invoices where invoice_date = p_today
),
counts as (
  select
    (select count(*) from customers where is_active) as customer_count,
    (select count(*) from products where is_active) as product_count,
    (select count(*) from notifications where status = 'FAILED') as failed_notification_count
),
recent as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'invoiceNumber', i.invoice_number, 'invoiceDate', i.invoice_date,
    'status', i.status, 'grandTotalMinor', i.grand_total_minor,
    'customerName', coalesce(c.name, '')
  ) order by i.invoice_date desc, i.created_at desc), '[]'::jsonb) as value
  from (select * from invoices order by invoice_date desc, created_at desc limit 8) i
  left join customers c on c.id = i.customer_id
),
top_customers as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.name, 'code', c.code,
    'invoiceCount', x.invoice_count, 'totalSalesMinor', x.total_sales_minor
  ) order by x.total_sales_minor desc, x.invoice_count desc), '[]'::jsonb) as value
  from (
    select customer_id, count(*) as invoice_count,
           coalesce(sum(grand_total_minor), 0)::bigint as total_sales_minor
    from invoices where status = 'FINALIZED'
    group by customer_id
    order by total_sales_minor desc, invoice_count desc
    limit 5
  ) x
  join customers c on c.id = x.customer_id
)
select jsonb_build_object(
  'today', p_today,
  'summary', jsonb_build_object(
    'todaySalesMinor', today_stats.today_sales_minor,
    'todayInvoiceCount', today_stats.today_invoice_count,
    'draftCount', today_stats.draft_count,
    'cancelledCount', today_stats.cancelled_count
  ),
  'counts', jsonb_build_object(
    'customerCount', counts.customer_count,
    'productCount', counts.product_count,
    'failedNotificationCount', counts.failed_notification_count
  ),
  'recentInvoices', recent.value,
  'topCustomers', top_customers.value
)
from today_stats, counts, recent, top_customers;
$$;

revoke all on function public.dashboard_summary(date) from public;
revoke all on function public.dashboard_summary(date) from anon;
revoke all on function public.dashboard_summary(date) from authenticated;
grant execute on function public.dashboard_summary(date) to service_role;
