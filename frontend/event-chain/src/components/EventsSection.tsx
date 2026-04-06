'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Contract, BrowserProvider, JsonRpcProvider } from 'ethers'
import { ADDRESSES, EVENT_FACTORY_ABI, EVENT_TICKET_ABI } from '@/lib/contracts'
import EventCard, { EventData } from './EventCard'

const SEPOLIA_RPC = 'https://rpc.sepolia.org'

// Dados demo para quando não há eventos on-chain ainda
const DEMO_EVENTS: EventData[] = [
  {
    enderecoContrato: '0x0000000000000000000000000000000000000001',
    organizador:      '0x0000000000000000000000000000000000000000',
    nomeEvento:       'Afrobeats Night',
    dataEvento:       BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
    precoTicket:      BigInt('80000000000000000'), // 0.08 ETH
    maxTickets:       500n,
    activo:           true,
    totalVendidos:    312n,
  },
  {
    enderecoContrato: '0x0000000000000000000000000000000000000002',
    organizador:      '0x0000000000000000000000000000000000000000',
    nomeEvento:       'ETH Luanda Summit',
    dataEvento:       BigInt(Math.floor(Date.now() / 1000) + 86400 * 45),
    precoTicket:      BigInt('50000000000000000'), // 0.05 ETH
    maxTickets:       200n,
    activo:           true,
    totalVendidos:    87n,
  },
  {
    enderecoContrato: '0x0000000000000000000000000000000000000003',
    organizador:      '0x0000000000000000000000000000000000000000',
    nomeEvento:       'Digital Art Fair',
    dataEvento:       BigInt(Math.floor(Date.now() / 1000) + 86400 * 60),
    precoTicket:      BigInt('30000000000000000'), // 0.03 ETH
    maxTickets:       300n,
    activo:           true,
    totalVendidos:    120n,
  },
]

export default function EventsSection() {
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [usandoDemo, setUsandoDemo] = useState(false)

  const carregarEventos = useCallback(async () => {
    setLoading(true)
    try {
      const provider = new JsonRpcProvider(SEPOLIA_RPC)
      const factory  = new Contract(ADDRESSES.EventFactory, EVENT_FACTORY_ABI, provider)
      const total    = await factory.totalEventos()

      if (Number(total) === 0) {
        setEvents(DEMO_EVENTS)
        setUsandoDemo(true)
        return
      }

      const lista: EventData[] = []
      for (let i = 0; i < Number(total); i++) {
        const ev = await factory.detalhesEvento(i)
        if (!ev.activo) continue

        // Busca total vendidos do contrato do evento
        let totalVendidos = 0n
        try {
          const ticketContract = new Contract(ev.enderecoContrato, EVENT_TICKET_ABI, provider)
          totalVendidos = await ticketContract.totalVendidos()
        } catch {}

        lista.push({ ...ev, totalVendidos })
      }

      setEvents(lista.length > 0 ? lista : DEMO_EVENTS)
      setUsandoDemo(lista.length === 0)
    } catch {
      setEvents(DEMO_EVENTS)
      setUsandoDemo(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregarEventos() }, [carregarEventos])

  return (
    <section id="eventos" className="py-24 px-6 bg-deep relative z-10">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-mono text-xs tracking-[.18em] uppercase text-gold flex items-center gap-3 mb-4"
            >
              Próximos Eventos
              <span className="flex-1 max-w-[60px] h-px bg-[rgba(212,175,90,.35)]" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="font-display text-[clamp(2.2rem,4vw,3.5rem)] font-light leading-tight"
            >
              Experiências <em className="text-gold italic">únicas</em><br />na blockchain.
            </motion.h2>
          </div>

          {usandoDemo && (
            <div className="font-mono text-xs text-text-dim bg-[rgba(212,175,90,.05)] border border-[rgba(212,175,90,.1)] px-4 py-2 rounded-lg">
              ⚡ Dados demo · Cria um evento para ver on-chain
            </div>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-72 rounded-xl bg-surface border border-[rgba(212,175,90,.08)] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev, i) => (
              <EventCard key={ev.enderecoContrato} evento={ev} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
