import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Aiswarya Billing',
  description: 'Local-first billing and sales management system for Aiswarya Food Products.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
