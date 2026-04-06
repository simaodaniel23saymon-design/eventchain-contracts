'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/hooks/useWallet'

type Props = { open: boolean; onClose: () => void }

export default function CreateEventModal({ open, onClose }: Props) {
  const { isConnected, connect, criarEvento } = useWallet()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    nome: '', data: '', local: '',
    preco: '', maxTickets: '', precoMaxRevenda: '', royalty: '10',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async () => {
    if (!isConnected) { connect(); return }
    if (!form.nome || !form.data || !form.preco || !form.maxTickets) {
      alert('Preenche todos os campos obrigatórios.')
      return
    }
    setLoading(true)
    try {
      const dataTs = Math.floor(new Date(form.data).getTime() / 1000)
      await criarEvento({
        nome:            form.nome,
        data:            dataTs,
        local:           form.local || 'Online',
        preco:           form.preco,
        maxTickets:      parseInt(form.maxTickets),
        precoMaxRevenda: form.precoMaxRevenda || String(parseFloat(form.preco) * 3),
        royalty:         parseInt(form.royalty) * 100, // base 10000
      })
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 2500)
    } catch (e: any) {
      alert(e?.reason || e?.message || 'Erro ao criar evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/88 backdrop-blur-lg"
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative w-full max-w-lg bg-surface border border-[rgba(212,175,90,.15)] rounded-2xl p-8 shadow-[0_40px_80px_rgba(0,0,0,.7)] max-h-[90vh] overflow-y-auto"
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
              style={{ background: 'linear-gradient(90deg,transparent,#D4AF5A,transparent)' }} />

            <button onClick={onClose}
              className="absolute top-4 right-4 text-text-dim hover:text-text-ec text-xl">✕</button>

            {success ? (
              <motion.div
                initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                className="text-center py-10"
              >
                <div className="text-5xl mb-4">🚀</div>
                <div className="font-display text-2xl text-gold mb-2">Evento Criado!</div>
                <div className="text-text-mid text-sm">Contrato publicado na Sepolia.</div>
              </motion.div>
            ) : (
              <>
                <div className="font-display text-2xl font-semibold mb-1">Criar Evento</div>
                <div className="font-mono text-xs text-text-dim mb-7">
                  Deploy de novo contrato EventTicket na Sepolia
                </div>

                <Field label="Nome do Evento *" value={form.nome} onChange={set('nome')} placeholder="Ex: Afrobeats Night 2025" />
                <Field label="Local" value={form.local} onChange={set('local')} placeholder="Ex: Luanda, Angola" />

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Data do Evento *" value={form.data} onChange={set('data')} type="date" />
                  <Field label="Preço (ETH) *" value={form.preco} onChange={set('preco')} type="number" placeholder="0.05" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Máx. Tickets *" value={form.maxTickets} onChange={set('maxTickets')} type="number" placeholder="500" />
                  <Field label="Royalty (%)" value={form.royalty} onChange={set('royalty')} type="number" placeholder="10" />
                </div>

                <Field label="Preço Máx. Revenda (ETH)" value={form.precoMaxRevenda}
                  onChange={set('precoMaxRevenda')} type="number" placeholder="Auto (3x preço base)" />

                <div className="bg-[rgba(212,175,90,.06)] border border-[rgba(212,175,90,.15)] rounded-xl p-4 mb-6 font-mono text-xs text-text-dim">
                  ⚡ Isto fará deploy de um novo contrato EventTicket na Sepolia.<br />
                  Certifica-te de ter ETH de teste suficiente.
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-gold-hot to-gold text-black font-semibold py-3.5 rounded-xl hover:shadow-[0_8px_24px_rgba(212,175,90,.4)] hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'A publicar contrato...' : isConnected ? 'Criar Evento' : 'Ligar Carteira'}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string; placeholder?: string
}) {
  return (
    <div className="mb-4">
      <label className="font-mono text-[11px] tracking-widest uppercase text-text-dim block mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-[rgba(255,255,255,.04)] border border-[rgba(212,175,90,.15)] rounded-lg px-4 py-3 text-text-ec text-sm outline-none focus:border-[rgba(212,175,90,.4)] focus:shadow-[0_0_0_3px_rgba(212,175,90,.08)] transition-all placeholder:text-text-dim"
      />
    </div>
  )
}
