'use client'

import { useEffect, useMemo, useState } from 'react'

type Customer = { id: string; name: string; code: string; phone: string | null; city: string | null; gstin: string | null }
type Product = { id: string; name: string; code: string; packSize: string | null; rateMinor: number; unit: string; gstRateBps: number; hsnCode: string | null }
type LineItem = Product & { qty: number }

const money = (minor: number) => `₹${(minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function InvoiceWorkspace() {
  const [online, setOnline] = useState(true)
  const [customerQuery, setCustomerQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [productQuery, setProductQuery] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [productResults, setProductResults] = useState<Product[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [draftStatus, setDraftStatus] = useState('')
  const [savedInvoice, setSavedInvoice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function restore() {
      if (!navigator.onLine) {
        setDraftStatus('Waiting for connection')
        return
      }
      try {
        const response = await fetch('/api/invoices/drafts', { cache: 'no-store' })
        const data = await response.json()
        const latest = data.drafts?.[0]
        if (!cancelled && latest?.id) {
          const detailResponse = await fetch(`/api/invoices/${latest.id}`, { cache: 'no-store' })
          const detail = await detailResponse.json()
          if (detail.ok && detail.invoice?.status === 'DRAFT') {
            const customer: Customer = { id: String(detail.invoice.customer_id), name: String(detail.invoice.customer_name), code: String(detail.invoice.customer_code), phone: detail.invoice.customer_phone ?? null, city: detail.invoice.customer_city ?? null, gstin: detail.invoice.customer_gstin ?? null }
            const restoredItems: LineItem[] = (detail.items ?? []).map((item: Record<string, unknown>) => ({ id: String(item.product_id ?? item.id), name: String(item.product_name), code: String(item.product_code), packSize: item.pack_size ? String(item.pack_size) : null, unit: String(item.unit), rateMinor: Number(item.rate_minor), gstRateBps: Number(item.gst_rate_bps), hsnCode: item.hsn_code ? String(item.hsn_code) : null, qty: Number(item.quantity) }))
            setSelectedCustomer(customer)
            setItems(restoredItems)
            setDiscount(Number(detail.invoice.discount_minor ?? 0) / 100)
            setDraftId(latest.id)
            setDraftStatus('Draft restored from cloud')
          }
        }
      } catch {
        if (!cancelled) setDraftStatus('Unable to load saved draft')
      }
    }
    void restore()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!customerQuery.trim() || !online) { setCustomerResults([]); return }
    const timer = window.setTimeout(async () => {
      setLoadingCustomers(true)
      try {
        const response = await fetch(`/api/customers?q=${encodeURIComponent(customerQuery)}`)
        const data = await response.json()
        setCustomerResults(data.customers ?? [])
      } catch { setError('Could not load customers. Check the connection.') }
      finally { setLoadingCustomers(false) }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [customerQuery, online])

  useEffect(() => {
    if (!productQuery.trim() || !online) { setProductResults([]); return }
    const timer = window.setTimeout(async () => {
      setLoadingProducts(true)
      try {
        const response = await fetch(`/api/products?q=${encodeURIComponent(productQuery)}`)
        const data = await response.json()
        setProductResults(data.products ?? [])
      } catch { setError('Could not load products. Check the connection.') }
      finally { setLoadingProducts(false) }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [productQuery, online])

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.rateMinor * item.qty, 0), [items])
  const discountMinor = Math.round(Math.max(0, discount) * 100)
  const taxable = Math.max(0, subtotal - Math.min(subtotal, discountMinor))

  useEffect(() => {
    if (!selectedCustomer || items.length === 0 || savedInvoice || !online || saving || finalizing) return
    const timer = window.setTimeout(() => { void autosaveDraft() }, 900)
    setDraftStatus('Unsaved changes')
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer, items, discount, online, savedInvoice])

  async function autosaveDraft() {
    if (!online || !selectedCustomer || items.length === 0 || saving || finalizing) return
    setSaving(true); setDraftStatus('Saving draft…'); setError(null)
    try {
      const response = await fetch('/api/invoices/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draftId ?? undefined, customerId: selectedCustomer.id, items: items.map(item => ({ productId: item.id, quantity: item.qty, rateMinor: item.rateMinor })), discountMinor, gstMode: 'INTRA' }) })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to save draft.')
      setDraftId(data.draft.id)
      setDraftStatus('Draft saved to cloud')
    } catch (err) {
      setDraftStatus('Draft not saved')
      setError(err instanceof Error ? err.message : 'Unable to save draft. Check the connection.')
    } finally { setSaving(false) }
  }

  const addItem = (product: Product) => { setItems(current => current.some(item => item.id === product.id) ? current.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item) : [...current, { ...product, qty: 1 }]); setProductQuery(''); setSavedInvoice(null); setError(null) }
  const updateQuantity = (id: string, value: string) => { setItems(current => current.map(item => item.id === id ? { ...item, qty: Math.max(1, Number(value) || 1) } : item)); setSavedInvoice(null) }
  const removeItem = (id: string) => { setItems(current => current.filter(item => item.id !== id)); setSavedInvoice(null) }
  const clearInvoice = () => { setSelectedCustomer(null); setCustomerQuery(''); setProductQuery(''); setItems([]); setDiscount(0); setDraftId(null); setSavedInvoice(null); setDraftStatus(''); setError(null) }

  const finalize = async () => {
    if (!online) { setError('Internet connection is required to finalize an invoice.'); setDraftStatus('Billing unavailable'); return }
    if (!selectedCustomer || items.length === 0 || finalizing) return
    setFinalizing(true); setError(null); setDraftStatus('Finalizing…')
    try {
      let id = draftId
      if (!id) {
        const response = await fetch('/api/invoices/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: selectedCustomer.id, items: items.map(item => ({ productId: item.id, quantity: item.qty, rateMinor: item.rateMinor })), discountMinor, gstMode: 'INTRA' }) })
        const data = await response.json()
        if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to create draft.')
        id = data.draft.id
        setDraftId(id)
      }
      const response = await fetch(`/api/invoices/draft/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gstMode: 'INTRA' }) })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to finalize invoice.')
      setSavedInvoice(data.invoice.invoiceNumber)
      setDraftStatus('Invoice finalized and stored in cloud')
      setDraftId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to finalize invoice.')
      setDraftStatus('Invoice not finalized')
    } finally { setFinalizing(false) }
  }

  return (
    <main className="invoice-workspace">
      <header className="invoice-topbar"><div><small>AISWARYA FOOD PRODUCTS</small><h1>New Invoice</h1><p>Create a bill in three simple steps.</p></div><div className="invoice-top-actions"><span className={`local-status ${online ? 'good' : 'warning'}`}>{online ? 'ONLINE · BILLING READY' : 'OFFLINE · BILLING UNAVAILABLE'}</span><span className={`draft-status ${draftStatus.includes('saved') || draftStatus.includes('restored') || draftStatus.includes('finalized') ? 'good' : ''}`}>{draftStatus || 'Ready'}</span></div></header>
      <div className="invoice-grid"><div className="invoice-main">
        <section className="invoice-card"><div className="invoice-section-title"><b>01</b><div><h2>Customer</h2><p>Select an existing customer or search by phone, code or GSTIN.</p></div></div><label htmlFor="customer">Customer</label><input id="customer" disabled={!online} value={selectedCustomer ? selectedCustomer.name : customerQuery} onChange={e => { setSelectedCustomer(null); setCustomerQuery(e.target.value); setSavedInvoice(null); setError(null) }} placeholder={online ? 'Start typing customer name...' : 'Connect to search customers'} autoComplete="off" />{!selectedCustomer && customerQuery && online && <div className="product-results">{loadingCustomers ? <div className="table-empty">Searching customers…</div> : customerResults.length ? customerResults.map(customer => <button key={customer.id} onClick={() => { setSelectedCustomer(customer); setCustomerQuery(''); setSavedInvoice(null) }}><strong>{customer.name}</strong><span>{customer.code} · {customer.phone || 'No phone'} · {customer.city || 'No city'}</span></button>) : <div className="table-empty">No customer found.</div>}</div>}{selectedCustomer && <div className="customer-selected"><strong>{selectedCustomer.name}</strong><span>{selectedCustomer.code} · {selectedCustomer.phone || 'No phone'} · {selectedCustomer.city || 'No city'} · GSTIN {selectedCustomer.gstin || 'Not provided'}</span></div>}</section>
        <section className="invoice-card"><div className="invoice-section-title"><b>02</b><div><h2>Products</h2><p>Search a product and add it to the bill. Quantity can be changed below.</p></div></div><label htmlFor="product">Product</label><input id="product" disabled={!online} value={productQuery} onChange={e => { setProductQuery(e.target.value); setError(null) }} placeholder={online ? 'Search product name, code or HSN...' : 'Connect to search products'} autoComplete="off" />{productQuery && online && <div className="product-results">{loadingProducts ? <div className="table-empty">Searching products…</div> : productResults.length ? productResults.map(product => <button key={product.id} onClick={() => addItem(product)}><strong>{product.name}</strong><span>{product.code} · {product.packSize || '—'} · {money(product.rateMinor)} / {product.unit}</span></button>) : <div className="table-empty">No product found.</div>}</div>}<div className="invoice-table"><div className="table-head"><span>Product</span><span>Pack</span><span>Qty</span><span>Rate</span><span>Amount</span><span /></div>{items.length === 0 ? <div className="table-empty">No products added yet. Search above to add the first item.</div> : items.map(item => <div className="table-row" key={item.id}><div><strong>{item.name}</strong><small>{item.code}</small></div><span>{item.packSize || '—'}</span><input aria-label={`Quantity for ${item.name}`} type="number" min="1" value={item.qty} onChange={e => updateQuantity(item.id, e.target.value)} /><span>{money(item.rateMinor)}</span><strong>{money(item.rateMinor * item.qty)}</strong><button className="remove-button" onClick={() => removeItem(item.id)}>Remove</button></div>)}</div></section>
      </div><aside className="invoice-summary invoice-card"><div className="invoice-section-title"><b>03</b><div><h2>Review & Save</h2><p>Drafts are saved to the cloud while you build the invoice.</p></div></div><div className="summary-line"><span>Items</span><strong>{items.length}</strong></div><div className="summary-line"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="summary-line"><label htmlFor="discount">Discount (₹)</label><input id="discount" disabled={!online} type="number" min="0" value={discount} onChange={e => { setDiscount(Math.max(0, Number(e.target.value) || 0)); setSavedInvoice(null) }} /></div><div className="summary-line"><span>Taxable value</span><strong>{money(taxable)}</strong></div><div className="grand"><span>Grand Total*</span><strong>{money(taxable)}</strong></div><small className="summary-note">* GST is calculated from each product&apos;s configured GST rate when finalized.</small>{error && <div className="save-error" role="alert"><strong>Attention</strong><span>{error}</span></div>}{savedInvoice && <div className="save-success" role="status"><strong>Invoice finalized</strong><span>{savedInvoice} · Stored in the cloud database.</span></div>}<button className="save-button" disabled={!online || !selectedCustomer || items.length === 0 || finalizing} onClick={savedInvoice ? clearInvoice : finalize}>{finalizing ? 'Finalizing…' : savedInvoice ? 'Start New Invoice' : online ? 'Finalize & Save Invoice' : 'Connect to Finalize Invoice'}</button><button className="clear-button" onClick={clearInvoice}>Clear Invoice</button></aside></div>
    </main>
  )
}
