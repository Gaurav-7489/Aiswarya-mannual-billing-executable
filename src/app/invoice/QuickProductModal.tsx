'use client'

import { useState } from 'react'

type CreatedProduct={id:string;name:string;code:string;packSize:string|null;unit:string;rateMinor:number;gstRateBps:number;hsnCode:string|null}

type Props={onCreated:(product:CreatedProduct)=>void;onClose:()=>void}

export default function QuickProductModal({onCreated,onClose}:Props){
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setSaving(true);setError('')
    const data=Object.fromEntries(new FormData(event.currentTarget).entries())
    try{
      const response=await fetch('/api/products/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
      const body=await response.json()
      if(!response.ok||!body.product)throw new Error(body.error||'Unable to create product.')
      const p=body.product
      onCreated({id:String(p.id),name:String(p.name),code:String(p.code),packSize:p.pack_size?String(p.pack_size):null,unit:String(p.unit),rateMinor:Number(p.default_rate_minor),gstRateBps:Number(p.gst_rate_bps),hsnCode:p.hsn_code?String(p.hsn_code):null})
    }catch(err){setError(err instanceof Error?err.message:'Unable to create product.')}finally{setSaving(false)}
  }
  return <div className="quick-product-overlay" role="dialog" aria-modal="true" aria-labelledby="quick-product-title" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <form className="quick-product-modal" onSubmit={submit}>
      <header><div><small>QUICK PRODUCT</small><h2 id="quick-product-title">Add a product while billing</h2><p>Create it once, then it is immediately available in this invoice.</p></div><button type="button" className="close" onClick={onClose}>Close</button></header>
      <div className="quick-product-grid">
        <label>Product name<input name="name" required autoFocus placeholder="e.g. Coconut Biscuit"/></label>
        <label>Product code<input name="code" required placeholder="e.g. BIS-101"/></label>
        <label>Category<select name="category" defaultValue="Biscuits"><option>Biscuits</option><option>Fried Biscuits</option><option>Bakery Biscuits</option><option>Bakery Products</option><option>Other</option></select></label>
        <label>Pack size<input name="packSize" placeholder="e.g. 100 g"/></label>
        <label>Unit<select name="unit" defaultValue="PCS"><option>PCS</option><option>BOX</option><option>PACK</option><option>KG</option><option>GRAM</option><option>DOZEN</option></select></label>
        <label>Default rate (₹)<input name="defaultRate" required type="number" min="0" step="0.01" placeholder="0.00"/></label>
        <label>GST rate (%)<input name="gstRate" required type="number" min="0" max="100" step="0.01" defaultValue="0"/></label>
        <label>HSN code<input name="hsnCode" placeholder="Optional"/></label>
      </div>
      {error&&<div className="quick-product-error" role="alert">{error}</div>}
      <div className="quick-product-actions"><button type="button" className="secondary" onClick={onClose}>Cancel</button><button type="submit" className="primary" disabled={saving}>{saving?'Creating…':'Create & Add to Invoice'}</button></div>
    </form>
  </div>
}
