'use client'

import { useState, useEffect, useCallback } from 'react'
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers'
import {
  ADDRESSES, CHAIN_ID,
  EVENT_FACTORY_ABI, EVENT_TICKET_ABI, MARKETPLACE_ABI,
} from '@/lib/contracts'

export type WalletState = {
  address: string | null
  isConnected: boolean
  isConnecting: boolean
  chainId: number | null
  isCorrectNetwork: boolean
  balance: string
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    isCorrectNetwork: false,
    balance: '0',
  })

  const getProvider = useCallback(() => {
    if (typeof window === 'undefined' || !window.ethereum) return null
    return new BrowserProvider(window.ethereum)
  }, [])

  // Verifica se já está conectado ao carregar
  useEffect(() => {
    const check = async () => {
      const provider = getProvider()
      if (!provider) return
      try {
        const accounts = await provider.listAccounts()
        if (accounts.length > 0) {
          const network = await provider.getNetwork()
          const bal = await provider.getBalance(accounts[0].address)
          setState({
            address: accounts[0].address,
            isConnected: true,
            isConnecting: false,
            chainId: Number(network.chainId),
            isCorrectNetwork: Number(network.chainId) === CHAIN_ID,
            balance: parseFloat(formatEther(bal)).toFixed(4),
          })
        }
      } catch {}
    }
    check()
  }, [getProvider])

  // Listeners de eventos da carteira
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setState(s => ({ ...s, address: null, isConnected: false }))
      } else {
        setState(s => ({ ...s, address: accounts[0] }))
      }
    }
    const handleChainChanged = (chainId: string) => {
      const id = parseInt(chainId, 16)
      setState(s => ({ ...s, chainId: id, isCorrectNetwork: id === CHAIN_ID }))
    }
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)
    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
    }
  }, [])

  const connect = useCallback(async () => {
    const provider = getProvider()
    if (!provider) {
      alert('MetaMask não encontrado. Instala em metamask.io')
      return
    }
    setState(s => ({ ...s, isConnecting: true }))
    try {
      await provider.send('eth_requestAccounts', [])
      const signer  = await provider.getSigner()
      const network = await provider.getNetwork()
      const address = await signer.getAddress()
      const bal     = await provider.getBalance(address)

      // Muda para Sepolia se necessário
      if (Number(network.chainId) !== CHAIN_ID) {
        try {
          await provider.send('wallet_switchEthereumChain', [
            { chainId: `0x${CHAIN_ID.toString(16)}` },
          ])
        } catch {}
      }

      setState({
        address,
        isConnected: true,
        isConnecting: false,
        chainId: Number(network.chainId),
        isCorrectNetwork: Number(network.chainId) === CHAIN_ID,
        balance: parseFloat(formatEther(bal)).toFixed(4),
      })
    } catch (e) {
      setState(s => ({ ...s, isConnecting: false }))
    }
  }, [getProvider])

  const disconnect = useCallback(() => {
    setState({
      address: null, isConnected: false, isConnecting: false,
      chainId: null, isCorrectNetwork: false, balance: '0',
    })
  }, [])

  // ——— Funções de contrato ———

  const getFactoryContract = useCallback(async (readOnly = true) => {
    const provider = getProvider()
    if (!provider) throw new Error('Sem provider')
    if (readOnly) return new Contract(ADDRESSES.EventFactory, EVENT_FACTORY_ABI, provider)
    const signer = await provider.getSigner()
    return new Contract(ADDRESSES.EventFactory, EVENT_FACTORY_ABI, signer)
  }, [getProvider])

  const getMarketplaceContract = useCallback(async (readOnly = true) => {
    const provider = getProvider()
    if (!provider) throw new Error('Sem provider')
    if (readOnly) return new Contract(ADDRESSES.TicketMarketplace, MARKETPLACE_ABI, provider)
    const signer = await provider.getSigner()
    return new Contract(ADDRESSES.TicketMarketplace, MARKETPLACE_ABI, signer)
  }, [getProvider])

  const getTicketContract = useCallback(async (address: string, readOnly = true) => {
    const provider = getProvider()
    if (!provider) throw new Error('Sem provider')
    if (readOnly) return new Contract(address, EVENT_TICKET_ABI, provider)
    const signer = await provider.getSigner()
    return new Contract(address, EVENT_TICKET_ABI, signer)
  }, [getProvider])

  const criarEvento = useCallback(async (params: {
    nome: string; data: number; local: string
    preco: string; maxTickets: number
    precoMaxRevenda: string; royalty: number
  }) => {
    const factory = await getFactoryContract(false)
    const tx = await factory.criarEvento(
      params.nome, params.data, params.local,
      parseEther(params.preco), params.maxTickets,
      parseEther(params.precoMaxRevenda), params.royalty,
    )
    return tx.wait()
  }, [getFactoryContract])

  const comprarTicket = useCallback(async (
    contratoAddr: string, categoria: string, preco: string
  ) => {
    const ticket = await getTicketContract(contratoAddr, false)
    const tx = await ticket.comprarTicket(categoria, 'ipfs://eventchain-metadata', {
      value: parseEther(preco),
    })
    return tx.wait()
  }, [getTicketContract])

  return {
    ...state,
    connect,
    disconnect,
    getFactoryContract,
    getMarketplaceContract,
    getTicketContract,
    criarEvento,
    comprarTicket,
  }
}

// Declaração global para window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}
