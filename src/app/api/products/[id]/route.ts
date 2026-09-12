import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db/client'
export const runtime='nodejs'
type Params={params:Promise<{id:string}>}
export async function PATCH(request:Request,{params}:Params){
 try{
  const {id}=await params; const body=await request.json(); const db=getDatabase()
  const existing=db.prepare('SELECT id FROM products WHERE id=? AND is_active=1').get(id)
  if(!existing)return NextResponse.json({error:'Product not found'},{status:404})
  const name=String(body.name??'').trim(), code=String(body.code??'').trim().toUpperCase(), rate=Number(body.defaultRate??0), gst=Number(body.gstRate??0)
  if(!name)return NextResponse.json({error:'Product name is required'},{status:400})
  if(!code)return NextResponse.json({error:'Product code is required'},{status:400})
  if(!Number.isFinite(rate)||rate<0)return NextResponse.json({error:'Enter a valid product rate'},{status:400})
  if(!Number.isFinite(gst)||gst<0||gst>100)return NextResponse.json({error:'GST rate must be between 0% and 100%'},{status:400})
  db.prepare(`UPDATE products SET code=?,name=?,hsn_code=?,pack_size=?,unit=?,default_rate_minor=?,gst_rate_bps=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(code,name,String(body.hsnCode??'').trim()||null,String(body.packSize??'').trim()||null,String(body.unit??'PCS').trim().toUpperCase(),Math.round(rate*100),Math.round(gst*100),id)
  db.prepare(`INSERT INTO audit_logs(id,action,entity_type,entity_id,metadata_json) VALUES(?,?,?,?,?)`).run(crypto.randomUUID(),'UPDATE','PRODUCT',id,JSON.stringify({code,name}))
  const product=db.prepare(`SELECT id,code,name,hsn_code AS hsnCode,pack_size AS packSize,unit,default_rate_minor AS defaultRateMinor,gst_rate_bps AS gstRateBps FROM products WHERE id=?`).get(id)
  return NextResponse.json({product})
 }catch(error){const message=error instanceof Error?error.message:'Unable to update product';return NextResponse.json({error:message.includes('UNIQUE')?'Product code already exists':message},{status:400})}
}
