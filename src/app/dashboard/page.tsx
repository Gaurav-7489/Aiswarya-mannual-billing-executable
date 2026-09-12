'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import './dashboard.css'

type DashboardData = {
  today: string
  summary: { todaySalesMinor: number; todayInvoiceCount: number; draftCount: number; cancelledCount: number }
  counts: { customerCount: number; productCount: number; failedNotificationCount: number }
  recentInvoices: { id: string; invoiceNumber: string; invoiceDate: string; status: string; grandTotalMinor: number; customerName: string }[]
  topCustomers: { id: string; name: string; code: string; invoiceCount: number; totalSalesMinor: number }[]
}

const money = (minor: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(minor / 100)
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/dashboard', { cache: 'no-store' })
      if (!response.ok) throw new Error('Unable to load dashboard')
      setData(await response.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Aiswarya Food Products</p>
          <h1>Billing Dashboard</h1>
          <p className="muted">A clear view of today&apos;s billing activity and recent records.</p>
        </div>
        <div className="header-actions">
          <button className="secondary-button" onClick={() => void load()} disabled={loading}>↻ Refresh</button>
          <Link className="primary-button" href="/invoice">+ New Invoice</Link>
        </div>
      </header>

      {error && <div className="error-banner">{error} <button onClick={() => void load()}>Try again</button></div>}

      <section className="metric-grid" aria-label="Billing summary">
        <Metric label="Today&apos;s Sales" value={data ? money(data.summary.todaySalesMinor) : '—'} detail={data ? dateLabel(data.today) : 'Loading'} accent />
        <Metric label="Invoices Today" value={data ? String(data.summary.todayInvoiceCount) : '—'} detail="Finalized invoices" />
        <Metric label="Customers" value={data ? String(data.counts.customerCount) : '—'} detail="Active customers" />
        <Metric label="Products" value={data ? String(data.counts.productCount) : '—'} detail="Active products" />
      </section>

      <section className="quick-grid">
        <Link href="/invoice" className="quick-card"><span className="quick-icon">+</span><span><strong>Create Invoice</strong><small>Start a new customer bill</small></span></Link>
        <Link href="/invoices" className="quick-card"><span className="quick-icon">▤</span><span><strong>Invoice History</strong><small>Search and open past invoices</small></span></Link>
        <Link href="/invoices" className="quick-card"><span className="quick-icon">✓</span><span><strong>Records</strong><small>{data?.summary.draftCount ?? 0} drafts · {data?.summary.cancelledCount ?? 0} cancelled</small></span></Link>
      </section>

      <div className="dashboard-columns">
        <section className="panel">
          <div className="panel-heading"><div><h2>Recent Invoices</h2><p>Latest billing activity</p></div><Link href="/invoices">View all</Link></div>
          <div className="invoice-list">
            {!loading && data?.recentInvoices.length === 0 && <div className="empty">No invoices yet. Create the first invoice.</div>}
            {data?.recentInvoices.map((invoice) => (
              <Link className="invoice-row" href={`/invoices/${invoice.id}`} key={invoice.id}>
                <div><strong>{invoice.invoiceNumber}</strong><span>{invoice.customerName}</span></div>
                <div className="invoice-row-right"><strong>{money(invoice.grandTotalMinor)}</strong><span className={`status ${invoice.status.toLowerCase()}`}>{invoice.status}</span></div>
              </Link>
            ))}
            {loading && <div className="loading-lines"><i /><i /><i /></div>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading"><div><h2>Top Customers</h2><p>By finalized sales</p></div></div>
          <div className="customer-list">
            {!loading && data?.topCustomers.length === 0 && <div className="empty">Customer records will appear here.</div>}
            {data?.topCustomers.map((customer, index) => (
              <div className="customer-row" key={customer.id}>
                <span className="rank">{index + 1}</span>
                <div><strong>{customer.name}</strong><span>{customer.code} · {customer.invoiceCount} invoice{customer.invoiceCount === 1 ? '' : 's'}</span></div>
                <strong>{money(customer.totalSalesMinor)}</strong>
              </div>
            ))}
            {loading && <div className="loading-lines"><i /><i /><i /></div>}
          </div>
        </section>
      </div>

      {data && data.counts.failedNotificationCount > 0 && (
        <div className="notice-banner"><strong>{data.counts.failedNotificationCount} notification{data.counts.failedNotificationCount === 1 ? '' : 's'} failed.</strong><span>Email/WhatsApp delivery can be retried once provider credentials are configured.</span></div>
      )}
    </main>
  )
}

function Metric({ label, value, detail, accent = false }: { label: string; value: string; detail: string; accent?: boolean }) {
  return <article className={`metric-card ${accent ? 'metric-accent' : ''}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}
