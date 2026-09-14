'use client'

import PremiumScene from '../components/PremiumScene'

const money = (minor: number) => `₹${(minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

type Props = { invoiceId: string; invoiceNumber: string; customerName: string; units: number; totalMinor: number; onNewBill: () => void }

export default function ReceiptCompletion({ invoiceId, invoiceNumber, customerName, units, totalMinor, onNewBill }: Props) {
  const openInvoice = () => window.open(`/invoices/${encodeURIComponent(invoiceId)}`, '_blank', 'noopener,noreferrer')
  const printInvoice = () => {
    const popup = window.open(`/invoices/${encodeURIComponent(invoiceId)}`, '_blank')
    if (!popup) return
    const timer = window.setInterval(() => {
      if (popup.closed) { window.clearInterval(timer); return }
      try {
        if (popup.document.readyState === 'complete') {
          window.clearInterval(timer)
          popup.focus()
          popup.print()
        }
      } catch {}
    }, 250)
    window.setTimeout(() => window.clearInterval(timer), 8000)
  }

  return <div className="receipt-completion" role="dialog" aria-modal="true" aria-labelledby="receipt-complete-title">
    <div className="receipt-completion-card">
      <div className="receipt-completion-head"><div><span className="completion-kicker">TRANSACTION COMPLETE</span><h2 id="receipt-complete-title">Bill sealed & ready.</h2><p>The invoice is finalized in the company ledger. No re-entry is required.</p></div><button className="completion-close" onClick={onNewBill} aria-label="Close and start a new bill">×</button></div>
      <div className="receipt-stage"><PremiumScene mode="receipt"/><div className="receipt-paper-card"><div className="receipt-paper-top"><span>AISWARYA</span><b>FOOD PRODUCTS</b></div><div className="receipt-rule"/><div className="receipt-number"><span>INVOICE</span><strong>{invoiceNumber}</strong></div><div className="receipt-customer"><span>CUSTOMER</span><strong>{customerName}</strong></div><div className="receipt-line"><span>{units} units</span><strong>{money(totalMinor)}</strong></div><div className="receipt-rule"/><div className="receipt-total"><span>TOTAL</span><strong>{money(totalMinor)}</strong></div><div className="receipt-paid">PAID / FINALIZED</div></div></div>
      <div className="completion-meta"><div><span>Invoice</span><strong>{invoiceNumber}</strong></div><div><span>Customer</span><strong>{customerName}</strong></div><div><span>Total</span><strong>{money(totalMinor)}</strong></div></div>
      <div className="completion-actions"><button className="completion-primary" onClick={printInvoice}>Print / Save PDF</button><button className="completion-secondary" onClick={openInvoice}>Open Invoice</button><button className="completion-secondary" onClick={onNewBill}>New Bill</button></div>
    </div>
  </div>
}
