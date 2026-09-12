'use client'

import { useMemo, useState } from 'react'

type Customer = { id: string; name: string; code: string; phone: string; city: string; gstin: string }
type Product = { id: string; name: string; code: string; pack: string; rate: number; unit: string }
type LineItem = Product & { qty: number }

const customers: Customer[] = [
  { id: 'c1', name: 'Sharma Distributors', code: 'CUST-001', phone: '9876543210', city: 'Shimla', gstin: '02ABCDE1234F1Z5' },
  { id: 'c2', name: 'Himalayan General Store', code: 'CUST-002', phone: '9812345678', city: 'Solan', gstin: '02FGHIJ5678K1Z2' },
  { id: 'c3', name: 'City Wholesale Mart', code: 'CUST-003', phone: '9898989898', city: 'Mandi', gstin: '02LMNOP9012Q1Z7' },
]

const products: Product[] = [
  { id: 'p1', name: 'Butter Bite Biscuits', code: 'BIS-001', pack: '100 g', rate: 25, unit: 'PCS' },
  { id: 'p2', name: 'Cream Delight Biscuits', code: 'BIS-002', pack: '200 g', rate: 42, unit: 'PCS' },
  { id: 'p3', name: 'Salted Crackers', code: 'BIS-003', pack: '150 g', rate: 32, unit: 'PCS' },
  { id: 'p4', name: 'Classic Glucose Biscuits', code: 'BIS-004', pack: '250 g', rate: 48, unit: 'PCS' },
]

const money = (value: number) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function InvoiceWorkspace() {
  const [customerQuery, setCustomerQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [productQuery, setProductQuery] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [saved, setSaved] = useState(false)

  const customerResults = useMemo(() => {
    const query = customerQuery.trim().toLowerCase()
    if (!query) return []
    return customers.filter((c) => `${c.name} ${c.code} ${c.phone} ${c.gstin} ${c.city}`.toLowerCase().includes(query))
  }, [customerQuery])

  const productResults = useMemo(() => {
    const query = productQuery.trim().toLowerCase()
    if (!query) return []
    return products.filter((p) => `${p.name} ${p.code} ${p.pack}`.toLowerCase().includes(query))
  }, [productQuery])

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.rate * item.qty, 0), [items])
  const taxable = Math.max(0, subtotal - Math.max(0, discount))

  const addItem = (product: Product) => {
    setItems((current) => current.some((item) => item.id === product.id)
      ? current.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      : [...current, { ...product, qty: 1 }])
    setProductQuery('')
    setSaved(false)
  }

  const updateQuantity = (id: string, value: string) => {
    const qty = Math.max(1, Number(value) || 1)
    setItems((current) => current.map((item) => item.id === id ? { ...item, qty } : item))
    setSaved(false)
  }

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
    setSaved(false)
  }

  const clearInvoice = () => {
    setSelectedCustomer(null)
    setCustomerQuery('')
    setProductQuery('')
    setItems([])
    setDiscount(0)
    setSaved(false)
  }

  const saveInvoice = () => {
    if (!selectedCustomer || items.length === 0) return
    setSaved(true)
  }

  return (
    <main className="invoice-workspace">
      <header className="invoice-topbar">
        <div>
          <small>AISWARYA FOOD PRODUCTS</small>
          <h1>New Invoice</h1>
          <p>Create a bill in three simple steps.</p>
        </div>
        <span className="local-status">LOCAL · READY</span>
      </header>

      <div className="invoice-grid">
        <div className="invoice-main">
          <section className="invoice-card">
            <div className="invoice-section-title"><b>01</b><div><h2>Customer</h2><p>Select an existing customer or search by phone, code or GSTIN.</p></div></div>
            <label htmlFor="customer">Customer</label>
            <input id="customer" value={selectedCustomer ? selectedCustomer.name : customerQuery} onChange={(e) => { setSelectedCustomer(null); setCustomerQuery(e.target.value); setSaved(false) }} placeholder="Start typing customer name..." autoComplete="off" />
            {!selectedCustomer && customerQuery && <div className="product-results">{customerResults.length ? customerResults.map((customer) => <button key={customer.id} onClick={() => { setSelectedCustomer(customer); setCustomerQuery(''); setSaved(false) }}><strong>{customer.name}</strong><span>{customer.code} · {customer.phone} · {customer.city}</span></button>) : <div className="table-empty">No customer found.</div>}</div>}
            {selectedCustomer && <div className="customer-selected"><strong>{selectedCustomer.name}</strong><span>{selectedCustomer.code} · {selectedCustomer.phone} · {selectedCustomer.city} · GSTIN {selectedCustomer.gstin}</span></div>}
          </section>

          <section className="invoice-card">
            <div className="invoice-section-title"><b>02</b><div><h2>Products</h2><p>Search a product and add it to the bill. Quantity can be changed below.</p></div></div>
            <label htmlFor="product">Product</label>
            <input id="product" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Search product name or code..." autoComplete="off" />
            {productQuery && <div className="product-results">{productResults.length ? productResults.map((product) => <button key={product.id} onClick={() => addItem(product)}><strong>{product.name}</strong><span>{product.code} · {product.pack} · {money(product.rate)} / {product.unit}</span></button>) : <div className="table-empty">No product found.</div>}</div>}

            <div className="invoice-table">
              <div className="table-head"><span>Product</span><span>Pack</span><span>Qty</span><span>Rate</span><span>Amount</span><span /></div>
              {items.length === 0 ? <div className="table-empty">No products added yet. Search above to add the first item.</div> : items.map((item) => <div className="table-row" key={item.id}>
                <div><strong>{item.name}</strong><small>{item.code}</small></div><span>{item.pack}</span><input aria-label={`Quantity for ${item.name}`} type="number" min="1" value={item.qty} onChange={(e) => updateQuantity(item.id, e.target.value)} /><span>{money(item.rate)}</span><strong>{money(item.rate * item.qty)}</strong><button className="remove-button" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}>Remove</button>
              </div>)}
            </div>
          </section>
        </div>

        <aside className="invoice-summary invoice-card">
          <div className="invoice-section-title"><b>03</b><div><h2>Review & Save</h2><p>Check the total before finalizing.</p></div></div>
          <div className="summary-line"><span>Items</span><strong>{items.length}</strong></div>
          <div className="summary-line"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          <div className="summary-line"><label htmlFor="discount">Discount</label><input id="discount" type="number" min="0" value={discount} onChange={(e) => { setDiscount(Math.max(0, Number(e.target.value) || 0)); setSaved(false) }} /></div>
          <div className="summary-line"><span>Taxable value</span><strong>{money(taxable)}</strong></div>
          <div className="grand"><span>Grand Total</span><strong>{money(taxable)}</strong></div>
          {saved && <div className="save-success" role="status"><strong>Invoice ready</strong><span>This is the UI save checkpoint. Database persistence comes next.</span></div>}
          <button className="save-button" disabled={!selectedCustomer || items.length === 0} onClick={saveInvoice}>Save Invoice</button>
          <button className="clear-button" onClick={clearInvoice}>Clear Invoice</button>
        </aside>
      </div>
    </main>
  )
}
