import { select, selectOne } from './client'

export type Customer = { id:string; code:string; name:string; phone:string|null; email:string|null; gstin:string|null; billingAddress:string|null; shippingAddress:string|null; state:string|null; city:string|null; stateCode?:string|null; pincode?:string|null }
export type Product = { id:string; code:string; name:string; hsn:string|null; packSize:string|null; unit:string; rateMinor:number; gstRateBps:number; active:boolean }

type Row = Record<string, unknown>
const customerSelect='id,code,name,phone,email,gstin,billing_address,shipping_address,state,state_code,city,pincode'

export async function searchCustomers(term=''): Promise<Customer[]> {
  const q=term.trim(); const search=q?`&or=(name.ilike.*${encodeURIComponent(q)}*,code.ilike.*${encodeURIComponent(q)}*,phone.ilike.*${encodeURIComponent(q)}*,gstin.ilike.*${encodeURIComponent(q)}*,city.ilike.*${encodeURIComponent(q)}*)`:''
  const rows=await select<Row>('customers',`select=${customerSelect}&is_active=eq.true&order=name.asc&limit=50${search}`)
  return rows.map(mapCustomer)
}
export async function searchProducts(term=''): Promise<Product[]> {
  const q=term.trim(); const search=q?`&or=(name.ilike.*${encodeURIComponent(q)}*,code.ilike.*${encodeURIComponent(q)}*,hsn_code.ilike.*${encodeURIComponent(q)}*)`:''
  const rows=await select<Row>('products',`select=id,code,name,hsn_code,pack_size,unit,default_rate_minor,gst_rate_bps,is_active&is_active=eq.true&order=name.asc&limit=100${search}`)
  return rows.map(mapProduct)
}
export async function getCustomer(id:string){const row=await selectOne<Row>('customers',`select=${customerSelect}&id=eq.${encodeURIComponent(id)}&is_active=eq.true`);return row?mapCustomer(row):undefined}
export async function getProduct(id:string){const row=await selectOne<Row>('products',`select=id,code,name,hsn_code,pack_size,unit,default_rate_minor,gst_rate_bps,is_active&id=eq.${encodeURIComponent(id)}`);return row?mapProduct(row):undefined}
function mapCustomer(r:Row):Customer{return{id:String(r.id),code:String(r.code),name:String(r.name),phone:r.phone as string|null,email:r.email as string|null,gstin:r.gstin as string|null,billingAddress:r.billing_address as string|null,shippingAddress:r.shipping_address as string|null,state:r.state as string|null,city:r.city as string|null,stateCode:r.state_code as string|null,pincode:r.pincode as string|null}}
function mapProduct(r:Row):Product{return{id:String(r.id),code:String(r.code),name:String(r.name),hsn:r.hsn_code as string|null,packSize:r.pack_size as string|null,unit:String(r.unit),rateMinor:Number(r.default_rate_minor||0),gstRateBps:Number(r.gst_rate_bps||0),active:Boolean(r.is_active)}}
