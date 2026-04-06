import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EventChain — Ticketing Descentralizado',
  description: 'Compra, vende e verifica tickets de eventos como NFTs na blockchain Ethereum. Zero fraude. Royalties automáticos.',
  keywords: ['NFT', 'tickets', 'blockchain', 'Ethereum', 'eventos', 'Web3'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}