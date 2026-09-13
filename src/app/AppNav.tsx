'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const items = [
  { href:'/dashboard', label:'Dashboard', short:'⌂' },
  { href:'/invoice', label:'Counter', short:'＋', primary:true },
  { href:'/invoices', label:'Bills', short:'▤' },
  { href:'/customers', label:'Customers', short:'◎' },
  { href:'/products', label:'Products', short:'□' },
  { href:'/warehouse', label:'Stock', short:'▥' },
  { href:'/settings', label:'Settings', short:'⚙' },
]

export default function AppNav(){
  const pathname=usePathname()
  const [open,setOpen]=useState(false)
  if(pathname==='/login') return null
  return <>
    <header className="app-nav">
      <Link href="/dashboard" className="app-brand" onClick={()=>setOpen(false)}>
        <span className="app-brand-mark">A</span>
        <span><strong>Aiswarya</strong><small>Food Products · Billing</small></span>
      </Link>
      <nav className="app-nav-links" aria-label="Main navigation">
        {items.map(item=><Link key={item.href} href={item.href} className={`${pathname===item.href||pathname.startsWith(`${item.href}/`)?'active ':''}${item.primary?'primary':''}`}><span>{item.short}</span>{item.label}</Link>)}
      </nav>
      <Link href="/invoice" className="nav-counter-button">＋ New Bill</Link>
      <button className="nav-menu-button" aria-label="Open navigation" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>☰</button>
    </header>
    {open&&<div className="mobile-nav-panel"><div className="mobile-nav-grid">{items.map(item=><Link key={item.href} href={item.href} className={pathname===item.href?'active':''} onClick={()=>setOpen(false)}><span>{item.short}</span><strong>{item.label}</strong></Link>)}</div><Link href="/invoice" className="mobile-new-bill" onClick={()=>setOpen(false)}>＋ Start New Bill</Link></div>}
    <nav className="mobile-bottom-nav" aria-label="Quick navigation">{items.filter(item=>item.href!=='/settings').slice(0,6).map(item=><Link key={item.href} href={item.href} className={pathname===item.href?'active':''}><span>{item.short}</span><small>{item.label}</small></Link>)}</nav>
  </>
}
