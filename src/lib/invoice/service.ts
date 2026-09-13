import { randomUUID } from 'node:crypto'
import { remove, rpc, select, selectOne } from '@/lib/db/client'

export type InvoiceLineInput={productId:string;quantity:string|number;rateMinor?:number}
export type CreateInvoiceInput={customerId:string;items:InvoiceLineInput[];discountMinor?:number;freightMinor?:number;otherChargesMinor?:number;gstMode?:'INTRA'|'INTER';notes?:string}
type DraftInput=CreateInvoiceInput&{id?:string}
type ResolvedLine={product:any;productId:string;quantity:number;rateMinor:number;gstRateBps:number;taxableMinor:number}

const now=()=>new Date().toISOString()
const moneyRound=(v:number)=>Math.round(v)

function allocateByWeight(amount:number,weights:number[]){
  if(amount===0||!weights.length)return weights.map(()=>0)
  const total=weights.reduce((s,v)=>s+v,0)
  if(total<=0)return weights.map(()=>0)
  const a=weights.map(w=>moneyRound(amount*w/total))
  a[a.length-1]+=amount-a.reduce((s,v)=>s+v,0)
  return a
}

async function resolveProducts(items:InvoiceLineInput[]){
  if(!items?.length)throw new Error('Add at least one product.')
  return Promise.all(items.map(async line=>{
    const product=await selectOne<any>('products',`select=id,code,name,hsn_code,pack_size,unit,default_rate_minor,gst_rate_bps&id=eq.${encodeURIComponent(line.productId)}&is_active=eq.true`)
    if(!product)throw new Error(`Product ${line.productId} was not found or is inactive.`)
    const quantity=Number(line.quantity)
    if(!Number.isFinite(quantity)||quantity<=0)throw new Error(`Invalid quantity for ${product.name}.`)
    const rateMinor=Number.isInteger(line.rateMinor)&&Number(line.rateMinor)>=0?Number(line.rateMinor):Number(product.default_rate_minor)
    return{product,productId:String(product.id),quantity,rateMinor,gstRateBps:Number(product.gst_rate_bps)||0,taxableMinor:moneyRound(quantity*rateMinor)} as ResolvedLine
  }))
}

function calculate(lines:ResolvedLine[],input:Pick<CreateInvoiceInput,'discountMinor'|'freightMinor'|'otherChargesMinor'|'gstMode'>){
  const subtotalMinor=lines.reduce((s,l)=>s+l.taxableMinor,0)
  const discountMinor=Math.max(0,Math.min(subtotalMinor,Number(input.discountMinor)||0))
  const freightMinor=Math.max(0,Number(input.freightMinor)||0)
  const otherChargesMinor=Math.max(0,Number(input.otherChargesMinor)||0)
  const weights=lines.map(l=>l.taxableMinor)
  const discounts=allocateByWeight(discountMinor,weights)
  const charges=allocateByWeight(freightMinor+otherChargesMinor,weights)
  const calculated=lines.map((l,i)=>{
    const taxableMinor=Math.max(0,l.taxableMinor-discounts[i]+charges[i])
    const taxMinor=moneyRound(taxableMinor*l.gstRateBps/10000)
    const cgstMinor=input.gstMode==='INTER'?0:Math.floor(taxMinor/2)
    const sgstMinor=input.gstMode==='INTER'?0:taxMinor-cgstMinor
    const igstMinor=input.gstMode==='INTER'?taxMinor:0
    return{...l,taxableMinor,cgstMinor,sgstMinor,igstMinor,lineTotalMinor:taxableMinor+taxMinor}
  })
  return{lines:calculated,subtotalMinor,discountMinor,freightMinor,otherChargesMinor,taxableValueMinor:calculated.reduce((s,l)=>s+l.taxableMinor,0),cgstMinor:calculated.reduce((s,l)=>s+l.cgstMinor,0),sgstMinor:calculated.reduce((s,l)=>s+l.sgstMinor,0),igstMinor:calculated.reduce((s,l)=>s+l.igstMinor,0)}
}

async function assertCustomer(id:string){
  const c=await selectOne('customers',`select=id&is_active=eq.true&id=eq.${encodeURIComponent(id)}`)
  if(!c)throw new Error('Customer not found or inactive.')
}

