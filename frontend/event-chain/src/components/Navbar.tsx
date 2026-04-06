'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useWallet } from '@/hooks/useWallet'

export default function Navbar() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const shortAddr = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null

  const links = [
    { href: '#eventos',       label: 'Eventos' },
    { href: '#como-funciona', label: 'Como Funciona' },
    { href: '#marketplace',   label: 'Marketplace' },
  ]

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-5 transition-all duration-300 ${
          scrolled
            ? 'bg-black/95 backdrop-blur-sm border-b border-[rgba(212,175,90,0.12)]'
            : 'bg-gradient-to-b from-black/90 to-transparent'
        }`}
      >
        {/* Logo */}
        <Link href="/" className="font-display text-2xl font-semibold text-gold tracking-wide">
          Event<span className="text-text-ec font-light">Chain</span>
        </Link>

        {/* Links desktop */}
        <ul className="hidden md:flex gap-9 list-none">
          {links.map(l => (
            <li key={l.href}>
              <a
                href={l.href}
                className="font-mono text-xs tracking-widest uppercase text-text-mid hover:text-gold transition-colors duration-200"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Botão carteira */}
        <div className="hidden md:flex items-center gap-3">
          {isConnected && (
            <span className="font-mono text-xs text-gold bg-[rgba(212,175,90,0.08)] border border-[rgba(212,175,90,0.2)] px-3 py-1.5 rounded-full">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-2 animate-pulse" />
              {shortAddr}
            </span>
          )}
          <button
            onClick={isConnected ? disconnect : connect}
            disabled={isConnecting}
            className={`font-mono text-xs tracking-wide px-5 py-2.5 rounded-lg transition-all duration-200 ${
              isConnected
                ? 'bg-transparent text-gold border border-[rgba(212,175,90,0.3)] hover:border-gold/60'
                : 'bg-gold text-black font-semibold hover:bg-gold-hot hover:shadow-[0_8px_24px_rgba(212,175,90,0.3)] hover:-translate-y-0.5'
            } disabled:opacity-50`}
          >
            {isConnecting ? 'A ligar...' : isConnected ? 'Desligar' : 'Ligar Carteira'}
          </button>
        </div>

        {/* Hamburger mobile */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden flex flex-col gap-1.5 p-1"
        >
          <motion.span
            animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
            className="block w-6 h-0.5 bg-text-ec origin-center"
          />
          <motion.span
            animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
            className="block w-6 h-0.5 bg-text-ec"
          />
          <motion.span
            animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
            className="block w-6 h-0.5 bg-text-ec origin-center"
          />
        </button>
      </motion.nav>

      {/* Menu mobile */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-[72px] left-0 right-0 z-40 bg-black/98 backdrop-blur-md border-b border-[rgba(212,175,90,0.12)] px-8 py-6 flex flex-col gap-5 md:hidden"
          >
            {links.map(l => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="font-mono text-sm tracking-widest uppercase text-text-mid hover:text-gold transition-colors"
              >
                {l.label}
              </a>
            ))}
            <button
              onClick={() => { isConnected ? disconnect() : connect(); setMenuOpen(false) }}
              className="mt-2 w-full bg-gold text-black font-semibold font-mono text-sm py-3 rounded-lg hover:bg-gold-hot transition-colors"
            >
              {isConnected ? shortAddr : 'Ligar Carteira'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
