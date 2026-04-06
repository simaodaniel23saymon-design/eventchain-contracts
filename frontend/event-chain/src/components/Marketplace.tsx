'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Contract, JsonRpcProvider, formatEther } from 'ethers'
import { ADDRESSES, MARKETPLACE_ABI } from '@/lib/contracts'
import { useWallet } from '@/hooks/useWallet'

type Listagem = {
  id: bigint
  vendedor: string
  enderecoContrato: string
  tokenId: bigint
  preco: bigint
  activa: boolean
}

const EMOJIS = ['🎵', '⛓️', '🎨', '🎶', '🌍']
const BG     = ['#1a1435', '#0d1f14', '#1f0d1a', '#1f1a0d', '#0d1a1f']

export default function Marketplace() {
  const { isConnected, connect, getMarketplaceContract } = useWallet()
  const [listagens, setListagens] = useState<Listagem[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<bigint | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const provider   = new JsonRpcProvider('https://rpc.sepolia.org')
      const marketplace = new Contract(ADDRESSES.TicketMarketplace, MARKETPLACE_ABI, provider)
      const total      = await marketplace.totalListagens()

      const lista: Listagem[] = []
      for (let i = 1n; i <= BigInt(total); i++) {
        const l = await marketplace.detalhesListagem(i)
        if (l.activa) lista.push({ id: i, ...l })
      }
      setListagens(lista)
    } catch {
      setListagens([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const handleComprar = async (l: Listagem) => {
    if (!isConnected) { connect(); return }
    setBuying(l.id)
    try {
      const marketplace = await getMarketplaceContract(false)
      const tx = await marketplace.comprarTicket(l.id, { value: l.preco })
      await tx.wait()
      await carregar()
    } catch (e: any) {
      alert(e?.reason || e?.message || 'Erro ao comprar')
    } finally {
      setBuying(null)
    }
  }

  return (
    <section id="marketplace" className="py-24 px-6 bg-deep relative z-10">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-mono text-xs tracking-[.18em] uppercase text-gold flex items-center gap-3 mb-4"
        >
          Mercado Secundário
          <span className="flex-1 max-w-[60px] h-px bg-[rgba(212,175,90,.35)]" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ delay: 0.1 }}
          className="font-display text-[clamp(2.2rem,4vw,3.5rem)] font-light leading-tight mb-4"
        >
          Revenda <em className="text-gold italic">transparente.</em>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ delay: 0.2 }}
          className="text-text-mid text-base max-w-md mb-12"
        >
          Todos os preços visíveis. Royalties automáticos. Anti-scalper activado.
        </motion.p>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-surface animate-pulse" />)}
          </div>
        ) : listagens.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-20 border border-[rgba(212,175,90,.1)] rounded-2xl"
          >
            <div className="text-4xl mb-4">🏪</div>
            <div className="font-display text-2xl text-text-mid mb-2">Marketplace vazio</div>
            <div className="font-mono text-xs text-text-dim">
              Nenhum ticket listado para venda ainda.
            </div>
          </motion.div>
        ) : (
          <>
            {/* Tabela desktop */}
            <div className="hidden md:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(212,175,90,.1)]">
                    {['Ticket', 'Token ID', 'Preço', 'Vendedor', ''].map(h => (
                      <th key={h} className="font-mono text-[11px] tracking-[.14em] uppercase text-text-dim text-left py-3 px-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listagens.map((l, i) => (
                    <motion.tr
                      key={String(l.id)}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-[rgba(212,175,90,.05)] hover:bg-[rgba(212,175,90,.03)] transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                            style={{ background: BG[i % BG.length] }}>
                            {EMOJIS[i % EMOJIS.length]}
                          </div>
                          <span className="font-medium text-sm">{l.enderecoContrato.slice(0,10)}...</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-text-dim">#{String(l.tokenId)}</td>
                      <td className="py-4 px-4 font-mono text-sm text-gold">{formatEther(l.preco)} ETH</td>
                      <td className="py-4 px-4 font-mono text-xs text-text-mid">
                        {l.vendedor.slice(0,6)}...{l.vendedor.slice(-4)}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleComprar(l)}
                          disabled={buying === l.id}
                          className="bg-gold text-black font-semibold font-mono text-xs px-4 py-2 rounded-lg hover:bg-gold-hot transition-colors disabled:opacity-50"
                        >
                          {buying === l.id ? '...' : 'Comprar'}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards mobile */}
            <div className="md:hidden space-y-3">
              {listagens.map((l, i) => (
                <div key={String(l.id)}
                  className="flex items-center gap-4 bg-surface border border-[rgba(212,175,90,.1)] rounded-xl p-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: BG[i % BG.length] }}>
                    {EMOJIS[i % EMOJIS.length]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{l.enderecoContrato.slice(0,14)}...</div>
                    <div className="font-mono text-[10px] text-text-dim mt-0.5">
                      #{String(l.tokenId)} · {l.vendedor.slice(0,8)}...
                    </div>
                  </div>
                  <div className="font-display text-lg text-gold font-semibold mr-3">
                    {formatEther(l.preco)}
                  </div>
                  <button
                    onClick={() => handleComprar(l)}
                    disabled={buying === l.id}
                    className="bg-gold text-black font-semibold font-mono text-xs px-3 py-2 rounded-lg hover:bg-gold-hot transition-colors flex-shrink-0 disabled:opacity-50"
                  >
                    {buying === l.id ? '...' : 'Comprar'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
