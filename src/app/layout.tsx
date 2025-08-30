import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Vishnu's Finance - Personal Finance & Decision Assistant",
  description: 'A comprehensive personal finance platform for holistic financial management, news-driven decision making, and personal goal tracking.',
  keywords: 'personal finance, money management, financial planning, budgeting, investment tracking, financial goals',
  authors: [{ name: 'Vishnu' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: "Vishnu's Finance",
    description: 'Personal Finance & Decision Assistant',
    type: 'website',
    locale: 'en_IN',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="lg:pl-64">
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}