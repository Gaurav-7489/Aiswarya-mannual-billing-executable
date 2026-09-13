import type { Metadata } from 'next'
import './globals.css'
import './production-ui.css'
import AuthGate from './AuthGate'
import ConnectionStatus from './ConnectionStatus'
export const metadata: Metadata={title:'Aiswarya Billing',description:'Production billing and sales management for Aiswarya Food Products.'}
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body><AuthGate>{children}</AuthGate><ConnectionStatus/></body></html>}
