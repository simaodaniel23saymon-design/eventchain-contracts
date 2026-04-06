'use client'

import { motion } from 'framer-motion'

const STEPS = [
  { n: '01', icon: '🔗', title: 'Liga a Carteira', desc: 'Conecta o MetaMask ou qualquer wallet compatível. Sem conta, sem email, sem senha.' },
  { n: '02', icon: '🎟️', title: 'Compra o Ticket', desc: 'Escolhe a categoria e paga em ETH. O NFT é mintado directo para a tua carteira.' },
  { n: '03', icon: '✅', title: 'Verifica na Entrada', desc: 'A verificação usa o endereço on-chain. Impossível de falsificar ou duplicar.' },
  { n: '04', icon: '💰', title: 'Revende com Royalty', desc: 'Revende no marketplace. O organizador recebe royalties automáticos em cada transação.' },
]

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 px-6 relative z-10">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-mono text-xs tracking-[.18em] uppercase text-gold flex items-center gap-3 mb-4"
        >
          Processo
          <span className="flex-1 max-w-[60px] h-px bg-[rgba(212,175,90,.35)]" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ delay: 0.1 }}
          className="font-display text-[clamp(2.2rem,4vw,3.5rem)] font-light leading-tight mb-4"
        >
          Simples como<br /><em className="text-gold italic">deve ser.</em>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ delay: 0.2 }}
          className="text-text-mid text-base leading-relaxed max-w-md mb-14"
        >
          Sem burocracia. Tudo on-chain, verificável e permanente.
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="relative bg-surface border border-[rgba(212,175,90,.1)] rounded-xl p-7 hover:border-[rgba(212,175,90,.3)] transition-all duration-300"
            >
              <div className="absolute top-5 right-5 font-display text-5xl font-bold text-[rgba(212,175,90,.07)] leading-none select-none">
                {s.n}
              </div>
              <div className="w-12 h-12 bg-[rgba(212,175,90,.1)] border border-[rgba(212,175,90,.3)] rounded-xl flex items-center justify-center text-xl mb-5">
                {s.icon}
              </div>
              <h3 className="font-display text-xl font-semibold mb-3">{s.title}</h3>
              <p className="text-sm text-text-mid leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
