'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export default function AuthGate({children}:{children:React.ReactNode}){
 const router=useRouter(),path=usePathname(),[ready,setReady]=useState(false)
 useEffect(()=>{if(path==='/login') {setReady(true);return} let cancelled=false;fetch('/api/auth/me',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(cancelled)return;if(!d.configured)router.replace('/login');else if(!d.authenticated)router.replace('/login');else setReady(true)}).catch(()=>{if(!cancelled)router.replace('/login')});return()=>{cancelled=true}},[path,router])
 if(path==='/login')return<>{children}</>
 if(!ready)return <div style={{minHeight:'100vh',display:'grid',placeItems:'center',fontFamily:'Arial,sans-serif',color:'#53615c'}}>Checking secure access…</div>
 return <>{children}</>
}
