'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatEther } from 'ethers'
import { useWallet } from '@/hooks/useWallet'

export type EventData = {
  enderecoContrato: string
  organizador:      string
  nomeEvento:       string
  dataEvento:       bigint
  precoTicket:      bigint
  maxTickets:       bigint
  activo:           boolean
  totalVendidos?:   bigint
}

const CATEGORIAS = [
  { id: 'GERAL',    label: 'Geral',    mult: 1 },
  { id: 'VIP',      label: 'VIP',      mult: 2.4 },
  { id: 'CAMAROTE', label: 'Camarote', mult: 5 },
]

const GRADIENTS = [
  'linear-gradient(135deg,#1a1435,#2d1f4e 50%,#1a2840)',
  'linear-gradient(135deg,#0d1f14,#1a3d2b 50%,#0f2a20)',
  'linear-gradient(135deg,#1f0d1a,#3d1a2e 50%,#2a0f1f)',
  'linear-gradient(135deg,#1f1a0d,#3d2e1a 50%,#2a200f)',
  'linear-gradient(135deg,#0d1a1f,#1a2e3d 50%,#0f1f2a)',
]
const EMOJIS = ['🎵', '⛓️', '🎨', '🎶', '🌍']

type Props = { evento: EventData; index: number }

export default function EventCard({ evento, index }: Props) {
  const { isConnected, connect, comprarTicket } = useWallet()
  const [modalOpen, setModalOpen] = useState(false)
  const [categoria, setCategoria] = useState('GERAL')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const gradient = GRADIENTS[index % GRADIENTS.length]
  const emoji    = EMOJIS[index % EMOJIS.length]
  const preco    = formatEther(evento.precoTicket)
  const dataStr  = new Date(Number(evento.dataEvento) * 1000).toLocaleDateString('pt-PT', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
  const vendidos   = Number(evento.totalVendidos ?? 0n)
  const maxTickets = Number(evento.maxTickets)
  const soldOut    = vendidos >= maxTickets
  const progresso  = maxTickets > 0 ? (vendidos / maxTickets) * 100 : 0

  const precoCategoria = () => {
    const mult = CATEGORIAS.find(c => c.id === categoria)?.mult ?? 1
    return (parseFloat(preco) * mult).toFixed(4)
  }

  const handleComprar = async () => {
    if (!isConnected) { connect(); return }
    setLoading(true)
    try {
      await comprarTicket(evento.enderecoContrato, categoria, precoCategoria())
      setSuccess(true)
      setTimeout(() => { setSuccess(false); setModalOpen(false) }, 2500)
    } catch (e: any) {
      alert(e?.reason || e?.message || 'Erro ao comprar ticket')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.08, duration: 0.5 }}
        whileHover={{ y: -6 }}
        className={`bg-surface border border-[rgba(212,175,90,.12)] rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 hover:border-[rgba(212,175,90,.35)] hover:shadow-[0_24px_48px_rgba(0,0,0,.4),0_0_40px_rgba(212,175,90,.1)] ${soldOut ? 'opacity-70' : ''}`}
      >
        {/* Imagem */}
        <div className="relative h-44 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
            style={{ background: gradient }} />
          <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-20">
            {emoji}
          </div>
          <span className="absolute top-3 right-3 font-mono text-[10px] tracking-widest uppercase text-gold bg-black/70 border border-[rgba(212,175,90,.2)] px-3 py-1 rounded-full backdrop-blur-sm">
            NFT
          </span>
          {soldOut && (
            <span className="absolute bottom-3 left-3 font-mono text-[10px] bg-red-600/85 text-white px-3 py-1 rounded-full">
              ESGOTADO
            </span>
          )}
        </div>

        {/* Corpo */}
        <div className="p-5">
          <h3 className="font-display text-xl font-semibold mb-3 leading-snug">{evento.nomeEvento}</h3>

          <div className="flex flex-col gap-1.5 mb-4">
            {[
              { icon: '📅', text: dataStr },
              { icon: '🎟️', text: `${vendidos}/${maxTickets} tickets` },
            ].map(m => (
              <div key={m.icon} className="flex items-center gap-2 text-sm text-text-mid">
                <span>{m.icon}</span>
                <span>{m.text}</span>
              </div>
            ))}
          </div>

          {/* Barra de progresso */}
          <div className="h-0.5 bg-[rgba(212,175,90,.1)] rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-gold-hot rounded-full transition-all duration-700"
              style={{ width: `${progresso}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[rgba(212,175,90,.08)]">
            <div>
              <div className="font-display text-2xl font-semibold text-gold leading-none">{preco} ETH</div>
              <div className="font-mono text-[10px] tracking-widest uppercase text-text-dim mt-0.5">por ticket</div>
            </div>
            <button
              onClick={() => !soldOut && setModalOpen(true)}
              disabled={soldOut}
              className="bg-gold text-black font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-gold-hot hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            >
              {soldOut ? 'Esgotado' : 'Comprar'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Modal de compra */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/88 backdrop-blur-lg"
            onClick={e => e.target === e.currentTarget && setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 20 }}
              transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative w-full max-w-md bg-surface border border-[rgba(212,175,90,.15)] rounded-2xl p-8 shadow-[0_40px_80px_rgba(0,0,0,.7)]"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
                style={{ background: 'linear-gradient(90deg,transparent,#D4AF5A,transparent)' }} />

              <button onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 text-text-dim hover:text-text-ec text-xl transition-colors">✕</button>

              {success ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8"
                >
                  <div className="text-5xl mb-4">🎟️</div>
                  <div className="font-display text-2xl text-gold mb-2">Ticket Mintado!</div>
                  <div className="text-text-mid text-sm">NFT enviado para a tua carteira.</div>
                </motion.div>
              ) : (
                <>
                  <div className="font-display text-2xl font-semibold mb-1">Comprar Ticket</div>
                  <div className="font-mono text-xs text-text-dim mb-7">{evento.nomeEvento} · {dataStr}</div>

                  <div className="mb-5">
                    <label className="font-mono text-[11px] tracking-widest uppercase text-text-dim block mb-2">
                      Categoria
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {CATEGORIAS.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setCategoria(cat.id)}
                          className={`py-2.5 rounded-lg border font-mono text-xs tracking-wide transition-all duration-200 ${
                            categoria === cat.id
                              ? 'bg-gold text-black border-gold font-semibold'
                              : 'bg-transparent text-text-mid border-[rgba(212,175,90,.2)] hover:border-[rgba(212,175,90,.5)]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-[rgba(212,175,90,.06)] border border-[rgba(212,175,90,.2)] rounded-xl mb-6">
                    <span className="text-text-mid text-sm">Total a pagar</span>
                    <span className="font-display text-2xl font-semibold text-gold">{precoCategoria()} ETH</span>
                  </div>

                  <button
                    onClick={handleComprar}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-gold-hot to-gold text-black font-semibold py-3.5 rounded-xl hover:shadow-[0_8px_24px_rgba(212,175,90,.4)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
                  >
                    {loading ? 'A processar...' : isConnected ? 'Confirmar Compra' : 'Ligar Carteira'}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
