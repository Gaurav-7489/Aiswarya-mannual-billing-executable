import { NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/auth/api'
import { rpc } from '@/lib/db/client'
import { searchProducts } from '@/lib/db/repositories'
export const runtime='nodejs'

export async function GET(request:Request){
  const guard=await requireApiAuth(); if(guard.response)return guard.response
  try{
    const q=new URL(request.url).searchParams.get('q')??''
    const products=await searchProducts(q)
    return NextResponse.json({products})
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to load warehouse'},{status:400})}
}

export async function POST(request:Request){
  const guard=await requireApiAuth(); if(guard.response)return guard.response
  if(guard.session?.role!=='OWNER') return NextResponse.json({error:'Only an owner can adjust warehouse stock.'},{status:403})
  try{
    const body=await request.json()
    const productId=String(body.productId??'').trim()
    const quantity=Number(body.quantity??0)
    const movementType=String(body.movementType??'ADJUSTMENT').trim().toUpperCase()
    const reason=String(body.reason??'').trim()||null
    if(!productId)return NextResponse.json({error:'Product is required.'},{status:400})
    if(!Number.isFinite(quantity)||quantity===0)return NextResponse.json({error:'Enter a non-zero stock quantity.'},{status:400})
    const product=await rpc('adjust_product_stock',{p_product_id:productId,p_quantity:quantity,p_movement_type:movementType,p_reason:reason,p_actor_role:guard.session.role})
    return NextResponse.json({ok:true,product})
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Unable to adjust stock.'},{status:400})}
}