function invoicePayload(id:string,status:'DRAFT'|'FINALIZED',customerId:string,totals:ReturnType<typeof calculate>,notes:string|undefined,timestamp:string){
  return{
    id,status,customer_id:customerId,invoice_date:timestamp.slice(0,10),
    subtotal_minor:totals.subtotalMinor,discount_minor:totals.discountMinor,freight_minor:totals.freightMinor,
    other_charges_minor:totals.otherChargesMinor,taxable_value_minor:totals.taxableValueMinor,
    cgst_minor:totals.cgstMinor,sgst_minor:totals.sgstMinor,igst_minor:totals.igstMinor,
    grand_total_minor:totals.taxableValueMinor+totals.cgstMinor+totals.sgstMinor+totals.igstMinor,
    notes:notes??null,created_at:timestamp,updated_at:timestamp,finalized_at:status==='FINALIZED'?timestamp:null
  }
}

function itemPayloads(lines:ReturnType<typeof calculate>['lines'],invoiceId:string){
  return lines.map(l=>({id:randomUUID(),invoice_id:invoiceId,product_id:l.productId,product_code:l.product.code,product_name:l.product.name,hsn_code:l.product.hsn_code??null,pack_size:l.product.pack_size??null,unit:l.product.unit,quantity:String(l.quantity),rate_minor:l.rateMinor,gst_rate_bps:l.gstRateBps,taxable_minor:l.taxableMinor,cgst_minor:l.cgstMinor,sgst_minor:l.sgstMinor,igst_minor:l.igstMinor,line_total_minor:l.lineTotalMinor}))
}

export async function createDraft(input:DraftInput){
  await assertCustomer(input.customerId)
  const resolved=await resolveProducts(input.items)
  const totals=calculate(resolved,input)
  const id=input.id||randomUUID()
  const existing=input.id?await selectOne<any>('invoices',`select=id,status,invoice_number&id=eq.${encodeURIComponent(id)}`):null
  const timestamp=now()
  if(existing&&existing.status!=='DRAFT')throw new Error('Only an existing draft can be autosaved.')
  const operation=existing?'UPDATE_DRAFT':'CREATE_DRAFT'
  const result=await rpc<any>('persist_invoice_atomic',{p_operation:operation,p_invoice:invoicePayload(id,'DRAFT',input.customerId,totals,input.notes,timestamp),p_items:itemPayloads(totals.lines,id)})
  return{id:String(result.id),invoiceNumber:String(result.invoice_number),status:'DRAFT',grandTotalMinor:Number(result.grand_total_minor)}
}

export async function finalizeDraft(id:string,gstMode:'INTRA'|'INTER'='INTRA'){
  const draft=await selectOne<any>('invoices',`select=*&id=eq.${encodeURIComponent(id)}&status=eq.DRAFT`)
  if(!draft)throw new Error('Draft invoice not found.')
  const items=await select<any>('invoice_items',`select=*&invoice_id=eq.${encodeURIComponent(id)}&order=created_at.asc`)
  if(!items.length)throw new Error('Add at least one product before finalizing.')
  const resolved=items.map(i=>({product:{id:i.product_id,code:i.product_code,name:i.product_name,hsn_code:i.hsn_code,pack_size:i.pack_size,unit:i.unit,gst_rate_bps:i.gst_rate_bps},productId:String(i.product_id),quantity:Number(i.quantity),rateMinor:Number(i.rate_minor),gstRateBps:Number(i.gst_rate_bps),taxableMinor:moneyRound(Number(i.quantity)*Number(i.rate_minor))}))
  const totals=calculate(resolved,{discountMinor:Number(draft.discount_minor),freightMinor:Number(draft.freight_minor),otherChargesMinor:Number(draft.other_charges_minor),gstMode})
  const timestamp=now()
  const result=await rpc<any>('persist_invoice_atomic',{p_operation:'FINALIZE_DRAFT',p_invoice:invoicePayload(id,'FINALIZED',String(draft.customer_id),totals,draft.notes??undefined,timestamp),p_items:itemPayloads(totals.lines,id)})
  return{id:String(result.id),invoiceNumber:String(result.invoice_number),grandTotalMinor:Number(result.grand_total_minor),taxableValueMinor:Number(result.taxable_value_minor)}
}

export async function createInvoice(input:CreateInvoiceInput){
  await assertCustomer(input.customerId)
  const resolved=await resolveProducts(input.items)
  const totals=calculate(resolved,input)
  const id=randomUUID()
  const timestamp=now()
  const result=await rpc<any>('persist_invoice_atomic',{p_operation:'CREATE_FINALIZED',p_invoice:invoicePayload(id,'FINALIZED',input.customerId,totals,input.notes,timestamp),p_items:itemPayloads(totals.lines,id)})
  return{id:String(result.id),invoiceNumber:String(result.invoice_number),grandTotalMinor:Number(result.grand_total_minor),taxableValueMinor:Number(result.taxable_value_minor)}
}
