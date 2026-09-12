'use client'

import { useEffect, useMemo, useState } from 'react'

type Customer = { id: string; name: string; code: string; phone: string | null; city: string | null; gstin: string | null }
type Product = { id: string; name: string; code: string; packSize: string | null; rateMinor: number; unit: string }
type LineItem = Product & { qty: number }

const money = (minor: number) => `₹${(minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function InvoiceWorkspace() {
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
  const [savedInvoice, setSavedInvoice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customerQuery.trim()) { setCustomerResults([]); return }
    const timer = window.setTimeout(async () => {
      setLoadingCustomers(true)
      try {
        const response = await fetch(`/api/customers?q=${encodeURIComponent(customerQuery)}`)
        const data = await response.json()
        setCustomerResults(data.customers ?? [])
      } catch { setError('Could not load customers. Check that the app is running correctly.') }
      finally { setLoadingCustomers(false) }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [customerQuery])

  useEffect(() => {
    if (!productQuery.trim()) { setProductResults([]); return }
    const timer = window.setTimeout(async () => {
      setLoadingProducts(true)
      try {
        const response = await fetch(`/api/products?q=${encodeURIComponent(productQuery)}`)
        const data = await response.json()
        setProductResults(data.products ?? [])
      } catch { setError('Could not load products. Check that the app is running correctly.') }
      finally { setLoadingProducts(false) }
    }, 180)
    return () => window.clearTimeout(timer)
  }, [productQuery])

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.rateMinor * item.qty, 0), [items])
  const discountMinor = Math.round(Math.max(0, discount) * 100)
  const taxable = Math.max(0, subtotal - Math.min(subtotal, discountMinor))

  const addItem = (product: Product) => {
    setItems((current) => current.some((item) => item.id === product.id)
      ? current.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      : [...current, { ...product, qty: 1 }])
    setProductQuery('')
    setSavedInvoice(null)
    setError(null)
  }

  const updateQuantity = (id: string, value: string) => {
    const qty = Math.max(1, Number(value) || 1)
    setItems((current) => current.map((item) => item.id === id ? { ...item, qty } : item))
    setSavedInvoice(null)
  }

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
    setSavedInvoice(null)
  }

  const clearInvoice = () => {
    setSelectedCustomer(null); setCustomerQuery(''); setProductQuery(''); setItems([]); setDiscount(0); setSavedInvoice(null); setError(null)
  }

  const saveInvoice = async () => {
    if (!selectedCustomer || items.length === 0 || saving) return
    setSaving(true); setError(null)
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selectedCustomer.id, items: items.map((item) => ({ productId: item.id, quantity: item.qty })), discountMinor, gstMode: 'INTRA' }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to save invoice.')
      setSavedInvoice(data.invoice.invoiceNumber)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save invoice.')
    } finally { setSaving(false) }
  }

  return (
    <main className="invoice-workspace">
      <header className="invoice-topbar">
        <div><small>AISWARYA FOOD PRODUCTS</small><h1>New Invoice</h1><p>Create a bill in three simple steps.</p></div>
        <span className="local-status">LOCAL · DATABASE</span>
      </header>
      <div className="invoice-grid">
        <div className="invoice-main">
          <section className="invoice-card">
            <div className="invoice-section-title"><b>01</b><div><h2>Customer</h2><p>Select an existing customer or search by phone, code or GSTIN.</p></div></div>
            <label htmlFor="customer">Customer</label>
            <input id="customer" value={selectedCustomer ? selectedCustomer.name : customerQuery} onChange={(e) => { setSelectedCustomer(null); setCustomerQuery(e.target.value); setSavedInvoice(null); setError(null) }} placeholder="Start typing customer name..." autoComplete="off" />
            {!selectedCustomer && customerQuery && <div className="product-results">{loadingCustomers ? <div className="table-empty">Searching customers…</div> : customerResults.length ? customerResults.map((customer) => <button key={customer.id} onClick={() => { setSelectedCustomer(customer); setCustomerQuery(''); setSavedInvoice(null) }}><strong>{customer.name}</strong><span>{customer.code} · {customer.phone || 'No phone'} · {customer.city || 'No city'}</span></button>) : <div className="table-empty">No customer found.</div>}</div>}
            {selectedCustomer && <div className="customer-selected"><strong>{selectedCustomer.name}</strong><span>{selectedCustomer.code} · {selectedCustomer.phone || 'No phone'} · {selectedCustomer.city || 'No city'} · GSTIN {selectedCustomer.gstin || 'Not provided'}</span></div>}
          </section>
          <section className="invoice-card">
            <div className="invoice-section-title"><b>02</b><div><h2>Products</h2><p>Search a product and add it to the bill. Quantity can be changed below.</p></div></div>
            <label htmlFor="product">Product</label>
            <input id="product" value={productQuery} onChange={(e) => { setProductQuery(e.target.value); setError(null) }} placeholder="Search product name, code or HSN..." autoComplete="off" />
            {productQuery && <div className="product-results">{loadingProducts ? <div className="table-empty">Searching products…</div> : productResults.length ? productResults.map((product) => <button key={product.id} onClick={() => addItem(product)}><strong>{product.name}</strong><span>{product.code} · {product.packSize || '—'} · {money(product.rateMinor)} / {product.unit}</span></button>) : <div className="table-empty">No product found.</div>}</div>}
            <div className="invoice-table">
              <div className="table-head"><span>Product</span><span>Pack</span><span>Qty</span><span>Rate</span><span>Amount</span><span /></div>
              {items.length === 0 ? <div className="table-empty">No products added yet. Search above to add the first item.</div> : items.map((item) => <div className="table-row" key={item.id}>
                <div><strong>{item.name}</strong><small>{item.code}</small></div><span>{item.packSize || '—'}</span><input aria-label={`Quantity for ${item.name}`} type="number" min="1" value={item.qty} onChange={(e) => updateQuantity(item.id, e.target.value)} /><span>{money(item.rateMinor)}</span><strong>{money(item.rateMinor * item.qty)}</strong><button className="remove-button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>Remove</button>
              </div>)}
            </div>
          </section>
        </div>
        <aside className="invoice-summary invoice-card">
          <div className="invoice-section-title"><b>03</b><div><h2>Review & Save</h2><p>Check the total before finalizing.</p></div></div>
          <div className="summary-line"><span>Items</span><strong>{items.length}</strong></div>
          <div className="summary-line"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          <div className="summary-line"><label htmlFor="discount">Discount (₹)</label><input id="discount" type="number" min="0" value={discount} onChange={(e) => { setDiscount(Math.max(0, Number(e.target.value) || 0)); setSavedInvoice(null) }} /></div>
          <div className="summary-line"><span>Taxable value</span><strong>{money(taxable)}</strong></div>
          <div className="grand"><span>Grand Total*</span><strong>{money(taxable)}</strong></div>
          <small className="summary-note">* GST is calculated from each product's configured GST rate when the invoice is saved.</small>
          {error && <div className="save-error" role="alert"><strong>Could not save</strong><span>{error}</span></div>}
          {savedInvoice && <div className="save-success" role="status"><strong>Invoice saved</strong><span>{savedInvoice} · Stored in the local database.</span></div>}
          <button className="save-button" disabled={!selectedCustomer || items.length === 0 || saving} onClick={saveInvoice}>{saving ? 'Saving…' : savedInvoice ? 'Save New Invoice' : 'Save Invoice'}</button>
          <button className="clear-button" onClick={clearInvoice}>Clear Invoice</button>
        </aside>
      </div>
    </main>
  )
}
