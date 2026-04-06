'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Contract, JsonRpcProvider, formatEther, parseEther } from 'ethers'
import { ADDRESSES, EVENT_FACTORY_ABI, EVENT_TICKET_ABI, MARKETPLACE_ABI } from '@/lib/contracts'

// =============================================
// TIPOS
// =============================================
type EventoData = {
  enderecoContrato: string
  organizador:      string
  nomeEvento:       string
  dataEvento:       bigint
  precoTicket:      bigint
  maxTickets:       bigint
  activo:           boolean
  totalVendidos:    bigint
}

type Listagem = {
  id: bigint
  vendedor: string; enderecoContrato: string
  tokenId: bigint; preco: bigint; activa: boolean
}

// =============================================
// CONSTANTES
// =============================================
const SEPOLIA_RPC = 'https://rpc.sepolia.org'

const GRADIENTS = [
  'linear-gradient(135deg,#1a1435,#2d1f4e 50%,#1a2840)',
  'linear-gradient(135deg,#0d1f14,#1a3d2b 50%,#0f2a20)',
  'linear-gradient(135deg,#1f0d1a,#3d1a2e 50%,#2a0f1f)',
  'linear-gradient(135deg,#1f1a0d,#3d2e1a 50%,#2a200f)',
  'linear-gradient(135deg,#0d1a1f,#1a2e3d 50%,#0f1f2a)',
]
const EMOJIS = ['🎵', '⛓️', '🎨', '🎶', '🌍']
const BG_THUMBS = ['#1a1435','#0d1f14','#1f0d1a','#1f1a0d','#0d1a1f']

const DEMO_EVENTS: EventoData[] = [
  { enderecoContrato:'0x001', organizador:'0x0', nomeEvento:'Afrobeats Night',   dataEvento:BigInt(Math.floor(Date.now()/1000)+86400*30), precoTicket:BigInt('80000000000000000'),  maxTickets:500n, activo:true, totalVendidos:312n },
  { enderecoContrato:'0x002', organizador:'0x0', nomeEvento:'ETH Luanda Summit', dataEvento:BigInt(Math.floor(Date.now()/1000)+86400*45), precoTicket:BigInt('50000000000000000'),  maxTickets:200n, activo:true, totalVendidos:87n  },
  { enderecoContrato:'0x003', organizador:'0x0', nomeEvento:'Digital Art Fair',  dataEvento:BigInt(Math.floor(Date.now()/1000)+86400*60), precoTicket:BigInt('30000000000000000'),  maxTickets:300n, activo:true, totalVendidos:120n },
]

const CATEGORIAS = [
  { id:'GERAL',    label:'Geral',    mult:1   },
  { id:'VIP',      label:'VIP',      mult:2.4 },
  { id:'CAMAROTE', label:'Camarote', mult:5   },
]

// =============================================
// HOOK CARTEIRA
// =============================================
function useWallet() {
  const [address, setAddress]     = useState<string|null>(null)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return
    window.ethereum.request({ method:'eth_accounts' }).then((accs: string[]) => {
      if (accs[0]) setAddress(accs[0])
    })
    window.ethereum.on('accountsChanged', (accs: string[]) => setAddress(accs[0] || null))
  }, [])

  const connect = async () => {
    if (!window.ethereum) { alert('Instala o MetaMask em metamask.io'); return }
    setConnecting(true)
    try {
      const accs = await window.ethereum.request({ method:'eth_requestAccounts' })
      setAddress(accs[0])
      // Muda para Sepolia
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xAA36A7' }],
      }).catch(() => {})
    } finally { setConnecting(false) }
  }

  const getSigner = async () => {
    const { BrowserProvider } = await import('ethers')
    const provider = new BrowserProvider(window.ethereum)
    return provider.getSigner()
  }

  return { address, connecting, connect, getSigner }
}

