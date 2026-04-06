import { ADDRESSES } from '@/lib/contracts'

export default function Footer() {
  const year = new Date().getFullYear()

  const links = {
    Plataforma: [
      { label: 'Explorar Eventos', href: '#eventos' },
      { label: 'Marketplace',     href: '#marketplace' },
      { label: 'Como Funciona',   href: '#como-funciona' },
    ],
    Developers: [
      { label: 'GitHub',               href: 'https://github.com' },
      { label: 'EventFactory Sepolia', href: `https://sepolia.etherscan.io/address/${ADDRESSES.EventFactory}` },
      { label: 'Marketplace Sepolia',  href: `https://sepolia.etherscan.io/address/${ADDRESSES.TicketMarketplace}` },
    ],
  }

  return (
    <footer className="relative z-10 bg-deep border-t border-[rgba(212,175,90,.1)] px-6 pt-16 pb-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Marca */}
          <div>
            <div className="font-display text-2xl font-semibold text-gold mb-4">
              Event<span className="text-text-ec font-light">Chain</span>
            </div>
            <p className="text-sm text-text-dim leading-relaxed max-w-xs">
              Plataforma descentralizada de ticketing construída na Ethereum.
              Open source, auditável, permanente.
            </p>
          </div>

          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="font-mono text-[11px] tracking-[.14em] uppercase text-text-dim mb-5">{title}</h4>
              <ul className="space-y-3">
                {items.map(l => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target={l.href.startsWith('http') ? '_blank' : undefined}
                      rel="noreferrer"
                      className="text-sm text-text-mid hover:text-gold transition-colors duration-200"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-[rgba(212,175,90,.08)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <span className="font-mono text-xs text-text-dim">
            © {year} EventChain · MIT License · Sepolia Testnet
          </span>
          <div className="flex flex-col gap-1.5">
            {[
              { label: 'EventFactory',      addr: ADDRESSES.EventFactory },
              { label: 'TicketMarketplace', addr: ADDRESSES.TicketMarketplace },
            ].map(c => (
              <a
                key={c.label}
                href={`https://sepolia.etherscan.io/address/${c.addr}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 font-mono text-[10px] text-text-dim hover:text-gold transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                {c.label}: {c.addr.slice(0,10)}...{c.addr.slice(-6)}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
