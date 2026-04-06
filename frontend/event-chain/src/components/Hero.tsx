'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'

const fadeUp = {
  hidden:  { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

export default function Hero() {
  const { connect, isConnected } = useWallet()
  const [stats, setStats] = useState({ events: 0, tickets: 0, volume: 0 })
  const hasAnimated = useRef(false)

  // Animação dos números
  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true
    const targets = { events: 48, tickets: 3241, volume: 127 }
    const duration = 1800
    const start = performance.now()
    const frame = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setStats({
        events:  Math.floor(ease * targets.events),
        tickets: Math.floor(ease * targets.tickets),
        volume:  Math.floor(ease * targets.volume),
      })
      if (p < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 pt-28 pb-16">

      {/* Orbs de fundo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full -top-32 -left-48 animate-[float1_18s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(circle, rgba(212,175,90,.1) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full bottom-0 -right-24 animate-[float2_22s_ease-in-out_infinite]"
          style={{ background: 'radial-gradient(circle, rgba(100,80,180,.08) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(212,175,90,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,90,.04) 1px,transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
        }} />

      <div className="relative z-10 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Texto */}
        <div>
          <motion.div
            custom={0} variants={fadeUp} initial="hidden" animate="visible"
            className="inline-flex items-center gap-2 font-mono text-xs tracking-widest text-gold bg-[rgba(212,175,90,.08)] border border-[rgba(212,175,90,.15)] px-4 py-2 rounded-full mb-7"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            Powered by Ethereum · EIP-2981
          </motion.div>

          <motion.h1
            custom={1} variants={fadeUp} initial="hidden" animate="visible"
            className="font-display text-[clamp(3rem,6vw,5.5rem)] font-light leading-[1.05] tracking-tight mb-6"
          >
            Tickets que<br />
            <em className="text-gold italic block">ninguém falsifica.</em>
          </motion.h1>

          <motion.p
            custom={2} variants={fadeUp} initial="hidden" animate="visible"
            className="text-base font-light leading-relaxed text-text-mid mb-10 max-w-md"
          >
            Compra, vende e verifica tickets de eventos como NFTs na blockchain.
            Royalties automáticos para organizadores. Zero intermediários. Zero fraude.
          </motion.p>

          <motion.div
            custom={3} variants={fadeUp} initial="hidden" animate="visible"
            className="flex flex-wrap gap-4"
          >
            <a
              href="#eventos"
              className="bg-gradient-to-br from-gold-hot to-gold text-black font-semibold font-sans text-sm tracking-wide px-8 py-3.5 rounded-lg hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(212,175,90,.35)] transition-all duration-200"
            >
              Explorar Eventos
            </a>
            {!isConnected && (
              <button
                onClick={connect}
                className="bg-transparent text-text-mid border border-[rgba(212,175,90,.2)] font-sans text-sm px-8 py-3.5 rounded-lg hover:text-gold hover:border-[rgba(212,175,90,.5)] hover:-translate-y-0.5 transition-all duration-200"
              >
                Ligar Carteira
              </button>
            )}
          </motion.div>

          {/* Stats */}
          <motion.div
            custom={4} variants={fadeUp} initial="hidden" animate="visible"
            className="flex gap-8 mt-14"
          >
            {[
              { num: stats.events,  label: 'Eventos' },
              { num: stats.tickets.toLocaleString(), label: 'Tickets Vendidos' },
              { num: `${stats.volume}`,              label: 'ETH Volume' },
            ].map(s => (
              <div key={s.label}>
                <div className="font-display text-[2.2rem] font-semibold text-gold leading-none">
                  {s.num}
                </div>
                <div className="font-mono text-xs tracking-widest uppercase text-text-dim mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Ticket flutuante */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="hidden lg:block"
          style={{ animation: 'ticketFloat 6s ease-in-out infinite' }}
        >
          <TicketPreview />
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes ticketFloat {
          0%,100% { transform: translateY(0) rotate(2deg); }
          50%      { transform: translateY(-20px) rotate(-1deg); }
        }
        @keyframes float1 {
          0%,100% { transform: translate(0,0); }
          50%     { transform: translate(60px,40px); }
        }
        @keyframes float2 {
          0%,100% { transform: translate(0,0); }
          50%     { transform: translate(-40px,-60px); }
        }
      `}</style>
    </section>
  )
}

function TicketPreview() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-[rgba(212,175,90,.2)] shadow-[0_40px_80px_rgba(0,0,0,.6),0_0_40px_rgba(212,175,90,.15)]"
      style={{ background: 'linear-gradient(135deg,#161626,#1C1C30)' }}>
      {/* Linha dourada topo */}
      <div className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: 'linear-gradient(90deg,transparent,#D4AF5A,transparent)' }} />

      {/* Imagem evento */}
      <div className="relative h-48 flex items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#1a1435,#2d1f4e 50%,#1a2840)' }}>
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 0%,rgba(212,175,90,.15),transparent 70%)' }} />
        <div className="absolute text-[5rem] opacity-10 animate-[rotateSlow_20s_linear_infinite]">◆</div>
        <span className="relative z-10 font-display text-xl font-semibold text-center px-4">
          Afrobeats Night<br />
          <small className="text-sm font-light italic text-text-mid">Luanda, Angola</small>
        </span>
      </div>

      {/* Corpo */}
      <div className="p-6">
        <div className="flex justify-between mb-4">
          {[
            { label: 'Data',   value: '15 Jun · 2025' },
            { label: 'Local',  value: 'Palácio de Vidro' },
            { label: 'Assento', value: 'A · 12' },
          ].map(f => (
            <div key={f.label}>
              <div className="font-mono text-[10px] tracking-widest uppercase text-text-dim mb-0.5">{f.label}</div>
              <div className="text-sm font-medium text-text-ec">{f.value}</div>
            </div>
          ))}
        </div>

        {/* Divisor com entalhes */}
        <div className="relative flex items-center my-4">
          <div className="absolute -left-6 w-6 h-6 rounded-full bg-black border border-[rgba(212,175,90,.15)]" />
          <div className="flex-1 border-t border-dashed border-[rgba(212,175,90,.15)]" />
          <div className="absolute -right-6 w-6 h-6 rounded-full bg-black border border-[rgba(212,175,90,.15)]" />
        </div>

        <div className="flex justify-between items-center">
          <span className="font-mono text-xs text-gold bg-[rgba(212,175,90,.1)] border border-[rgba(212,175,90,.3)] px-3 py-1 rounded">◆ VIP</span>
          <span className="font-display text-2xl font-semibold text-gold">0.08 ETH</span>
        </div>

        <div className="font-mono text-[10px] text-text-dim text-center mt-4 pt-4 border-t border-[rgba(212,175,90,.1)]">
          TOKEN ID #0042 · EventChain Ticket · ECT
        </div>
      </div>

      <style jsx>{`
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
