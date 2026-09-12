'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import './history.css'

type Invoice = { id:string; invoiceNumber:string; invoiceDate:string; status:string; customerName:string; customerCode:string; grandTotalMinor:number; taxableValueMinor:number }
const money=(v:number)=>`₹${(v/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`

export default function InvoiceHistory(){
 const [q,setQ]=useState(''); const [rows,setRows]=useState<Invoice[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('')
 const load=async(term='')=>{setLoading(true);setError('');try{const r=await fetch(`/api/invoices/history?q=${encodeURIComponent(term)}`);const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load invoices');setRows(d.invoices||[])}catch(e){setError(e instanceof Error?e.message:'Unable to load invoices')}finally{setLoading(false)}}
 useEffect(()=>{load()},[])
 return <main className="history-page"><header className="history-header"><div><small>AISWARYA FOOD PRODUCTS</small><h1>Invoice History</h1><p>Find previous bills and review their totals.</p></div><Link className="new-invoice" href="/invoice">+ New Invoice</Link></header><section className="history-card"><div className="history-search"><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')load(q)}} placeholder="Search invoice number, customer or code..."/><button onClick={()=>load(q)}>Search</button></div>{loading?<div className="history-empty">Loading invoices…</div>:error?<div className="history-error">{error}</div>:rows.length===0?<div className="history-empty">No invoices found.</div>:<div className="history-table"><div className="history-head"><span>Invoice</span><span>Date</span><span>Customer</span><span>Status</span><span>Total</span></div>{rows.map(i=><div className="history-row" key={i.id}><strong>{i.invoiceNumber}</strong><span>{i.invoiceDate}</span><div><strong>{i.customerName}</strong><small>{i.customerCode}</small></div><span className={`status status-${i.status.toLowerCase()}`}>{i.status}</span><strong>{money(i.grandTotalMinor)}</strong></div>)}</div>}</section></main>
}
