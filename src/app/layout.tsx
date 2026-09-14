import type { Metadata } from 'next'
import './globals.css'
import AuthGate from './AuthGate'
import ConnectionStatus from './ConnectionStatus'
import AppNav from './AppNav'

export const metadata: Metadata = { title:'Aiswarya Billing', description:'Production billing and sales management for Aiswarya Food Products.' }

export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){
  return <html lang="en"><body><AuthGate><AppNav/>{children}</AuthGate><ConnectionStatus/></body></html>
}
