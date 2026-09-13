'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

type IconName='home'|'plus'|'bills'|'customers'|'products'|'stock'|'settings'
const items:{href:string;label:string;icon:IconName;primary?:boolean}[]=[
  {href:'/dashboard',label:'Dashboard',icon:'home'},
  {href:'/invoice',label:'Counter',icon:'plus',primary:true},
  {href:'/invoices',label:'Bills',icon:'bills'},
  {href:'/customers',label:'Customers',icon:'customers'},
  {href:'/products',label:'Products',icon:'products'},
  {href:'/warehouse',label:'Stock',icon:'stock'},
  {href:'/settings',label:'Settings',icon:'settings'},
]
function Icon({name}:{name:IconName}){const common={width:17,height:17,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};switch(name){case'home':return <svg {...common}><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></svg>;case'plus':return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;case'bills':return <svg {...common}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>;case'customers':return <svg {...common}><circle cx="12" cy="8" r="3"/><path d="M5 20c.8-3.3 3.1-5 7-5s6.2 1.7 7 5"/></svg>;case'products':return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M9 9v11"/></svg>;case'stock':return <svg {...common}><path d="M4 6h16M4 12h16M4 18h16"/><path d="M7 4v16M17 4v16"/></svg>;default:return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20h-2.4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.6-1H6v-2.4h.8a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L8 8.6l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.4v.7a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.8V14h-.8a1.7 1.7 0 0 0-1.6 1Z"/></svg>}}

export default function AppNav(){
 const pathname=usePathname();const[open,setOpen]=useState(false);if(pathname==='/login')return null;const active=(href:string)=>pathname===href||pathname.startsWith(`${href}/`)
 return <>
  <header className="app-nav"><Link href="/dashboard" className="app-brand" onClick={()=>setOpen(false)}><span className="app-brand-mark">A</span><span><strong>Aiswarya</strong><small>Food Products · Billing</small></span></Link><nav className="app-nav-links" aria-label="Main navigation">{items.map(item=><Link key={item.href} href={item.href} className={`${active(item.href)?'active ':''}${item.primary?'primary':''}`}><Icon name={item.icon}/><span>{item.label}</span></Link>)}</nav><Link href="/invoice" className="nav-counter-button"><Icon name="plus"/> New Bill</Link><button className="nav-menu-button" aria-label="Open navigation" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>☰</button></header>
  {open&&<div className="mobile-nav-panel"><div className="mobile-nav-grid">{items.map(item=><Link key={item.href} href={item.href} className={active(item.href)?'active':''} onClick={()=>setOpen(false)}><Icon name={item.icon}/><strong>{item.label}</strong></Link>)}</div><Link href="/invoice" className="mobile-new-bill" onClick={()=>setOpen(false)}><Icon name="plus"/> Start New Bill</Link></div>}
  <nav className="mobile-bottom-nav" aria-label="Quick navigation">{items.filter(item=>item.href!=='/settings').slice(0,6).map(item=><Link key={item.href} href={item.href} className={active(item.href)?'active':''}><Icon name={item.icon}/><small>{item.label}</small></Link>)}</nav>
 </>
}
