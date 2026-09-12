'use client'

import { useMemo, useState } from 'react'

type Item = { id: string; name: string; code: string; pack: string; rate: number; qty: number }

const catalog: Item[] = [
  { id: '1', name: 'Butter Bite Biscuits', code: 'BIS-001', pack: '100 g', rate: 25, qty: 1 },
  { id: '2', name: 'Cream Delight Biscuits', code: 'BIS-002', pack: '200 g', rate: 42, qty: 1 },
  { id: '3', name: 'Salted Crackers', code: 'BIS-003', pack: '150 g', rate: 32, qty: 1 }
]

export default function InvoiceWorkspace() {
  const [customer, setCustomer] = useState('')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [discount, setDiscount] = useState(0)
  const filtered = catalog.filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(query.toLowerCase()))
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.rate * item.qty, 0), [items])
  const total = Math.max(0, subtotal - discount)

  const addItem = (item: Item) => {
    setItems((current) => current.some((x) => x.id === item.id) ? current.map((x) => x.id === item.id ? { ...x, qty: x.qty + 1 } : x) : [...current, { ...item }])
    setQuery('')
  }

  return (
    <main className="invoice-workspace">
      <header className="invoice-topbar"><div><small>AISWARYA FOOD PRODUCTS</small><h1>New Invoice</h1><p>Simple billing. Clear totals. No unnecessary steps.</p></div><span className="local-status">LOCAL · READY</span></header>
      <div className="invoice-grid">
        <div className="invoice-main">
          <section className="invoice-card"><div className="invoice-section-title"><b>01</b><div><h2>Customer</h2><p>Select the customer for this invoice.</p></div></div><label htmlFor="customer">Customer name, code or phone</label><input id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Start typing a customer..." />{customer && <div className="customer-selected"><strong>{customer}</strong><span>Customer selected for this invoice</span></div>}</section>
          <section className="invoice-card"><div className="invoice-section-title"><b>02</b><div><h2>Products</h2><p>Search and add products to the invoice.</p></div></div><label htmlFor="product">Product</label><input id="product" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product or product code..." />{query && <div className="product-results">{filtered.map((item) => <button key={item.id} onClick={() => addItem(item)}><strong>{item.name}</strong><span>{item.code} · {item.pack} · ₹{item.rate.toFixed(2)}</span></button>)}</div>}
            <div className="invoice-table"><div className="table-head"><span>Product</span><span>Pack</span><span>Qty</span><span>Rate</span><span>Amount</span></div>{items.length === 0 ? <div className="table-empty">No products added yet.</div> : items.map((item) => <div className="table-row" key={item.id}><div><strong>{item.name}</strong><small>{item.code}</small></div><span>{item.pack}</span><input type="number" min="1" value={item.qty} onChange={(e) => setItems((all) => all.map((x) => x.id === item.id ? { ...x, qty: Math.max(1, Number(e.target.value)) } : x))} /><span>₹{item.rate.toFixed(2)}</span><strong>₹{(item.rate * item.qty).toFixed(2)}</strong></div>)}</div>
          </section>
        </div>
        <aside className="invoice-summary invoice-card"><div className="invoice-section-title"><b>03</b><div><h2>Review</h2><p>Verify the amount before saving.</p></div></div><div className="summary-line"><span>Subtotal</span><strong>₹{subtotal.toFixed(2)}</strong></div><div className="summary-line"><label htmlFor="discount">Discount</label><input id="discount" type="number" min="0" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></div><div className="summary-line"><span>Taxable value</span><strong>₹{total.toFixed(2)}</strong></div><div className="grand"><span>Grand Total</span><strong>₹{total.toFixed(2)}</strong></div><button className="save-button" disabled={!customer || items.length === 0}>Save Invoice</button><button className="clear-button" onClick={() => { setCustomer(''); setItems([]); setDiscount(0) }}>Clear</button></aside>
      </div>
    </main>
  )
}
