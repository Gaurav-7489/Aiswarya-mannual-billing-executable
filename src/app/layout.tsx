import type { Metadata, Viewport } from 'next'
import './globals.css'
import AuthGate from './AuthGate'
import ConnectionStatus from './ConnectionStatus'
import AppNav from './AppNav'

export const metadata: Metadata = { title:'Aiswarya Billing', description:'Production billing and sales management for Aiswarya Food Products.' }
export const viewport: Viewport = { width:'device-width', initialScale:1, viewportFit:'cover' }

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="en"><body><AuthGate><AppNav/>{children}</AuthGate><ConnectionStatus/></body></html>
}
