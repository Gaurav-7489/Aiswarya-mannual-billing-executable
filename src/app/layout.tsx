import type { Metadata } from 'next'
import './globals.css'
import AuthGate from './AuthGate'

export const metadata: Metadata = {
  title: 'Aiswarya Billing',
  description: 'Local-first billing and sales management system for Aiswarya Food Products.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthGate>{children}</AuthGate></body></html>
}