// =============================================
// TOAST
// =============================================
type Toast = { id: number; title: string; msg: string; type?: string }
let toastId = 0

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const add = useCallback((title: string, msg: string, type = '') => {
    const id = ++toastId
    setToasts(t => [...t, { id, title, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800)
  }, [])
  return { toasts, add }
}

// =============================================
// PÁGINA PRINCIPAL
// =============================================
export default function Home() {
  const wallet  = useWallet()
  const { toasts, add: addToast } = useToasts()

  const [eventos, setEventos]         = useState<EventoData[]>([])
  const [listagens, setListagens]     = useState<Listagem[]>([])
  const [loadingEvts, setLoadingEvts] = useState(true)
  const [loadingMkt,  setLoadingMkt]  = useState(true)
  const [usandoDemo,  setUsandoDemo]  = useState(false)

  const [buyModal, setBuyModal]   = useState<EventoData | null>(null)
  const [createModal, setCreate]  = useState(false)
  const [categoria, setCategoria] = useState('GERAL')
  const [txLoading, setTxLoading] = useState(false)
  const [success, setSuccess]     = useState(false)

  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const [stats, setStats] = useState({ events:0, tickets:0, volume:0 })

  // Form criar evento
  const [form, setForm] = useState({ nome:'', data:'', local:'', preco:'', max:'', royalty:'10' })

  // Nav scroll
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Animação stats
  useEffect(() => {
    const targets = { events:48, tickets:3241, volume:127 }
    const dur = 1600; const start = performance.now()
    const frame = (now: number) => {
      const p = Math.min((now-start)/dur, 1)
      const e = 1-Math.pow(1-p, 3)
      setStats({ events:Math.floor(e*targets.events), tickets:Math.floor(e*targets.tickets), volume:Math.floor(e*targets.volume) })
      if (p < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [])

  // Carregar eventos
  useEffect(() => {
    const load = async () => {
      setLoadingEvts(true)
      try {
        const prov = new JsonRpcProvider(SEPOLIA_RPC)
        const factory = new Contract(ADDRESSES.EventFactory, EVENT_FACTORY_ABI, prov)
        const total = await factory.totalEventos()
        if (Number(total) === 0) { setEventos(DEMO_EVENTS); setUsandoDemo(true); return }
        const lista: EventoData[] = []
        for (let i=0;i<Number(total);i++) {
          const ev = await factory.detalhesEvento(i)
          if (!ev.activo) continue
          let tv = 0n
          try { const tc = new Contract(ev.enderecoContrato, EVENT_TICKET_ABI, prov); tv = await tc.totalVendidos() } catch {}
          lista.push({ ...ev, totalVendidos: tv })
        }
        setEventos(lista.length > 0 ? lista : DEMO_EVENTS)
        setUsandoDemo(lista.length === 0)
      } catch { setEventos(DEMO_EVENTS); setUsandoDemo(true) }
      finally { setLoadingEvts(false) }
    }
    load()
  }, [])

  // Carregar marketplace
  useEffect(() => {
    const load = async () => {
      setLoadingMkt(true)
      try {
        const prov = new JsonRpcProvider(SEPOLIA_RPC)
        const mkt = new Contract(ADDRESSES.TicketMarketplace, MARKETPLACE_ABI, prov)
        const total = await mkt.totalListagens()
        const lista: Listagem[] = []
        for (let i=1n; i<=BigInt(total); i++) {
          const l = await mkt.detalhesListagem(i)
          if (l.activa) lista.push({ id:i, ...l })
        }
        setListagens(lista)
      } catch { setListagens([]) }
      finally { setLoadingMkt(false) }
    }
    load()
  }, [])

  // Preço da categoria
  const precoCategoria = () => {
    if (!buyModal) return '0'
    const base = parseFloat(formatEther(buyModal.precoTicket))
    const mult = CATEGORIAS.find(c => c.id === categoria)?.mult ?? 1
    return (base * mult).toFixed(4)
  }

  // Comprar ticket
  const handleComprar = async () => {
    if (!wallet.address) { wallet.connect(); return }
    if (!buyModal) return
    setTxLoading(true)
    try {
      const signer = await wallet.getSigner()
      const tc = new Contract(buyModal.enderecoContrato, EVENT_TICKET_ABI, signer)
      const tx = await tc.comprarTicket(categoria, 'ipfs://eventchain', {
        value: parseEther(precoCategoria()),
      })
      await tx.wait()
      setSuccess(true)
      addToast('Ticket Mintado! 🎟️', 'NFT enviado para a tua carteira.', 'success')
      setTimeout(() => { setSuccess(false); setBuyModal(null) }, 2500)
    } catch (e: any) {
      addToast('Erro', e?.reason || e?.message || 'Transação falhou.', 'error')
    } finally { setTxLoading(false) }
  }

  // Criar evento
  const handleCriarEvento = async () => {
    if (!wallet.address) { wallet.connect(); return }
    if (!form.nome || !form.data || !form.preco || !form.max) {
      addToast('Campos em falta', 'Preenche todos os campos obrigatórios.', 'error'); return
    }
    setTxLoading(true)
    try {
      const signer = await wallet.getSigner()
      const factory = new Contract(ADDRESSES.EventFactory, EVENT_FACTORY_ABI, signer)
      const dataTs = Math.floor(new Date(form.data).getTime()/1000)
      const tx = await factory.criarEvento(
        form.nome, dataTs, form.local || 'Online',
        parseEther(form.preco), parseInt(form.max),
        parseEther(String(parseFloat(form.preco)*3)),
        parseInt(form.royalty)*100,
      )
      await tx.wait()
      setSuccess(true)
      addToast('Evento Criado! 🚀', 'Contrato publicado na Sepolia.', 'success')
      setTimeout(() => { setSuccess(false); setCreate(false) }, 2500)
    } catch (e: any) {
      addToast('Erro', e?.reason || e?.message || 'Deploy falhou.', 'error')
    } finally { setTxLoading(false) }
  }

  // Comprar no marketplace
  const handleMktComprar = async (l: Listagem) => {
    if (!wallet.address) { wallet.connect(); return }
    try {
      const signer = await wallet.getSigner()
      const mkt = new Contract(ADDRESSES.TicketMarketplace, MARKETPLACE_ABI, signer)
      const tx = await mkt.comprarTicket(l.id, { value: l.preco })
      await tx.wait()
      addToast('Compra Concluída! ✅', 'Ticket transferido para a tua carteira.', 'success')
      setListagens(prev => prev.filter(x => x.id !== l.id))
    } catch (e: any) {
      addToast('Erro', e?.reason || e?.message || 'Transação falhou.', 'error')
    }
  }

  const shortAddr = wallet.address
    ? `${wallet.address.slice(0,6)}...${wallet.address.slice(-4)}`
    : null

  return (
    <>
      {/* ============ TOASTS ============ */}
      <div className="ec-toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`ec-toast ${t.type}`}>
            <div className="ec-toast-title">{t.title}</div>
            <div className="ec-toast-msg">{t.msg}</div>
          </div>
        ))}
      </div>

      {/* ============ NAVBAR ============ */}
      <nav className={`ec-nav ${scrolled ? 'scrolled' : ''}`}>
        <a href="/" className="ec-logo">Event<span>Chain</span></a>

        <ul className="ec-nav-links">
          <li><a href="#eventos">Eventos</a></li>
          <li><a href="#como-funciona">Como Funciona</a></li>
          <li><a href="#marketplace">Marketplace</a></li>
          <li><a onClick={() => setCreate(true)} style={{ cursor:'pointer' }}>Criar Evento</a></li>
        </ul>

        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          {wallet.address && (
            <div className="ec-wallet-badge" style={{ display:'none' }}>
              <span className="ec-wallet-dot" />
              {shortAddr}
            </div>
          )}
          <button
            className={`ec-btn-connect ${wallet.address ? 'connected' : ''}`}
            onClick={wallet.address ? () => {} : wallet.connect}
          >
            {wallet.connecting ? 'A ligar...' : wallet.address ? shortAddr! : 'Ligar Carteira'}
          </button>
          <button className="ec-hamburger" onClick={() => setMenuOpen(!menuOpen)}>
            <span style={{ transform: menuOpen ? 'rotate(45deg) translate(4px,4px)' : 'none' }} />
            <span style={{ opacity: menuOpen ? 0 : 1 }} />
            <span style={{ transform: menuOpen ? 'rotate(-45deg) translate(4px,-4px)' : 'none' }} />
          </button>
        </div>
      </nav>

      {/* Menu mobile */}
      <div className={`ec-mobile-menu ${menuOpen ? 'open' : ''}`}>
        <a href="#eventos"       onClick={() => setMenuOpen(false)}>Eventos</a>
        <a href="#como-funciona" onClick={() => setMenuOpen(false)}>Como Funciona</a>
        <a href="#marketplace"   onClick={() => setMenuOpen(false)}>Marketplace</a>
        <a onClick={() => { setCreate(true); setMenuOpen(false) }} style={{ cursor:'pointer' }}>Criar Evento</a>
        <button className="ec-btn-connect" style={{ width:'100%', marginTop:'8px' }} onClick={wallet.connect}>
          {wallet.address ? shortAddr! : 'Ligar Carteira'}
        </button>
      </div>

      {/* ============ HERO ============ */}
      <section className="ec-hero">
        <div className="ec-orb ec-orb-1" />
        <div className="ec-orb ec-orb-2" />
        <div className="ec-hero-grid" />

        <div className="ec-hero-inner">
          <div>
            <div className="ec-hero-badge">
              <span className="ec-hero-badge-dot" />
              Powered by Ethereum · EIP-2981
            </div>

            <h1 className="ec-hero-title">
              Tickets que<br />
              <em>ninguém falsifica.</em>
            </h1>

            <p className="ec-hero-desc">
              Compra, vende e verifica tickets de eventos como NFTs na blockchain.
              Royalties automáticos para organizadores. Zero intermediários. Zero fraude.
            </p>

            <div className="ec-hero-actions">
              <a href="#eventos" className="ec-btn-primary">Explorar Eventos</a>
              <button className="ec-btn-ghost" onClick={() => setCreate(true)}>Criar Evento</button>
            </div>

            <div className="ec-hero-stats">
              {[
                { num: stats.events,   label: 'Eventos' },
                { num: stats.tickets.toLocaleString(), label: 'Tickets Vendidos' },
                { num: `${stats.volume} ETH`, label: 'Volume' },
              ].map(s => (
                <div key={s.label}>
                  <div className="ec-stat-num">{s.num}</div>
                  <div className="ec-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket flutuante */}
          <div className="ec-ticket-wrap" style={{ display:'none' }} id="hero-ticket">
            <div className="ec-ticket-card">
              <div className="ec-ticket-img">
                <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 0%,rgba(212,175,90,.15),transparent 70%)' }} />
                <span style={{ position:'relative', zIndex:1, fontFamily:"'Cormorant Garamond',serif", fontSize:'1.3rem', fontWeight:600, textAlign:'center', padding:'0 20px' }}>
                  Afrobeats Night<br />
                  <small style={{ fontSize:'.75em', fontWeight:300, fontStyle:'italic', color:'var(--ec-text-mid)' }}>Luanda, Angola</small>
                </span>
              </div>
              <div className="ec-ticket-body">
                <div className="ec-ticket-row">
                  {[['Data','15 Jun 2025'],['Local','Palácio de Vidro'],['Assento','A · 12']].map(([l,v]) => (
                    <div key={l}>
                      <div className="ec-ticket-field-label">{l}</div>
                      <div className="ec-ticket-field-value">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="ec-ticket-divider">
                  <div className="ec-ticket-notch" />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span className="ec-ticket-badge">◆ VIP</span>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.5rem', fontWeight:600, color:'var(--ec-gold)' }}>0.08 ETH</span>
                </div>
                <div className="ec-ticket-token">TOKEN ID #0042 · EventChain Ticket · ECT</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Script para mostrar ticket só em desktop */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          var el = document.getElementById('hero-ticket');
          if(el && window.innerWidth >= 1024) el.style.display = 'block';
          window.addEventListener('resize', function(){
            if(el) el.style.display = window.innerWidth >= 1024 ? 'block' : 'none';
          });
        })();
      ` }} />

      {/* ============ EVENTOS ============ */}
      <section id="eventos" className="ec-section ec-section-deep">
        <div className="ec-container">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:16, marginBottom:48 }}>
            <div>
              <div className="ec-section-label">Próximos Eventos</div>
              <h2 className="ec-section-title">Experiências <em>únicas</em><br />na blockchain.</h2>
            </div>
            {usandoDemo && (
              <span className="ec-demo-badge">⚡ Dados demo · Cria um evento para ver on-chain</span>
            )}
          </div>

          {loadingEvts ? (
            <div className="ec-events-grid">
              {[1,2,3].map(i => <div key={i} className="ec-loading-skeleton" style={{ height:280 }} />)}
            </div>
          ) : (
            <div className="ec-events-grid">
              {eventos.map((ev, i) => {
                const preco   = formatEther(ev.precoTicket)
                const vendidos = Number(ev.totalVendidos)
                const max     = Number(ev.maxTickets)
                const prog    = max > 0 ? (vendidos/max)*100 : 0
                const soldOut = vendidos >= max
                const data    = new Date(Number(ev.dataEvento)*1000).toLocaleDateString('pt-PT',{ day:'numeric',month:'short',year:'numeric' })

                return (
                  <div key={ev.enderecoContrato} className="ec-event-card">
                    <div className="ec-event-img">
                      <div className="ec-event-img-bg" style={{ background: GRADIENTS[i%GRADIENTS.length] }} />
                      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'3rem', opacity:.18 }}>
                        {EMOJIS[i%EMOJIS.length]}
                      </div>
                      <span className="ec-event-tag">NFT</span>
                      {soldOut && (
                        <span style={{ position:'absolute', bottom:12, left:12, fontFamily:"'JetBrains Mono',monospace", fontSize:'.62rem', background:'rgba(192,57,43,.85)', color:'#fff', padding:'5px 12px', borderRadius:'100px' }}>
                          ESGOTADO
                        </span>
                      )}
                    </div>
                    <div className="ec-event-body">
                      <div className="ec-event-name">{ev.nomeEvento}</div>
                      <div className="ec-event-meta">
                        <div className="ec-event-meta-item"><span>📅</span> {data}</div>
                        <div className="ec-event-meta-item"><span>🎟️</span> {vendidos}/{max} tickets</div>
                      </div>
                      <div className="ec-progress-bar">
                        <div className="ec-progress-fill" style={{ width:`${prog}%` }} />
                      </div>
                      <div className="ec-event-footer">
                        <div>
                          <div className="ec-event-price">{preco} ETH</div>
                          <div className="ec-event-price-label">por ticket</div>
                        </div>
                        <button
                          className="ec-btn-buy"
                          disabled={soldOut}
                          onClick={() => { if(!soldOut){ setCategoria('GERAL'); setSuccess(false); setBuyModal(ev) } }}
                          style={soldOut ? { opacity:.4, cursor:'not-allowed' } : {}}
                        >
                          {soldOut ? 'Esgotado' : 'Comprar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============ COMO FUNCIONA ============ */}
      <section id="como-funciona" className="ec-section">
        <div className="ec-container">
          <div className="ec-section-label">Processo</div>
          <h2 className="ec-section-title">Simples como<br /><em>deve ser.</em></h2>
          <p className="ec-section-sub">Sem burocracia. Tudo on-chain, verificável e permanente.</p>

          <div className="ec-steps-grid">
            {[
              { n:'01', icon:'🔗', t:'Liga a Carteira',     d:'Conecta o MetaMask ou qualquer wallet compatível. Sem conta, sem email, sem senha.' },
              { n:'02', icon:'🎟️', t:'Compra o Ticket',     d:'Escolhe a categoria e paga em ETH. O NFT é mintado directo para a tua carteira.' },
              { n:'03', icon:'✅', t:'Verifica na Entrada',  d:'A verificação usa o endereço on-chain. Impossível de falsificar ou duplicar.' },
              { n:'04', icon:'💰', t:'Revende com Royalty',  d:'Revende no marketplace. O organizador recebe royalties automáticos em cada transação.' },
            ].map(s => (
              <div key={s.n} className="ec-step-card">
                <div className="ec-step-num">{s.n}</div>
                <div className="ec-step-icon">{s.icon}</div>
                <div className="ec-step-title">{s.t}</div>
                <p className="ec-step-desc">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MARKETPLACE ============ */}
      <section id="marketplace" className="ec-section ec-section-deep">
        <div className="ec-container">
          <div className="ec-section-label">Mercado Secundário</div>
          <h2 className="ec-section-title">Revenda <em>transparente.</em></h2>
          <p className="ec-section-sub">Todos os preços visíveis. Royalties automáticos. Anti-scalper activado.</p>

          {loadingMkt ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[1,2,3].map(i => <div key={i} className="ec-loading-skeleton" style={{ height:60 }} />)}
            </div>
          ) : listagens.length === 0 ? (
            <div style={{ textAlign:'center', padding:'80px 0', border:'1px solid rgba(212,175,90,.08)', borderRadius:16 }}>
              <div style={{ fontSize:'3rem', marginBottom:12 }}>🏪</div>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:'1.6rem', color:'var(--ec-text-mid)', marginBottom:8 }}>Marketplace vazio</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'.72rem', color:'var(--ec-text-dim)' }}>
                Nenhum ticket listado para venda ainda.
              </div>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div style={{ overflowX:'auto', display:'none' }} id="mkt-table">
                <table className="ec-market-table">
                  <thead>
                    <tr>
                      {['Ticket','Token ID','Preço','Vendedor',''].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {listagens.map((l,i) => (
                      <tr key={String(l.id)}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                            <div className="ec-market-nft-thumb" style={{ background: BG_THUMBS[i%BG_THUMBS.length] }}>
                              {EMOJIS[i%EMOJIS.length]}
                            </div>
                            <span>{l.enderecoContrato.slice(0,12)}...</span>
                          </div>
                        </td>
                        <td><span className="ec-addr">#{String(l.tokenId)}</span></td>
                        <td><span className="ec-price-gold">{formatEther(l.preco)} ETH</span></td>
                        <td><span className="ec-addr">{l.vendedor.slice(0,8)}...{l.vendedor.slice(-4)}</span></td>
                        <td><button className="ec-btn-buy-sm" onClick={() => handleMktComprar(l)}>Comprar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile */}
              <div id="mkt-cards" style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {listagens.map((l,i) => (
                  <div key={String(l.id)} className="ec-market-card-mobile">
                    <div className="ec-market-nft-thumb" style={{ background:BG_THUMBS[i%BG_THUMBS.length], width:44, height:44, borderRadius:10, fontSize:'1.2rem' }}>
                      {EMOJIS[i%EMOJIS.length]}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:500, fontSize:'.88rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.enderecoContrato.slice(0,14)}...</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'.68rem', color:'var(--ec-text-dim)', marginTop:2 }}>#{String(l.tokenId)}</div>
                    </div>
                    <span className="ec-price-gold" style={{ marginRight:8 }}>{formatEther(l.preco)}</span>
                    <button className="ec-btn-buy-sm" onClick={() => handleMktComprar(l)}>Comprar</button>
                  </div>
                ))}
              </div>
              <script dangerouslySetInnerHTML={{ __html:`
                (function(){
                  var t=document.getElementById('mkt-table'),c=document.getElementById('mkt-cards');
                  function u(){ if(t&&c){ t.style.display=window.innerWidth>=768?'block':'none'; c.style.display=window.innerWidth<768?'flex':'none'; } }
                  u(); window.addEventListener('resize',u);
                })();
              ` }} />
            </>
          )}
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="ec-footer">
        <div className="ec-footer-grid">
          <div>
            <div className="ec-logo" style={{ display:'block', marginBottom:14 }}>Event<span>Chain</span></div>
            <p style={{ fontSize:'.88rem', color:'var(--ec-text-dim)', lineHeight:1.65, maxWidth:280 }}>
              Plataforma descentralizada de ticketing construída na Ethereum. Open source, auditável, permanente.
            </p>
          </div>
          <div className="ec-footer-col">
            <div className="ec-footer-col-title">Plataforma</div>
            <a href="#eventos">Explorar Eventos</a>
            <a href="#marketplace">Marketplace</a>
            <a href="#como-funciona">Como Funciona</a>
            <a onClick={() => setCreate(true)} style={{ cursor:'pointer' }}>Criar Evento</a>
          </div>
          <div className="ec-footer-col">
            <div className="ec-footer-col-title">Developers</div>
            <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
            <a href={`https://sepolia.etherscan.io/address/${ADDRESSES.EventFactory}`} target="_blank" rel="noreferrer">EventFactory Sepolia</a>
            <a href={`https://sepolia.etherscan.io/address/${ADDRESSES.TicketMarketplace}`} target="_blank" rel="noreferrer">Marketplace Sepolia</a>
          </div>
        </div>
        <div className="ec-footer-bottom">
          <span>© {new Date().getFullYear()} EventChain · MIT License · Sepolia Testnet</span>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {[['EventFactory', ADDRESSES.EventFactory],['Marketplace', ADDRESSES.TicketMarketplace]].map(([n,a]) => (
              <a key={n} href={`https://sepolia.etherscan.io/address/${a}`} target="_blank" rel="noreferrer"
                style={{ display:'flex', alignItems:'center', gap:8, fontFamily:"'JetBrains Mono',monospace", fontSize:'.68rem', color:'var(--ec-text-dim)', textDecoration:'none' }}
                onMouseEnter={e => (e.currentTarget.style.color='var(--ec-gold)')}
                onMouseLeave={e => (e.currentTarget.style.color='var(--ec-text-dim)')}
              >
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#27AE60', animation:'pulse-dot 2s infinite', flexShrink:0 }} />
                {n}: {a.slice(0,10)}...{a.slice(-6)}
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* ============ MODAL COMPRAR ============ */}
      {buyModal && (
        <div className="ec-modal-overlay" onClick={e => e.target === e.currentTarget && setBuyModal(null)}>
          <div className="ec-modal">
            <button className="ec-modal-close" onClick={() => setBuyModal(null)}>✕</button>
            {success ? (
              <div style={{ textAlign:'center', padding:'40px 0' }}>
                <div style={{ fontSize:'3rem', marginBottom:12 }}>🎟️</div>
                <div className="ec-modal-title" style={{ textAlign:'center' }}>Ticket Mintado!</div>
                <p style={{ color:'var(--ec-text-mid)', fontSize:'.88rem', marginTop:6 }}>NFT enviado para a tua carteira.</p>
              </div>
            ) : (
              <>
                <div className="ec-modal-title">Comprar Ticket</div>
                <div className="ec-modal-sub">{buyModal.nomeEvento}</div>

                <label className="ec-form-label">Categoria</label>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:20 }}>
                  {CATEGORIAS.map(c => (
                    <button key={c.id}
                      onClick={() => setCategoria(c.id)}
                      style={{
                        padding:'10px 0', borderRadius:9, cursor:'pointer',
                        fontFamily:"'JetBrains Mono',monospace", fontSize:'.72rem',
                        transition:'all .2s',
                        background: categoria===c.id ? 'var(--ec-gold)' : 'transparent',
                        color:       categoria===c.id ? '#06060E' : 'var(--ec-text-mid)',
                        border:      categoria===c.id ? '1px solid var(--ec-gold)' : '1px solid rgba(212,175,90,.2)',
                        fontWeight:  categoria===c.id ? 600 : 400,
                      }}
                    >{c.label}</button>
                  ))}
                </div>

                <div className="ec-modal-total">
                  <span className="ec-modal-total-label">Total a pagar</span>
                  <span className="ec-modal-total-value">{precoCategoria()} ETH</span>
                </div>

                <button className="ec-btn-primary" style={{ width:'100%', textAlign:'center' }}
                  onClick={handleComprar} disabled={txLoading}>
                  {txLoading ? 'A processar...' : wallet.address ? 'Confirmar Compra' : 'Ligar Carteira'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============ MODAL CRIAR EVENTO ============ */}
      {createModal && (
        <div className="ec-modal-overlay" onClick={e => e.target === e.currentTarget && setCreate(false)}>
          <div className="ec-modal" style={{ maxHeight:'90vh', overflowY:'auto' }}>
            <button className="ec-modal-close" onClick={() => setCreate(false)}>✕</button>
            {success ? (
              <div style={{ textAlign:'center', padding:'40px 0' }}>
                <div style={{ fontSize:'3rem', marginBottom:12 }}>🚀</div>
                <div className="ec-modal-title" style={{ textAlign:'center' }}>Evento Criado!</div>
                <p style={{ color:'var(--ec-text-mid)', fontSize:'.88rem', marginTop:6 }}>Contrato publicado na Sepolia.</p>
              </div>
            ) : (
              <>
                <div className="ec-modal-title">Criar Evento</div>
                <div className="ec-modal-sub">Deploy de novo contrato EventTicket na Sepolia</div>

                {([
                  ['Nome do Evento *','nome','text','Ex: Afrobeats Night 2025'],
                  ['Local','local','text','Ex: Luanda, Angola'],
                ] as const).map(([l,k,t,p]) => (
                  <div key={k} style={{ marginBottom:16 }}>
                    <label className="ec-form-label">{l}</label>
                    <input type={t} placeholder={p}
                      value={(form as any)[k]}
                      onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                      className="ec-form-input" />
                  </div>
                ))}

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  {([
                    ['Data do Evento *','data','date',''],
                    ['Preço (ETH) *','preco','number','0.05'],
                    ['Máx. Tickets *','max','number','500'],
                    ['Royalty (%)','royalty','number','10'],
                  ] as const).map(([l,k,t,p]) => (
                    <div key={k} style={{ marginBottom:16 }}>
                      <label className="ec-form-label">{l}</label>
                      <input type={t} placeholder={p}
                        value={(form as any)[k]}
                        onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                        className="ec-form-input" />
                    </div>
                  ))}
                </div>

                <div style={{ background:'rgba(212,175,90,.06)', border:'1px solid rgba(212,175,90,.15)', borderRadius:10, padding:'12px 14px', marginBottom:20, fontFamily:"'JetBrains Mono',monospace", fontSize:'.7rem', color:'var(--ec-text-dim)' }}>
                  ⚡ Deploy de um novo EventTicket.sol na Sepolia testnet.
                </div>

                <button className="ec-btn-primary" style={{ width:'100%', textAlign:'center' }}
                  onClick={handleCriarEvento} disabled={txLoading}>
                  {txLoading ? 'A publicar...' : wallet.address ? 'Criar Evento' : 'Ligar Carteira'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

declare global { interface Window { ethereum?: any } }